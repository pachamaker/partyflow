# PartyFlow WebSocket Architecture

**Document Version**: 1.0  
**Last Updated**: February 11, 2026  
**Author**: Technical Architecture Team

---

## Executive Summary

This document defines the real-time architecture for PartyFlow (Alias Web), a WebSocket-based multiplayer party game supporting 1 host + up to 10 players per room. The architecture prioritizes low latency (<100ms p95), reliable reconnection, and horizontal scalability to 1000+ concurrent rooms per server instance.

**Key Design Decisions**:
- WebSocket library: Melody (built on Gorilla WebSocket)
- State management: In-memory + async Redis backup
- Reconnection: Conditional backfill based on disconnect duration
- Scaling: Sticky sessions by roomId, no cross-server communication
- Protocol: Versioned JSON messages with optional ACK for critical events

---

## 1. Game State Machine

### 1.1 State Definitions

```go
type RoomState string

const (
    ROOM_CREATED      RoomState = "ROOM_CREATED"      // Room exists, no players yet
    LOBBY             RoomState = "LOBBY"              // Players joining, < min players or not started
    TEAM_SETUP        RoomState = "TEAM_SETUP"         // Assigning players to teams
    READY_TO_START    RoomState = "READY_TO_START"    // Teams balanced, waiting for host confirm
    ROUND_STARTING    RoomState = "ROUND_STARTING"     // 3-2-1 countdown
    ROUND_ACTIVE      RoomState = "ROUND_ACTIVE"       // Game in progress, timer running
    ROUND_PAUSED      RoomState = "ROUND_PAUSED"       // Host paused mid-round
    ROUND_ENDED       RoomState = "ROUND_ENDED"        // Round complete, calculating scores
    SCORE_REVIEW      RoomState = "SCORE_REVIEW"       // Showing round results
    READY_FOR_NEXT    RoomState = "READY_FOR_NEXT"     // Transitioning to next round
    GAME_ENDED        RoomState = "GAME_ENDED"         // All rounds complete
    FINAL_RESULTS     RoomState = "FINAL_RESULTS"      // Game over leaderboard
    ROOM_CLOSED       RoomState = "ROOM_CLOSED"        // Terminal state
)
```

### 1.2 State Transition Events

```go
type GameEvent string

const (
    // Lobby events
    EVT_ROOM_CREATED       GameEvent = "ROOM_CREATED"
    EVT_PLAYER_JOINED      GameEvent = "PLAYER_JOINED"
    EVT_PLAYER_LEFT        GameEvent = "PLAYER_LEFT"
    EVT_HOST_START_SETUP   GameEvent = "HOST_START_SETUP"
    
    // Team setup events
    EVT_PLAYER_ASSIGNED    GameEvent = "PLAYER_ASSIGNED"
    EVT_TEAMS_BALANCED     GameEvent = "TEAMS_BALANCED"
    EVT_HOST_CONFIRM_START GameEvent = "HOST_CONFIRM_START"
    EVT_HOST_CANCEL_SETUP  GameEvent = "HOST_CANCEL_SETUP"
    
    // Gameplay events
    EVT_COUNTDOWN_TICK     GameEvent = "COUNTDOWN_TICK"
    EVT_ROUND_STARTED      GameEvent = "ROUND_STARTED"
    EVT_WORD_SWIPED        GameEvent = "WORD_SWIPED"
    EVT_TIMER_TICK         GameEvent = "TIMER_TICK"
    EVT_HOST_PAUSE         GameEvent = "HOST_PAUSE"
    EVT_HOST_RESUME        GameEvent = "HOST_RESUME"
    EVT_ROUND_TIMEOUT      GameEvent = "ROUND_TIMEOUT"
    EVT_PACK_EXHAUSTED     GameEvent = "PACK_EXHAUSTED"
    
    // End game events
    EVT_SCORES_CALCULATED  GameEvent = "SCORES_CALCULATED"
    EVT_NEXT_ROUND_READY   GameEvent = "NEXT_ROUND_READY"
    EVT_GAME_COMPLETE      GameEvent = "GAME_COMPLETE"
    EVT_HOST_RESTART       GameEvent = "HOST_RESTART"
    EVT_ROOM_CLOSE         GameEvent = "ROOM_CLOSE"
)
```

### 1.3 Concurrent Action Handling

**Strategy**: Optimistic locking with room-level mutex

```go
type Room struct {
    ID            string
    State         RoomState
    StateVersion  int64      // Incrementing counter for version tracking
    HostID        string
    mu            sync.RWMutex
}

func (r *Room) TransitionState(event GameEvent, actorID string) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    // 1. Authorization check
    if requiresHostPrivilege(event) && actorID != r.HostID {
        return ErrUnauthorized
    }
    
    // 2. Validate transition
    if !isValidTransition(r.State, event) {
        return ErrInvalidTransition
    }
    
    // 3. Idempotency check
    if isIdempotent(event, r.State) {
        return nil // Already in target state, no-op
    }
    
    // 4. Execute transition
    newState := computeNextState(r.State, event)
    r.State = newState
    r.StateVersion++
    
    // 5. Broadcast state change
    r.broadcastStateChange(event, r.StateVersion)
    
    return nil
}
```

**Race Condition Resolution**:
- Room-level mutex serializes all state transitions per-room
- First successful transition wins
- Subsequent identical requests receive `ErrInvalidTransition`
- Client shows optimistic UI but rolls back on server rejection
- StateVersion enables client-side stale state detection

---

## 2. WebSocket Message Protocol

### 2.1 Protocol Structure

```typescript
// Base message envelope
interface WSMessage {
  type: string;              // Event type
  roomId: string;            // Room identifier
  timestamp: number;         // Server timestamp (ms)
  version: string;           // Protocol version "1.0"
  sequenceId?: number;       // For ordered delivery guarantee
}

// Client → Server messages
interface ClientMessage extends WSMessage {
  actorId: string;           // Player/Host ID
  payload: any;              // Event-specific data
}

// Server → Client messages
interface ServerMessage extends WSMessage {
  broadcast: "all" | "host" | "players" | "actor";
  payload: any;
  requiresAck?: boolean;     // If true, client must ACK
}
```

### 2.2 Event Catalog

#### Lobby Phase

```json
// Server → All: Room Created
{
  "type": "ROOM_CREATED",
  "roomId": "ABC123",
  "timestamp": 1707695234000,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "qrCodeUrl": "https://play.partyflow.app/ABC123",
    "hostId": "host_xyz",
    "hostName": "Alice",
    "maxPlayers": 10
  }
}

// Server → All: Player Joined
{
  "type": "PLAYER_JOINED",
  "roomId": "ABC123",
  "timestamp": 1707695235000,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "playerId": "player_001",
    "playerName": "Bob",
    "playerCount": 3,
    "avatarColor": "#FF5733"
  }
}

// Server → All: Player Left
{
  "type": "PLAYER_LEFT",
  "roomId": "ABC123",
  "timestamp": 1707695236000,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "playerId": "player_002",
    "playerName": "Charlie",
    "playerCount": 2,
    "reason": "disconnected"  // or "voluntary"
  }
}
```

#### Team Setup Phase

```json
// Client (Host) → Server
{
  "type": "START_TEAM_SETUP",
  "roomId": "ABC123",
  "actorId": "host_xyz",
  "timestamp": 1707695240000,
  "version": "1.0",
  "payload": {
    "numTeams": 2
  }
}

// Server → All
{
  "type": "TEAM_SETUP_STARTED",
  "roomId": "ABC123",
  "timestamp": 1707695240100,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "teams": [
      {"id": "team_1", "name": "Team Red", "color": "#FF0000", "players": []},
      {"id": "team_2", "name": "Team Blue", "color": "#0000FF", "players": []}
    ]
  }
}

// Client (Player) → Server
{
  "type": "JOIN_TEAM",
  "roomId": "ABC123",
  "actorId": "player_001",
  "timestamp": 1707695241000,
  "version": "1.0",
  "payload": {
    "teamId": "team_1"
  }
}

// Server → All
{
  "type": "PLAYER_ASSIGNED_TEAM",
  "roomId": "ABC123",
  "timestamp": 1707695241100,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "playerId": "player_001",
    "teamId": "team_1",
    "teams": [ /* updated teams state */ ]
  }
}
```

#### Gameplay Phase (Critical Path)

```json
// Server → All: Round Started (requires ACK)
{
  "type": "ROUND_STARTED",
  "roomId": "ABC123",
  "timestamp": 1707695250000,
  "version": "1.0",
  "broadcast": "all",
  "requiresAck": true,
  "ackId": "ack_round_start_1",
  "payload": {
    "roundNumber": 1,
    "activeTeamId": "team_1",
    "explainerPlayerId": "player_001",
    "roundDurationSec": 60,
    "wordPackId": "default_animals"
  }
}

// Server → Host Only: Word Revealed
{
  "type": "WORD_REVEALED",
  "roomId": "ABC123",
  "timestamp": 1707695250100,
  "version": "1.0",
  "broadcast": "host",
  "payload": {
    "wordId": "word_42",
    "wordText": "Elephant",
    "difficulty": "medium",
    "remainingInPack": 47
  }
}

// Client (Host) → Server: Word Swiped
{
  "type": "WORD_SWIPED",
  "roomId": "ABC123",
  "actorId": "host_xyz",
  "timestamp": 1707695253000,
  "version": "1.0",
  "payload": {
    "wordId": "word_42",
    "action": "guessed",  // or "skipped"
    "swipeDurationMs": 2800
  }
}

// Server → All: Word Result
{
  "type": "WORD_RESULT",
  "roomId": "ABC123",
  "timestamp": 1707695253050,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "wordId": "word_42",
    "action": "guessed",
    "teamId": "team_1",
    "pointsAwarded": 1,
    "newScore": 12
  }
}

// Server → All: Timer Tick (throttled to 1/sec)
{
  "type": "TIMER_TICK",
  "roomId": "ABC123",
  "timestamp": 1707695254000,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "remainingSeconds": 57
  }
}

// Server → All: Round Ended (requires ACK)
{
  "type": "ROUND_ENDED",
  "roomId": "ABC123",
  "timestamp": 1707695310000,
  "version": "1.0",
  "broadcast": "all",
  "requiresAck": true,
  "ackId": "ack_round_end_1",
  "payload": {
    "reason": "timer_expired",  // or "pack_exhausted"
    "roundNumber": 1,
    "teamId": "team_1",
    "wordsGuessed": 18,
    "wordsSkipped": 3,
    "pointsEarned": 18,
    "averageTimePerWord": 2.9
  }
}
```

#### Score Review Phase

```json
// Server → All
{
  "type": "SCORE_SUMMARY",
  "roomId": "ABC123",
  "timestamp": 1707695310500,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "leaderboard": [
      {"teamId": "team_1", "teamName": "Team Red", "score": 18, "rank": 1},
      {"teamId": "team_2", "teamName": "Team Blue", "score": 15, "rank": 2}
    ],
    "nextRoundIn": 5  // seconds
  }
}
```

#### End Game Phase

```json
// Server → All: Game Ended
{
  "type": "GAME_ENDED",
  "roomId": "ABC123",
  "timestamp": 1707695800000,
  "version": "1.0",
  "broadcast": "all",
  "payload": {
    "winnerTeamId": "team_1",
    "finalScores": [
      {"teamId": "team_1", "score": 95},
      {"teamId": "team_2", "score": 87}
    ],
    "gameDurationMin": 22,
    "totalWordsPlayed": 156,
    "mvpPlayerId": "player_001"
  }
}
```

### 2.3 Broadcast Rules

| Event Type | Broadcast Scope | Reasoning |
|------------|----------------|-----------|
| `PLAYER_JOINED/LEFT` | **all** | Social awareness for all participants |
| `TEAM_SETUP_*` | **all** | Team composition visible to everyone |
| `WORD_REVEALED` | **host only** | Core game mechanic - players must guess |
| `WORD_RESULT` | **all** | Score updates for spectating |
| `TIMER_TICK` | **all** | Shared sense of urgency |
| `ROUND_ENDED` | **all** | Checkpoint for all participants |
| `GAME_ENDED` | **all** | Final results celebration |
| `ERROR` | **actor** | Only relevant to the person who triggered it |

### 2.4 Protocol Versioning

**Versioning Strategy**: Semantic versioning `MAJOR.MINOR` (e.g., "1.0", "1.1", "2.0")

**Rules**:
- **Minor version changes** (1.0 → 1.1): Backward compatible
  - New optional fields in payload
  - New event types (ignored by old clients)
- **Major version changes** (1.x → 2.0): Breaking changes
  - Renamed fields
  - Changed event semantics
  - Require client upgrade
- **Compatibility window**: Server supports last 2 major versions
- **Client version in handshake**: First message includes `version` field

```go
// Compatibility matrix
var compatibilityMatrix = map[string][]string{
    "2.0": {"2.0", "1.9", "1.8"},
    "1.9": {"1.9", "1.8", "1.7"},
}

func isCompatible(clientVersion, serverVersion string) bool {
    supportedVersions := compatibilityMatrix[serverVersion]
    for _, v := range supportedVersions {
        if v == clientVersion {
            return true
        }
    }
    return false
}
```

**Version Negotiation Flow**:

```
Client v1.0 → Server v1.1: Connect + version="1.0"
Server v1.1 → Client v1.0: CONNECTED + serverVersion="1.1"
                           (Server uses v1.0 serialization)

Client v1.0 → Server v2.0: Connect + version="1.0"
Server v2.0 → Client v1.0: ERROR: UPGRADE_REQUIRED
                           (Close connection)
```

### 2.5 Acknowledgment Protocol

**Events Requiring ACK**:
- `ROUND_STARTED` - Must confirm player sees new word
- `ROUND_ENDED` - Must confirm score received
- `GAME_ENDED` - Must confirm final results received

**ACK Flow**:

```json
// Server → Client (requires ACK)
{
  "type": "ROUND_STARTED",
  "roomId": "ABC123",
  "timestamp": 1707695250000,
  "version": "1.0",
  "broadcast": "all",
  "requiresAck": true,
  "ackId": "ack_round_start_1"
}

// Client → Server (ACK response within 2sec)
{
  "type": "ACK",
  "roomId": "ABC123",
  "actorId": "player_001",
  "timestamp": 1707695250100,
  "version": "1.0",
  "payload": {
    "ackId": "ack_round_start_1",
    "status": "received"
  }
}
```

**Retry Logic**:
- Server tracks ACK receipt per-client
- If no ACK within 2sec → resend event (max 2 retries)
- After 3 failed attempts → mark client as "degraded" but continue game
- Degraded clients shown warning toast: "Connection unstable"

---

## 3. Reconnection Strategy

### 3.1 Reconnection Policy

```typescript
// Client-side reconnection config
const RECONNECT_CONFIG = {
  maxAttempts: 10,
  baseDelay: 1000,        // 1 second
  maxDelay: 30000,        // 30 seconds
  backoffMultiplier: 1.5,
  jitterRange: 0.2        // ±20% randomization
};

// Exponential backoff with jitter
function calculateReconnectDelay(attemptNumber: number): number {
  const baseDelay = RECONNECT_CONFIG.baseDelay;
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(RECONNECT_CONFIG.backoffMultiplier, attemptNumber - 1),
    RECONNECT_CONFIG.maxDelay
  );
  
  // Add jitter to avoid thundering herd
  const jitter = exponentialDelay * RECONNECT_CONFIG.jitterRange;
  return exponentialDelay + (Math.random() * jitter * 2 - jitter);
}
```

**Reconnect Delay Sequence**: 1s → 1.5s → 2.25s → 3.4s → 5.1s → 7.6s → 11.4s → 17s → 25.5s → 30s

### 3.2 State Recovery Strategy

#### Scenario 1: Short Disconnect (<5 seconds)

```json
// Client reconnects with session context
{
  "type": "RECONNECT",
  "roomId": "ABC123",
  "actorId": "player_001",
  "timestamp": 1707695255000,
  "version": "1.0",
  "payload": {
    "sessionId": "sess_xyz",
    "lastSeqId": 142,
    "disconnectTimestamp": 1707695250000
  }
}

// Server responds with state snapshot + backfill
{
  "type": "RECONNECTED",
  "roomId": "ABC123",
  "timestamp": 1707695255100,
  "version": "1.0",
  "broadcast": "actor",
  "payload": {
    "currentState": "ROUND_ACTIVE",
    "stateVersion": 148,
    "gameState": {
      "roundNumber": 1,
      "activeTeamId": "team_1",
      "currentScore": {"team_1": 14, "team_2": 12},
      "remainingSeconds": 52,
      "currentWordId": "word_45"
    },
    "missedEvents": [
      {"seqId": 143, "type": "WORD_RESULT", "payload": {...}},
      {"seqId": 144, "type": "WORD_REVEALED", "payload": {...}},
      {"seqId": 145, "type": "WORD_RESULT", "payload": {...}}
    ]
  }
}
```

**Client Behavior**:
- Apply `missedEvents` in order to reconstruct timeline
- Show brief animation of missed actions (condensed, 2x speed)
- Resume live gameplay from `currentState`

#### Scenario 2: Medium Disconnect (5-30 seconds)

```json
// Server response (no backfill, just snapshot)
{
  "type": "RECONNECTED",
  "roomId": "ABC123",
  "timestamp": 1707695280100,
  "version": "1.0",
  "broadcast": "actor",
  "payload": {
    "currentState": "SCORE_REVIEW",
    "stateVersion": 182,
    "gameState": {
      "roundNumber": 1,
      "justEndedTeamId": "team_1",
      "currentScore": {"team_1": 22, "team_2": 12},
      "nextRoundIn": 3
    },
    "missedEvents": null,
    "message": "You missed some action! Catching you up..."
  }
}
```

**Client Behavior**:
- No backfill animation (too much to show)
- Show toast: "Reconnected! Round just ended, Team Red scored 22 points"
- Jump directly to current state

#### Scenario 3: Long Disconnect (>30 seconds)

```json
// Server response (rejoin required)
{
  "type": "RECONNECT_FAILED",
  "roomId": "ABC123",
  "timestamp": 1707695320100,
  "version": "1.0",
  "broadcast": "actor",
  "payload": {
    "reason": "SESSION_EXPIRED",
    "message": "You've been disconnected too long. Rejoining as spectator.",
    "canRejoin": true,
    "currentState": "ROUND_ACTIVE"
  }
}
```

**Client Behavior**:
- Clear local game state
- Show modal: "Connection lost. Rejoining..."
- Rejoin room as spectator (can't explainer current round)
- Can participate in next round

### 3.3 Timeout Policy

```go
const (
    // Disconnect thresholds
    DISCONNECT_GRACE_PERIOD   = 5 * time.Second   // Consider "temporarily disconnected"
    DISCONNECT_WARNING        = 15 * time.Second  // Show warning to other players
    DISCONNECT_REMOVE         = 60 * time.Second  // Auto-remove from room
    
    // State retention
    STATE_RETENTION_SHORT     = 2 * time.Minute   // Keep full event log
    STATE_RETENTION_SNAPSHOT  = 10 * time.Minute  // Keep snapshot only
    
    // Heartbeat
    CLIENT_HEARTBEAT_INTERVAL = 10 * time.Second
    SERVER_PING_TIMEOUT       = 20 * time.Second  // If no pong, consider dead
)
```

**Timeline Visualization**:

```
0s           5s              15s                    60s
|------------|---------------|----------------------|
Connected    Temporarily     "Bob lost              Auto-removed
             disconnected    connection..."         from room
             (no UI change)  (warning toast)        (game continues)
             
             ← Reconnect with full backfill →
                             ← Reconnect snapshot only →
                                                     ← Rejoin required →
```

### 3.4 Backfill Strategy

**Decision Tree**:

```
IF disconnect_duration < 5s:
  → Backfill ALL missed events (typically <10 events)
  → Show animations at 2x speed
  
ELSE IF disconnect_duration < 30s:
  → NO backfill (too much to show)
  → Provide state snapshot only
  → Show summary toast ("You missed: 4 words guessed")
  
ELSE:
  → Session expired
  → Rejoin as new participant
  → Cannot resume explainer role if mid-round
```

**Host vs Player Differences**:
- **Host reconnect**: MUST see all missed words (critical for game flow)
  - Backfill up to 30 seconds of events
  - If >30s, pause game and show recovery UI
- **Player reconnect**: Can skip backfill
  - Just need current score and state
  - Less critical for continuity

### 3.5 Edge Cases

#### Host Disconnects During Active Round

```go
// Server behavior
if disconnectedUser == room.HostID && room.State == ROUND_ACTIVE {
    // Grace period: 10 seconds
    time.AfterFunc(10*time.Second, func() {
        if !room.IsHostConnected() {
            // Pause game automatically
            room.TransitionState(EVT_HOST_PAUSE, "system")
            room.BroadcastAll(ServerMessage{
                Type: "GAME_PAUSED",
                Payload: map[string]interface{}{
                    "reason": "Host disconnected",
                    "message": "Waiting for host to reconnect...",
                },
            })
        }
    })
    
    // If host doesn't return in 60s, promote new host
    time.AfterFunc(60*time.Second, func() {
        if !room.IsHostConnected() {
            room.PromoteNewHost()
        }
    })
}
```

#### Multiple Reconnect Attempts from Same SessionId

```go
// Prevent duplicate connections
if existingConn := room.GetConnectionBySession(sessionId); existingConn != nil {
    existingConn.Close() // Force-close old connection
}
room.RegisterConnection(sessionId, newConn)
```

#### State Desync Detection

```json
// Client includes state checksum in heartbeat
{
  "type": "HEARTBEAT",
  "roomId": "ABC123",
  "actorId": "player_001",
  "payload": {
    "stateVersion": 150,
    "stateChecksum": "a3f5c8d9"  // Hash of critical state fields
  }
}

// Server validates checksum
if clientChecksum != serverChecksum {
  // Force full state resync
  sendFullStateSnapshot(client)
}
```

---

## 4. Scalability & Infrastructure

### 4.1 Single-Server Capacity

**Hardware**: AWS t3.medium (2 vCPU, 4GB RAM)

**Per-Room Resource Consumption**:

```
Average room (6 players + 1 host = 7 connections):
├─ WebSocket connections: 7 × 10KB = 70KB memory
├─ Room state: ~50KB (player list, game state, word pack cache)
├─ Event loop goroutines: 2 (state manager + broadcast worker)
└─ Active gameplay bandwidth: ~2 KB/s (timer ticks + events)

Peak room (10 players + 1 host = 11 connections):
├─ WebSocket connections: 11 × 10KB = 110KB
├─ Room state: ~80KB
└─ Bandwidth: ~3 KB/s
```

**Capacity Calculation**:

```
Memory constraints: 3.5GB usable / 0.12 MB per room = ~29,000 rooms (theoretical)
CPU constraints: 20,000 goroutines / 2 per room = 10,000 rooms (optimistic)
Network I/O: 10,000 connections / 7 per room = ~1,428 rooms (realistic bottleneck)

Conservative estimate with 70% utilization: ~1,000 concurrent rooms per instance
= 7,000 concurrent users per t3.medium
```

### 4.2 State Management Strategy

**Architecture**: In-Memory + Async Redis Backup

```go
type StateManager struct {
    inMemory  sync.Map          // Hot path for active games
    redis     *redis.Client     // Cold path for persistence
    writeChan chan StateUpdate  // Async write queue
}

// Read path (hot path)
func (sm *StateManager) GetRoom(roomId string) (*Room, error) {
    // 1. Try in-memory cache first
    if room, ok := sm.inMemory.Load(roomId); ok {
        return room.(*Room), nil
    }
    
    // 2. Cache miss, load from Redis
    data, err := sm.redis.Get(ctx, "room:"+roomId).Bytes()
    if err != nil {
        return nil, ErrRoomNotFound
    }
    
    room := &Room{}
    json.Unmarshal(data, room)
    
    // 3. Populate cache
    sm.inMemory.Store(roomId, room)
    
    return room, nil
}

// Write path (async)
func (sm *StateManager) UpdateRoom(room *Room) {
    // 1. Update in-memory immediately
    sm.inMemory.Store(room.ID, room)
    
    // 2. Queue Redis write (non-blocking)
    select {
    case sm.writeChan <- StateUpdate{Room: room}:
    default:
        // Channel full, log warning but don't block game
        log.Warn("Redis write queue full")
    }
}

// Background worker persists to Redis
func (sm *StateManager) persistWorker() {
    for update := range sm.writeChan {
        data, _ := json.Marshal(update.Room)
        sm.redis.Set(ctx, "room:"+update.Room.ID, data, 2*time.Hour)
    }
}
```

**When Redis Becomes Necessary**:
1. **> 1000 concurrent rooms**: Memory pressure requires eviction strategy
2. **Crash recovery needed**: Can't lose all state on server restart
3. **Multi-instance deployment**: Need shared state store
4. **Analytics/monitoring**: Redis as event log sink

### 4.3 Deployment Architecture

**MVP Strategy**: Start with single instance, scale to dual-instance

**Phase 1: Single Instance** (0-500 rooms)
- 1× WebSocket server (t3.medium)
- 1× Redis (t3.micro, for backup only)
- 1× REST API (t3.small, for room creation)

**Phase 2: Dual Instance** (500-2000 rooms)
- 2× WebSocket servers behind load balancer
- Sticky sessions by `roomId` hash
- Redis upgraded to t3.small

**Load Balancer Configuration**:

```nginx
upstream websocket_backend {
    # Hash by roomId to ensure all players in same room → same server
    hash $arg_roomId consistent;
    
    server ws1.partyflow.internal:8080;
    server ws2.partyflow.internal:8080;
}

server {
    listen 443 ssl;
    server_name ws.partyflow.app;
    
    location / {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;  # 1 hour for long games
    }
}
```

**Why NOT Redis Pub/Sub for MVP**:
- Adds complexity (cross-server communication)
- Not needed if sticky sessions guarantee all room players on same server
- Only required for live room migration (out of scope for MVP)

### 4.4 Cost Estimate (AWS)

```
MVP Deployment (up to 1000 concurrent rooms):
├─ 2× t3.medium WebSocket servers: $60/mo
├─ 1× t3.small Redis: $15/mo
├─ 1× t3.small REST API: $15/mo
├─ Application Load Balancer: $20/mo
├─ S3 + CloudFront (static assets): $10/mo
├─ Data transfer (1TB/mo): $90/mo
└─ Total: ~$210/mo

At scale (5000 concurrent rooms):
├─ 5× t3.medium WebSocket servers: $150/mo
├─ 1× Redis Cluster (3 nodes): $150/mo
├─ ALB + data transfer: $300/mo
└─ Total: ~$600/mo
```

---

## 5. Architecture Decision Records (ADRs)

### ADR-001: WebSocket Library Selection

**Status**: Accepted  
**Date**: 2026-02-11

**Context**: Need to choose WebSocket implementation for Go backend.

**Options Considered**:
1. **Gorilla WebSocket** - Mature, widely used, RFC 6455 compliant
2. **Melody** - Built on Gorilla, higher-level abstractions (broadcast helpers)
3. **Gobwas** - Zero-copy, highest performance, low-level

**Decision**: Use **Melody** (built on Gorilla WebSocket)

**Rationale**:
- ✅ Built-in broadcast helpers (`BroadcastFilter`, `BroadcastMultiple`)
- ✅ Room/session management out of the box
- ✅ Production-ready, used by companies at scale
- ✅ Easy migration to raw Gorilla if we hit performance limits
- ❌ Slightly higher memory overhead vs Gobwas (acceptable for MVP)

**Consequences**:
- Faster MVP development (less boilerplate)
- Room broadcasting is one-liner: `m.BroadcastFilter([]byte(msg), filterFunc)`
- Can optimize later if we hit 10k+ concurrent rooms

---

### ADR-002: State Management Strategy

**Status**: Accepted  
**Date**: 2026-02-11

**Context**: How to manage game state at different scale points?

**Decision**: **In-Memory + Async Redis Backup** for MVP

**Rationale**:
- ✅ Low latency (<1ms) for gameplay events
- ✅ Crash recovery via Redis snapshots
- ✅ Simple to implement (no distributed consensus)
- ✅ Scales to 1000-2000 rooms per server
- ✅ Natural upgrade path to Redis primary store

**Trade-offs**:
- ⚠️ Eventual consistency (Redis writes are async)
- ⚠️ State lost if both server AND Redis crash simultaneously (acceptable risk)
- ⚠️ Cannot do live room migration between servers (not MVP requirement)

**Alternatives Rejected**:
- Pure in-memory: Loses all state on crash (too risky)
- Redis-primary: Adds 1-3ms latency to every action (kills gameplay feel)
- Database-backed: Way too slow for real-time gameplay

---

### ADR-003: Message Acknowledgment Strategy

**Status**: Accepted  
**Date**: 2026-02-11

**Context**: Which events require client acknowledgment?

**Decision**: ACK only for **state transition events**, not gameplay actions

**Events Requiring ACK**:
- `ROUND_STARTED` (critical game state change)
- `ROUND_ENDED` (score checkpoint)
- `GAME_ENDED` (final results)

**Events NOT Requiring ACK**:
- `TIMER_TICK` (fire-and-forget, 1/sec)
- `WORD_RESULT` (scores are idempotent)
- `PLAYER_JOINED/LEFT` (social updates)

**Rationale**:
- ✅ Reduces network overhead (less chatter)
- ✅ Gameplay feels responsive (no waiting for ACKs)
- ✅ Critical state changes are guaranteed received
- ⚠️ Trade-off: Player might miss a `WORD_RESULT` toast (acceptable)

**Implementation**:
- 2-second ACK timeout
- Max 2 retries
- After 3 failures, mark connection as degraded (show warning)

---

### ADR-004: Reconnection Backfill Policy

**Status**: Accepted  
**Date**: 2026-02-11

**Context**: Should we replay missed events after reconnect?

**Decision**: **Conditional backfill based on disconnect duration**

**Policy**:
```
< 5 seconds   → Full backfill (show animations)
5-30 seconds  → Snapshot only (summary toast)
> 30 seconds  → Rejoin required (spectator mode)
```

**Rationale**:
- ✅ Short disconnects feel seamless (user doesn't notice)
- ✅ Medium disconnects don't overwhelm with backlog
- ✅ Long disconnects prevent game disruption
- ✅ Host gets special treatment (longer backfill window)

**Special Case - Host Reconnect**:
- Backfill up to 30 seconds (needs word history)
- If >30s, pause game until host returns or promote new host

---

### ADR-005: Horizontal Scaling via Sticky Sessions

**Status**: Accepted  
**Date**: 2026-02-11

**Context**: How to scale beyond single WebSocket server?

**Decision**: **Sticky sessions by roomId hash**, no cross-server communication

**Rationale**:
- ✅ Simplest possible multi-instance setup
- ✅ No Redis Pub/Sub complexity
- ✅ No distributed state coordination
- ✅ Each server independently manages its rooms
- ⚠️ Cannot migrate rooms between servers (acceptable for MVP)

**Implementation**:
```nginx
hash $arg_roomId consistent;
```

**Consequences**:
- Room stays on same server for its lifetime
- If server crashes, room is lost (acceptable with Redis backup)
- No live migration, but can rebuild room from Redis on any server

**When to Revisit**:
- If we need zero-downtime deployments (add Redis Pub/Sub)
- If we need cross-region routing (add room migration logic)

---

## 6. Technical Requirements Summary

### 6.1 Acceptance Criteria

- [ ] WebSocket connection established within 2 seconds
- [ ] Message latency <100ms (p95) for gameplay events
- [ ] Successful reconnection within 5 seconds after WiFi drop
- [ ] State recovery with full backfill for disconnects <5 seconds
- [ ] Game continues if 1 player disconnects (not host)
- [ ] Host disconnect triggers auto-pause after 10 seconds
- [ ] Support 10 concurrent players + 1 host per room
- [ ] Handle 1000 concurrent rooms on single t3.medium instance
- [ ] Persist room state to Redis for crash recovery
- [ ] Protocol version negotiation on connection handshake

### 6.2 Tech Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **WebSocket connection fails on corporate WiFi** | Medium | High | Implement long-polling fallback (future) |
| **Redis async write lag causes data loss** | Low | Medium | Shorten write interval to 100ms, add write queue monitoring |
| **Single server crashes, all rooms lost** | Low | High | Deploy 2 instances from day 1, sticky sessions |
| **Protocol changes break old clients** | Medium | High | Version negotiation + 2-week deprecation window |
| **Timer desync between clients** | High | Low | Server is source of truth, broadcast `TIMER_TICK` every 1sec |

### 6.3 Edge Cases for QA Testing

1. **Host loses connection during active round** → Game auto-pauses after 10s
2. **Player reconnects 4.9 seconds after disconnect** → Full backfill with animations
3. **Player reconnects 5.1 seconds after disconnect** → Snapshot only, summary toast
4. **Two players swipe word simultaneously** → First write wins, second gets `ErrInvalidTransition`
5. **Client protocol v1.0 connects to server v2.0** → Server downgrades serialization or rejects
6. **All 10 players disconnect at once** → Room survives in Redis, host can restart
7. **Redis write queue fills up** → Log warning, continue gameplay (writes queued)
8. **Load balancer routes player to wrong server** → Auth fails, client redirected to correct server

---

## 7. Implementation Timeline

**Backend Development Estimate**:

1. **State Machine Implementation** (3 days)
   - Room state enum and transitions
   - Event handling and validation
   - Concurrent action handling with mutex

2. **WebSocket Protocol** (5 days)
   - Message envelope structure
   - Event serialization/deserialization
   - Broadcast routing logic
   - ACK protocol implementation

3. **Reconnection System** (3 days)
   - Exponential backoff client-side
   - State snapshot generation
   - Event backfill logic
   - Host disconnect edge cases

4. **State Management** (2 days)
   - In-memory store with sync.Map
   - Redis async write worker
   - Cache eviction policy

5. **Load Testing & Optimization** (2 days)
   - Capacity testing (1000 room target)
   - Latency profiling
   - Memory leak detection

**Total Backend**: ~15 days (3 weeks)

---

## Appendix A: Glossary

- **Room**: Game session instance containing 1 host + up to 10 players
- **StateVersion**: Incrementing counter for detecting state conflicts
- **ACK**: Acknowledgment message confirming event receipt
- **Backfill**: Replaying missed events after reconnection
- **Sticky Session**: Load balancer routing all room traffic to same server
- **Hot Path**: Code path for active gameplay (must be <100ms latency)
- **Cold Path**: Code path for background operations (can be slower)

---

## Appendix B: References

- [Gorilla WebSocket Documentation](https://pkg.go.dev/github.com/gorilla/websocket)
- [Melody WebSocket Framework](https://github.com/olahol/melody)
- [Redis Pub/Sub Best Practices](https://redis.io/topics/pubsub)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)

---

**Document End**

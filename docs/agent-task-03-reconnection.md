# Agent Task: Reconnection System & State Recovery

**Agent Role**: Backend Engineer (Go)  
**Estimated Time**: 3-4 days  
**Dependencies**: Task 1 (WebSocket Server) and Task 2 (State Machine) must be complete

---

## Task Overview

Implement the reconnection system that allows players to recover from temporary disconnections with conditional backfill of missed events. This includes exponential backoff, state snapshot generation, disconnect detection, and edge case handling.

---

## Prerequisites

Read these documents first:
- `partyflow_websocket_architecture.md` (section 3: Reconnection Strategy)
- `agent-task-01-websocket-server.md` (connection lifecycle)
- `agent-task-02-state-machine.md` (room state management)

---

## Technical Requirements

### 1. Disconnect Detection & Grace Period

**File**: `internal/websocket/disconnect.go`

```go
package websocket

import (
    "time"
    "sync"
)

const (
    DISCONNECT_GRACE_PERIOD = 5 * time.Second
    DISCONNECT_WARNING      = 15 * time.Second
    DISCONNECT_REMOVE       = 60 * time.Second
)

type DisconnectTracker struct {
    disconnections map[string]*DisconnectInfo
    mu             sync.RWMutex
}

type DisconnectInfo struct {
    SessionID        string
    RoomID           string
    ActorID          string
    DisconnectedAt   time.Time
    LastSeqID        int64
    GracePeriodTimer *time.Timer
    WarningTimer     *time.Timer
    RemovalTimer     *time.Timer
}

func NewDisconnectTracker() *DisconnectTracker {
    return &DisconnectTracker{
        disconnections: make(map[string]*DisconnectInfo),
    }
}

func (dt *DisconnectTracker) MarkDisconnected(sessionID, roomID, actorID string, lastSeqID int64) {
    dt.mu.Lock()
    defer dt.mu.Unlock()
    
    info := &DisconnectInfo{
        SessionID:      sessionID,
        RoomID:         roomID,
        ActorID:        actorID,
        DisconnectedAt: time.Now(),
        LastSeqID:      lastSeqID,
    }
    
    // Schedule grace period expiry (5 seconds)
    info.GracePeriodTimer = time.AfterFunc(DISCONNECT_GRACE_PERIOD, func() {
        dt.handleGracePeriodExpired(sessionID)
    })
    
    // Schedule warning broadcast (15 seconds)
    info.WarningTimer = time.AfterFunc(DISCONNECT_WARNING, func() {
        dt.handleWarningThreshold(sessionID)
    })
    
    // Schedule auto-removal (60 seconds)
    info.RemovalTimer = time.AfterFunc(DISCONNECT_REMOVE, func() {
        dt.handleRemovalThreshold(sessionID)
    })
    
    dt.disconnections[sessionID] = info
    
    log.Printf("Player disconnected: %s (room: %s, grace period: %v)",
        actorID, roomID, DISCONNECT_GRACE_PERIOD)
}

func (dt *DisconnectTracker) MarkReconnected(sessionID string) (*DisconnectInfo, error) {
    dt.mu.Lock()
    defer dt.mu.Unlock()
    
    info, exists := dt.disconnections[sessionID]
    if !exists {
        return nil, errors.New("no disconnect info found")
    }
    
    // Cancel all timers
    if info.GracePeriodTimer != nil {
        info.GracePeriodTimer.Stop()
    }
    if info.WarningTimer != nil {
        info.WarningTimer.Stop()
    }
    if info.RemovalTimer != nil {
        info.RemovalTimer.Stop()
    }
    
    // Remove from tracking
    delete(dt.disconnections, sessionID)
    
    disconnectDuration := time.Since(info.DisconnectedAt)
    log.Printf("Player reconnected: %s (disconnected for: %v)",
        info.ActorID, disconnectDuration)
    
    return info, nil
}

func (dt *DisconnectTracker) GetDisconnectDuration(sessionID string) (time.Duration, error) {
    dt.mu.RLock()
    defer dt.mu.RUnlock()
    
    info, exists := dt.disconnections[sessionID]
    if !exists {
        return 0, errors.New("not disconnected")
    }
    
    return time.Since(info.DisconnectedAt), nil
}

func (dt *DisconnectTracker) handleGracePeriodExpired(sessionID string) {
    // Grace period passed, but player might still reconnect
    // No action needed yet
    log.Printf("Grace period expired for session %s", sessionID)
}

func (dt *DisconnectTracker) handleWarningThreshold(sessionID string) {
    dt.mu.RLock()
    info, exists := dt.disconnections[sessionID]
    dt.mu.RUnlock()
    
    if !exists {
        return // Already reconnected
    }
    
    // Broadcast warning to room
    log.Printf("Broadcasting disconnect warning for %s", info.ActorID)
    
    // TODO: Send warning message to room
    // msg := &models.ServerMessage{
    //     Type: "PLAYER_CONNECTION_WARNING",
    //     Payload: map[string]interface{}{
    //         "actorId": info.ActorID,
    //         "message": fmt.Sprintf("%s lost connection...", playerName),
    //     },
    // }
}

func (dt *DisconnectTracker) handleRemovalThreshold(sessionID string) {
    dt.mu.Lock()
    info, exists := dt.disconnections[sessionID]
    if exists {
        delete(dt.disconnections, sessionID)
    }
    dt.mu.Unlock()
    
    if !exists {
        return // Already reconnected
    }
    
    // Remove player from room
    log.Printf("Auto-removing player after timeout: %s", info.ActorID)
    
    // TODO: Call room.RemovePlayer(info.ActorID)
    // TODO: Broadcast PLAYER_LEFT event to room
}
```

**Tasks**:
- [ ] Implement disconnect tracking map
- [ ] Create grace period timers (5s/15s/60s)
- [ ] Handle timer expirations
- [ ] Mark reconnection and cancel timers
- [ ] Calculate disconnect duration
- [ ] Integrate with room removal

---

### 2. Event Sequencing & Storage

**File**: `internal/game/event_log.go`

```go
package game

import (
    "sync"
    "time"
    "github.com/partyflow/backend/internal/models"
)

const (
    MAX_EVENT_LOG_SIZE = 200  // Keep last 200 events
)

type EventLog struct {
    events     []StoredEvent
    nextSeqID  int64
    mu         sync.RWMutex
}

type StoredEvent struct {
    SeqID     int64
    Timestamp time.Time
    Event     *models.ServerMessage
}

func NewEventLog() *EventLog {
    return &EventLog{
        events:    make([]StoredEvent, 0, MAX_EVENT_LOG_SIZE),
        nextSeqID: 1,
    }
}

func (el *EventLog) AppendEvent(event *models.ServerMessage) int64 {
    el.mu.Lock()
    defer el.mu.Unlock()
    
    seqID := el.nextSeqID
    el.nextSeqID++
    
    stored := StoredEvent{
        SeqID:     seqID,
        Timestamp: time.Now(),
        Event:     event,
    }
    
    el.events = append(el.events, stored)
    
    // Trim if exceeds max size
    if len(el.events) > MAX_EVENT_LOG_SIZE {
        el.events = el.events[len(el.events)-MAX_EVENT_LOG_SIZE:]
    }
    
    // Set sequence ID in message
    event.SequenceID = &seqID
    
    return seqID
}

func (el *EventLog) GetEventsSince(lastSeqID int64) []StoredEvent {
    el.mu.RLock()
    defer el.mu.RUnlock()
    
    missedEvents := make([]StoredEvent, 0)
    
    for _, stored := range el.events {
        if stored.SeqID > lastSeqID {
            missedEvents = append(missedEvents, stored)
        }
    }
    
    return missedEvents
}

func (el *EventLog) GetLatestSeqID() int64 {
    el.mu.RLock()
    defer el.mu.RUnlock()
    
    if len(el.events) == 0 {
        return 0
    }
    
    return el.events[len(el.events)-1].SeqID
}

func (el *EventLog) PruneOldEvents(retention time.Duration) {
    el.mu.Lock()
    defer el.mu.Unlock()
    
    cutoff := time.Now().Add(-retention)
    
    // Find first event newer than cutoff
    pruneIndex := 0
    for i, stored := range el.events {
        if stored.Timestamp.After(cutoff) {
            pruneIndex = i
            break
        }
    }
    
    // Prune old events
    if pruneIndex > 0 {
        el.events = el.events[pruneIndex:]
        log.Printf("Pruned %d old events", pruneIndex)
    }
}

// Add event log to Room
func (r *Room) InitEventLog() {
    r.eventLog = NewEventLog()
}

func (r *Room) LogEvent(event *models.ServerMessage) int64 {
    if r.eventLog == nil {
        r.InitEventLog()
    }
    return r.eventLog.AppendEvent(event)
}
```

**Tasks**:
- [ ] Create event log data structure
- [ ] Implement event append with sequence IDs
- [ ] Add event retrieval by sequence range
- [ ] Implement circular buffer (max 200 events)
- [ ] Add event log pruning (time-based)
- [ ] Integrate event logging into broadcast

---

### 3. State Snapshot Generation

**File**: `internal/game/snapshot.go`

```go
package game

import (
    "github.com/partyflow/backend/internal/models"
    "time"
)

type StateSnapshot struct {
    CurrentState  RoomState              `json:"currentState"`
    StateVersion  int64                  `json:"stateVersion"`
    GameState     map[string]interface{} `json:"gameState"`
    MissedEvents  []StoredEvent          `json:"missedEvents,omitempty"`
    Message       string                 `json:"message,omitempty"`
}

func (r *Room) GenerateStateSnapshot(lastSeqID int64) *StateSnapshot {
    r.mu.RLock()
    defer r.mu.RUnlock()
    
    snapshot := &StateSnapshot{
        CurrentState: r.State,
        StateVersion: r.StateVersion,
        GameState:    r.buildGameStatePayload(),
    }
    
    // Get missed events since lastSeqID
    if r.eventLog != nil {
        snapshot.MissedEvents = r.eventLog.GetEventsSince(lastSeqID)
    }
    
    return snapshot
}

func (r *Room) buildGameStatePayload() map[string]interface{} {
    payload := map[string]interface{}{
        "roomId":      r.ID,
        "playerCount": len(r.Players),
        "players":     r.getPlayerList(),
    }
    
    switch r.State {
    case LOBBY:
        // Just player list
        
    case TEAM_SETUP, READY_TO_START:
        payload["teams"] = r.getTeamList()
        
    case ROUND_STARTING, ROUND_ACTIVE, ROUND_PAUSED:
        payload["roundNumber"] = r.CurrentRound
        payload["activeTeamId"] = r.RoundConfig.ActiveTeamID
        payload["explainerPlayerId"] = r.RoundConfig.ExplainerID
        payload["currentScore"] = r.getScoreMap()
        
        if r.State == ROUND_ACTIVE {
            payload["remainingSeconds"] = int(r.GetRemainingTime().Seconds())
        }
        
        // Host-only: current word
        if r.RoundConfig != nil {
            payload["currentWordId"] = r.getCurrentWordID()
        }
        
    case ROUND_ENDED, SCORE_REVIEW:
        payload["roundNumber"] = r.CurrentRound
        payload["currentScore"] = r.getScoreMap()
        payload["justEndedTeamId"] = r.RoundConfig.ActiveTeamID
        
        // Calculate words guessed this round
        payload["wordsGuessed"] = r.getWordsGuessedThisRound()
        
    case READY_FOR_NEXT:
        payload["roundNumber"] = r.CurrentRound
        payload["currentScore"] = r.getScoreMap()
        payload["nextRoundIn"] = 2 // seconds
        
    case GAME_ENDED, FINAL_RESULTS:
        payload["finalScores"] = r.getScoreMap()
        payload["leaderboard"] = r.GetLeaderboard()
        payload["winnerTeamId"] = r.getWinnerTeamID()
        payload["gameDurationMin"] = int(time.Since(r.CreatedAt).Minutes())
    }
    
    return payload
}

func (r *Room) getCurrentWordID() string {
    // Get current word being explained
    if len(r.UsedWords) > 0 {
        return r.UsedWords[len(r.UsedWords)-1].ID
    }
    return ""
}

func (r *Room) getWordsGuessedThisRound() int {
    // Count words guessed by active team in current round
    // This would require tracking per-round stats
    // Simplified version:
    count := 0
    for _, team := range r.Teams {
        if team.ID == r.RoundConfig.ActiveTeamID {
            // Assuming 1 point per word
            count = team.Score
            break
        }
    }
    return count
}
```

**Tasks**:
- [ ] Create state snapshot struct
- [ ] Implement snapshot generation per state
- [ ] Include state-specific game data
- [ ] Add missed events to snapshot
- [ ] Test snapshot accuracy
- [ ] Optimize snapshot size

---

### 4. Reconnection Flow Handler

**File**: `internal/websocket/reconnect.go`

```go
package websocket

import (
    "encoding/json"
    "github.com/olahol/melody"
    "github.com/partyflow/backend/internal/models"
    "github.com/partyflow/backend/internal/game"
    "time"
)

type ReconnectHandler struct {
    server            *Server
    disconnectTracker *DisconnectTracker
}

func NewReconnectHandler(server *Server) *ReconnectHandler {
    return &ReconnectHandler{
        server:            server,
        disconnectTracker: NewDisconnectTracker(),
    }
}

func (rh *ReconnectHandler) HandleReconnect(session *melody.Session, msg *models.ClientMessage) error {
    sessionID := msg.Payload["sessionId"].(string)
    lastSeqID := int64(msg.Payload["lastSeqId"].(float64))
    
    // Get disconnect info
    disconnectInfo, err := rh.disconnectTracker.MarkReconnected(sessionID)
    if err != nil {
        return rh.handleNewConnection(session, msg)
    }
    
    // Calculate disconnect duration
    disconnectDuration := time.Since(disconnectInfo.DisconnectedAt)
    
    // Get room
    room, err := rh.server.rooms.GetRoom(msg.RoomID)
    if err != nil {
        return rh.sendReconnectFailed(session, msg.RoomID, "ROOM_NOT_FOUND",
            "Room no longer exists")
    }
    
    // Check if player still in room
    room.mu.RLock()
    _, playerExists := room.Players[msg.ActorID]
    room.mu.RUnlock()
    
    if !playerExists {
        return rh.sendReconnectFailed(session, msg.RoomID, "REMOVED_FROM_ROOM",
            "You were removed from the room")
    }
    
    // Update player connection status
    room.mu.Lock()
    if player, exists := room.Players[msg.ActorID]; exists {
        player.IsConnected = true
        player.LastSeenAt = time.Now()
    }
    room.mu.Unlock()
    
    // Determine reconnection strategy based on duration
    if disconnectDuration < 5*time.Second {
        return rh.handleShortDisconnect(session, room, lastSeqID, msg.ActorID)
    } else if disconnectDuration < 30*time.Second {
        return rh.handleMediumDisconnect(session, room, msg.ActorID)
    } else {
        return rh.handleLongDisconnect(session, room, msg.ActorID)
    }
}

func (rh *ReconnectHandler) handleShortDisconnect(
    session *melody.Session,
    room *game.Room,
    lastSeqID int64,
    actorID string,
) error {
    // Full backfill with missed events
    snapshot := room.GenerateStateSnapshot(lastSeqID)
    
    response := &models.ServerMessage{
        WSMessage: models.WSMessage{
            Type:      "RECONNECTED",
            RoomID:    room.ID,
            Timestamp: time.Now().UnixMilli(),
            Version:   "1.0",
        },
        Broadcast: models.BroadcastActor,
        Payload: map[string]interface{}{
            "currentState":  snapshot.CurrentState,
            "stateVersion":  snapshot.StateVersion,
            "gameState":     snapshot.GameState,
            "missedEvents":  snapshot.MissedEvents,
            "reconnectType": "FULL_BACKFILL",
        },
    }
    
    data, _ := json.Marshal(response)
    session.Write(data)
    
    log.Printf("Short disconnect recovery for %s: %d missed events",
        actorID, len(snapshot.MissedEvents))
    
    return nil
}

func (rh *ReconnectHandler) handleMediumDisconnect(
    session *melody.Session,
    room *game.Room,
    actorID string,
) error {
    // Snapshot only, no backfill
    snapshot := room.GenerateStateSnapshot(0) // lastSeqID=0 to skip events
    snapshot.Message = "You missed some action! Catching you up..."
    
    response := &models.ServerMessage{
        WSMessage: models.WSMessage{
            Type:      "RECONNECTED",
            RoomID:    room.ID,
            Timestamp: time.Now().UnixMilli(),
            Version:   "1.0",
        },
        Broadcast: models.BroadcastActor,
        Payload: map[string]interface{}{
            "currentState":  snapshot.CurrentState,
            "stateVersion":  snapshot.StateVersion,
            "gameState":     snapshot.GameState,
            "missedEvents":  nil,
            "message":       snapshot.Message,
            "reconnectType": "SNAPSHOT_ONLY",
        },
    }
    
    data, _ := json.Marshal(response)
    session.Write(data)
    
    log.Printf("Medium disconnect recovery for %s (snapshot only)", actorID)
    
    return nil
}

func (rh *ReconnectHandler) handleLongDisconnect(
    session *melody.Session,
    room *game.Room,
    actorID string,
) error {
    // Session expired, rejoin required
    response := &models.ServerMessage{
        WSMessage: models.WSMessage{
            Type:      "RECONNECT_FAILED",
            RoomID:    room.ID,
            Timestamp: time.Now().UnixMilli(),
            Version:   "1.0",
        },
        Broadcast: models.BroadcastActor,
        Payload: map[string]interface{}{
            "reason":      "SESSION_EXPIRED",
            "message":     "You've been disconnected too long. Rejoining as spectator.",
            "canRejoin":   true,
            "currentState": room.State,
        },
    }
    
    data, _ := json.Marshal(response)
    session.Write(data)
    
    log.Printf("Long disconnect recovery for %s (rejoin required)", actorID)
    
    // Mark player as spectator
    room.mu.Lock()
    if player, exists := room.Players[actorID]; exists {
        // TODO: Add spectator flag
        // player.IsSpectator = true
    }
    room.mu.Unlock()
    
    return nil
}

func (rh *ReconnectHandler) handleNewConnection(
    session *melody.Session,
    msg *models.ClientMessage,
) error {
    // First time connection (not a reconnect)
    // This shouldn't happen in reconnect flow
    return errors.New("no previous session found")
}

func (rh *ReconnectHandler) sendReconnectFailed(
    session *melody.Session,
    roomID string,
    reason string,
    message string,
) error {
    response := &models.ServerMessage{
        WSMessage: models.WSMessage{
            Type:      "RECONNECT_FAILED",
            RoomID:    roomID,
            Timestamp: time.Now().UnixMilli(),
            Version:   "1.0",
        },
        Broadcast: models.BroadcastActor,
        Payload: map[string]interface{}{
            "reason":  reason,
            "message": message,
        },
    }
    
    data, _ := json.Marshal(response)
    session.Write(data)
    
    return errors.New(reason)
}
```

**Tasks**:
- [ ] Implement reconnect message handler
- [ ] Add disconnect duration calculation
- [ ] Route to short/medium/long reconnect logic
- [ ] Generate appropriate response per duration
- [ ] Update player connection status
- [ ] Handle edge cases (room gone, player removed)

---

### 5. Host Disconnect Special Handling

**File**: `internal/game/host_disconnect.go`

```go
package game

import (
    "time"
)

const (
    HOST_DISCONNECT_GRACE = 10 * time.Second
    HOST_PROMOTION_TIMEOUT = 60 * time.Second
)

func (r *Room) HandleHostDisconnect() {
    // Start grace period timer
    time.AfterFunc(HOST_DISCONNECT_GRACE, func() {
        r.mu.RLock()
        hostConnected := r.Players[r.HostID].IsConnected
        state := r.State
        r.mu.RUnlock()
        
        if !hostConnected && state == ROUND_ACTIVE {
            // Auto-pause game
            log.Printf("Host disconnected, auto-pausing room %s", r.ID)
            r.TransitionState(EVT_HOST_PAUSE, "system")
            
            // Broadcast pause message
            r.broadcastHostDisconnectPause()
        }
    })
    
    // Start host promotion timer
    time.AfterFunc(HOST_PROMOTION_TIMEOUT, func() {
        r.mu.RLock()
        hostConnected := r.Players[r.HostID].IsConnected
        r.mu.RUnlock()
        
        if !hostConnected {
            // Promote new host
            log.Printf("Host timeout, promoting new host for room %s", r.ID)
            r.PromoteNewHost()
        }
    })
}

func (r *Room) PromoteNewHost() error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    // Find first connected player
    var newHostID string
    for playerID, player := range r.Players {
        if playerID != r.HostID && player.IsConnected {
            newHostID = playerID
            break
        }
    }
    
    if newHostID == "" {
        // No connected players to promote
        log.Printf("Cannot promote new host, no connected players in room %s", r.ID)
        return errors.New("no connected players available")
    }
    
    oldHostID := r.HostID
    r.HostID = newHostID
    
    log.Printf("Promoted %s to host (old host: %s)", newHostID, oldHostID)
    
    // Broadcast host change
    r.broadcastHostPromotion(oldHostID, newHostID)
    
    return nil
}

func (r *Room) broadcastHostDisconnectPause() {
    // TODO: Broadcast message via WebSocket
    // msg := &models.ServerMessage{
    //     Type: "GAME_PAUSED",
    //     Payload: map[string]interface{}{
    //         "reason": "Host disconnected",
    //         "message": "Waiting for host to reconnect...",
    //     },
    // }
}

func (r *Room) broadcastHostPromotion(oldHostID, newHostID string) {
    // TODO: Broadcast message via WebSocket
    // msg := &models.ServerMessage{
    //     Type: "HOST_PROMOTED",
    //     Payload: map[string]interface{}{
    //         "oldHostId": oldHostID,
    //         "newHostId": newHostID,
    //         "newHostName": r.Players[newHostID].Name,
    //     },
    // }
}
```

**Tasks**:
- [ ] Implement host disconnect detection
- [ ] Add auto-pause after 10 seconds
- [ ] Create host promotion logic
- [ ] Broadcast host change events
- [ ] Test host promotion during active round

---

### 6. Client-Side Exponential Backoff (Reference)

**Note**: This is client-side code for reference. Backend engineer should understand the flow.

**File**: `frontend/src/utils/reconnection.ts` (Reference only)

```typescript
const RECONNECT_CONFIG = {
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 1.5,
  jitterRange: 0.2
};

class ReconnectionManager {
  private attemptCount: number = 0;
  private reconnecting: boolean = false;
  
  calculateDelay(): number {
    const baseDelay = RECONNECT_CONFIG.baseDelay;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(
        RECONNECT_CONFIG.backoffMultiplier,
        this.attemptCount
      ),
      RECONNECT_CONFIG.maxDelay
    );
    
    // Add jitter
    const jitter = exponentialDelay * RECONNECT_CONFIG.jitterRange;
    return exponentialDelay + (Math.random() * jitter * 2 - jitter);
  }
  
  async attemptReconnect(
    sessionId: string,
    lastSeqId: number
  ): Promise<void> {
    if (this.attemptCount >= RECONNECT_CONFIG.maxAttempts) {
      throw new Error("Max reconnection attempts reached");
    }
    
    this.attemptCount++;
    const delay = this.calculateDelay();
    
    console.log(`Reconnect attempt ${this.attemptCount} in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Send RECONNECT message
    this.ws.send(JSON.stringify({
      type: "RECONNECT",
      roomId: this.roomId,
      actorId: this.actorId,
      payload: {
        sessionId,
        lastSeqId,
        disconnectTimestamp: this.disconnectTime
      }
    }));
  }
  
  onReconnectSuccess(): void {
    this.attemptCount = 0;
    this.reconnecting = false;
    console.log("Reconnection successful");
  }
}
```

**Understanding for Backend**:
- Client retries with exponential backoff
- Client sends last known sequence ID
- Client tracks disconnect timestamp
- Backend must handle multiple reconnect attempts gracefully

---

## Testing Requirements

### Unit Tests

```go
// internal/websocket/disconnect_test.go
func TestDisconnectGracePeriod(t *testing.T) {
    tracker := NewDisconnectTracker()
    
    // Mark disconnected
    tracker.MarkDisconnected("sess_1", "ROOM123", "player_1", 42)
    
    // Should be tracked
    duration, err := tracker.GetDisconnectDuration("sess_1")
    if err != nil {
        t.Fatalf("Expected disconnect to be tracked: %v", err)
    }
    
    if duration > 1*time.Second {
        t.Error("Duration should be near 0 initially")
    }
    
    // Wait for grace period
    time.Sleep(6 * time.Second)
    
    // Grace period should have expired
    // (Implementation should handle this in handleGracePeriodExpired)
}

// internal/game/snapshot_test.go
func TestStateSnapshotGeneration(t *testing.T) {
    room := NewRoom("host1", "Alice")
    room.State = ROUND_ACTIVE
    room.StateVersion = 10
    
    // Add some events
    room.InitEventLog()
    for i := 0; i < 5; i++ {
        event := &models.ServerMessage{
            WSMessage: models.WSMessage{
                Type: "WORD_RESULT",
            },
        }
        room.LogEvent(event)
    }
    
    // Generate snapshot with lastSeqID=2
    snapshot := room.GenerateStateSnapshot(2)
    
    if snapshot.StateVersion != 10 {
        t.Errorf("Expected version 10, got %d", snapshot.StateVersion)
    }
    
    // Should include events 3, 4, 5
    if len(snapshot.MissedEvents) != 3 {
        t.Errorf("Expected 3 missed events, got %d", len(snapshot.MissedEvents))
    }
}

// internal/websocket/reconnect_test.go
func TestReconnectionFlow(t *testing.T) {
    // Setup
    server := setupTestServer()
    handler := NewReconnectHandler(server)
    room := createTestRoom()
    
    // Simulate disconnect
    handler.disconnectTracker.MarkDisconnected(
        "sess_1", room.ID, "player_1", 10,
    )
    
    // Wait 3 seconds (short disconnect)
    time.Sleep(3 * time.Second)
    
    // Simulate reconnect
    msg := &models.ClientMessage{
        WSMessage: models.WSMessage{
            RoomID: room.ID,
        },
        ActorID: "player_1",
        Payload: map[string]interface{}{
            "sessionId": "sess_1",
            "lastSeqId": float64(10),
        },
    }
    
    mockSession := createMockSession()
    err := handler.HandleReconnect(mockSession, msg)
    
    if err != nil {
        t.Fatalf("Reconnect failed: %v", err)
    }
    
    // Verify response contains backfill
    // (Check mockSession.WrittenData)
}
```

**Test Coverage Requirements**:
- [ ] Disconnect tracking (100%)
- [ ] Grace period timers (90%)
- [ ] State snapshot generation (100%)
- [ ] Reconnection flow (short/medium/long) (90%)
- [ ] Event log append/retrieval (100%)
- [ ] Host disconnect handling (85%)

---

## Integration Testing

**File**: `cmd/test-reconnect/main.go`

```go
package main

import (
    "log"
    "time"
    "github.com/gorilla/websocket"
)

func main() {
    // Connect to server
    ws, _, err := websocket.DefaultDialer.Dial(
        "ws://localhost:8080/ws?roomId=TEST&actorId=player1",
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }
    
    // Receive some messages
    for i := 0; i < 5; i++ {
        var msg map[string]interface{}
        ws.ReadJSON(&msg)
        log.Printf("Received: %+v", msg)
    }
    
    // Close connection (simulate disconnect)
    ws.Close()
    log.Println("Disconnected")
    
    // Wait 3 seconds
    time.Sleep(3 * time.Second)
    
    // Reconnect
    ws2, _, err := websocket.DefaultDialer.Dial(
        "ws://localhost:8080/ws?roomId=TEST&actorId=player1",
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }
    
    // Send RECONNECT message
    reconnectMsg := map[string]interface{}{
        "type":    "RECONNECT",
        "roomId":  "TEST",
        "actorId": "player1",
        "payload": map[string]interface{}{
            "sessionId": "sess_player1",
            "lastSeqId": 5,
        },
    }
    ws2.WriteJSON(reconnectMsg)
    
    // Receive RECONNECTED response
    var response map[string]interface{}
    ws2.ReadJSON(&response)
    
    log.Printf("Reconnected: %+v", response)
    
    // Verify missed events included
    payload := response["payload"].(map[string]interface{})
    missedEvents := payload["missedEvents"].([]interface{})
    
    log.Printf("Received %d missed events", len(missedEvents))
}
```

**Integration Test Scenarios**:
- [ ] Short disconnect (<5s) receives full backfill
- [ ] Medium disconnect (5-30s) receives snapshot only
- [ ] Long disconnect (>30s) triggers rejoin flow
- [ ] Host disconnect pauses game after 10s
- [ ] Host reconnect within 60s resumes game
- [ ] Host timeout promotes new host
- [ ] Multiple rapid disconnect/reconnect attempts
- [ ] Reconnect after player removed from room

---

## Performance Benchmarks

```go
// internal/game/event_log_bench_test.go
func BenchmarkEventLogAppend(b *testing.B) {
    log := NewEventLog()
    
    event := &models.ServerMessage{
        WSMessage: models.WSMessage{
            Type: "WORD_RESULT",
        },
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        log.AppendEvent(event)
    }
}

func BenchmarkSnapshotGeneration(b *testing.B) {
    room := createTestRoom()
    room.InitEventLog()
    
    // Pre-populate event log
    for i := 0; i < 100; i++ {
        event := &models.ServerMessage{
            WSMessage: models.WSMessage{
                Type: "TIMER_TICK",
            },
        }
        room.LogEvent(event)
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        room.GenerateStateSnapshot(50)
    }
}
```

**Performance Targets**:
- [ ] Event log append: <100µs per event
- [ ] Snapshot generation: <5ms
- [ ] Disconnect tracking: <50µs
- [ ] Event retrieval (50 events): <1ms

---

## Acceptance Criteria

- [ ] Disconnect detection works within 1 second
- [ ] Grace period timers (5s/15s/60s) fire correctly
- [ ] Short disconnects receive full event backfill
- [ ] Medium disconnects receive snapshot only
- [ ] Long disconnects trigger rejoin flow
- [ ] Event log stores last 200 events
- [ ] State snapshot includes all relevant game data
- [ ] Host disconnect pauses game after 10s
- [ ] Host promotion works when timeout expires
- [ ] Multiple reconnect attempts handled gracefully
- [ ] Reconnect fails correctly when room is gone
- [ ] Unit test coverage >85%
- [ ] Integration tests pass
- [ ] No memory leaks in disconnect tracking

---

## Next Steps

After completing this task:
1. Proceed to **Task 4: Redis State Persistence** (agent-task-04-redis.md)
2. Test reconnection under network instability (packet loss, latency)
3. Verify edge cases with QA team

---

**Task Owner**: Backend Team  
**Reviewers**: Technical Lead, PM  
**Last Updated**: 2026-02-11

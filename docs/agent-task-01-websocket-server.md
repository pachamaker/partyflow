# Agent Task: WebSocket Server Core Implementation

**Agent Role**: Backend Engineer (Go)  
**Estimated Time**: 5-7 days  
**Dependencies**: None (foundational module)

---

## Task Overview

Implement the core WebSocket server infrastructure for PartyFlow using Go and Melody framework. This includes connection handling, message routing, protocol versioning, and acknowledgment system.

---

## Prerequisites

Read these documents first:
- `partyflow_websocket_architecture.md` (sections 1-2)
- `executive_summary.md` (product context)

---

## Technical Requirements

### 1. Project Setup

```bash
# Initialize Go module
go mod init github.com/partyflow/backend

# Install dependencies
go get github.com/olahol/melody
go get github.com/go-redis/redis/v8
go get github.com/google/uuid
go get github.com/gorilla/mux
```

### 2. Directory Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── websocket/
│   │   ├── server.go          # WebSocket server setup
│   │   ├── connection.go      # Connection lifecycle
│   │   ├── handler.go         # Message routing
│   │   └── protocol.go        # Protocol versioning
│   ├── game/
│   │   ├── room.go            # Room state management
│   │   ├── state_machine.go  # State transitions
│   │   └── events.go          # Event definitions
│   ├── store/
│   │   ├── memory.go          # In-memory cache
│   │   └── redis.go           # Redis persistence
│   └── models/
│       └── messages.go        # Message structs
├── pkg/
│   └── protocol/
│       └── messages.go        # Shared protocol definitions
└── go.mod
```

---

## Implementation Checklist

### Phase 1: WebSocket Server Foundation (Day 1-2)

**File**: `internal/websocket/server.go`

```go
package websocket

import (
    "net/http"
    "github.com/olahol/melody"
    "github.com/partyflow/backend/internal/game"
)

type Server struct {
    melody     *melody.Melody
    rooms      *game.RoomManager
    config     *Config
}

type Config struct {
    MaxMessageSize      int64
    WriteWait          time.Duration
    PongWait           time.Duration
    PingPeriod         time.Duration
    MaxConnections     int
}

func NewServer(config *Config, roomManager *game.RoomManager) *Server {
    m := melody.New()
    
    // Configure melody
    m.Config.MaxMessageSize = config.MaxMessageSize
    m.Config.WriteWait = config.WriteWait
    m.Config.PongWait = config.PongWait
    m.Config.PingPeriod = config.PingPeriod
    
    server := &Server{
        melody: m,
        rooms:  roomManager,
        config: config,
    }
    
    // Register handlers
    m.HandleConnect(server.handleConnect)
    m.HandleDisconnect(server.handleDisconnect)
    m.HandleMessage(server.handleMessage)
    
    return server
}

func (s *Server) handleConnect(session *melody.Session) {
    // TODO: Extract roomId and actorId from query params
    // TODO: Validate protocol version
    // TODO: Register session in room
    
    log.Printf("Client connected: %s", session.Request.RemoteAddr)
}

func (s *Server) handleDisconnect(session *melody.Session) {
    // TODO: Mark player as disconnected
    // TODO: Start disconnect grace period timer
    // TODO: Notify room of disconnect
    
    log.Printf("Client disconnected: %s", session.Request.RemoteAddr)
}

func (s *Server) handleMessage(session *melody.Session, msg []byte) {
    // TODO: Parse message envelope
    // TODO: Validate message format
    // TODO: Route to appropriate handler
}

func (s *Server) Start(addr string) error {
    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        s.melody.HandleRequest(w, r)
    })
    
    log.Printf("WebSocket server starting on %s", addr)
    return http.ListenAndServe(addr, nil)
}
```

**Tasks**:
- [ ] Implement `NewServer` with proper Melody configuration
- [ ] Set up connection handlers (connect/disconnect/message)
- [ ] Extract `roomId` and `actorId` from WebSocket upgrade request
- [ ] Add graceful shutdown mechanism
- [ ] Implement health check endpoint `/health`

---

### Phase 2: Protocol & Message Handling (Day 2-3)

**File**: `internal/models/messages.go`

```go
package models

import "time"

// Base message envelope
type WSMessage struct {
    Type       string                 `json:"type"`
    RoomID     string                 `json:"roomId"`
    Timestamp  int64                  `json:"timestamp"`
    Version    string                 `json:"version"`
    SequenceID *int64                 `json:"sequenceId,omitempty"`
}

// Client → Server messages
type ClientMessage struct {
    WSMessage
    ActorID string                 `json:"actorId"`
    Payload map[string]interface{} `json:"payload"`
}

// Server → Client messages
type ServerMessage struct {
    WSMessage
    Broadcast   BroadcastScope         `json:"broadcast"`
    Payload     map[string]interface{} `json:"payload"`
    RequiresAck bool                   `json:"requiresAck,omitempty"`
    AckID       string                 `json:"ackId,omitempty"`
}

type BroadcastScope string

const (
    BroadcastAll     BroadcastScope = "all"
    BroadcastHost    BroadcastScope = "host"
    BroadcastPlayers BroadcastScope = "players"
    BroadcastActor   BroadcastScope = "actor"
)

// ACK message
type AckMessage struct {
    Type      string `json:"type"`
    RoomID    string `json:"roomId"`
    ActorID   string `json:"actorId"`
    Timestamp int64  `json:"timestamp"`
    Version   string `json:"version"`
    Payload   struct {
        AckID  string `json:"ackId"`
        Status string `json:"status"`
    } `json:"payload"`
}
```

**File**: `internal/websocket/protocol.go`

```go
package websocket

import "errors"

const (
    CurrentProtocolVersion = "1.0"
)

var compatibilityMatrix = map[string][]string{
    "1.0": {"1.0"},
    // Future: "1.1": {"1.1", "1.0"},
}

func ValidateProtocolVersion(clientVersion string) error {
    supportedVersions := compatibilityMatrix[CurrentProtocolVersion]
    for _, v := range supportedVersions {
        if v == clientVersion {
            return nil
        }
    }
    return errors.New("incompatible protocol version")
}

func SerializeForVersion(msg *ServerMessage, clientVersion string) ([]byte, error) {
    // TODO: Version-specific serialization logic
    // For now, just marshal as-is
    return json.Marshal(msg)
}
```

**Tasks**:
- [ ] Define all message types as Go structs
- [ ] Implement JSON serialization/deserialization
- [ ] Add protocol version validation
- [ ] Implement message envelope parsing
- [ ] Add message type routing logic
- [ ] Create helper functions for building ServerMessage

---

### Phase 3: Message Broadcasting & Filtering (Day 3-4)

**File**: `internal/websocket/handler.go`

```go
package websocket

import (
    "encoding/json"
    "github.com/olahol/melody"
    "github.com/partyflow/backend/internal/models"
)

type MessageHandler struct {
    server *Server
}

func (h *MessageHandler) HandleClientMessage(session *melody.Session, rawMsg []byte) error {
    var msg models.ClientMessage
    if err := json.Unmarshal(rawMsg, &msg); err != nil {
        return err
    }
    
    // Route based on message type
    switch msg.Type {
    case "START_TEAM_SETUP":
        return h.handleStartTeamSetup(session, &msg)
    case "JOIN_TEAM":
        return h.handleJoinTeam(session, &msg)
    case "WORD_SWIPED":
        return h.handleWordSwiped(session, &msg)
    case "ACK":
        return h.handleAck(session, &msg)
    case "HEARTBEAT":
        return h.handleHeartbeat(session, &msg)
    default:
        return ErrUnknownMessageType
    }
}

func (h *MessageHandler) BroadcastToRoom(roomID string, msg *models.ServerMessage) error {
    data, err := json.Marshal(msg)
    if err != nil {
        return err
    }
    
    // Filter function to target specific room
    filter := func(s *melody.Session) bool {
        sessionRoomID := s.Get("roomId")
        return sessionRoomID == roomID
    }
    
    // Apply broadcast scope filtering
    switch msg.Broadcast {
    case models.BroadcastAll:
        return h.server.melody.BroadcastFilter(data, filter)
        
    case models.BroadcastHost:
        hostFilter := func(s *melody.Session) bool {
            return filter(s) && s.Get("isHost") == true
        }
        return h.server.melody.BroadcastFilter(data, hostFilter)
        
    case models.BroadcastPlayers:
        playersFilter := func(s *melody.Session) bool {
            return filter(s) && s.Get("isHost") != true
        }
        return h.server.melody.BroadcastFilter(data, playersFilter)
        
    case models.BroadcastActor:
        actorID := msg.Payload["actorId"].(string)
        actorFilter := func(s *melody.Session) bool {
            return filter(s) && s.Get("actorId") == actorID
        }
        return h.server.melody.BroadcastFilter(data, actorFilter)
    }
    
    return nil
}
```

**Tasks**:
- [ ] Implement message routing switch statement
- [ ] Create broadcast helper with scope filtering
- [ ] Add per-room message targeting
- [ ] Implement host-only and player-only broadcasts
- [ ] Add actor-specific message delivery
- [ ] Create broadcast error handling

---

### Phase 4: Acknowledgment System (Day 4)

**File**: `internal/websocket/ack.go`

```go
package websocket

import (
    "sync"
    "time"
    "github.com/google/uuid"
)

type AckTracker struct {
    pendingAcks map[string]*PendingAck
    mu          sync.RWMutex
}

type PendingAck struct {
    AckID       string
    MessageType string
    RoomID      string
    ActorID     string
    SentAt      time.Time
    RetryCount  int
    MaxRetries  int
    Timeout     time.Duration
    OnTimeout   func()
}

func NewAckTracker() *AckTracker {
    return &AckTracker{
        pendingAcks: make(map[string]*PendingAck),
    }
}

func (at *AckTracker) TrackMessage(msg *models.ServerMessage, session *melody.Session) string {
    if !msg.RequiresAck {
        return ""
    }
    
    ackID := uuid.New().String()
    msg.AckID = ackID
    
    pending := &PendingAck{
        AckID:       ackID,
        MessageType: msg.Type,
        RoomID:      msg.RoomID,
        ActorID:     session.Get("actorId").(string),
        SentAt:      time.Now(),
        RetryCount:  0,
        MaxRetries:  2,
        Timeout:     2 * time.Second,
        OnTimeout:   func() { at.handleTimeout(ackID, session) },
    }
    
    at.mu.Lock()
    at.pendingAcks[ackID] = pending
    at.mu.Unlock()
    
    // Start timeout timer
    go at.startTimeoutTimer(pending)
    
    return ackID
}

func (at *AckTracker) HandleAck(ackMsg *models.AckMessage) {
    at.mu.Lock()
    defer at.mu.Unlock()
    
    if pending, exists := at.pendingAcks[ackMsg.Payload.AckID]; exists {
        delete(at.pendingAcks, ackMsg.Payload.AckID)
        log.Printf("ACK received for %s from %s", pending.MessageType, ackMsg.ActorID)
    }
}

func (at *AckTracker) startTimeoutTimer(pending *PendingAck) {
    time.Sleep(pending.Timeout)
    
    at.mu.RLock()
    _, stillPending := at.pendingAcks[pending.AckID]
    at.mu.RUnlock()
    
    if stillPending {
        pending.OnTimeout()
    }
}

func (at *AckTracker) handleTimeout(ackID string, session *melody.Session) {
    at.mu.Lock()
    pending := at.pendingAcks[ackID]
    at.mu.Unlock()
    
    if pending.RetryCount < pending.MaxRetries {
        // Retry sending message
        log.Printf("Retrying message %s (attempt %d)", pending.MessageType, pending.RetryCount+1)
        pending.RetryCount++
        // TODO: Resend original message
        go at.startTimeoutTimer(pending)
    } else {
        // Mark connection as degraded
        log.Printf("Connection degraded for actor %s", pending.ActorID)
        session.Set("connectionDegraded", true)
        
        // Send warning to client
        warningMsg := &models.ServerMessage{
            WSMessage: models.WSMessage{
                Type:      "CONNECTION_WARNING",
                RoomID:    pending.RoomID,
                Timestamp: time.Now().UnixMilli(),
                Version:   "1.0",
            },
            Broadcast: models.BroadcastActor,
            Payload: map[string]interface{}{
                "actorId": pending.ActorID,
                "message": "Connection unstable. Some messages may be delayed.",
            },
        }
        // TODO: Send warningMsg
        
        at.mu.Lock()
        delete(at.pendingAcks, ackID)
        at.mu.Unlock()
    }
}
```

**Tasks**:
- [ ] Implement `AckTracker` with pending ACK map
- [ ] Create timeout handling with retry logic
- [ ] Add ACK receipt confirmation
- [ ] Implement connection degradation marking
- [ ] Send warning messages to degraded connections
- [ ] Add cleanup for expired ACKs

---

### Phase 5: Connection Lifecycle (Day 5)

**File**: `internal/websocket/connection.go`

```go
package websocket

import (
    "time"
    "github.com/olahol/melody"
)

type ConnectionManager struct {
    sessions map[string]*melody.Session  // sessionId → session
    mu       sync.RWMutex
}

func NewConnectionManager() *ConnectionManager {
    return &ConnectionManager{
        sessions: make(map[string]*melody.Session),
    }
}

func (cm *ConnectionManager) RegisterConnection(sessionID string, session *melody.Session) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    
    // Force-close existing connection with same sessionID
    if existingSession, exists := cm.sessions[sessionID]; exists {
        existingSession.Close()
    }
    
    cm.sessions[sessionID] = session
    session.Set("sessionId", sessionID)
    session.Set("connectedAt", time.Now())
}

func (cm *ConnectionManager) UnregisterConnection(sessionID string) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    
    delete(cm.sessions, sessionID)
}

func (cm *ConnectionManager) GetSession(sessionID string) (*melody.Session, bool) {
    cm.mu.RLock()
    defer cm.mu.RUnlock()
    
    session, exists := cm.sessions[sessionID]
    return session, exists
}

func (cm *ConnectionManager) StartHeartbeat(session *melody.Session) {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            // Send ping
            pingMsg := &models.ServerMessage{
                WSMessage: models.WSMessage{
                    Type:      "PING",
                    Timestamp: time.Now().UnixMilli(),
                    Version:   "1.0",
                },
            }
            data, _ := json.Marshal(pingMsg)
            if err := session.Write(data); err != nil {
                log.Printf("Heartbeat failed: %v", err)
                return
            }
        }
    }
}

func (cm *ConnectionManager) HandlePong(session *melody.Session) {
    session.Set("lastPongAt", time.Now())
}

func (cm *ConnectionManager) CheckStaleConnections() {
    cm.mu.RLock()
    defer cm.mu.RUnlock()
    
    now := time.Now()
    for sessionID, session := range cm.sessions {
        lastPong := session.Get("lastPongAt")
        if lastPong == nil {
            continue
        }
        
        lastPongTime := lastPong.(time.Time)
        if now.Sub(lastPongTime) > 20*time.Second {
            log.Printf("Stale connection detected: %s", sessionID)
            session.Close()
        }
    }
}
```

**Tasks**:
- [ ] Implement connection registration/unregistration
- [ ] Add session storage with metadata
- [ ] Implement heartbeat/ping-pong system
- [ ] Create stale connection detection
- [ ] Handle duplicate session IDs (force-close old)
- [ ] Add connection metrics (connected duration, message count)

---

### Phase 6: Error Handling & Validation (Day 6)

**File**: `internal/websocket/errors.go`

```go
package websocket

import "errors"

var (
    ErrUnknownMessageType    = errors.New("unknown message type")
    ErrInvalidMessageFormat  = errors.New("invalid message format")
    ErrMissingRequiredField  = errors.New("missing required field")
    ErrUnauthorized          = errors.New("unauthorized action")
    ErrRoomNotFound          = errors.New("room not found")
    ErrPlayerNotInRoom       = errors.New("player not in room")
    ErrIncompatibleVersion   = errors.New("incompatible protocol version")
    ErrMessageTooLarge       = errors.New("message exceeds size limit")
)

type ErrorResponse struct {
    Type      string `json:"type"`
    RoomID    string `json:"roomId"`
    Timestamp int64  `json:"timestamp"`
    Version   string `json:"version"`
    Broadcast string `json:"broadcast"`
    Payload   struct {
        Error   string `json:"error"`
        Message string `json:"message"`
        Code    string `json:"code"`
    } `json:"payload"`
}

func SendError(session *melody.Session, err error, roomID string) {
    errResp := &ErrorResponse{
        Type:      "ERROR",
        RoomID:    roomID,
        Timestamp: time.Now().UnixMilli(),
        Version:   "1.0",
        Broadcast: "actor",
    }
    
    errResp.Payload.Error = err.Error()
    
    switch err {
    case ErrUnauthorized:
        errResp.Payload.Code = "UNAUTHORIZED"
        errResp.Payload.Message = "You don't have permission for this action"
    case ErrRoomNotFound:
        errResp.Payload.Code = "ROOM_NOT_FOUND"
        errResp.Payload.Message = "Room does not exist"
    case ErrIncompatibleVersion:
        errResp.Payload.Code = "UPGRADE_REQUIRED"
        errResp.Payload.Message = "Please update your app"
    default:
        errResp.Payload.Code = "INTERNAL_ERROR"
        errResp.Payload.Message = "Something went wrong"
    }
    
    data, _ := json.Marshal(errResp)
    session.Write(data)
}
```

**Tasks**:
- [ ] Define all error types
- [ ] Create error response builder
- [ ] Implement error-to-client-message mapping
- [ ] Add validation helpers (required fields, types)
- [ ] Create error logging with context
- [ ] Add rate limiting for error messages

---

## Testing Requirements

### Unit Tests

```go
// internal/websocket/protocol_test.go
func TestProtocolVersionValidation(t *testing.T) {
    tests := []struct {
        clientVersion string
        shouldPass    bool
    }{
        {"1.0", true},
        {"0.9", false},
        {"2.0", false},
    }
    
    for _, tt := range tests {
        err := ValidateProtocolVersion(tt.clientVersion)
        if (err == nil) != tt.shouldPass {
            t.Errorf("Version %s: expected pass=%v, got err=%v", 
                tt.clientVersion, tt.shouldPass, err)
        }
    }
}

// internal/websocket/ack_test.go
func TestAckTimeout(t *testing.T) {
    tracker := NewAckTracker()
    
    // Create mock message requiring ACK
    msg := &models.ServerMessage{
        RequiresAck: true,
        Type:        "ROUND_STARTED",
    }
    
    // Track message
    ackID := tracker.TrackMessage(msg, mockSession)
    
    // Wait for timeout + 100ms
    time.Sleep(2100 * time.Millisecond)
    
    // Verify retry was attempted
    if tracker.pendingAcks[ackID].RetryCount != 1 {
        t.Error("Expected retry after timeout")
    }
}
```

**Test Coverage Requirements**:
- [ ] Protocol version validation (100%)
- [ ] Message parsing and serialization (100%)
- [ ] Broadcast filtering logic (100%)
- [ ] ACK tracking and timeout (90%)
- [ ] Connection lifecycle (80%)

---

## Integration Testing

Create test client to verify:

```go
// cmd/test-client/main.go
func main() {
    // Connect to WebSocket
    ws, _, err := websocket.DefaultDialer.Dial("ws://localhost:8080/ws?roomId=TEST123", nil)
    if err != nil {
        log.Fatal(err)
    }
    
    // Send handshake
    handshake := map[string]interface{}{
        "type":    "CONNECT",
        "roomId":  "TEST123",
        "actorId": "player_test",
        "version": "1.0",
    }
    ws.WriteJSON(handshake)
    
    // Read response
    var response map[string]interface{}
    ws.ReadJSON(&response)
    
    fmt.Printf("Connected: %+v\n", response)
}
```

**Integration Test Scenarios**:
- [ ] Client connects and receives CONNECTED message
- [ ] Client sends message and receives broadcast
- [ ] Client disconnects gracefully
- [ ] Client reconnects with same sessionId
- [ ] ACK required message triggers retry on timeout
- [ ] Invalid protocol version is rejected
- [ ] Large message is rejected with error

---

## Performance Benchmarks

```go
// internal/websocket/benchmark_test.go
func BenchmarkBroadcastToRoom(b *testing.B) {
    server := setupTestServer()
    room := createTestRoomWith100Players(server)
    
    msg := &models.ServerMessage{
        Type:      "TIMER_TICK",
        Broadcast: models.BroadcastAll,
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        server.handler.BroadcastToRoom(room.ID, msg)
    }
}
```

**Performance Targets**:
- [ ] Single message broadcast to 10 clients: <5ms
- [ ] 1000 concurrent connections: stable memory (<500MB)
- [ ] Message throughput: >10,000 msgs/sec per server
- [ ] P95 latency: <100ms for gameplay events

---

## Acceptance Criteria

Before marking this task complete, verify:

- [ ] WebSocket server starts and accepts connections
- [ ] Protocol version negotiation works correctly
- [ ] Messages are routed to correct handlers
- [ ] Broadcast scopes (all/host/players/actor) work
- [ ] ACK system tracks and retries failed deliveries
- [ ] Connection lifecycle handles connect/disconnect
- [ ] Heartbeat detects and closes stale connections
- [ ] Error messages are sent to clients
- [ ] Unit test coverage >80%
- [ ] Integration tests pass
- [ ] Performance benchmarks meet targets

---

## Next Steps

After completing this task:
1. Proceed to **Task 2: State Machine & Game Events** (agent-task-02-state-machine.md)
2. Review code with team
3. Deploy to staging environment
4. Run load tests with 100+ concurrent connections

---

## Questions & Support

If you encounter issues:
- Check `partyflow_websocket_architecture.md` for design decisions
- Review Melody documentation: https://github.com/olahol/melody
- Ask PM about ambiguous requirements
- Document technical decisions in code comments

---

**Task Owner**: Backend Team  
**Reviewers**: Technical Lead, PM  
**Last Updated**: 2026-02-11

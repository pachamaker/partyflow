# Agent Task: Game State Machine & Room Management

**Agent Role**: Backend Engineer (Go)  
**Estimated Time**: 4-5 days  
**Dependencies**: Task 1 (WebSocket Server Core) must be complete

---

## Task Overview

Implement the game state machine, room lifecycle management, and state transition logic. This module handles all game states from lobby setup through gameplay to final results, with proper event validation and concurrent action handling.

---

## Prerequisites

Read these documents first:
- `partyflow_websocket_architecture.md` (section 1: Game State Machine)
- `agent-task-01-websocket-server.md` (understand message protocol)

---

## Technical Requirements

### 1. State Machine Core

**File**: `internal/game/state_machine.go`

```go
package game

import (
    "errors"
    "sync"
    "time"
)

type RoomState string

const (
    ROOM_CREATED      RoomState = "ROOM_CREATED"
    LOBBY             RoomState = "LOBBY"
    TEAM_SETUP        RoomState = "TEAM_SETUP"
    READY_TO_START    RoomState = "READY_TO_START"
    ROUND_STARTING    RoomState = "ROUND_STARTING"
    ROUND_ACTIVE      RoomState = "ROUND_ACTIVE"
    ROUND_PAUSED      RoomState = "ROUND_PAUSED"
    ROUND_ENDED       RoomState = "ROUND_ENDED"
    SCORE_REVIEW      RoomState = "SCORE_REVIEW"
    READY_FOR_NEXT    RoomState = "READY_FOR_NEXT"
    GAME_ENDED        RoomState = "GAME_ENDED"
    FINAL_RESULTS     RoomState = "FINAL_RESULTS"
    ROOM_CLOSED       RoomState = "ROOM_CLOSED"
)

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

var (
    ErrInvalidTransition = errors.New("invalid state transition")
    ErrUnauthorized      = errors.New("unauthorized action")
)

// State transition map: currentState -> validEvents -> nextState
var stateTransitions = map[RoomState]map[GameEvent]RoomState{
    ROOM_CREATED: {
        EVT_PLAYER_JOINED: LOBBY,
    },
    LOBBY: {
        EVT_HOST_START_SETUP: TEAM_SETUP,
        EVT_PLAYER_JOINED:    LOBBY,
        EVT_PLAYER_LEFT:      LOBBY,
    },
    TEAM_SETUP: {
        EVT_PLAYER_ASSIGNED:    TEAM_SETUP,
        EVT_TEAMS_BALANCED:     READY_TO_START,
        EVT_HOST_CANCEL_SETUP:  LOBBY,
    },
    READY_TO_START: {
        EVT_HOST_CONFIRM_START: ROUND_STARTING,
        EVT_PLAYER_ASSIGNED:    TEAM_SETUP, // Rebalancing
    },
    ROUND_STARTING: {
        EVT_COUNTDOWN_TICK: ROUND_STARTING,
        EVT_ROUND_STARTED:  ROUND_ACTIVE,
    },
    ROUND_ACTIVE: {
        EVT_WORD_SWIPED:     ROUND_ACTIVE,
        EVT_TIMER_TICK:      ROUND_ACTIVE,
        EVT_HOST_PAUSE:      ROUND_PAUSED,
        EVT_ROUND_TIMEOUT:   ROUND_ENDED,
        EVT_PACK_EXHAUSTED:  ROUND_ENDED,
    },
    ROUND_PAUSED: {
        EVT_HOST_RESUME:  ROUND_ACTIVE,
        EVT_HOST_PAUSE:   ROUND_ENDED, // Force end
    },
    ROUND_ENDED: {
        EVT_SCORES_CALCULATED: SCORE_REVIEW,
    },
    SCORE_REVIEW: {
        EVT_NEXT_ROUND_READY: READY_FOR_NEXT,
        EVT_GAME_COMPLETE:    GAME_ENDED,
    },
    READY_FOR_NEXT: {
        EVT_ROUND_STARTED: ROUND_ACTIVE,
    },
    GAME_ENDED: {
        EVT_SCORES_CALCULATED: FINAL_RESULTS,
    },
    FINAL_RESULTS: {
        EVT_HOST_RESTART: LOBBY,
        EVT_ROOM_CLOSE:   ROOM_CLOSED,
    },
}

func isValidTransition(currentState RoomState, event GameEvent) bool {
    validEvents, exists := stateTransitions[currentState]
    if !exists {
        return false
    }
    _, valid := validEvents[event]
    return valid
}

func computeNextState(currentState RoomState, event GameEvent) RoomState {
    return stateTransitions[currentState][event]
}

func requiresHostPrivilege(event GameEvent) bool {
    hostOnlyEvents := map[GameEvent]bool{
        EVT_HOST_START_SETUP:   true,
        EVT_HOST_CONFIRM_START: true,
        EVT_HOST_CANCEL_SETUP:  true,
        EVT_HOST_PAUSE:         true,
        EVT_HOST_RESUME:        true,
        EVT_HOST_RESTART:       true,
        EVT_ROOM_CLOSE:         true,
    }
    return hostOnlyEvents[event]
}

func isIdempotent(event GameEvent, currentState RoomState) bool {
    // Check if already in target state
    targetState := computeNextState(currentState, event)
    return currentState == targetState
}
```

**Tasks**:
- [ ] Implement state transition validation
- [ ] Create state transition map
- [ ] Add host privilege checking
- [ ] Implement idempotency detection
- [ ] Add state machine unit tests

---

### 2. Room Management

**File**: `internal/game/room.go`

```go
package game

import (
    "sync"
    "time"
    "github.com/google/uuid"
)

type Room struct {
    ID              string
    State           RoomState
    StateVersion    int64
    HostID          string
    CreatedAt       time.Time
    UpdatedAt       time.Time
    
    // Participants
    Players         map[string]*Player
    MaxPlayers      int
    
    // Game configuration
    Teams           []*Team
    RoundConfig     *RoundConfig
    CurrentRound    int
    TotalRounds     int
    
    // Word pack
    WordPackID      string
    RemainingWords  []Word
    UsedWords       []Word
    
    // Timer state
    TimerStartedAt  *time.Time
    TimerDuration   time.Duration
    TimerPausedAt   *time.Time
    
    // Mutex for thread-safe operations
    mu              sync.RWMutex
}

type Player struct {
    ID            string
    Name          string
    AvatarColor   string
    TeamID        string
    IsConnected   bool
    JoinedAt      time.Time
    LastSeenAt    time.Time
}

type Team struct {
    ID         string
    Name       string
    Color      string
    Players    []string  // Player IDs
    Score      int
}

type RoundConfig struct {
    DurationSec    int
    ActiveTeamID   string
    ExplainerID    string
}

type Word struct {
    ID         string
    Text       string
    Difficulty string
    PackID     string
}

func NewRoom(hostID string, hostName string) *Room {
    roomID := generateRoomCode()
    
    return &Room{
        ID:           roomID,
        State:        ROOM_CREATED,
        StateVersion: 1,
        HostID:       hostID,
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
        Players:      make(map[string]*Player),
        MaxPlayers:   10,
        Teams:        make([]*Team, 0),
        TotalRounds:  6, // 3 rounds per team
    }
}

func generateRoomCode() string {
    // Generate 6-character alphanumeric code
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude ambiguous chars
    code := make([]byte, 6)
    for i := range code {
        code[i] = charset[rand.Intn(len(charset))]
    }
    return string(code)
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
        return nil
    }
    
    // 4. Execute side effects before transition
    if err := r.executePreTransitionHooks(event); err != nil {
        return err
    }
    
    // 5. Perform state transition
    oldState := r.State
    r.State = computeNextState(r.State, event)
    r.StateVersion++
    r.UpdatedAt = time.Now()
    
    log.Printf("Room %s: %s -> %s (event: %s)", r.ID, oldState, r.State, event)
    
    // 6. Execute side effects after transition
    r.executePostTransitionHooks(event)
    
    return nil
}

func (r *Room) executePreTransitionHooks(event GameEvent) error {
    switch event {
    case EVT_ROUND_STARTED:
        // Load first word from pack
        if len(r.RemainingWords) == 0 {
            return errors.New("no words available")
        }
        
    case EVT_HOST_CONFIRM_START:
        // Validate teams are balanced
        if !r.teamsAreBalanced() {
            return errors.New("teams must be balanced")
        }
    }
    return nil
}

func (r *Room) executePostTransitionHooks(event GameEvent) {
    switch event {
    case EVT_ROUND_STARTED:
        // Start timer
        now := time.Now()
        r.TimerStartedAt = &now
        r.TimerDuration = time.Duration(r.RoundConfig.DurationSec) * time.Second
        
        // Start timer goroutine
        go r.runRoundTimer()
        
    case EVT_ROUND_ENDED:
        // Calculate scores
        r.calculateRoundScore()
    }
}

func (r *Room) AddPlayer(playerID, playerName string) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    if len(r.Players) >= r.MaxPlayers {
        return errors.New("room is full")
    }
    
    if _, exists := r.Players[playerID]; exists {
        return errors.New("player already in room")
    }
    
    player := &Player{
        ID:          playerID,
        Name:        playerName,
        AvatarColor: generateAvatarColor(),
        IsConnected: true,
        JoinedAt:    time.Now(),
        LastSeenAt:  time.Now(),
    }
    
    r.Players[playerID] = player
    
    // Transition to LOBBY if first player
    if len(r.Players) == 1 && r.State == ROOM_CREATED {
        r.State = LOBBY
        r.StateVersion++
    }
    
    return nil
}

func (r *Room) RemovePlayer(playerID string) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    if _, exists := r.Players[playerID]; !exists {
        return errors.New("player not in room")
    }
    
    delete(r.Players, playerID)
    
    // Remove from team if assigned
    for _, team := range r.Teams {
        for i, pid := range team.Players {
            if pid == playerID {
                team.Players = append(team.Players[:i], team.Players[i+1:]...)
                break
            }
        }
    }
    
    return nil
}

func (r *Room) teamsAreBalanced() bool {
    if len(r.Teams) < 2 {
        return false
    }
    
    // Each team must have at least 1 player
    for _, team := range r.Teams {
        if len(team.Players) == 0 {
            return false
        }
    }
    
    // Teams should be within 1 player of each other
    minSize := len(r.Teams[0].Players)
    maxSize := minSize
    for _, team := range r.Teams[1:] {
        size := len(team.Players)
        if size < minSize {
            minSize = size
        }
        if size > maxSize {
            maxSize = size
        }
    }
    
    return (maxSize - minSize) <= 1
}

func (r *Room) GetPlayerCount() int {
    r.mu.RLock()
    defer r.mu.RUnlock()
    return len(r.Players)
}

func (r *Room) IsHost(actorID string) bool {
    r.mu.RLock()
    defer r.mu.RUnlock()
    return r.HostID == actorID
}
```

**Tasks**:
- [ ] Implement Room struct with all fields
- [ ] Create room initialization
- [ ] Implement state transition with mutex
- [ ] Add player add/remove operations
- [ ] Implement team balancing logic
- [ ] Add pre/post transition hooks
- [ ] Create room code generator

---

### 3. Round Timer Management

**File**: `internal/game/timer.go`

```go
package game

import (
    "time"
)

func (r *Room) runRoundTimer() {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            r.mu.RLock()
            if r.State != ROUND_ACTIVE {
                r.mu.RUnlock()
                return // Timer stopped
            }
            
            elapsed := time.Since(*r.TimerStartedAt)
            remaining := r.TimerDuration - elapsed
            
            if remaining <= 0 {
                r.mu.RUnlock()
                // Time's up!
                r.TransitionState(EVT_ROUND_TIMEOUT, "system")
                return
            }
            
            r.mu.RUnlock()
            
            // Broadcast timer tick
            r.broadcastTimerTick(int(remaining.Seconds()))
        }
    }
}

func (r *Room) PauseTimer() error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    if r.State != ROUND_ACTIVE {
        return errors.New("can only pause during active round")
    }
    
    now := time.Now()
    r.TimerPausedAt = &now
    
    return nil
}

func (r *Room) ResumeTimer() error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    if r.State != ROUND_PAUSED {
        return errors.New("can only resume from paused state")
    }
    
    if r.TimerPausedAt == nil {
        return errors.New("timer was not paused")
    }
    
    // Calculate elapsed time while paused
    pausedDuration := time.Since(*r.TimerPausedAt)
    
    // Adjust start time to account for pause
    adjustedStart := r.TimerStartedAt.Add(pausedDuration)
    r.TimerStartedAt = &adjustedStart
    r.TimerPausedAt = nil
    
    return nil
}

func (r *Room) GetRemainingTime() time.Duration {
    r.mu.RLock()
    defer r.mu.RUnlock()
    
    if r.TimerStartedAt == nil {
        return 0
    }
    
    elapsed := time.Since(*r.TimerStartedAt)
    remaining := r.TimerDuration - elapsed
    
    if remaining < 0 {
        return 0
    }
    
    return remaining
}

func (r *Room) broadcastTimerTick(remainingSeconds int) {
    // TODO: Send TIMER_TICK event to all players
    // This will be integrated with WebSocket broadcaster
}
```

**Tasks**:
- [ ] Implement round timer goroutine
- [ ] Add pause/resume timer logic
- [ ] Calculate remaining time accurately
- [ ] Handle timer expiration (trigger ROUND_TIMEOUT)
- [ ] Broadcast timer ticks (1/sec)
- [ ] Test timer edge cases (pause during last second, etc.)

---

### 4. Room Manager

**File**: `internal/game/room_manager.go`

```go
package game

import (
    "sync"
    "errors"
)

type RoomManager struct {
    rooms  map[string]*Room
    mu     sync.RWMutex
}

func NewRoomManager() *RoomManager {
    return &RoomManager{
        rooms: make(map[string]*Room),
    }
}

func (rm *RoomManager) CreateRoom(hostID, hostName string) (*Room, error) {
    room := NewRoom(hostID, hostName)
    
    rm.mu.Lock()
    defer rm.mu.Unlock()
    
    // Ensure unique room code
    if _, exists := rm.rooms[room.ID]; exists {
        // Collision, regenerate
        room.ID = generateRoomCode()
    }
    
    rm.rooms[room.ID] = room
    
    log.Printf("Room created: %s (host: %s)", room.ID, hostName)
    
    return room, nil
}

func (rm *RoomManager) GetRoom(roomID string) (*Room, error) {
    rm.mu.RLock()
    defer rm.mu.RUnlock()
    
    room, exists := rm.rooms[roomID]
    if !exists {
        return nil, errors.New("room not found")
    }
    
    return room, nil
}

func (rm *RoomManager) DeleteRoom(roomID string) error {
    rm.mu.Lock()
    defer rm.mu.Unlock()
    
    if _, exists := rm.rooms[roomID]; !exists {
        return errors.New("room not found")
    }
    
    delete(rm.rooms, roomID)
    log.Printf("Room deleted: %s", roomID)
    
    return nil
}

func (rm *RoomManager) GetActiveRoomCount() int {
    rm.mu.RLock()
    defer rm.mu.RUnlock()
    return len(rm.rooms)
}

func (rm *RoomManager) CleanupInactiveRooms() {
    rm.mu.Lock()
    defer rm.mu.Unlock()
    
    now := time.Now()
    for roomID, room := range rm.rooms {
        room.mu.RLock()
        inactiveDuration := now.Sub(room.UpdatedAt)
        playerCount := len(room.Players)
        room.mu.RUnlock()
        
        // Delete rooms inactive for >2 hours with no players
        if inactiveDuration > 2*time.Hour && playerCount == 0 {
            delete(rm.rooms, roomID)
            log.Printf("Cleaned up inactive room: %s", roomID)
        }
    }
}

// Start background cleanup goroutine
func (rm *RoomManager) StartCleanupWorker() {
    ticker := time.NewTicker(10 * time.Minute)
    go func() {
        for range ticker.C {
            rm.CleanupInactiveRooms()
        }
    }()
}
```

**Tasks**:
- [ ] Implement room storage map
- [ ] Add room creation with unique codes
- [ ] Implement room lookup
- [ ] Add room deletion
- [ ] Create inactive room cleanup
- [ ] Add room count metrics
- [ ] Start cleanup background worker

---

### 5. Gameplay Logic

**File**: `internal/game/gameplay.go`

```go
package game

import (
    "math/rand"
    "time"
)

func (r *Room) StartRound() error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    // Determine next team
    teamIndex := r.CurrentRound % len(r.Teams)
    activeTeam := r.Teams[teamIndex]
    
    // Randomly select explainer from team
    if len(activeTeam.Players) == 0 {
        return errors.New("active team has no players")
    }
    explainerID := activeTeam.Players[rand.Intn(len(activeTeam.Players))]
    
    r.RoundConfig = &RoundConfig{
        DurationSec:  60,
        ActiveTeamID: activeTeam.ID,
        ExplainerID:  explainerID,
    }
    
    r.CurrentRound++
    
    return nil
}

func (r *Room) GetNextWord() (*Word, error) {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    if len(r.RemainingWords) == 0 {
        return nil, errors.New("no words remaining")
    }
    
    // Pop first word
    word := r.RemainingWords[0]
    r.RemainingWords = r.RemainingWords[1:]
    
    return &word, nil
}

func (r *Room) RecordWordResult(wordID string, action string) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    // Find word in used words
    var word *Word
    for i := range r.UsedWords {
        if r.UsedWords[i].ID == wordID {
            word = &r.UsedWords[i]
            break
        }
    }
    
    if word == nil {
        return errors.New("word not found")
    }
    
    // Update team score
    if action == "guessed" {
        for _, team := range r.Teams {
            if team.ID == r.RoundConfig.ActiveTeamID {
                team.Score++
                break
            }
        }
    }
    
    return nil
}

func (r *Room) calculateRoundScore() {
    r.mu.Lock()
    defer r.mu.Unlock()
    
    // Count guessed words this round
    // Score already updated in RecordWordResult
    
    // Check if game is complete
    if r.CurrentRound >= r.TotalRounds {
        r.State = GAME_ENDED
        r.StateVersion++
    }
}

func (r *Room) GetLeaderboard() []*Team {
    r.mu.RLock()
    defer r.mu.RUnlock()
    
    // Create copy and sort by score
    leaderboard := make([]*Team, len(r.Teams))
    copy(leaderboard, r.Teams)
    
    sort.Slice(leaderboard, func(i, j int) bool {
        return leaderboard[i].Score > leaderboard[j].Score
    })
    
    return leaderboard
}

func generateAvatarColor() string {
    colors := []string{
        "#FF5733", "#33FF57", "#3357FF", "#FF33F5",
        "#F5FF33", "#33FFF5", "#FF8C33", "#8C33FF",
    }
    return colors[rand.Intn(len(colors))]
}
```

**Tasks**:
- [ ] Implement round start logic (team selection, explainer)
- [ ] Create word retrieval (next word from pack)
- [ ] Record word results (guessed/skipped)
- [ ] Calculate round scores
- [ ] Generate leaderboard
- [ ] Check game completion conditions

---

### 6. Event Broadcasting Integration

**File**: `internal/game/events.go`

```go
package game

import (
    "github.com/partyflow/backend/internal/models"
    "time"
)

type EventBroadcaster interface {
    BroadcastToRoom(roomID string, msg *models.ServerMessage) error
}

func (r *Room) SetBroadcaster(broadcaster EventBroadcaster) {
    r.broadcaster = broadcaster
}

func (r *Room) broadcastStateChange(event GameEvent, stateVersion int64) {
    if r.broadcaster == nil {
        return
    }
    
    msg := &models.ServerMessage{
        WSMessage: models.WSMessage{
            Type:      string(event),
            RoomID:    r.ID,
            Timestamp: time.Now().UnixMilli(),
            Version:   "1.0",
        },
        Broadcast: models.BroadcastAll,
        Payload:   r.buildStatePayload(),
    }
    
    r.broadcaster.BroadcastToRoom(r.ID, msg)
}

func (r *Room) buildStatePayload() map[string]interface{} {
    r.mu.RLock()
    defer r.mu.RUnlock()
    
    payload := map[string]interface{}{
        "state":        r.State,
        "stateVersion": r.StateVersion,
        "playerCount":  len(r.Players),
    }
    
    switch r.State {
    case LOBBY:
        payload["players"] = r.getPlayerList()
        
    case TEAM_SETUP:
        payload["teams"] = r.getTeamList()
        
    case ROUND_ACTIVE:
        payload["roundNumber"] = r.CurrentRound
        payload["remainingSeconds"] = int(r.GetRemainingTime().Seconds())
        payload["currentScore"] = r.getScoreMap()
        
    case SCORE_REVIEW:
        payload["leaderboard"] = r.GetLeaderboard()
        
    case GAME_ENDED:
        payload["finalScores"] = r.getScoreMap()
        payload["winner"] = r.getWinnerTeamID()
    }
    
    return payload
}

func (r *Room) getPlayerList() []map[string]interface{} {
    players := make([]map[string]interface{}, 0, len(r.Players))
    for _, player := range r.Players {
        players = append(players, map[string]interface{}{
            "id":          player.ID,
            "name":        player.Name,
            "avatarColor": player.AvatarColor,
            "isConnected": player.IsConnected,
        })
    }
    return players
}

func (r *Room) getTeamList() []map[string]interface{} {
    teams := make([]map[string]interface{}, len(r.Teams))
    for i, team := range r.Teams {
        teams[i] = map[string]interface{}{
            "id":      team.ID,
            "name":    team.Name,
            "color":   team.Color,
            "players": team.Players,
            "score":   team.Score,
        }
    }
    return teams
}

func (r *Room) getScoreMap() map[string]int {
    scores := make(map[string]int)
    for _, team := range r.Teams {
        scores[team.ID] = team.Score
    }
    return scores
}

func (r *Room) getWinnerTeamID() string {
    leaderboard := r.GetLeaderboard()
    if len(leaderboard) == 0 {
        return ""
    }
    return leaderboard[0].ID
}
```

**Tasks**:
- [ ] Create EventBroadcaster interface
- [ ] Implement state change broadcasting
- [ ] Build state-specific payloads
- [ ] Add helper methods for payload data
- [ ] Integrate with WebSocket broadcaster

---

## Testing Requirements

### Unit Tests

```go
// internal/game/state_machine_test.go
func TestStateTransitions(t *testing.T) {
    tests := []struct {
        currentState RoomState
        event        GameEvent
        shouldPass   bool
        expectedNext RoomState
    }{
        {LOBBY, EVT_HOST_START_SETUP, true, TEAM_SETUP},
        {LOBBY, EVT_ROUND_STARTED, false, LOBBY}, // Invalid
        {ROUND_ACTIVE, EVT_WORD_SWIPED, true, ROUND_ACTIVE},
        {ROUND_ACTIVE, EVT_ROUND_TIMEOUT, true, ROUND_ENDED},
    }
    
    for _, tt := range tests {
        valid := isValidTransition(tt.currentState, tt.event)
        if valid != tt.shouldPass {
            t.Errorf("Transition %s->%s: expected valid=%v, got %v",
                tt.currentState, tt.event, tt.shouldPass, valid)
        }
        
        if valid {
            nextState := computeNextState(tt.currentState, tt.event)
            if nextState != tt.expectedNext {
                t.Errorf("Expected next state %s, got %s",
                    tt.expectedNext, nextState)
            }
        }
    }
}

// internal/game/room_test.go
func TestRoomConcurrentAccess(t *testing.T) {
    room := NewRoom("host1", "Alice")
    
    // Simulate 10 concurrent player joins
    var wg sync.WaitGroup
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            playerID := fmt.Sprintf("player_%d", n)
            room.AddPlayer(playerID, fmt.Sprintf("Player %d", n))
        }(i)
    }
    
    wg.Wait()
    
    if room.GetPlayerCount() != 10 {
        t.Errorf("Expected 10 players, got %d", room.GetPlayerCount())
    }
}

// internal/game/timer_test.go
func TestTimerPauseResume(t *testing.T) {
    room := NewRoom("host1", "Alice")
    room.State = ROUND_ACTIVE
    
    // Start timer with 60 seconds
    now := time.Now()
    room.TimerStartedAt = &now
    room.TimerDuration = 60 * time.Second
    
    // Wait 5 seconds
    time.Sleep(5 * time.Second)
    
    // Pause
    room.PauseTimer()
    remainingBeforePause := room.GetRemainingTime()
    
    // Wait 3 more seconds (should not decrease remaining time)
    time.Sleep(3 * time.Second)
    
    // Resume
    room.ResumeTimer()
    remainingAfterResume := room.GetRemainingTime()
    
    // Should be roughly the same (within 1 second tolerance)
    diff := remainingBeforePause - remainingAfterResume
    if diff > 1*time.Second {
        t.Errorf("Timer leaked during pause: %v", diff)
    }
}
```

**Test Coverage Requirements**:
- [ ] State machine transitions (100%)
- [ ] Room lifecycle operations (90%)
- [ ] Concurrent room access (80%)
- [ ] Timer pause/resume (90%)
- [ ] Team balancing logic (100%)

---

## Integration with WebSocket Server

**File**: `cmd/server/main.go`

```go
package main

import (
    "github.com/partyflow/backend/internal/websocket"
    "github.com/partyflow/backend/internal/game"
)

func main() {
    // Initialize room manager
    roomManager := game.NewRoomManager()
    roomManager.StartCleanupWorker()
    
    // Initialize WebSocket server
    config := &websocket.Config{
        MaxMessageSize: 512 * 1024,
        WriteWait:      10 * time.Second,
        PongWait:       60 * time.Second,
        PingPeriod:     54 * time.Second,
    }
    
    wsServer := websocket.NewServer(config, roomManager)
    
    // Start server
    log.Fatal(wsServer.Start(":8080"))
}
```

**Tasks**:
- [ ] Wire room manager into WebSocket server
- [ ] Pass broadcaster to rooms
- [ ] Connect state changes to WebSocket events
- [ ] Test end-to-end flow

---

## Acceptance Criteria

- [ ] State machine validates all transitions correctly
- [ ] Concurrent state transitions are serialized (no race conditions)
- [ ] Room creation generates unique codes
- [ ] Players can join/leave rooms
- [ ] Team balancing logic works correctly
- [ ] Round timer runs and broadcasts ticks
- [ ] Timer can be paused and resumed accurately
- [ ] State changes trigger WebSocket broadcasts
- [ ] Idempotent events are handled correctly
- [ ] Host privileges are enforced
- [ ] Unit test coverage >85%
- [ ] Integration tests pass
- [ ] No data races detected by `go run -race`

---

## Next Steps

After completing this task:
1. Proceed to **Task 3: Reconnection System** (agent-task-03-reconnection.md)
2. Test state machine with WebSocket client
3. Verify timer accuracy under load

---

**Task Owner**: Backend Team  
**Reviewers**: Technical Lead, PM  
**Last Updated**: 2026-02-11

# PartyFlow AI Agents Guide

## Overview

This project uses specialized AI agents for parallel development. Each agent has a specific role with dedicated documentation and task files.

---

## Agent Roles

### 1. **Product Manager Agent**
**Use for**: PRD updates, feature prioritization, user stories, roadmap planning, competitive analysis

**Key Files**:
- PRD: `docs/pdr.md`

**Skills**: RICE/ICE prioritization, Jobs To Be Done framework, A/B test design

---

### 2. **UX/UI Agent**
**Use for**: Wireframes, user flows, interaction design, accessibility, mobile-first layouts

**Key Files**:
- UX Design: `docs/ux-design-documentation.md`
- React prototypes: `home-screen.jsx`, `lobby-screen.jsx`, `swipe-gameplay.jsx`, `live-scoreboard.jsx`

**Design Principles**: 
- Party-proof UI (large buttons, high contrast, swipe-first)
- Dual-screen architecture (phone = controller, tablet = scoreboard)
- Minimal cognitive load for noisy environments

---

### 3. **Technical Architect Agent** ⭐
**Use for**: System design, WebSocket architecture, real-time sync, PWA setup, infrastructure

**Key Files**:
- `docs/partyflow_websocket_architecture.md` - Complete technical spec
- `docs/agent-task-01-websocket-server.md` - WebSocket core implementation (5-7 days)
- `docs/agent-task-02-state-machine.md` - Game state management (4-5 days)
- `docs/agent-task-03-reconnection.md` - Reconnection system (3-4 days)

**Tech Stack**: Go + Melody WebSocket, Redis, React PWA, Framer Motion

**Key Decisions**:
- In-memory + async Redis backup (ADR-002)
- Sticky sessions for horizontal scaling (ADR-005)
- Conditional backfill on reconnect (ADR-004)

---

### 4. **QA Engineer Agent**
**Use for**: Test strategy, edge case planning, load testing, cross-browser testing

**Key Files**:
- `docs/qa.md`

**Focus Areas**:
- Multiplayer race conditions (3 players press simultaneously)
- Network instability (WiFi drops, timer desync)
- Cross-browser compatibility (iOS Safari, Android Chrome priority)
- Load testing: 1000 concurrent rooms target

---

### 5. **Content Creator Agent**
**Use for**: Word packs, UX copy, onboarding flows, error messages

**Key Files**:
- `docs/MVP_Starter_pack.json` - 100 curated words

**Content Specs**:
- JSON format: `{id, word, difficulty, category, hint}`
- Difficulty levels: easy/medium/hard
- Categories: animals, actions, objects, concepts
- Family-friendly filter applied

---

## Development Workflow

### Phase 1: MVP Backend (Weeks 1-4)
```
Week 1-2: WebSocket Server Core (agent-task-01)
├─ Connection handling
├─ Message protocol
└─ Broadcast system

Week 2-3: State Machine (agent-task-02)
├─ Room lifecycle
├─ Team management
└─ Round timer

Week 3-4: Reconnection (agent-task-03)
├─ Disconnect detection
├─ State recovery
└─ Event backfill
```

### Phase 2: MVP Frontend (Weeks 5-8)
```
Week 5-6: Core Screens
├─ Home + QR join
├─ Lobby + team setup
└─ Swipe gameplay

Week 7-8: Real-time Sync
├─ WebSocket client
├─ State reconciliation
└─ Reconnection UI
```

---

## Quick Start for Agents

### When starting a new task:

1. **Read the architecture doc first**:
   ```
   docs/partyflow_websocket_architecture.md (sections 1-3)
   ```

2. **Find your task file**:
   ```
   docs/agent-task-XX-[name].md
   ```

3. **Check dependencies**:
   - Task 1 → No dependencies (start here)
   - Task 2 → Requires Task 1
   - Task 3 → Requires Tasks 1 + 2

4. **Follow the checklist**:
   - Each task has Implementation Checklist
   - Unit test templates provided
   - Acceptance criteria defined

---

## Agent Handoff Protocol

When completing a task:

1. ✅ Mark all checklist items complete
2. ✅ Run unit tests (>80% coverage required)
3. ✅ Run integration tests
4. ✅ Update `AGENTS.md` with status
5. ✅ Document any ADRs (Architecture Decision Records)
6. ✅ Tag next agent in handoff comment

---

## Current Status

| Task | Agent | Status | ETA |
|------|-------|--------|-----|
| WebSocket Server (Task 1) | Backend | 🔴 Not Started | Week 1-2 |
| State Machine (Task 2) | Backend | 🔴 Not Started | Week 2-3 |
| Reconnection (Task 3) | Backend | 🔴 Not Started | Week 3-4 |
| Frontend Core | Frontend | 🔴 Not Started | Week 5-6 |
| Real-time Sync | Frontend | 🔴 Not Started | Week 7-8 |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## Communication Channels

**For PM**: Questions about features, priorities, user stories  
**For Tech Lead**: Questions about architecture, tech stack, ADRs  
**For QA**: Questions about test coverage, edge cases  

**Emergency escalation**: If you encounter a blocking issue that prevents task completion, document it in the task file and escalate immediately.

---

## Key Metrics

**Target Performance**:
- WebSocket latency: <100ms (p95)
- Reconnection time: <5 seconds
- Server capacity: 1000 concurrent rooms/instance
- Game setup time: <2 taps from home to game start

**Quality Gates**:
- Unit test coverage: >80%
- Integration tests: All passing
- No data races (`go test -race`)
- Load test: 1000 rooms sustained for 1 hour

---

## Resources

**Documentation**:
- Architecture spec: `docs/partyflow_websocket_architecture.md`
- PRD: `docs/pdr.md`
- UX Design: `docs/ux-design-documentation.md`
- QA Strategy: `docs/qa.md`

**External References**:
- [Gorilla WebSocket](https://pkg.go.dev/github.com/gorilla/websocket)
- [Melody Framework](https://github.com/olahol/melody)
- [Redis Documentation](https://redis.io/docs/)

---

**Last Updated**: 2026-02-11  
**Project Lead**: P.S.  
**Architecture Version**: 1.0
# 🤖 Backend Agent — PartyFlow

**Role:** Backend Developer Agent  
**Primary responsibility:** real-time game state + room/session management + authoritative timing/scoring.

> Follow global rules in `/AGENTS.md`. Requirements and quality bar live in `docs/pdr.md` and `docs/qa.md`.

---

## Tech scope (backend)
- Node.js 20+, TypeScript
- Express (если нужен REST), WebSocket layer (Socket.io)
- Redis (optional/shared state; dev via docker-compose)

---

## Ownership boundaries
### You own
- Room lifecycle: create/join/leave, host transfer, capacity limits.
- Game state machine & transitions (server-authoritative).
- Timer authority (server ticks / end-of-round conditions).
- Reconnect & state recovery.
- Validation, rate limiting, basic abuse prevention.
- Event emission consistency and backward compatibility.

### You do NOT own
- UI/UX rendering decisions (but you enforce “no words for scoreboard” by payload design).

---

## Backend non-functional constraints
- Latency target: real-time events should feel instant (<200ms typical).
- Safety: validate all inbound payloads; do not trust clients.
- Consistency: state updates must be atomic enough to avoid race conditions.
- Resilience: disconnects are normal; recovery should not corrupt game.

---

## Implementation checklist (per change)
- [ ] Identify affected events and update shared contract/types.
- [ ] Add/adjust validation schemas for inbound payloads.
- [ ] Add/adjust tests (unit for services, integration for socket flows).
- [ ] Ensure reconnection path rehydrates correct state.
- [ ] Ensure scoreboard never receives word payloads.

---

## Suggested module layout (guideline)
- `src/services/*` — domain services (Room/Game/Word/Player)
- `src/websocket/*` — event handlers, middleware, event constants
- `src/models|types/*` — shared domain types
- `tests/unit`, `tests/integration` — per `docs/qa.md`

---

## Local dev expectations
- Redis via docker-compose (preferred)
- Health endpoint and structured logs helpful for debugging

---
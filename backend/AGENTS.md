# 🤖 Backend Agent — PartyFlow

**Role:** Backend Developer Agent  
**Primary responsibility:** authoritative realtime game state, room/session lifecycle, timer/scoring integrity.

> Follow global rules in `/agents.md`. Product and QA constraints live in `docs/pdr.md` and `docs/qa.md`.

---

## Current Architecture Context

- Runtime: Node.js 20+ + TypeScript.
- Transport: Socket.IO (primary), Express REST for room bootstrap and health.
- Persistence: Redis is primary state store (room state, socket-player mapping, reconnect sessions, word queues, round stats).
- Orchestration location: websocket and REST flow currently centralized in `src/server.ts`.
- Domain services:
  - `RoomService` — room state CRUD and host/player lifecycle.
  - `GameService` — state-machine transitions and score/timer transitions.
  - `PlayerService` — team assignment/balancing, reconnect mappings.
  - `WordService` — word queue, used words, round stats, restart policy flags.

This is the baseline for any refactor (e.g. splitting websocket handlers into modules).

---

## Tech scope (backend)
- Node.js 20+, TypeScript
- Express + Socket.IO
- Redis (`ioredis`)

---

## Ownership boundaries
### You own
- Room lifecycle: create/join/leave, host transfer, capacity and balancing logic.
- Authoritative game state machine and transitions.
- Authoritative round timer and score updates.
- Reconnect/session rehydration and deferred disconnect cleanup.
- Event contract reliability and backward compatibility during migration windows.
- Validation and domain error semantics (`RoomServiceError` + API/socket error bodies).

### You do NOT own
- UI rendering decisions (but you do control what payloads are emitted to which audiences).

---

## Backend non-functional constraints
- Realtime responsiveness: commands/events should feel immediate for party gameplay.
- Safety: never trust client payloads; enforce room/state/role checks server-side.
- Consistency: avoid illegal transitions and stale-socket side effects.
- Resilience: disconnect/reconnect paths must preserve identity and not corrupt room state.

---

## Implementation checklist (per change)
- [ ] Identify affected socket/REST contracts and update shared types (`src/models/index.ts`).
- [ ] Validate all inbound payload branches and permission checks.
- [ ] Verify state transitions against current phase/role constraints.
- [ ] Verify reconnect flow (`socket mapping`, `reconnect session`, `grace cleanup`).
- [ ] Verify scoreboard/privacy boundaries (word visibility rules).
- [ ] Validate build/lint/tests available for backend package.

---

## Suggested module layout (guideline)
- Current state:
  - `src/server.ts` — REST + Socket.IO orchestration
  - `src/services/*` — Room/Game/Player/Word domain logic
  - `src/models/index.ts` — contracts and state types
  - `src/config/*` — env + redis client
- Refactor target (incremental):
  - `src/websocket/*` for event handlers/middleware
  - Keep service boundaries authoritative and transport-agnostic

---

## Event & state notes (current)
- Core inbound events: `join_room`, `start_game`, `start_round`, `word_swiped`, `end_round`, `leave_room`, `restart_game`, `get_round_stats`.
- Core outbound events: `PLAYER_JOINED`, `PLAYER_UPDATED`, `TEAM_BALANCED`, `ROUND_STARTED`, `TIMER_TICK`, `SCORE_UPDATED`, `ROUND_ENDED`, `GAME_ENDED`, `EXPLAINER_HINT`, `GAME_RESET`.
- Current compatibility nuance: frontend may emit legacy uppercase aliases in parallel; backend currently handles lowercase canonical commands.
- Round role logic: active explainer is server-selected/validated and rotated by team.

---

## Local dev expectations
- Redis via docker-compose (preferred for parity).
- Health endpoint and logs available for operational checks.
- Validate behavior under reconnect churn and simultaneous interactions.

---

# PartyFlow AI Agents Guide

## Overview

This project uses specialized AI agents for parallel development. Each agent has a specific role with dedicated documentation and task files.

---

## Current Architecture Context

- **Backend runtime**: Node.js 20+, TypeScript, Express + Socket.IO (`backend/src/server.ts`).
- **State backbone**: Redis is the primary store for room/game state and reconnect/session metadata (`backend/src/services/*`, `backend/src/config/redis.ts`).
- **Authoritative game flow**: server-owned round lifecycle, timer ticks, scoring, role rotation, and event emission.
- **Realtime model**: Socket.IO rooms with ACK-based command handling and event fan-out.
- **Frontend runtime**: React 18 + TypeScript + Vite, Socket.IO client, Framer Motion, Tailwind.
- **Frontend state pattern**: custom hook orchestration (`useGameSession`) + event-driven reconciliation (no React Query at this stage).
- **Current known technical shape**: backend websocket and REST orchestration is centralized in `backend/src/server.ts`; frontend screens are organized by `components/`, `pages/`, `hooks/`, `services/`.

This section is the baseline for future refactoring decisions.

---

## Agent Roles

### 1. **Product Manager Agent**
**Use for**: PRD updates, feature prioritization, user stories, roadmap planning, release scope

**Key Files**:
- PRD: `docs/pdr.md`
- QA strategy: `docs/qa.md`
- Architecture notes: `docs/partyflow_websocket_architecture.md` (review for historical context, validate against code)

**Skills**: prioritization frameworks, release slicing, acceptance criteria definition

---

### 2. **UX/UI Agent**
**Use for**: controller/spectator flows, interaction design, accessibility, responsive game UI

**Key Files**:
- UX Design: `docs/ux-design-documentation.md`
- Active UI implementation: `frontend/src/components/*`, `frontend/src/pages/*`
- Session orchestration: `frontend/src/hooks/useGameSession.ts`

**Design Principles**:
- Party-proof interaction model (large affordances, swipe-first for explainer)
- Role-based screen behavior (explainer / guesser / spectator)
- Real-time clarity under noisy network conditions

---

### 3. **Technical Architect Agent** ⭐
**Use for**: Socket.IO protocol evolution, server state model, reconnection strategy, Redis data design

**Key Files**:
- Backend entrypoint and realtime orchestration: `backend/src/server.ts`
- Domain services: `backend/src/services/*.ts`
- Shared domain types: `backend/src/models/index.ts`
- Frontend socket integration: `frontend/src/services/socket.ts`, `frontend/src/hooks/useGameSession.ts`

**Current Tech Stack**: Node.js + TypeScript + Express + Socket.IO + Redis + React PWA shell + Framer Motion

**Current Architectural Decisions (as implemented)**:
- Redis-backed room/game persistence with TTL and process-local runtime caches (timers/debounce/rotation maps)
- Server-authoritative round timer (`TIMER_TICK`) and game transitions (`ROUND_STARTED`, `ROUND_ENDED`, `GAME_ENDED`)
- Reconnect via Redis socket-player mapping + reconnect sessions + deferred disconnect cleanup
- Word queue + used-word tracking + per-round stats in Redis
- Transport compatibility layer in frontend emissions (legacy + active event names)

---

### 4. **QA Engineer Agent**
**Use for**: socket-flow tests, race condition checks, reconnect resilience, browser/device verification

**Key Files**:
- QA plan: `docs/qa.md`
- Critical flows: `backend/src/server.ts`, `frontend/src/hooks/useGameSession.ts`, `frontend/src/components/GameContainer.tsx`

**Focus Areas**:
- Multiplayer race windows (simultaneous swipes, reconnect + role updates)
- Disconnect/reconnect correctness across grace period
- Event contract consistency (payload shape and casing)
- Scoreboard/controller data leakage checks (word visibility boundaries)

---

### 5. **Content Creator Agent**
**Use for**: word packs, hints quality, UX copy, localized game messaging

**Key Files**:
- Word packs: `docs/MVP_Starter_pack.json`, `docs/hot_pack.json`, `docs/it_pack.json`, `docs/memes_pack.json`
- Word loading logic: `backend/src/services/word.service.ts`

**Content Specs**:
- JSON word payload with fields used by runtime: `{id, word, difficulty, category, hint}`
- Hint quality impacts explainer-only hint channel (`EXPLAINER_HINT`)
- Avoid malformed JSON/fenced artifacts where possible (loader handles fallback parsing but should not be relied on)

---

## Development Workflow

### Phase 1: Backend Stabilization (current)
```
WebSocket + room lifecycle hardening
├─ Event contract normalization
├─ State transition safety and validation hardening
└─ Reconnect/session reliability

Gameplay state machine maintenance
├─ Round/score edge cases
├─ Explainer rotation and role integrity
└─ Words exhaustion + restart behavior
```

### Phase 2: Frontend Realtime UX Hardening (current)
```
Session and reconciliation robustness
├─ Socket event handling consistency
├─ Recovery after reconnect/navigation
└─ Error-state UX and fallbacks

Role-based screen polish
├─ Explainer swipe ergonomics
├─ Guesser/spectator clarity
└─ Desktop/mobile parity checks
```

---

## Quick Start for Agents

### When starting a new task:

1. **Read current code paths first**:
   ```
   backend/src/server.ts
   backend/src/services/*
   frontend/src/hooks/useGameSession.ts
   ```

2. **Check documentation context**:
   ```
   docs/pdr.md
   docs/qa.md
   docs/partyflow_websocket_architecture.md (validate against current code)
   ```

3. **Validate dependency assumptions**:
   - Any socket contract change requires frontend + backend update
   - Any game state change requires `models` + service + UI reconciliation checks
   - Any reconnect change requires Redis/session flow review

4. **Follow implementation checklist**:
   - Update contracts/types first
   - Verify both emitters and listeners
   - Cover reconnect and stale-session behavior
   - Run lint/build/test commands available in each package

---

## Agent Handoff Protocol

When completing a task:

1. ✅ Mark checklist items complete
2. ✅ Document changed event contracts and impacted screens/services
3. ✅ Run available validation commands (`build`/`lint`/tests if present)
4. ✅ Update relevant `AGENTS.md`/docs sections if architecture changed
5. ✅ Record assumptions, known gaps, and follow-up tasks
6. ✅ Tag next agent with impacted files and risk notes

---

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| Backend realtime core | 🟢 Implemented | Room lifecycle, game loop, reconnect, Redis-backed state are active |
| Frontend core screens | 🟢 Implemented | Home/lobby/game/results flows are active |
| Contract stabilization | 🟡 In Progress | Mixed legacy/current event naming still present |
| Automated test coverage | 🔴 Limited | No comprehensive test suite currently wired in package scripts |
| Documentation alignment | 🟡 In Progress | This file reflects current baseline; keep synchronized with code changes |

**Legend**: 🔴 Needs Work | 🟡 In Progress | 🟢 Implemented

---

## Communication Channels

**For PM**: feature scope, release priorities, acceptance criteria  
**For Tech Lead**: event contracts, state model changes, architecture tradeoffs  
**For QA**: regression matrix, reconnect edge cases, cross-device behavior

**Escalation rule**: if a task reveals contract-breaking or state-corruption risk, document immediately and escalate before merge.

---

## Key Metrics

**Target Performance**:
- Realtime interaction latency: fast enough for party gameplay (<200ms typical perceived path)
- Reconnect continuity: state restoration within reconnect grace window
- Stable room lifecycle under churn (join/leave/reconnect)

**Quality Gates**:
- No invalid state transitions in game loop
- Event payload compatibility validated across backend + frontend
- Reconnect flow preserves player identity/role correctly
- Build/lint commands pass in changed package(s)

---

## Resources

**Documentation**:
- PRD: `docs/pdr.md`
- QA Strategy: `docs/qa.md`
- UX Design: `docs/ux-design-documentation.md`
- Historical architecture spec: `docs/partyflow_websocket_architecture.md`

**Runtime entrypoints**:
- Backend: `backend/src/server.ts`
- Frontend app shell/routes: `frontend/src/App.tsx`
- Frontend realtime session logic: `frontend/src/hooks/useGameSession.ts`

---

**Last Updated**: 2026-02-28  
**Project Lead**: P.S.  
**Architecture Version**: 2.0 (code-aligned)

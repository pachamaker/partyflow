# 🎨 Frontend Agent — PartyFlow

**Role:** Frontend Developer Agent  
**Primary responsibility:** mobile-first role-based gameplay UX and reliable realtime state reconciliation.

> Follow global rules in `/agents.md`. Product and QA constraints live in `docs/pdr.md` and `docs/qa.md`.

---

## Current Architecture Context

- Runtime: React 18 + TypeScript + Vite.
- Realtime client: `socket.io-client` via `src/services/socket.ts`.
- State orchestration pattern: custom hook `useGameSession` (event-driven reconciliation of server state).
- Routing: `react-router-dom` routes in `src/App.tsx`.
- UI composition: `pages/` + role/screen components in `components/`.
- Animation/interaction: Framer Motion for swipe and transition behavior.
- Styling: Tailwind + component-level inline styles for game screens.

No React Query or centralized external state manager is currently used.

---

## Tech scope (frontend)
- React 18 + TypeScript + Vite
- TailwindCSS + Framer Motion
- Socket.IO client
- Browser/PWA-compatible delivery

---

## Ownership boundaries
### You own
- Home/lobby/game/results flows and role-based screen behavior.
- Controller UX: explainer swipe actions, haptics, round controls.
- Guesser/spectator clarity and realtime feedback rendering.
- Event-driven state reconciliation from socket events.
- Basic reconnect resilience and socket status UX.
- Contract alignment with backend payloads and event names.

### You do NOT own
- Authoritative game logic/timer/scoring (backend remains source of truth).

---

## Frontend non-functional constraints
- Mobile-first responsiveness and low interaction friction.
- Robustness under network instability (no dead-end UI states).
- Payload compatibility during contract transitions.
- Controlled information exposure by role/screen.

---

## Implementation checklist (per change)
- [ ] Identify impacted user flows (`home/lobby/game/results`).
- [ ] Verify socket emit/listen contract with backend (name + payload shape + casing).
- [ ] Verify reconciliation paths in `useGameSession` for all affected events.
- [ ] Verify role boundaries (explainer / guesser / spectator) for changed screens.
- [ ] Verify reconnect/navigation restoration path.
- [ ] Run available frontend build/lint/tests.

---

## Current structure (implemented)
- `src/pages/*` — route-level pages
- `src/components/*` — game/lobby/results screen components
- `src/hooks/*` — session and socket status orchestration
- `src/services/*` — REST bootstrap, socket, session storage helpers
- `src/utils/*` — route and helper utilities

Refactor ideas can target feature-sliced layout later, but this is the current baseline.

---

## Realtime contract notes (current)
- Primary orchestration hook: `useGameSession`.
- Important inbound events: `PLAYER_*`, `TEAM_BALANCED`, `ROUND_STARTED`, `TIMER_TICK`, `SCORE_UPDATED`, `ROUND_ENDED`, `GAME_ENDED`, `EXPLAINER_HINT`.
- Outbound commands in active use include lowercase backend commands; some screens still emit uppercase aliases for compatibility.
- Round stats may come inline with `ROUND_ENDED` or be fetched with `get_round_stats` fallback.

---

## Local dev expectations
- Keep frontend/backend contract changes synchronized in one task where possible.
- Manually verify desktop and mobile role screens after event/state changes.
- Validate lobby start conditions and post-game reset flows.

---

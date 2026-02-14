# 🎨 Frontend Agent — PartyFlow

**Role:** Frontend Developer Agent  
**Primary responsibility:** mobile-first controller UX + optional scoreboard UX + stable realtime client.

> Follow global rules in `/AGENTS.md`. Requirements and quality bar live in `docs/pdr.md` and `docs/qa.md`.

---

## Tech scope (frontend)
- React 18 + TypeScript + Vite
- TailwindCSS, Framer Motion
- Socket.io-client
- PWA (optional install, but zero-setup must work in browser)

---

## Ownership boundaries
### You own
- Lobby/game/round/results UI flows as defined in `docs/pdr.md`
- Controller UX: swipe, haptics, low cognitive load
- Scoreboard UX: timer + scores + round status (NO words)
- Client reconnection UX: overlays, state resync, graceful fallbacks
- Accessibility basics: tap targets, readable typography, ARIA where relevant

### You do NOT own
- Authoritative state/timer logic (backend is source of truth)

---

## Frontend non-functional constraints
- Mobile-first performance: fast load, minimal blocking JS.
- Robustness: bad network ≠ broken UI; show reconnecting states.
- Anti-cheat UX: never render words on scoreboard path.

---

## Implementation checklist (per change)
- [ ] Identify affected user flow(s) in `docs/pdr.md`
- [ ] Ensure event payload usage matches contract/types
- [ ] Add/adjust component tests for changed UI
- [ ] Verify controller vs scoreboard separation (feature flags/device mode)
- [ ] Verify reconnect path restores correct screen and state

---

## Suggested module layout (guideline)
- `src/features/*` — feature slices (lobby/game/scoreboard/results)
- `src/shared/*` — ui primitives, utils, types, socket client wrapper
- `src/app/*` — routing/providers
- Tests per `docs/qa.md`

---
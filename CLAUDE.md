# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PartyFlow ("Поясни") is a real-time multiplayer party word game. Teams compete: one player explains words (swipe interface), teammates guess. Built as a monorepo with authoritative server architecture — all game logic (scoring, timers, state transitions) runs server-side.

Production domain: https://poyasni.ru

## Development Commands

### Backend (`cd backend`)
```bash
npm run dev          # Dev server with hot reload (nodemon + ts-node)
npm run build        # TypeScript compilation to dist/
npm run start        # Run compiled server (dist/server.js)
```

### Frontend (`cd frontend`)
```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

### Docker (full stack)
```bash
# From project root:
docker compose -f docker-compose.dev.yml up --build     # Dev: Redis + backend + frontend
docker compose -f docker-compose.prod.yml up -d --build  # Prod: Redis + backend (frontend built to static)
```

Dev endpoints: frontend http://localhost:5173, backend http://localhost:3001, Redis localhost:6379

### Testing

#### Backend unit tests (`cd backend`)
```bash
npm test              # Run all tests (Vitest)
npm run test:watch    # Watch mode
```
Tests cover GameService (state machine, scoring, round lifecycle) and PlayerService (team assignment, balancing). Located in `backend/src/services/__tests__/`.

#### Frontend screenshot tests (`cd frontend`)
```bash
npm run test:screenshots          # Run visual regression tests (Playwright)
npm run test:screenshots:update   # Update reference screenshots
```
Screenshot tests render key screens (ExplainerScreen, GuesserScreen, SpectatorScreen, GameResultScreen, LobbyScreen) in mobile (390x844) and desktop (1440x900) viewports via a dev-only test harness at `/__test-harness`. Reference images in `frontend/playwright/screenshots/`.

### Post-implementation testing protocol

After completing any code change, run the relevant tests before considering the task done:

1. **Backend changes** — run `cd backend && npm test`. If a test fails, fix the code or the test. If the test is outdated (expected behavior changed intentionally), update the test and explain what changed.
2. **Frontend changes** — run `cd frontend && npm run test:screenshots`. If a screenshot diff appears, determine whether the visual change is intentional:
   - **Intentional** — run `npm run test:screenshots:update` and explain what changed visually so the operator can verify.
   - **Unintentional** — fix the regression before completing the task.
3. **Both packages** — run `cd backend && npm run build` and `cd frontend && npm run build` to verify TypeScript compilation.

## Architecture

### Communication Model
- **REST**: minimal — health check, room bootstrap
- **WebSocket (Socket.IO)**: primary transport for all gameplay. Frontend proxies `/api` and `/socket.io` to backend via Vite dev server proxy
- **Redis**: persistent store for room/game state, reconnect sessions, word queues, player mappings

### Backend Structure (`backend/src/`)
- `server.ts` — monolithic orchestrator (~36KB): Express setup, all Socket.IO event handlers, room/game lifecycle coordination
- `services/` — domain logic split into: `RoomService` (room CRUD, player lifecycle), `GameService` (state machine, scoring, timers), `PlayerService` (team assignment, reconnect mapping), `WordService` (word queue, round stats)
- `models/index.ts` — all shared TypeScript types (GameState, RoomState, Player, WordItem, etc.)
- `config/` — env vars (`env.ts`) and Redis client (`redis.ts`)

### Frontend Structure (`frontend/src/`)
- `pages/` — route-level: HomePage, LobbyPage, GamePage, ResultsPage
- `features/` — feature-scoped code (landing, lobby, game, results)
- `components/` — reusable UI and game screen components
- `hooks/useGameSession.ts` — central state management hook; event-driven reconciliation from Socket.IO events (no Redux/Zustand)
- `services/` — Socket.IO client wrapper, REST bootstrap, session storage

### Key Architectural Patterns
- **Server-authoritative**: client sends commands (`join_room`, `start_game`, `word_swiped`), server broadcasts state events (`ROUND_STARTED`, `TIMER_TICK`, `SCORE_UPDATED`, `GAME_ENDED`)
- **Reconnection**: Redis socket-player mapping with 5-min grace period; deferred disconnect cleanup
- **Role-based UI**: explainer sees swipeable word cards, guessers see waiting/feedback screen, spectators observe
- **PWA**: service worker via vite-plugin-pwa with StaleWhileRevalidate caching

### Cross-cutting Concerns
- **Any socket event contract change requires updating both backend and frontend**
- **Any game state change requires updating models → service → UI reconciliation**
- **Mixed legacy/current event naming** still present in frontend emissions (transport compatibility layer)
- `shared/types/` exists but is empty — types are defined in `backend/src/models/index.ts` and re-implemented in frontend

## Game Constants
- Max 20 players per room, 60-second rounds, 12 max rounds, target score: 50 points
- Swipe debounce: 200ms
- Reconnect grace period: 5 minutes

## Environment Configuration
Backend reads from env vars: `NODE_ENV`, `PORT` (default 3001), `REDIS_URL` (default redis://localhost:6379), `CORS_ORIGIN` (default http://localhost:5173), `STARTER_PACK_PATH` (word pack JSON).

Frontend uses Vite env vars: `VITE_API_URL`, `VITE_WS_URL`, plus build-time `API_PROXY_TARGET` and `WS_PROXY_TARGET` for dev proxy.

See `.env.example` / `.env.dev.example` / `.env.prod.example` files in each package.

## Documentation
- `docs/pdr.md` — product requirements, game rules, MVP scope
- `docs/qa.md` — QA strategy and acceptance criteria
- `docs/partyflow_websocket_architecture.md` — WebSocket protocol spec (validate against current code, may be outdated)
- `docs/ux-design-documentation.md` — UX scenarios and edge cases
- `agents.md` — AI agent roles and development workflow overview
- Word packs: `docs/MVP_Starter_pack.json`, `docs/hot_pack.json`, `docs/it_pack.json`, `docs/memes_pack.json`

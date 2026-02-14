# PartyFlow Backend

## Environment matrix

| Environment | Services | Redis source | Command |
| --- | --- | --- | --- |
| Development | backend + redis | Internal compose service (`redis`) | `docker compose -f docker-compose.dev.yml up --build` |
| Production | backend only | External Redis (`REDIS_URL`) | `docker compose -f docker-compose.prod.yml up -d --build` |

## Docker-based development

1. Copy env template:
   ```bash
   cp .env.dev.example .env.dev
   ```
2. Start stack:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
3. Stop stack:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

Notes:
- Backend runs with hot-reload (`npm run dev`).
- Redis is reachable as `redis://redis:6379` inside compose network.
- Health endpoint: `http://localhost:3001/health`.

## Production runtime (external Redis)

1. Prepare env file:
   ```bash
   cp .env.prod.example .env.prod
   ```
2. Set real production values in `.env.prod` (especially `REDIS_URL`).
3. Start backend container:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. View logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend
   ```
5. Stop:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

## Host-based local run (without Docker)

1. Copy baseline env:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

In this mode `REDIS_URL` defaults to `redis://localhost:6379`.

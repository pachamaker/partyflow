# Поясни Frontend

## Run in Docker (frontend only)

### Development (Vite + hot reload)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Frontend: `http://localhost:5173`

Notes:
- `/api` and `/socket.io` are proxied to `http://host.docker.internal:3001`.
- If backend runs in Docker Compose from `backend/`, prefer launching the full stack there.

### Production static build (for host nginx)

```bash
docker compose -f docker-compose.prod.yml --profile build run --rm frontend-builder
```

Build output: `frontend/dist/`

## Run full stack from backend compose

From `/backend`:

```bash
docker compose -f docker-compose.dev.yml up --build
```

This starts `frontend + backend + redis` together.

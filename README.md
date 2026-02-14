# PartyFlow Monorepo

## Unified Docker Compose (root)

### Development (frontend + backend + redis)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Endpoints:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Redis: localhost:6379

Stop:

```bash
docker compose -f docker-compose.dev.yml down
```

### Production-like run (frontend + backend + redis)

1. Prepare backend env file:

```bash
cp backend/.env.prod.example backend/.env.prod
```

2. Start stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Endpoints:
- Frontend: http://localhost:8080
- Backend: http://localhost:3001

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

Notes:
- `REDIS_URL` in prod compose defaults to `redis://redis:6379`, but can be overridden from shell env.
- `CORS_ORIGIN` in prod compose defaults to `http://localhost:8080`, but can be overridden from shell env.

# Поясни Backend + Frontend Compose

## Environment matrix

| Environment | Services | Redis source | Command |
| --- | --- | --- | --- |
| Development | frontend + backend + redis | Internal compose service (`redis`) | `docker compose -f docker-compose.dev.yml up --build` |
| Production | backend + redis (system nginx on host) | Internal compose service (`redis`) | `docker compose -f docker-compose.prod.yml up -d --build` |

## Docker-based development (isolated frontend + backend)

1. Copy backend env template:
   ```bash
   cp .env.dev.example .env.dev
   ```
2. Start full stack from `backend/`:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
3. Access services:
   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:3001/health`
   - Redis: `localhost:6379`
4. Stop stack:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

Notes:
- Frontend runs Vite dev server in container with hot-reload.
- Frontend proxies `/api` and `/socket.io` to backend container.
- Backend runs with hot-reload (`npm run dev`).

## Production runtime (system nginx + backend + redis)

1. Start backend + redis:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
2. Build frontend static files:
   ```bash
   docker compose -f docker-compose.prod.yml --profile build run --rm frontend-builder
   ```
3. Publish static files to host nginx root (example):
   ```bash
   sudo mkdir -p /var/www/poyasni.ru/current
   sudo rsync -av --delete ./frontend/dist/ /var/www/poyasni.ru/current/
   ```
4. Install nginx site config:
   ```bash
   sudo cp ./deploy/nginx/poyasni.ru.conf /etc/nginx/sites-available/poyasni.ru
   sudo ln -sfn /etc/nginx/sites-available/poyasni.ru /etc/nginx/sites-enabled/poyasni.ru
   sudo nginx -t && sudo systemctl reload nginx
   ```
5. Logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend
   ```
6. Stop:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

## Host-based local run (without Docker)

### Backend

1. Copy baseline env:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

### Frontend

1. Go to `../frontend`.
2. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

In this mode `REDIS_URL` defaults to `redis://localhost:6379`.

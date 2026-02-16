# Поясни Monorepo

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

### Production runtime (system nginx + backend + redis)

1. Start backend + redis:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

2. Build frontend static bundle:

```bash
docker compose -f docker-compose.prod.yml --profile build run --rm frontend-builder
```

3. Deploy static files to nginx web root (example):

```bash
sudo mkdir -p /var/www/poyasni.ru/current
sudo rsync -av --delete ./frontend/dist/ /var/www/poyasni.ru/current/
```

4. Put nginx config:

```bash
sudo cp ./deploy/nginx/poyasni.ru.conf /etc/nginx/sites-available/poyasni.ru
sudo ln -sfn /etc/nginx/sites-available/poyasni.ru /etc/nginx/sites-enabled/poyasni.ru
sudo nginx -t && sudo systemctl reload nginx
```

Endpoints:
- Frontend: `https://poyasni.ru`
- Backend (origin): `http://127.0.0.1:3001`

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

Notes:
- `REDIS_URL` in prod compose defaults to `redis://redis:6379`, but can be overridden from shell env.
- `CORS_ORIGIN` in prod compose defaults to `https://poyasni.ru`, but can be overridden from shell env.

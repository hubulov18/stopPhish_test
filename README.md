### 1. Запуск проекта
Есть несколько сценариев запуска:
- одной командой через docker-compose;
- манифесты для Kubernetes/k3s.

## 1.1 Запуск через Docker Compose
Одной командой поднимаются backend, frontend и база:

```bash
npm run compose:up
```

Остановка:

```bash
npm run compose:down
```

- frontend: `http://127.0.0.1:5173`
- backend API: `http://127.0.0.1:3000/api`

## 1.2 Kubernetes / k3s
Манифесты лежат в папке `k3s/`:
- `namespace.yaml`
- `configmap.yaml`
- `secret.yaml`
- `postgres.yaml`
- `backend.yaml`
- `frontend.yaml`

1) Старт кластера:

```bash
minikube start --driver=docker
kubectl config use-context minikube
```

2) Сборка и загрузка образов в minikube:

```bash
docker build -t notes-backend:latest ./backend
docker build -t notes-frontend:latest ./frontend
minikube image load notes-backend:latest
minikube image load notes-frontend:latest
minikube image pull postgres:16-alpine
minikube image pull busybox:1.36
```

3) Применение манифестов:

```bash
kubectl apply -f k3s/namespace.yaml
kubectl apply -f k3s/configmap.yaml
kubectl apply -f k3s/secret.yaml
kubectl apply -f k3s/postgres.yaml
kubectl apply -f k3s/backend.yaml
kubectl apply -f k3s/frontend.yaml
```

4) Проверка, что всё поднялось:

```bash
kubectl -n notes-app rollout status deployment/notes-postgres
kubectl -n notes-app rollout status deployment/notes-backend
kubectl -n notes-app rollout status deployment/notes-frontend
kubectl -n notes-app get pods
```

5) Локальный доступ к frontend через port-forward:

```bash
kubectl -n notes-app port-forward svc/notes-frontend 8080:80
```

Открыть: `http://127.0.0.1:8080`

## 2. Тесты
Backend unit:

```bash
npm run test:unit -w backend
```

Backend integration:

```bash
npm run test:integration -w backend
```

Полный прогон:

```bash
npm run test -w backend
```

## 3. Переменные окружения
### Backend (`backend/.env`)
- `NODE_ENV`
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_LOGGING`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SEED_ON_START`
- `LOG_LEVEL`

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL` (по умолчанию `/api`)

Seed создаёт demo-пользователя:
- `test@mail.ru`
- `test12345`


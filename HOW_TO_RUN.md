# 🚀 How to Run — NEXUS UEBA Platform

This project is a **User & Entity Behavior Analytics (UEBA)** system:
a Python (FastAPI) backend that scores user activity for anomalies using an
Isolation Forest ML model + a rule engine, a React dashboard, a traffic
simulator, backed by PostgreSQL and Redis.

There are two ways to run it. **Docker is the recommended (easy) way.**

---

## Option A — Docker (recommended)

### Prerequisites
- **Docker** with the **Compose** plugin.
  - macOS/Windows: install **Docker Desktop**, or on macOS use **colima** (`brew install colima docker docker-compose`, then `colima start`).
  - Verify it works: `docker info` should print server details.

### Run everything with one command
```bash
cd PROJECT_WITH_CHANGES
docker-compose up -d --build
```
This builds and starts **5 containers**: PostgreSQL, Redis, the backend API, the
event simulator, and the frontend. The first build takes a few minutes.

### Open the app
| What | URL | Notes |
|---|---|---|
| **Dashboard (main UI)** | http://localhost:5173 | Log in here |
| **API docs (Swagger)** | http://localhost:8000/docs | Try every endpoint interactively |
| **Health check** | http://localhost:8000/health | Should return `{"status":"ok"}` |

### Login accounts
| Role | Username | Password | Can see |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Everything + **Admin Settings** page |
| **Analyst** | `analyst` | `analyst123` | Everything except Admin Settings |

> The simulator starts generating user activity automatically, so alerts begin
> appearing within a minute of startup.

### Useful commands
```bash
docker-compose ps                 # see container status
docker-compose logs -f backend    # follow backend logs
docker-compose logs -f simulator  # watch events being generated
docker-compose down               # stop everything
docker-compose down -v            # stop AND wipe the database (fresh start)
docker-compose up -d --build      # rebuild after code changes
```

### Tuning the simulator (optional)
Environment variables in `docker-compose.yml` under the `simulator` service:
- `SIMULATOR_INTERVAL_MS` — delay between events (default `3500`). Lower = faster.
- `SIMULATOR_USER_COUNT` — number of simulated users (default `150`).

---

## Option B — Run locally without Docker (manual)

Only do this if you can't use Docker. You must install and run PostgreSQL and
Redis yourself.

### 1. Start PostgreSQL and Redis
- PostgreSQL 16 with a database named `ueba_db`, user `ueba_admin`, password `ueba_secret_2024`.
- Redis 7 on the default port `6379`.

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# point the app at your local services
export DATABASE_URL="postgresql+asyncpg://ueba_admin:ueba_secret_2024@localhost:5432/ueba_db"
export REDIS_URL="redis://localhost:6379/0"
export SECRET_KEY="dev-secret-change-me"

uvicorn app.main:app --reload --port 8000
```
On first start the backend creates all tables and seeds 150 users + the admin/analyst accounts.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev          # serves on http://localhost:5173, proxies /api to :8000
```

### 4. Simulator (generates activity)
```bash
cd simulator
pip install -r requirements.txt
export SIMULATOR_API_URL="http://localhost:8000"
python main.py
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker info` fails / "cannot connect to the Docker daemon" | Start Docker Desktop, or run `colima start`. |
| Port already in use (5173/8000/5432/6379) | Stop the other process, or change the port mapping in `docker-compose.yml`. |
| Container names conflict (`ueba-backend` already in use) | You have another copy running: `docker-compose down` in that folder first. |
| No alerts appear | Give the simulator ~1 minute; check `docker-compose logs -f simulator`. |
| Want a totally clean slate | `docker-compose down -v` then `docker-compose up -d --build`. |
| Login fails | Use exactly `admin`/`admin123` or `analyst`/`analyst123`. |

---

## What "working" looks like
1. Dashboard shows live stats, a risk leaderboard, and a live activity feed.
2. The **Alerts** page fills with scored anomalies; filter by severity / status / department.
3. Click an alert → see the score breakdown, **MITRE ATT&CK** tags, an **AI narrative**,
   and record an analyst verdict.
4. As **admin**, open **Admin Settings** → change detection thresholds or retrain the model.

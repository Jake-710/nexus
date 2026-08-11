# UEBA — User and Entity Behaviour Analytics Platform

A cloud-hosted, real-time insider threat detection platform using unsupervised machine learning and generative AI explainability.

**Final Year Project** — B.E. Computer Science and Engineering (Cyber Security)
Sri Krishna College of Engineering and Technology, Coimbatore

## Team
- Sanjay Ruban (727723EUCY050)
- Dharshan Balu T (727723EUCY018)
- Denzil Abraham R (727723EUCY015)
- Amarnath Sekar (727723EUCY007)

**Supervisor:** Ms. Anitha G

---

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env

# 2. Start everything
docker-compose up --build

# 3. Access
# Dashboard:  http://localhost:5173
# Backend API: http://localhost:8000
# API Docs:    http://localhost:8000/docs
```

## Architecture

```
Log Simulator → FastAPI Ingestion → Redis Streams → Scoring Worker → PostgreSQL
                                                          ↓
                                              React Dashboard ← WebSocket
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Recharts |
| Backend | Python, FastAPI |
| Queue | Redis Streams |
| ML | Scikit-learn (Isolation Forest, KMeans) |
| Database | PostgreSQL |
| Auth | JWT |
| Deployment | Docker Compose |

## Project Structure

```
├── backend/          # FastAPI backend + ML pipeline
├── frontend/         # React dashboard
├── simulator/        # Synthetic log generator
├── docker-compose.yml
└── .env.example
```

## Default Credentials

| Role | Username | Password |
|---|---|---|
| Analyst | analyst | analyst123 |
| Admin | admin | admin123 |

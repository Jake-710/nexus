# UEBA Project Workflow and Current Implementation

## Project Overview

This project is a UEBA (User and Entity Behavior Analytics) platform designed to detect insider threats in real time using behavioral signals, rule-based detection, and an unsupervised machine learning model. It simulates employee activity, ingests events into a backend service, scores them for risk, and visualizes suspicious behavior on a React dashboard.

The system was built as a final-year project and is currently implemented as a containerized full-stack application with:

- A Python FastAPI backend
- A React + Vite frontend dashboard
- A simulator that generates synthetic user activity
- Redis Streams for event queuing
- PostgreSQL for persistent storage
- Docker Compose for orchestration

---

## What the Project Does

The platform performs the following high-level functions:

1. Simulates realistic employee behavior through synthetic event generation.
2. Sends events to the backend through an ingestion endpoint.
3. Stores events and user profiles in PostgreSQL.
4. Pushes each incoming event into Redis Streams.
5. Processes events asynchronously in a scoring worker.
6. Computes risk scores from:
   - Machine learning anomaly detection
   - Rule-based threat heuristics
   - A blended final score
7. Creates alerts when the blended score crosses a configured threshold.
8. Exposes those alerts through API endpoints and live WebSocket updates.
9. Displays dashboards, alerts, user directories, and risk history in a React UI.

---

## System Architecture

The architecture follows this flow:

Simulator -> FastAPI Ingestion -> Redis Streams -> Scoring Worker -> PostgreSQL / Alerts
                                              |
                                              v
                                       React Dashboard + WebSocket

### Main Components

- Simulator
  - Generates synthetic events for users with different behavioral archetypes.
  - Sends events to the backend API at a configurable interval.

- Backend
  - Accepts event ingestion requests.
  - Stores events in the database.
  - Publishes events to Redis.
  - Runs a background scoring worker.
  - Serves APIs for alerts, users, and authentication.

- Frontend
  - Shows a SOC-style dashboard with stats, alerts, and user activity.
  - Uses live WebSocket updates to display new alerts in real time.

- Database
  - Stores users, events, baselines, alerts, and supporting metadata.

---

## End-to-End Workflow

### 1. Application Startup

When the system starts with Docker Compose:

- PostgreSQL starts and initializes the database.
- Redis starts and becomes available for streaming.
- The FastAPI backend starts.
- The simulator starts and waits for the backend health endpoint.
- The frontend starts and serves the dashboard UI.

### 2. User Seeding

On backend startup:

- The database schema is created.
- Default users are seeded:
  - admin
  - analyst
- A larger population of synthetic users is also created, grouped by department.
- Each user receives a baseline profile used for anomaly detection.

### 3. Event Simulation

The simulator generates events using predefined behavioral archetypes such as:

- Normal employee behavior
- Night owl activity patterns
- Disgruntled employee behavior
- Compromised account behavior
- Negligent user behavior

Each event includes fields such as:

- action type
- volume of data transferred
- source IP
- resource accessed
- geographic location
- user ID
- session ID
- timestamp

### 4. Event Ingestion

The backend ingestion endpoint receives each event and performs the following steps:

- Validates the event payload
- Saves the event to PostgreSQL
- Serializes the event into a JSON payload
- Pushes it into the Redis stream named events:raw

### 5. Scoring Pipeline

A background worker reads messages from the Redis stream and processes them one by one.

For each event, the worker:

- Retrieves the user’s baseline profile
- Pulls recent events for the same user from the last 24 hours
- Computes behavioral features such as:
  - login hour
  - failed login attempts
  - files accessed
  - data volume
  - distinct IP count
  - off-hours access flag
  - first-time resource access
  - cross-department access flag
  - rapid action count
- Runs rule evaluation
- Runs ML anomaly scoring using an Isolation Forest model
- Blends the ML and rule scores into a final risk score

If the final score exceeds the alert threshold, an alert is created.

### 6. Alert Generation

When a score crosses the threshold:

- A new alert record is written to PostgreSQL
- The alert is sent through the WebSocket connection to the frontend
- The alert appears in the live activity feed and can be reviewed on the alerts page

---

## Backend Structure and Responsibilities

### Main Entry Point

The main backend service is defined in [backend/app/main.py](backend/app/main.py).

It provides:

- FastAPI app initialization
- CORS middleware
- WebSocket endpoint for live alerts
- Startup logic for DB initialization and seeding
- Login endpoint
- Health check endpoint
- Background worker startup

### API Routers

- [backend/app/api/events.py](backend/app/api/events.py)
  - Ingests events and pushes them to Redis.

- [backend/app/api/alerts.py](backend/app/api/alerts.py)
  - Lists alerts, fetches alert details, and returns dashboard stats.

- [backend/app/api/users.py](backend/app/api/users.py)
  - Lists users, provides leaderboard-style ranking, and returns user risk history.

### Core Services

- [backend/app/services/feature_engineering.py](backend/app/services/feature_engineering.py)
  - Converts raw events into behavioral features for anomaly detection.

- [backend/app/services/rules.py](backend/app/services/rules.py)
  - Applies threat rules such as off-hours access, suspicious IPs, large transfers, and unusual resource access.

- [backend/app/services/isolation_forest.py](backend/app/services/isolation_forest.py)
  - Trains and uses Isolation Forest models per peer group to assign anomaly scores.

- [backend/app/services/scoring.py](backend/app/services/scoring.py)
  - Blends ML and rule-based scores using configurable weights.

- [backend/app/workers/scoring_worker.py](backend/app/workers/scoring_worker.py)
  - Consumes Redis stream events and performs scoring.

### Data Layer

- [backend/app/models.py](backend/app/models.py)
  - Defines the SQLAlchemy models for users, events, baselines, alerts, and feedback.

- [backend/app/database.py](backend/app/database.py)
  - Creates the async SQLAlchemy engine and initializes tables.

- [backend/app/schemas.py](backend/app/schemas.py)
  - Defines API request and response models.

---

## Frontend Structure and Responsibilities

The frontend is a React application built with Vite.

### Main Routing

The app uses a protected-route structure:

- /login
- /dashboard
- /alerts
- /alerts/:id
- /users
- /users/:id

### Key Frontend Pages

- Dashboard page
  - Shows summary cards, average risk, trending risk, leaderboard, and live activity.

- Alerts page
  - Lists detected alerts with severity filtering and department filtering.

- Alert detail page
  - Displays the triggered rules, score breakdown, and contextual event information.

- Users page
  - Lists users and their alert history/risk profile.

- User history page
  - Shows a risk timeline for an individual user.

### Frontend Hooks and Components

- [frontend/src/hooks/useApi.js](frontend/src/hooks/useApi.js)
  - Centralized API helper for authenticated requests.

- [frontend/src/hooks/useWebSocket.js](frontend/src/hooks/useWebSocket.js)
  - Connects the dashboard to the backend WebSocket stream.

- [frontend/src/components/LiveActivityFeed.jsx](frontend/src/components/LiveActivityFeed.jsx)
  - Displays incoming alerts in a live feed.

---

## Simulator Workflow

The simulator creates a population of synthetic users and sends events to the backend.

### Flow

1. The simulator waits for the backend health endpoint.
2. It creates user profiles based on departments and assigned behavioral archetypes.
3. It loops indefinitely and randomly selects a simulated user.
4. It generates a behavioral event for that user.
5. It posts the event to the backend ingestion endpoint.
6. The event is processed asynchronously and may produce alerts.

This gives the platform a live stream of suspicious and non-suspicious behavior for demonstration purposes.

---

## Current State of the Project

The project is already functional as a working prototype. The current implementation includes:

- Full containerized deployment setup
- Backend ingestion and scoring pipeline
- Redis-based event queueing
- Alert creation and persistence
- Dashboard UI and navigation
- User risk history pages
- Live WebSocket updates
- Synthetic simulator for generating activity

### What is already working

- Docker-based startup flow
- Authentication endpoints and seeded users
- Event ingestion into the backend
- Alert generation from rule and ML scoring
- API endpoints for alerts and user history
- Live feeding of new alerts into the frontend

### Areas that are still evolving or incomplete

- The AI-generated narrative for alerts is currently a placeholder.
- Authentication is basic and not yet fully production-grade.
- The ML model is still being trained dynamically from activity data rather than using a fully pre-trained model.
- Some parts of the UI and backend are simplified for demonstration purposes.

---

## How Everything Works Together

In practical terms, the project behaves like this:

1. The simulator continuously produces activity from many synthetic users.
2. The backend ingests those events into PostgreSQL and sends them to Redis.
3. The scoring worker evaluates each event for suspicious traits.
4. Risk scoring combines anomaly detection and rule-based logic.
5. If the behavior is suspicious enough, an alert is generated.
6. The frontend receives the alert and displays it immediately on the dashboard.
7. Analysts can review the alert details and inspect user behavior history.

This creates a realistic demonstration of a security operations workflow for insider threat monitoring.

---

## Summary

This UEBA project is a working proof-of-concept that demonstrates how a modern security monitoring system could operate. It combines:

- event simulation,
- real-time ingestion,
- behavioral feature engineering,
- anomaly detection,
- rule-based detection,
- alert management,
- and a live dashboard experience.

The project already shows the full lifecycle of threat detection from event generation to alert review.

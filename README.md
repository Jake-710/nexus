# 🛡️ NEXUS: Reinforcement Learning-Augmented User and Entity Behavior Analytics (UEBA)

> **Real-Time Detection of Insider Attacks and Zero-Day Vulnerabilities**

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-EE4C2C.svg)](https://pytorch.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.25%2B-FF4B4B.svg)](https://streamlit.io/)

**NEXUS** is a cloud-native User and Entity Behavior Analytics (UEBA) platform designed for real-time detection of stealthy insider threats and novel zero-day attacks. Instead of relying on static SIEM correlation rules or outdated supervised models, NEXUS embeds a **Proximal Policy Optimization (PPO)** Reinforcement Learning agent directly into its per-event anomaly scoring pipeline.

NEXUS combines **continuous single-entity MDP behavior scoring**, a **Cross-Entity Correlation Graph** (to detect coordinated multi-account campaigns), and an automated **MITRE ATT&CK Remediation Engine** into a unified, microservice-based solution.

---

## 🏛️ System Architecture & Workflow

```text
                   ┌───────────────────────────────────┐
                   │  Attack Simulator / Ingest Stream │
                   └─────────────────┬─────────────────┘
                                     │ (POST /events)
                                     ▼
                   ┌───────────────────────────────────┐
                   │       FastAPI Microservice        │
                   └─────────────────┬─────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    1. Behavioral State Buffer               2. 6D Feature Extraction
    (Rolling Window W = 50 events)           (f, Δt, H, v, n, d)
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                       3. PPO Policy Neural Network
                               (PyTorch Engine)
                                     │
                                     ▼
                   4. Cross-Entity Correlation Graph
                    (NetworkX Subgraph Risk Shift)
                                     │
                                     ▼
                   5. MITRE ATT&CK & Remediation Engine
                                     │
                                     ▼
                   ┌───────────────────────────────────┐
                   │   SOC Security Operations Center  │
                   │             Dashboard             │
                   └───────────────────────────────────┘
```
1. **Telemetry Ingestion (`app/schemas.py`, `app/main.py`):** Ingests raw telemetry events carrying `user_id`, `event_type`, and structured payload metadata via RESTful API[cite: 92, 351].
2. **Behavioral State Management (`app/state.py`):** Maintains an in-memory sliding history window ($W = 50$ events) per entity using FIFO eviction to establish dynamic short-term baselines[cite: 96, 98, 355].
3. **6D Feature Space Extraction (`app/features.py`):** Computes a 6-dimensional state vector $\phi(s) \in \mathbb{R}^6$ per event[cite: 108, 111, 365]:
   * **Event Frequency ($f$):** Burst/DoS detection [cite: 111, 365]
   * **Inter-arrival Delta ($\Delta t$):** Automated script and bot activity [cite: 111, 365]
   * **Type Shannon Entropy ($H$):** Monotonic repetition vs. diverse behavior [cite: 111, 365]
   * **Payload Size Velocity ($v$):** Staging large data for exfiltration [cite: 111, 365]
   * **Novelty Score ($n$):** Inverse frequency / TF-IDF action rarity [cite: 111, 365]
   * **Session Depth ($d$):** Lateral movement and privilege escalation depth [cite: 111, 365]
4. **PPO Anomaly Scoring Engine (`app/rl_engine.py`):** Evaluates $\phi(s)$ using a PyTorch PPO Actor-Critic neural network[cite: 113, 116, 372]. Outputs a weighted score in $[0.0, 1.0]$ categorized as `NORMAL`, `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`[cite: 73, 129, 131, 328, 389, 393].
5. **Cross-Entity Correlation Graph (`app/graph.py`):** Tracks shared resource access across entities using NetworkX to overcome single-entity "coordination blindness" and catch staged multi-account attacks[cite: 248, 249, 322, 397, 400].
6. **MITRE ATT&CK & Remediation Engine (`app/remediation.py`):** Maps scored anomalies to MITRE ATT&CK Enterprise Matrix techniques (e.g., `T1110`, `T1498`, `T1041`) and outputs structured 3-tiered mitigation playbooks[cite: 180, 183, 185, 537, 540, 542].

---

## 📁 Repository Structure

```text
D:\Nexus\
├── app/
│   ├── __init__.py
│   ├── schemas.py       # Pydantic telemetry, response, and feedback schemas
│   ├── state.py         # Per-entity rolling history state manager (W = 50)
│   ├── features.py      # 6D Behavioral feature extraction engine
│   ├── rl_engine.py     # PPO PyTorch neural network policy & anomaly scorer
│   ├── graph.py         # Incremental cross-entity correlation graph
│   ├── remediation.py   # MITRE ATT&CK mapping & automated playbooks
│   └── main.py          # FastAPI microservice REST backend & master event logger
├── simulator_app.py     # Streamlit Web App 1: Attack & Telemetry Simulator
├── soc_dashboard.py     # Streamlit Web App 2: SOC Operations & Monitoring UI
├── requirements.txt     # Python dependencies
└── README.md            # Platform documentation

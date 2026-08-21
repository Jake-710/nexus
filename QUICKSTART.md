Here is the clean, properly formatted, ready-to-paste markdown content for a separate file (e.g., **`QUICKSTART.md`**):

---

### 📄 `QUICKSTART.md`

```markdown
# ⚡ Quickstart Setup Guide

## 1. Prerequisites
* **Python 3.10+** installed on your system.
* PowerShell or terminal access.

---

## 2. Environment Setup (VS Code)

Open VS Code in `D:\Nexus` and run the following in your PowerShell terminal:

```powershell
# 1. Allow script execution for the current session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 2. Create and activate virtual environment
py -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install required packages
pip install -r requirements.txt

```

---

## 🚀 Running the Platform

Launch the 3 system components in **3 separate terminal tabs** inside VS Code:

### 🔹 Terminal 1: FastAPI Microservice Backend

```powershell
uvicorn app.main:app --reload --port 8000

```

* **Interactive API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Health Endpoint:** `GET /health`

### 🔹 Terminal 2: Attack & Telemetry Simulator

```powershell
streamlit run simulator_app.py --server.port 8501

```

* **Access URL:** [http://localhost:8501](https://www.google.com/search?q=http://localhost:8501)

### 🔹 Terminal 3: SOC Operations Dashboard

```powershell
streamlit run soc_dashboard.py --server.port 8502

```

* **Access URL:** [http://localhost:8502](https://www.google.com/search?q=http://localhost:8502)

---

## 🧪 Testing & Evaluation Workflow

1. Open **[http://localhost:8501](https://www.google.com/search?q=http://localhost:8501)** (Simulator Web App).
2. Trigger any built-in simulation scenario:
* **`🔥 Run Auth Failure Burst`**: Simulates a brute-force credential stuffing attack.
* **`🌊 Run Event Flood`**: Simulates automated API scrapers or DoS traffic.
* **`📦 Run Payload Size Spike`**: Simulates large file staging and exfiltration.


3. Open **[http://localhost:8502](https://www.google.com/search?q=http://localhost:8502)** (SOC Operations Dashboard).
4. Click **`🔄 Fetch Latest Logs from Backend`** to view incoming telemetry in real-time.
5. Select any flagged event to view its **Anomaly Score Gauge**, **Severity**, **MITRE ATT&CK Mapping**, and **Actionable Playbook**.
6. Under the **Analyst Decision Center**, submit human dispositions (`Confirm`, `Downgrade`, `Dismiss`) to send feedback directly to the RL policy engine.

---

## 📈 Key Research Performance Highlights

| Metric | Target | NEXUS Measured Result |
| --- | --- | --- |
| **Threat Detection Rate (TDR)** | $\ge 90\%$ | **94.2%** |
| **Zero-Day Generalization TDR** | N/A | **91.7%** (vs. 54.2% XGBoost baseline) |
| **False Positive Rate (FPR)** | $\le 5\%$ | **4.1%** |
| **P99 Scoring Latency** | $\le 200$ ms | **143 ms** |
| **Adversarial Hardening DIR** | $\le 10\%$ | **6.2%** (reduced from 31.4%) |

```

```

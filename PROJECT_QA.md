# 🎓 Project Q&A — Likely Questions & Answers

Prep sheet for presenting / defending this UEBA project (viva, demo, or report).
Answers are grounded in the actual code in this repository.

---

## 1. The big picture

**Q: What does this project do, in one sentence?**
It detects insider threats and unusual user behaviour in real time by scoring every
user activity event with a combination of a machine-learning anomaly model and
deterministic security rules, then surfaces the risky ones to a security analyst dashboard.

**Q: What does UEBA stand for and why is it useful?**
**User and Entity Behavior Analytics.** Traditional security tools use fixed rules
("alert if >5 failed logins"). UEBA instead learns each user's *normal* behaviour and
flags *deviations* from it. This catches stealthy insider threats and novel ("zero-day")
attacks that fixed rules miss — e.g. a valid user suddenly downloading data at 3 AM.

**Q: Who are the users of the system?**
Security Operations Center (SOC) **analysts** and **admins**. Analysts review and triage
alerts; admins additionally tune detection thresholds and retrain the model.

---

## 2. Architecture & data flow

**Q: Walk me through what happens when an event occurs.**
1. The **simulator** (or any real log source) sends an event to `POST /api/v1/events/ingest`
   with `user_id`, `action_type`, `src_ip`, `volume_mb`, etc.
2. The backend saves the event to **PostgreSQL** and pushes it onto a **Redis stream** (`events:raw`).
3. A background **scoring worker** consumes the stream, and for each event:
   - loads the user's **baseline** and recent activity,
   - computes a **feature vector** (feature engineering),
   - gets an **ML anomaly score** from the Isolation Forest for that user's peer group,
   - gets a **rule score** from the rule engine,
   - **blends** them into a final risk score (0–1).
4. If the score ≥ the alert threshold, it creates an **Alert** and **broadcasts** it over a
   **WebSocket** so the dashboard updates live.

**Q: Why use a Redis stream instead of scoring the event directly in the request?**
To **decouple ingestion from scoring**. The API responds instantly ("queued") and the heavy
ML scoring happens asynchronously in a worker. This keeps ingestion fast and lets scoring be
scaled or retried independently — a standard real-time pipeline pattern.

**Q: What is the tech stack and why?**
- **FastAPI** (Python) — async, automatic OpenAPI/Swagger docs, great for ML services.
- **PostgreSQL** (async SQLAlchemy) — durable relational store for users, events, alerts.
- **Redis Streams** — lightweight message queue between ingestion and scoring.
- **scikit-learn** — Isolation Forest anomaly detection.
- **React + Vite** — fast, modern dashboard SPA.
- **Docker Compose** — one-command reproducible deployment of all 5 services.

---

## 3. The machine learning

**Q: Which ML algorithm do you use and why?**
**Isolation Forest** — an *unsupervised* anomaly-detection algorithm. It isolates
observations by randomly splitting features; anomalies get isolated in fewer splits, so they
score as more anomalous. We chose it because:
- **Unsupervised** — we don't have labelled "attack" data (realistic for security).
- Fast, scales well, handles high-dimensional data.
- Good at finding rare outliers, which is exactly what insider threats are.

**Q: Why not a supervised model (e.g. XGBoost, a neural net classifier)?**
Supervised models need large, labelled datasets of known attacks. Real attacks are rare and
constantly evolving, so labelled data is scarce and quickly outdated. An unsupervised model
learns "normal" and flags deviations, so it can catch **previously unseen** attack patterns.

**Q: What are "peer groups" and why do you train a separate model per group?**
Users are grouped (in this implementation, by **department** — Engineering, Finance, HR,
IT-Admin, Sales). Behaviour that's normal for one group is abnormal for another (e.g. HR
accessing payroll vs. an engineer doing so). Training a separate Isolation Forest **per peer
group** means each user is compared against their true peers, reducing false positives.

**Q: What features does the model use?** (feature engineering — `services/feature_engineering.py`)
Per event we derive a numeric vector including:
- `login_hour` — hour of the activity
- `failed_login_attempts`
- `files_accessed`
- `data_volume_mb` — how much data moved (exfiltration signal)
- `distinct_ips` — number of source IPs (account-sharing / hijack signal)
- `off_hours_flag` — activity outside normal working hours
- `first_time_resource` — accessing a resource never used before
- plus peer-group deviation, weekend, cross-department, and rapid-action signals.

**Q: How is the raw model score turned into a 0–1 risk value?**
Isolation Forest's `decision_function` returns a signed score; we normalise it with a
**sigmoid** (`1 / (1 + e^(score·5))`) so higher = more anomalous, bounded to [0, 1].

**Q: What happens before the model has enough data to train?**
There's a **heuristic fallback** (`_heuristic_score`) — a hand-crafted scoring function using
the same features (off-hours, failed logins, data volume, etc.). The model **auto-trains** once
it has collected enough samples (50) for a peer group, then takes over.

---

## 4. Rules + blended scoring

**Q: If you have ML, why also have rules?**
Defence in depth. The **rule engine** (`services/rules.py`) encodes known-bad patterns
(off-hours access, large transfers, failed-login spikes, geo anomalies, etc.) that should
*always* raise suspicion, independent of the model. Rules give explainability; ML gives
generalisation. Combining both is more robust than either alone.

**Q: How is the final risk score computed?**
A weighted blend: `risk = ml_weight × ml_score + rule_weight × rule_score`
(defaults 0.7 / 0.3). If `risk ≥ ALERT_THRESHOLD`, an alert is raised. All three of these
values are **admin-configurable at runtime** on the Admin Settings page.

**Q: How are severity tiers decided?**
By score bands: Low / Medium / High / Critical, with the boundaries also configurable by admin
(defaults 0.40 / 0.60 / 0.80).

---

## 5. Features I built (the Weeks 10–13 additions)

**Q: What did you add on top of the base system?**
Nine feature areas, without changing existing behaviour:
1. **RBAC** — real JWT decode; role-gated admin routes (analyst gets 403 on admin actions).
2. **MITRE ATT&CK mapping** — each triggered rule maps to a MITRE technique (e.g. failed-login
   spike → T1110 Brute Force), shown as chips on the alert detail page.
3. **AI security narrative** — a plain-English summary of each alert generated from its scores
   and rules (template-based, so no external API key is needed; swappable for an LLM later).
4. **Alert lifecycle** — status (New / Investigating / Resolved / False Positive).
5. **Analyst feedback** — "Confirm Threat" / "False Positive" verdicts, stored for the model.
6. **Admin settings** — live threshold/weight config, persisted to the DB.
7. **Model retraining** — admin can retrain the Isolation Forest from recent events; runs logged.
8. **Notifications** — a bell with an unread badge polling recent high-risk alerts.
9. **Export** — download filtered alerts / a user's history as **CSV or PDF**.

**Q: How does the "AI narrative" work — is it really AI?**
It's a **template-based natural-language generator**: it takes the risk score, severity tier,
triggered rules and event context and composes a contextual 3–5 sentence explanation. It's
deterministic and free (no API key). The design deliberately isolates this in one function
(`narrative_generator.py`) so it can be swapped for a real LLM (Gemini/OpenAI) call with no
other code changes.

**Q: What is MITRE ATT&CK?**
A globally-used knowledge base of adversary tactics and techniques. Mapping alerts to ATT&CK
technique IDs (T1110, T1041, …) gives analysts a shared, standard vocabulary and links each
detection to known attacker behaviour.

**Q: How does authentication work?**
On login the backend issues a **JWT** signed with a secret, containing the user's id, username,
role and department. The frontend decodes it to drive the UI (e.g. show the admin link only to
admins). Every API call sends the token as a `Bearer` header; protected endpoints decode and
verify it, and admin endpoints additionally check `role == "admin"`.

---

## 6. Database & design

**Q: What are the main database tables?**
`users`, `events`, `user_baselines` (per-user normal profile + peer group), `alerts`,
`alert_feedback` (analyst verdicts), `audit_logs`, plus my additions `model_training_logs`
(retrain history) and `system_config` (runtime thresholds).

**Q: How does config survive a restart?**
Admin threshold changes are written to the `system_config` table and re-loaded into the app
settings on startup, so they persist and apply immediately to new scoring.

---

## 7. Limitations & future work (good to volunteer)

**Q: What are the limitations?**
- Data is **simulated**, not from real enterprise logs.
- Isolation Forest is single-entity; truly coordinated multi-account attacks need a
  cross-entity correlation graph (a documented future extension).
- The "AI narrative" is template-based, not a real LLM (by design, to avoid API costs).
- No automated response/remediation actions yet — alerts are advisory.

**Q: How would you extend it?**
Real log ingestion (SIEM connectors), a cross-entity correlation graph, an LLM-backed
narrative, automated remediation playbooks, and a feedback loop where analyst verdicts
directly relabel/retrain the model.

---

## 8. Quick demo script (for the viva)
1. Open the dashboard, log in as **admin** — point out live stats, leaderboard, activity feed.
2. Go to **Alerts**, filter to **Critical** — open one alert.
3. Show the **score breakdown**, **MITRE tags**, and **AI narrative**.
4. Set the alert to **Investigating**, then submit a **Confirm Threat** verdict.
5. Open **Admin Settings** — lower the alert threshold, save, show more alerts start appearing;
   click **Retrain Model** and show the training log entry.
6. Export the alert list to **CSV/PDF**.
7. Log out, log in as **analyst** — show the Admin Settings link is gone and the page is blocked.

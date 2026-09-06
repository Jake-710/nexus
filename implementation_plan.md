# Weeks 10–13: Feature Implementation Plan

9 new features layered on top of the existing working UEBA app. **Zero modifications** to existing page behaviour, routing, data fetching, or theming.

---

## User Review Required

> [!IMPORTANT]
> The JWT currently stores `role` but the frontend **never decodes it** — `AuthContext` only stores the raw token string. This plan adds a lightweight JWT decode on login (no library needed — `atob` on the payload) to extract `{ role, full_name, username, sub }` and expose them via `useAuth()`. This is a non-breaking change to `App.jsx`.

> [!IMPORTANT]
> The GenAI narrative feature uses a **local template-based** generator (no external LLM API key required). It references the triggered rules and score breakdown to produce a contextual English explanation. For a production deployment you'd swap the template function for a Gemini/OpenAI call — the caching and UI are identical either way.

> [!WARNING]
> This adds a DB migration: new `ModelTrainingLog` table, a new `SystemConfig` table for threshold settings, and an `analyst_notes` column on `AlertFeedback`. Since we use `Base.metadata.create_all` on startup, new tables are created automatically. Existing tables and data are untouched.

---

## Proposed Changes

### Component 1: Database Models & Schemas

#### [MODIFY] [models.py](file:///D:/final%20year%20project/PROJECT/backend/app/models.py)
- Add `ModelTrainingLog` table: `id`, `trained_at`, `peer_group_id`, `samples_used`, `avg_score_before`, `avg_score_after`, `triggered_by` (manual/scheduled)
- Add `SystemConfig` table: `key` (unique string PK), `value` (JSON), `updated_at`, `updated_by`

#### [MODIFY] [schemas.py](file:///D:/final%20year%20project/PROJECT/backend/app/schemas.py)
- Add Pydantic models: `AlertStatusUpdate`, `AlertFeedbackCreate`, `RetrainRequest`, `RetrainResponse`, `ThresholdConfig`, `SystemConfigResponse`, `NotificationItem`
- Add `status` to `AlertListResponse` items (already present in `AlertResponse`)

---

### Component 2: MITRE ATT&CK Lookup Table

#### [NEW] [mitre_mapping.py](file:///D:/final%20year%20project/PROJECT/backend/app/services/mitre_mapping.py)
Static lookup dict mapping each rule string → list of MITRE ATT&CK technique objects `{ id, name, tactic }`:

| Rule Pattern | MITRE Technique |
|---|---|
| Off-hours access | T1078 — Valid Accounts |
| Large/elevated data transfer | T1041 — Exfiltration Over C2 |
| Failed login spike | T1110 — Brute Force |
| Credential sharing / Multiple IPs | T1078.001 — Default Accounts |
| First-time resource access | T1071 — Application Layer Protocol |
| Suspicious source IP | T1090 — Proxy |
| Geo-location anomaly | T1090.003 — Multi-hop Proxy |
| Cross-department access | T1021 — Remote Services |
| Sensitive resource accessed | T1530 — Data from Cloud Storage |
| Rapid successive actions | T1498 — Network DoS |
| After-hours bulk download | T1005 — Data from Local System |
| Privilege escalation attempt | T1548 — Abuse Elevation Control |
| Weekend access | T1078.003 — Cloud Accounts |
| Excessive file access | T1083 — File and Directory Discovery |
| VPN from suspicious location | T1133 — External Remote Services |

Function: `get_mitre_tags(rule_details: list[str]) -> list[dict]` — returns unique tags for a set of triggered rules.

---

### Component 3: GenAI Narrative Generator

#### [NEW] [narrative_generator.py](file:///D:/final%20year%20project/PROJECT/backend/app/services/narrative_generator.py)
- Template-based narrative engine: takes `risk_score`, `ml_score`, `rule_score`, `rule_details`, `event_details`, `user_name` → produces a 3–5 sentence plain-English summary
- References the specific rules, severity tier, and score breakdown
- Cached: result stored in `Alert.genai_narrative` on first generation

#### [MODIFY] [alerts.py (API)](file:///D:/final%20year%20project/PROJECT/backend/app/api/alerts.py)
- In `get_alert()`: if `alert.genai_narrative` is None, generate it, persist to DB, return
- Add `PATCH /alerts/{id}/status` — update alert status (New/Investigating/Resolved/False Positive)
- Add `POST /alerts/{id}/feedback` — analyst verdict (confirmed_threat / false_positive) + notes → `AlertFeedback` table
- Add `GET /alerts/notifications` — returns alerts with status="new" where risk_score ≥ 0.6 created in last 24h, ordered newest first, limit 20
- Also auto-populate `mitre_tags` JSON on alert detail fetch (from MITRE lookup, cache on Alert record)

---

### Component 4: RBAC Backend + JWT Middleware

#### [NEW] [auth.py](file:///D:/final%20year%20project/PROJECT/backend/app/api/auth.py)
- `get_current_user(token)` dependency: decode JWT, return user dict with role
- `require_role("admin")` dependency: wraps `get_current_user`, raises 403 if role != admin

#### [MODIFY] [main.py](file:///D:/final%20year%20project/PROJECT/backend/app/main.py)
- Fix `GET /api/v1/auth/me` to actually decode the JWT from the Authorization header instead of always returning admin
- Import and wire `auth.py` router

---

### Component 5: Threshold Admin API + Model Retraining

#### [NEW] [admin.py](file:///D:/final%20year%20project/PROJECT/backend/app/api/admin.py)
- `GET /api/v1/admin/config` — returns current threshold values (alert_threshold, ml_weight, rule_weight, severity tier boundaries) from `SystemConfig` table (falls back to `settings` defaults)
- `PUT /api/v1/admin/config` — admin-only: update thresholds, persist to `SystemConfig`, update `settings` in-memory for immediate effect
- `POST /api/v1/admin/retrain` — admin-only: triggers Isolation Forest retraining using labeled `AlertFeedback` data, logs result to `ModelTrainingLog`
- `GET /api/v1/admin/training-logs` — returns recent training history

#### [MODIFY] [scoring_worker.py](file:///D:/final%20year%20project/PROJECT/backend/app/workers/scoring_worker.py)
- Read `ALERT_THRESHOLD` from `settings` at scoring time (already does this), so admin config changes take immediate effect

---

### Component 6: Export API

#### [NEW] [export.py](file:///D:/final%20year%20project/PROJECT/backend/app/api/export.py)
- `GET /api/v1/export/alerts?format=csv&status=...&department=...&min_risk=...&max_risk=...` — CSV export of filtered alerts
- `GET /api/v1/export/alerts?format=pdf&...` — PDF export using `reportlab` (or simple HTML-to-PDF)
- `GET /api/v1/export/user/{user_id}/history?format=csv` — CSV export of a user's risk history
- Reuses the same query logic as `list_alerts` / `get_user_risk_history`

#### [MODIFY] [requirements.txt](file:///D:/final%20year%20project/PROJECT/backend/requirements.txt)
- Add `reportlab` for PDF generation

---

### Component 7: Frontend Auth Context (RBAC)

#### [MODIFY] [App.jsx](file:///D:/final%20year%20project/PROJECT/frontend/src/App.jsx)
- Decode JWT payload on login to extract `{ role, full_name, username, sub }` using `atob(token.split('.')[1])`
- Expose `{ role, fullName, username, userId }` through `AuthContext`
- Add `<AdminRoute>` wrapper component: renders `<Outlet>` if role=admin, else redirects to /dashboard
- Add `/admin/settings` route under `<AdminRoute>`
- **No changes** to existing ProtectedRoute or any existing route paths

---

### Component 8: Sidebar (Admin Link + Notifications)

#### [MODIFY] [Sidebar.jsx](file:///D:/final%20year%20project/PROJECT/frontend/src/components/Sidebar.jsx)
- Read `role`, `fullName` from `useAuth()` — display actual logged-in user name/role instead of hardcoded "SecOps Admin / SOC Analyst"
- Add "Admin Settings" nav item (gear icon) — only visible if role === 'admin'
- Add SVG icons for gear (admin) and bell (notifications)

---

### Component 9: Notification Bell Component

#### [NEW] [NotificationBell.jsx](file:///D:/final%20year%20project/PROJECT/frontend/src/components/NotificationBell.jsx)
- Bell icon in main content header area (or sidebar top)
- Polls `GET /alerts/notifications` every 30s
- Tracks `lastViewedAt` in localStorage
- Shows unread count badge (red circle with number)
- Dropdown panel with list of recent critical/high alerts — severity badge, user name, time
- Click an item → navigate to `/alerts/{id}`
- Uses existing card/badge/severity styling

---

### Component 10: Alert Detail Page Enhancements

#### [MODIFY] [AlertDetailPage.jsx](file:///D:/final%20year%20project/PROJECT/frontend/src/pages/AlertDetailPage.jsx)
- **MITRE ATT&CK tags**: show as small tinted chips below each triggered rule (parsed from `alert.mitre_tags` JSON)
- **Status dropdown**: select with options New / Investigating / Resolved / False Positive — calls `PATCH /alerts/{id}/status`
- **Analyst feedback section**: "Confirmed Threat" / "False Positive" buttons + optional notes textarea → calls `POST /alerts/{id}/feedback`
- **GenAI narrative**: already has the UI section — now populated with real cached narrative from API
- All new UI elements use existing `.badge`, `.btn`, `.select`, `.card` classes

---

### Component 11: Alerts Page Status Filter

#### [MODIFY] [AlertsPage.jsx](file:///D:/final%20year%20project/PROJECT/frontend/src/pages/AlertsPage.jsx)
- Add "Status" dropdown filter to the existing filter row: All / New / Investigating / Resolved / False Positive
- Add status badge on each alert card (small chip in corner)
- Add "Export" button (btn btn-ghost with download icon) that calls `/api/v1/export/alerts?format=csv` with current filter params
- **No changes** to existing search, severity filter, department filter, sort, card layout, or routing

---

### Component 12: User History Page Export

#### [MODIFY] [UserHistoryPage.jsx](file:///D:/final%20year%20project/PROJECT/frontend/src/pages/UserHistoryPage.jsx)
- Add "Export CSV" button next to the "Recent Alert History" heading
- Calls `/api/v1/export/user/{id}/history?format=csv` — downloads the user's risk history
- Uses existing `btn btn-ghost` styling
- **No changes** to chart, gauge, expandable rows, or pagination

---

### Component 13: Admin Settings Page

#### [NEW] [AdminSettingsPage.jsx](file:///D:/final%20year%20project/PROJECT/frontend/src/pages/AdminSettingsPage.jsx)
- Admin-only route at `/admin/settings`
- **Threshold Configuration** card: editable fields for Alert Threshold, ML Weight, Rule Weight, severity tier boundaries. "Save" button calls `PUT /api/v1/admin/config`
- **Model Retraining** card: "Retrain Model" button (calls `POST /api/v1/admin/retrain`), shows last retrained timestamp and stats from `GET /api/v1/admin/training-logs`
- **Feedback Stats** card: count of confirmed threats vs false positives from analyst feedback
- All styling uses existing card/input/btn/stat-card patterns + severity color tokens

---

## New Files Summary

| File | Purpose |
|---|---|
| `backend/app/services/mitre_mapping.py` | MITRE ATT&CK lookup table |
| `backend/app/services/narrative_generator.py` | GenAI template narrative |
| `backend/app/api/auth.py` | JWT decode + role middleware |
| `backend/app/api/admin.py` | Threshold config + retrain API |
| `backend/app/api/export.py` | CSV/PDF export endpoints |
| `frontend/src/components/NotificationBell.jsx` | Notification bell + dropdown |
| `frontend/src/pages/AdminSettingsPage.jsx` | Admin threshold/retrain UI |

## Modified Files Summary

| File | Change |
|---|---|
| `backend/app/models.py` | +2 tables (ModelTrainingLog, SystemConfig) |
| `backend/app/schemas.py` | +6 Pydantic models |
| `backend/app/api/alerts.py` | +3 endpoints (status update, feedback, notifications) + narrative/MITRE auto-populate |
| `backend/app/main.py` | Fix /auth/me JWT decode, wire admin router |
| `backend/requirements.txt` | +reportlab |
| `frontend/src/App.jsx` | JWT decode, AdminRoute, /admin/settings route |
| `frontend/src/components/Sidebar.jsx` | Admin nav item (role-gated), real user info |
| `frontend/src/pages/AlertDetailPage.jsx` | MITRE tags, status dropdown, feedback section |
| `frontend/src/pages/AlertsPage.jsx` | Status filter, export button |
| `frontend/src/pages/UserHistoryPage.jsx` | Export CSV button |

---

## Verification Plan

### Automated Tests
- `curl` the backend APIs after rebuild to confirm all new endpoints return correct data
- Verify `GET /alerts/notifications` returns only recent high/critical alerts
- Verify `PATCH /alerts/{id}/status` persists and is reflected on subsequent `GET`
- Verify `PUT /api/v1/admin/config` changes threshold, and new alerts use updated threshold
- Verify export endpoints return valid CSV with correct headers/data

### Manual Verification
- **Existing pages**: Dashboard, Alerts (search/filter/sort), Users, Alert Detail, User Detail with expandable rows — all work in both light and dark mode
- **RBAC**: Login as `analyst/analyst123` → verify Admin Settings link is hidden in sidebar AND navigating to `/admin/settings` redirects to dashboard
- **RBAC**: Login as `admin/admin123` → verify Admin Settings link visible and accessible
- **Alert lifecycle**: Change alert status on detail page → verify it appears in Alerts page status filter
- **Export**: Filter alerts → click Export → verify downloaded CSV matches displayed data
- **Notifications**: Verify bell shows unread count, clicking an item navigates to correct alert
- **Threshold**: Change alert threshold in admin → verify new alerts use new threshold, chart dashed line updates
- **Narrative**: View alert detail → verify AI narrative section shows contextual text (not placeholder)
- **MITRE tags**: View alert detail → verify MITRE chips appear near triggered rules

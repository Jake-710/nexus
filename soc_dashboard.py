import streamlit as st
import requests
import pandas as pd

st.set_page_config(page_title="NEXUS - SOC Security Operations Dashboard", page_icon="🛡️", layout="wide")

BACKEND_URL = "http://127.0.0.1:8000"

st.title("🛡️ NEXUS Security Operations Center (SOC) Dashboard")
st.caption("Real-time behavioral threat monitoring, AI risk scoring, and human-in-the-loop analyst decisions.")

# Fetch master event log directly from FastAPI backend
try:
    events_res = requests.get(f"{BACKEND_URL}/recent-events", timeout=2)
    event_logs = events_res.json() if events_res.status_code == 200 else []
except:
    event_logs = []

# Header Metrics
col_h1, col_h2, col_h3, col_h4 = st.columns(4)
try:
    health_res = requests.get(f"{BACKEND_URL}/health", timeout=2)
    status_str = "🟢 ONLINE" if health_res.status_code == 200 else "🔴 OFFLINE"
except:
    status_str = "🔴 OFFLINE"

col_h1.metric("Engine Status", status_str)
col_h2.metric("Total Master Events", len(event_logs))
critical_count = sum(1 for e in event_logs if e.get("severity") in ["HIGH", "CRITICAL"])
col_h3.metric("High/Critical Alerts", critical_count)
col_h4.metric("Active ML Engine", "PPO Policy (PyTorch)")

st.divider()

col_feed, col_action = st.columns([1.2, 1])

with col_feed:
    st.subheader("📊 Live Behavioral Event Feed")
    
    if st.button("🔄 Fetch Latest Logs from Backend", use_container_width=True):
        st.rerun()

    if event_logs:
        df = pd.DataFrame(event_logs)
        st.dataframe(
            df[["timestamp", "user_id", "event_type", "anomaly_score", "severity"]],
            use_container_width=True,
            height=350
        )
    else:
        st.info("No events logged yet. Trigger an attack on Dashboard 1 (http://localhost:8501) and click Refresh!")

with col_action:
    st.subheader("🧑‍💻 Analyst Decision Center (Human-in-the-Loop)")
    st.write("Inspect scored anomalies, review MITRE ATT&CK mappings, and submit training feedback.")

    if event_logs:
        event_options = [f"{e['timestamp']} - {e['user_id']} ({e['event_type']} | {e['severity']})" for e in event_logs]
        selected_idx = st.selectbox("Select Event to Inspect", range(len(event_options)), format_func=lambda i: event_options[i])
        
        selected_event = event_logs[selected_idx]

        st.markdown(f"### Target Entity: `{selected_event['user_id']}`")
        st.progress(float(selected_event['anomaly_score']), text=f"Anomaly Score: {selected_event['anomaly_score']} / 1.0")

        sev = selected_event['severity']
        if sev == "CRITICAL":
            st.error(f"Severity Level: {sev}")
        elif sev == "HIGH":
            st.warning(f"Severity Level: {sev}")
        elif sev == "MEDIUM":
            st.info(f"Severity Level: {sev}")
        else:
            st.success(f"Severity Level: {sev}")

        if selected_event.get("mitre_attack"):
            st.markdown("#### 🎯 MITRE ATT&CK Mapping")
            st.json(selected_event["mitre_attack"])

        if selected_event.get("remediation_playbook"):
            playbook = selected_event["remediation_playbook"]
            st.markdown("#### 🛠️ Recommended Playbook Action")
            st.write(f"**Immediate:** {playbook['immediate']}")
            st.write(f"**Short Term:** {playbook['short_term']}")

        st.divider()
        st.markdown("#### ⚖️ Analyst Decision & Reward Adjustment")
        analyst_id = st.text_input("Analyst ID", value="soc_analyst_01")
        disposition = st.radio("Select Action / Decision:", ["confirm (True Positive)", "downgrade (False Positive)", "dismiss (Ignore)"])

        if st.button("Submit Decision to RL Engine", use_container_width=True):
            disp_code = disposition.split(" ")[0]
            feedback_payload = {
                "user_id": selected_event["user_id"],
                "event_id": f"evt_{selected_event['timestamp']}",
                "disposition": disp_code,
                "analyst_id": analyst_id
            }
            try:
                fb_res = requests.post(f"{BACKEND_URL}/feedback", json=feedback_payload)
                if fb_res.status_code == 200:
                    st.success(f"Decision logged! Backend response: {fb_res.json()['message']}")
                else:
                    st.error(f"Error {fb_res.status_code}: {fb_res.text}")
            except Exception as e:
                st.error(f"Failed to submit decision: {e}")
    else:
        st.write("Waiting for telemetry data...")
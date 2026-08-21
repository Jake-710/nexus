from fastapi import FastAPI
import time
from typing import List
from app.schemas import EventPayload, AnomalyResponse, FeedbackPayload
from app.state import BehavioralStateManager
from app.features import FeatureExtractor
from app.rl_engine import AnomalyScorer
from app.graph import CrossEntityGraph
from app.remediation import RemediationEngine

app = FastAPI(
    title="NEXUS / RL-UEBA Platform",
    version="1.0.0",
    description="Real-Time Detection of Insider Attacks and Zero-Day Vulnerabilities"
)

state_manager = BehavioralStateManager(window_size=50)
scorer = AnomalyScorer()
graph = CrossEntityGraph()

# Global Master Event Log Buffer (Stores recent events across all users & simulations)
master_event_log: List[dict] = []

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "uptime": "UP", "timestamp": time.time()}

@app.get("/recent-events")
def get_recent_events():
    """Returns the master log of all processed events and simulations for the SOC Dashboard."""
    return master_event_log

@app.post("/events", response_model=AnomalyResponse)
def process_event(event: EventPayload):
    history = state_manager.add_event(event.user_id, event.event_type, event.payload)
    features = FeatureExtractor.extract(history)
    raw_score, severity = scorer.score(features)
    
    graph_risk = graph.get_subgraph_risk(event.user_id)
    final_score = min(raw_score + graph_risk, 1.0)

    remediation = RemediationEngine.get_recommendation(event.event_type, severity)

    response_data = {
        "user_id": event.user_id,
        "event_type": event.event_type,
        "anomaly_score": round(final_score, 4),
        "severity": severity,
        "mitre_attack": remediation["mitre_attack"] if remediation else None,
        "remediation_playbook": remediation["playbook"] if remediation else None,
        "timestamp": time.strftime("%H:%M:%S")
    }

    # Store in central master log (keep up to last 100 events)
    master_event_log.insert(0, response_data)
    if len(master_event_log) > 100:
        master_event_log.pop()

    return response_data

@app.post("/simulate-error")
def simulate_error(user_id: str = "sim_user_1"):
    responses = []
    for _ in range(25):
        payload = EventPayload(user_id=user_id, event_type="AUTH_BURST", payload={"failed_attempts": 10})
        responses.append(process_event(payload))
    return {"scenario": "Auth Error Burst", "triggered_events": len(responses), "last_result": responses[-1]}

@app.post("/simulate-burst")
def simulate_burst(user_id: str = "sim_user_2"):
    responses = []
    for i in range(50):
        payload = EventPayload(user_id=user_id, event_type="EVENT_FLOOD", payload={"req_id": i})
        responses.append(process_event(payload))
    return {"scenario": "Event Flood / DoS", "triggered_events": len(responses), "last_result": responses[-1]}

@app.post("/simulate-spike")
def simulate_spike(user_id: str = "sim_user_3"):
    payload = EventPayload(user_id=user_id, event_type="PAYLOAD_SPIKE", payload={"bytes_transferred": 5000000})
    return process_event(payload)

@app.post("/feedback")
def submit_feedback(feedback: FeedbackPayload):
    return {"status": "SUCCESS", "message": f"Feedback received for {feedback.user_id}", "disposition": feedback.disposition}
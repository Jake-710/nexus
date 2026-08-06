from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class EventPayload(BaseModel):
    user_id: str = Field(..., example="usr_102")
    event_type: str = Field(..., example="FILE_ACCESS")
    payload: Dict[str, Any] = Field(default_factory=dict)

class AnomalyResponse(BaseModel):
    user_id: str
    event_type: str
    anomaly_score: float
    severity: str
    mitre_attack: Optional[Dict[str, Any]] = None
    remediation_playbook: Optional[Dict[str, Any]] = None

class FeedbackPayload(BaseModel):
    user_id: str
    event_id: str
    disposition: str  # confirm, downgrade, upgrade, dismiss
    analyst_id: str
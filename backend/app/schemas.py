from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

class EventCreate(BaseModel):
    action_type: str
    volume_mb: Optional[float] = None
    src_ip: str
    resource_id: Optional[str] = None
    geo_location: Optional[str] = None
    user_id: UUID
    session_id: Optional[str] = None
    timestamp: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventResponse(BaseModel):
    id: UUID
    timestamp: datetime
    user_id: UUID
    action_type: str
    volume_mb: Optional[float]
    src_ip: str
    resource_id: Optional[str]
    geo_location: Optional[str]
    session_id: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AlertResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: UUID
    risk_score: float
    ml_score: float
    rule_score: float
    status: str
    rule_details: Any
    genai_narrative: Optional[str]
    mitre_tags: Optional[str]
    created_at: datetime
    user_name: str
    user_department: str
    event_details: EventResponse
    model_config = ConfigDict(from_attributes=True)

class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total_count: int

class UserRiskHistoryPoint(BaseModel):
    alert_id: Optional[UUID] = None
    timestamp: datetime
    risk_score: float

class UserRiskHistoryResponse(BaseModel):
    user_id: UUID
    user_name: str
    department: str
    history: List[UserRiskHistoryPoint]

class StatsResponse(BaseModel):
    total_alerts: int
    active_alerts: int
    avg_risk_score: float
    events_today: int
    high_risk_users: int

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

# ---- Weeks 10–13 feature schemas ----

class AlertStatusUpdate(BaseModel):
    status: str  # new | investigating | resolved | false_positive

class AlertFeedbackCreate(BaseModel):
    verdict: str  # confirmed_threat | false_positive
    notes: Optional[str] = None

class RetrainRequest(BaseModel):
    peer_group_id: Optional[int] = None  # None = retrain all peer groups
    triggered_by: str = "manual"

class RetrainResponse(BaseModel):
    status: str
    groups_trained: int
    samples_used: int
    message: str

class ThresholdConfig(BaseModel):
    alert_threshold: float = Field(ge=0.0, le=1.0)
    ml_weight: float = Field(ge=0.0, le=1.0)
    rule_weight: float = Field(ge=0.0, le=1.0)
    severity_low: float = Field(default=0.40, ge=0.0, le=1.0)
    severity_medium: float = Field(default=0.60, ge=0.0, le=1.0)
    severity_high: float = Field(default=0.80, ge=0.0, le=1.0)

class SystemConfigResponse(ThresholdConfig):
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

class NotificationItem(BaseModel):
    id: UUID
    user_name: str
    user_department: str
    risk_score: float
    status: str
    created_at: datetime

class MitreTag(BaseModel):
    id: str
    name: str
    tactic: str

class FeedbackStats(BaseModel):
    confirmed_threats: int
    false_positives: int
    total: int

class TrainingLogResponse(BaseModel):
    id: UUID
    trained_at: datetime
    peer_group_id: Optional[int]
    samples_used: int
    avg_score_before: Optional[float]
    avg_score_after: Optional[float]
    triggered_by: str
    model_config = ConfigDict(from_attributes=True)

class CurrentUser(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    role: str
    department: Optional[str] = None

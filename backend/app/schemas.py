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

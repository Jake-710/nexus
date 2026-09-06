import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

# Use timezone-aware DateTime columns throughout
TZDateTime = DateTime(timezone=True)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True)
    email = Column(String)
    full_name = Column(String)
    department = Column(String)
    role = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))

class Event(Base):
    __tablename__ = "events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(TZDateTime, index=True, default=lambda: datetime.now(timezone.utc))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action_type = Column(String)
    volume_mb = Column(Float, nullable=True)
    src_ip = Column(String)
    resource_id = Column(String, nullable=True)
    geo_location = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    created_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))

class UserBaseline(Base):
    __tablename__ = "user_baselines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    peer_group_id = Column(Integer)
    avg_login_hour = Column(Float)
    avg_files_per_day = Column(Float)
    avg_volume_mb = Column(Float)
    common_ips = Column(JSON)
    typical_resources = Column(JSON)
    updated_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"))
    risk_score = Column(Float)
    ml_score = Column(Float)
    rule_score = Column(Float)
    status = Column(String, default="new")
    rule_details = Column(JSON)
    genai_narrative = Column(String, nullable=True)
    mitre_tags = Column(String, nullable=True)
    created_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))

class AlertFeedback(Base):
    __tablename__ = "alert_feedback"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id"))
    analyst_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    verdict = Column(String)
    notes = Column(String, nullable=True)
    created_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id"), nullable=True)
    actor = Column(String)
    action = Column(String)
    details = Column(String, nullable=True)
    timestamp = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))

class ModelTrainingLog(Base):
    """Records each Isolation Forest (re)training run for the admin audit trail."""
    __tablename__ = "model_training_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trained_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc))
    peer_group_id = Column(Integer, nullable=True)
    samples_used = Column(Integer, default=0)
    avg_score_before = Column(Float, nullable=True)
    avg_score_after = Column(Float, nullable=True)
    triggered_by = Column(String, default="manual")  # manual | scheduled

class SystemConfig(Base):
    """Key/value store for runtime-adjustable settings (thresholds, weights)."""
    __tablename__ = "system_config"
    key = Column(String, primary_key=True)
    value = Column(JSON)
    updated_at = Column(TZDateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(String, nullable=True)

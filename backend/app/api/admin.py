"""
Admin API: runtime threshold configuration, model retraining, training history,
and analyst feedback statistics. All routes are admin-only via require_role.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timezone

from app.database import get_db
from app.config import settings
from app.api.auth import require_role
from app.models import SystemConfig, ModelTrainingLog, AlertFeedback, Alert, UserBaseline, Event, User
from app.schemas import (
    ThresholdConfig, SystemConfigResponse, RetrainRequest, RetrainResponse,
    TrainingLogResponse, FeedbackStats, CurrentUser,
)
from app.services.isolation_forest import anomaly_detector
from app.services.feature_engineering import compute_features

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

_CONFIG_KEY = "thresholds"

# Runtime severity tier boundaries live in-process alongside settings so scoring
# and the API agree. Seeded from defaults; overwritten by persisted config on read.
_severity_defaults = {"severity_low": 0.40, "severity_medium": 0.60, "severity_high": 0.80}


def _current_config_dict() -> dict:
    return {
        "alert_threshold": settings.ALERT_THRESHOLD,
        "ml_weight": settings.ML_WEIGHT,
        "rule_weight": settings.RULE_WEIGHT,
        "severity_low": getattr(settings, "SEVERITY_LOW", _severity_defaults["severity_low"]),
        "severity_medium": getattr(settings, "SEVERITY_MEDIUM", _severity_defaults["severity_medium"]),
        "severity_high": getattr(settings, "SEVERITY_HIGH", _severity_defaults["severity_high"]),
    }


@router.get("/config", response_model=SystemConfigResponse)
async def get_config(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("admin", "analyst")),
):
    """Return current thresholds. Persisted config wins over static defaults."""
    row = (await db.execute(select(SystemConfig).where(SystemConfig.key == _CONFIG_KEY))).scalar_one_or_none()
    base = _current_config_dict()
    if row and isinstance(row.value, dict):
        base.update({k: v for k, v in row.value.items() if k in base})
        return SystemConfigResponse(**base, updated_at=row.updated_at, updated_by=row.updated_by)
    return SystemConfigResponse(**base)


@router.put("/config", response_model=SystemConfigResponse)
async def update_config(
    cfg: ThresholdConfig,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_role("admin")),
):
    """Persist new thresholds and apply them in-memory for immediate effect."""
    value = cfg.model_dump()

    row = (await db.execute(select(SystemConfig).where(SystemConfig.key == _CONFIG_KEY))).scalar_one_or_none()
    if row:
        row.value = value
        row.updated_by = user.username
        row.updated_at = datetime.now(timezone.utc)
    else:
        row = SystemConfig(key=_CONFIG_KEY, value=value, updated_by=user.username)
        db.add(row)
    await db.commit()
    await db.refresh(row)

    # Apply immediately so the scoring worker picks up changes without a restart
    settings.ALERT_THRESHOLD = cfg.alert_threshold
    settings.ML_WEIGHT = cfg.ml_weight
    settings.RULE_WEIGHT = cfg.rule_weight
    settings.SEVERITY_LOW = cfg.severity_low
    settings.SEVERITY_MEDIUM = cfg.severity_medium
    settings.SEVERITY_HIGH = cfg.severity_high

    return SystemConfigResponse(**value, updated_at=row.updated_at, updated_by=row.updated_by)


@router.post("/retrain", response_model=RetrainResponse)
async def retrain_model(
    req: RetrainRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("admin")),
):
    """
    Retrain the Isolation Forest using recent event history per peer group.
    Uses events tied to users in each peer group to rebuild feature matrices.
    """
    # Map peer_group_id -> list of feature vectors from recent events
    baselines = (await db.execute(select(UserBaseline))).scalars().all()
    baseline_by_user = {b.user_id: b for b in baselines}

    # Pull a recent slice of events to rebuild training data
    events = (await db.execute(select(Event).order_by(Event.timestamp.desc()).limit(5000))).scalars().all()

    groups: dict[int, list] = {}
    for ev in events:
        baseline = baseline_by_user.get(ev.user_id)
        if baseline is None:
            continue
        pg = baseline.peer_group_id
        if req.peer_group_id is not None and pg != req.peer_group_id:
            continue
        ev_dict = {
            "user_id": str(ev.user_id),
            "action_type": ev.action_type,
            "volume_mb": ev.volume_mb,
            "src_ip": ev.src_ip,
            "resource_id": ev.resource_id,
            "geo_location": ev.geo_location,
            "session_id": ev.session_id,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
        }
        feats = compute_features(ev_dict, baseline, [])
        vector = [
            feats["login_hour"], feats["failed_login_attempts"], feats["files_accessed"],
            feats["data_volume_mb"], feats["distinct_ips"], feats["off_hours_flag"],
            feats["first_time_resource"],
        ]
        groups.setdefault(pg, []).append(vector)

    groups_trained = 0
    total_samples = 0
    for pg, matrix in groups.items():
        if len(matrix) < 5:
            continue
        # Average anomaly score before/after for the training log
        before = sum(anomaly_detector.predict(pg, v) for v in matrix) / len(matrix)
        anomaly_detector.train(pg, matrix)
        after = sum(anomaly_detector.predict(pg, v) for v in matrix) / len(matrix)
        db.add(ModelTrainingLog(
            peer_group_id=pg,
            samples_used=len(matrix),
            avg_score_before=round(before, 4),
            avg_score_after=round(after, 4),
            triggered_by=req.triggered_by,
        ))
        groups_trained += 1
        total_samples += len(matrix)

    await db.commit()

    if groups_trained == 0:
        return RetrainResponse(
            status="skipped", groups_trained=0, samples_used=0,
            message="Not enough recent event data to retrain. Let the simulator run longer, then retry.",
        )
    return RetrainResponse(
        status="ok", groups_trained=groups_trained, samples_used=total_samples,
        message=f"Retrained {groups_trained} peer group model(s) using {total_samples} samples.",
    )


@router.get("/training-logs", response_model=list[TrainingLogResponse])
async def get_training_logs(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("admin", "analyst")),
):
    rows = (await db.execute(
        select(ModelTrainingLog).order_by(ModelTrainingLog.trained_at.desc()).limit(limit)
    )).scalars().all()
    return [TrainingLogResponse.model_validate(r) for r in rows]


@router.get("/feedback-stats", response_model=FeedbackStats)
async def get_feedback_stats(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("admin", "analyst")),
):
    confirmed = (await db.execute(
        select(func.count(AlertFeedback.id)).where(AlertFeedback.verdict == "confirmed_threat")
    )).scalar_one()
    false_pos = (await db.execute(
        select(func.count(AlertFeedback.id)).where(AlertFeedback.verdict == "false_positive")
    )).scalar_one()
    return FeedbackStats(confirmed_threats=confirmed, false_positives=false_pos, total=confirmed + false_pos)

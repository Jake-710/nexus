from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
import uuid, random, json
from app.database import get_db
from app.schemas import (
    AlertListResponse, AlertResponse, StatsResponse, EventResponse,
    AlertStatusUpdate, AlertFeedbackCreate, NotificationItem,
)
from app.models import Alert, User, Event, AlertFeedback
from app.api.auth import get_current_user
from app.schemas import CurrentUser
from app.services.mitre_mapping import get_mitre_tags
from app.services.narrative_generator import generate_narrative
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import func, desc

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.post("/seed-demo")
async def seed_demo_alerts(db: AsyncSession = Depends(get_db)):
    """Create demo alerts with varied risk scores for graph demonstration."""
    # Get some users
    users = (await db.execute(select(User).where(User.role == "user").limit(10))).scalars().all()
    if not users:
        raise HTTPException(status_code=404, detail="No users found")

    # Get some events to link to (or create dummy ones)
    events = (await db.execute(select(Event).limit(10))).scalars().all()
    if not events:
        raise HTTPException(status_code=404, detail="No events found. Ingest some events first.")

    # Define a wave pattern of risk scores
    score_pattern = [
        0.25, 0.30, 0.35, 0.42, 0.55, 0.63, 0.72, 0.85, 0.92, 0.88,
        0.78, 0.65, 0.50, 0.40, 0.35, 0.45, 0.58, 0.70, 0.82, 0.95,
        0.90, 0.75, 0.60, 0.48, 0.38, 0.30, 0.52, 0.68, 0.80, 0.72,
    ]

    now = datetime.now(timezone.utc)
    created_count = 0

    for i, score in enumerate(score_pattern):
        user = users[i % len(users)]
        event = events[i % len(events)]
        ts = now - timedelta(minutes=(len(score_pattern) - i) * 4)

        ml_score = score * random.uniform(0.85, 1.15)
        rule_score = score * random.uniform(0.75, 1.25)

        rules = []
        if score >= 0.8:
            rules = ["Off-hours access detected", "Large data transfer", "Suspicious source IP", "Geo-location anomaly"]
        elif score >= 0.5:
            rules = ["Elevated data transfer", "First-time resource access"]
        else:
            rules = ["Normal activity pattern"]

        alert = Alert(
            user_id=user.id,
            event_id=event.id,
            risk_score=round(score, 4),
            ml_score=round(min(ml_score, 1.0), 4),
            rule_score=round(min(rule_score, 1.0), 4),
            rule_details=rules,
            status="new",
            created_at=ts,
        )
        db.add(alert)
        created_count += 1

    await db.commit()
    return {"status": "ok", "created": created_count, "message": f"Seeded {created_count} demo alerts with varied scores"}

@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[str] = None,
    department: Optional[str] = None,
    min_risk: Optional[float] = None,
    max_risk: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(Alert, User, Event).join(User, Alert.user_id == User.id).join(Event, Alert.event_id == Event.id)
    
    if status:
        query = query.where(Alert.status == status)
    if department:
        query = query.where(User.department == department)
    if min_risk is not None:
        query = query.where(Alert.risk_score >= min_risk)
    if max_risk is not None:
        query = query.where(Alert.risk_score <= max_risk)
        
    query = query.order_by(desc(Alert.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    
    alerts_data = []
    for alert, user, event in result:
        alert_dict = {
            "id": alert.id,
            "user_id": alert.user_id,
            "event_id": alert.event_id,
            "risk_score": alert.risk_score,
            "ml_score": alert.ml_score,
            "rule_score": alert.rule_score,
            "status": alert.status,
            "rule_details": alert.rule_details,
            "genai_narrative": alert.genai_narrative,
            "mitre_tags": alert.mitre_tags,
            "created_at": alert.created_at,
            "user_name": user.full_name or user.username,
            "user_department": user.department,
            "event_details": EventResponse.model_validate(event)
        }
        alerts_data.append(AlertResponse(**alert_dict))
        
    count_query = select(func.count(Alert.id))
    if status:
        count_query = count_query.where(Alert.status == status)
    if department:
        count_query = count_query.join(User, Alert.user_id == User.id).where(User.department == department)
    if min_risk is not None:
        count_query = count_query.where(Alert.risk_score >= min_risk)
    if max_risk is not None:
        count_query = count_query.where(Alert.risk_score <= max_risk)
    
    total_count = (await db.execute(count_query)).scalar_one()
    
    return AlertListResponse(alerts=alerts_data, total_count=total_count)

@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_alerts = (await db.execute(select(func.count(Alert.id)))).scalar_one()
    active_alerts = (await db.execute(select(func.count(Alert.id)).where(Alert.status == "new"))).scalar_one()
    avg_risk = (await db.execute(select(func.avg(Alert.risk_score)))).scalar_one() or 0.0
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    events_today = (await db.execute(select(func.count(Event.id)).where(Event.created_at >= today_start))).scalar_one()
    
    high_risk_users = (await db.execute(select(func.count(func.distinct(Alert.user_id))).where(Alert.risk_score >= 0.8))).scalar_one()
    
    return StatsResponse(
        total_alerts=total_alerts,
        active_alerts=active_alerts,
        avg_risk_score=avg_risk,
        events_today=events_today,
        high_risk_users=high_risk_users
    )

# IMPORTANT: /notifications must be defined BEFORE /{alert_id}
# otherwise FastAPI treats "notifications" as an alert_id parameter.
@router.get("/notifications", response_model=List[NotificationItem])
async def get_notifications(db: AsyncSession = Depends(get_db)):
    """Recent high/critical NEW alerts (last 24h) for the notification bell."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    rows = (await db.execute(
        select(Alert, User)
        .join(User, Alert.user_id == User.id)
        .where(Alert.status == "new", Alert.risk_score >= 0.6, Alert.created_at >= since)
        .order_by(desc(Alert.created_at))
        .limit(20)
    )).all()
    return [
        NotificationItem(
            id=alert.id,
            user_name=user.full_name or user.username,
            user_department=user.department,
            risk_score=alert.risk_score,
            status=alert.status,
            created_at=alert.created_at,
        )
        for alert, user in rows
    ]


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    try:
        alert_id = uuid.UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid alert ID")
    query = select(Alert, User, Event).join(User, Alert.user_id == User.id).join(Event, Alert.event_id == Event.id).where(Alert.id == alert_id)
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert, user, event = row

    # Lazily generate + cache the MITRE tags and AI narrative on first fetch
    dirty = False
    if alert.mitre_tags is None:
        tags = get_mitre_tags(alert.rule_details if isinstance(alert.rule_details, list) else [])
        alert.mitre_tags = json.dumps(tags)
        dirty = True
    if alert.genai_narrative is None:
        alert.genai_narrative = generate_narrative(
            risk_score=alert.risk_score,
            ml_score=alert.ml_score,
            rule_score=alert.rule_score,
            rule_details=alert.rule_details if isinstance(alert.rule_details, list) else [],
            event_details=event,
            user_name=user.full_name or user.username,
        )
        dirty = True
    if dirty:
        await db.commit()
        await db.refresh(alert)

    return AlertResponse(
        id=alert.id,
        user_id=alert.user_id,
        event_id=alert.event_id,
        risk_score=alert.risk_score,
        ml_score=alert.ml_score,
        rule_score=alert.rule_score,
        status=alert.status,
        rule_details=alert.rule_details,
        genai_narrative=alert.genai_narrative,
        mitre_tags=alert.mitre_tags,
        created_at=alert.created_at,
        user_name=user.full_name or user.username,
        user_department=user.department,
        event_details=EventResponse.model_validate(event)
    )


@router.patch("/{alert_id}/status", response_model=AlertResponse)
async def update_alert_status(
    alert_id: str,
    body: AlertStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    valid = {"new", "investigating", "resolved", "false_positive"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(valid))}")
    try:
        aid = uuid.UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid alert ID")

    row = (await db.execute(
        select(Alert, User, Event)
        .join(User, Alert.user_id == User.id)
        .join(Event, Alert.event_id == Event.id)
        .where(Alert.id == aid)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert, u, event = row
    alert.status = body.status
    await db.commit()
    await db.refresh(alert)

    return AlertResponse(
        id=alert.id, user_id=alert.user_id, event_id=alert.event_id,
        risk_score=alert.risk_score, ml_score=alert.ml_score, rule_score=alert.rule_score,
        status=alert.status, rule_details=alert.rule_details,
        genai_narrative=alert.genai_narrative, mitre_tags=alert.mitre_tags,
        created_at=alert.created_at, user_name=u.full_name or u.username,
        user_department=u.department, event_details=EventResponse.model_validate(event),
    )


@router.post("/{alert_id}/feedback")
async def submit_alert_feedback(
    alert_id: str,
    body: AlertFeedbackCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    valid = {"confirmed_threat", "false_positive"}
    if body.verdict not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid verdict. Must be one of: {', '.join(sorted(valid))}")
    try:
        aid = uuid.UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid alert ID")

    alert = (await db.execute(select(Alert).where(Alert.id == aid))).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    feedback = AlertFeedback(
        alert_id=aid,
        analyst_id=uuid.UUID(user.id),
        verdict=body.verdict,
        notes=body.notes,
    )
    db.add(feedback)

    # Confirming/dismissing also advances the alert lifecycle
    alert.status = "resolved" if body.verdict == "confirmed_threat" else "false_positive"
    await db.commit()
    await db.refresh(feedback)

    return {"status": "ok", "feedback_id": str(feedback.id), "alert_status": alert.status}

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
import uuid
from app.database import get_db
from app.schemas import AlertListResponse, AlertResponse, StatsResponse, EventResponse
from app.models import Alert, User, Event
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import func, desc

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])

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
    events_today = (await db.execute(select(func.count(Event.id)).where(Event.timestamp >= today_start))).scalar_one()
    
    high_risk_users = (await db.execute(select(func.count(func.distinct(Alert.user_id))).where(Alert.risk_score >= 0.8))).scalar_one()
    
    return StatsResponse(
        total_alerts=total_alerts,
        active_alerts=active_alerts,
        avg_risk_score=avg_risk,
        events_today=events_today,
        high_risk_users=high_risk_users
    )

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

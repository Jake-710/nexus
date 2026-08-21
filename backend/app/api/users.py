from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
from app.database import get_db
from app.schemas import UserRiskHistoryResponse, UserRiskHistoryPoint
from typing import Optional
from app.models import Alert, User, Event
from sqlalchemy import func, desc, case
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("/")
async def list_users(
    department: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List all organization users with their alert counts and latest risk scores."""
    # Subquery for user alert stats
    alert_stats = (
        select(
            Alert.user_id,
            func.count(Alert.id).label('alert_count'),
            func.max(Alert.risk_score).label('max_risk'),
            func.avg(Alert.risk_score).label('avg_risk'),
            func.max(Alert.created_at).label('latest_alert')
        )
        .group_by(Alert.user_id)
        .subquery()
    )
    
    query = (
        select(
            User.id,
            User.username,
            User.full_name,
            User.department,
            User.is_active,
            User.created_at,
            func.coalesce(alert_stats.c.alert_count, 0).label('alert_count'),
            func.coalesce(alert_stats.c.max_risk, 0.0).label('max_risk'),
            func.coalesce(alert_stats.c.avg_risk, 0.0).label('avg_risk'),
            alert_stats.c.latest_alert
        )
        .outerjoin(alert_stats, User.id == alert_stats.c.user_id)
        .where(User.role == 'user')  # Exclude admin/analyst accounts
    )
    
    if department:
        query = query.where(User.department == department)
    if search:
        query = query.where(User.full_name.ilike(f'%{search}%'))
    
    # Order by max risk score descending, then by name
    query = query.order_by(desc('max_risk'), User.full_name).offset(offset).limit(limit)
    
    result = await db.execute(query)
    users = []
    for row in result:
        users.append({
            'user_id': str(row.id),
            'username': row.username,
            'full_name': row.full_name,
            'department': row.department,
            'is_active': row.is_active,
            'alert_count': row.alert_count,
            'max_risk_score': float(row.max_risk),
            'avg_risk_score': float(row.avg_risk),
            'latest_alert_at': row.latest_alert.isoformat() if row.latest_alert else None,
            'created_at': row.created_at.isoformat() if row.created_at else None
        })
    
    # Total count
    count_query = select(func.count(User.id)).where(User.role == 'user')
    if department:
        count_query = count_query.where(User.department == department)
    if search:
        count_query = count_query.where(User.full_name.ilike(f'%{search}%'))
    total = (await db.execute(count_query)).scalar_one()
    
    return {'users': users, 'total': total}

# IMPORTANT: /leaderboard must be defined BEFORE /{user_id} routes
# otherwise FastAPI treats "leaderboard" as a user_id parameter
@router.get("/leaderboard")
async def get_leaderboard(limit: int = 10, db: AsyncSession = Depends(get_db)):
    query = select(
        User.id, 
        User.username, 
        User.full_name, 
        User.department, 
        func.max(Alert.risk_score).label("max_risk"),
        func.count(Alert.id).label("alert_count"),
        func.max(Alert.created_at).label("latest_alert")
    ).join(Alert, User.id == Alert.user_id).group_by(User.id).order_by(desc("max_risk")).limit(limit)
    
    result = await db.execute(query)
    leaderboard = []
    for row in result:
        leaderboard.append({
            "user_id": row.id,
            "user_name": row.full_name or row.username,
            "department": row.department,
            "max_risk_score": row.max_risk,
            "alert_count": row.alert_count,
            "latest_alert_at": row.latest_alert
        })
    return leaderboard

@router.get("/{user_id}/risk-history", response_model=UserRiskHistoryResponse)
async def get_user_risk_history(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        user_id = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid user ID")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    alerts = (await db.execute(select(Alert).where(Alert.user_id == user_id).order_by(Alert.created_at))).scalars().all()
    
    points = [UserRiskHistoryPoint(timestamp=a.created_at, risk_score=a.risk_score) for a in alerts]
    
    return UserRiskHistoryResponse(
        user_id=user.id,
        user_name=user.full_name or user.username,
        department=user.department,
        history=points
    )

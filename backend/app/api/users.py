from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
from app.database import get_db
from app.schemas import UserRiskHistoryResponse, UserRiskHistoryPoint
from app.models import Alert, User
from sqlalchemy import func, desc

router = APIRouter(prefix="/api/v1/users", tags=["users"])

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

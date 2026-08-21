import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import EventCreate
from app.models import Event
import redis.asyncio as redis
from app.config import settings

router = APIRouter(prefix="/api/v1/events", tags=["events"])
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post("/ingest")
async def ingest_event(event: EventCreate, db: AsyncSession = Depends(get_db)):
    db_event = Event(
        action_type=event.action_type,
        volume_mb=event.volume_mb,
        src_ip=event.src_ip,
        resource_id=event.resource_id,
        geo_location=event.geo_location,
        user_id=event.user_id,
        session_id=event.session_id,
        timestamp=event.timestamp
    )
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    
    event_dict = {
        "id": str(db_event.id),
        "action_type": db_event.action_type,
        "volume_mb": db_event.volume_mb,
        "src_ip": db_event.src_ip,
        "resource_id": db_event.resource_id,
        "geo_location": db_event.geo_location,
        "user_id": str(db_event.user_id),
        "session_id": db_event.session_id,
        "timestamp": db_event.timestamp.isoformat()
    }
    
    await redis_client.xadd("events:raw", {"data": json.dumps(event_dict)})
    
    return {"status": "queued", "event_id": db_event.id}

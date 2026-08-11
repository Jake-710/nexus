import json
import asyncio
import uuid
import redis.asyncio as redis
from datetime import datetime, timezone, timedelta
from sqlalchemy.future import select
from app.database import async_session_maker
from app.config import settings
from app.models import Event, UserBaseline, Alert, User
from app.services.feature_engineering import compute_features
from app.services.rules import evaluate_rules
from app.services.isolation_forest import anomaly_detector
from app.services.scoring import compute_blended_score

async def run_scoring_worker(broadcast_callback=None):
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    stream_name = "events:raw"
    group_name = "scoring_workers"
    
    try:
        await redis_client.xgroup_create(stream_name, group_name, mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            print(f"Error creating redis group: {e}")
            
    print("Scoring worker started...")
    
    while True:
        try:
            # Read 1 message, block for up to 5000ms
            messages = await redis_client.xreadgroup(group_name, "worker-1", {stream_name: ">"}, count=1, block=5000)
            
            if not messages:
                continue
                
            for stream, msg_list in messages:
                for msg_id, msg_data in msg_list:
                    try:
                        event_data = json.loads(msg_data["data"])
                        await process_event(event_data, broadcast_callback)
                    except Exception as e:
                        print(f"Error processing event {msg_id}: {e}")
                    finally:
                        # Acknowledge the message regardless of success/failure
                        await redis_client.xack(stream_name, group_name, msg_id)
                        
        except asyncio.CancelledError:
            print("Scoring worker stopping...")
            break
        except Exception as e:
            print(f"Redis stream reading error: {e}")
            await asyncio.sleep(5)

async def process_event(event_data: dict, broadcast_callback):
    async with async_session_maker() as db:
        user_id = event_data.get('user_id')
        if not user_id:
            return
        user_id = uuid.UUID(user_id)  # Convert string to UUID
            
        # Get user baseline
        baseline = (await db.execute(select(UserBaseline).where(UserBaseline.user_id == user_id))).scalar_one_or_none()
        
        # Get recent events (last 24h)
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_events = (await db.execute(
            select(Event).where(Event.user_id == user_id, Event.timestamp >= twenty_four_hours_ago)
        )).scalars().all()
        
        # Compute features
        features = compute_features(event_data, baseline, recent_events)
        
        # ML Score
        peer_group_id = baseline.peer_group_id if baseline else 0
        feature_vector = [
            features['login_hour'], features['failed_login_attempts'], 
            features['files_accessed'], features['data_volume_mb'], 
            features['distinct_ips'], features['off_hours_flag'], 
            features['first_time_resource']
        ]
        ml_score = anomaly_detector.predict(peer_group_id, feature_vector)
        
        # Rule score
        rule_score, triggered_rules = evaluate_rules(features, event_data)
        
        # Blended score
        blended_score = compute_blended_score(ml_score, rule_score, settings.ML_WEIGHT, settings.RULE_WEIGHT)
        
        if blended_score >= settings.ALERT_THRESHOLD:
            alert = Alert(
                user_id=user_id,
                event_id=uuid.UUID(event_data['id']),
                risk_score=blended_score,
                ml_score=ml_score,
                rule_score=rule_score,
                rule_details=triggered_rules,
                status="new"
            )
            db.add(alert)
            await db.commit()
            await db.refresh(alert)
            
            # Broadcast
            if broadcast_callback:
                # Need user details for broadcast
                user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
                alert_dict = {
                    "id": str(alert.id),
                    "user_id": str(alert.user_id),
                    "user_name": user.full_name or user.username if user else "Unknown",
                    "department": user.department if user else "Unknown",
                    "risk_score": alert.risk_score,
                    "rule_details": alert.rule_details,
                    "created_at": alert.created_at.isoformat()
                }
                await broadcast_callback(alert_dict)

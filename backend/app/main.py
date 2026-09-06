import asyncio
import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from jose import jwt
from app.config import settings

from app.database import init_db, get_db, async_session_maker
from app.models import User, UserBaseline
from app.api.events import router as events_router
from app.api.alerts import router as alerts_router
from app.api.users import router as users_router
from app.api.admin import router as admin_router
from app.api.export import router as export_router
from app.api.auth import get_current_user
from app.schemas import LoginRequest, Token, CurrentUser
from app.workers.scoring_worker import run_scoring_worker
from app.services.peer_groups import get_peer_group_id

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Keep strong references to background tasks so they don't get GC'd
_background_tasks = set()

# Must match the simulator's namespace exactly
NAMESPACE_UUID = uuid.UUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

def deterministic_uuid(full_name: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_UUID, full_name)

# Exact same user list as the simulator — order and names must match
USERS_BY_DEPARTMENT = {
    'Engineering': [
        "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Karthik Rajan", "Arjun Menon",
        "Siddharth Rao", "Arun Prakash", "Vivek Nambiar", "Rohit Saxena", "Pooja Verma",
        "Nikhil Joshi", "Divya Krishnan", "Sunil Mehta", "Ananya Gupta", "Vikram Singh",
        "Deepak Pillai", "Meera Iyer", "Ravi Shankar", "Shreya Kulkarni", "Varun Malhotra",
        "Aditi Banerjee", "Manish Tiwari", "Swati Deshpande", "Ganesh Subramanian",
        "Nandini Raghavan", "Pranav Hegde", "Kavya Nair", "Tarun Bhatia", "Ishita Mukherjee",
        "Aditya Srinivasan", "Harsha Vardhan", "Megha Reddy", "Pratik Agarwal", "Rekha Menon",
        "Sameer Chakraborty", "Uma Maheshwari", "Vinod Krishnamurthy", "Bhavya Patel",
        "Chandan Kumar", "Ritika Sharma", "Rahul Kumar", "Sanjay Gupta", "Vikash Yadav",
        "Praveen Kumar", "Suraj Sharma",
    ],
    'Finance': [
        "Sneha Reddy", "Suresh Babu", "Kavitha Sundaram", "Rahul Deshmukh", "Lakshmi Narayanan",
        "Neha Choudhary", "Mohan Rao", "Geeta Krishnamurthy", "Venkatesh Iyer", "Aarti Singhania",
        "Ramesh Gupta", "Sunita Jain", "Prasad Kulkarni", "Madhavi Desai", "Ashok Nair",
        "Savitha Hegde", "Pankaj Mishra", "Renuka Devi", "Srinivas Murthy", "Jaya Lakshmi",
        "Dinesh Acharya", "Pallavi Shetty", "Manoj Pandey", "Usha Rani", "Kishore Babu",
        "Anita Kamath", "Rajiv Menon", "Gayatri Iyer", "Hemant Deshmukh", "Nirmala Sundari",
    ],
    'HR': [
        "Deepika Nair", "Nitin Sharma", "Sangeetha Rajan", "Ajay Pradhan", "Revathi Subramaniam",
        "Sachin Patil", "Bhargavi Reddy", "Mahesh Hegde", "Preethi Kumar", "Rajan Nambiar",
        "Saroja Devi", "Vikrant Kapur", "Aparna Menon", "Gaurav Bhatt", "Indira Krishnan",
        "Chitra Ramachandran", "Naveen Rao", "Padma Lakshmi", "Sudhir Joshi", "Vandana Gupta",
        "Ashwin Kumar", "Janaki Raman", "Kiran Desai", "Mala Srinivasan", "Shobha Nair",
    ],
    'IT-Admin': [
        "Manoj Kumar", "Shalini Patel", "Raghav Menon", "Anand Krishnan", "Sowmya Iyer",
        "Prashanth Rao", "Nithya Sundaram", "Balaji Subramanian", "Kamala Devi", "Girish Nair",
        "Hema Malini", "Jagdish Sharma", "Leela Krishnamurthy", "Muralidhar Hegde", "Naga Lakshmi",
        "Pavan Kumar", "Radha Rani", "Shankar Pillai", "Tara Nair", "Umesh Babu",
    ],
    'Sales': [
        "Vikram Malhotra", "Sunita Reddy", "Anil Kumar", "Bhavana Shetty", "Chandrashekar Rao",
        "Durga Prasad", "Esha Gupta", "Farhan Ahmed", "Gokul Nath", "Haripriya Menon",
        "Irfan Khan", "Jyothi Lakshmi", "Keshav Murthy", "Latha Subramaniam", "Mukesh Agarwal",
        "Nalini Devi", "Om Prakash", "Padmini Rao", "Quincy Fernandes", "Ramya Krishnan",
        "Santosh Hegde", "Tanuja Nair", "Uday Shankar", "Vasanthi Iyer", "Waheed Ali",
        "Yamini Reddy", "Zaheer Hussain", "Akhila Menon", "Bhaskar Rao", "Charulatha Devi",
    ],
}

app = FastAPI(title="UEBA — User and Entity Behaviour Analytics", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(alerts_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(export_router)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ConnectionManager:
    """WebSocket connection manager for broadcasting alerts to dashboard clients."""
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting UEBA backend...")
    await init_db()
    logger.info("Database tables created.")

    # Restore any admin-saved thresholds so config survives restarts
    from app.models import SystemConfig
    async with async_session_maker() as cfg_db:
        cfg_row = (await cfg_db.execute(
            select(SystemConfig).where(SystemConfig.key == "thresholds")
        )).scalar_one_or_none()
        if cfg_row and isinstance(cfg_row.value, dict):
            for field, attr in [
                ("alert_threshold", "ALERT_THRESHOLD"), ("ml_weight", "ML_WEIGHT"),
                ("rule_weight", "RULE_WEIGHT"), ("severity_low", "SEVERITY_LOW"),
                ("severity_medium", "SEVERITY_MEDIUM"), ("severity_high", "SEVERITY_HIGH"),
            ]:
                if field in cfg_row.value:
                    setattr(settings, attr, cfg_row.value[field])
            logger.info("Restored persisted threshold config.")

    async with async_session_maker() as db:
        # Check if users already seeded
        existing = (await db.execute(select(User).limit(1))).scalar_one_or_none()
        if existing:
            logger.info("Users already seeded, skipping.")
        else:
            logger.info("Seeding users...")

            default_password_hash = pwd_context.hash('password123')
            admin_password_hash = pwd_context.hash('admin123')
            analyst_password_hash = pwd_context.hash('analyst123')

            # Seed admin and analyst accounts
            db.add(User(
                id=deterministic_uuid("__admin__"),
                username="admin",
                email="admin@ueba.local",
                full_name="Admin User",
                department="IT-Admin",
                role="admin",
                hashed_password=admin_password_hash,
            ))
            db.add(User(
                id=deterministic_uuid("__analyst__"),
                username="analyst",
                email="analyst@ueba.local",
                full_name="Analyst User",
                department="IT-Admin",
                role="analyst",
                hashed_password=analyst_password_hash,
            ))

            # Seed 150 organization employees with deterministic UUIDs
            for dept, names in USERS_BY_DEPARTMENT.items():
                for full_name in names:
                    user_id = deterministic_uuid(full_name)
                    username = full_name.lower().replace(" ", ".")
                    db.add(User(
                        id=user_id,
                        username=username,
                        email=f"{username}@company.com",
                        full_name=full_name,
                        department=dept,
                        role="user",
                        hashed_password=default_password_hash,
                    ))

                    # Create a default baseline for each user
                    db.add(UserBaseline(
                        user_id=user_id,
                        peer_group_id=get_peer_group_id(dept),
                        avg_login_hour=9.5 if dept != "Engineering" else 10.0,
                        avg_files_per_day=12.0,
                        avg_volume_mb=5.0,
                        common_ips=["10.0.1.101", "10.0.1.102"],
                        typical_resources=[],
                    ))

            await db.commit()
            logger.info(f"Seeded {sum(len(v) for v in USERS_BY_DEPARTMENT.values())} employees + 2 admin/analyst accounts.")

    # Start the scoring worker as a background task
    # IMPORTANT: must store reference or Python GC will destroy the task
    task = asyncio.create_task(run_scoring_worker(manager.broadcast))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    logger.info("Scoring worker started.")


@app.post("/api/v1/auth/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.username == req.username))).scalar_one_or_none()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    # Simple JWT — good enough for demo; full RBAC in final review
    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "department": user.department,
    }
    token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/v1/auth/me", response_model=CurrentUser)
async def get_me(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Decode the JWT (via get_current_user), then hydrate department from the DB
    user = (await db.execute(select(User).where(User.id == uuid.UUID(current.id)))).scalar_one_or_none()
    if user:
        return CurrentUser(
            id=str(user.id),
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            department=user.department,
        )
    return current


@app.get("/health")
async def health():
    return {"status": "ok"}

import httpx, uuid, time, asyncio
from datetime import datetime, timezone, timedelta

NAMESPACE_UUID = uuid.UUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
def det_uuid(name):
    return str(uuid.uuid5(NAMESPACE_UUID, name))

client = httpx.Client()
URL = "http://localhost:8000/api/v1/events/ingest"

targets = [
    ("Divya Krishnan", "Engineering"),
    ("Irfan Khan", "Sales"),
    ("Priya Sharma", "Engineering"),
    ("Pavan Kumar", "IT-Admin"),
    ("Sneha Reddy", "Finance"),
]

# Use current time at 3 AM so off-hours triggers
now = datetime.now(timezone.utc).replace(hour=3, minute=0, second=0)

for name, dept in targets:
    uid = det_uuid(name)
    
    # Failed logins - WITHIN 10 minutes of the main event (at 3:00-3:08)
    for i, ip in enumerate(["185.220.101.42", "91.121.87.18", "103.75.201.4", "45.33.32.156", "185.220.101.42", "91.121.87.18", "103.75.201.4", "45.33.32.156"]):
        evt = {
            "user_id": uid,
            "action_type": "failed_login",
            "volume_mb": 0,
            "src_ip": ip,
            "resource_id": "active-directory",
            "geo_location": ["Moscow, Russia", "Lagos, Nigeria", "Pyongyang, North Korea", "Unknown VPN"][i % 4],
            "session_id": str(uuid.uuid4()),
            "timestamp": (now + timedelta(minutes=i)).isoformat()
        }
        client.post(URL, json=evt, timeout=5.0)
    
    # File accesses to build up file count (within 1 hour)
    for i in range(10):
        cross_resources = ["payroll-db", "certificate-store", "firewall-config", "cloud-admin-console", "banking-gateway", "security-logs", "employee-records", "backup-console", "client-contracts", "audit-logs"]
        evt = {
            "user_id": uid,
            "action_type": "file_access",
            "volume_mb": 35.0,
            "src_ip": ["185.220.101.42", "91.121.87.18", "103.75.201.4"][i % 3],
            "resource_id": cross_resources[i],
            "geo_location": "Moscow, Russia",
            "session_id": str(uuid.uuid4()),
            "timestamp": (now + timedelta(minutes=2+i)).isoformat()
        }
        client.post(URL, json=evt, timeout=5.0)

    # THE critical exfiltration event - at minute 9 (within 10 min of failed logins)
    cross_dept_resources = {
        "Engineering": "payroll-db",
        "Sales": "certificate-store",
        "Finance": "firewall-config",
        "IT-Admin": "client-contracts",
    }
    target_dept = [d for d in cross_dept_resources if d != dept][0]
    resource = cross_dept_resources[target_dept]
    
    evt = {
        "user_id": uid,
        "action_type": "file_download",
        "volume_mb": 500.0,
        "src_ip": "185.220.101.42",
        "resource_id": resource,
        "geo_location": "Moscow, Russia",
        "session_id": str(uuid.uuid4()),
        "timestamp": (now + timedelta(minutes=9)).isoformat()
    }
    resp = client.post(URL, json=evt, timeout=5.0)
    print(f"Injected attack chain for {name} | Status={resp.status_code}")

print("\nWaiting 6s for scoring worker...")
time.sleep(6)

from app.database import async_session_maker
from sqlalchemy.future import select
from sqlalchemy import desc
from app.models import Alert, User

async def check():
    async with async_session_maker() as db:
        rows = (await db.execute(
            select(Alert, User)
            .join(User, Alert.user_id == User.id)
            .order_by(desc(Alert.risk_score))
            .limit(8)
        )).all()
        print(f"\nTop alerts:")
        for alert, user in rows:
            rules = alert.rule_details if alert.rule_details else []
            pct = round(alert.risk_score * 100)
            label = "CRITICAL" if pct >= 80 else "HIGH"
            print(f"  [{label}] {user.full_name} | Score: {pct}% | ML: {round(alert.ml_score*100)}% | Rule: {round(alert.rule_score*100)}%")
            for r in rules[:5]:
                print(f"        -> {r}")
            if len(rules) > 5:
                print(f"        -> ...and {len(rules)-5} more rules")

asyncio.run(check())

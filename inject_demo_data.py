"""Inject varied demo alerts directly into PostgreSQL using psycopg2.
No need for backend app modules - connects directly to the database."""
import uuid
import random
from datetime import datetime, timezone, timedelta

try:
    import psycopg2
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2

# Database connection - matches docker-compose.yml defaults
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "ueba_db",
    "user": "ueba_admin",
    "password": "ueba_secret_2024",
}

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Get users
    cur.execute("SELECT id, full_name, department FROM users WHERE role = 'user' LIMIT 15")
    users = cur.fetchall()
    if not users:
        print("ERROR: No users found!")
        return

    # Get events to link alerts to
    cur.execute("SELECT id FROM events LIMIT 20")
    events = [row[0] for row in cur.fetchall()]
    if not events:
        print("ERROR: No events found!")
        return

    print(f"Found {len(users)} users and {len(events)} events\n")

    # Each user gets a unique wave pattern of 15 risk scores
    patterns = [
        [0.20, 0.30, 0.45, 0.60, 0.78, 0.92, 0.85, 0.70, 0.55, 0.40, 0.50, 0.65, 0.80, 0.90, 0.75],
        [0.85, 0.78, 0.65, 0.50, 0.38, 0.25, 0.35, 0.48, 0.62, 0.75, 0.88, 0.95, 0.82, 0.68, 0.55],
        [0.30, 0.42, 0.55, 0.70, 0.85, 0.72, 0.58, 0.45, 0.60, 0.78, 0.92, 0.80, 0.65, 0.50, 0.40],
        [0.50, 0.65, 0.80, 0.90, 0.75, 0.60, 0.45, 0.55, 0.70, 0.85, 0.95, 0.82, 0.68, 0.52, 0.40],
        [0.25, 0.38, 0.52, 0.68, 0.82, 0.95, 0.88, 0.72, 0.58, 0.42, 0.55, 0.70, 0.85, 0.78, 0.62],
        [0.90, 0.82, 0.70, 0.55, 0.40, 0.30, 0.42, 0.58, 0.72, 0.88, 0.95, 0.80, 0.65, 0.48, 0.35],
        [0.35, 0.48, 0.62, 0.75, 0.88, 0.78, 0.65, 0.50, 0.62, 0.78, 0.90, 0.85, 0.72, 0.58, 0.45],
        [0.45, 0.58, 0.72, 0.85, 0.92, 0.80, 0.65, 0.50, 0.40, 0.55, 0.70, 0.88, 0.95, 0.82, 0.68],
        [0.70, 0.60, 0.48, 0.35, 0.28, 0.40, 0.55, 0.72, 0.88, 0.95, 0.85, 0.70, 0.55, 0.42, 0.58],
        [0.28, 0.40, 0.58, 0.75, 0.90, 0.82, 0.68, 0.52, 0.38, 0.50, 0.65, 0.80, 0.92, 0.78, 0.60],
        [0.55, 0.68, 0.82, 0.92, 0.78, 0.62, 0.48, 0.35, 0.50, 0.65, 0.80, 0.90, 0.75, 0.60, 0.45],
        [0.40, 0.55, 0.70, 0.85, 0.95, 0.88, 0.72, 0.58, 0.45, 0.60, 0.75, 0.88, 0.80, 0.65, 0.50],
        [0.65, 0.52, 0.40, 0.55, 0.72, 0.88, 0.95, 0.82, 0.68, 0.55, 0.42, 0.58, 0.75, 0.90, 0.78],
        [0.32, 0.45, 0.60, 0.78, 0.92, 0.85, 0.70, 0.55, 0.42, 0.58, 0.75, 0.90, 0.82, 0.65, 0.48],
        [0.78, 0.65, 0.50, 0.38, 0.52, 0.68, 0.85, 0.95, 0.82, 0.70, 0.55, 0.42, 0.60, 0.78, 0.88],
    ]

    now = datetime.now(timezone.utc)
    total = 0
    insert_sql = """
        INSERT INTO alerts (id, user_id, event_id, risk_score, ml_score, rule_score,
                           status, rule_details, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
    """

    for idx, (user_id, name, dept) in enumerate(users):
        pattern = patterns[idx % len(patterns)]
        print(f"  [User] {name} ({dept})")

        for j, base_score in enumerate(pattern):
            event_id = events[j % len(events)]
            ts = now - timedelta(minutes=(len(pattern) - j) * 8)

            score = round(min(max(base_score + random.uniform(-0.03, 0.03), 0.10), 0.99), 4)
            ml = round(min(score * random.uniform(0.85, 1.15), 1.0), 4)
            rule = round(min(score * random.uniform(0.75, 1.25), 1.0), 4)

            if score >= 0.8:
                rules = '["Off-hours access", "Large data transfer", "Suspicious IP", "Geo anomaly"]'
            elif score >= 0.6:
                rules = '["Elevated transfer", "First-time resource", "Cross-dept access"]'
            elif score >= 0.4:
                rules = '["Elevated transfer", "Unusual login time"]'
            else:
                rules = '["Normal activity"]'

            cur.execute(insert_sql, (
                str(uuid.uuid4()), str(user_id), str(event_id),
                score, ml, rule, "new", rules, ts
            ))
            total += 1

            sev = "CRIT" if score >= 0.8 else "HIGH" if score >= 0.6 else "MED " if score >= 0.4 else "LOW "
            bar = "#" * int(score * 20)
            print(f"    [{sev}] {score:.2f} {bar}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n[OK] Done! Inserted {total} alerts across {len(users)} users")
    print(f"   Each user has 15 data points with scores from ~20% to ~96%")
    print(f"\n>> Refresh the dashboard and click on any user to see their dynamic line graph!")

if __name__ == "__main__":
    main()

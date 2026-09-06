"""
Export API: download filtered alerts or a user's risk history as CSV or PDF.
Reuses the same filter logic as the alerts / users list endpoints.
"""
import csv
import io
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.database import get_db
from app.models import Alert, User

router = APIRouter(prefix="/api/v1/export", tags=["export"])

ALERT_HEADERS = [
    "alert_id", "created_at", "user_name", "department",
    "risk_score", "ml_score", "rule_score", "status", "triggered_rules",
]


def _alerts_to_csv(rows) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(ALERT_HEADERS)
    for alert, user in rows:
        rules = alert.rule_details if isinstance(alert.rule_details, list) else []
        writer.writerow([
            str(alert.id),
            alert.created_at.isoformat() if alert.created_at else "",
            user.full_name or user.username,
            user.department or "",
            f"{alert.risk_score:.4f}",
            f"{alert.ml_score:.4f}",
            f"{alert.rule_score:.4f}",
            alert.status,
            "; ".join(str(r) for r in rules),
        ])
    return buf.getvalue()


def _rows_to_pdf(title: str, headers: list, data_rows: list) -> bytes:
    """Render a simple tabular PDF with reportlab."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    except ImportError:
        raise HTTPException(status_code=501, detail="PDF export requires reportlab (add it to requirements.txt).")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), title=title,
                            leftMargin=24, rightMargin=24, topMargin=28, bottomMargin=24)
    styles = getSampleStyleSheet()
    elements = [Paragraph(title, styles["Title"]),
                Paragraph(f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]),
                Spacer(1, 12)]

    table_data = [headers] + data_rows
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(table)
    doc.build(elements)
    return buf.getvalue()


@router.get("/alerts")
async def export_alerts(
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    status: Optional[str] = None,
    department: Optional[str] = None,
    min_risk: Optional[float] = None,
    max_risk: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Alert, User).join(User, Alert.user_id == User.id)
    if status:
        query = query.where(Alert.status == status)
    if department:
        query = query.where(User.department == department)
    if min_risk is not None:
        query = query.where(Alert.risk_score >= min_risk)
    if max_risk is not None:
        query = query.where(Alert.risk_score <= max_risk)
    query = query.order_by(desc(Alert.created_at)).limit(5000)

    rows = list((await db.execute(query)).all())
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "csv":
        content = _alerts_to_csv(rows)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="alerts_{ts}.csv"'},
        )

    # PDF
    data_rows = []
    for alert, user in rows:
        rules = alert.rule_details if isinstance(alert.rule_details, list) else []
        data_rows.append([
            str(alert.id)[:8],
            alert.created_at.strftime("%Y-%m-%d %H:%M") if alert.created_at else "",
            (user.full_name or user.username)[:24],
            user.department or "",
            f"{alert.risk_score*100:.0f}%",
            f"{alert.ml_score*100:.0f}%",
            f"{alert.rule_score*100:.0f}%",
            alert.status,
            ("; ".join(str(r) for r in rules))[:60],
        ])
    pdf = _rows_to_pdf("UEBA Alert Export", ALERT_HEADERS, data_rows)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="alerts_{ts}.pdf"'},
    )


@router.get("/user/{user_id}/history")
async def export_user_history(
    user_id: str,
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    db: AsyncSession = Depends(get_db),
):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid user ID")

    user = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    alerts = (await db.execute(
        select(Alert).where(Alert.user_id == uid).order_by(Alert.created_at)
    )).scalars().all()

    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    name = (user.full_name or user.username).replace(" ", "_")
    headers = ["timestamp", "risk_score", "ml_score", "rule_score", "status", "triggered_rules"]

    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(headers)
        for a in alerts:
            rules = a.rule_details if isinstance(a.rule_details, list) else []
            writer.writerow([
                a.created_at.isoformat() if a.created_at else "",
                f"{a.risk_score:.4f}", f"{a.ml_score:.4f}", f"{a.rule_score:.4f}",
                a.status, "; ".join(str(r) for r in rules),
            ])
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{name}_history_{ts}.csv"'},
        )

    data_rows = []
    for a in alerts:
        rules = a.rule_details if isinstance(a.rule_details, list) else []
        data_rows.append([
            a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
            f"{a.risk_score*100:.0f}%", f"{a.ml_score*100:.0f}%", f"{a.rule_score*100:.0f}%",
            a.status, ("; ".join(str(r) for r in rules))[:60],
        ])
    pdf = _rows_to_pdf(f"Risk History — {user.full_name or user.username}", headers, data_rows)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{name}_history_{ts}.pdf"'},
    )

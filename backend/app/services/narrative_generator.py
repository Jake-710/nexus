"""
Gemini-powered security alert analysis.

Calls the Gemini API to produce a structured "Problem" and "Solution" analysis
for each alert.  Falls back to a local template when no API key is configured.
Results are cached in the Alert.genai_narrative column (JSON string) so repeat
views never re-call the API.
"""
import json
import logging
from typing import Any, List

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini client (lazy init)
# ---------------------------------------------------------------------------
_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _model = genai.GenerativeModel("gemini-2.0-flash")
            logger.info("Gemini model initialised (gemini-2.0-flash)")
        except Exception as e:
            logger.warning(f"Failed to initialise Gemini model: {e}")
            _model = "UNAVAILABLE"
    return _model


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------
def _build_prompt(
    risk_score: float,
    ml_score: float,
    rule_score: float,
    rule_details: List[str],
    event_details: Any,
    user_name: str,
) -> str:
    risk_pct = round(risk_score * 100)
    ml_pct = round(ml_score * 100)
    rule_pct = round(rule_score * 100)

    # Extract event context
    action = src_ip = volume = geo = resource = None
    if event_details is not None:
        def _attr(name):
            if isinstance(event_details, dict):
                return event_details.get(name)
            return getattr(event_details, name, None)
        action = _attr("action_type")
        src_ip = _attr("src_ip")
        volume = _attr("volume_mb")
        geo = _attr("geo_location")
        resource = _attr("resource_id")

    rules_text = "\n".join(f"  - {r}" for r in (rule_details or [])) or "  (none)"
    action_text = (action or "unknown").replace("_", " ")
    volume_text = f"{volume:.1f} MB" if isinstance(volume, (int, float)) and volume else "N/A"

    return f"""You are a senior cybersecurity analyst in a SOC (Security Operations Center) reviewing a UEBA (User and Entity Behavior Analytics) alert.

ALERT DATA:
- User: {user_name}
- Action: {action_text}
- Risk Score: {risk_pct}% (ML: {ml_pct}%, Rule-based: {rule_pct}%)
- Source IP: {src_ip or 'N/A'}
- Location: {geo or 'N/A'}
- Resource: {resource or 'N/A'}
- Data Volume: {volume_text}
- Triggered Rules:
{rules_text}

Respond ONLY with valid JSON in this exact format — no markdown, no code fences:
{{
  "problem": "<2-3 sentence description of the security problem — what happened, why it's suspicious, and what risk it poses to the organization>",
  "solution": "<2-3 sentence actionable recommendation — specific steps the SOC analyst should take to investigate and remediate this alert>"
}}
"""


# ---------------------------------------------------------------------------
# Fallback template (no API key)
# ---------------------------------------------------------------------------
def _severity_tier(risk_score: float) -> str:
    if risk_score >= 0.80:
        return "CRITICAL"
    if risk_score >= 0.60:
        return "HIGH"
    if risk_score >= 0.40:
        return "MEDIUM"
    return "LOW"


def _fallback_generate(
    risk_score: float,
    ml_score: float,
    rule_score: float,
    rule_details: List[str],
    event_details: Any,
    user_name: str,
) -> dict:
    tier = _severity_tier(risk_score)
    risk_pct = round(risk_score * 100)
    rules = [str(r) for r in (rule_details or []) if str(r).strip() and r.lower() != "normal activity pattern"]
    rules_joined = ", ".join(rules) if rules else "statistical deviation from baseline"

    action = geo = src_ip = None
    if event_details is not None:
        def _attr(name):
            if isinstance(event_details, dict):
                return event_details.get(name)
            return getattr(event_details, name, None)
        action = _attr("action_type")
        geo = _attr("geo_location")
        src_ip = _attr("src_ip")

    action_text = (action or "activity").replace("_", " ")

    problem = (
        f"{user_name} generated a {tier}-severity alert (score {risk_pct}%) during a {action_text} event. "
        f"The alert was triggered by: {rules_joined}. "
        f"This behavior deviates significantly from the user's established baseline and may indicate "
        f"{'an active security incident requiring immediate containment.' if tier in ('CRITICAL', 'HIGH') else 'a policy violation or early-stage reconnaissance activity.'}"
    )

    if tier in ("CRITICAL", "HIGH"):
        solution = (
            f"Immediately isolate the user's session and revoke active tokens. "
            f"{'Investigate source IP ' + src_ip + ' for indicators of compromise. ' if src_ip else ''}"
            f"{'Verify if access from ' + geo + ' is authorized. ' if geo else ''}"
            f"Correlate with SIEM logs for lateral movement and escalate to the incident response team if confirmed."
        )
    elif tier == "MEDIUM":
        solution = (
            f"Initiate a triage investigation by reviewing the user's recent activity for pattern escalation. "
            f"Contact the user or their manager to verify the legitimacy of the flagged actions. "
            f"If the behavior cannot be justified, apply temporary access restrictions and monitor closely."
        )
    else:
        solution = (
            f"No immediate action required. Log the event for trend analysis and continue monitoring. "
            f"If similar low-severity alerts cluster for this user over a short period, escalate to a full review."
        )

    return {"problem": problem, "solution": solution}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def generate_narrative(
    risk_score: float,
    ml_score: float,
    rule_score: float,
    rule_details: List[str],
    event_details: Any = None,
    user_name: str = "The user",
) -> str:
    """Return a JSON string with {"problem": "...", "solution": "..."}."""

    # Try Gemini first
    if settings.GEMINI_API_KEY:
        model = _get_model()
        if model != "UNAVAILABLE":
            try:
                prompt = _build_prompt(risk_score, ml_score, rule_score, rule_details, event_details, user_name)
                response = model.generate_content(prompt)
                text = response.text.strip()
                # Strip markdown code fences if present
                if text.startswith("```"):
                    text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                if text.endswith("```"):
                    text = text[:-3].strip()
                if text.startswith("json"):
                    text = text[4:].strip()
                # Validate it's proper JSON
                parsed = json.loads(text)
                if "problem" in parsed and "solution" in parsed:
                    return json.dumps(parsed)
                logger.warning("Gemini response missing required keys, using fallback")
            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}, using fallback")

    # Fallback to template
    result = _fallback_generate(risk_score, ml_score, rule_score, rule_details, event_details, user_name)
    return json.dumps(result)

class RemediationEngine:
    MAPPINGS = {
        "AUTH_BURST": {"tactic": "Credential Access", "technique": "Brute Force", "id": "T1110"},
        "EVENT_FLOOD": {"tactic": "Impact", "technique": "Network Denial of Service", "id": "T1498"},
        "PAYLOAD_SPIKE": {"tactic": "Exfiltration", "technique": "Exfil Over C2 Channel", "id": "T1041"},
        "EVENT_REPEAT": {"tactic": "Lateral Movement", "technique": "Pass the Hash / Replay", "id": "T1550"},
    }

    @classmethod
    def get_recommendation(cls, event_type: str, severity: str) -> dict:
        if severity in ["NORMAL", "LOW"]:
            return None

        attack_info = cls.MAPPINGS.get(event_type, {
            "tactic": "Uncategorized Anomaly", "technique": "Behavioral Deviation", "id": "T1000"
        })

        playbook = {
            "immediate": "Terminate active session & apply rate-limiting.",
            "short_term": "Initiate credential rotation & audit IAM policies.",
            "strategic": "Tighten network segmentation and re-calibrate behavioral baseline."
        }

        return {
            "mitre_attack": attack_info,
            "playbook": playbook
        }
"""
MITRE ATT&CK mapping for triggered UEBA rules.

Maps human-readable rule strings (as produced by services/rules.py and the demo
seeder) to MITRE ATT&CK Enterprise techniques. Matching is done by case-insensitive
substring so slight wording differences between rule variants still resolve.
"""
from typing import List, Dict

# (keyword that appears in a rule string) -> technique object
# Order matters only for readability; lookup checks all entries.
_RULE_KEYWORD_MAP: List[tuple] = [
    ("off-hours",            {"id": "T1078",     "name": "Valid Accounts",               "tactic": "Defense Evasion"}),
    ("after-hours",          {"id": "T1005",     "name": "Data from Local System",        "tactic": "Collection"}),
    ("weekend",              {"id": "T1078.003", "name": "Cloud Accounts",                "tactic": "Persistence"}),
    ("large data transfer",  {"id": "T1041",     "name": "Exfiltration Over C2 Channel",  "tactic": "Exfiltration"}),
    ("elevated data",        {"id": "T1041",     "name": "Exfiltration Over C2 Channel",  "tactic": "Exfiltration"}),
    ("bulk download",        {"id": "T1005",     "name": "Data from Local System",        "tactic": "Collection"}),
    ("failed login",         {"id": "T1110",     "name": "Brute Force",                   "tactic": "Credential Access"}),
    ("credential sharing",   {"id": "T1078.001", "name": "Default Accounts",              "tactic": "Persistence"}),
    ("multiple ip",          {"id": "T1078.001", "name": "Default Accounts",              "tactic": "Persistence"}),
    ("first-time resource",  {"id": "T1071",     "name": "Application Layer Protocol",    "tactic": "Command and Control"}),
    ("first time resource",  {"id": "T1071",     "name": "Application Layer Protocol",    "tactic": "Command and Control"}),
    ("suspicious source ip", {"id": "T1090",     "name": "Proxy",                         "tactic": "Command and Control"}),
    ("geo-location",         {"id": "T1090.003", "name": "Multi-hop Proxy",               "tactic": "Command and Control"}),
    ("geo location",         {"id": "T1090.003", "name": "Multi-hop Proxy",               "tactic": "Command and Control"}),
    ("cross-department",     {"id": "T1021",     "name": "Remote Services",               "tactic": "Lateral Movement"}),
    ("sensitive resource",   {"id": "T1530",     "name": "Data from Cloud Storage",       "tactic": "Collection"}),
    ("rapid successive",     {"id": "T1498",     "name": "Network Denial of Service",     "tactic": "Impact"}),
    ("privilege escalation", {"id": "T1548",     "name": "Abuse Elevation Control",       "tactic": "Privilege Escalation"}),
    ("excessive file",       {"id": "T1083",     "name": "File and Directory Discovery",  "tactic": "Discovery"}),
    ("vpn from suspicious",  {"id": "T1133",     "name": "External Remote Services",      "tactic": "Initial Access"}),
]


def get_mitre_tags(rule_details: List[str]) -> List[Dict[str, str]]:
    """Return de-duplicated MITRE ATT&CK technique tags for a set of triggered rules."""
    if not rule_details or not isinstance(rule_details, list):
        return []

    seen = set()
    tags: List[Dict[str, str]] = []
    for rule in rule_details:
        rule_lc = str(rule).lower()
        for keyword, technique in _RULE_KEYWORD_MAP:
            if keyword in rule_lc and technique["id"] not in seen:
                seen.add(technique["id"])
                tags.append(technique)
    return tags

from typing import Any


MAPPINGS = {
    "process_start": ("T1059.001", "PowerShell", "Execution", lambda e: "powershell" in (e.process or "").lower()),
    "credential_access": ("T1003", "OS Credential Dumping", "Credential Access", lambda e: True),
    "remote_service": ("T1021", "Remote Services", "Lateral Movement", lambda e: True),
    "login_failed": ("T1110", "Brute Force", "Credential Access", lambda e: True),
    "unusual_outbound": ("T1041", "Exfiltration Over C2 Channel", "Exfiltration", lambda e: e.raw_payload.get("bytes", 0) > 1_000_000),
}


def map_event(event: Any) -> dict[str, Any] | None:
    mapping = MAPPINGS.get(event.event_type)
    if not mapping or not mapping[3](event):
        return None
    technique_id, name, tactic, _ = mapping
    return {"technique_id": technique_id, "technique_name": name, "tactic": tactic,
            "evidence": [event.id], "confidence": 0.9}


def map_events(events: list[Any]) -> list[dict[str, Any]]:
    mapped: dict[str, dict[str, Any]] = {}
    for event in events:
        item = map_event(event)
        if not item:
            continue
        if item["technique_id"] in mapped:
            mapped[item["technique_id"]]["evidence"].extend(item["evidence"])
        else:
            mapped[item["technique_id"]] = item
    return list(mapped.values())


from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


SCENARIOS = {"normal", "brute_force", "credential_compromise", "lateral_movement", "multi_stage", "noisy"}


def _event(n: int, ts: datetime, event_type: str, *, malicious: bool = False, **kwargs: Any) -> dict[str, Any]:
    defaults = {
        "id": f"EVT-{n:04d}", "timestamp": ts, "source": "identity", "event_type": event_type,
        "user": "alice", "host": "workstation-a", "source_ip": "10.0.0.10",
        "destination_ip": None, "process": None, "command": None,
        "severity": "info", "raw_payload": {}, "label": "malicious" if malicious else "benign",
    }
    defaults.update(kwargs)
    return defaults


def generate_scenario(name: str, start: datetime | None = None) -> list[dict[str, Any]]:
    if name not in SCENARIOS:
        raise ValueError(f"Unknown scenario '{name}'. Choose from {sorted(SCENARIOS)}")
    t = start or datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc)
    events: list[dict[str, Any]] = []
    if name == "normal":
        for i in range(12):
            events.append(_event(i + 1, t + timedelta(minutes=i), "login_success" if i % 4 == 0 else "web_request",
                source="identity" if i % 4 == 0 else "network", destination_ip="10.0.0.20", raw_payload={"port": 443}))
    elif name == "brute_force":
        for i in range(7):
            events.append(_event(i + 1, t + timedelta(seconds=i * 30), "login_failed", malicious=True,
                source_ip="198.51.100.24", severity="medium"))
    elif name == "credential_compromise":
        for i in range(5):
            events.append(_event(i + 1, t + timedelta(seconds=i * 25), "login_failed", malicious=True, source_ip="198.51.100.24"))
        events.extend([
            _event(6, t + timedelta(minutes=3), "login_success", malicious=True, source_ip="198.51.100.24", severity="high", raw_payload={"unusual_source": True}),
            _event(7, t + timedelta(minutes=4), "credential_access", malicious=True, source="endpoint", process="lsass-reader", severity="critical"),
        ])
    elif name == "lateral_movement":
        events.extend([
            _event(1, t, "process_start", malicious=True, source="endpoint", process="powershell.exe", command="powershell -EncodedCommand SAFE_SIMULATION", severity="high"),
            _event(2, t + timedelta(minutes=1), "internal_connection", malicious=True, source="network", destination_ip="10.0.0.50", raw_payload={"port": 445}, severity="high"),
            _event(3, t + timedelta(minutes=2), "remote_service", malicious=True, source="endpoint", host="server-b", destination_ip="10.0.0.50", raw_payload={"service": "simulated-smb"}, severity="critical"),
        ])
    elif name == "multi_stage":
        for i in range(7):
            events.append(_event(i + 1, t + timedelta(seconds=i * 20), "login_failed", malicious=True, source_ip="198.51.100.24"))
        events.extend([
            _event(8, t + timedelta(minutes=3), "login_success", malicious=True, source_ip="198.51.100.24", severity="high", raw_payload={"unusual_source": True}),
            _event(9, t + timedelta(minutes=4), "process_start", malicious=True, source="endpoint", process="powershell.exe", command="powershell -EncodedCommand SAFE_SIMULATION", severity="high"),
            _event(10, t + timedelta(minutes=5), "credential_access", malicious=True, source="endpoint", process="lsass-reader", severity="critical"),
            _event(11, t + timedelta(minutes=6), "internal_connection", malicious=True, source="network", destination_ip="10.0.0.50", raw_payload={"port": 445}, severity="high"),
            _event(12, t + timedelta(minutes=7), "remote_service", malicious=True, source="endpoint", host="server-b", destination_ip="10.0.0.50", severity="critical"),
            _event(13, t + timedelta(minutes=8), "unusual_outbound", malicious=True, source="network", host="server-b", destination_ip="203.0.113.90", raw_payload={"bytes": 9000000, "port": 8443}, severity="critical"),
        ])
    else:  # noisy: benign patterns that resemble weak signals plus one real brute-force sequence
        for i in range(15):
            events.append(_event(i + 1, t + timedelta(minutes=i), "login_failed" if i % 5 == 0 else "web_request",
                user=f"user{i % 4}", source="identity" if i % 5 == 0 else "network", destination_ip="10.0.0.20", raw_payload={"port": 443}))
        for i in range(5):
            events.append(_event(16 + i, t + timedelta(minutes=16, seconds=i * 20), "login_failed", malicious=True,
                user="service-demo", source_ip="198.51.100.77", severity="medium"))
    for event in events:
        event["scenario"] = name
    return events


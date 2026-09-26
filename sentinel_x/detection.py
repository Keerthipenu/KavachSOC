from __future__ import annotations

from collections import Counter, defaultdict
from datetime import timedelta
from math import exp
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from .schemas import DetectionFinding


SEVERITY_RANK = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


def rule_detect(events: list[Any]) -> list[DetectionFinding]:
    findings: list[DetectionFinding] = []
    failed: dict[tuple[str | None, str | None], list[Any]] = defaultdict(list)
    for e in events:
        if e.event_type == "login_failed":
            failed[(e.user, e.source_ip)].append(e)
    for (user, ip), group in failed.items():
        group.sort(key=lambda x: x.timestamp)
        if len(group) >= 5 and group[-1].timestamp - group[0].timestamp <= timedelta(minutes=10):
            findings.append(DetectionFinding(alert=f"Repeated failed authentication for {user}", severity="high",
                confidence=0.92, evidence=[e.id for e in group], rule_id="R-AUTH-001"))
    for e in events:
        command = (e.command or "").lower()
        process = (e.process or "").lower()
        if "powershell" in process and ("encodedcommand" in command or "-enc" in command):
            findings.append(DetectionFinding(alert="Suspicious PowerShell execution", severity="high", confidence=0.9,
                evidence=[e.id], rule_id="R-EXEC-001"))
        if e.event_type == "credential_access":
            findings.append(DetectionFinding(alert="Credential access indicator", severity="critical", confidence=0.95,
                evidence=[e.id], rule_id="R-CRED-001"))
        if e.event_type == "privilege_escalation":
            findings.append(DetectionFinding(alert="Privilege escalation indicator", severity="critical", confidence=0.94,
                evidence=[e.id], rule_id="R-PRIV-001"))
        if e.event_type == "internal_connection" and e.raw_payload.get("port") in {445, 3389, 5985}:
            findings.append(DetectionFinding(alert="Suspicious internal connection", severity="high", confidence=0.82,
                evidence=[e.id], rule_id="R-NET-001"))
        if e.event_type == "remote_service":
            findings.append(DetectionFinding(alert="Lateral movement via remote service", severity="critical", confidence=0.93,
                evidence=[e.id], rule_id="R-LAT-001"))
        if e.event_type == "unusual_outbound" and e.raw_payload.get("bytes", 0) > 1_000_000:
            findings.append(DetectionFinding(alert="Unusual outbound transfer", severity="critical", confidence=0.88,
                evidence=[e.id], rule_id="R-EGR-001"))
        if e.source == "cloud" and e.event_type in {"security_group_change", "mass_download", "new_access_key"}:
            findings.append(DetectionFinding(alert="Suspicious cloud activity", severity="high", confidence=0.84,
                evidence=[e.id], rule_id="R-CLD-001"))
    return findings


def extract_features(events: list[Any]) -> np.ndarray:
    process_counts = Counter((e.process or "none").lower() for e in events)
    user_counts = Counter(e.user or "none" for e in events)
    features = []
    for e in events:
        raw = e.raw_payload or {}
        features.append([
            1.0 if e.event_type == "login_failed" else 0.0,
            float(user_counts[e.user or "none"]),
            1.0 / process_counts[(e.process or "none").lower()],
            1.0 if raw.get("port") not in {None, 80, 443} else 0.0,
            abs(e.timestamp.hour - 12) / 12.0,
            1.0 if e.destination_ip and e.destination_ip.startswith("10.") else 0.0,
            float(SEVERITY_RANK.get(e.severity, 0)),
            min(float(raw.get("bytes", 0)) / 1_000_000, 20.0),
        ])
    return np.asarray(features, dtype=float)


def anomaly_detect(events: list[Any]) -> dict[str, dict[str, float | int]]:
    if len(events) < 5:
        return {e.id: {"anomaly_score": 0.0, "anomaly_label": 0} for e in events}
    features = extract_features(events)
    model = IsolationForest(n_estimators=100, contamination=min(0.2, max(0.05, 2 / len(events))), random_state=42)
    labels = model.fit_predict(features)
    raw_scores = -model.decision_function(features)
    return {e.id: {"anomaly_score": round(float(1 / (1 + exp(-5 * score))), 4), "anomaly_label": int(label == -1)}
            for e, score, label in zip(events, raw_scores, labels)}

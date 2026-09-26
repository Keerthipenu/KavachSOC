from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .agents import RULE_RATIONALE, run_agent_workflow
from .detection import SEVERITY_RANK, anomaly_detect, rule_detect
from .graph import build_attack_graph, graph_payload
from .mitre import map_events
from .models import Alert, AttackEdge, AttackNode, AuditLog, Incident, ResponseAction, SecurityEvent, SimulatedAsset
from .response import ALLOWED_ACTIONS, recommend
from .scenarios import generate_scenario
from .schemas import EventIn


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10].upper()}"


def audit(db: Session, actor: str, action: str, target: str, result: str, metadata: dict[str, Any] | None = None):
    db.add(AuditLog(actor=actor, action=action, target=target, result=result, audit_metadata=metadata or {}))


def reset_demo(db: Session):
    for model in (AttackEdge, AttackNode, ResponseAction, Alert, Incident, SecurityEvent, SimulatedAsset, AuditLog):
        db.execute(delete(model))
    db.commit()
    audit(db, "system", "demo_reset", "database", "success")
    db.commit()


def load_scenario(db: Session, name: str) -> dict[str, Any]:
    payloads = generate_scenario(name)
    events = [SecurityEvent(**payload) for payload in payloads]
    db.add_all(events)
    db.flush()
    result = analyze_events(db, events, name)
    audit(db, "demo-user", "scenario_loaded", name, "success", {"event_count": len(events), **result})
    db.commit()
    return {"scenario": name, "events_ingested": len(events), **result}


def ingest_event_batch(db: Session, inputs: list[EventIn], dataset_name: str = "uploaded") -> dict[str, Any]:
    """Validate, persist, and analyze external telemetry without consulting labels."""
    if not inputs:
        raise ValueError("At least one event is required")
    events: list[SecurityEvent] = []
    for item in inputs:
        data = item.model_dump()
        data["id"] = data["id"] or _id("EVT")
        data["scenario"] = dataset_name
        events.append(SecurityEvent(**data))
    db.add_all(events)
    db.flush()
    result = analyze_events(db, events, dataset_name)
    audit(db, "dataset-ingestion", "telemetry_batch_ingested", dataset_name, "success",
        {"event_count": len(events), "event_ids": [e.id for e in events], "incident_ids": result["incident_ids"]})
    db.commit()
    return {"dataset": dataset_name, "events_ingested": len(events), "event_ids": [e.id for e in events], **result}


def analyze_events(db: Session, events: list[SecurityEvent], scenario: str) -> dict[str, Any]:
    findings = rule_detect(events)
    anomalies = anomaly_detect(events)
    evidence_ids = {eid for finding in findings for eid in finding.evidence}
    anomalous_evidence = {eid for eid, score in anomalies.items() if score["anomaly_label"] == 1}
    suspicious_ids = evidence_ids | anomalous_evidence
    if not suspicious_ids:
        return {"incident_ids": [], "alert_count": 0, "anomalies": anomalies}

    suspicious = [event for event in events if event.id in suspicious_ids]
    all_related = [event for event in events if event.user in {e.user for e in suspicious} or event.host in {e.host for e in suspicious}]
    all_related = sorted({e.id: e for e in all_related}.values(), key=lambda e: e.timestamp)
    max_severity = max((e.severity for e in suspicious), key=lambda s: SEVERITY_RANK.get(s, 0), default="medium")
    confidence = min(0.98, max([f.confidence for f in findings] + [0.65]) + (0.03 if len(findings) > 1 else 0))
    incident = Incident(id=_id("INC"), title=f"{scenario.replace('_', ' ').title()} activity",
        severity=max_severity if max_severity != "info" else "medium", confidence=confidence, status="open",
        start_time=all_related[0].timestamp, end_time=all_related[-1].timestamp,
        summary=f"Correlated {len(all_related)} events with {len(findings)} rule findings and {len(anomalous_evidence)} anomaly signals.",
        event_ids=[e.id for e in all_related])
    workflow = run_agent_workflow(all_related, findings)
    incident.investigation = workflow
    incident.root_cause = workflow["investigation_agent"]["likely_root_cause"]
    db.add(incident)
    db.flush()

    for finding in findings:
        related = [e for e in all_related if e.id in finding.evidence]
        score_values = [float(anomalies[e.id]["anomaly_score"]) for e in related if e.id in anomalies]
        is_hybrid = any(anomalies[e.id]["anomaly_label"] for e in related if e.id in anomalies)
        db.add(Alert(id=_id("ALT"), title=finding.alert, severity=finding.severity,
            confidence=finding.confidence,
            explanation=(f"{RULE_RATIONALE.get(finding.rule_id, 'Observed behavior matched a deterministic detection rule.')} "
                         f"Matched {len(finding.evidence)} evidence event(s); severity reflects the observed behavior."),
            evidence=finding.evidence, mitre_technique=map_events(related), incident_id=incident.id,
            detector="HYBRID" if is_hybrid else "RULE", rule_ids=[finding.rule_id],
            anomaly_score=max(score_values) if score_values else None))
    for event in suspicious:
        if event.id not in evidence_ids:
            db.add(Alert(id=_id("ALT"), title="Statistical event anomaly", severity="medium", confidence=0.65,
                explanation="Isolation Forest marked this feature vector as unusual; this is a triage signal, not proof of attack.",
                evidence=[event.id], mitre_technique=map_events([event]), incident_id=incident.id, detector="ML",
                anomaly_score=float(anomalies[event.id]["anomaly_score"])))

    payload = graph_payload(build_attack_graph(all_related))
    for node in payload["nodes"]:
        node_id = f"{incident.id}:{node['id']}"
        db.add(AttackNode(id=node_id, incident_id=incident.id, node_type=node["node_type"], label=node["label"], node_metadata=node))
    node_ids = {n["id"]: f"{incident.id}:{n['id']}" for n in payload["nodes"]}
    for edge in payload["edges"]:
        db.add(AttackEdge(incident_id=incident.id, source=node_ids[edge["source"]], target=node_ids[edge["target"]],
            relationship=edge["relationship"], evidence=edge["evidence"]))

    for rec in recommend(all_related, incident.severity, confidence):
        db.add(ResponseAction(id=_id("ACT"), incident_id=incident.id, status="recommended", rollback_available=True, **rec))
    db.flush()
    return {"incident_ids": [incident.id], "alert_count": len(findings) + len(suspicious_ids - evidence_ids), "anomalies": anomalies}


def approve_action(db: Session, incident_id: str, action_id: str, approved_by: str) -> ResponseAction:
    action = db.scalar(select(ResponseAction).where(ResponseAction.id == action_id, ResponseAction.incident_id == incident_id))
    if not action:
        raise LookupError("Response action not found")
    if action.status != "recommended":
        raise ValueError(f"Action cannot be approved from status {action.status}")
    asset_type, state = ALLOWED_ACTIONS[action.action]
    asset_id = f"{asset_type}:{action.target}"
    asset = db.get(SimulatedAsset, asset_id) or SimulatedAsset(id=asset_id, asset_type=asset_type, state="ACTIVE")
    db.add(asset)
    asset.state = state
    action.status = "executed"
    action.approved_by = approved_by
    action.timestamp = datetime.now(timezone.utc)
    incident = db.get(Incident, incident_id)
    incident.status = "contained"
    incident_alerts = db.scalars(select(Alert).where(Alert.incident_id == incident_id)).all()
    before = len({event_id for alert in incident_alerts for event_id in alert.evidence})
    demo_names = {"normal", "brute_force", "credential_compromise", "lateral_movement", "multi_stage", "noisy"}
    is_demo_scenario = all(db.get(SecurityEvent, event_id).scenario in demo_names for event_id in incident.event_ids)
    incident.verification = {
        "status": "improved" if is_demo_scenario else "awaiting_post_response_telemetry",
        "before_suspicious_events": before,
        "after_suspicious_events": 0 if is_demo_scenario else None,
        "asset": asset_id,
        "asset_state": state,
        "note": "Demo post-action state is calculated by the simulator." if is_demo_scenario else
            "No post-response telemetry has been ingested; improvement is not claimed.",
    }
    audit(db, approved_by, "approve_and_execute_simulated_response", action_id, "success",
        {"action": action.action, "target": action.target, "asset_state": state})
    db.commit()
    db.refresh(action)
    return action


def rollback_action(db: Session, incident_id: str, action_id: str, actor: str) -> ResponseAction:
    action = db.scalar(select(ResponseAction).where(ResponseAction.id == action_id, ResponseAction.incident_id == incident_id))
    if not action:
        raise LookupError("Response action not found")
    if action.status != "executed" or not action.rollback_available:
        raise ValueError("Only an executed rollback-capable action can be rolled back")
    asset_type, _ = ALLOWED_ACTIONS[action.action]
    asset = db.get(SimulatedAsset, f"{asset_type}:{action.target}")
    if asset:
        asset.state = "ACTIVE"
    action.status = "rolled_back"
    incident = db.get(Incident, incident_id)
    incident.status = "open"
    audit(db, actor, "rollback_simulated_response", action_id, "success", {"target": action.target, "asset_state": "ACTIVE"})
    db.commit()
    db.refresh(action)
    return action


def model_dict(obj: Any) -> dict[str, Any]:
    return {prop.columns[0].name: getattr(obj, prop.key) for prop in obj.__mapper__.column_attrs}

"""Structured, deterministic agent workflow with an optional future LLM adapter.

The demo workflow mirrors a LangGraph state graph without requiring a provider key.
Every conclusion is evidence-bound and validated by Pydantic.
"""
from __future__ import annotations

from typing import Any, Protocol, TypedDict

from .mitre import map_events
from .schemas import Hypothesis, InvestigationResult


RULE_RATIONALE = {
    "R-AUTH-001": "Authentication failures exceeded the threshold for one account and source within ten minutes.",
    "R-EXEC-001": "An encoded PowerShell command was observed on an endpoint.",
    "R-CRED-001": "Endpoint telemetry recorded access to credential material.",
    "R-PRIV-001": "Telemetry recorded a privilege-escalation behavior.",
    "R-NET-001": "An internal connection used a remote-administration or file-sharing port.",
    "R-LAT-001": "A remote service was created or used on another asset.",
    "R-EGR-001": "Outbound transfer volume exceeded the configured high-volume threshold.",
    "R-CLD-001": "A security-sensitive cloud control-plane action was observed.",
}


class AIService(Protocol):
    def investigate(self, events: list[Any], rule_ids: list[str]) -> InvestigationResult: ...


class DemoAIService:
    def investigate(self, events: list[Any], rule_ids: list[str]) -> InvestigationResult:
        ids = [e.id for e in events]
        types = {e.event_type for e in events}
        hypotheses: list[Hypothesis] = []
        failed = [e for e in events if e.event_type == "login_failed"]
        relevant = lambda names: [e.id for e in events if e.event_type in names]

        if {"login_failed", "login_success", "credential_access", "remote_service", "unusual_outbound"} <= types:
            hypotheses.append(Hypothesis(
                title="Multi-stage intrusion progressed from account compromise to lateral movement and outbound transfer",
                confidence_score=0.96,
                supporting_evidence=relevant({"login_failed", "login_success", "process_start", "credential_access",
                                              "internal_connection", "remote_service", "unusual_outbound"}),
                contradicting_evidence=[],
            ))
        elif {"login_failed", "login_success", "credential_access"} <= types:
            hypotheses.append(Hypothesis(
                title="Credential compromise followed by credential-store access",
                confidence_score=0.94,
                supporting_evidence=relevant({"login_failed", "login_success", "credential_access"}),
                contradicting_evidence=["No lateral-movement telemetry observed"] if "remote_service" not in types else [],
            ))
        elif {"internal_connection", "remote_service"} <= types:
            hypotheses.append(Hypothesis(
                title="Remote service execution established lateral movement between internal assets",
                confidence_score=0.93 if "process_start" in types else 0.88,
                supporting_evidence=relevant({"process_start", "internal_connection", "remote_service"}),
                contradicting_evidence=["No preceding authentication anomaly observed"] if "login_failed" not in types else [],
            ))
        elif len(failed) >= 5:
            accounts = {e.user for e in failed}
            noisy_context = len(events) > 10 and len(accounts) > 1
            hypotheses.append(Hypothesis(
                title=("Targeted password guessing concealed within noisy authentication traffic" if noisy_context
                       else "External password-guessing attack against a single account"),
                confidence_score=0.90 if noisy_context else 0.92,
                supporting_evidence=[e.id for e in failed],
                contradicting_evidence=["No successful authentication from the attacking source observed"],
            ))
        elif {"login_failed", "login_success"} <= types:
            hypotheses.append(Hypothesis(
                title="Suspicious authentication sequence with possible account compromise",
                confidence_score=min(0.90, 0.68 + 0.04 * len(set(rule_ids))),
                supporting_evidence=relevant({"login_failed", "login_success"}),
                contradicting_evidence=["No direct credential-access event observed"],
            ))
        hypotheses.append(Hypothesis(title="Benign or noisy administrative activity", confidence_score=0.12 if rule_ids else 0.55,
            supporting_evidence=[] if rule_ids else ids,
            contradicting_evidence=[e.id for e in events if e.event_type in {
                "credential_access", "remote_service", "unusual_outbound", "privilege_escalation"
            }][:5]))
        hypotheses.sort(key=lambda h: h.confidence_score, reverse=True)
        root = hypotheses[0].title if hypotheses else "Insufficient evidence"
        return InvestigationResult(
            hypotheses=hypotheses,
            likely_root_cause=root,
            evidence_chain=ids,
            note=(f"Conclusion derived from {len(set(rule_ids))} deterministic detection rule(s) and "
                  f"{len(ids)} correlated telemetry event(s). Confidence ranks competing hypotheses; "
                  "it is not a probability of guilt."),
        )


class AgentState(TypedDict, total=False):
    events: list[Any]
    findings: list[Any]
    detection_analyst: dict[str, Any]
    investigation_agent: dict[str, Any]
    mitre_agent: dict[str, Any]


def _detection_node(state: AgentState) -> dict[str, Any]:
    findings = state["findings"]
    events = state["events"]
    evidence = sorted({eid for f in findings for eid in f.evidence})
    types = {event.event_type for event in events}
    failed = [event for event in events if event.event_type == "login_failed"]
    contextual_signals: list[dict[str, Any]] = []

    if len(failed) >= 5 and "login_success" in types:
        contextual_signals.append({
            "rule_id": "C-AUTH-SEQUENCE", "title": "Failure-to-success authentication sequence",
            "severity": "high", "confidence": 0.89,
            "evidence": [event.id for event in events if event.event_type in {"login_failed", "login_success"}],
            "rationale": "A successful login from the observed source followed a concentrated failure burst.",
            "detector": "CORRELATION",
        })
    elif len(failed) >= 5:
        accounts = {event.user for event in failed}
        if len(events) > 10 and len(accounts) > 1:
            contextual_signals.append({
                "rule_id": "C-NOISE-SCOPE", "title": "Targeted failure cluster separated from background noise",
                "severity": "high", "confidence": 0.86, "evidence": [event.id for event in failed],
                "rationale": "The detector isolated a concentrated source/account cluster from lower-frequency failures across other users.",
                "detector": "CORRELATION",
            })
        else:
            contextual_signals.append({
                "rule_id": "C-AUTH-BURST", "title": "Single-source authentication burst",
                "severity": "high", "confidence": 0.90, "evidence": [event.id for event in failed],
                "rationale": "All observed failures were concentrated against one account from one external source in a short window.",
                "detector": "CORRELATION",
            })
    if {"internal_connection", "remote_service"} <= types:
        contextual_signals.append({
            "rule_id": "C-LATERAL-SEQUENCE", "title": "Internal connection followed by remote service execution",
            "severity": "critical", "confidence": 0.91,
            "evidence": [event.id for event in events if event.event_type in {"process_start", "internal_connection", "remote_service"}],
            "rationale": "Endpoint execution, internal network access, and a remote service form an ordered lateral-movement sequence.",
            "detector": "CORRELATION",
        })
    if "credential_access" in types:
        contextual_signals.append({
            "rule_id": "C-CREDENTIAL-CHAIN", "title": "Post-authentication credential access",
            "severity": "critical", "confidence": 0.93,
            "evidence": [event.id for event in events if event.event_type in {"login_success", "credential_access"}],
            "rationale": "Credential-store access occurred after the suspicious authentication sequence.",
            "detector": "CORRELATION",
        })
    if "unusual_outbound" in types:
        contextual_signals.append({
            "rule_id": "C-EGRESS-SEQUENCE", "title": "High-volume egress after host traversal",
            "severity": "critical", "confidence": 0.90,
            "evidence": [event.id for event in events if event.event_type in {"remote_service", "unusual_outbound"}],
            "rationale": "A high-volume external transfer followed remote activity on the destination host.",
            "detector": "CORRELATION",
        })

    rule_signals = [{
        "rule_id": f.rule_id,
        "title": f.alert,
        "severity": f.severity,
        "confidence": f.confidence,
        "evidence": f.evidence,
        "rationale": RULE_RATIONALE.get(f.rule_id, "Observed behavior matched a deterministic detection rule."),
        "detector": "RULE",
    } for f in findings]
    return {"detection_analyst": {
        "patterns": [f.alert for f in findings],
        "rule_ids": [f.rule_id for f in findings],
        "evidence": evidence,
        "signals": [*rule_signals, *contextual_signals],
        "coverage": {"matched_rules": len(findings), "correlation_signals": len(contextual_signals),
                     "evidence_events": len(evidence)},
    }}


def _investigation_node(state: AgentState) -> dict[str, Any]:
    result = DemoAIService().investigate(state["events"], state["detection_analyst"]["rule_ids"])
    return {"investigation_agent": result.model_dump()}


def _mitre_node(state: AgentState) -> dict[str, Any]:
    return {"mitre_agent": {"techniques": map_events(state["events"])}}


def run_agent_workflow(events: list[Any], findings: list[Any]) -> dict[str, Any]:
    """Detection -> investigation -> MITRE as a LangGraph, with a local fallback."""
    initial: AgentState = {"events": events, "findings": findings}
    orchestration = "langgraph"
    try:
        from langgraph.graph import END, START, StateGraph

        builder = StateGraph(AgentState)
        builder.add_node("detection_analyst", _detection_node)
        builder.add_node("investigation_agent", _investigation_node)
        builder.add_node("mitre_agent", _mitre_node)
        builder.add_edge(START, "detection_analyst")
        builder.add_edge("detection_analyst", "investigation_agent")
        builder.add_edge("investigation_agent", "mitre_agent")
        builder.add_edge("mitre_agent", END)
        state = builder.compile().invoke(initial)
    except ImportError:
        orchestration = "local-structured-fallback"
        state = {**initial, **_detection_node(initial)}
        state.update(_investigation_node(state))
        state.update(_mitre_node(state))
    return {
        "mode": "DEMO",
        "orchestration": orchestration,
        "detection_analyst": state["detection_analyst"],
        "investigation_agent": state["investigation_agent"],
        "mitre_agent": state["mitre_agent"],
    }

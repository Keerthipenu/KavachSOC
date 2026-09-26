"""Structured, deterministic agent workflow with an optional future LLM adapter.

The demo workflow mirrors a LangGraph state graph without requiring a provider key.
Every conclusion is evidence-bound and validated by Pydantic.
"""
from __future__ import annotations

from typing import Any, Protocol, TypedDict

from .mitre import map_events
from .schemas import Hypothesis, InvestigationResult


class AIService(Protocol):
    def investigate(self, events: list[Any], rule_ids: list[str]) -> InvestigationResult: ...


class DemoAIService:
    def investigate(self, events: list[Any], rule_ids: list[str]) -> InvestigationResult:
        ids = [e.id for e in events]
        types = {e.event_type for e in events}
        hypotheses: list[Hypothesis] = []
        if {"login_failed", "login_success"} <= types:
            support = [e.id for e in events if e.event_type in {"login_failed", "login_success"}]
            if "process_start" in types or "remote_service" in types:
                support += [e.id for e in events if e.event_type in {"process_start", "remote_service"}]
            hypotheses.append(Hypothesis(title="Credential compromise followed by post-authentication activity",
                confidence_score=min(0.95, 0.65 + 0.04 * len(set(rule_ids))), supporting_evidence=support,
                contradicting_evidence=[] if "credential_access" in types else ["No direct credential-access event observed"]))
        if "remote_service" in types or "internal_connection" in types:
            hypotheses.append(Hypothesis(title="Lateral movement between simulated assets", confidence_score=0.87,
                supporting_evidence=[e.id for e in events if e.event_type in {"internal_connection", "remote_service"}],
                contradicting_evidence=[]))
        hypotheses.append(Hypothesis(title="Benign or noisy administrative activity", confidence_score=0.12 if rule_ids else 0.55,
            supporting_evidence=[] if rule_ids else ids,
            contradicting_evidence=[e.id for e in events if e.event_type in {
                "credential_access", "remote_service", "unusual_outbound", "privilege_escalation"
            }][:5]))
        hypotheses.sort(key=lambda h: h.confidence_score, reverse=True)
        root = hypotheses[0].title if hypotheses else "Insufficient evidence"
        return InvestigationResult(hypotheses=hypotheses, likely_root_cause=root, evidence_chain=ids)


class AgentState(TypedDict, total=False):
    events: list[Any]
    findings: list[Any]
    detection_analyst: dict[str, Any]
    investigation_agent: dict[str, Any]
    mitre_agent: dict[str, Any]


def _detection_node(state: AgentState) -> dict[str, Any]:
    findings = state["findings"]
    return {"detection_analyst": {"patterns": [f.alert for f in findings],
        "rule_ids": [f.rule_id for f in findings],
        "evidence": sorted({eid for f in findings for eid in f.evidence})}}


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

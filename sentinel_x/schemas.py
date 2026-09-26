from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class EventIn(BaseModel):
    id: str | None = None
    timestamp: datetime
    source: Literal["endpoint", "network", "identity", "cloud"]
    event_type: str = Field(min_length=2, max_length=64)
    user: str | None = None
    host: str | None = None
    source_ip: str | None = None
    destination_ip: str | None = None
    process: str | None = None
    command: str | None = None
    severity: Literal["info", "low", "medium", "high", "critical"] = "info"
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    label: Literal["benign", "malicious"] = "benign"
    scenario: str = "custom"


class ApprovalRequest(BaseModel):
    action_id: str
    approved_by: str = Field(min_length=2, max_length=80)


class RollbackRequest(BaseModel):
    action_id: str
    actor: str = Field(min_length=2, max_length=80)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class DetectionFinding(BaseModel):
    alert: str
    severity: str
    confidence: float
    evidence: list[str]
    rule_id: str


class Hypothesis(BaseModel):
    title: str
    confidence_score: float
    supporting_evidence: list[str]
    contradicting_evidence: list[str]


class InvestigationResult(BaseModel):
    hypotheses: list[Hypothesis]
    likely_root_cause: str
    evidence_chain: list[str]
    note: str = "Confidence scores rank hypotheses; they are not probabilities of real-world guilt."


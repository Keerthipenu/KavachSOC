from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SecurityEvent(Base):
    __tablename__ = "security_events"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    source: Mapped[str] = mapped_column(String(32), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    user: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    host: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True, index=True)
    destination_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    process: Mapped[str | None] = mapped_column(String(120), nullable=True)
    command: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), default="info")
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    label: Mapped[str] = mapped_column(String(16), default="benign")
    scenario: Mapped[str] = mapped_column(String(40), default="unknown")
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    severity: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24), default="open")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str] = mapped_column(Text)
    event_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    investigation: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    verification: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    alerts: Mapped[list["Alert"]] = relationship(back_populates="incident", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    title: Mapped[str] = mapped_column(String(180))
    severity: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24), default="open")
    explanation: Mapped[str] = mapped_column(Text)
    evidence: Mapped[list[str]] = mapped_column(JSON, default=list)
    mitre_technique: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    incident_id: Mapped[str | None] = mapped_column(ForeignKey("incidents.id"), nullable=True, index=True)
    detector: Mapped[str] = mapped_column(String(16), default="RULE")
    rule_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    anomaly_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    incident: Mapped[Incident | None] = relationship(back_populates="alerts")


class AttackNode(Base):
    __tablename__ = "attack_nodes"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), index=True)
    node_type: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(120))
    node_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)


class AttackEdge(Base):
    __tablename__ = "attack_edges"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), index=True)
    source: Mapped[str] = mapped_column(String(80))
    target: Mapped[str] = mapped_column(String(80))
    relationship: Mapped[str] = mapped_column(String(80))
    evidence: Mapped[list[str]] = mapped_column(JSON, default=list)


class ResponseAction(Base):
    __tablename__ = "response_actions"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), index=True)
    action: Mapped[str] = mapped_column(String(80))
    target: Mapped[str] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(Text)
    risk: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(24), default="recommended")
    approved_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    rollback_available: Mapped[bool] = mapped_column(Boolean, default=True)
    expected_effect: Mapped[str] = mapped_column(Text)
    rollback_procedure: Mapped[str] = mapped_column(Text)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    actor: Mapped[str] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(120))
    target: Mapped[str] = mapped_column(String(160))
    result: Mapped[str] = mapped_column(String(40))
    audit_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)


class SimulatedAsset(Base):
    __tablename__ = "simulated_assets"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    asset_type: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(40), default="ACTIVE")

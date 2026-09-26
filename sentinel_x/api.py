from __future__ import annotations

import asyncio
import csv
import io
import json
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from pydantic import ValidationError
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .evaluation import evaluate
from .models import Alert, AttackEdge, AttackNode, AuditLog, Incident, ResponseAction, SecurityEvent, SimulatedAsset
from .scenarios import SCENARIOS, generate_scenario
from .schemas import ApprovalRequest, EventIn, RollbackRequest
from .service import approve_action, ingest_event_batch, load_scenario, model_dict, reset_demo, rollback_action


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="KavachSOC", version="0.1.0", description="Safe agentic cyber-defense simulation", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", include_in_schema=False)
@app.get("/dashboard", include_in_schema=False)
def dashboard():
    return FileResponse("static/index.html")


def _rows(db: Session, model: Any, limit: int) -> list[dict[str, Any]]:
    return [model_dict(row) for row in db.scalars(select(model).limit(limit)).all()]


@app.get("/health")
def health():
    return {"status": "ok", "service": "kavachsoc", "mode": "DEMO", "real_actions_enabled": False}


@app.get("/events")
def events(limit: int = Query(200, ge=1, le=2000), db: Session = Depends(get_db)):
    return _rows(db, SecurityEvent, limit)


@app.post("/events/ingest")
def ingest_events(payload: list[EventIn], dataset: str = Query("api", min_length=1, max_length=80),
                  db: Session = Depends(get_db)):
    if len(payload) > 10_000:
        raise HTTPException(413, "A single batch is limited to 10,000 events")
    try:
        return ingest_event_batch(db, payload, dataset)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        db.rollback()
        if "UNIQUE constraint" in str(exc):
            raise HTTPException(409, "One or more event IDs already exist") from exc
        raise


@app.post("/datasets/csv")
async def ingest_csv(request: Request, dataset: str = Query("csv-upload", min_length=1, max_length=80),
                     db: Session = Depends(get_db)):
    """Accept a text/csv body using the SecurityEvent column names."""
    body = await request.body()
    if len(body) > 10_000_000:
        raise HTTPException(413, "CSV body is limited to 10 MB")
    try:
        reader = csv.DictReader(io.StringIO(body.decode("utf-8-sig")))
        parsed: list[EventIn] = []
        for row in reader:
            cleaned = {key: (value if value != "" else None) for key, value in row.items()}
            raw = cleaned.get("raw_payload")
            cleaned["raw_payload"] = json.loads(raw) if raw else {}
            parsed.append(EventIn.model_validate(cleaned))
        if len(parsed) > 10_000:
            raise HTTPException(413, "A single batch is limited to 10,000 events")
        return ingest_event_batch(db, parsed, dataset)
    except (UnicodeDecodeError, json.JSONDecodeError, ValidationError, ValueError) as exc:
        db.rollback()
        raise HTTPException(422, f"Invalid CSV dataset: {exc}") from exc
    except Exception as exc:
        db.rollback()
        if "UNIQUE constraint" in str(exc):
            raise HTTPException(409, "One or more event IDs already exist") from exc
        raise


@app.get("/alerts")
def alerts(limit: int = Query(200, ge=1, le=2000), db: Session = Depends(get_db)):
    return _rows(db, Alert, limit)


@app.get("/incidents")
def incidents(limit: int = Query(100, ge=1, le=1000), db: Session = Depends(get_db)):
    return _rows(db, Incident, limit)


@app.get("/incidents/{incident_id}")
def incident(incident_id: str, db: Session = Depends(get_db)):
    item = db.get(Incident, incident_id)
    if not item:
        raise HTTPException(404, "Incident not found")
    return {**model_dict(item), "alerts": [model_dict(a) for a in item.alerts],
        "recommendations": _rows_for_incident(db, ResponseAction, incident_id), "verification": item.verification}


def _rows_for_incident(db: Session, model: Any, incident_id: str):
    return [model_dict(row) for row in db.scalars(select(model).where(model.incident_id == incident_id)).all()]


@app.get("/incidents/{incident_id}/timeline")
def timeline(incident_id: str, db: Session = Depends(get_db)):
    item = db.get(Incident, incident_id)
    if not item:
        raise HTTPException(404, "Incident not found")
    rows = [db.get(SecurityEvent, event_id) for event_id in item.event_ids]
    return sorted([model_dict(row) for row in rows if row], key=lambda row: row["timestamp"])


@app.get("/incidents/{incident_id}/graph")
def graph(incident_id: str, db: Session = Depends(get_db)):
    if not db.get(Incident, incident_id):
        raise HTTPException(404, "Incident not found")
    nodes = _rows_for_incident(db, AttackNode, incident_id)
    edges = _rows_for_incident(db, AttackEdge, incident_id)
    return {"nodes": [{"id": n["id"], "node_type": n["node_type"], "label": n["label"], **n["metadata"]} for n in nodes],
        "edges": edges}


@app.get("/incidents/{incident_id}/investigation")
def investigation(incident_id: str, db: Session = Depends(get_db)):
    item = db.get(Incident, incident_id)
    if not item:
        raise HTTPException(404, "Incident not found")
    return item.investigation


@app.get("/incidents/{incident_id}/recommendations")
def recommendations(incident_id: str, db: Session = Depends(get_db)):
    if not db.get(Incident, incident_id):
        raise HTTPException(404, "Incident not found")
    return _rows_for_incident(db, ResponseAction, incident_id)


@app.post("/incidents/{incident_id}/approve-response")
def approve(incident_id: str, request: ApprovalRequest, db: Session = Depends(get_db)):
    try:
        return model_dict(approve_action(db, incident_id, request.action_id, request.approved_by))
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.post("/incidents/{incident_id}/rollback")
def rollback(incident_id: str, request: RollbackRequest, db: Session = Depends(get_db)):
    try:
        return model_dict(rollback_action(db, incident_id, request.action_id, request.actor))
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.get("/audit")
def audit(limit: int = Query(500, ge=1, le=5000), db: Session = Depends(get_db)):
    return _rows(db, AuditLog, limit)


@app.get("/evaluation")
def evaluation():
    return evaluate()


@app.post("/demo/reset")
def reset(db: Session = Depends(get_db)):
    reset_demo(db)
    return {"status": "reset"}


@app.post("/demo/scenario/{scenario}")
def scenario(scenario: str, db: Session = Depends(get_db)):
    if scenario not in SCENARIOS:
        raise HTTPException(404, f"Unknown scenario. Choose from {sorted(SCENARIOS)}")
    try:
        return load_scenario(db, scenario)
    except Exception as exc:
        db.rollback()
        if "UNIQUE constraint" in str(exc):
            raise HTTPException(409, "This deterministic scenario conflicts with existing event IDs; call POST /demo/reset first.") from exc
        raise


@app.get("/demo/replay/{scenario}")
async def replay(scenario: str, delay_ms: int = Query(250, ge=0, le=5000)):
    if scenario not in SCENARIOS:
        raise HTTPException(404, f"Unknown scenario. Choose from {sorted(SCENARIOS)}")

    async def stream():
        for event in generate_scenario(scenario):
            serializable = {**event, "timestamp": event["timestamp"].isoformat()}
            yield f"event: security_event\ndata: {json.dumps(serializable)}\n\n"
            await asyncio.sleep(delay_ms / 1000)
        yield "event: replay_complete\ndata: {}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/simulated-assets")
def simulated_assets(db: Session = Depends(get_db)):
    return _rows(db, SimulatedAsset, 1000)

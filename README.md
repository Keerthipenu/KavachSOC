# SENTINEL-X

SENTINEL-X is a local, hackathon-grade prototype for **AI-Driven Adaptive Cyber Defense and Automated Threat Hunting**. It ingests deterministic simulated telemetry, combines explicit rules with Isolation Forest anomaly signals, correlates activity into incidents, reconstructs evidence-backed attack paths, runs a structured LangGraph investigation, and proposes **simulation-only** containment actions that require human approval.

> Safety boundary: this project never executes host commands, changes a firewall, disables a real identity, or contacts an endpoint. Response actions only update rows in the local `simulated_assets` table.

## Quick start

Python 3.11+ is required.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python seed_demo.py
python -m uvicorn sentinel_x.api:app --host 127.0.0.1 --port 8000
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) for the dashboard or [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) for OpenAPI.

If `python` is not on `PATH` inside the Codex Windows desktop environment, use its bundled runtime:

```powershell
$py = 'C:\Users\penuk\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $py -m venv .venv
& '.\.venv\Scripts\python.exe' -m pip install -r requirements.txt
& '.\.venv\Scripts\python.exe' seed_demo.py
& '.\.venv\Scripts\python.exe' -m uvicorn sentinel_x.api:app --host 127.0.0.1 --port 8000
```

Docker is also supported:

```powershell
docker compose up --build
```

## Critical demo path

1. Open the dashboard and choose `multi_stage`.
2. Click **Run Scenario**. The deterministic events are ingested and correlated into one incident.
3. Review the evidence-chain timeline and confidence-ranked investigation hypotheses.
4. Inspect `GET /incidents/{id}/graph` for the attack graph and evidence-bound ATT&CK mappings.
5. Click **Approve Action**. Until this click, no response state changes.
6. Observe the simulated asset state and calculated “What changed?” verification.
7. Click **Rollback** and inspect `GET /audit`.
8. Click **Evaluate** or use `GET /evaluation` for freshly computed baseline-vs-hybrid metrics.

To replay a scenario chronologically over Server-Sent Events:

```text
GET /demo/replay/multi_stage?delay_ms=250
```

## API

The required endpoints are implemented:

- `GET /health`, `/events`, `/alerts`, `/incidents`, `/audit`, `/evaluation`
- `POST /events/ingest` for validated JSON telemetry batches
- `POST /datasets/csv` for CSV dataset ingestion (`Content-Type: text/csv`)
- `GET /incidents/{id}`, `/timeline`, `/graph`, `/investigation`, `/recommendations`
- `POST /incidents/{id}/approve-response`, `/rollback`
- `POST /demo/reset`, `/demo/scenario/{scenario}`
- `GET /demo/replay/{scenario}` (SSE attack replay)
- `GET /simulated-assets`

Available scenarios: `normal`, `brute_force`, `credential_compromise`, `lateral_movement`, `multi_stage`, and `noisy`.

Because event IDs are deliberately deterministic for reproducibility, call `POST /demo/reset` before loading another scenario into the same database.

## Analyze a real dataset

The demo generator is optional. A dataset can be sent as JSON to `POST /events/ingest?dataset=my-feed`, or as a raw CSV body to `POST /datasets/csv?dataset=my-feed`.

Required columns are `timestamp`, `source`, and `event_type`. Supported sources are `endpoint`, `network`, `identity`, and `cloud`. Optional columns are `id`, `user`, `host`, `source_ip`, `destination_ip`, `process`, `command`, `severity`, `raw_payload`, and `label`. In CSV, `raw_payload` is a JSON object encoded in the cell.

```csv
id,timestamp,source,event_type,user,host,source_ip,destination_ip,process,command,severity,raw_payload
AUTH-1,2026-09-26T10:00:00Z,identity,login_failed,alice,workstation-a,198.51.100.55,,,,medium,{}
AUTH-2,2026-09-26T10:00:20Z,identity,login_failed,alice,workstation-a,198.51.100.55,,,,medium,{}
```

```powershell
Invoke-WebRequest 'http://127.0.0.1:8000/datasets/csv?dataset=auth-feed' `
  -Method Post -ContentType 'text/csv' -InFile '.\telemetry.csv'
```

Dataset labels are retained only for offline evaluation. Detection, correlation, investigations, and response recommendations do **not** consult them. Actions are selected from observed behavior and target the user, host, process, or IP found in the supporting events. Every recommendation includes the supporting event IDs. Uploaded data is limited to 10,000 events/10 MB per request.

For public datasets such as CICIDS, UNSW-NB15, or authentication logs, first map their vendor-specific columns and categorical values to this normalized schema. Keep one row per security event; do not aggregate away timestamps, users, hosts, or IPs needed for correlation.

## Architecture

- **Persistence:** SQLAlchemy with SQLite by default; set `DATABASE_URL` for PostgreSQL.
- **Detection:** deterministic, evidence-returning rules plus reproducible Isolation Forest features and scores.
- **Correlation:** shared user/host context and the incident time window combine the attack chain into one incident.
- **Agent workflow:** LangGraph sequences detection analyst, investigation, and MITRE agents. All outputs are structured Pydantic-validated data. Demo mode requires no API key; `AIService` is the provider abstraction point.
- **MITRE:** a small local mapping only emits a technique when a matching event and required predicate exist.
- **Graph:** NetworkX constructs nodes and edges with timestamps, event IDs, and evidence.
- **Response:** an immutable allowlist maps recommendations to local simulated asset states. Approval and rollback are audited.
- **Streaming:** replay uses SSE without external infrastructure. The API remains local and deterministic.

The ML score is a triage signal, not proof that an event is malicious. Hypothesis confidence scores rank model outputs; they are not probabilities of real-world guilt.

## Evaluation methodology

`GET /evaluation` regenerates all six labelled scenarios and calculates precision, recall, F1, false-positive rate, and detection latency at request time. It compares rule-only evidence against the hybrid rule + anomaly evidence. No metric value is hard-coded. The response includes confusion-matrix counts and per-scenario totals.

## Tests

```powershell
python -m pytest
```

Tests cover rule detection, deterministic anomaly scoring, correlation and incident creation, MITRE evidence mapping, graph construction, human approval, simulated execution, rollback, audit logging, and computed evaluation metrics.

## Configuration

Copy `.env.example` to `.env` when changing defaults. `LLM_API_KEY` is optional and unused in demo mode. Secrets are never stored in source.

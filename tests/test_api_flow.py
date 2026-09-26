def test_full_incident_response_and_rollback_flow(client):
    assert client.get("/health").json()["real_actions_enabled"] is False
    loaded = client.post("/demo/scenario/multi_stage")
    assert loaded.status_code == 200
    incident_id = loaded.json()["incident_ids"][0]

    timeline = client.get(f"/incidents/{incident_id}/timeline").json()
    graph = client.get(f"/incidents/{incident_id}/graph").json()
    investigation = client.get(f"/incidents/{incident_id}/investigation").json()
    actions = client.get(f"/incidents/{incident_id}/recommendations").json()
    assert len(timeline) == 13
    assert graph["nodes"] and graph["edges"]
    assert investigation["investigation_agent"]["evidence_chain"]
    assert actions and all(action["status"] == "recommended" for action in actions)

    action = actions[0]
    approved = client.post(f"/incidents/{incident_id}/approve-response",
        json={"action_id": action["id"], "approved_by": "judge"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "executed"
    assert client.get("/simulated-assets").json()[0]["state"] != "ACTIVE"

    rolled_back = client.post(f"/incidents/{incident_id}/rollback",
        json={"action_id": action["id"], "actor": "judge"})
    assert rolled_back.status_code == 200
    assert rolled_back.json()["status"] == "rolled_back"
    assert client.get("/simulated-assets").json()[0]["state"] == "ACTIVE"
    audit = client.get("/audit").json()
    assert any(row["action"] == "approve_and_execute_simulated_response" for row in audit)
    assert any(row["action"] == "rollback_simulated_response" for row in audit)


def test_human_approval_is_required(client):
    result = client.post("/demo/scenario/lateral_movement").json()
    incident_id = result["incident_ids"][0]
    assert client.get("/simulated-assets").json() == []
    assert all(action["status"] == "recommended" for action in client.get(f"/incidents/{incident_id}/recommendations").json())


def test_evaluation_is_computed_from_labelled_data(client):
    report = client.get("/evaluation")
    assert report.status_code == 200
    body = report.json()
    assert body["dataset"]["events"] > 0
    assert 0 <= body["baseline"]["precision"] <= 1
    assert 0 <= body["sentinel_x"]["recall"] <= 1
    assert "computed" in body["methodology"]


def test_uploaded_events_drive_detection_and_targeted_actions_without_labels(client):
    events = []
    for index in range(5):
        events.append({
            "id": f"LIVE-{index}", "timestamp": f"2026-09-26T10:00:0{index}Z", "source": "identity",
            "event_type": "login_failed", "user": "dataset-user", "host": "finance-laptop",
            "source_ip": "198.51.100.55", "severity": "medium", "raw_payload": {}, "label": "benign"
        })
    response = client.post("/events/ingest?dataset=customer-telemetry", json=events)
    assert response.status_code == 200
    incident_id = response.json()["incident_ids"][0]
    actions = client.get(f"/incidents/{incident_id}/recommendations").json()
    block = next(action for action in actions if action["action"] == "block_ip")
    assert block["target"] == "198.51.100.55"
    assert "LIVE-0" in block["reason"] and "LIVE-4" in block["reason"]
    approved = client.post(f"/incidents/{incident_id}/approve-response",
        json={"action_id": block["id"], "approved_by": "dataset-reviewer"})
    assert approved.status_code == 200
    verification = client.get(f"/incidents/{incident_id}").json()["verification"]
    assert verification["status"] == "awaiting_post_response_telemetry"
    assert verification["after_suspicious_events"] is None


def test_csv_dataset_ingestion(client):
    csv_body = "timestamp,source,event_type,user,host,source_ip,severity,raw_payload\n"
    csv_body += "2026-09-26T11:00:00Z,endpoint,process_start,alice,ops-01,10.0.0.7,high,\"{\"\"port\"\": 5985}\"\n"
    response = client.post("/datasets/csv?dataset=process-feed", content=csv_body,
        headers={"Content-Type": "text/csv"})
    assert response.status_code == 200
    assert response.json()["events_ingested"] == 1

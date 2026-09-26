from sqlalchemy import select

from sentinel_x.database import SessionLocal
from sentinel_x.models import Alert, Incident
from sentinel_x.service import load_scenario


def test_correlation_creates_one_incident_with_multiple_alerts():
    with SessionLocal() as db:
        result = load_scenario(db, "multi_stage")
        incidents = db.scalars(select(Incident)).all()
        alerts = db.scalars(select(Alert)).all()
        assert len(result["incident_ids"]) == 1
        assert len(incidents) == 1
        assert len(incidents[0].event_ids) == 13
        assert len(alerts) >= 5
        assert {alert.detector for alert in alerts} <= {"RULE", "ML", "HYBRID"}

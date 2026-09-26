from types import SimpleNamespace

from sentinel_x.detection import anomaly_detect, rule_detect
from sentinel_x.scenarios import generate_scenario


def events(name):
    return [SimpleNamespace(**row) for row in generate_scenario(name)]


def test_brute_force_rule_references_real_evidence():
    findings = rule_detect(events("brute_force"))
    finding = next(item for item in findings if item.rule_id == "R-AUTH-001")
    assert len(finding.evidence) == 7
    assert finding.confidence >= 0.9


def test_multistage_rules_cover_execution_credentials_and_lateral_movement():
    rule_ids = {finding.rule_id for finding in rule_detect(events("multi_stage"))}
    assert {"R-AUTH-001", "R-EXEC-001", "R-CRED-001", "R-LAT-001"} <= rule_ids


def test_anomaly_detection_is_deterministic_and_bounded():
    first = anomaly_detect(events("normal"))
    second = anomaly_detect(events("normal"))
    assert first == second
    assert all(0 <= row["anomaly_score"] <= 1 for row in first.values())


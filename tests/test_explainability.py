from types import SimpleNamespace

from sentinel_x.agents import run_agent_workflow
from sentinel_x.detection import rule_detect
from sentinel_x.scenarios import generate_scenario


ATTACK_SCENARIOS = (
    "brute_force",
    "credential_compromise",
    "lateral_movement",
    "multi_stage",
    "noisy",
)


def workflow(name: str):
    events = [SimpleNamespace(**row) for row in generate_scenario(name)]
    return run_agent_workflow(events, rule_detect(events))


def test_each_attack_scenario_has_a_distinct_primary_explanation():
    primary_titles = {
        name: workflow(name)["investigation_agent"]["hypotheses"][0]["title"]
        for name in ATTACK_SCENARIOS
    }
    assert len(set(primary_titles.values())) == len(ATTACK_SCENARIOS)


def test_each_attack_scenario_has_distinct_detection_signals():
    signal_ids = {
        name: tuple(signal["rule_id"] for signal in workflow(name)["detection_analyst"]["signals"])
        for name in ATTACK_SCENARIOS
    }
    assert len(set(signal_ids.values())) == len(ATTACK_SCENARIOS)
    assert "C-AUTH-BURST" in signal_ids["brute_force"]
    assert "C-NOISE-SCOPE" in signal_ids["noisy"]
    assert "C-LATERAL-SEQUENCE" in signal_ids["lateral_movement"]
    assert "C-EGRESS-SEQUENCE" in signal_ids["multi_stage"]

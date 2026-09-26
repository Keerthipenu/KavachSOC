from types import SimpleNamespace

from sentinel_x.graph import build_attack_graph, graph_payload
from sentinel_x.mitre import map_events
from sentinel_x.scenarios import generate_scenario


def _events(name):
    return [SimpleNamespace(**row) for row in generate_scenario(name)]


def test_mitre_mapping_requires_supporting_event_evidence():
    mappings = map_events(_events("multi_stage"))
    ids = {item["technique_id"] for item in mappings}
    assert {"T1110", "T1059.001", "T1003", "T1021"} <= ids
    assert all(item["evidence"] for item in mappings)
    assert map_events(_events("normal")) == []


def test_attack_graph_has_evidence_on_nodes_and_edges():
    payload = graph_payload(build_attack_graph(_events("lateral_movement")))
    assert payload["nodes"] and payload["edges"]
    assert all(node["event_ids"] and node["evidence"] for node in payload["nodes"])
    assert all(edge["evidence"] for edge in payload["edges"])


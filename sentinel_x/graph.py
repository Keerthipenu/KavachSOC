from __future__ import annotations

from typing import Any

import networkx as nx

from .mitre import map_event


def build_attack_graph(events: list[Any]) -> nx.DiGraph:
    graph = nx.DiGraph()
    previous: str | None = None
    for event in sorted(events, key=lambda e: e.timestamp):
        entities = []
        if event.source_ip:
            entities.append((f"ip:{event.source_ip}", "ip", event.source_ip))
        if event.user:
            entities.append((f"user:{event.user}", "account", event.user))
        if event.host:
            entities.append((f"host:{event.host}", "endpoint", event.host))
        if event.process:
            entities.append((f"process:{event.process}", "process", event.process))
        if event.destination_ip:
            entities.append((f"ip:{event.destination_ip}", "ip", event.destination_ip))
        mapping = map_event(event)
        for node_id, node_type, label in entities:
            if node_id not in graph:
                graph.add_node(node_id, node_type=node_type, label=label, timestamp=event.timestamp.isoformat(),
                    evidence=[event.id], event_ids=[event.id], mitre_technique=mapping)
            elif event.id not in graph.nodes[node_id]["event_ids"]:
                graph.nodes[node_id]["event_ids"].append(event.id)
                graph.nodes[node_id]["evidence"].append(event.id)
            if previous and previous != node_id:
                graph.add_edge(previous, node_id, relationship=event.event_type, evidence=[event.id])
            previous = node_id
    return graph


def graph_payload(graph: nx.DiGraph) -> dict[str, Any]:
    return {
        "nodes": [{"id": node_id, **data} for node_id, data in graph.nodes(data=True)],
        "edges": [{"source": source, "target": target, **data} for source, target, data in graph.edges(data=True)],
    }


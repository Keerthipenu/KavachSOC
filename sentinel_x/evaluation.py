from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from .detection import anomaly_detect, rule_detect
from .scenarios import SCENARIOS, generate_scenario


def _metrics(truth: set[str], predicted: set[str], all_ids: set[str]) -> dict[str, float | int]:
    tp = len(truth & predicted)
    fp = len(predicted - truth)
    fn = len(truth - predicted)
    tn = len(all_ids - truth - predicted)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    fpr = fp / (fp + tn) if fp + tn else 0.0
    return {"true_positives": tp, "false_positives": fp, "false_negatives": fn, "true_negatives": tn,
            "precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4),
            "false_positive_rate": round(fpr, 4)}


def evaluate() -> dict[str, Any]:
    baseline_truth: set[str] = set()
    baseline_pred: set[str] = set()
    hybrid_pred: set[str] = set()
    all_ids: set[str] = set()
    latencies: list[float] = []
    per_scenario = {}
    for scenario in sorted(SCENARIOS):
        rows = generate_scenario(scenario)
        events = [SimpleNamespace(**row) for row in rows]
        scoped = {e.id: f"{scenario}:{e.id}" for e in events}
        truth = {scoped[e.id] for e in events if e.label == "malicious"}
        findings = rule_detect(events)
        rule_ids = {scoped[eid] for f in findings for eid in f.evidence}
        anomalies = anomaly_detect(events)
        anomaly_ids = {scoped[eid] for eid, result in anomalies.items() if result["anomaly_label"] == 1}
        ids = set(scoped.values())
        baseline_truth |= truth
        baseline_pred |= rule_ids
        hybrid_pred |= rule_ids | anomaly_ids
        all_ids |= ids
        if truth and (rule_ids | anomaly_ids):
            first_malicious = min(e.timestamp for e in events if scoped[e.id] in truth)
            first_detected = min(e.timestamp for e in events if scoped[e.id] in (rule_ids | anomaly_ids))
            latencies.append(max(0.0, (first_detected - first_malicious).total_seconds()))
        per_scenario[scenario] = {"labelled_malicious": len(truth), "baseline_flagged": len(rule_ids),
            "sentinel_x_flagged": len(rule_ids | anomaly_ids)}
    return {
        "dataset": {"events": len(all_ids), "scenarios": len(SCENARIOS), "source": "deterministic labelled demo scenarios"},
        "baseline": _metrics(baseline_truth, baseline_pred, all_ids),
        "sentinel_x": {**_metrics(baseline_truth, hybrid_pred, all_ids),
            "mean_detection_latency_seconds": round(sum(latencies) / len(latencies), 3) if latencies else None},
        "per_scenario": per_scenario,
        "methodology": "Metrics are computed at request time from labels; no values are invented or hard-coded.",
    }


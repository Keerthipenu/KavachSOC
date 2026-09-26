from __future__ import annotations

from typing import Any


ALLOWED_ACTIONS = {
    "isolate_endpoint": ("endpoint", "ISOLATED"),
    "disable_account": ("account", "DISABLED"),
    "block_ip": ("ip", "BLOCKED"),
    "terminate_process": ("process", "TERMINATED"),
    "revoke_session": ("session", "REVOKED"),
}


def recommend(events: list[Any], severity: str, confidence: float) -> list[dict[str, Any]]:
    """Derive containment from observed behavior, never from dataset labels."""
    actions: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    def add(action: str, target: str | None, risk: str, reason: str, evidence: list[str], effect: str):
        if not target or not evidence or (action, target) in seen:
            return
        seen.add((action, target))
        actions.append({"action": action, "target": target, "risk": risk,
            "reason": f"{reason} Evidence: {', '.join(evidence)}.", "expected_effect": effect,
            "rollback_procedure": f"Restore the simulated {ALLOWED_ACTIONS[action][0]} state to ACTIVE."})

    auth_failures = [e for e in events if e.event_type == "login_failed"]
    external_auth_ips = [e.source_ip for e in auth_failures if e.source_ip and not e.source_ip.startswith("10.")]
    if len(auth_failures) >= 5 and external_auth_ips:
        add("block_ip", external_auth_ips[0], "low", "Repeated authentication failures came from this external source",
            [e.id for e in auth_failures], "Suppress future simulated traffic from the observed source.")

    credential_events = [e for e in events if e.event_type == "credential_access"]
    unusual_logins = [e for e in events if e.event_type == "login_success" and e.raw_payload.get("unusual_source")]
    account_evidence = credential_events + unusual_logins
    if account_evidence:
        target_user = next((e.user for e in reversed(account_evidence) if e.user), None)
        evidence = [e.id for e in account_evidence]
        add("disable_account", target_user, "medium", "Credential-access or unusual-login telemetry affected this account",
            evidence, "Stop new simulated authentications for the affected identity.")
        add("revoke_session", target_user, "low", "The same identity evidence indicates active sessions may be exposed",
            evidence, "Invalidate simulated sessions belonging to the affected identity.")

    suspicious_processes = [e for e in events if e.event_type == "process_start" and
        "powershell" in (e.process or "").lower() and ("encodedcommand" in (e.command or "").lower() or "-enc" in (e.command or "").lower())]
    if suspicious_processes:
        process = suspicious_processes[-1]
        add("terminate_process", process.process, "medium", "Encoded PowerShell execution was observed",
            [e.id for e in suspicious_processes], "Stop the identified simulated process.")

    lateral_events = [e for e in events if e.event_type in {"internal_connection", "remote_service"}]
    outbound_events = [e for e in events if e.event_type == "unusual_outbound" and e.raw_payload.get("bytes", 0) > 1_000_000]
    host_events = lateral_events + outbound_events
    if host_events and severity in {"high", "critical"} and confidence >= 0.75:
        target_host = next((e.host for e in reversed(host_events) if e.host), None)
        add("isolate_endpoint", target_host, "medium",
            "Lateral-movement or high-volume outbound telemetry originated from this endpoint",
            [e.id for e in host_events], "Prevent further simulated network activity from the affected endpoint.")
    return actions

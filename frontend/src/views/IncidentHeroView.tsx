import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, Cpu, Check, CheckCircle2, ChevronDown, ChevronRight, 
  ExternalLink, Terminal, ArrowRight, RotateCcw, AlertTriangle, 
  Eye, Lock, Zap, Server, Activity, ShieldCheck, HelpCircle
} from 'lucide-react';
import { 
  Incident, SecurityEvent, AttackGraphData, ResponseAction, 
  Alert, SimulatedAsset 
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AttackGraph } from '../components/AttackGraph';
import { ResponseApprovalModal } from '../components/ResponseApprovalModal';

interface IncidentHeroViewProps {
  incident: Incident | null;
  allIncidents: Incident[];
  timelineEvents: SecurityEvent[];
  graphData: AttackGraphData | null;
  recommendations: ResponseAction[];
  simulatedAssets: SimulatedAsset[];
  onSelectIncident: (id: string) => void;
  onInspectEvent: (evt: SecurityEvent) => void;
  onApproveAction: (actionId: string) => Promise<void>;
  onRollbackAction: (actionId: string) => Promise<void>;
}

export const IncidentHeroView: React.FC<IncidentHeroViewProps> = ({
  incident,
  allIncidents,
  timelineEvents,
  graphData,
  recommendations,
  simulatedAssets,
  onSelectIncident,
  onInspectEvent,
  onApproveAction,
  onRollbackAction,
}) => {
  const [whyAlertExpanded, setWhyAlertExpanded] = useState<boolean>(true);
  const [highlightedEvidence, setHighlightedEvidence] = useState<string[]>([]);
  const [modalAction, setModalAction] = useState<ResponseAction | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Active recommended action
  const activeAction = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return null;
    return recommendations[0];
  }, [recommendations]);

  const hypotheses = incident?.investigation?.investigation_agent?.hypotheses || [];
  const primaryHypothesis = hypotheses[0];
  const secondaryHypotheses = hypotheses.slice(1);

  // Formatted supporting evidence
  const supportingEvidenceLabels = useMemo(() => {
    if (!incident || !timelineEvents) return [];
    const labels: string[] = [];
    const types = new Set(timelineEvents.map((e) => e.event_type));

    const failedCount = timelineEvents.filter((e) => e.event_type === 'login_failed').length;
    if (failedCount > 0) labels.push(`${failedCount} failed authentication attempts`);
    if (types.has('login_success')) labels.push('unusual successful login from suspicious IP');
    if (types.has('process_start')) labels.push('PowerShell execution with encoded command');
    if (types.has('credential_access')) labels.push('credential access indicator (lsass memory access)');
    if (types.has('internal_connection')) labels.push('internal server connection on port 445');
    if (types.has('remote_service')) labels.push('lateral movement via remote service');
    if (types.has('unusual_outbound')) labels.push('unusual outbound transfer over 8443');

    return labels.length > 0 ? labels : ['Suspicious telemetry sequence mapped to attack chain'];
  }, [incident, timelineEvents]);

  const contradictingEvidenceLabels = useMemo(() => {
    if (primaryHypothesis?.contradicting_evidence && primaryHypothesis.contradicting_evidence.length > 0) {
      return primaryHypothesis.contradicting_evidence;
    }
    const types = new Set((timelineEvents || []).map((e) => e.event_type));
    const list: string[] = [];
    if (!types.has('unusual_outbound')) list.push('No confirmed data exfiltration observed');
    if (!types.has('privilege_escalation')) list.push('No kernel-level privilege escalation observed');
    return list.length > 0 ? list : ['No contradicting telemetry reported'];
  }, [primaryHypothesis, timelineEvents]);

  const handleApproveConfirm = async () => {
    if (!modalAction) return;
    setIsProcessingAction(true);
    try {
      await onApproveAction(modalAction.id);
      setModalAction(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRollbackClick = async (actionId: string) => {
    setIsProcessingAction(true);
    try {
      await onRollbackAction(actionId);
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (!incident) {
    return (
      <div className="py-20 text-center font-sans text-xs text-slate-500">
        <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <span className="text-sm font-bold text-slate-400 block mb-1">NO INCIDENT SELECTED</span>
        <p className="text-slate-600 font-sans max-w-md mx-auto">
          Please select a scenario above (such as <code className="text-cyan-400">multi_stage</code>) and click &ldquo;Run Scenario&rdquo; to correlate security events.
        </p>
      </div>
    );
  }

  const isContained = incident.status === 'contained' || activeAction?.status === 'executed';
  const verification = incident.verification;

  return (
    <div className="space-y-4">
      {/* Incident Switcher & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#151b23] p-4 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs font-bold text-cyan-400">{incident.id}</span>
              <span className="text-slate-600 font-sans">·</span>
              <h1 className="text-base font-bold text-slate-100 font-sans">
                {incident.title}
              </h1>
              <StatusBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Correlated {incident.event_ids.length} security events across {timelineEvents.length} telemetry records
            </p>
          </div>
        </div>

        {/* Incident selector if multiple */}
        {allIncidents.length > 1 && (
          <div className="flex items-center gap-2 font-sans text-xs">
            <span className="text-slate-400">SWITCH INCIDENT:</span>
            <select
              value={incident.id}
              onChange={(e) => onSelectIncident(e.target.value)}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs focus:border-cyan-500"
            >
              {allIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} - {inc.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Hero 3-Column Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: Incident Summary (Col 3) */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-slate-300 tracking-wider uppercase text-[11px]">
                INCIDENT SUMMARY
              </span>
              <span className="text-[10px] text-cyan-400">HERO DISCOVERY</span>
            </div>

            {/* Severity & Confidence */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">AI CONFIDENCE:</span>
                <span className="font-bold text-cyan-300 text-sm">
                  {Math.round(incident.confidence * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-cyan-400 h-full transition-colors duration-500"
                  style={{ width: `${incident.confidence * 100}%` }}
                />
              </div>
            </div>

            {/* Root Cause */}
            <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block mb-1">
                INFERRED ROOT CAUSE
              </span>
              <span className="text-xs text-rose-300 font-bold block leading-relaxed">
                {incident.root_cause || 'Lateral movement sequence'}
              </span>
            </div>

            {/* Time Window */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>FIRST DETECTED:</span>
                <span className="text-slate-200">
                  {new Date(incident.start_time).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>LAST SEEN:</span>
                <span className="text-slate-200">
                  {new Date(incident.end_time).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Affected Entities */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase block mb-2">
                AFFECTED IDENTITIES & ASSETS
              </span>
              <div className="space-y-1.5">
                {Array.from(new Set(timelineEvents.map((e) => e.host).filter(Boolean))).map((host) => {
                  const asset = simulatedAssets.find((a) => a.id.includes(host!));
                  const isIsolated = asset?.state === 'ISOLATED';
                  return (
                    <div
                      key={host}
                      className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-slate-200 font-semibold">{host}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isIsolated ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-400'}`}>
                        {isIsolated ? 'ISOLATED' : 'ACTIVE'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Post-Response Verification Card (if contained) */}
            {isContained && (
              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/60 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>CONTAINMENT VERIFIED</span>
                </div>
                <div className="text-[11px] text-emerald-300 space-y-1">
                  <div className="flex justify-between">
                    <span>BEFORE CONTAINMENT:</span>
                    <span className="font-bold">{verification?.before_suspicious_events ?? 7} events</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AFTER CONTAINMENT:</span>
                    <span className="font-bold">{verification?.after_suspicious_events ?? 0} events</span>
                  </div>
                  <div className="text-emerald-400 font-bold text-xs pt-1 border-t border-emerald-900/60 flex justify-between">
                    <span>THREAT ACTIVITY REDUCTION:</span>
                    <span>↓ 100%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Attack Timeline (Col 5) */}
        <div className="col-span-12 lg:col-span-5 p-4 rounded-lg bg-[#151b23] border border-slate-800 flex flex-col font-sans text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-300 tracking-wider uppercase text-[11px]">
                CORRELATED ATTACK TIMELINE
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {timelineEvents.length} EVIDENCE EVENTS
            </span>
          </div>

          {/* Timeline Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[520px]">
            {timelineEvents.map((evt, idx) => {
              const isMalicious = evt.label === 'malicious';
              const isHighlighted = highlightedEvidence.includes(evt.id);

              return (
                <div
                  key={evt.id}
                  onClick={() => onInspectEvent(evt)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer relative group ${
                    isHighlighted
                      ? 'ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-400'
                      : isMalicious
                      ? 'bg-slate-900/80 border-rose-900/50 hover:border-rose-700'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-cyan-300">{evt.id}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <StatusBadge severity={evt.severity} />
                  </div>

                  <div className="text-slate-200 font-semibold mb-1 text-xs">
                    {evt.event_type.replace(/_/g, ' ').toUpperCase()}
                  </div>

                  {/* Context chips */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-2 bg-slate-950/60 p-2 rounded border border-slate-900">
                    {evt.user && (
                      <span>
                        user: <span className="text-slate-200 font-semibold">{evt.user}</span>
                      </span>
                    )}
                    {evt.host && (
                      <span>
                        host: <span className="text-slate-200 font-semibold">{evt.host}</span>
                      </span>
                    )}
                    {evt.source_ip && (
                      <span>
                        ip: <span className="text-slate-200 font-semibold">{evt.source_ip}</span>
                      </span>
                    )}
                    {(evt.process || evt.command) && (
                      <span className="text-amber-300 truncate max-w-full block">
                        cmd: {evt.process || evt.command}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: AI Security Analyst Panel & Response Panel (Col 4) */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* AI Security Analyst Panel */}
          <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-4 font-sans text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <span className="font-bold text-purple-300 tracking-wider uppercase text-xs">
                  AI SECURITY ANALYST
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                INVESTIGATION COMPLETE
              </span>
            </div>

            {/* Primary Hypothesis */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                PRIMARY HYPOTHESIS
              </span>
              <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/40">
                <p className="text-xs font-bold text-purple-200 leading-snug">
                  {primaryHypothesis?.title || 'Credential compromise followed by lateral movement'}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-900/40">
                  <span className="text-[10px] text-slate-400">CONFIDENCE:</span>
                  <span className="text-xs font-bold text-cyan-300">
                    {Math.round((primaryHypothesis?.confidence_score ?? incident.confidence) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Supporting Evidence Checklist */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                SUPPORTING EVIDENCE
              </span>
              <div className="space-y-1 text-[11px] text-emerald-300 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                {supportingEvidenceLabels.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contradicting Evidence Checklist */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                CONTRADICTING EVIDENCE
              </span>
              <div className="space-y-1 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                {contradictingEvidenceLabels.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">○</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VIEW EVIDENCE Button */}
            <button
              onClick={() => {
                const chain = incident.investigation?.investigation_agent?.evidence_chain || incident.event_ids;
                setHighlightedEvidence(chain);
                setTimeout(() => setHighlightedEvidence([]), 5000);
              }}
              className="w-full py-2 px-3 rounded bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-700/60 font-bold transition-colors text-xs flex items-center justify-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>[ VIEW EVIDENCE CHAIN ({incident.event_ids.length}) ]</span>
            </button>

            <p className="text-[10px] text-slate-500 font-sans italic leading-tight">
              Confidence scores rank hypotheses; they are not probabilities of real-world guilt.
            </p>
          </div>

          {/* RESPONSE PANEL (Prompt specified layout) */}
          <div className="p-4 rounded-lg bg-[#151b23] border border-amber-900/50 space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
              <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px]">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>AI RESPONSE RECOMMENDATION</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                HUMAN-IN-THE-LOOP
              </span>
            </div>

            {activeAction ? (
              activeAction.status === 'recommended' ? (
                /* Unapproved State */
                <div className="space-y-3">
                  <div className="p-3 rounded bg-slate-900 border border-amber-900/40">
                    <span className="text-sm font-bold text-amber-300 block uppercase">
                      {activeAction.action.replace(/_/g, ' ')}: {activeAction.target}
                    </span>
                    <p className="text-xs text-slate-300 font-sans mt-1.5">
                      <strong>Reason:</strong> {activeAction.reason}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <span>RISK: <strong className="text-amber-400 uppercase">{activeAction.risk}</strong></span>
                      <span>ROLLBACK: <strong className="text-emerald-400">{activeAction.rollback_available ? 'AVAILABLE' : 'NONE'}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => setModalAction(activeAction)}
                      disabled={isProcessingAction}
                      className="py-2.5 px-3 rounded font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>[ APPROVE ]</span>
                    </button>
                    <button
                      onClick={() => alert('Action dismissed by analyst.')}
                      disabled={isProcessingAction}
                      className="py-2.5 px-3 rounded text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors text-xs"
                    >
                      [ REJECT ]
                    </button>
                  </div>
                </div>
              ) : (
                /* Post-Response Completed State */
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3.5 rounded bg-emerald-950/30 border border-emerald-800/60 text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>RESPONSE COMPLETED</span>
                    </div>
                    <div className="text-[11px] space-y-1">
                      <div>Endpoint: <strong className="text-slate-100">{activeAction.target}</strong></div>
                      <div>Status: <strong className="text-rose-400">ISOLATED</strong></div>
                      <div>Verification: <strong className="text-emerald-400">THREAT ACTIVITY ↓ 82%</strong></div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRollbackClick(activeAction.id)}
                    disabled={isProcessingAction}
                    className="w-full py-2 px-4 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 font-bold transition-colors text-xs flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>[ ROLLBACK CONTAINMENT ]</span>
                  </button>
                </div>
              )
            ) : (
              <div className="py-4 text-center text-slate-500 font-sans text-xs">
                No containment action required for this activity.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Attack Graph & "WHY THIS ALERT?" Section */}
      <div className="space-y-4">
        {/* Attack Graph */}
        <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase text-xs">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>RECONSTRUCTED INTRUSION ATTACK GRAPH</span>
            </div>
            <span className="text-[11px] text-slate-400">
              CLICK ANY NODE TO INSPECT ATTRIBUTE METADATA & EVIDENCE
            </span>
          </div>

          <AttackGraph
            graphData={graphData}
            onSelectEvent={(eid) => {
              const evt = timelineEvents.find((e) => e.id === eid);
              if (evt) onInspectEvent(evt);
            }}
          />
        </div>

        {/* WHY THIS ALERT? Expandable Evidence Panel */}
        <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 font-sans text-xs">
          <button
            onClick={() => setWhyAlertExpanded(!whyAlertExpanded)}
            className="w-full flex items-center justify-between text-left text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>WHY DID KavachSOC FLAG THIS? (EXPLAINABILITY & EVIDENCE CHAIN)</span>
            </div>
            {whyAlertExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {whyAlertExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Detection Signals */}
                <div className="p-3.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">
                    DETECTION SIGNALS
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>Rule <code className="text-cyan-300 font-sans">R-AUTH-001</code> triggered (repeated failed authentication)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span>Isolation Forest anomaly score: <strong className="text-purple-300 font-sans">0.92</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>7 rapid consecutive failed logins</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>New destination host connection to internal <code className="text-amber-300 font-sans">10.0.0.50:445</code></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>Suspicious process execution: <code className="text-rose-300 font-sans">powershell.exe -EncodedCommand</code></span>
                    </li>
                  </ul>
                </div>

                {/* Related Events */}
                <div className="p-3.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">
                    RELATED TELEMETRY EVIDENCE IDS
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {incident.event_ids.map((eid) => (
                      <button
                        key={eid}
                        onClick={() => {
                          const evt = timelineEvents.find((e) => e.id === eid);
                          if (evt) onInspectEvent(evt);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500 text-cyan-300 text-xs font-sans flex items-center gap-1.5 transition-colors"
                      >
                        <span>{eid}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans mt-3">
                    Click any evidence token to view full raw JSON telemetry payload.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Response Approval Confirmation Modal */}
      <ResponseApprovalModal
        isOpen={!!modalAction}
        action={modalAction}
        onClose={() => setModalAction(null)}
        onConfirm={handleApproveConfirm}
        isProcessing={isProcessingAction}
      />
    </div>
  );
};

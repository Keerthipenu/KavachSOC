import React from 'react';
import { Layers, ArrowDown, ExternalLink, ShieldCheck, CheckCircle2, Terminal } from 'lucide-react';
import { Incident, SecurityEvent, MitreTechnique } from '../types';

interface MitreViewProps {
  currentIncident: Incident | null;
  allEvents: SecurityEvent[];
  onInspectEvent: (evt: SecurityEvent) => void;
}

export const MitreView: React.FC<MitreViewProps> = ({
  currentIncident,
  allEvents,
  onInspectEvent,
}) => {
  // Ordered standard kill chain tactics
  const tacticsOrder = [
    { key: 'Initial Access', label: 'INITIAL ACCESS', description: 'Techniques used to gain an initial foothold' },
    { key: 'Execution', label: 'EXECUTION', description: 'Techniques that result in adversary-controlled code running' },
    { key: 'Credential Access', label: 'CREDENTIAL ACCESS', description: 'Techniques for stealing credentials like passwords and hashes' },
    { key: 'Lateral Movement', label: 'LATERAL MOVEMENT', description: 'Techniques used to extend access to other remote systems' },
    { key: 'Exfiltration', label: 'EXFILTRATION', description: 'Techniques used to steal and egress sensitive data' },
  ];

  // Techniques from active incident
  const detectedTechniques: MitreTechnique[] = 
    currentIncident?.investigation?.mitre_agent?.techniques || [];

  // Group detected techniques by tactic
  const tacticGroups: Record<string, MitreTechnique[]> = {};
  detectedTechniques.forEach((tech) => {
    const tacticKey = tech.tactic || 'Execution';
    if (!tacticGroups[tacticKey]) tacticGroups[tacticKey] = [];
    tacticGroups[tacticKey].push(tech);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>MITRE ATT&CK MATRIX & ADVERSARY PROGRESSION</span>
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Deterministic ATT&CK mapping bounded strictly by verifiable telemetry evidence predicates
        </p>
      </div>

      {/* Kill Chain Progression Flow */}
      <div className="p-6 rounded-xl bg-[#0b1220] border border-cyan-950/70 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono text-xs">
          <span className="font-bold text-slate-300 uppercase">
            ACTIVE ATTACK KILL-CHAIN PROGRESSION
          </span>
          <span className="text-[11px] text-cyan-400">
            {detectedTechniques.length} MITRE TECHNIQUES MAPPED
          </span>
        </div>

        {/* Matrix progression columns */}
        <div className="space-y-6">
          {tacticsOrder.map((tactic, idx) => {
            const techniques = tacticGroups[tactic.key] || [];
            const isObserved = techniques.length > 0;

            return (
              <div key={tactic.key} className="space-y-3">
                <div className={`p-4 rounded-xl border transition-all ${
                  isObserved 
                    ? 'bg-[#0f1728] border-cyan-900/80 shadow-[0_0_15px_rgba(0,229,255,0.08)]' 
                    : 'bg-[#080d17]/60 border-slate-800/60 opacity-60'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 font-mono">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isObserved ? 'bg-cyan-950 border border-cyan-700 text-cyan-300' : 'bg-slate-900 border border-slate-800 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-100 tracking-wider">
                          {tactic.label}
                        </h2>
                        <span className="text-[11px] text-slate-400 font-sans">
                          {tactic.description}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isObserved ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                          ● {techniques.length} DETECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 text-slate-500 border border-slate-800">
                          UNOBSERVED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Techniques list under this tactic */}
                  {techniques.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {techniques.map((tech) => (
                        <div
                          key={tech.technique_id}
                          className="p-3.5 rounded-lg bg-slate-900/90 border border-cyan-950/80 font-mono text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                              {tech.technique_id}
                            </span>
                            <span className="text-cyan-300 font-bold">
                              Confidence: {Math.round(tech.confidence * 100)}%
                            </span>
                          </div>

                          <div className="text-slate-100 font-bold text-sm">
                            {tech.technique_name}
                          </div>

                          {/* Evidence tags */}
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block mb-1">
                              CORRELATED TELEMETRY EVIDENCE:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {tech.evidence.map((eid) => (
                                <button
                                  key={eid}
                                  onClick={() => {
                                    const evt = allEvents.find((e) => e.id === eid);
                                    if (evt) onInspectEvent(evt);
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500 text-cyan-300 text-[11px] flex items-center gap-1 transition-colors"
                                >
                                  <span>{eid}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-slate-600 mt-2">
                      No events in this incident triggered predicates for this phase.
                    </div>
                  )}
                </div>

                {/* Connector Arrow */}
                {idx < tacticsOrder.length - 1 && (
                  <div className="flex justify-center">
                    <div className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400">
                      <ArrowDown className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

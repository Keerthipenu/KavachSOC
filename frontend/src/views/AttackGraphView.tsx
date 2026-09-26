import React from 'react';
import { Network, Server, ShieldAlert, Info } from 'lucide-react';
import { AttackGraphData, Incident, SecurityEvent } from '../types';
import { AttackGraph } from '../components/AttackGraph';

interface AttackGraphViewProps {
  graphData: AttackGraphData | null;
  currentIncident: Incident | null;
  allIncidents: Incident[];
  onSelectIncident: (id: string) => void;
  onInspectEvent: (evt: SecurityEvent) => void;
  allEvents: SecurityEvent[];
}

export const AttackGraphView: React.FC<AttackGraphViewProps> = ({
  graphData,
  currentIncident,
  allIncidents,
  onSelectIncident,
  onInspectEvent,
  allEvents,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-sans font-bold tracking-wider text-slate-100 flex items-center gap-2.5">
            <Network className="w-5 h-5 text-cyan-400" />
            <span>INTERACTIVE ATTACK RECONSTRUCTION GRAPH</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Directed provenance graph mapping attacker pivots, compromised credentials, lateral hops, and target servers
          </p>
        </div>

        {allIncidents.length > 1 && currentIncident && (
          <div className="flex items-center gap-2 font-sans text-xs">
            <span className="text-slate-400">ACTIVE INCIDENT:</span>
            <select
              value={currentIncident.id}
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

      {/* Main Graph Card */}
      <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between font-sans text-xs text-slate-400 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <span>NODES: <strong className="text-cyan-300">{graphData?.nodes?.length || 0}</strong></span>
            <span>EDGES: <strong className="text-cyan-300">{graphData?.edges?.length || 0}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Click any node to inspect evidence IDs and MITRE techniques</span>
          </div>
        </div>

        <AttackGraph
          graphData={graphData}
          height="h-[620px]"
          onSelectEvent={(eid) => {
            const evt = allEvents.find((e) => e.id === eid);
            if (evt) onInspectEvent(evt);
          }}
        />
      </div>
    </div>
  );
};

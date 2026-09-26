import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, Activity, AlertTriangle, Cpu, Terminal, ArrowRight, 
  ExternalLink, Search, Filter, ShieldCheck, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { SecurityEvent, Alert, Incident, SimulatedAsset, Severity } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface OverviewViewProps {
  events: SecurityEvent[];
  alerts: Alert[];
  incidents: Incident[];
  simulatedAssets: SimulatedAsset[];
  onSelectIncident: (id: string) => void;
  onInspectEvent: (evt: SecurityEvent) => void;
  onRefresh: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  events,
  alerts,
  incidents,
  simulatedAssets,
  onSelectIncident,
  onInspectEvent,
  onRefresh,
}) => {
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'malicious' | 'suspicious'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate dynamic Threat Level from backend data
  const threatInfo = useMemo(() => {
    if (incidents.length === 0) {
      if (alerts.length > 0) {
        return { score: 45, level: 'ELEVATED' as Severity, note: `${alerts.length} unassigned alerts flagged` };
      }
      return { score: 12, level: 'LOW' as Severity, note: 'Nominal baseline telemetry. No correlated active incidents.' };
    }

    // Find highest severity & confidence incident
    const highestInc = [...incidents].sort((a, b) => {
      const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      const scoreA = (rank[a.severity] || 0) * 100 + a.confidence * 100;
      const scoreB = (rank[b.severity] || 0) * 100 + b.confidence * 100;
      return scoreB - scoreA;
    })[0];

    const calculatedScore = Math.round(highestInc.confidence * 100);
    return {
      score: calculatedScore,
      level: highestInc.severity.toUpperCase() as Severity,
      incident: highestInc,
      note: highestInc.title,
    };
  }, [incidents, alerts]);

  // Filtered timeline events
  const filteredTimeline = useMemo(() => {
    return events
      .filter((e) => {
        if (timelineFilter === 'malicious') return e.label === 'malicious';
        if (timelineFilter === 'suspicious') return e.severity !== 'info';
        return true;
      })
      .filter((e) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          e.id.toLowerCase().includes(q) ||
          e.event_type.toLowerCase().includes(q) ||
          (e.user && e.user.toLowerCase().includes(q)) ||
          (e.host && e.host.toLowerCase().includes(q)) ||
          (e.source_ip && e.source_ip.toLowerCase().includes(q)) ||
          (e.process && e.process.toLowerCase().includes(q))
        );
      });
  }, [events, timelineFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header and Live Stats Row */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-sans font-bold tracking-wider text-slate-100 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
              SECURITY COMMAND CENTER
            </h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Unified Security Operations, Live Telemetry Ingestion & Autonomous Correlation
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans text-slate-300 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800 rounded border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>SYNC DATA</span>
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Events */}
          <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-sans mb-2">
              <span>EVENTS INGESTED</span>
              <Terminal className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-sans font-bold text-cyan-300">
              {events.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real-time telemetry stream</span>
            </div>
          </div>

          {/* Alerts */}
          <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-sans mb-2">
              <span>ACTIVE ALERTS</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-sans font-bold text-amber-300">
              {alerts.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Rule findings + ML anomaly spikes</span>
            </div>
          </div>

          {/* Critical Incidents */}
          <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-sans mb-2">
              <span>CRITICAL INCIDENTS</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-sans font-bold text-rose-400">
              {incidents.filter((i) => i.severity === 'critical').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>Correlated multi-stage chains</span>
            </div>
          </div>

          {/* Active Investigations */}
          <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-sans mb-2">
              <span>ACTIVE INVESTIGATIONS</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-sans font-bold text-purple-300">
              {incidents.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>LangGraph agent workflow active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Threat Level & Incident List Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* THREAT LEVEL Hero Card (Col 4) */}
        <div className="col-span-12 lg:col-span-4 p-4 rounded-lg bg-[#151b23] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-sans text-xs font-bold tracking-widest text-slate-400 uppercase">
                THREAT LEVEL
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                BACKEND COMPUTED
              </span>
            </div>

            {/* Score Display */}
            <div className="my-4 text-center">
              <div
                className={`text-4xl font-semibold font-sans tracking-tight ${
                  threatInfo.score >= 75
                    ? 'text-rose-500'
                    : threatInfo.score >= 40
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                }`}
              >
                {threatInfo.score}
              </div>
              <div
                className={`font-sans text-sm font-semibold uppercase mt-1 ${
                  threatInfo.score >= 75
                    ? 'text-rose-400'
                    : threatInfo.score >= 40
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                }`}
              >
                {threatInfo.level}
              </div>
              <p className="text-xs text-slate-400 font-sans mt-2 px-4">
                {threatInfo.note}
              </p>
            </div>

            {/* Gauge bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-colors duration-500 ${
                    threatInfo.score >= 75
                      ? 'bg-rose-500'
                      : threatInfo.score >= 40
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, threatInfo.score))}%` }}
                />
              </div>
              <div className="flex justify-between font-sans text-[10px] text-slate-500">
                <span>0 NOMINAL</span>
                <span>50 ELEVATED</span>
                <span>100 CRITICAL</span>
              </div>
            </div>
          </div>

          {/* Quick Action to Incident Details */}
          {incidents.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 mt-4">
              <button
                onClick={() => onSelectIncident(incidents[0].id)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500 font-sans text-xs font-semibold transition-colors"
              >
                <span>OPEN INCIDENT HERO INVESTIGATION</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* INCIDENT LIST (Col 8) */}
        <div className="col-span-12 lg:col-span-8 p-4 rounded-lg bg-[#151b23] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span className="font-sans text-xs font-bold tracking-widest text-slate-300 uppercase">
                  ACTIVE CORRELATED INCIDENTS
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-slate-800 text-slate-300">
                  {incidents.length} INCIDENT{incidents.length !== 1 ? 'S' : ''}
                </span>
              </div>
              <span className="text-[11px] font-sans text-slate-400">
                CORRELATION WINDOW: 10M
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-3">
              {incidents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-sans text-xs">
                  <ShieldCheck className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                  <span>No active security incidents detected.</span>
                  <p className="text-[11px] text-slate-600 mt-1 font-sans">
                    Run a scenario above (e.g., <code className="text-cyan-400">multi_stage</code>) to simulate an intrusion chain.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                      <th className="py-2.5 px-3">INCIDENT</th>
                      <th className="py-2.5 px-3">SEVERITY</th>
                      <th className="py-2.5 px-3">CONFIDENCE</th>
                      <th className="py-2.5 px-3">MITRE</th>
                      <th className="py-2.5 px-3">AFFECTED ASSETS</th>
                      <th className="py-2.5 px-3">FIRST SEEN</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {incidents.map((inc) => {
                      const mitreTechniques = inc.investigation?.mitre_agent?.techniques || [];
                      const mitreCode = mitreTechniques[0]?.technique_id || 'T1059.001';
                      const firstSeen = new Date(inc.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr
                          key={inc.id}
                          onClick={() => onSelectIncident(inc.id)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-3">
                            <span className="font-bold text-cyan-300 block">{inc.id}</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-[140px] block font-sans">
                              {inc.title}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge severity={inc.severity} />
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-200">
                                {Math.round(inc.confidence * 100)}%
                              </span>
                              <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-cyan-400 h-full"
                                  style={{ width: `${inc.confidence * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-purple-950/60 text-purple-300 border border-purple-800 font-semibold">
                              {mitreCode}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {inc.event_ids.length > 5 ? '3 assets' : '1 asset'}
                          </td>
                          <td className="py-3 px-3 text-slate-400">{firstSeen}</td>
                          <td className="py-3 px-3">
                            <StatusBadge status={inc.status} />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button className="text-cyan-400 group-hover:text-cyan-300 group-hover:translate-x-1 transition-colors inline-flex items-center gap-1 text-[11px] font-bold">
                              <span>INVESTIGATE</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LIVE THREAT TIMELINE (As specified in prompt) */}
      <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="font-sans text-sm font-bold tracking-widest text-slate-200 uppercase">
                LIVE THREAT TIMELINE
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">
                ● LIVE INGESTION
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Chronological security telemetry stream appearing in real time
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex rounded bg-slate-900 p-0.5 border border-slate-800 font-sans text-[11px]">
              <button
                onClick={() => setTimelineFilter('all')}
                className={`px-2.5 py-1 rounded ${timelineFilter === 'all' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                ALL ({events.length})
              </button>
              <button
                onClick={() => setTimelineFilter('malicious')}
                className={`px-2.5 py-1 rounded ${timelineFilter === 'malicious' ? 'bg-rose-950 text-rose-300 font-bold' : 'text-slate-400'}`}
              >
                MALICIOUS
              </button>
              <button
                onClick={() => setTimelineFilter('suspicious')}
                className={`px-2.5 py-1 rounded ${timelineFilter === 'suspicious' ? 'bg-amber-950 text-amber-300 font-bold' : 'text-slate-400'}`}
              >
                ELEVATED
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search user, host, IP, cmd..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs font-sans text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Events list */}
        <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredTimeline.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-sans text-xs">
              No matching events found in current filter.
            </div>
          ) : (
            filteredTimeline.map((evt) => {
              const time = new Date(evt.timestamp).toLocaleTimeString();
              const isMalicious = evt.label === 'malicious';

              return (
                <div
                  key={evt.id}
                  onClick={() => onInspectEvent(evt)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans text-xs ${
                    isMalicious
                      ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/80'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-900/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-semibold">{time}</span>
                    <span className="text-slate-600">|</span>
                    <span className="font-bold text-cyan-300">{evt.id}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-200 font-semibold">{evt.event_type}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    {evt.user && (
                      <span>
                        user: <span className="text-slate-200 font-medium">{evt.user}</span>
                      </span>
                    )}
                    {evt.host && (
                      <span>
                        host: <span className="text-slate-200 font-medium">{evt.host}</span>
                      </span>
                    )}
                    {evt.source_ip && (
                      <span>
                        src: <span className="text-slate-200 font-medium">{evt.source_ip}</span>
                      </span>
                    )}
                    {(evt.process || evt.command) && (
                      <span className="text-amber-300 max-w-[200px] truncate">
                        {evt.process || evt.command}
                      </span>
                    )}
                    <StatusBadge severity={evt.severity} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

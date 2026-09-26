import React, { useState, useMemo } from 'react';
import { 
  Crosshair, Search, Filter, Server, User, Terminal, Globe, 
  Layers, ShieldAlert, ArrowRight, ExternalLink, RefreshCw 
} from 'lucide-react';
import { SecurityEvent, Severity } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface ThreatHuntViewProps {
  events: SecurityEvent[];
  onInspectEvent: (evt: SecurityEvent) => void;
}

export const ThreatHuntView: React.FC<ThreatHuntViewProps> = ({
  events,
  onInspectEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedHost, setSelectedHost] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'host' | 'user' | 'source_ip' | 'none'>('host');

  const hosts = useMemo(() => Array.from(new Set(events.map((e) => e.host).filter(Boolean))), [events]);
  const users = useMemo(() => Array.from(new Set(events.map((e) => e.user).filter(Boolean))), [events]);

  const queryPresets = [
    { label: 'All events on workstation-a', query: 'workstation-a' },
    { label: 'Brute-force IP: 198.51.100.24', query: '198.51.100.24' },
    { label: 'PowerShell Execution', query: 'powershell' },
    { label: 'Lateral Movement (server-b)', query: 'server-b' },
    { label: 'Port 445 / SMB connections', query: 'internal_connection' },
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedSeverity !== 'all' && e.severity !== selectedSeverity) return false;
      if (selectedHost !== 'all' && e.host !== selectedHost) return false;
      if (selectedUser !== 'all' && e.user !== selectedUser) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q) ||
        (e.user && e.user.toLowerCase().includes(q)) ||
        (e.host && e.host.toLowerCase().includes(q)) ||
        (e.source_ip && e.source_ip.toLowerCase().includes(q)) ||
        (e.destination_ip && e.destination_ip.toLowerCase().includes(q)) ||
        (e.process && e.process.toLowerCase().includes(q)) ||
        (e.command && e.command.toLowerCase().includes(q))
      );
    });
  }, [events, searchQuery, selectedSeverity, selectedHost, selectedUser]);

  // Grouped events
  const groupedEvents = useMemo(() => {
    if (groupBy === 'none') return null;
    const map: Record<string, SecurityEvent[]> = {};
    filteredEvents.forEach((evt) => {
      const key = (evt[groupBy] as string) || 'Unassigned / System';
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    return map;
  }, [filteredEvents, groupBy]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-sans font-bold tracking-wider text-slate-100 flex items-center gap-2.5">
          <Crosshair className="w-5 h-5 text-cyan-400" />
          <span>ADVANCED THREAT HUNTING WORKBENCH</span>
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Multi-pivot entity correlation across endpoints, identities, processes, and network connections
        </p>
      </div>

      {/* Query Bar & Presets */}
      <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-4">
        {/* Main Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a natural hunt query, e.g., 'Show all events associated with workstation-a' or filter by IP, User, Hash..."
            className="w-full bg-[#111820] border border-slate-700/80 rounded-lg pl-12 pr-4 py-3 text-sm font-sans text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3 text-xs font-sans text-slate-400 hover:text-slate-200"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
          <span className="text-slate-400 text-[11px] mr-1">PRESET QUERIES:</span>
          {queryPresets.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => setSearchQuery(qp.query)}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-700 text-slate-300 hover:text-cyan-300 text-[11px] transition-colors"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80 font-sans text-xs">
          {/* Severity */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">SEVERITY</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Host */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">HOST</label>
            <select
              value={selectedHost}
              onChange={(e) => setSelectedHost(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
            >
              <option value="all">All Hosts ({hosts.length})</option>
              {hosts.map((h) => (
                <option key={h} value={h!}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* User */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">USER / IDENTITY</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
            >
              <option value="all">All Users ({users.length})</option>
              {users.map((u) => (
                <option key={u} value={u!}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Correlate By */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">CORRELATE BY</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full bg-slate-900 border border-cyan-800/80 rounded p-1.5 text-cyan-300 font-bold"
            >
              <option value="host">Group by Host</option>
              <option value="user">Group by User</option>
              <option value="source_ip">Group by Source IP</option>
              <option value="none">Flat Chronological</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSeverity('all');
                setSelectedHost('all');
                setSelectedUser('all');
                setGroupBy('host');
              }}
              className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans transition-colors"
            >
              RESET FILTERS
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between font-sans text-xs text-slate-400">
        <span>MATCHED: {filteredEvents.length} CORRELATED EVENTS</span>
        <span>VIEW MODE: {groupBy !== 'none' ? `ENTITY CLUSTERS (${groupBy.toUpperCase()})` : 'FLAT STREAM'}</span>
      </div>

      {/* Correlated Clusters or Flat View */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center font-sans text-xs text-slate-500 bg-[#151b23] rounded-lg border border-slate-800">
          No events match the current threat hunting parameters. Try clearing the query or resetting filters.
        </div>
      ) : groupedEvents ? (
        /* Correlated Clusters View */
        <div className="space-y-4">
          {Object.entries(groupedEvents).map(([entityName, clusterEvents]) => {
            const maliciousCount = clusterEvents.filter((e) => e.label === 'malicious').length;
            const hasCritical = clusterEvents.some((e) => e.severity === 'critical');

            return (
              <div
                key={entityName}
                className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-3"
              >
                {/* Cluster Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-sans">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${hasCritical ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-cyan-500/10 border border-cyan-500/30'}`}>
                      {groupBy === 'host' ? <Server className="w-4 h-4 text-cyan-400" /> : groupBy === 'user' ? <User className="w-4 h-4 text-purple-400" /> : <Globe className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-100">{entityName}</span>
                      <span className="text-[11px] text-slate-400 block">
                        CLUSTER: {clusterEvents.length} correlated events · {maliciousCount} attack indicators
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasCritical && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                        HIGH COMPROMISE RISK
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      {clusterEvents.length} EVENTS
                    </span>
                  </div>
                </div>

                {/* Cluster Events Table */}
                <div className="divide-y divide-slate-800/60 font-sans text-xs">
                  {clusterEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => onInspectEvent(evt)}
                      className="py-2.5 px-3 hover:bg-slate-800/40 rounded cursor-pointer transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="font-bold text-cyan-300">{evt.id}</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-slate-200 font-semibold">{evt.event_type}</span>
                      </div>

                      <div className="flex-1 text-[11px] text-slate-400 truncate">
                        {evt.process || evt.command || (evt.source_ip ? `IP: ${evt.source_ip}` : '—')}
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge severity={evt.severity} />
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Stream View */
        <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-2">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => onInspectEvent(evt)}
              className="p-3 rounded bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-700/60 cursor-pointer transition-colors flex items-center justify-between font-sans text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-cyan-300">{evt.id}</span>
                <span className="text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                <span className="text-slate-200 font-semibold">{evt.event_type}</span>
                <span className="text-slate-400 text-[11px]">
                  host: <span className="text-slate-300">{evt.host || '—'}</span> · user: <span className="text-slate-300">{evt.user || '—'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge severity={evt.severity} />
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-300" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Terminal, ShieldCheck, User, Cpu, RotateCcw, Search, ExternalLink } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditViewProps {
  logs: AuditLog[];
  onInspectMetadata: (title: string, data: any) => void;
  onRefresh: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  logs,
  onInspectMetadata,
  onRefresh,
}) => {
  const [filterActor, setFilterActor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formatActionName = (action: string) => {
    if (action === 'approve_and_execute_simulated_response') return 'Human Approved & Executed Response';
    if (action === 'rollback_simulated_response') return 'Containment Rollback Executed';
    if (action === 'scenario_loaded') return 'Telemetry Scenario Loaded & Ingested';
    if (action === 'demo_reset') return 'System Reset & Audit Rolled';
    return action.replace(/_/g, ' ');
  };

  const getActorBadge = (actor: string) => {
    const a = actor.toLowerCase();
    if (a.includes('ai') || a.includes('agent')) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-purple-950 text-purple-300 border border-purple-800 font-bold">
          <Cpu className="w-3 h-3" />
          <span>AI AGENT</span>
        </span>
      );
    }
    if (a.includes('system')) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700 font-bold">
          <Terminal className="w-3 h-3" />
          <span>SYSTEM</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
        <User className="w-3 h-3" />
        <span>{actor.toUpperCase()}</span>
      </span>
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (filterActor !== 'all') {
      if (filterActor === 'human' && (log.actor.includes('ai') || log.actor === 'system')) return false;
      if (filterActor === 'system' && log.actor !== 'system') return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-sans font-bold tracking-wider text-slate-100 flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span>IMMUTABLE AUDIT TRAIL & GOVERNANCE LOG</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Cryptographically bounded record of every AI agent deliberation, human approval, simulated containment, and verification check
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans text-slate-300 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800 rounded border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 font-sans text-xs">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-slate-400 text-[11px]">ACTOR FILTER:</span>
          <div className="flex rounded bg-slate-900 p-0.5 border border-slate-800">
            <button
              onClick={() => setFilterActor('all')}
              className={`px-3 py-1 rounded ${filterActor === 'all' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'}`}
            >
              ALL ({logs.length})
            </button>
            <button
              onClick={() => setFilterActor('human')}
              className={`px-3 py-1 rounded ${filterActor === 'human' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'}`}
            >
              HUMAN AUDIT
            </button>
            <button
              onClick={() => setFilterActor('system')}
              className={`px-3 py-1 rounded ${filterActor === 'system' ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400'}`}
            >
              SYSTEM
            </button>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs font-sans text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Audit Log Chronological List */}
      <div className="p-4 rounded-lg bg-[#151b23] border border-slate-800 space-y-3 font-sans text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] text-slate-400 font-bold">
          <span>EVENT CHRONOLOGY</span>
          <span>RESULT / METADATA</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-sans text-xs">
            No audit records found matching criteria.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              const date = new Date(log.timestamp).toLocaleDateString();

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold">{time}</span>
                    <span className="text-slate-600">|</span>
                    {getActorBadge(log.actor)}
                    <span className="text-slate-100 font-bold text-xs capitalize">
                      {formatActionName(log.action)}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      target: <strong className="text-slate-200">{log.target}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                      {log.result.toUpperCase()}
                    </span>

                    {log.audit_metadata && Object.keys(log.audit_metadata).length > 0 && (
                      <button
                        onClick={() => onInspectMetadata(`Audit Log Entry #${log.id} - ${log.action}`, log.audit_metadata)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500 text-cyan-300 text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <span>METADATA</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

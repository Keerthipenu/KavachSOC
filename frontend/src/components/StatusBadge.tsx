import React from 'react';
import { Severity } from '../types';

interface StatusBadgeProps {
  severity?: Severity | string;
  status?: string;
  detector?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ severity, status, detector, className = '' }) => {
  if (severity) {
    const s = severity.toLowerCase();
    let bg = 'bg-slate-800/80 text-slate-300 border-slate-700';
    let dot = 'bg-slate-400';

    if (s === 'critical') {
      bg = 'bg-rose-950/40 text-rose-300 border-rose-800/60';
      dot = 'bg-rose-500';
    } else if (s === 'high') {
      bg = 'bg-amber-950/40 text-amber-300 border-amber-800/60';
      dot = 'bg-amber-500';
    } else if (s === 'medium') {
      bg = 'bg-yellow-950/30 text-yellow-300 border-yellow-800/50';
      dot = 'bg-yellow-400';
    } else if (s === 'low' || s === 'info') {
      bg = 'bg-cyan-950/30 text-cyan-300 border-cyan-800/50';
      dot = 'bg-cyan-400';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-sans font-medium tracking-wide uppercase border ${bg} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {severity}
      </span>
    );
  }

  if (detector) {
    let style = 'bg-slate-800/70 text-slate-300 border-slate-700';
    if (detector === 'HYBRID') style = 'bg-slate-800/80 text-slate-200 border-slate-700';
    if (detector === 'RULE') style = 'bg-blue-950/50 text-blue-300 border-blue-800/60';
    if (detector === 'ML') style = 'bg-cyan-950/50 text-cyan-300 border-cyan-800/60';

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-sans tracking-wider font-semibold border ${style} ${className}`}>
        {detector}
      </span>
    );
  }

  if (status) {
    const s = status.toLowerCase();
    let style = 'bg-slate-800 text-slate-400 border-slate-700';
    if (s === 'contained' || s === 'executed' || s === 'active') {
      style = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
    } else if (s === 'open' || s === 'recommended' || s === 'investigating') {
      style = 'bg-amber-950/40 text-amber-300 border-amber-800/50';
    } else if (s === 'isolated' || s === 'blocked' || s === 'disabled') {
      style = 'bg-rose-950/40 text-rose-300 border-rose-800/50';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-sans font-medium capitalize border ${style} ${className}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  }

  return null;
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, X, ShieldAlert, Activity, CheckCircle2, 
  Terminal, ArrowRight, Zap, RefreshCw 
} from 'lucide-react';
import { SecurityEvent, ScenarioType } from '../types';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface AttackReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ScenarioType;
  onReplayComplete?: () => void;
}

export const AttackReplayModal: React.FC<AttackReplayModalProps> = ({
  isOpen,
  onClose,
  scenario,
  onReplayComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<SecurityEvent | null>(null);
  const [threatScore, setThreatScore] = useState<number>(10);
  const [currentStage, setCurrentStage] = useState<string>('Reconnaissance');
  const [isCompleted, setIsCompleted] = useState(false);
  const [delayMs, setDelayMs] = useState<number>(300);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      startReplay();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen, scenario]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const cleanup = () => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
    }
    setIsPlaying(false);
  };

  const startReplay = () => {
    cleanup();
    setEvents([]);
    setCurrentEvent(null);
    setThreatScore(15);
    setCurrentStage('Reconnaissance');
    setIsCompleted(false);
    setIsPlaying(true);

    const stop = api.createReplayStream(
      scenario,
      delayMs,
      (evt: SecurityEvent) => {
        setEvents((prev) => [...prev, evt]);
        setCurrentEvent(evt);

        // Dynamically compute attack reconstruction threat score
        setThreatScore((prevScore) => {
          let add = 5;
          if (evt.severity === 'critical') add = 22;
          else if (evt.severity === 'high') add = 14;
          else if (evt.severity === 'medium') add = 8;
          return Math.min(96, Math.max(prevScore, prevScore + add));
        });

        // Stage inference
        if (evt.event_type.includes('outbound')) setCurrentStage('Exfiltration (T1041)');
        else if (evt.event_type.includes('service') || evt.event_type.includes('connection')) setCurrentStage('Lateral Movement (T1021)');
        else if (evt.event_type.includes('credential')) setCurrentStage('Credential Access (T1003)');
        else if (evt.event_type.includes('process')) setCurrentStage('Execution (T1059.001)');
        else if (evt.event_type.includes('login')) setCurrentStage('Credential Access / Brute Force (T1110)');
      },
      () => {
        setIsPlaying(false);
        setIsCompleted(true);
        if (onReplayComplete) onReplayComplete();
      },
      (err) => {
        console.error('Replay error:', err);
        setIsPlaying(false);
      }
    );

    stopStreamRef.current = stop;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#111820] border border-cyan-800/60 rounded-lg shadow-cyan-950/40 overflow-hidden flex flex-col h-[85vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-950 bg-[#151b23]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans text-base font-bold tracking-wider text-cyan-300">
                  ATTACK REPLAY ENGINE
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  REAL-TIME TELEMETRY RECONSTRUCTION
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Scenario: <span className="text-cyan-200 uppercase font-semibold">{scenario.replace('_', ' ')}</span> · Chronological SSE Ingestion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed selection */}
            <div className="flex items-center gap-1.5 text-xs font-sans text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded border border-slate-800">
              <span>SPEED:</span>
              {[500, 300, 150].map((d) => (
                <button
                  key={d}
                  onClick={() => setDelayMs(d)}
                  className={`px-1.5 py-0.5 rounded text-[11px] ${delayMs === d ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {d === 500 ? '0.5x' : d === 300 ? '1x' : '2x'}
                </button>
              ))}
            </div>

            <button
              onClick={startReplay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/80 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTART</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Threat & Progression Ribbon */}
        <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-[#151b23] border-b border-slate-800/80 font-sans text-xs">
          {/* Threat score gauge */}
          <div className="col-span-3 flex items-center gap-3 bg-slate-900/70 p-2.5 rounded border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">RECONSTRUCTED THREAT</span>
              <span className={`text-2xl font-black ${threatScore > 75 ? 'text-rose-400' : threatScore > 40 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {threatScore}
              </span>
            </div>
            <div className="flex-1">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-colors duration-300 ${threatScore > 75 ? 'bg-rose-500' : threatScore > 40 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                  style={{ width: `${threatScore}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {threatScore > 75 ? '● CRITICAL BREACH RISK' : threatScore > 40 ? '● ELEVATED SUSPICION' : '● NOMINAL BASELINE'}
              </span>
            </div>
          </div>

          {/* Current attack stage */}
          <div className="col-span-4 flex items-center gap-3 bg-slate-900/70 p-2.5 rounded border border-slate-800">
            <Activity className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 uppercase block">ACTIVE KILL-CHAIN PHASE</span>
              <span className="text-sm font-bold text-amber-300 truncate block">
                {currentStage}
              </span>
            </div>
          </div>

          {/* Ingested metrics */}
          <div className="col-span-5 flex items-center justify-between bg-slate-900/70 p-2.5 rounded border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">EVENTS RECONSTRUCTED</span>
              <span className="text-sm font-bold text-cyan-300">
                {events.length} TELEMETRY RECORDS
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  REPLAY FINISHED
                </span>
              ) : isPlaying ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-semibold animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  STREAMING TELEMETRY...
                </span>
              ) : (
                <span className="text-xs text-slate-400">PAUSED</span>
              )}
            </div>
          </div>
        </div>

        {/* Main Body: Event Reconstruction List */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col bg-[#0d1117]">
          <div className="flex items-center justify-between mb-3 text-xs font-sans text-slate-400">
            <span>CHRONOLOGICAL TELEMETRY FEED (APPEARING IN REAL TIME)</span>
            <span>AUTO-SCROLLING ● LIVE</span>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-2 pr-2 font-sans text-xs"
          >
            {events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span>Initializing Server-Sent Events channel...</span>
              </div>
            ) : (
              events.map((evt, idx) => {
                const isLatest = idx === events.length - 1;
                return (
                  <div
                    key={evt.id + '-' + idx}
                    className={`p-3.5 rounded-lg border transition-colors duration-200 ${
                      isLatest
                        ? 'bg-cyan-950/30 border-cyan-500/80 ring-1 ring-cyan-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{evt.id}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-semibold text-slate-200">
                          {evt.event_type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge severity={evt.severity} />
                        {evt.label === 'malicious' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800 font-bold">
                            ATTACK SIGNAL
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400 mt-2 bg-slate-950/60 p-2 rounded border border-slate-900">
                      <div>
                        <span className="text-slate-600 block text-[9px]">USER</span>
                        <span className="text-slate-300 font-semibold">{evt.user || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block text-[9px]">HOST</span>
                        <span className="text-slate-300 font-semibold">{evt.host || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block text-[9px]">SOURCE IP</span>
                        <span className="text-slate-300 font-semibold">{evt.source_ip || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block text-[9px]">PROCESS / CMD</span>
                        <span className="text-amber-300 font-semibold truncate block">
                          {evt.process || evt.command || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#151b23] border-t border-slate-800 flex items-center justify-between font-sans text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>AI correlation pipeline will ingest, correlate, and graph these events.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors"
            >
              CLOSE & VIEW ON DASHBOARD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  X, CheckCircle, ShieldAlert, Cpu, Sparkles, Terminal, Activity, ArrowRight 
} from 'lucide-react';

interface JudgeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadMultiStage: () => void;
}

export const JudgeGuideModal: React.FC<JudgeGuideModalProps> = ({
  isOpen,
  onClose,
  onLoadMultiStage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[#111820] border border-cyan-800/80 rounded-lg shadow-cyan-950/50 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-950 bg-[#151b23]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-sans text-base font-bold tracking-wider text-cyan-300">
                KavachSOC · 20-SECOND JUDGE BRIEFING
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Agentic AI Security Operations & Autonomous Threat Hunting Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 font-sans text-xs">
          <div className="grid grid-cols-2 gap-4">
            {/* 1. WHAT IS HAPPENING? */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs">1</span>
                <span>WHAT IS HAPPENING?</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-xs">
                A multi-stage cyber intrusion is attacking our network: starting from external brute force, leading to credential dumping, PowerShell execution, and lateral movement to simulated <code className="text-cyan-300">server-b</code>.
              </p>
            </div>

            {/* 2. WHY IS IT A THREAT? */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-xs">2</span>
                <span>WHY IS IT A THREAT?</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-xs">
                Deterministic rules (<code className="text-rose-300">R-AUTH-001</code>, <code className="text-rose-300">R-EXEC-001</code>, <code className="text-rose-300">R-LAT-001</code>) and Isolation Forest anomaly algorithms (<code className="text-purple-300">score 0.92</code>) flag high-risk lateral movement across critical infrastructure.
              </p>
            </div>

            {/* 3. WHAT EVIDENCE SUPPORTS IT? */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center text-xs">3</span>
                <span>WHAT EVIDENCE SUPPORTS IT?</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-xs">
                Every claim is bound to explicit telemetry IDs (<code className="text-amber-300">EVT-0001</code> through <code className="text-amber-300">EVT-0013</code>). No hallucinations or ungrounded guesses. MITRE ATT&CK techniques mapped via strict predicates.
              </p>
            </div>

            {/* 4. WHAT SHOULD WE DO? */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs">4</span>
                <span>WHAT SHOULD WE DO?</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-xs">
                The AI response panel recommends: <strong className="text-emerald-300">ISOLATE ENDPOINT (server-b)</strong>. Requires explicit human authorization before execution to prevent unauthorized disruption.
              </p>
            </div>

            {/* 5. WHAT DID THE AI DO? */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center text-xs">5</span>
                <span>WHAT DID THE AI DO?</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-xs">
                LangGraph agent pipeline synthesized hypotheses with ranked confidence scores, built the entity attack graph, and generated audited response recommendations.
              </p>
            </div>

            {/* 6. WHAT HAPPENED AFTER RESPONSE? */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs">6</span>
                <span>WHAT HAPPENED AFTER RESPONSE?</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans text-xs">
                Upon human approval, the simulated asset enters <strong className="text-rose-400">ISOLATED</strong> state. Telemetry verification confirms suspicious activity dropped by 100%, with full rollback available anytime!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#111820] border-t border-slate-800 flex items-center justify-between font-sans text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Ready to explore the live SOC dashboard.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onLoadMultiStage();
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors"
            >
              <span>RUN MULTI-STAGE DEMO SCENARIO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

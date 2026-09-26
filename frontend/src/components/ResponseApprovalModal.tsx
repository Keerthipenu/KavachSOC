import React from 'react';
import { ShieldCheck, AlertTriangle, Check, Lock, X } from 'lucide-react';
import { ResponseAction } from '../types';

interface ResponseApprovalModalProps {
  isOpen: boolean;
  action: ResponseAction | null;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

export const ResponseApprovalModal: React.FC<ResponseApprovalModalProps> = ({
  isOpen,
  action,
  onClose,
  onConfirm,
  isProcessing,
}) => {
  if (!isOpen || !action) return null;

  const targetLabel = action.target.toUpperCase();
  const actionLabel = action.action.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#151b23] border border-amber-600/60 rounded-lg shadow-amber-950/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold tracking-wider text-amber-300">
                APPROVE SIMULATED RESPONSE?
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Human authorization required before execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 font-sans text-sm">
          {/* Target Card */}
          <div className="p-3.5 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-between font-sans">
            <div>
              <span className="text-slate-400 text-xs block">PROPOSED CONTAINMENT</span>
              <span className="text-cyan-300 font-semibold text-sm">{actionLabel}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-xs block">TARGET ENTITY</span>
              <span className="text-amber-300 font-bold text-sm">{targetLabel}</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded border border-slate-800/80">
            <span className="text-slate-400 block mb-1 font-sans text-[11px]">RATIONALE:</span>
            {action.reason}
          </div>

          {/* Action Checklist */}
          <div className="space-y-2 pt-2">
            <p className="font-sans text-xs font-semibold text-slate-300 uppercase tracking-wider">
              This action will:
            </p>
            <div className="space-y-1.5 font-sans text-xs text-emerald-400/90 bg-emerald-950/20 p-3 rounded border border-emerald-900/30">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>isolate simulated endpoint ({targetLabel})</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>create immutable audit record in tamper log</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>run automated post-response verification</span>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="flex items-start gap-2.5 text-xs text-slate-400 bg-slate-950/80 p-2.5 rounded border border-slate-800/60 font-sans">
            <Lock className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span>
              SAFETY GUARANTEE: Operates solely on local simulated telemetry. No real host commands or network alterations are executed.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#111820] border-t border-slate-800 flex items-center justify-end gap-3 font-sans text-xs">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded text-slate-300 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-2 rounded font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>EXECUTING...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>CONFIRM & EXECUTE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

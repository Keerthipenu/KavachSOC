import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ShieldAlert } from 'lucide-react';

interface RawPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

export const RawPayloadModal: React.FC<RawPayloadModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#0b111e] border border-cyan-900/60 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-sm font-semibold tracking-wide text-cyan-200">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY RAW'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-slate-300 bg-[#070b14] leading-relaxed">
          <pre className="whitespace-pre-wrap selection:bg-cyan-950 selection:text-cyan-200">
            {jsonString}
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-[#090f1a] border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>SENTINEL-X DETERMINISTIC AUDIT STREAM</span>
          </div>
          <span>READ-ONLY FORENSIC ARTIFACT</span>
        </div>
      </div>
    </div>
  );
};

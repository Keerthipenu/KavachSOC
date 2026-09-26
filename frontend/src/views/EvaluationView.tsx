import React, { useState, useEffect } from 'react';
import { 
  FileCheck, TrendingUp, Cpu, Activity, Clock, ShieldCheck, 
  RefreshCw, CheckCircle2, BarChart2, Layers 
} from 'lucide-react';
import { EvaluationResult } from '../types';
import { api } from '../services/api';

export const EvaluationView: React.FC = () => {
  const [data, setData] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEval = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEvaluation();
      setData(res);
    } catch (err: any) {
      console.error('Failed to fetch evaluation metrics:', err);
      setError(err.message || 'Failed to load evaluation metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEval();
  }, []);

  if (loading && !data) {
    return (
      <div className="py-24 text-center font-mono text-xs text-slate-500">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Computing real-time evaluation across 6 deterministic benchmark scenarios...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-xl bg-rose-950/20 border border-rose-900/50 text-center font-mono text-xs text-rose-300">
        <span className="font-bold block mb-1">EVALUATION FAILED</span>
        <span>{error || 'No evaluation data returned from backend.'}</span>
        <div className="mt-4">
          <button
            onClick={fetchEval}
            className="px-4 py-2 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200"
          >
            Retry Evaluation
          </button>
        </div>
      </div>
    );
  }

  const { baseline, sentinel_x: sx, dataset, per_scenario, methodology } = data;

  const f1Delta = Math.round((sx.f1 - baseline.f1) * 100);
  const recallDelta = Math.round((sx.recall - baseline.recall) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-wider text-slate-100 flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <span>MODEL EVALUATION & OBSERVABILITY BENCHMARK</span>
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Deterministic cross-scenario evaluation comparing explicit Rule Baseline against SENTINEL-X Hybrid (Rule + Isolation Forest)
          </p>
        </div>

        <button
          onClick={fetchEval}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800 rounded border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>RECALCULATE</span>
        </button>
      </div>

      {/* Dataset & Methodology Banner */}
      <div className="p-4 rounded-xl bg-[#0d1424] border border-cyan-950/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="text-slate-200 font-semibold block">BENCHMARK DATASET:</span>
            <span className="text-slate-400 text-[11px]">
              {dataset.events} events evaluated across {dataset.scenarios} labelled cyber defense scenarios
            </span>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-[11px] text-cyan-300 max-w-lg">
          {methodology}
        </div>
      </div>

      {/* Top 5 Metric Highlights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
        {/* F1 Score */}
        <div className="p-4 rounded-xl bg-[#0b1220] border border-cyan-950/80 shadow-lg space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">F1 SCORE</span>
          <div className="text-2xl font-bold text-cyan-300">
            {(sx.f1 * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{f1Delta}% vs Baseline</span>
          </div>
        </div>

        {/* Recall */}
        <div className="p-4 rounded-xl bg-[#0b1220] border border-cyan-950/80 shadow-lg space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">RECALL (DETECTION RATE)</span>
          <div className="text-2xl font-bold text-purple-300">
            {(sx.recall * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{recallDelta}% vs Baseline</span>
          </div>
        </div>

        {/* Precision */}
        <div className="p-4 rounded-xl bg-[#0b1220] border border-cyan-950/80 shadow-lg space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">PRECISION</span>
          <div className="text-2xl font-bold text-slate-100">
            {(sx.precision * 100).toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-400 block">
            Baseline: {(baseline.precision * 100).toFixed(1)}%
          </span>
        </div>

        {/* False Positive Rate */}
        <div className="p-4 rounded-xl bg-[#0b1220] border border-cyan-950/80 shadow-lg space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">FALSE POSITIVE RATE</span>
          <div className="text-2xl font-bold text-amber-300">
            {(sx.false_positive_rate * 100).toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-400 block">
            Controlled ML contamination
          </span>
        </div>

        {/* Detection Latency */}
        <div className="p-4 rounded-xl bg-[#0b1220] border border-cyan-950/80 shadow-lg space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">DETECTION LATENCY</span>
          <div className="text-2xl font-bold text-emerald-300">
            {sx.mean_detection_latency_seconds !== null ? `${sx.mean_detection_latency_seconds}s` : '0.0s'}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Streamline response</span>
          </div>
        </div>
      </div>

      {/* Comparison: RULE BASELINE vs SENTINEL-X HYBRID */}
      <div className="p-6 rounded-xl bg-[#0b1220] border border-cyan-950/70 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono text-xs">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-sm">
            COMPARISON: RULE BASELINE vs SENTINEL-X HYBRID
          </span>
          <span className="text-cyan-400 text-[11px]">
            REAL COMPUTED METRICS FROM DATASET
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rule Baseline Box */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-300">RULE BASELINE</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-bold">
                STATIC RULES ONLY
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Recall:</span>
                  <span className="text-slate-200 font-bold">{(baseline.recall * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-500 h-full" style={{ width: `${baseline.recall * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Precision:</span>
                  <span className="text-slate-200 font-bold">{(baseline.precision * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-500 h-full" style={{ width: `${baseline.precision * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">F1 Score:</span>
                  <span className="text-slate-200 font-bold">{(baseline.f1 * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-500 h-full" style={{ width: `${baseline.f1 * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Confusion matrix */}
            <div className="pt-3 border-t border-slate-800 text-[11px]">
              <span className="text-slate-500 uppercase block mb-1.5 font-bold">CONFUSION MATRIX</span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TRUE POSITIVES</span>
                  <span className="text-sm font-bold text-emerald-400">{baseline.true_positives}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">FALSE POSITIVES</span>
                  <span className="text-sm font-bold text-amber-400">{baseline.false_positives}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">FALSE NEGATIVES</span>
                  <span className="text-sm font-bold text-rose-400">{baseline.false_negatives}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TRUE NEGATIVES</span>
                  <span className="text-sm font-bold text-cyan-400">{baseline.true_negatives}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SENTINEL-X HYBRID Box */}
          <div className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-700/60 shadow-[0_0_15px_rgba(0,229,255,0.1)] space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60">
              <span className="font-bold text-cyan-300">SENTINEL-X HYBRID</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                RULES + ISOLATION FOREST
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Recall:</span>
                  <span className="text-purple-300 font-bold">{(sx.recall * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full" style={{ width: `${sx.recall * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Precision:</span>
                  <span className="text-cyan-300 font-bold">{(sx.precision * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full" style={{ width: `${sx.precision * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">F1 Score:</span>
                  <span className="text-emerald-300 font-bold">{(sx.f1 * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: `${sx.f1 * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Confusion matrix */}
            <div className="pt-3 border-t border-cyan-900/60 text-[11px]">
              <span className="text-slate-400 uppercase block mb-1.5 font-bold">CONFUSION MATRIX</span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-950 rounded border border-cyan-900/60">
                  <span className="text-slate-400 block text-[10px]">TRUE POSITIVES</span>
                  <span className="text-sm font-bold text-emerald-400">{sx.true_positives}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-cyan-900/60">
                  <span className="text-slate-400 block text-[10px]">FALSE POSITIVES</span>
                  <span className="text-sm font-bold text-amber-400">{sx.false_positives}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-cyan-900/60">
                  <span className="text-slate-400 block text-[10px]">FALSE NEGATIVES</span>
                  <span className="text-sm font-bold text-rose-400">{sx.false_negatives}</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-cyan-900/60">
                  <span className="text-slate-400 block text-[10px]">TRUE NEGATIVES</span>
                  <span className="text-sm font-bold text-cyan-400">{sx.true_negatives}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per Scenario Coverage Table */}
      <div className="p-6 rounded-xl bg-[#0b1220] border border-cyan-950/70 shadow-xl space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-sm">
            BENCHMARK BREAKDOWN PER SCENARIO
          </span>
          <span className="text-slate-400 text-[11px]">
            6 EVALUATED SCENARIOS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                <th className="py-2.5 px-3">SCENARIO NAME</th>
                <th className="py-2.5 px-3 text-center">LABELLED MALICIOUS</th>
                <th className="py-2.5 px-3 text-center">BASELINE FLAGGED</th>
                <th className="py-2.5 px-3 text-center">SENTINEL-X FLAGGED</th>
                <th className="py-2.5 px-3 text-right">HYBRID RECALL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Object.entries(per_scenario).map(([scenarioName, stats]) => {
                const recall = stats.labelled_malicious > 0 ? (stats.sentinel_x_flagged / stats.labelled_malicious) * 100 : 100;
                return (
                  <tr key={scenarioName} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-slate-200 uppercase">
                      {scenarioName.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">
                      {stats.labelled_malicious}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {stats.baseline_flagged}
                    </td>
                    <td className="py-3 px-3 text-center text-cyan-300 font-bold">
                      {stats.sentinel_x_flagged}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${recall >= 100 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                        {Math.min(100, Math.round(recall))}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

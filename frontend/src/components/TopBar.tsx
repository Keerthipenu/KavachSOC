import React from 'react';
import { 
  Shield, Play, RotateCcw, Zap, Sparkles, Terminal, Activity, 
  Layers, Crosshair, Network, FileCheck, CheckCircle2, AlertTriangle, Eye
} from 'lucide-react';
import { TabType, ScenarioType, SystemHealth, SimulatedAsset } from '../types';

interface TopBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
  onRunScenario: () => void;
  onReplayClick: () => void;
  onResetClick: () => void;
  onOpenJudgeGuide: () => void;
  health: SystemHealth | null;
  isLoading: boolean;
  incidentCount: number;
  simulatedAssets: SimulatedAsset[];
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  selectedScenario,
  onScenarioChange,
  onRunScenario,
  onReplayClick,
  onResetClick,
  onOpenJudgeGuide,
  health,
  isLoading,
  incidentCount,
  simulatedAssets,
}) => {
  const isHealthy = health?.status === 'ok';
  const isolatedCount = simulatedAssets.filter((a) => a.state === 'ISOLATED' || a.state === 'DISABLED').length;

  const scenarios: { key: ScenarioType; label: string }[] = [
    { key: 'multi_stage', label: 'Multi-Stage Attack' },
    { key: 'credential_compromise', label: 'Credential Compromise' },
    { key: 'lateral_movement', label: 'Lateral Movement' },
    { key: 'brute_force', label: 'Brute Force' },
    { key: 'noisy', label: 'Noisy Environment' },
    { key: 'normal', label: 'Normal Traffic' },
  ];

  const navTabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'incidents', label: 'Incidents', icon: <Shield className="w-3.5 h-3.5" />, badge: incidentCount },
    { id: 'threat-hunt', label: 'Threat Hunt', icon: <Crosshair className="w-3.5 h-3.5" /> },
    { id: 'attack-graph', label: 'Attack Graph', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'mitre', label: 'MITRE', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'evaluation', label: 'Evaluation', icon: <FileCheck className="w-3.5 h-3.5" /> },
    { id: 'audit', label: 'Audit', icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#111820]/95 backdrop-blur-md border-b border-slate-800">
      {/* Upper Status & Brand Row */}
      <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-800/60 text-xs font-sans">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-7 h-7 rounded bg-slate-800 border border-slate-700">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="text-base font-semibold text-slate-100">
                Kavach<span className="text-cyan-400">SOC</span>
              </span>
              <span className="hidden xl:inline-block ml-2 text-[10px] text-slate-400 font-sans tracking-tight">
                Agentic AI Security Operations & Threat Hunting
              </span>
            </div>
          </div>

          {/* System Status Indicators (As specified in prompt) */}
          <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">SYSTEM STATUS</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isHealthy ? 'OPERATIONAL' : 'DEGRADED'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">EVENT STREAM</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">AI ANALYST</span>
              <span className="flex items-center gap-1 text-slate-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                {isLoading ? 'INVESTIGATING' : 'READY'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">SIMULATION</span>
              <span className="flex items-center gap-1 text-cyan-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Right Demo Toolbar & Judge Briefing */}
        <div className="flex items-center gap-2.5">
          {/* Judge Fast-track */}
          <button
            onClick={onOpenJudgeGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">JUDGE 20-SEC BRIEFING</span>
          </button>

          {/* DEMO MODE Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 font-bold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>DEMO MODE</span>
          </div>

          {/* Scenario Selector Dropdown */}
          <select
            value={selectedScenario}
            onChange={(e) => onScenarioChange(e.target.value as ScenarioType)}
            disabled={isLoading}
            className="bg-[#151b23] text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-sans focus:border-cyan-500 focus:outline-none cursor-pointer"
          >
            {scenarios.map((sc) => (
              <option key={sc.key} value={sc.key}>
                {sc.label}
              </option>
            ))}
          </select>

          {/* RUN SCENARIO Button */}
          <button
            onClick={onRunScenario}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>ANALYZING...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RUN SCENARIO</span>
              </>
            )}
          </button>

          {/* REPLAY ATTACK Button */}
          <button
            onClick={onReplayClick}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/80 font-bold transition-colors disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">REPLAY ATTACK</span>
          </button>

          {/* RESET Button */}
          <button
            onClick={onResetClick}
            disabled={isLoading}
            title="Reset telemetry & database"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lower Navigation Tabs Row */}
      <div className="px-6 flex items-center justify-between">
        <nav className="flex space-x-1">
          {navTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 font-sans text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Info: Containment status */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-sans text-slate-400">
          {isolatedCount > 0 ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-medium text-[11px]">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              {isolatedCount} ASSET CONTAINED
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ZERO CONTAINMENT LOCKS
            </span>
          )}
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400">
            LOCAL DETERMINISTIC SIMULATION
          </span>
        </div>
      </div>
    </header>
  );
};

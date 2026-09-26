import React from 'react';
import { 
  Shield, Play, RotateCcw, Zap, Terminal, Activity,
  Layers, Crosshair, Network, FileCheck, CheckCircle2, AlertTriangle
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
  isLoading,
  incidentCount,
  simulatedAssets,
}) => {
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

        {/* Scenario controls */}
        <div className="flex items-center gap-2.5">
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

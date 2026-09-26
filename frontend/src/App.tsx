import React, { useState, useEffect, useCallback } from 'react';
import { 
  TabType, ScenarioType, SecurityEvent, Alert, Incident, 
  AttackGraphData, ResponseAction, AuditLog, SimulatedAsset, SystemHealth 
} from './types';
import { api } from './services/api';
import { TopBar } from './components/TopBar';
import { RawPayloadModal } from './components/RawPayloadModal';
import { AttackReplayModal } from './components/AttackReplayModal';
import { JudgeGuideModal } from './components/JudgeGuideModal';
import { OverviewView } from './views/OverviewView';
import { IncidentHeroView } from './views/IncidentHeroView';
import { ThreatHuntView } from './views/ThreatHuntView';
import { AttackGraphView } from './views/AttackGraphView';
import { MitreView } from './views/MitreView';
import { EvaluationView } from './views/EvaluationView';
import { AuditView } from './views/AuditView';
import { AlertTriangle, WifiOff, ShieldCheck, RefreshCw, Terminal, Layers } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & Scenario State
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('multi_stage');

  // Backend Data
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [simulatedAssets, setSimulatedAssets] = useState<SimulatedAsset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Selected Incident Detailed State
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [incidentTimeline, setIncidentTimeline] = useState<SecurityEvent[]>([]);
  const [incidentGraph, setIncidentGraph] = useState<AttackGraphData | null>(null);
  const [incidentRecommendations, setIncidentRecommendations] = useState<ResponseAction[]>([]);

  // UI Flow & Modals
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState<boolean>(false);
  const [isJudgeGuideOpen, setIsJudgeGuideOpen] = useState<boolean>(false);
  const [payloadModal, setPayloadModal] = useState<{ isOpen: boolean; title: string; data: any }>({
    isOpen: false,
    title: '',
    data: null,
  });

  // Insufficient Data state banner
  const [insufficientDataNotice, setInsufficientDataNotice] = useState<string | null>(null);

  // Sync hash routing if user changes tab
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      const validTabs: TabType[] = ['overview', 'incidents', 'threat-hunt', 'attack-graph', 'mitre', 'evaluation', 'audit'];
      if (validTabs.includes(hash)) {
        setCurrentTab(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const changeTab = (tab: TabType) => {
    setCurrentTab(tab);
    window.location.hash = tab;
  };

  // Fetch core telemetry and incident overview
  const refreshCore = useCallback(async () => {
    try {
      setBackendError(null);
      const [h, evts, alts, incs, assets, logs] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getEvents(500).catch(() => []),
        api.getAlerts(500).catch(() => []),
        api.getIncidents(100).catch(() => []),
        api.getSimulatedAssets().catch(() => []),
        api.getAudit(500).catch(() => []),
      ]);

      setHealth(h);
      if (!h) {
        setBackendError('Backend service is unreachable. Ensure the FastAPI backend is running on 127.0.0.1:8000.');
      }

      setEvents(evts);
      setAlerts(alts);
      setIncidents(incs);
      setSimulatedAssets(assets);
      setAuditLogs(logs);

      // Maintain or pick active incident
      if (incs.length > 0) {
        setSelectedIncidentId((prev) => {
          if (prev && incs.some((i) => i.id === prev)) return prev;
          return incs[0].id;
        });
        setInsufficientDataNotice(null);
      } else {
        setSelectedIncidentId(null);
        setCurrentIncident(null);
        setIncidentTimeline([]);
        setIncidentGraph(null);
        setIncidentRecommendations([]);
      }
    } catch (err: any) {
      console.error('Error refreshing core:', err);
      setBackendError(err.message || 'Error communicating with backend');
    }
  }, []);

  // Fetch active incident details when selectedIncidentId changes
  useEffect(() => {
    if (!selectedIncidentId) {
      setCurrentIncident(null);
      setIncidentTimeline([]);
      setIncidentGraph(null);
      setIncidentRecommendations([]);
      return;
    }

    let isMounted = true;
    const fetchIncidentDetails = async () => {
      try {
        const [inc, tl, gr, recs] = await Promise.all([
          api.getIncident(selectedIncidentId),
          api.getTimeline(selectedIncidentId),
          api.getGraph(selectedIncidentId),
          api.getRecommendations(selectedIncidentId),
        ]);

        if (isMounted) {
          setCurrentIncident(inc);
          setIncidentTimeline(tl);
          setIncidentGraph(gr);
          setIncidentRecommendations(recs);
        }
      } catch (err) {
        console.error('Failed to fetch incident details:', err);
      }
    };

    fetchIncidentDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId]);

  // Initial load
  useEffect(() => {
    refreshCore();
  }, [refreshCore]);

  // Run Scenario
  const handleRunScenario = async (scenarioOverride?: ScenarioType) => {
    const sc = scenarioOverride || selectedScenario;
    setIsLoading(true);
    setInsufficientDataNotice(null);
    try {
      // 1. Reset database first for deterministic reproducibility
      await api.resetDemo();

      // 2. Load chosen scenario
      const res = await api.loadScenario(sc);

      // Check if this scenario produced no incidents (e.g. Normal traffic)
      if (res.incident_ids.length === 0) {
        setInsufficientDataNotice('Insufficient evidence to confidently classify this activity.');
      }

      // 3. Refresh state
      await refreshCore();

      // 4. Select newly correlated incident
      if (res.incident_ids && res.incident_ids.length > 0) {
        setSelectedIncidentId(res.incident_ids[0]);
      }
    } catch (err: any) {
      console.error('Failed to run scenario:', err);
      alert(`Error running scenario: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Demo
  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      await api.resetDemo();
      setSelectedIncidentId(null);
      setCurrentIncident(null);
      setIncidentTimeline([]);
      setIncidentGraph(null);
      setIncidentRecommendations([]);
      setInsufficientDataNotice(null);
      await refreshCore();
    } catch (err: any) {
      console.error('Failed to reset demo:', err);
      alert(`Error resetting demo: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve Response Action
  const handleApproveAction = async (actionId: string) => {
    if (!selectedIncidentId) return;
    try {
      await api.approveResponse(selectedIncidentId, actionId, 'soc-lead-analyst');
      // Refresh active incident & simulated assets
      const [inc, recs, assets, logs] = await Promise.all([
        api.getIncident(selectedIncidentId),
        api.getRecommendations(selectedIncidentId),
        api.getSimulatedAssets(),
        api.getAudit(500),
      ]);
      setCurrentIncident(inc);
      setIncidentRecommendations(recs);
      setSimulatedAssets(assets);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to approve response:', err);
      alert(`Approval error: ${err.message}`);
    }
  };

  // Rollback Response Action
  const handleRollbackAction = async (actionId: string) => {
    if (!selectedIncidentId) return;
    try {
      await api.rollbackResponse(selectedIncidentId, actionId, 'soc-lead-analyst');
      const [inc, recs, assets, logs] = await Promise.all([
        api.getIncident(selectedIncidentId),
        api.getRecommendations(selectedIncidentId),
        api.getSimulatedAssets(),
        api.getAudit(500),
      ]);
      setCurrentIncident(inc);
      setIncidentRecommendations(recs);
      setSimulatedAssets(assets);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to rollback response:', err);
      alert(`Rollback error: ${err.message}`);
    }
  };

  // Navigate to Incident Hero
  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    changeTab('incidents');
  };

  // Open Raw Payload modal
  const handleInspectEvent = (evt: SecurityEvent) => {
    setPayloadModal({
      isOpen: true,
      title: `Event Telemetry Record: ${evt.id} (${evt.event_type})`,
      data: evt,
    });
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans flex flex-col">
      {/* Top Bar with brand status & scenario controls */}
      <TopBar
        currentTab={currentTab}
        onTabChange={changeTab}
        selectedScenario={selectedScenario}
        onScenarioChange={setSelectedScenario}
        onRunScenario={() => handleRunScenario()}
        onReplayClick={() => setIsReplayModalOpen(true)}
        onResetClick={handleResetDemo}
        onOpenJudgeGuide={() => setIsJudgeGuideOpen(true)}
        health={health}
        isLoading={isLoading}
        incidentCount={incidents.length}
        simulatedAssets={simulatedAssets}
      />

      {/* Backend Offline Banner */}
      {backendError && (
        <div className="bg-rose-950/90 border-b border-rose-700/80 px-6 py-2.5 flex items-center justify-between text-xs font-sans text-rose-200">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>BACKEND OFFLINE: {backendError}</span>
          </div>
          <button
            onClick={refreshCore}
            className="px-2.5 py-1 rounded bg-rose-900 hover:bg-rose-800 text-rose-100 font-bold"
          >
            RECONNECT
          </button>
        </div>
      )}

      {/* Insufficient Evidence / Benign Notice Banner (Prompt specified) */}
      {insufficientDataNotice && (
        <div className="bg-cyan-950/70 border-b border-cyan-800/80 px-6 py-2.5 flex items-center justify-between text-xs font-sans text-cyan-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>BENIGN ACTIVITY CLASSIFICATION: {insufficientDataNotice}</span>
          </div>
          <button
            onClick={() => setInsufficientDataNotice(null)}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-4">
        {currentTab === 'overview' && (
          <OverviewView
            events={events}
            alerts={alerts}
            incidents={incidents}
            simulatedAssets={simulatedAssets}
            onSelectIncident={handleSelectIncident}
            onInspectEvent={handleInspectEvent}
            onRefresh={refreshCore}
          />
        )}

        {currentTab === 'incidents' && (
          <IncidentHeroView
            incident={currentIncident}
            allIncidents={incidents}
            timelineEvents={incidentTimeline}
            graphData={incidentGraph}
            recommendations={incidentRecommendations}
            simulatedAssets={simulatedAssets}
            onSelectIncident={setSelectedIncidentId}
            onInspectEvent={handleInspectEvent}
            onApproveAction={handleApproveAction}
            onRollbackAction={handleRollbackAction}
          />
        )}

        {currentTab === 'threat-hunt' && (
          <ThreatHuntView
            events={events}
            onInspectEvent={handleInspectEvent}
          />
        )}

        {currentTab === 'attack-graph' && (
          <AttackGraphView
            graphData={incidentGraph}
            currentIncident={currentIncident}
            allIncidents={incidents}
            onSelectIncident={setSelectedIncidentId}
            onInspectEvent={handleInspectEvent}
            allEvents={events}
          />
        )}

        {currentTab === 'mitre' && (
          <MitreView
            currentIncident={currentIncident}
            allEvents={events}
            onInspectEvent={handleInspectEvent}
          />
        )}

        {currentTab === 'evaluation' && (
          <EvaluationView />
        )}

        {currentTab === 'audit' && (
          <AuditView
            logs={auditLogs}
            onInspectMetadata={(title, data) =>
              setPayloadModal({ isOpen: true, title, data })
            }
            onRefresh={refreshCore}
          />
        )}
      </main>

      {/* Global Modals */}
      <AttackReplayModal
        isOpen={isReplayModalOpen}
        onClose={() => {
          setIsReplayModalOpen(false);
          refreshCore();
        }}
        scenario={selectedScenario}
        onReplayComplete={refreshCore}
      />

      <JudgeGuideModal
        isOpen={isJudgeGuideOpen}
        onClose={() => setIsJudgeGuideOpen(false)}
        onLoadMultiStage={() => {
          setSelectedScenario('multi_stage');
          handleRunScenario('multi_stage');
        }}
      />

      <RawPayloadModal
        isOpen={payloadModal.isOpen}
        title={payloadModal.title}
        data={payloadModal.data}
        onClose={() => setPayloadModal({ isOpen: false, title: '', data: null })}
      />

      {/* Footer */}
      <footer className="w-full bg-[#0d1117] border-t border-slate-900 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs font-sans text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>KavachSOC v0.1.0 · SECURITY OPERATIONS PLATFORM</span>
        </div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0 text-[11px]">
          <span>SAFETY BOUNDARY: SIMULATION ONLY</span>
          <span className="text-slate-600">|</span>
          <a href="/docs" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-300">
            FASTAPI OPENAPI SPEC
          </a>
        </div>
      </footer>
    </div>
  );
};

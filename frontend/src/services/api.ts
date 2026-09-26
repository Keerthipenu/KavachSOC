import {
  Alert,
  AttackGraphData,
  AuditLog,
  EvaluationResult,
  Incident,
  ResponseAction,
  SecurityEvent,
  SimulatedAsset,
  SystemHealth,
} from '../types';

const BASE_URL = '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const body = await res.json();
        if (body.detail) errorMsg = body.detail;
      } catch {
        errorMsg = res.statusText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  getHealth: () => request<SystemHealth>('/health'),
  getEvents: (limit = 200) => request<SecurityEvent[]>(`/events?limit=${limit}`),
  getAlerts: (limit = 200) => request<Alert[]>(`/alerts?limit=${limit}`),
  getIncidents: (limit = 100) => request<Incident[]>(`/incidents?limit=${limit}`),
  getIncident: (id: string) => request<Incident>(`/incidents/${id}`),
  getTimeline: (id: string) => request<SecurityEvent[]>(`/incidents/${id}/timeline`),
  getGraph: (id: string) => request<AttackGraphData>(`/incidents/${id}/graph`),
  getInvestigation: (id: string) => request<any>(`/incidents/${id}/investigation`),
  getRecommendations: (id: string) => request<ResponseAction[]>(`/incidents/${id}/recommendations`),
  getAudit: (limit = 500) => request<AuditLog[]>(`/audit?limit=${limit}`),
  getEvaluation: () => request<EvaluationResult>('/evaluation'),
  getSimulatedAssets: () => request<SimulatedAsset[]>('/simulated-assets'),

  resetDemo: () => request<{ status: string }>('/demo/reset', { method: 'POST' }),

  loadScenario: (scenario: string) => 
    request<{ scenario: string; events_ingested: number; incident_ids: string[]; alert_count: number }>(
      `/demo/scenario/${scenario}`, 
      { method: 'POST' }
    ),

  approveResponse: (incidentId: string, actionId: string, approvedBy = 'soc-analyst-lead') =>
    request<ResponseAction>(`/incidents/${incidentId}/approve-response`, {
      method: 'POST',
      body: JSON.stringify({ action_id: actionId, approved_by: approvedBy }),
    }),

  rollbackResponse: (incidentId: string, actionId: string, actor = 'soc-analyst-lead') =>
    request<ResponseAction>(`/incidents/${incidentId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ action_id: actionId, actor }),
    }),

  // Replay Attack SSE Stream
  createReplayStream: (
    scenario: string,
    delayMs = 250,
    onEvent: (event: SecurityEvent) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ): (() => void) => {
    const sseUrl = `${BASE_URL}/demo/replay/${scenario}?delay_ms=${delayMs}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('security_event', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    });

    eventSource.addEventListener('replay_complete', () => {
      eventSource.close();
      onComplete();
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
      onError(err);
    };

    return () => {
      eventSource.close();
    };
  },
};

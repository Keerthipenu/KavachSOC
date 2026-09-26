export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ScenarioType = 
  | 'normal' 
  | 'brute_force' 
  | 'credential_compromise' 
  | 'lateral_movement' 
  | 'multi_stage' 
  | 'noisy';

export type TabType = 
  | 'overview' 
  | 'incidents' 
  | 'threat-hunt' 
  | 'attack-graph' 
  | 'mitre' 
  | 'evaluation' 
  | 'audit';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  source: 'endpoint' | 'network' | 'identity' | 'cloud' | string;
  event_type: string;
  user: string | null;
  host: string | null;
  source_ip: string | null;
  destination_ip: string | null;
  process: string | null;
  command: string | null;
  severity: Severity;
  raw_payload: Record<string, any>;
  label: 'benign' | 'malicious';
  scenario: string;
  ingested_at?: string;
}

export interface MitreTechnique {
  technique_id: string;
  technique_name: string;
  tactic: string;
  evidence: string[];
  confidence: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  title: string;
  severity: Severity;
  confidence: number;
  status: string;
  explanation: string;
  evidence: string[];
  mitre_technique: MitreTechnique[];
  incident_id: string | null;
  detector: 'RULE' | 'ML' | 'HYBRID' | string;
  rule_ids: string[];
  anomaly_score: number | null;
}

export interface Hypothesis {
  title: string;
  confidence_score: number;
  supporting_evidence: string[];
  contradicting_evidence: string[];
}

export interface InvestigationResult {
  hypotheses: Hypothesis[];
  likely_root_cause: string;
  evidence_chain: string[];
  note: string;
}

export interface AgentWorkflow {
  mode: string;
  orchestration: string;
  detection_analyst?: {
    patterns: string[];
    rule_ids: string[];
    evidence: string[];
    signals?: Array<{
      rule_id: string;
      title: string;
      severity: Severity;
      confidence: number;
      evidence: string[];
      rationale: string;
      detector?: 'RULE' | 'CORRELATION' | string;
    }>;
    coverage?: {
      matched_rules: number;
      correlation_signals?: number;
      evidence_events: number;
    };
  };
  investigation_agent?: InvestigationResult;
  mitre_agent?: {
    techniques: MitreTechnique[];
  };
}

export interface VerificationData {
  status?: string;
  before_suspicious_events?: number;
  after_suspicious_events?: number;
  asset?: string;
  asset_state?: string;
  note?: string;
}

export interface ResponseAction {
  id: string;
  incident_id: string;
  action: string;
  target: string;
  reason: string;
  risk: string;
  status: 'recommended' | 'executed' | 'rolled_back' | string;
  approved_by: string | null;
  timestamp: string;
  rollback_available: boolean;
  expected_effect: string;
  rollback_procedure: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  status: 'open' | 'contained' | 'closed' | string;
  start_time: string;
  end_time: string;
  root_cause: string | null;
  summary: string;
  event_ids: string[];
  investigation: AgentWorkflow;
  verification: VerificationData;
  alerts?: Alert[];
  recommendations?: ResponseAction[];
}

export interface AttackNode {
  id: string;
  node_type: 'ip' | 'account' | 'endpoint' | 'process' | string;
  label: string;
  timestamp?: string;
  evidence?: string[];
  event_ids?: string[];
  mitre_technique?: MitreTechnique | null;
  incident_id?: string;
  [key: string]: any;
}

export interface AttackEdge {
  id?: number;
  incident_id?: string;
  source: string;
  target: string;
  relationship: string;
  evidence: string[];
}

export interface AttackGraphData {
  nodes: AttackNode[];
  edges: AttackEdge[];
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  result: string;
  audit_metadata: Record<string, any>;
}

export interface SimulatedAsset {
  id: string;
  asset_type: string;
  state: 'ACTIVE' | 'ISOLATED' | 'DISABLED' | 'BLOCKED' | 'TERMINATED' | 'REVOKED' | string;
}

export interface Metrics {
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  precision: number;
  recall: number;
  f1: number;
  false_positive_rate: number;
}

export interface SentinelXMetrics extends Metrics {
  mean_detection_latency_seconds: number | null;
}

export interface ScenarioBreakdown {
  labelled_malicious: number;
  baseline_flagged: number;
  sentinel_x_flagged: number;
}

export interface EvaluationResult {
  dataset: {
    events: number;
    scenarios: number;
    source: string;
  };
  baseline: Metrics;
  sentinel_x: SentinelXMetrics;
  per_scenario: Record<string, ScenarioBreakdown>;
  methodology: string;
}

export interface SystemHealth {
  status: string;
  service: string;
  mode: string;
  real_actions_enabled: boolean;
}

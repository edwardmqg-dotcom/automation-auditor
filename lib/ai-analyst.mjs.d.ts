export type NormalizedAnalystInput = {
  evidence: {
    schema_version: "analyst-input-v0.1";
    product: "Automation Auditor";
    study_context?: {
      same_operator: boolean;
      repeated_material: boolean;
      fixed_order: boolean;
      prior_development_exposure: boolean;
      source_ref: string;
    };
    runs: Array<{
      run_id: string;
      mode: string;
      completion_basis?: "user_confirmation";
      timing_complete?: boolean;
      completion_criteria_ref?: string;
      automation_version_id: string;
      benchmark_id: string;
      task_id: string;
      task_version: string;
      review_as_of: string;
      human_active_ms: number;
      human_active_time_measured: boolean;
      intervention_count: number;
      rework_count: number;
      passed: boolean;
      first_pass: boolean;
      traceability_rate: number | null;
      events: Array<Record<string, string | number | boolean>>;
    }>;
  };
  allowedEvidenceRefs: string[];
  observationCatalog: ObservationCatalogEntry[];
  deterministicAnalysis: {
    executive_summary: string;
    comparison_scope: "single_run" | "multi_run";
    limitations: string[];
  };
};

export type ObservationCatalogEntry = {
  observation_id: string;
  category: "run_decision" | "traceability" | "human_time" | "human_event";
  title: string;
  observation: string;
  observation_confidence: "high";
  evidence_refs: string[];
};

export type AnalystOutput = {
  executive_summary: string;
  comparison_scope: "single_run" | "multi_run";
  findings: Array<{
    observation_id: string;
    title: string;
    observation: string;
    observation_confidence: "high" | "medium" | "low";
    possible_explanations: string[];
    evidence_needed: string[];
    evidence_refs: string[];
  }>;
  residual_human_work: Array<{
    observation_id: string;
    work: string;
    observed_context: string;
    cause_not_established: true;
    evidence_needed: string[];
    evidence_refs: string[];
  }>;
  recommended_next_experiment: string;
  limitations: string[];
};

export function normalizeAnalystInput(input: unknown): NormalizedAnalystInput;
export function buildAnalystMessages(evidence: NormalizedAnalystInput["evidence"], observationCatalog: ObservationCatalogEntry[]): Array<{ role: "system" | "user"; content: string }>;
export function parseAnalystResponse(modelText: string, observationCatalog: ObservationCatalogEntry[], deterministicAnalysis: NormalizedAnalystInput["deterministicAnalysis"]): AnalystOutput;

export type UserRole = "skull_admin" | "gestor" | "cliente_admin" | "cliente_user";
export type Recommendation = "atacar" | "analisar" | "evitar";
export type WorkingCapital = "baixo" | "medio" | "alto" | "critico";
export type ParticipantEligibility = "individual_allowed" | "company_required" | "unknown";
export type OpportunityVertical = "software" | "fuel_station" | "food_retail" | "construction_retail" | "automotive" | "office_stationery" | "pharmacy" | "clothing" | "architecture" | "unknown";

export interface OpportunityRequirements {
  technicalFit: string;
  qualification: string;
  certificates: string;
  team: string;
  physicalPresence: string;
  warranty: string;
  sla: string;
  implementation: string;
  smallBusiness: string;
  checklist: Array<{ label: string; met: boolean | null }>;
}

export interface Opportunity {
  id: string;
  tenant_id: string | null;
  pncp_id: string;
  agency_name: string;
  agency_cnpj: string;
  unit_name: string | null;
  city: string;
  state: string;
  object: string;
  modality: string;
  dispute_mode: string | null;
  estimated_value: number | null;
  published_at: string;
  opens_at: string | null;
  closes_at: string | null;
  status: string;
  pncp_url: string;
  process_number: string | null;
  purchase_number: string | null;
  year: number;
  documents_available: boolean | null;
  source_updated_at: string | null;
  source_names: string[];
  source_refs: Record<string, string>;
  distance_km: number | null;
  remote_execution: boolean;
  skull_score: number;
  pay_risk: number | null;
  competition_risk: number;
  working_capital: WorkingCapital;
  recommendation: Recommendation;
  score_explanation: string[];
  requirements: OpportunityRequirements;
  vertical?: OpportunityVertical;
  vertical_confidence?: number | null;
  vertical_evidence?: string[] | null;
  classification_version?: string | null;
  classified_at?: string | null;
  participant_eligibility?: ParticipantEligibility | null;
  eligibility_confidence?: number | null;
  eligibility_evidence?: string[] | null;
  eligibility_checked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  legal_name: string;
  trade_name: string;
  cnpj: string;
  city: string;
  state: string;
  cnaes: string[];
  products: string[];
  services: string[];
  service_regions: string[];
  available_cash: number | null;
  operational_capacity: string | null;
  positive_keywords: string[];
  negative_keywords: string[];
  created_at?: string;
}

export interface DashboardMetrics {
  newCount: number;
  greenCount: number;
  closingSoonCount: number;
  potentialValue: number;
  regionalCount: number;
  nationalCount: number;
  averageScore: number;
  averagePayRisk: number | null;
}

export interface SyncRun {
  id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  finished_at: string | null;
  found_count: number;
  inserted_count: number;
  updated_count: number;
  error_count: number;
  error_message: string | null;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  name: string;
  category: string;
  status: "valid" | "expiring" | "expired" | "missing";
  expires_at: string | null;
  storage_path: string | null;
}

export interface Participation {
  id: string;
  company_id: string;
  opportunity_id: string;
  stage: "watching" | "preparing" | "submitted" | "won" | "lost" | "withdrawn";
  notes: string | null;
  created_at: string;
}

export interface AlertRule {
  id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  filters: Record<string, unknown>;
  created_at: string;
}

export type Vertical =
  | "software"
  | "fuel_station"
  | "food_retail"
  | "construction_retail"
  | "automotive"
  | "office_stationery"
  | "pharmacy"
  | "clothing"
  | "architecture"
  | "unknown";

export type ParticipantEligibility = "individual_allowed" | "company_required" | "unknown";

export interface ClassificationInput {
  object?: string | null;
  items?: unknown;
  documents?: unknown;
}

export interface VerticalClassification {
  vertical: Vertical;
  confidence: number;
  matchedPositive: string[];
  matchedNegative: string[];
  reasons: string[];
  version: string;
}

export interface EligibilityClassification {
  status: ParticipantEligibility;
  confidence: number;
  evidence: string[];
  blockers: string[];
  version: string;
}

export interface WeightedTerm {
  term: string;
  weight: number;
}

export interface VerticalRule {
  vertical: Exclude<Vertical, "unknown">;
  label: string;
  description: string;
  defaultRadius: number;
  minimumScore: number;
  positive: readonly WeightedTerm[];
  negative: readonly string[];
}

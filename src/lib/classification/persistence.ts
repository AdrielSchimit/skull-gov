import { classifyEligibility } from "@/lib/classification/eligibility-classifier";
import type { ClassificationInput } from "@/lib/classification/types";
import { classifyVertical } from "@/lib/classification/vertical-classifier";

export function buildClassificationFields(input: ClassificationInput, checkedAt = new Date().toISOString()) {
  const vertical = classifyVertical(input);
  const eligibility = classifyEligibility(input);
  return {
    vertical: vertical.vertical,
    vertical_confidence: vertical.confidence,
    vertical_evidence: [...vertical.matchedPositive, ...vertical.matchedNegative, ...vertical.reasons],
    classification_version: vertical.version,
    classified_at: checkedAt,
    participant_eligibility: eligibility.status,
    eligibility_confidence: eligibility.confidence,
    eligibility_evidence: [...eligibility.evidence, ...eligibility.blockers],
    eligibility_checked_at: checkedAt,
  };
}

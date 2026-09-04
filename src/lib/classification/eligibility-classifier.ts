import { CLASSIFICATION_VERSION, ELIGIBILITY_BLOCKERS, ELIGIBILITY_POSITIVE } from "@/lib/classification/rules";
import { classificationText } from "@/lib/classification/vertical-classifier";
import type { ClassificationInput, EligibilityClassification } from "@/lib/classification/types";

function matches(text: string, terms: readonly string[]) {
  return terms.filter((term) => (` ${text} `).includes(` ${classificationText(term)} `));
}

export function classifyEligibility(input: ClassificationInput | string): EligibilityClassification {
  const text = classificationText(input);
  const blockers = matches(text, ELIGIBILITY_BLOCKERS);
  if (blockers.length) {
    return { status: "company_required", confidence: 0.98, evidence: [], blockers, version: CLASSIFICATION_VERSION };
  }
  const evidence = matches(text, ELIGIBILITY_POSITIVE);
  if (evidence.length) {
    return { status: "individual_allowed", confidence: evidence.length > 1 ? 0.98 : 0.9, evidence, blockers: [], version: CLASSIFICATION_VERSION };
  }
  return { status: "unknown", confidence: 0, evidence: [], blockers: [], version: CLASSIFICATION_VERSION };
}

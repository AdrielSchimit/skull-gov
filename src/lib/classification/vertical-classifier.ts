import { CLASSIFICATION_VERSION, VERTICAL_RULES } from "@/lib/classification/rules";
import type { ClassificationInput, Vertical, VerticalClassification } from "@/lib/classification/types";

export function normalizeClassificationText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function flatten(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === "object") return Object.values(value).flatMap(flatten);
  return [];
}

export function classificationText(input: ClassificationInput | string) {
  if (typeof input === "string") return normalizeClassificationText(input);
  return normalizeClassificationText([input.object ?? "", ...flatten(input.items), ...flatten(input.documents)].join(" "));
}

function hasTerm(text: string, term: string) {
  const needle = normalizeClassificationText(term);
  return needle.length > 0 && (` ${text} `).includes(` ${needle} `);
}

export function classifyVertical(input: ClassificationInput | string): VerticalClassification {
  const text = classificationText(input);
  if (!text) return { vertical: "unknown", confidence: 0, matchedPositive: [], matchedNegative: [], reasons: ["Texto insuficiente para classificar."], version: CLASSIFICATION_VERSION };

  const candidates = VERTICAL_RULES.map((rule) => {
    const matchedPositive = rule.positive.filter(({ term }) => hasTerm(text, term));
    const matchedNegative = rule.negative.filter((term) => hasTerm(text, term));
    const score = matchedPositive.reduce((total, match) => total + match.weight, 0);
    return { rule, matchedPositive, matchedNegative, score, blocked: matchedNegative.length > 0 };
  }).sort((a, b) => b.score - a.score || a.rule.vertical.localeCompare(b.rule.vertical));

  const eligible = candidates.filter(({ rule, score, blocked }) => !blocked && score >= rule.minimumScore);
  const winner = eligible[0];
  const runnerUp = eligible[1];
  if (!winner || (runnerUp && runnerUp.score === winner.score)) {
    const strongest = candidates[0];
    return {
      vertical: "unknown", confidence: 0,
      matchedPositive: strongest?.matchedPositive.map(({ term }) => term) ?? [],
      matchedNegative: strongest?.matchedNegative ?? [],
      reasons: [winner ? "Empate entre verticais; revisão necessária." : "Evidência positiva insuficiente ou bloqueada por contexto negativo."],
      version: CLASSIFICATION_VERSION,
    };
  }

  const margin = winner.score - (runnerUp?.score ?? 0);
  const confidence = Math.min(0.99, Number((0.55 + winner.score / 40 + margin / 80).toFixed(2)));
  return {
    vertical: winner.rule.vertical as Vertical,
    confidence,
    matchedPositive: winner.matchedPositive.map(({ term }) => term),
    matchedNegative: winner.matchedNegative,
    reasons: [`${winner.score} pontos em evidências positivas.`, `${margin} pontos de vantagem sobre a próxima vertical.`],
    version: CLASSIFICATION_VERSION,
  };
}

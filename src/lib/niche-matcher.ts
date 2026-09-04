import { classifyVertical, normalizeClassificationText, VERTICAL_RULES } from "@/lib/classification";
import type { Opportunity } from "@/lib/types";

const PROSPECTING_VERTICALS = [
  "food_retail", "construction_retail", "fuel_station", "automotive",
  "office_stationery", "pharmacy", "clothing",
] as const;

export type ProspectingProfileKey = (typeof PROSPECTING_VERTICALS)[number];
export type LegacyProspectingProfileKey = "fuel_retail";
export type ProspectingProfileInput = ProspectingProfileKey | LegacyProspectingProfileKey;

export const PROSPECTING_PROFILES = Object.fromEntries(
  VERTICAL_RULES
    .filter((rule) => PROSPECTING_VERTICALS.includes(rule.vertical as ProspectingProfileKey))
    .map((rule) => [rule.vertical, {
      label: rule.label,
      description: rule.description,
      defaultRadius: rule.defaultRadius,
      positive: rule.positive.map(({ term }) => term),
      negative: [...rule.negative],
    }]),
) as Record<ProspectingProfileKey, {
  label: string;
  description: string;
  defaultRadius: number;
  positive: string[];
  negative: string[];
}>;

export const normalizeNicheText = normalizeClassificationText;

export function resolveProspectingProfileKey(value: unknown): ProspectingProfileKey | null {
  if (value === "fuel_retail") return "fuel_station";
  return typeof value === "string" && value in PROSPECTING_PROFILES ? value as ProspectingProfileKey : null;
}

export function isProspectingProfileKey(value: unknown): value is ProspectingProfileInput {
  return resolveProspectingProfileKey(value) !== null;
}

export function matchesProspectingOpportunity(
  item: Pick<Opportunity, "object" | "distance_km">,
  profileKey: ProspectingProfileInput,
  radiusKm: number,
) {
  const canonical = resolveProspectingProfileKey(profileKey);
  return canonical !== null
    && classifyVertical({ object: item.object }).vertical === canonical
    && typeof item.distance_km === "number"
    && item.distance_km <= radiusKm;
}

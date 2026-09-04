import { createHash } from "node:crypto";
import type { MarketDataQuality, MarketProvenance, MarketSourceSystem } from "@/lib/market-intelligence/types";

export function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(sortObject(value))).digest("hex");
}

export function buildProvenance(input: {
  sourceSystem: MarketSourceSystem;
  sourceKey: string;
  sourceUrl: string;
  sourceUpdatedAt?: string | null;
  raw: unknown;
  dataQuality?: MarketDataQuality;
  ingestedAt?: string;
}): MarketProvenance {
  return {
    sourceSystem: input.sourceSystem,
    sourceKey: input.sourceKey,
    sourceUrl: input.sourceUrl,
    sourceUpdatedAt: input.sourceUpdatedAt ?? null,
    ingestedAt: input.ingestedAt ?? new Date().toISOString(),
    rawHash: stableHash(input.raw),
    dataQuality: input.dataQuality ?? "official_structured",
  };
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortObject(item)]));
}


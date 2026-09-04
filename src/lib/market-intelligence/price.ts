export function normalizeUnit(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toUpperCase() || null;
}

export function calculateComparablePriceDelta(input: {
  estimatedUnitValue: number | null;
  finalUnitValue: number | null;
  estimatedUnit: string | null;
  finalUnit: string | null;
}) {
  if (input.estimatedUnitValue === null || input.finalUnitValue === null) return null;
  if (input.estimatedUnitValue <= 0 || input.finalUnitValue < 0) return null;
  if (normalizeUnit(input.estimatedUnit) !== normalizeUnit(input.finalUnit)) return null;
  return Number((((input.finalUnitValue - input.estimatedUnitValue) / input.estimatedUnitValue) * 100).toFixed(4));
}


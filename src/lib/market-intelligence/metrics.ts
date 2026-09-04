import type { MarketCoverageStatus, MarketResult, MarketSupplierMetrics } from "@/lib/market-intelligence/types";

export function aggregateSupplierMetrics(input: {
  supplierKey: string;
  results: MarketResult[];
  participatedProcurementKeys?: Set<string>;
  participatedItemKeys?: Set<string>;
  distinctBuyerKeys?: Set<string>;
  distinctCategories?: Set<string>;
  participantCoverageStatus?: MarketCoverageStatus;
}): MarketSupplierMetrics {
  const ownResults = input.results.filter((result) => result.supplierKey === input.supplierKey);
  const wonProcurements = new Set(ownResults.map((result) => result.procurementKey));
  const wonItems = new Set(ownResults.map((result) => result.itemKey));
  const resultDates = ownResults.flatMap((result) => result.resultDate ? [result.resultDate] : []);
  const participantCoverageStatus = input.participantCoverageStatus ?? "unknown";
  const procurementsParticipated = input.participatedProcurementKeys?.size ?? 0;
  const itemsParticipated = input.participatedItemKeys?.size ?? 0;

  return {
    procurementsIdentified: wonProcurements.size,
    itemsIdentified: wonItems.size,
    procurementsWon: wonProcurements.size,
    itemsWon: wonItems.size,
    homologatedValue: ownResults.reduce((total, result) => total + (result.homologatedTotalValue ?? 0), 0),
    contractedValue: null,
    distinctBuyers: input.distinctBuyerKeys?.size ?? 0,
    distinctCategories: input.distinctCategories?.size ?? 0,
    firstActivityAt: resultDates.sort()[0] ?? null,
    lastActivityAt: resultDates.sort().at(-1) ?? null,
    winRateProcurements: participantCoverageStatus === "complete" && procurementsParticipated > 0 ? wonProcurements.size / procurementsParticipated : null,
    winRateItems: participantCoverageStatus === "complete" && itemsParticipated > 0 ? wonItems.size / itemsParticipated : null,
    participantCoverageStatus,
  };
}


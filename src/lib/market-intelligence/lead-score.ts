import type { MarketLeadScore, MarketSupplierIdentity, MarketSupplierMetrics } from "@/lib/market-intelligence/types";

export const MARKET_LEAD_SCORE_VERSION = "2026.09.market-mvp.1";

export function scoreMarketLead(supplier: MarketSupplierIdentity, metrics: MarketSupplierMetrics): MarketLeadScore {
  if (supplier.kind !== "pj") {
    return {
      totalScore: null,
      scoreVersion: MARKET_LEAD_SCORE_VERSION,
      explanation: ["Score comercial não é calculado para fornecedor pessoa física ou identidade não PJ."],
      activityScore: 0,
      lossOpportunityScore: null,
      buyerConcentrationScore: 0,
      marketFitScore: 0,
      recencyScore: 0,
      coverageScore: 0,
    };
  }

  const activityScore = Math.min(30, metrics.itemsWon * 4 + metrics.procurementsWon * 3);
  const lossOpportunityScore = metrics.winRateItems === null ? null : Math.round((1 - metrics.winRateItems) * 20);
  const buyerConcentrationScore = metrics.distinctBuyers <= 1 && metrics.homologatedValue > 0 ? 15 : metrics.distinctBuyers <= 3 ? 10 : 4;
  const marketFitScore = metrics.distinctCategories > 0 ? Math.min(15, metrics.distinctCategories * 5) : 5;
  const recencyScore = metrics.lastActivityAt ? 15 : 0;
  const coverageScore = metrics.participantCoverageStatus === "complete" ? 5 : 2;
  const totalScore = activityScore + (lossOpportunityScore ?? 0) + buyerConcentrationScore + marketFitScore + recencyScore + coverageScore;

  return {
    totalScore: Math.min(100, totalScore),
    scoreVersion: MARKET_LEAD_SCORE_VERSION,
    explanation: [
      "Score determinístico baseado em atividade GOV estruturada, concentração de compradores, categorias, recência e cobertura.",
      metrics.winRateItems === null ? "Taxa de vitória desconhecida porque a cobertura de participantes está incompleta." : "Taxa de vitória calculada com cobertura de participantes completa.",
    ],
    activityScore,
    lossOpportunityScore,
    buyerConcentrationScore,
    marketFitScore,
    recencyScore,
    coverageScore,
  };
}


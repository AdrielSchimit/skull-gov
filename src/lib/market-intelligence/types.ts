export type MarketSourceSystem = "compras_gov" | "pncp";
export type MarketSupplierKind = "pj" | "pf" | "foreign" | "unknown";
export type MarketDataQuality = "official_structured" | "official_document" | "inferred" | "unavailable";
export type MarketCoverageStatus = "complete" | "partial" | "unknown";

export interface MarketProvenance {
  sourceSystem: MarketSourceSystem;
  sourceKey: string;
  sourceUrl: string;
  sourceUpdatedAt: string | null;
  ingestedAt: string;
  rawHash: string;
  dataQuality: MarketDataQuality;
}

export interface MarketSupplierIdentity {
  kind: MarketSupplierKind;
  normalizedCnpj: string | null;
  maskedDocument: string | null;
  legalName: string;
  tradeName: string | null;
  city: string | null;
  state: string | null;
  mainCnae: string | null;
  sourceAliases: Array<{ sourceSystem: MarketSourceSystem; sourceKey: string }>;
}

export interface MarketBuyerIdentity {
  agencyCnpj: string | null;
  agencyName: string;
  unitName: string | null;
  uasg: string | null;
  city: string | null;
  state: string | null;
  municipalityCode: string | null;
}

export interface MarketProcurementIdentity {
  procurementKey: string;
  sourceSystem: MarketSourceSystem;
  sourceKey: string;
  pncpControlNumber: string | null;
  idCompra: string | null;
  buyerKey: string;
  modality: string | null;
  processNumber: string | null;
  purchaseNumber: string | null;
  year: number | null;
  object: string | null;
  coverageStatus: MarketCoverageStatus;
  provenance: MarketProvenance;
}

export interface MarketProcurementItem {
  itemKey: string;
  procurementKey: string;
  sourceKey: string;
  itemNumber: number | null;
  description: string;
  detailedDescription: string | null;
  materialOrService: string | null;
  catalogCode: string | null;
  classCode: string | null;
  groupCode: string | null;
  unit: string | null;
  quantity: number | null;
  estimatedUnitValue: number | null;
  estimatedTotalValue: number | null;
  hasStructuredResult: boolean | null;
  provenance: MarketProvenance;
}

export interface MarketResult {
  resultKey: string;
  procurementKey: string;
  itemKey: string;
  supplierKey: string;
  supplierKind: MarketSupplierKind;
  homologatedQuantity: number | null;
  homologatedUnitValue: number | null;
  homologatedTotalValue: number | null;
  discountPercent: number | null;
  status: string | null;
  resultDate: string | null;
  rank: number | null;
  provenance: MarketProvenance;
}

export interface MarketSupplierMetrics {
  procurementsIdentified: number;
  itemsIdentified: number;
  procurementsWon: number;
  itemsWon: number;
  homologatedValue: number;
  contractedValue: number | null;
  distinctBuyers: number;
  distinctCategories: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  winRateProcurements: number | null;
  winRateItems: number | null;
  participantCoverageStatus: MarketCoverageStatus;
}

export interface MarketLeadScore {
  totalScore: number | null;
  scoreVersion: string;
  explanation: string[];
  activityScore: number;
  lossOpportunityScore: number | null;
  buyerConcentrationScore: number;
  marketFitScore: number;
  recencyScore: number;
  coverageScore: number;
}


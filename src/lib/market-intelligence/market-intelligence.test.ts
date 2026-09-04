import { describe, expect, it } from "vitest";
import {
  aggregateSupplierMetrics,
  calculateComparablePriceDelta,
  canParseOfficialHistoricalDocument,
  maskBrazilianDocument,
  mergeSupplierIdentities,
  normalizeCnpj,
  scoreMarketLead,
} from "@/lib/market-intelligence";
import { normalizeComprasGovItem, normalizeComprasGovResult } from "@/lib/market-intelligence/adapters/compras-gov-history";
import type { MarketResult, MarketSupplierIdentity } from "@/lib/market-intelligence/types";

const supplier: MarketSupplierIdentity = {
  kind: "pj",
  normalizedCnpj: "12345678000195",
  maskedDocument: "12.345.678/0001-95",
  legalName: "Fornecedor Exemplo Ltda",
  tradeName: null,
  city: "Barrinha",
  state: "SP",
  mainCnae: "6201501",
  sourceAliases: [{ sourceSystem: "compras_gov", sourceKey: "12345678000195" }],
};

const result: MarketResult = {
  resultKey: "compras_gov:result:1",
  procurementKey: "pncp:00000000000191-1-000001/2025",
  itemKey: "compras_gov:item:item-1",
  supplierKey: "pj:12345678000195",
  supplierKind: "pj",
  homologatedQuantity: 10,
  homologatedUnitValue: 90,
  homologatedTotalValue: 900,
  discountPercent: 10,
  status: "Homologado",
  resultDate: "2025-03-10T00:00:00Z",
  rank: null,
  provenance: {
    sourceSystem: "compras_gov",
    sourceKey: "item-1:1",
    sourceUrl: "https://dadosabertos.compras.gov.br/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133",
    sourceUpdatedAt: "2025-03-10T00:00:00Z",
    ingestedAt: "2026-09-04T00:00:00Z",
    rawHash: "fixture",
    dataQuality: "official_structured",
  },
};

describe("Market intelligence foundation", () => {
  it("normalizes CNPJ to exactly 14 digits and rejects invalid values", () => {
    expect(normalizeCnpj("12.345.678/0001-95")).toBe("12345678000195");
    expect(normalizeCnpj("00.000.000/0000-00")).toBeNull();
    expect(normalizeCnpj("123")).toBeNull();
  });

  it("masks CPF and keeps formatted CNPJ only for presentation", () => {
    expect(maskBrazilianDocument("12345678901")).toBe("***.456.789-**");
    expect(maskBrazilianDocument("12345678000195")).toBe("12.345.678/0001-95");
  });

  it("deduplicates the same PJ from multiple sources by normalized CNPJ", () => {
    const [merged] = mergeSupplierIdentities([
      supplier,
      { ...supplier, legalName: "Fornecedor Exemplo", sourceAliases: [{ sourceSystem: "pncp", sourceKey: "alias-pncp" }] },
    ]);
    expect(merged.sourceAliases).toHaveLength(2);
  });

  it("normalizes a structured Compras.gov item with official provenance", () => {
    const item = normalizeComprasGovItem({
      idCompra: "compra-1",
      idCompraItem: "item-1",
      numeroControlePNCPCompra: "00000000000191-1-000001/2025",
      descricaoResumida: "Óleo diesel S-10",
      unidadeMedida: "Litro",
      quantidade: 100,
      valorUnitarioEstimado: 7,
      valorTotal: 700,
      temResultado: true,
    }, "2026-09-04T00:00:00Z");
    expect(item?.itemKey).toBe("compras_gov:item:item-1");
    expect(item?.provenance.dataQuality).toBe("official_structured");
  });

  it("normalizes winner result without creating market participation", () => {
    const normalized = normalizeComprasGovResult({
      idCompra: "compra-1",
      idCompraItem: "item-1",
      numeroControlePNCPCompra: "00000000000191-1-000001/2025",
      sequencialResultado: 1,
      niFornecedor: "12.345.678/0001-95",
      tipoPessoa: "PJ",
      nomeRazaoSocialFornecedor: "Fornecedor Exemplo Ltda",
      quantidadeHomologada: 100,
      valorUnitarioHomologado: 6.5,
      valorTotalHomologado: 650,
      situacaoCompraItemResultadoNome: "Homologado",
    }, "2026-09-04T00:00:00Z");
    expect(normalized?.supplier.normalizedCnpj).toBe("12345678000195");
    expect(normalized?.result.homologatedTotalValue).toBe(650);
    expect(Object.keys(normalized ?? {})).not.toContain("participation");
  });

  it("calculates price delta only when units are compatible", () => {
    expect(calculateComparablePriceDelta({ estimatedUnitValue: 100, finalUnitValue: 90, estimatedUnit: "unidade", finalUnit: " Unidade " })).toBe(-10);
    expect(calculateComparablePriceDelta({ estimatedUnitValue: 100, finalUnitValue: 90, estimatedUnit: "caixa", finalUnit: "unidade" })).toBeNull();
  });

  it("keeps supplier metrics by procurement and item, with unknown win rate under incomplete coverage", () => {
    const metrics = aggregateSupplierMetrics({ supplierKey: "pj:12345678000195", results: [result], participantCoverageStatus: "partial" });
    expect(metrics.procurementsWon).toBe(1);
    expect(metrics.itemsWon).toBe(1);
    expect(metrics.homologatedValue).toBe(900);
    expect(metrics.contractedValue).toBeNull();
    expect(metrics.winRateItems).toBeNull();
  });

  it("calculates win rate only with complete participant coverage", () => {
    const metrics = aggregateSupplierMetrics({
      supplierKey: "pj:12345678000195",
      results: [result],
      participatedProcurementKeys: new Set(["pncp:00000000000191-1-000001/2025", "pncp:00000000000191-1-000002/2025"]),
      participatedItemKeys: new Set(["compras_gov:item:item-1", "compras_gov:item:item-2"]),
      participantCoverageStatus: "complete",
    });
    expect(metrics.winRateProcurements).toBe(0.5);
    expect(metrics.winRateItems).toBe(0.5);
  });

  it("does not calculate commercial lead score for PF", () => {
    const metrics = aggregateSupplierMetrics({ supplierKey: "pf:***.456.789-**", results: [], participantCoverageStatus: "unknown" });
    const score = scoreMarketLead({ ...supplier, kind: "pf", normalizedCnpj: null }, metrics);
    expect(score.totalScore).toBeNull();
  });

  it("records outside-gov wording as covered-source absence, not universal never-sold claim", () => {
    const covered = { coverageStart: "2024-09-01", coverageEnd: "2026-09-01", coveredSources: ["Compras.gov", "PNCP"], label: "Não encontrado nas fontes cobertas no período analisado." };
    expect(covered.label).toContain("fontes cobertas");
  });

  it("document parser rejects active or non-public sessions", () => {
    expect(canParseOfficialHistoricalDocument({ procurementStatus: "Sessão pública em disputa", sourceUrl: "https://pncp.gov.br/doc.pdf", isPubliclyAccessible: true }).allowed).toBe(false);
    expect(canParseOfficialHistoricalDocument({ procurementStatus: "Homologado", sourceUrl: null, isPubliclyAccessible: false }).allowed).toBe(false);
    expect(canParseOfficialHistoricalDocument({ procurementStatus: "Encerrado e homologado", sourceUrl: "https://pncp.gov.br/doc.pdf", isPubliclyAccessible: true }).allowed).toBe(true);
  });
});


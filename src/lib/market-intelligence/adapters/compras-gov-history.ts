import { z } from "zod";
import { buildProvenance } from "@/lib/market-intelligence/provenance";
import { normalizeCnpj, supplierKeyFromDocument } from "@/lib/market-intelligence/cnpj";
import type {
  MarketProcurementItem,
  MarketResult,
  MarketSupplierIdentity,
  MarketSupplierKind,
} from "@/lib/market-intelligence/types";

const BASE_URL = "https://dadosabertos.compras.gov.br";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export const COMPRAS_GOV_HISTORY_ENDPOINTS = {
  items: "/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133",
  results: "/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133",
  suppliers: "/modulo-fornecedor/1_consultarFornecedor",
} as const;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const pageQuerySchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(500).default(100),
  agencyCnpj: z.string().regex(/^\d{14}$/).optional(),
  unitCode: z.string().min(1).max(30).optional(),
  supplierDocument: z.string().min(1).optional(),
});

export interface ComprasGovHistoryPage<T> {
  resultado?: T[];
  totalRegistros?: number;
  totalPaginas?: number;
  paginasRestantes?: number;
}

export interface ComprasGovProcurementItemRow {
  idCompra?: string;
  idCompraItem?: string;
  idContratacaoPNCP?: string;
  orgaoEntidadeCnpj?: string;
  unidadeOrgaoCodigoUnidade?: string;
  numeroItemPncp?: number | null;
  numeroItemCompra?: number | null;
  descricaoResumida?: string;
  descricaodetalhada?: string;
  materialOuServico?: string;
  materialOuServicoNome?: string;
  codigoClasse?: number | null;
  codigoGrupo?: number | null;
  codItemCatalogo?: number | null;
  unidadeMedida?: string | null;
  quantidade?: number | null;
  valorUnitarioEstimado?: number | null;
  valorTotal?: number | null;
  temResultado?: boolean | null;
  dataInclusaoPncp?: string | null;
  dataAtualizacaoPncp?: string | null;
  numeroControlePNCPCompra?: string | null;
}

export interface ComprasGovResultRow {
  idCompraItem?: string;
  idCompra?: string;
  idContratacaoPNCP?: string;
  orgaoEntidadeCnpj?: string;
  unidadeOrgaoCodigoUnidade?: string;
  numeroItemPncp?: number | null;
  sequencialResultado?: number | null;
  niFornecedor?: string | null;
  tipoPessoa?: string | null;
  nomeRazaoSocialFornecedor?: string | null;
  ordemClassificacaoSrp?: number | null;
  quantidadeHomologada?: number | null;
  valorUnitarioHomologado?: number | null;
  valorTotalHomologado?: number | null;
  percentualDesconto?: number | null;
  situacaoCompraItemResultadoNome?: string | null;
  dataResultadoPncp?: string | null;
  dataAtualizacaoPncp?: string | null;
  numeroControlePNCPCompra?: string | null;
}

export interface ComprasGovSupplierRow {
  ativo?: boolean | null;
  cnpj?: string | null;
  cpf?: string | null;
  codigoCnae?: number | null;
  nomeCnae?: string | null;
  nomeMunicipio?: string | null;
  nomeRazaoSocialFornecedor?: string | null;
  ufSigla?: string | null;
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request<T>(url: URL, attempt = 0): Promise<ComprasGovHistoryPage<T>> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "SKULL-GOV/market-intelligence" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        return request<T>(url, attempt + 1);
      }
      throw new Error(`Compras.gov respondeu com HTTP ${response.status}.`);
    }
    return (await response.json()) as ComprasGovHistoryPage<T>;
  } catch (error) {
    if (attempt < MAX_RETRIES && (error instanceof TypeError || error instanceof DOMException)) {
      await sleep(500 * 2 ** attempt);
      return request<T>(url, attempt + 1);
    }
    throw error;
  }
}

export async function fetchComprasGovHistoricalItems(input: z.input<typeof pageQuerySchema>) {
  const query = pageQuerySchema.parse(input);
  const url = new URL(`${BASE_URL}${COMPRAS_GOV_HISTORY_ENDPOINTS.items}`);
  url.searchParams.set("pagina", String(query.page));
  url.searchParams.set("tamanhoPagina", String(query.pageSize));
  url.searchParams.set("dataInclusaoPncpInicial", query.startDate);
  url.searchParams.set("dataInclusaoPncpFinal", query.endDate);
  if (query.agencyCnpj) url.searchParams.set("orgaoEntidadeCnpj", query.agencyCnpj);
  if (query.unitCode) url.searchParams.set("unidadeOrgaoCodigoUnidade", query.unitCode);
  if (query.supplierDocument) url.searchParams.set("codFornecedor", query.supplierDocument);
  return request<ComprasGovProcurementItemRow>(url);
}

export async function fetchComprasGovHistoricalResults(input: z.input<typeof pageQuerySchema>) {
  const query = pageQuerySchema.parse(input);
  const url = new URL(`${BASE_URL}${COMPRAS_GOV_HISTORY_ENDPOINTS.results}`);
  url.searchParams.set("pagina", String(query.page));
  url.searchParams.set("tamanhoPagina", String(query.pageSize));
  url.searchParams.set("dataResultadoPncpInicial", query.startDate);
  url.searchParams.set("dataResultadoPncpFinal", query.endDate);
  if (query.agencyCnpj) url.searchParams.set("orgaoEntidadeCnpj", query.agencyCnpj);
  if (query.unitCode) url.searchParams.set("unidadeOrgaoCodigoUnidade", query.unitCode);
  if (query.supplierDocument) url.searchParams.set("niFornecedor", query.supplierDocument);
  return request<ComprasGovResultRow>(url);
}

export function normalizeComprasGovItem(row: ComprasGovProcurementItemRow, ingestedAt = new Date().toISOString()): MarketProcurementItem | null {
  const sourceKey = row.idCompraItem ?? `${row.idCompra ?? "sem-compra"}:${row.numeroItemPncp ?? row.numeroItemCompra ?? "sem-item"}`;
  const procurementKey = procurementKeyFromComprasGov(row.idCompra, row.numeroControlePNCPCompra ?? row.idContratacaoPNCP);
  const description = row.descricaoResumida?.trim() || row.descricaodetalhada?.trim();
  if (!procurementKey || !description) return null;
  return {
    itemKey: `compras_gov:item:${sourceKey}`,
    procurementKey,
    sourceKey,
    itemNumber: row.numeroItemPncp ?? row.numeroItemCompra ?? null,
    description,
    detailedDescription: row.descricaodetalhada?.trim() || null,
    materialOrService: row.materialOuServicoNome?.trim() || row.materialOuServico?.trim() || null,
    catalogCode: row.codItemCatalogo === null || row.codItemCatalogo === undefined ? null : String(row.codItemCatalogo),
    classCode: row.codigoClasse === null || row.codigoClasse === undefined ? null : String(row.codigoClasse),
    groupCode: row.codigoGrupo === null || row.codigoGrupo === undefined ? null : String(row.codigoGrupo),
    unit: row.unidadeMedida?.trim() || null,
    quantity: row.quantidade ?? null,
    estimatedUnitValue: row.valorUnitarioEstimado ?? null,
    estimatedTotalValue: row.valorTotal ?? null,
    hasStructuredResult: row.temResultado ?? null,
    provenance: buildProvenance({
      sourceSystem: "compras_gov",
      sourceKey,
      sourceUrl: `${BASE_URL}${COMPRAS_GOV_HISTORY_ENDPOINTS.items}`,
      sourceUpdatedAt: row.dataAtualizacaoPncp ?? row.dataInclusaoPncp ?? null,
      raw: row,
      ingestedAt,
    }),
  };
}

export function normalizeComprasGovResult(row: ComprasGovResultRow, ingestedAt = new Date().toISOString()): { supplier: MarketSupplierIdentity; result: MarketResult } | null {
  const supplierKind = supplierKindFromComprasGov(row.tipoPessoa);
  const supplierKey = supplierKeyFromDocument(row.tipoPessoa, row.niFornecedor);
  const procurementKey = procurementKeyFromComprasGov(row.idCompra, row.numeroControlePNCPCompra ?? row.idContratacaoPNCP);
  const itemKey = row.idCompraItem ? `compras_gov:item:${row.idCompraItem}` : null;
  if (!supplierKey || !procurementKey || !itemKey || !row.nomeRazaoSocialFornecedor) return null;
  const resultSourceKey = `${row.idCompraItem}:${row.sequencialResultado ?? "resultado"}`;
  return {
    supplier: {
      kind: supplierKind,
      normalizedCnpj: supplierKind === "pj" ? normalizeCnpj(row.niFornecedor) : null,
      maskedDocument: supplierKind === "pf" ? supplierKey.replace(/^pf:/, "") : null,
      legalName: row.nomeRazaoSocialFornecedor.trim(),
      tradeName: null,
      city: null,
      state: null,
      mainCnae: null,
      sourceAliases: [{ sourceSystem: "compras_gov", sourceKey: row.niFornecedor ?? supplierKey }],
    },
    result: {
      resultKey: `compras_gov:result:${resultSourceKey}`,
      procurementKey,
      itemKey,
      supplierKey,
      supplierKind,
      homologatedQuantity: row.quantidadeHomologada ?? null,
      homologatedUnitValue: row.valorUnitarioHomologado ?? null,
      homologatedTotalValue: row.valorTotalHomologado ?? null,
      discountPercent: row.percentualDesconto ?? null,
      status: row.situacaoCompraItemResultadoNome?.trim() || null,
      resultDate: row.dataResultadoPncp ?? null,
      rank: row.ordemClassificacaoSrp ?? null,
      provenance: buildProvenance({
        sourceSystem: "compras_gov",
        sourceKey: resultSourceKey,
        sourceUrl: `${BASE_URL}${COMPRAS_GOV_HISTORY_ENDPOINTS.results}`,
        sourceUpdatedAt: row.dataAtualizacaoPncp ?? row.dataResultadoPncp ?? null,
        raw: row,
        ingestedAt,
      }),
    },
  };
}

function procurementKeyFromComprasGov(idCompra?: string | null, pncpControl?: string | null) {
  if (pncpControl?.trim()) return `pncp:${pncpControl.trim()}`;
  if (idCompra?.trim()) return `compras_gov:compra:${idCompra.trim()}`;
  return null;
}

function supplierKindFromComprasGov(value: string | null | undefined): MarketSupplierKind {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "PJ") return "pj";
  if (normalized === "PF") return "pf";
  if (normalized === "EX") return "foreign";
  return "unknown";
}

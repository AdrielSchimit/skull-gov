import "server-only";

import type { PncpContracting } from "@/lib/pncp/pncp-types";

const BASE_URL = "https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export const COMPRAS_GOV_MODALITIES = [1, 2, 3, 4, 5, 6, 7, 12, 20, 22, 33, 44, 57] as const;

interface ComprasGovRow {
  numeroControlePNCP?: string;
  anoCompraPncp?: number;
  orgaoEntidadeCnpj?: string;
  orgaoEntidadeRazaoSocial?: string;
  unidadeOrgaoNomeUnidade?: string;
  unidadeOrgaoUfSigla?: string;
  unidadeOrgaoMunicipioNome?: string;
  numeroCompra?: string;
  modalidadeNome?: string;
  modoDisputaNomePncp?: string;
  processo?: string;
  objetoCompra?: string;
  situacaoCompraNomePncp?: string;
  valorTotalEstimado?: number | null;
  dataPublicacaoPncp?: string;
  dataAberturaPropostaPncp?: string | null;
  dataEncerramentoPropostaPncp?: string | null;
  dataAtualizacaoPncp?: string | null;
  dataAualizacaoPncp?: string | null;
}

interface ComprasGovPage {
  resultado?: ComprasGovRow[];
  totalRegistros?: number;
  totalPaginas?: number;
  paginasRestantes?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url: URL, attempt = 0): Promise<ComprasGovPage> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "SKULL-GOV/1.1" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        await sleep(400 * 2 ** attempt);
        return request(url, attempt + 1);
      }
      throw new Error(`Compras.gov respondeu com HTTP ${response.status}.`);
    }
    return (await response.json()) as ComprasGovPage;
  } catch (error) {
    if (attempt < MAX_RETRIES && (error instanceof TypeError || error instanceof DOMException)) {
      await sleep(400 * 2 ** attempt);
      return request(url, attempt + 1);
    }
    throw error;
  }
}

export async function fetchComprasGovContractings(input: {
  startDate: string;
  endDate: string;
  modalityCode: number;
  page?: number;
  pageSize?: number;
  state?: string;
}) {
  const url = new URL(BASE_URL);
  url.searchParams.set("pagina", String(input.page ?? 1));
  url.searchParams.set("tamanhoPagina", String(input.pageSize ?? 100));
  url.searchParams.set("dataPublicacaoPncpInicial", input.startDate);
  url.searchParams.set("dataPublicacaoPncpFinal", input.endDate);
  url.searchParams.set("codigoModalidade", String(input.modalityCode));
  if (input.state) url.searchParams.set("unidadeOrgaoUfSigla", input.state);
  const page = await request(url);
  return {
    data: (page.resultado ?? []).map(toPncpShape),
    totalRegistros: page.totalRegistros ?? 0,
    totalPaginas: page.totalPaginas ?? 0,
    paginasRestantes: page.paginasRestantes ?? 0,
  };
}

function toPncpShape(row: ComprasGovRow): PncpContracting {
  return {
    numeroControlePNCP: row.numeroControlePNCP,
    numeroCompra: row.numeroCompra,
    anoCompra: row.anoCompraPncp,
    processo: row.processo,
    objetoCompra: row.objetoCompra,
    valorTotalEstimado: row.valorTotalEstimado ?? null,
    dataPublicacaoPncp: row.dataPublicacaoPncp,
    dataAberturaProposta: row.dataAberturaPropostaPncp ?? null,
    dataEncerramentoProposta: row.dataEncerramentoPropostaPncp ?? null,
    dataAtualizacao: row.dataAtualizacaoPncp ?? row.dataAualizacaoPncp ?? null,
    modalidadeNome: row.modalidadeNome,
    modoDisputaNome: row.modoDisputaNomePncp ?? null,
    situacaoCompraNome: row.situacaoCompraNomePncp,
    orgaoEntidade: {
      cnpj: row.orgaoEntidadeCnpj,
      razaoSocial: row.orgaoEntidadeRazaoSocial,
    },
    unidadeOrgao: {
      nomeUnidade: row.unidadeOrgaoNomeUnidade,
      municipioNome: row.unidadeOrgaoMunicipioNome,
      ufSigla: row.unidadeOrgaoUfSigla,
    },
  };
}

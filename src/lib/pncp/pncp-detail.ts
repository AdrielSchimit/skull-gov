import "server-only";

const PNCP_INTEGRATION_BASE = "https://pncp.gov.br/pncp-api/v1";

type PncpCoordinates = { cnpj: string; year: number; sequence: number };

export type PncpDocument = {
  sequencialDocumento?: number;
  tipoDocumentoId?: number;
  tipoDocumentoNome?: string;
  titulo?: string;
  dataPublicacaoPncp?: string;
  uri?: string;
};

export type PncpItem = {
  numeroItem?: number;
  descricao?: string;
  materialOuServico?: string;
  quantidade?: number;
  unidadeMedida?: string;
  valorUnitarioEstimado?: number;
  valorTotal?: number;
  criterioJulgamentoNome?: string;
  tipoBeneficioNome?: string;
};

export function parsePncpCoordinates(pncpUrl: string): PncpCoordinates | null {
  const match = pncpUrl.match(/\/app\/(?:editais|contratos)\/(\d{14})\/(\d{4})\/(\d+)/i);
  if (!match) return null;
  return { cnpj: match[1], year: Number(match[2]), sequence: Number(match[3]) };
}

async function publicPncpGet<T>(path: string): Promise<T> {
  const response = await fetch(`${PNCP_INTEGRATION_BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": "SKULL-GOV/1.0" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`PNCP detalhe respondeu HTTP ${response.status}.`);
  return await response.json() as T;
}

export async function fetchPncpDocuments(pncpUrl: string): Promise<PncpDocument[]> {
  const ref = parsePncpCoordinates(pncpUrl);
  if (!ref) return [];
  try {
    const data = await publicPncpGet<unknown>(`/orgaos/${ref.cnpj}/compras/${ref.year}/${ref.sequence}/arquivos`);
    return Array.isArray(data) ? data as PncpDocument[] : [];
  } catch {
    return [];
  }
}

export async function fetchPncpItems(pncpUrl: string): Promise<PncpItem[]> {
  const ref = parsePncpCoordinates(pncpUrl);
  if (!ref) return [];
  try {
    const data = await publicPncpGet<unknown>(`/orgaos/${ref.cnpj}/compras/${ref.year}/${ref.sequence}/itens`);
    return Array.isArray(data) ? data as PncpItem[] : [];
  } catch {
    return [];
  }
}

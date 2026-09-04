import "server-only";

import { z } from "zod";
import type { PncpContracting, PncpPage, PncpQuery } from "@/lib/pncp/pncp-types";

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta";
const MAX_RETRIES = 2;
const TIMEOUT_MS = 15_000;

export interface PncpRequestOptions {
  cacheSeconds?: number;
}

const querySchema = z.object({
  startDate: z.string().regex(/^\d{8}$/),
  endDate: z.string().regex(/^\d{8}$/),
  modalityCode: z.number().int().min(1).max(14),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(50).default(20),
  state: z.string().regex(/^[A-Z]{2}$/).optional(),
  municipalityIbgeCode: z.string().regex(/^\d{7}$/).optional(),
});

export class PncpError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "PncpError";
  }
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request<T>(url: URL, cacheSeconds: number, attempt = 0): Promise<T> {
  try {
    const cacheOptions = cacheSeconds > 0 ? { next: { revalidate: cacheSeconds } } : { cache: "no-store" as const };
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "SKULL-GOV/1.0" },
      ...cacheOptions,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 204) {
      return { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, paginasRestantes: 0, empty: true } as T;
    }
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        await wait(400 * 2 ** attempt);
        return request<T>(url, cacheSeconds, attempt + 1);
      }
      throw new PncpError(`PNCP respondeu com HTTP ${response.status}.`, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (attempt < MAX_RETRIES && (error instanceof TypeError || error instanceof DOMException)) {
      await wait(400 * 2 ** attempt);
      return request<T>(url, cacheSeconds, attempt + 1);
    }
    if (error instanceof PncpError) throw error;
    throw new PncpError(error instanceof Error ? `Falha ao consultar PNCP: ${error.message}` : "Falha desconhecida ao consultar PNCP.");
  }
}

export async function fetchPublishedContractings(query: PncpQuery, options: PncpRequestOptions = { cacheSeconds: 300 }) {
  const parsed = querySchema.parse(query);
  const url = new URL(`${PNCP_BASE_URL}/v1/contratacoes/publicacao`);
  url.searchParams.set("dataInicial", parsed.startDate);
  url.searchParams.set("dataFinal", parsed.endDate);
  url.searchParams.set("codigoModalidadeContratacao", String(parsed.modalityCode));
  url.searchParams.set("pagina", String(parsed.page));
  url.searchParams.set("tamanhoPagina", String(parsed.pageSize));
  if (parsed.state) url.searchParams.set("uf", parsed.state);
  if (parsed.municipalityIbgeCode) url.searchParams.set("codigoMunicipioIbge", parsed.municipalityIbgeCode);
  return request<PncpPage<PncpContracting>>(url, options.cacheSeconds ?? 300);
}

export async function fetchOpenContractings(query: Omit<PncpQuery, "startDate">, options: PncpRequestOptions = { cacheSeconds: 300 }) {
  const parsed = querySchema.omit({ startDate: true }).parse(query);
  const url = new URL(`${PNCP_BASE_URL}/v1/contratacoes/proposta`);
  url.searchParams.set("dataFinal", parsed.endDate);
  url.searchParams.set("codigoModalidadeContratacao", String(parsed.modalityCode));
  url.searchParams.set("pagina", String(parsed.page));
  url.searchParams.set("tamanhoPagina", String(parsed.pageSize));
  if (parsed.state) url.searchParams.set("uf", parsed.state);
  if (parsed.municipalityIbgeCode) url.searchParams.set("codigoMunicipioIbge", parsed.municipalityIbgeCode);
  return request<PncpPage<PncpContracting>>(url, options.cacheSeconds ?? 300);
}

export const PNCP_MODALITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

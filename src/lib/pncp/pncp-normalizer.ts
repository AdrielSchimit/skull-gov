import { distanceFromBarrinha } from "@/lib/geo";
import type { PncpContracting } from "@/lib/pncp/pncp-types";
import { scoreOpportunity } from "@/lib/scoring";
import type { Opportunity } from "@/lib/types";

function parsePncpId(value: string) {
  const match = value.match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  return match ? { cnpj: match[1], sequence: Number(match[2]), year: Number(match[3]) } : null;
}

function canonicalPncpUrl(id: string, fallback?: string | null) {
  const parsed = parsePncpId(id);
  if (parsed) return `https://pncp.gov.br/app/editais/${parsed.cnpj}/${parsed.year}/${parsed.sequence}`;
  return fallback ?? "https://pncp.gov.br/app/editais";
}

export function normalizeContracting(
  source: PncpContracting,
  metadata: { sourceName?: string; sourceRef?: string } = {},
): Omit<Opportunity, "id" | "tenant_id"> | null {
  const pncpId = source.numeroControlePNCP?.trim();
  const object = source.objetoCompra?.trim();
  const agencyCnpj = source.orgaoEntidade?.cnpj?.replace(/\D/g, "");
  const publishedAt = source.dataPublicacaoPncp;
  const year = source.anoCompra ?? parsePncpId(pncpId ?? "")?.year;
  if (!pncpId || !object || !agencyCnpj || !publishedAt || !year) return null;
  const city = source.unidadeOrgao?.municipioNome?.trim() || "Município não informado";
  const state = source.unidadeOrgao?.ufSigla?.trim().toUpperCase() || "--";
  const distanceKm = distanceFromBarrinha(city, state);
  const scoring = scoreOpportunity({
    object,
    estimatedValue: source.valorTotalEstimado ?? null,
    distanceKm,
    closesAt: source.dataEncerramentoProposta ?? null,
    modality: source.modalidadeNome ?? "Não informada",
    disputeMode: source.modoDisputaNome ?? null,
  });
  const sourceName = metadata.sourceName ?? "PNCP";
  const sourceRef = metadata.sourceRef ?? canonicalPncpUrl(pncpId, source.linkSistemaOrigem);
  return {
    pncp_id: pncpId,
    agency_name: source.orgaoEntidade?.razaoSocial?.trim() || "Órgão não informado",
    agency_cnpj: agencyCnpj,
    unit_name: source.unidadeOrgao?.nomeUnidade?.trim() || null,
    city,
    state,
    object,
    modality: source.modalidadeNome?.trim() || "Não informada",
    dispute_mode: source.modoDisputaNome?.trim() || null,
    estimated_value: source.valorTotalEstimado ?? null,
    published_at: publishedAt,
    opens_at: source.dataAberturaProposta ?? null,
    closes_at: source.dataEncerramentoProposta ?? null,
    status: source.situacaoCompraNome?.trim() || "Não informada",
    pncp_url: canonicalPncpUrl(pncpId, source.linkSistemaOrigem),
    process_number: source.processo?.trim() || null,
    purchase_number: source.numeroCompra?.trim() || null,
    year,
    documents_available: null,
    source_updated_at: source.dataAtualizacao ?? null,
    source_names: [sourceName],
    source_refs: { [sourceName]: sourceRef },
    distance_km: distanceKm,
    remote_execution: scoring.remoteExecution,
    skull_score: scoring.skullScore,
    pay_risk: scoring.payRisk,
    competition_risk: scoring.competitionRisk,
    working_capital: scoring.workingCapital,
    recommendation: scoring.recommendation,
    score_explanation: scoring.explanation,
    requirements: scoring.requirements,
  };
}

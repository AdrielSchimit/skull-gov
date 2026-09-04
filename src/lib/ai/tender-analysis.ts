import "server-only";

import type { Opportunity } from "@/lib/types";
import { fetchPncpDocuments, fetchPncpItems, type PncpDocument } from "@/lib/pncp/pncp-detail";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 2;

export type TenderAiSummary = {
  resumo_executivo?: string;
  objeto?: string;
  valor_estimado?: string | number | null;
  prazo_proposta?: string | null;
  modalidade?: string | null;
  itens_relevantes?: Array<{ item?: number; descricao?: string; quantidade?: number | null; unidade?: string | null; valor_estimado?: number | null }>;
  habilitacao?: string[];
  atestados?: string[];
  equipe_minima?: string[];
  presenca_fisica?: string | null;
  garantia?: string | null;
  sla?: string | null;
  prazo_implantacao_entrega?: string | null;
  pagamento?: string | null;
  me_epp?: string | null;
  visita_tecnica?: string | null;
  riscos?: string[];
  documentos_faltantes?: string[];
  perguntas_para_validar?: string[];
  recomendacao?: "ATACAR" | "ANALISAR" | "EVITAR";
  confianca?: number;
  aviso?: string;
};

export function getAiStatus() {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    provider: "Google Gemini",
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
  };
}

async function loadPdfParts(documents: PncpDocument[]) {
  const priority = [...documents].sort((a, b) => {
    const rank = (doc: PncpDocument) => /edital/i.test(doc.titulo ?? "") ? 0 : /termo de refer|tr\b/i.test(doc.titulo ?? "") ? 1 : 2;
    return rank(a) - rank(b);
  });
  const parts: Array<Record<string, unknown>> = [];
  for (const document of priority) {
    if (parts.length >= MAX_FILES) break;
    if (!document.uri) continue;
    try {
      const response = await fetch(document.uri, { signal: AbortSignal.timeout(20_000), headers: { "User-Agent": "SKULL-GOV/1.0" } });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "";
      const declared = Number(response.headers.get("content-length") ?? 0);
      if (!contentType.includes("pdf") || declared > MAX_FILE_BYTES) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_FILE_BYTES) continue;
      parts.push({ inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } });
    } catch {
      // A análise continua com metadados/itens quando o arquivo não puder ser baixado.
    }
  }
  return parts;
}

export async function analyzeTenderWithGemini(opportunity: Opportunity): Promise<{ summary: TenderAiSummary; provider: string; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada.");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const [documents, items] = await Promise.all([fetchPncpDocuments(opportunity.pncp_url), fetchPncpItems(opportunity.pncp_url)]);
  const pdfParts = await loadPdfParts(documents);

  const prompt = `Você é o analista de licitações do SKULL GOV. Analise SOMENTE os dados públicos e PDFs anexados. Não invente exigências. Quando algo não estiver explícito, use \"não identificado\" e inclua em perguntas_para_validar.\n\nRetorne JSON válido com as chaves: resumo_executivo, objeto, valor_estimado, prazo_proposta, modalidade, itens_relevantes, habilitacao, atestados, equipe_minima, presenca_fisica, garantia, sla, prazo_implantacao_entrega, pagamento, me_epp, visita_tecnica, riscos, documentos_faltantes, perguntas_para_validar, recomendacao (ATACAR|ANALISAR|EVITAR), confianca (0-100), aviso.\n\nRegras:\n- destaque capital de giro e prazo de pagamento;\n- diferencie fornecimento de bens de serviço/software;\n- não faça acusação sobre órgão ou concorrentes;\n- considere itens reais quando fornecidos;\n- \"documentos_faltantes\" significa documentos que a empresa precisará comprovar, não arquivos ausentes do PNCP;\n- se os PDFs não estiverem anexados, deixe claro no aviso que a leitura foi parcial.\n\nOPORTUNIDADE:\n${JSON.stringify({
    pncp_id: opportunity.pncp_id,
    orgao: opportunity.agency_name,
    cnpj_orgao: opportunity.agency_cnpj,
    municipio: opportunity.city,
    uf: opportunity.state,
    objeto: opportunity.object,
    modalidade: opportunity.modality,
    valor_estimado: opportunity.estimated_value,
    abertura: opportunity.opens_at,
    encerramento: opportunity.closes_at,
    processo: opportunity.process_number,
    compra: opportunity.purchase_number,
    ano: opportunity.year,
    documentos: documents.map((d) => ({ titulo: d.titulo, tipo: d.tipoDocumentoNome, data: d.dataPublicacaoPncp })),
    itens: items.slice(0, 250),
  })}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, ...pdfParts] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) throw new Error(`Gemini respondeu HTTP ${response.status}.`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini não retornou análise textual.");
  let summary: TenderAiSummary;
  try { summary = JSON.parse(text) as TenderAiSummary; } catch { throw new Error("Gemini retornou JSON inválido."); }
  if (!pdfParts.length) summary.aviso = summary.aviso || "Leitura parcial: nenhum PDF do edital foi anexado ao modelo; análise baseada em metadados, documentos listados e itens públicos.";
  return { summary, provider: "Google Gemini", model };
}

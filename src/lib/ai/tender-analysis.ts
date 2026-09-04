import "server-only";

import type { Opportunity } from "@/lib/types";
import { fetchPncpDocuments, fetchPncpItems, type PncpDocument } from "@/lib/pncp/pncp-detail";

const DEFAULT_OPENROUTER_MODEL = "z-ai/glm-5.2:free";
const DEFAULT_OPENROUTER_FALLBACK_MODEL = "nvidia/nemotron-3.5-lightning:free";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
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

type AnalysisResult = { summary: TenderAiSummary; provider: string; model: string };

type TenderContext = {
  documents: PncpDocument[];
  items: unknown[];
  prompt: string;
};

export function getAiStatus() {
  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const openRouterModel = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const openRouterFallback = process.env.OPENROUTER_FALLBACK_MODEL || DEFAULT_OPENROUTER_FALLBACK_MODEL;
  const geminiModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  return {
    configured: openRouterConfigured || geminiConfigured,
    provider: openRouterConfigured ? "OpenRouter" : geminiConfigured ? "Google Gemini" : "Nenhum",
    model: openRouterConfigured ? openRouterModel : geminiModel,
    fallbacks: [
      ...(openRouterConfigured && openRouterFallback !== openRouterModel ? [`OpenRouter · ${openRouterFallback}`] : []),
      ...(geminiConfigured ? [`Google Gemini · ${geminiModel}`] : []),
    ],
  };
}

function rankDocument(doc: PncpDocument) {
  const title = doc.titulo ?? "";
  if (/edital/i.test(title)) return 0;
  if (/termo de refer|\btr\b/i.test(title)) return 1;
  if (/anexo|projeto|memorial|planilha/i.test(title)) return 2;
  return 3;
}

function priorityDocuments(documents: PncpDocument[]) {
  return [...documents].sort((a, b) => rankDocument(a) - rankDocument(b)).filter((doc) => Boolean(doc.uri)).slice(0, MAX_FILES);
}

async function loadGeminiPdfParts(documents: PncpDocument[]) {
  const parts: Array<Record<string, unknown>> = [];
  for (const document of priorityDocuments(documents)) {
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
      // Continua com metadados e itens se um arquivo não puder ser baixado.
    }
  }
  return parts;
}

function buildPrompt(opportunity: Opportunity, documents: PncpDocument[], items: unknown[]) {
  return `Você é o analista de licitações do SKULL GOV. Analise SOMENTE os dados públicos e os documentos fornecidos. Não invente exigências. Quando algo não estiver explícito, use "não identificado" e inclua em perguntas_para_validar.

Retorne APENAS JSON válido com as chaves: resumo_executivo, objeto, valor_estimado, prazo_proposta, modalidade, itens_relevantes, habilitacao, atestados, equipe_minima, presenca_fisica, garantia, sla, prazo_implantacao_entrega, pagamento, me_epp, visita_tecnica, riscos, documentos_faltantes, perguntas_para_validar, recomendacao (ATACAR|ANALISAR|EVITAR), confianca (0-100), aviso.

Regras:
- destaque capital de giro, prazo de pagamento e desembolso antecipado;
- diferencie fornecimento de bens de serviço/software;
- não faça acusação sobre órgão ou concorrentes;
- considere itens reais quando fornecidos;
- "documentos_faltantes" significa documentos que a empresa precisará comprovar, não arquivos ausentes do PNCP;
- se o conteúdo integral do edital não estiver disponível, deixe isso explícito no aviso;
- seja conservador: ausência de evidência nunca significa requisito dispensado.

OPORTUNIDADE:
${JSON.stringify({
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
    documentos: documents.map((d) => ({ titulo: d.titulo, tipo: d.tipoDocumentoNome, data: d.dataPublicacaoPncp, uri: d.uri })),
    itens: items.slice(0, 250),
  })}`;
}

async function loadTenderContext(opportunity: Opportunity): Promise<TenderContext> {
  const [documents, items] = await Promise.all([fetchPncpDocuments(opportunity.pncp_url), fetchPncpItems(opportunity.pncp_url)]);
  return { documents, items, prompt: buildPrompt(opportunity, documents, items) };
}

function parseJsonLoose(text: string): TenderAiSummary {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as TenderAiSummary;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try { return JSON.parse(cleaned.slice(first, last + 1)) as TenderAiSummary; } catch { /* fall through */ }
    }
    throw new Error("O modelo retornou JSON inválido.");
  }
}

async function analyzeWithOpenRouterModel(context: TenderContext, model: string): Promise<AnalysisResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada.");

  const files = priorityDocuments(context.documents).map((document, index) => ({
    type: "file",
    file: {
      filename: (document.titulo || `edital-${index + 1}.pdf`).replace(/[\\/:*?"<>|]/g, "-").slice(0, 120),
      file_data: document.uri,
    },
  }));
  const supportsStructuredOutput = !/nemotron/i.test(model);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://skull-gov.vercel.app",
      "X-OpenRouter-Title": "SKULL GOV",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: context.prompt }, ...files] }],
      temperature: 0.1,
      max_tokens: 5000,
      ...(supportsStructuredOutput ? { response_format: { type: "json_object" } } : {}),
      plugins: [
        { id: "file-parser", pdf: { engine: "cloudflare-ai" } },
        ...(supportsStructuredOutput ? [{ id: "response-healing" }] : []),
      ],
    }),
    signal: AbortSignal.timeout(75_000),
  });

  const payload = await response.json().catch(() => ({})) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(`OpenRouter/${model} respondeu HTTP ${response.status}${payload.error?.message ? `: ${payload.error.message}` : "."}`);
  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error(`OpenRouter/${model} não retornou análise textual.`);
  const summary = parseJsonLoose(text);
  if (!files.length) summary.aviso = summary.aviso || "Leitura parcial: nenhum PDF público foi enviado ao modelo; análise baseada em metadados, documentos listados e itens públicos.";
  return { summary, provider: "OpenRouter", model };
}

export async function analyzeTenderWithGemini(opportunity: Opportunity, context?: TenderContext): Promise<AnalysisResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada.");
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const resolved = context ?? await loadTenderContext(opportunity);
  const pdfParts = await loadGeminiPdfParts(resolved.documents);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: resolved.prompt }, ...pdfParts] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) throw new Error(`Gemini respondeu HTTP ${response.status}.`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini não retornou análise textual.");
  const summary = parseJsonLoose(text);
  if (!pdfParts.length) summary.aviso = summary.aviso || "Leitura parcial: nenhum PDF do edital foi anexado ao modelo; análise baseada em metadados, documentos listados e itens públicos.";
  return { summary, provider: "Google Gemini", model };
}

export async function analyzeTender(opportunity: Opportunity): Promise<AnalysisResult> {
  const context = await loadTenderContext(opportunity);
  const errors: string[] = [];

  if (process.env.OPENROUTER_API_KEY) {
    const models = [
      process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
      process.env.OPENROUTER_FALLBACK_MODEL || DEFAULT_OPENROUTER_FALLBACK_MODEL,
    ].filter((value, index, self) => value && self.indexOf(value) === index);

    for (const model of models) {
      try { return await analyzeWithOpenRouterModel(context, model); }
      catch (error) { errors.push(error instanceof Error ? error.message : `Falha no OpenRouter/${model}.`); }
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try { return await analyzeTenderWithGemini(opportunity, context); }
    catch (error) { errors.push(error instanceof Error ? error.message : "Falha no Gemini."); }
  }

  if (!errors.length) throw new Error("Nenhum provedor de IA configurado. Adicione OPENROUTER_API_KEY ou GEMINI_API_KEY na Vercel.");
  throw new Error(`Todos os provedores de IA falharam: ${errors.join(" | ")}`);
}

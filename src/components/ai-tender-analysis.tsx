"use client";

import { Bot, FileSearch, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import styles from "@/components/ai-tender-analysis.module.css";

type Analysis = {
  resumo_executivo?: string;
  pagamento?: string | null;
  me_epp?: string | null;
  garantia?: string | null;
  sla?: string | null;
  prazo_implantacao_entrega?: string | null;
  visita_tecnica?: string | null;
  habilitacao?: string[];
  atestados?: string[];
  equipe_minima?: string[];
  riscos?: string[];
  documentos_faltantes?: string[];
  perguntas_para_validar?: string[];
  recomendacao?: string;
  confianca?: number;
  aviso?: string;
};

export function AiTenderAnalysis({ opportunityId, configured, model }: { opportunityId: string; configured: boolean; model: string }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível analisar o edital.");
      setAnalysis(body.analysis as Analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na análise.");
    } finally { setLoading(false); }
  }

  return <section className={`panel ${styles.panel}`}>
    <div className="section-heading">
      <div><span className="eyebrow">SKULL IA</span><h2>Leitura do edital e checklist</h2><p>A IA consulta documentos e itens públicos do PNCP e devolve uma leitura operacional. Sempre valide o edital original.</p></div>
      <span className={`${styles.status} ${configured ? styles.ready : styles.waiting}`}><Bot size={15} />{configured ? `Pronta · ${model}` : "Aguardando API Key"}</span>
    </div>

    {!analysis && <div className={styles.readyBox}>
      <FileSearch size={28} />
      <div><strong>{configured ? "Analisar esta oportunidade agora" : "Infraestrutura pronta para receber a IA"}</strong><p>{configured ? "Vamos puxar os arquivos públicos disponíveis, itens e metadados para gerar o resumo." : "Assim que GEMINI_API_KEY for adicionada à Vercel, este botão passa a analisar os editais sem alteração de código."}</p></div>
      <button className="button button-primary" onClick={run} disabled={!configured || loading}>{loading ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}{loading ? "Lendo edital…" : "Analisar com SKULL IA"}</button>
    </div>}

    {error && <p className={styles.error} role="alert">{error}</p>}
    {analysis && <div className={styles.result}>
      <div className={styles.hero}><span className="eyebrow">RESUMO EXECUTIVO</span><h3>{analysis.recomendacao || "ANÁLISE"} {typeof analysis.confianca === "number" ? `· ${analysis.confianca}% confiança` : ""}</h3><p>{analysis.resumo_executivo || "Resumo não informado."}</p></div>
      <div className="facts-grid">
        <div className="fact"><small>Pagamento</small><strong>{analysis.pagamento || "Não identificado"}</strong></div>
        <div className="fact"><small>ME/EPP</small><strong>{analysis.me_epp || "Não identificado"}</strong></div>
        <div className="fact"><small>Garantia</small><strong>{analysis.garantia || "Não identificada"}</strong></div>
        <div className="fact"><small>SLA</small><strong>{analysis.sla || "Não identificado"}</strong></div>
        <div className="fact"><small>Prazo de entrega/implantação</small><strong>{analysis.prazo_implantacao_entrega || "Não identificado"}</strong></div>
        <div className="fact"><small>Visita técnica</small><strong>{analysis.visita_tecnica || "Não identificada"}</strong></div>
      </div>
      {[
        ["Habilitação", analysis.habilitacao], ["Atestados", analysis.atestados], ["Equipe mínima", analysis.equipe_minima], ["Riscos", analysis.riscos], ["Documentos para preparar", analysis.documentos_faltantes], ["O que ainda validar", analysis.perguntas_para_validar],
      ].map(([title, values]) => Array.isArray(values) && values.length ? <div className="analysis-item" key={String(title)}><strong>{title as string}</strong><ul className="score-lines">{values.map((value) => <li key={value}>{value}</li>)}</ul></div> : null)}
      {analysis.aviso && <p className="disclaimer">{analysis.aviso}</p>}
    </div>}
  </section>;
}

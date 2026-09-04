import { ArrowUpRight, Check, HelpCircle, X } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader, RecommendationBadge, SetupNotice } from "@/components/ui";
import { formatCnpj, formatCurrency, formatDate } from "@/lib/format";
import { getOpportunity } from "@/lib/data";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOpportunity(id);
  if (result.configured && !result.data) notFound();
  const opportunity = result.data;
  if (!opportunity) return <><PageHeader eyebrow="ANÁLISE" title="Oportunidade indisponível." description="Conecte o Supabase para carregar a análise solicitada." /><div className="content-stack"><SetupNotice /></div></>;
  const requirements = opportunity.requirements;
  const analyses = requirements ? [
    ["Aderência", requirements.technicalFit], ["Habilitação", requirements.qualification], ["Atestados", requirements.certificates], ["Equipe", requirements.team],
    ["Presença física", requirements.physicalPresence], ["Garantia", requirements.warranty], ["SLA", requirements.sla], ["Implantação", requirements.implementation], ["ME/EPP", requirements.smallBusiness],
  ] : [];
  return <><PageHeader eyebrow={`PNCP ${opportunity.pncp_id}`} title={`${opportunity.city}/${opportunity.state} · ${opportunity.agency_name}`} description="Leitura inicial explicável. Valide sempre o edital e os anexos antes de decidir." action={<a className="button button-secondary" href={opportunity.pncp_url} target="_blank" rel="noreferrer">Abrir no PNCP <ArrowUpRight size={16} /></a>} />
    <div className="content-stack"><div className="detail-grid"><div className="content-stack">
      <section className="panel"><RecommendationBadge value={opportunity.recommendation} /><h1 className="detail-object">{opportunity.object}</h1><div className="facts-grid"><div className="fact"><small>Órgão</small><strong>{opportunity.agency_name}</strong></div><div className="fact"><small>CNPJ</small><strong>{formatCnpj(opportunity.agency_cnpj)}</strong></div><div className="fact"><small>Distância de Barrinha</small><strong>{opportunity.distance_km === null ? "Não catalogada" : `${opportunity.distance_km} km`}</strong></div><div className="fact"><small>Valor estimado</small><strong>{formatCurrency(opportunity.estimated_value)}</strong></div><div className="fact"><small>Encerramento</small><strong>{formatDate(opportunity.closes_at, true)}</strong></div><div className="fact"><small>Modalidade</small><strong>{opportunity.modality}</strong></div><div className="fact"><small>Situação</small><strong>{opportunity.status}</strong></div><div className="fact"><small>Processo</small><strong>{opportunity.process_number ?? "Não informado"}</strong></div><div className="fact"><small>Compra / ano</small><strong>{opportunity.purchase_number ?? "—"} / {opportunity.year}</strong></div></div></section>
      <section className="panel"><h2>Leitura operacional</h2><div className="analysis-list">{analyses.map(([label, text]) => <div className="analysis-item" key={label}><strong>{label}</strong><p>{text}</p></div>)}</div></section>
      <section className="panel"><h2>O que falta para participar</h2><ul className="checklist">{(requirements?.checklist ?? []).map((item) => <li key={item.label}><span className={`check-state ${item.met === true ? "yes" : item.met === false ? "no" : ""}`}>{item.met === true ? <Check size={13} /> : item.met === false ? <X size={13} /> : <HelpCircle size={13} />}</span>{item.label}</li>)}</ul></section>
    </div><aside className="content-stack"><section className="panel"><h2>Decisão</h2><div className="risk-grid"><div className="risk-card"><small>SKULL Score</small><strong>{opportunity.skull_score}</strong><span>0 a 100 · aderência geral</span></div><div className="risk-card"><small>Pay Risk</small><strong>{opportunity.pay_risk ?? "—"}</strong><span>{opportunity.pay_risk === null ? "Dados insuficientes" : "0 baixo · 100 alto"}</span></div><div className="risk-card"><small>Competition Risk</small><strong>{opportunity.competition_risk}</strong><span>Estimativa, não número de concorrentes</span></div><div className="risk-card"><small>Capital de giro</small><strong className={`capital-${opportunity.working_capital}`}>{opportunity.working_capital.toUpperCase()}</strong><span>Classificação determinística</span></div></div><p className="disclaimer">Estimativa baseada em sinais públicos, não representa número confirmado de concorrentes.</p></section><section className="panel"><h2>Como o score foi formado</h2><ul className="score-lines">{opportunity.score_explanation.map((line) => <li key={line}>{line}</li>)}</ul></section></aside></div></div>
  </>;
}

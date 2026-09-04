import { Banknote, CircleGauge, Clock3, Globe2, MapPinned, Sparkles } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, SetupNotice, DataError, OpportunityCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { getDashboardMetrics, getOpportunities } from "@/lib/data";

export const metadata = { title: "Dashboard" };

function Metric({ label, value, note, icon: Icon, highlight = false }: { label: string; value: string | number; note: string; icon: typeof Sparkles; highlight?: boolean }) {
  return <article className={`metric-card${highlight ? " highlight" : ""}`}><span className="metric-label">{label}<Icon size={17} /></span><strong className="metric-value">{value}</strong><small className="metric-note">{note}</small></article>;
}

export default async function DashboardPage() {
  const [{ metrics, configured, error }, opportunities] = await Promise.all([getDashboardMetrics(), getOpportunities({ filter: "attack", pageSize: 3 })]);
  return <><PageHeader eyebrow="VISÃO EXECUTIVA" title="O que merece sua atenção hoje." description="Oportunidades públicas classificadas por aderência, esforço de caixa e distância da operação." action={<Link className="button button-primary" href="/radar">Abrir radar</Link>} />
    <div className="content-stack">
      {!configured && <SetupNotice />}{error && <DataError message={error} />}
      <section className="metric-grid" aria-label="Indicadores principais">
        <Metric label="Novas em 24h" value={metrics.newCount} note="Publicações recebidas" icon={Sparkles} />
        <Metric label="Oportunidades verdes" value={metrics.greenCount} note="Recomendação ATACAR" icon={CircleGauge} highlight />
        <Metric label="Prazo em 48h" value={metrics.closingSoonCount} note="Exigem decisão rápida" icon={Clock3} />
        <Metric label="Valor potencial" value={formatCurrency(metrics.potentialValue)} note="Amostra recente, valor estimado" icon={Banknote} />
        <Metric label="Na região" value={metrics.regionalCount} note="Até 200 km de Barrinha" icon={MapPinned} />
        <Metric label="Nacionais" value={metrics.nationalCount} note="Remotas ou acima de 200 km" icon={Globe2} />
        <Metric label="Média SKULL Score" value={metrics.averageScore} note="Amostra das 500 mais recentes" icon={CircleGauge} />
        <Metric label="Média Pay Risk" value={metrics.averagePayRisk ?? "—"} note={metrics.averagePayRisk === null ? "Dados insuficientes" : "0 baixo · 100 alto"} icon={Banknote} />
      </section>
      <section className="decision-board"><div className="decision-board-head"><h2>Fila de decisão</h2><span>Critérios transparentes, sem caixa-preta</span></div><div className="decision-columns"><div className="decision-column"><span className="decision decision-atacar"><i />ATACAR</span><p>Score ≥ 70, baixo capital de giro e execução compatível com a SKULL.</p></div><div className="decision-column"><span className="decision decision-analisar"><i />ANALISAR</span><p>Há aderência, mas algum requisito, prazo ou custo ainda precisa de validação.</p></div><div className="decision-column"><span className="decision decision-evitar"><i />EVITAR</span><p>Baixa aderência, mercadoria relevante ou risco operacional desproporcional.</p></div></div></section>
      <section><div className="section-heading"><div><h2>Prioridades verdes</h2><p>As melhores oportunidades disponíveis para a configuração atual.</p></div><Link className="button button-secondary" href="/oportunidades?filter=attack">Ver todas</Link></div></section>
      {opportunities.data.length ? <div className="opportunity-list">{opportunities.data.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <EmptyState title="Nenhuma oportunidade verde ainda" description="Sincronize o PNCP para analisar as publicações reais e preencher sua fila de decisão." href="/radar" action="Ir para o radar" />}
    </div>
  </>;
}

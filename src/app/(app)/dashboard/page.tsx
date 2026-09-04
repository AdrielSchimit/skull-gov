import { Banknote, CircleGauge, Clock3, Globe2, MapPinned, Sparkles } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, SetupNotice, DataError, OpportunityCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { getDashboardMetrics, getOpportunities } from "@/lib/data";
import { getCompanyAwareOpportunities } from "@/lib/client-opportunities";
import { getSessionContext } from "@/lib/session-context";

export const metadata = { title: "Dashboard" };

function Metric({ label, value, note, icon: Icon, highlight = false }: { label: string; value: string | number; note: string; icon: typeof Sparkles; highlight?: boolean }) {
  return <article className={`metric-card${highlight ? " highlight" : ""}`}><span className="metric-label">{label}<Icon size={17} /></span><strong className="metric-value">{value}</strong><small className="metric-note">{note}</small></article>;
}

export default async function DashboardPage() {
  const session = await getSessionContext();
  const isClient = session.role !== "skull_admin" && !!session.companyName;

  if (isClient) {
    const radar = await getCompanyAwareOpportunities({ pageSize: 50 });
    const now = Date.now();
    const rows = radar.data;
    const attack = rows.filter((r) => r.recommendation === "atacar");
    const closingSoon = rows.filter((r) => r.closes_at && new Date(r.closes_at).getTime() >= now && new Date(r.closes_at).getTime() <= now + 48 * 3600_000);
    const recent = rows.filter((r) => r.published_at && new Date(r.published_at).getTime() >= now - 24 * 3600_000);
    const potential = rows.reduce((sum, r) => sum + (r.estimated_value ?? 0), 0);
    const pay = rows.flatMap((r) => r.pay_risk == null ? [] : [r.pay_risk]);
    const avgScore = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.skull_score, 0) / rows.length) : 0;
    const avgPay = pay.length ? Math.round(pay.reduce((sum, n) => sum + n, 0) / pay.length) : null;

    return <><PageHeader eyebrow="PAINEL DO CLIENTE" title={`Olá, ${session.companyName}.`} description={`Aqui aparecem apenas oportunidades compatíveis com o perfil da sua empresa, priorizando até ${session.radiusKm ?? 300} km da região cadastrada.`} action={<Link className="button button-primary" href="/radar">Abrir meu radar</Link>} />
      <div className="content-stack">
        {!radar.configured && <SetupNotice />}{radar.error && <DataError message={radar.error} />}
        <section className="metric-grid" aria-label="Indicadores principais">
          <Metric label="Novas em 24h" value={recent.length} note="Compatíveis com seu perfil" icon={Sparkles} />
          <Metric label="Boas oportunidades" value={attack.length} note="Recomendação ATACAR" icon={CircleGauge} highlight />
          <Metric label="Prazo em 48h" value={closingSoon.length} note="Precisam de decisão rápida" icon={Clock3} />
          <Metric label="Valor potencial" value={formatCurrency(potential)} note="Soma das oportunidades exibidas" icon={Banknote} />
          <Metric label="No seu raio" value={rows.length} note={`Até ${session.radiusKm ?? 300} km`} icon={MapPinned} />
          <Metric label="Fora do seu perfil" value="Ocultas" note="O sistema filtra automaticamente" icon={Globe2} />
          <Metric label="Média SKULL Score" value={avgScore} note="Aderência ao seu negócio" icon={CircleGauge} />
          <Metric label="Média Pay Risk" value={avgPay ?? "—"} note={avgPay === null ? "Dados insuficientes" : "0 baixo · 100 alto"} icon={Banknote} />
        </section>
        <section className="decision-board"><div className="decision-board-head"><h2>Como usar</h2><span>Abra, confira os itens e decida se consegue fornecer</span></div><div className="decision-columns"><div className="decision-column"><span className="decision decision-atacar"><i />ATACAR</span><p>Boa aderência ao que sua empresa vende e distância compatível.</p></div><div className="decision-column"><span className="decision decision-analisar"><i />ANALISAR</span><p>Vale abrir a oportunidade e conferir quantidades, prazos e documentos.</p></div><div className="decision-column"><span className="decision decision-evitar"><i />EVITAR</span><p>Capital, distância ou exigências podem não compensar para sua operação.</p></div></div></section>
        <section><div className="section-heading"><div><h2>Melhores para sua empresa</h2><p>Oportunidades reais filtradas para o perfil atual.</p></div><Link className="button button-secondary" href="/radar">Ver radar completo</Link></div></section>
        {rows.length ? <div className="opportunity-list">{rows.slice(0, 3).map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <EmptyState title="Nenhuma oportunidade compatível agora" description="Quando a gestão sincronizar novas fontes públicas, o seu radar será atualizado automaticamente." href="/radar" action="Abrir radar" />}
      </div>
    </>;
  }

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

import { Building2, Leaf, MapPinned, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import { DataError, EmptyState, OpportunityCard, PageHeader } from "@/components/ui";
import { getVerticalRadar } from "@/lib/vertical-radars";

export const metadata = { title: "Arquitetura & Urbanismo" };

export default async function ArchitecturePage() {
  const { radar, opportunities, error } = await getVerticalRadar("arquitetura-urbanismo");

  const localCount = opportunities.filter((item) => item.distance_km !== null && item.distance_km <= (radar?.radius_km ?? 300)).length;
  const attackCount = opportunities.filter((item) => item.recommendation === "atacar").length;
  const analyzeCount = opportunities.filter((item) => item.recommendation === "analisar").length;

  return <>
    <PageHeader
      eyebrow="SKULL ARQUITETURA & URBANISMO"
      title="Nova vertical técnica da SKULL."
      description="Radar dedicado a arquitetura, urbanismo, paisagismo, acessibilidade, revitalização e projetos técnicos. Pensado para começar com contratos pequenos e construir portfólio e acervo com segurança."
    />

    <div className="content-stack">
      {error && <DataError message={error} />}

      <section className="metric-grid" aria-label="Resumo do radar de arquitetura">
        <article className="metric-card highlight"><span className="metric-label">Radar ativo <Sparkles size={17} /></span><strong className="metric-value">{radar?.enabled ? "SIM" : "—"}</strong><small className="metric-note">Perfil exclusivo dentro do SKULL Admin</small></article>
        <article className="metric-card"><span className="metric-label">Raio regional <MapPinned size={17} /></span><strong className="metric-value">{radar ? `${radar.radius_km} km` : "—"}</strong><small className="metric-note">Base: {radar ? `${radar.base_city}/${radar.base_state}` : "—"}</small></article>
        <article className="metric-card"><span className="metric-label">Oportunidades abertas <Building2 size={17} /></span><strong className="metric-value">{opportunities.length}</strong><small className="metric-note">Compatíveis com as palavras-chave da vertical</small></article>
        <article className="metric-card"><span className="metric-label">Na região <Ruler size={17} /></span><strong className="metric-value">{localCount}</strong><small className="metric-note">Dentro do raio cadastrado</small></article>
        <article className="metric-card"><span className="metric-label">ATACAR <ShieldCheck size={17} /></span><strong className="metric-value">{attackCount}</strong><small className="metric-note">Baixa barreira relativa para começar</small></article>
        <article className="metric-card"><span className="metric-label">ANALISAR <Leaf size={17} /></span><strong className="metric-value">{analyzeCount}</strong><small className="metric-note">Pode exigir CAU/RRT, acervo ou parceiro</small></article>
      </section>

      <section className="panel">
        <div className="section-heading"><div><h2>O que este módulo procura</h2><p>O perfil fica salvo no Supabase e pode ser ajustado sem criar outro cliente.</p></div></div>
        <div className="decision-columns">
          <div className="decision-column"><span className="decision decision-atacar"><i />SERVIÇOS INICIAIS</span><p>Fachadas, layout, interiores, estudo preliminar, levantamento, acessibilidade, paisagismo e pequenos projetos.</p></div>
          <div className="decision-column"><span className="decision decision-analisar"><i />CRESCIMENTO</span><p>Projetos básicos/executivos, urbanização, praças, parques, revitalização e apoio técnico para órgãos públicos.</p></div>
          <div className="decision-column"><span className="decision decision-evitar"><i />NO COMEÇO</span><p>Obra pesada integrada, contratos que dependem de grande acervo, equipe multidisciplinar extensa ou alto capital de giro.</p></div>
        </div>
      </section>

      <section>
        <div className="section-heading"><div><h2>Radar de Arquitetura & Urbanismo</h2><p>{radar?.positive_keywords.length ?? 0} termos ativos · oportunidades ordenadas pelo encerramento mais próximo.</p></div></div>
        {opportunities.length ? <div className="opportunity-list">{opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <EmptyState title="Nenhuma oportunidade aberta neste perfil" description="O radar está ativo. As próximas sincronizações oficiais também alimentarão esta vertical conforme os objetos forem entrando no banco." href="/radar" action="Abrir radar geral" />}
      </section>
    </div>
  </>;
}

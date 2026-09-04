import { CarFront, Search, Zap } from "lucide-react";
import Link from "next/link";
import { SyncButton } from "@/components/sync-button";
import { DataError, EmptyState, OpportunityCard, PageHeader, SetupNotice } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getCurrentUser, getLatestSync } from "@/lib/data";
import { getCompanyAwareOpportunities } from "@/lib/client-opportunities";

export const metadata = { title: "Radar" };

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [result, sync, session] = await Promise.all([getCompanyAwareOpportunities({ page, pageSize: 12, filter: params.filter, query: params.q }), getLatestSync(), getCurrentUser()]);
  const isClient = session.role !== "skull_admin" && !!result.companyName;
  const title = isClient ? `Oportunidades para ${result.companyName}.` : "Pequenas oportunidades. Boa aderência. Pouco caixa preso.";
  const description = isClient
    ? `Radar personalizado pelo perfil da empresa e limitado a até ${result.radiusKm ?? 300} km da região cadastrada. Dados vêm das fontes públicas integradas ao SKULL GOV.`
    : "Consulta fontes oficiais, deduplica oportunidades e ordena para a realidade da SKULL Tecnologia. PNCP e Compras.gov já estão ativos.";

  return <><PageHeader eyebrow="RADAR GOV" title={title} description={description} action={session.role === "skull_admin" ? <SyncButton enabled /> : undefined} />
    <div className="content-stack">
      {!result.configured && <SetupNotice />}{result.error && <DataError message={result.error} />}
      <div className="filter-bar">
        <form className="search-form"><Search size={16} /><input name="q" defaultValue={params.q} placeholder="Buscar objeto ou órgão" aria-label="Buscar oportunidades" />{params.filter && <input type="hidden" name="filter" value={params.filter} />}</form>
        <Link className={`filter-pill${params.filter === "quick-cash" ? " active" : ""}`} href="/radar?filter=quick-cash"><Zap size={14} />Caixa rápido</Link>
        <Link className={`filter-pill${params.filter === "drive" ? " active" : ""}`} href="/radar?filter=drive"><CarFront size={14} />No meu raio</Link>
        <Link className={`filter-pill${!params.filter ? " active" : ""}`} href="/radar">Todos</Link>
      </div>
      {session.role === "skull_admin" && sync && <div className="panel"><div className="sync-stats"><span>Última sincronização <strong>{formatDate(sync.finished_at ?? sync.started_at, true)}</strong></span><span>Status <strong>{sync.status}</strong></span><span>Encontradas <strong>{sync.found_count}</strong></span><span>Novas <strong>{sync.inserted_count}</strong></span><span>Atualizadas <strong>{sync.updated_count}</strong></span><span>Erros <strong>{sync.error_count}</strong></span></div></div>}
      <div className="section-heading"><div><h2>{result.count} oportunidades encontradas</h2><p>{isClient ? `Filtradas para o perfil de ${result.companyName}.` : "Máximo de 12 por página; filtros são executados no servidor."}</p></div></div>
      {result.data.length ? <div className="opportunity-list">{result.data.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <EmptyState title="O radar está limpo" description={isClient ? "Não encontramos oportunidade compatível no momento. O SKULL GOV continuará recebendo as sincronizações feitas pela gestão." : "Não há dados para este filtro. Execute uma sincronização como SKULL Admin para consultar as fontes oficiais."} />}
      {result.count > 12 && <div className="pagination"><span>Página {page} de {Math.ceil(result.count / 12)}</span><span>{page > 1 && <Link className="button button-secondary" href={`/radar?page=${page - 1}${params.filter ? `&filter=${params.filter}` : ""}`}>Anterior</Link>} {page * 12 < result.count && <Link className="button button-secondary" href={`/radar?page=${page + 1}${params.filter ? `&filter=${params.filter}` : ""}`}>Próxima</Link>}</span></div>}
    </div>
  </>;
}

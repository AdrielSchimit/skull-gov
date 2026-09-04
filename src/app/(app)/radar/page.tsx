import { CarFront, Search, Zap } from "lucide-react";
import Link from "next/link";
import { SyncButton } from "@/components/sync-button";
import { DataError, EmptyState, OpportunityCard, PageHeader, SetupNotice } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getCurrentUser, getLatestSync, getOpportunities } from "@/lib/data";

export const metadata = { title: "Radar" };

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [result, sync, session] = await Promise.all([getOpportunities({ page, pageSize: 12, filter: params.filter, query: params.q }), getLatestSync(), getCurrentUser()]);
  return <><PageHeader eyebrow="RADAR PNCP" title="Pequenas oportunidades. Boa aderência. Pouco caixa preso." description="Consulta oficial do PNCP, normalizada e ordenada para a realidade da SKULL Tecnologia." action={<SyncButton enabled={session.role === "skull_admin"} />} />
    <div className="content-stack">
      {!result.configured && <SetupNotice />}{result.error && <DataError message={result.error} />}
      <div className="filter-bar">
        <form className="search-form"><Search size={16} /><input name="q" defaultValue={params.q} placeholder="Buscar objeto ou órgão" aria-label="Buscar oportunidades" />{params.filter && <input type="hidden" name="filter" value={params.filter} />}</form>
        <Link className={`filter-pill${params.filter === "quick-cash" ? " active" : ""}`} href="/radar?filter=quick-cash"><Zap size={14} />Caixa rápido</Link>
        <Link className={`filter-pill${params.filter === "drive" ? " active" : ""}`} href="/radar?filter=drive"><CarFront size={14} />Pra ir de carro</Link>
        <Link className={`filter-pill${!params.filter ? " active" : ""}`} href="/radar">Todos</Link>
      </div>
      {sync && <div className="panel"><div className="sync-stats"><span>Última sincronização <strong>{formatDate(sync.finished_at ?? sync.started_at, true)}</strong></span><span>Status <strong>{sync.status}</strong></span><span>Encontradas <strong>{sync.found_count}</strong></span><span>Novas <strong>{sync.inserted_count}</strong></span><span>Atualizadas <strong>{sync.updated_count}</strong></span><span>Erros <strong>{sync.error_count}</strong></span></div></div>}
      <div className="section-heading"><div><h2>{result.count} oportunidades encontradas</h2><p>Máximo de 12 por página; filtros são executados no servidor.</p></div></div>
      {result.data.length ? <div className="opportunity-list">{result.data.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <EmptyState title="O radar está limpo" description="Não há dados para este filtro. Se o Supabase já estiver configurado, execute uma sincronização como SKULL Admin." />}
      {result.count > 12 && <div className="pagination"><span>Página {page} de {Math.ceil(result.count / 12)}</span><span>{page > 1 && <Link className="button button-secondary" href={`/radar?page=${page - 1}${params.filter ? `&filter=${params.filter}` : ""}`}>Anterior</Link>} {page * 12 < result.count && <Link className="button button-secondary" href={`/radar?page=${page + 1}${params.filter ? `&filter=${params.filter}` : ""}`}>Próxima</Link>}</span></div>}
    </div>
  </>;
}

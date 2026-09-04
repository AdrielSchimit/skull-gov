import { Search } from "lucide-react";
import Link from "next/link";
import { DataError, EmptyState, OpportunityCard, PageHeader, SetupNotice } from "@/components/ui";
import { getCompanyAwareOpportunities } from "@/lib/client-opportunities";
import { getSessionContext } from "@/lib/session-context";

export const metadata = { title: "Oportunidades" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [result, session] = await Promise.all([
    getCompanyAwareOpportunities({ page, pageSize: 20, filter: params.filter, query: params.q }),
    getSessionContext(),
  ]);
  const isClient = session.role !== "skull_admin" && !!session.companyName;
  return <><PageHeader eyebrow="PIPELINE" title={isClient ? `Oportunidades da ${session.companyName}.` : "Todas as oportunidades."} description={isClient ? `Somente oportunidades compatíveis com o perfil cadastrado e com raio de até ${session.radiusKm ?? 300} km.` : "Acompanhe publicações normalizadas, abra a análise e transforme uma descoberta em participação."} />
    <div className="content-stack">{!result.configured && <SetupNotice />}{result.error && <DataError message={result.error} />}
      <div className="filter-bar"><form className="search-form"><Search size={16} /><input name="q" defaultValue={params.q} placeholder="Buscar objeto ou órgão" aria-label="Buscar oportunidades" /></form><Link className={`filter-pill${params.filter === "attack" ? " active" : ""}`} href="/oportunidades?filter=attack">Atacar</Link><Link className={`filter-pill${params.filter === "quick-cash" ? " active" : ""}`} href="/oportunidades?filter=quick-cash">Caixa rápido</Link><Link className={`filter-pill${!params.filter ? " active" : ""}`} href="/oportunidades">Todas</Link></div>
      <div className="section-heading"><div><h2>{result.count} registros</h2><p>{isClient ? "Filtrados automaticamente para sua empresa." : "Ordenados pelo encerramento mais próximo."}</p></div></div>
      {result.data.length ? <div className="opportunity-list">{result.data.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div> : <EmptyState title="Nenhuma oportunidade encontrada" description={isClient ? "Não há oportunidade compatível com o perfil da empresa neste momento." : "Ajuste os filtros ou sincronize as fontes no Radar."} href="/radar" action="Abrir radar" />}
      {result.count > 20 && <div className="pagination"><span>Página {page} de {Math.ceil(result.count / 20)}</span><span>{page > 1 && <Link className="button button-secondary" href={`/oportunidades?page=${page - 1}`}>Anterior</Link>} {page * 20 < result.count && <Link className="button button-secondary" href={`/oportunidades?page=${page + 1}`}>Próxima</Link>}</span></div>}
    </div>
  </>;
}

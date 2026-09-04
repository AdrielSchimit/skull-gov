import { BadgeDollarSign, Building2, DatabaseZap, FileSearch, History, Search, ShieldAlert, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DataError, EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { formatCnpj, formatCurrency, formatDate } from "@/lib/format";
import { getMarketOverview, getMarketSuppliers } from "@/lib/market-intelligence/data";
import { getSessionContext } from "@/lib/session-context";

export const metadata = { title: "Inteligência" };

function Metric({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: typeof History }) {
  return <article className="metric-card"><span className="metric-label">{label}<Icon size={17} /></span><strong className="metric-value">{value}</strong><small className="metric-note">{note}</small></article>;
}

export default async function MarketIntelligencePage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await getSessionContext();
  if (session.configured && !session.userId) redirect("/login");
  if (session.configured && session.role !== "skull_admin") redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [overview, suppliers] = await Promise.all([getMarketOverview(), getMarketSuppliers({ query: params.q, page, pageSize: 20 })]);

  return <>
    <PageHeader
      eyebrow="INTELIGÊNCIA GOV"
      title="Histórico oficial de fornecedores, compradores, itens e preços."
      description="Contexto separado do Radar: aqui entram fatos históricos estruturados, provenance, cobertura e métricas calculadas sem inferir participantes ausentes."
      action={<Link className="button button-secondary" href="/prospeccao">Abrir Prospecção</Link>}
    />
    <div className="content-stack">
      {!overview.configured && <SetupNotice />}
      {overview.error && <DataError message={overview.error} />}
      {suppliers.error && <DataError message={suppliers.error} />}

      <section className="metric-grid" aria-label="Indicadores de inteligência">
        <Metric label="Fornecedores GOV" value={overview.data.suppliers} note="Identidades canônicas PJ/PF" icon={Store} />
        <Metric label="Órgãos compradores" value={overview.data.buyers} note="Órgãos e unidades históricas" icon={Building2} />
        <Metric label="Processos" value={overview.data.procurements} note="Aliases PNCP/Compras.gov" icon={History} />
        <Metric label="Itens" value={overview.data.items} note="Catálogo, unidade e estimado" icon={FileSearch} />
        <Metric label="Resultados" value={overview.data.results} note="Homologações estruturadas" icon={BadgeDollarSign} />
        <Metric label="Valor homologado" value={formatCurrency(overview.data.homologatedValue)} note="Não é pago nem faturado" icon={DatabaseZap} />
      </section>

      <section className="panel">
        <div className="sync-stats">
          <span>Fonte inicial <strong>Compras.gov estruturado</strong></span>
          <span>Cobertura participantes <strong>incompleta por padrão</strong></span>
          <span>Último job <strong>{overview.data.latestRun ? formatDate(overview.data.latestRun.finished_at ?? overview.data.latestRun.started_at, true) : "Não executado"}</strong></span>
          <span>Status <strong>{overview.data.latestRun?.status ?? "sem job"}</strong></span>
        </div>
      </section>

      <section className="decision-board">
        <div className="decision-board-head"><h2>Separação de contexto</h2><span>Radar olha o futuro; Inteligência olha fatos históricos.</span></div>
        <div className="decision-columns">
          <div className="decision-column"><span className="decision decision-atacar"><i />FATO OFICIAL</span><p>Itens, resultados, valores homologados e contratos só entram com fonte estruturada ou documento público.</p></div>
          <div className="decision-column"><span className="decision decision-analisar"><i />COBERTURA</span><p>Participantes, lances e concorrentes ficam desconhecidos até documento ou API comprovar a participação.</p></div>
          <div className="decision-column"><span className="decision decision-evitar"><i />AUSENTE</span><p>Lead “fora do GOV” significa não encontrado nas fontes cobertas no período analisado.</p></div>
        </div>
      </section>

      <form className="filter-bar">
        <div className="search-form"><Search size={16} /><input name="q" defaultValue={params.q} placeholder="Buscar fornecedor, CNPJ ou cidade" aria-label="Buscar fornecedores históricos" /></div>
        <span className="filter-pill active"><ShieldAlert size={14} />Admin</span>
      </form>

      <div className="section-heading"><div><h2>Fornecedores GOV</h2><p>{suppliers.count} fornecedores encontrados no histórico carregado.</p></div></div>
      {suppliers.data.length ? <div className="table-panel">
        <table>
          <thead><tr><th>Empresa</th><th>CNPJ</th><th>Local</th><th>Itens vencidos</th><th>Valor homologado</th><th>Cobertura</th></tr></thead>
          <tbody>
            {suppliers.data.map((supplier) => (
              <tr key={supplier.id}>
                <td><Link href={`/inteligencia/fornecedores/${supplier.id}`}>{supplier.legal_name}</Link><small>{supplier.trade_name ?? supplier.main_cnae ?? "Fonte oficial estruturada"}</small></td>
                <td>{supplier.normalized_cnpj ? formatCnpj(supplier.normalized_cnpj) : supplier.masked_document ?? "Não disponível"}</td>
                <td>{supplier.city && supplier.state ? `${supplier.city}/${supplier.state}` : "Não disponível"}</td>
                <td>{supplier.metrics?.items_won ?? 0}</td>
                <td>{formatCurrency(supplier.metrics?.homologated_value ?? 0)}</td>
                <td>{supplier.metrics?.participant_coverage_status === "complete" ? "Completa" : "Incompleta"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> : <EmptyState title="Inteligência ainda sem histórico" description="Aplique o SQL de market intelligence e execute um backfill controlado. A tela consulta somente nosso banco; não varre APIs externas durante a pesquisa." />}
      {suppliers.count > 20 && <div className="pagination"><span>Página {page} de {Math.ceil(suppliers.count / 20)}</span><span>{page > 1 && <Link className="button button-secondary" href={`/inteligencia?page=${page - 1}${params.q ? `&q=${params.q}` : ""}`}>Anterior</Link>} {page * 20 < suppliers.count && <Link className="button button-secondary" href={`/inteligencia?page=${page + 1}${params.q ? `&q=${params.q}` : ""}`}>Próxima</Link>}</span></div>}
    </div>
  </>;
}


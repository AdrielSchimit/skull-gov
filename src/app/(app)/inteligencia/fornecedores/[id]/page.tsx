import { ArrowLeft, BadgeDollarSign, Building2, FileSearch, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DataError, EmptyState, PageHeader } from "@/components/ui";
import { formatCnpj, formatCurrency, formatDate } from "@/lib/format";
import { getMarketSupplier } from "@/lib/market-intelligence/data";
import { calculateComparablePriceDelta } from "@/lib/market-intelligence";
import { getSessionContext } from "@/lib/session-context";

export const metadata = { title: "Fornecedor GOV" };

export default async function MarketSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (session.configured && !session.userId) redirect("/login");
  if (session.configured && session.role !== "skull_admin") redirect("/dashboard");

  const { id } = await params;
  const { data: supplier, error } = await getMarketSupplier(id);
  if (!supplier && !error) notFound();

  const metrics = supplier?.metrics;
  return <>
    <PageHeader
      eyebrow="FORNECEDOR GOV"
      title={supplier?.legal_name ?? "Fornecedor não encontrado"}
      description="Perfil histórico baseado em fontes oficiais. Valores homologados não são apresentados como faturamento, pagamento ou empenho."
      action={<Link className="button button-secondary" href="/inteligencia"><ArrowLeft size={16} />Voltar</Link>}
    />
    <div className="content-stack">
      {error && <DataError message={error} />}
      {supplier ? <>
        <section className="metric-grid">
          <article className="metric-card"><span className="metric-label">CNPJ<Building2 size={17} /></span><strong className="metric-value">{supplier.normalized_cnpj ? formatCnpj(supplier.normalized_cnpj) : supplier.masked_document ?? "Não disponível"}</strong><small className="metric-note">{supplier.city && supplier.state ? `${supplier.city}/${supplier.state}` : "Local não disponível"}</small></article>
          <article className="metric-card"><span className="metric-label">Certames vencidos<FileSearch size={17} /></span><strong className="metric-value">{metrics?.procurements_won ?? 0}</strong><small className="metric-note">Certames, não linhas de item</small></article>
          <article className="metric-card"><span className="metric-label">Itens vencidos<FileSearch size={17} /></span><strong className="metric-value">{metrics?.items_won ?? 0}</strong><small className="metric-note">Itens homologados estruturados</small></article>
          <article className="metric-card"><span className="metric-label">Valor homologado<BadgeDollarSign size={17} /></span><strong className="metric-value">{formatCurrency(metrics?.homologated_value ?? 0)}</strong><small className="metric-note">Não é valor pago</small></article>
          <article className="metric-card"><span className="metric-label">Taxa de vitória<ShieldAlert size={17} /></span><strong className="metric-value">{metrics?.win_rate_items === null || metrics?.win_rate_items === undefined ? "Desconhecida" : `${Math.round(metrics.win_rate_items * 100)}%`}</strong><small className="metric-note">Null com cobertura incompleta</small></article>
          <article className="metric-card"><span className="metric-label">Lead score<ShieldAlert size={17} /></span><strong className="metric-value">{supplier.lead_score?.total_score ?? "Não calculado"}</strong><small className="metric-note">{supplier.lead_score?.score_version ?? "Score versionado"}</small></article>
        </section>

        <section className="panel">
          <div className="sync-stats">
            <span>Primeira atividade <strong>{formatDate(metrics?.first_activity_at ?? null, true)}</strong></span>
            <span>Última atividade <strong>{formatDate(metrics?.last_activity_at ?? null, true)}</strong></span>
            <span>Compradores distintos <strong>{metrics?.distinct_buyers ?? 0}</strong></span>
            <span>Cobertura participantes <strong>{metrics?.participant_coverage_status === "complete" ? "Completa" : "Incompleta"}</strong></span>
          </div>
        </section>

        <div className="section-heading"><div><h2>Itens & Preços</h2><p>Delta só é calculado quando unidade estimada e unidade final são compatíveis.</p></div></div>
        {supplier.results.length ? <div className="table-panel"><table>
          <thead><tr><th>Item</th><th>Resultado</th><th>Unitário final</th><th>Total homologado</th><th>Delta</th></tr></thead>
          <tbody>
            {supplier.results.map((row) => {
              const delta = calculateComparablePriceDelta({ estimatedUnitValue: row.item?.estimated_unit_value ?? null, finalUnitValue: row.homologated_unit_value, estimatedUnit: row.item?.unit ?? null, finalUnit: row.item?.unit ?? null });
              return <tr key={row.id}>
                <td><strong>{row.item?.description ?? "Item não disponível"}</strong><small>{row.procurement?.object ?? "Processo sem objeto carregado"}</small></td>
                <td>{row.status ?? "Não disponível"}<small>{formatDate(row.result_date, true)}</small></td>
                <td>{formatCurrency(row.homologated_unit_value)}</td>
                <td>{formatCurrency(row.homologated_total_value)}</td>
                <td>{delta === null ? "Não comparável" : `${delta.toFixed(2)}%`}</td>
              </tr>;
            })}
          </tbody>
        </table></div> : <EmptyState title="Sem resultados carregados" description="Este fornecedor existe no cadastro histórico, mas ainda não há itens homologados associados no recorte carregado." />}

        <div className="section-heading"><div><h2>Fontes</h2><p>Provenance dos aliases oficiais usados para identificar este fornecedor.</p></div></div>
        {supplier.sources.length ? <div className="table-panel"><table>
          <thead><tr><th>Fonte</th><th>Chave</th><th>Qualidade</th><th>Ingestão</th></tr></thead>
          <tbody>{supplier.sources.map((source) => <tr key={`${source.source_system}:${source.source_key}`}><td>{source.source_system}</td><td>{source.source_key}</td><td>{source.data_quality}</td><td>{formatDate(source.ingested_at, true)}</td></tr>)}</tbody>
        </table></div> : <EmptyState title="Sem aliases de fonte" description="Revise a ingestão: fornecedores históricos devem guardar ao menos um identificador oficial de origem." />}
      </> : <EmptyState title="Fornecedor não encontrado" description="O registro pode não existir ou o RLS pode ter bloqueado a leitura." />}
    </div>
  </>;
}


import { notFound } from "next/navigation";
import { PageHeader, SetupNotice } from "@/components/ui";
import { formatCnpj, formatCurrency } from "@/lib/format";
import { getCompany } from "@/lib/data";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCompany(id);
  if (result.configured && !result.data) notFound();
  const company = result.data;
  if (!company) return <><PageHeader eyebrow="EMPRESA" title="Perfil indisponível." description="Conecte o Supabase para carregar este registro." /><div className="content-stack"><SetupNotice /></div></>;
  return <><PageHeader eyebrow="PERFIL OPERACIONAL" title={company.trade_name} description={`${company.legal_name} · ${formatCnpj(company.cnpj)}`} />
    <div className="content-stack"><div className="detail-grid"><section className="panel"><h2>Capacidade da empresa</h2><div className="facts-grid"><div className="fact"><small>Localização</small><strong>{company.city}/{company.state}</strong></div><div className="fact"><small>Caixa disponível</small><strong>{formatCurrency(company.available_cash)}</strong></div><div className="fact"><small>Capacidade operacional</small><strong>{company.operational_capacity ?? "Não informada"}</strong></div></div><div className="analysis-list" style={{ marginTop: 18 }}><div className="analysis-item"><strong>Serviços</strong><p>{company.services.join(", ") || "Não informados"}</p></div><div className="analysis-item"><strong>Produtos</strong><p>{company.products.join(", ") || "Não informados"}</p></div><div className="analysis-item"><strong>Regiões atendidas</strong><p>{company.service_regions.join(", ") || "Não informadas"}</p></div><div className="analysis-item"><strong>CNAEs</strong><p>{company.cnaes.join(", ") || "Não informados"}</p></div></div></section><aside className="content-stack"><section className="panel"><h2>Palavras positivas</h2><div className="tag-list">{company.positive_keywords.map((keyword) => <span className="tag" key={keyword}>{keyword}</span>)}</div></section><section className="panel"><h2>Penalidades</h2><div className="tag-list">{company.negative_keywords.map((keyword) => <span className="tag" key={keyword}>{keyword}</span>)}</div></section></aside></div></div>
  </>;
}

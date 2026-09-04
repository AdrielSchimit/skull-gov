import { ArrowUpRight, Building2 } from "lucide-react";
import Link from "next/link";
import { DataError, EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { formatCnpj } from "@/lib/format";
import { getCompanies } from "@/lib/data";

export const metadata = { title: "Empresas" };

export default async function CompaniesPage() {
  const result = await getCompanies();
  return <><PageHeader eyebrow="MODO GESTOR" title="Carteira de empresas." description="Perfis operacionais separados por tenant para comparar oportunidade × empresa com segurança." />
    <div className="content-stack">{!result.configured && <SetupNotice />}{result.error && <DataError message={result.error} />}
      {result.data.length ? <div className="company-grid">{result.data.map((company) => <article className="company-card" key={company.id}><Building2 size={20} color="var(--green)" /><h2>{company.trade_name}</h2><p>{company.city}/{company.state} · {formatCnpj(company.cnpj)}</p><div className="tag-list">{company.services.slice(0, 5).map((service) => <span className="tag" key={service}>{service}</span>)}</div><Link className="card-link" href={`/empresas/${company.id}`}>Abrir empresa <ArrowUpRight size={16} /></Link></article>)}</div> : <EmptyState title="Nenhuma empresa na carteira" description="Após aplicar o schema, cadastre a SKULL Tecnologia pelo seed administrativo documentado em SUPABASE_REQUIREMENTS.md." />}
    </div>
  </>;
}

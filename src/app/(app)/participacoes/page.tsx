import { Workflow } from "lucide-react";
import { DataError, EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getParticipations } from "@/lib/data";

export const metadata = { title: "Participações" };

export default async function ParticipationsPage() {
  const result = await getParticipations();
  return <><PageHeader eyebrow="EXECUÇÃO" title="Do radar à proposta." description="Acompanhe o estágio de cada decisão sem confundir descoberta com participação confirmada." /><div className="content-stack">{!result.configured && <SetupNotice />}{result.error && <DataError message={result.error} />}{result.data.length ? <section className="panel">{result.data.map((item) => <div className="setting-row" key={item.id}><div><strong>{item.opportunity_id}</strong><span>Criada em {formatDate(item.created_at)}{item.notes ? ` · ${item.notes}` : ""}</span></div><span className="filter-pill active"><Workflow size={13} />{item.stage}</span></div>)}</section> : <EmptyState title="Nenhuma participação iniciada" description="Abra uma oportunidade e registre a decisão somente depois da validação do edital." href="/oportunidades" action="Ver oportunidades" />}</div></>;
}

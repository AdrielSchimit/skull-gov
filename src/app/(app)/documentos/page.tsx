import { DataError, EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getDocuments } from "@/lib/data";

export const metadata = { title: "Documentos" };

export default async function DocumentsPage() {
  const result = await getDocuments();
  return <><PageHeader eyebrow="HABILITAÇÃO" title="Documentos sob controle." description="Validade e disponibilidade das certidões e evidências de cada empresa, sempre isoladas por RLS." /><div className="content-stack">{!result.configured && <SetupNotice />}{result.error && <DataError message={result.error} />}{result.data.length ? <section className="panel"><div className="table-list">{result.data.map((document) => <div className="setting-row" key={document.id}><div><strong>{document.name}</strong><span>{document.category} · validade {formatDate(document.expires_at)}</span></div><span className={`status status-${document.status}`}>{document.status.toUpperCase()}</span></div>)}</div></section> : <EmptyState title="Nenhum documento cadastrado" description="Adicione documentos somente após o bucket privado e as policies de Storage estarem configurados." />}</div></>;
}

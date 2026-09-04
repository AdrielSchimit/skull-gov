import { DataError, EmptyState, PageHeader, SetupNotice } from "@/components/ui";
import { getAlertRules } from "@/lib/data";

export const metadata = { title: "Alertas" };

export default async function AlertsPage() {
  const result = await getAlertRules();
  return <><PageHeader eyebrow="MONITORAMENTO" title="Sinais que merecem interrupção." description="Regras salvas por empresa para destacar mudanças relevantes, sem ruído a cada sincronização." /><div className="content-stack">{!result.configured && <SetupNotice />}{result.error && <DataError message={result.error} />}{result.data.length ? <section className="panel">{result.data.map((rule) => <div className="setting-row" key={rule.id}><div><strong>{rule.name}</strong><span>{Object.keys(rule.filters).length} filtros configurados</span></div><span className={rule.enabled ? "decision decision-atacar" : "decision decision-evitar"}><i />{rule.enabled ? "ATIVO" : "PAUSADO"}</span></div>)}</section> : <EmptyState title="Nenhum alerta configurado" description="As regras poderão ser cadastradas quando as tabelas e policies do Supabase estiverem aplicadas." />}</div></>;
}

import { CheckCircle2, CircleDashed, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/data";
import { roleLabel } from "@/lib/format";

export const metadata = { title: "Configurações" };

const plannedSources = ["Portal de Compras Públicas", "BLL Compras", "BNC Compras", "Licitanet", "BBMNET", "Licitações-e"];

export default async function SettingsPage() {
  const session = await getCurrentUser();
  return <><PageHeader eyebrow="CONFIGURAÇÕES" title="Base operacional." description="Parâmetros visíveis da conta e estado das integrações. Segredos nunca aparecem nesta tela." />
    <div className="content-stack"><div className="settings-grid"><section className="panel"><h2>Empresa inicial</h2><div className="setting-row"><div><strong>SKULL Tecnologia</strong><span>Empresa de tecnologia</span></div><CheckCircle2 color="var(--green)" size={19} /></div><div className="setting-row"><div><strong>Barrinha/SP</strong><span>-21.193, -48.163 · raio prioritário de 200 km</span></div><MapPin color="var(--green)" size={19} /></div></section><section className="panel"><h2>Integrações ativas</h2><div className="setting-row"><div><strong>Supabase</strong><span>Projeto oficial: kctpcbgaescujhsacqmm</span></div>{session.configured ? <CheckCircle2 color="var(--green)" size={19} /> : <CircleDashed color="var(--muted)" size={19} />}</div><div className="setting-row"><div><strong>PNCP Dados Abertos</strong><span>API oficial server-side, fonte primária</span></div><CheckCircle2 color="var(--green)" size={19} /></div><div className="setting-row"><div><strong>Compras.gov.br Dados Abertos</strong><span>API oficial server-side; dados deduplicados pelo controle PNCP</span></div><CheckCircle2 color="var(--green)" size={19} /></div></section></div><section className="panel"><h2>Próximos conectores</h2><p className="disclaimer">Só serão marcados como ativos após validar acesso público estável e permitido. Quando o portal já publica integralmente no PNCP, ele funciona também como fonte de confirmação, evitando duplicatas.</p>{plannedSources.map((source) => <div className="setting-row" key={source}><div><strong>{source}</strong><span>Conector em validação · sem fingir cobertura antes de existir fonte pública confiável</span></div><CircleDashed color="var(--muted)" size={19} /></div>)}</section><section className="panel"><h2>Conta</h2><div className="setting-row"><div><strong>{session.user?.email ?? "Sem sessão ativa"}</strong><span>{roleLabel(session.role)} · autorização validada por RLS</span></div></div></section></div>
  </>;
}

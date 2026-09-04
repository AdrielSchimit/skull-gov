import { LogOut, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { logout } from "@/app/login/actions";
import { Brand } from "@/components/brand";
import { NavLinks } from "@/components/nav-links";
import { roleLabel } from "@/lib/format";
import type { UserRole } from "@/lib/types";

export function AppShell({ children, email, role, configured, tenantName, companyName }: { children: React.ReactNode; email: string | null; role: UserRole | null; configured: boolean; tenantName?: string | null; companyName?: string | null }) {
  const clientLabel = role === "skull_admin" ? "SKULL GOV" : (companyName ?? tenantName ?? "Cliente SKULL GOV");
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <div style={{ padding: "0 14px 10px" }}>
          <small className="eyebrow">AMBIENTE</small>
          <strong style={{ display: "block", marginTop: 4, fontSize: 14 }}>{clientLabel}</strong>
        </div>
        <Suspense fallback={<div className="nav-skeleton" />}><NavLinks role={role} /></Suspense>
        <div className="sidebar-foot">
          <div className="access-chip"><ShieldCheck size={16} aria-hidden="true" /><span>{roleLabel(role)}</span></div>
          <div className="account-row">
            <span className="account-copy"><strong>{email ?? (configured ? "Sessão necessária" : "Modo de configuração")}</strong><small>{configured ? `Ambiente: ${clientLabel}` : "Supabase ainda não conectado"}</small></span>
            {email && <form action={logout}><button className="icon-button" title="Sair" aria-label="Sair"><LogOut size={17} /></button></form>}
          </div>
        </div>
      </aside>
      <header className="mobile-header">
        <Brand />
        <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientLabel}</span>
        {email ? <form action={logout} style={{ marginLeft: "auto" }}><button className="icon-button" title="Sair da conta" aria-label="Sair da conta"><LogOut size={17} /></button></form> : <span className="eyebrow">SKULL GOV</span>}
      </header>
      <main className="main-content">{children}</main>
      <div className="mobile-nav"><Suspense fallback={null}><NavLinks mobile role={role} /></Suspense></div>
    </div>
  );
}

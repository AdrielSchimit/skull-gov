import { LogOut, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { logout } from "@/app/login/actions";
import { Brand } from "@/components/brand";
import { NavLinks } from "@/components/nav-links";
import { roleLabel } from "@/lib/format";
import type { UserRole } from "@/lib/types";

export function AppShell({ children, email, role, configured }: { children: React.ReactNode; email: string | null; role: UserRole | null; configured: boolean }) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <Suspense fallback={<div className="nav-skeleton" />}><NavLinks /></Suspense>
        <div className="sidebar-foot">
          <div className="access-chip"><ShieldCheck size={16} aria-hidden="true" /><span>{roleLabel(role)}</span></div>
          <div className="account-row">
            <span className="account-copy"><strong>{email ?? (configured ? "Sessão necessária" : "Modo de configuração")}</strong><small>{configured ? "Conta protegida por RLS" : "Supabase ainda não conectado"}</small></span>
            {email && <form action={logout}><button className="icon-button" title="Sair" aria-label="Sair"><LogOut size={17} /></button></form>}
          </div>
        </div>
      </aside>
      <header className="mobile-header">
        <Brand />
        {email ? <form action={logout} style={{ marginLeft: "auto" }}><button className="icon-button" title="Sair da conta" aria-label="Sair da conta"><LogOut size={17} /></button></form> : <span className="eyebrow">SKULL GOV</span>}
      </header>
      <main className="main-content">{children}</main>
      <div className="mobile-nav"><Suspense fallback={null}><NavLinks mobile /></Suspense></div>
    </div>
  );
}

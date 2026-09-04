import Link from "next/link";
import { Brand } from "@/components/brand";
import { SignupForm } from "@/app/cadastro/signup-form";

export const metadata = { title: "Cadastro de cliente" };

export default function SignupPage() {
  return (
    <main className="login-page">
      <section className="login-context">
        <Brand />
        <div>
          <span className="eyebrow">ACESSO DE CLIENTE</span>
          <h1>Entre no SKULL GOV com a visão da sua empresa.</h1>
          <p>O perfil da empresa, permissões e oportunidades são definidos pelo tenant vinculado ao seu e-mail. Os dados de outras empresas ficam isolados por RLS.</p>
        </div>
        <div className="login-decision">
          <span><i className="green-dot" />CONTA PRÓPRIA</span>
          <span><i className="green-dot" />RLS ATIVO</span>
          <span><i className="amber-dot" />RADAR PERSONALIZADO</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">CRIAR ACESSO</span>
          <h2>Cadastro do cliente.</h2>
          <p>Use o e-mail previamente vinculado à empresa pela gestão SKULL.</p>
          <SignupForm />
          <small>Já tem uma conta? <Link href="/login">Entrar</Link></small>
        </div>
      </section>
    </main>
  );
}

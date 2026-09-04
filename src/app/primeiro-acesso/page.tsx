import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/data";
import { FirstAccessForm } from "@/app/primeiro-acesso/signup-form";

export const metadata = { title: "Primeiro acesso" };

export default async function FirstAccessPage() {
  const session = await getCurrentUser();
  if (session.user) redirect("/dashboard");

  return (
    <main className="login-page">
      <section className="login-context">
        <Brand />
        <div>
          <span className="eyebrow">CONFIGURAÇÃO INICIAL</span>
          <h1>Ative o primeiro administrador do SKULL GOV.</h1>
          <p>Este fluxo é restrito ao e-mail fundador configurado no backend. A senha é enviada diretamente ao Supabase Auth e nunca é gravada no repositório.</p>
        </div>
        <div className="login-decision">
          <span><i className="green-dot" />SKULL ADMIN</span>
          <span><i className="amber-dot" />RLS ATIVO</span>
          <span><i className="green-dot" />AUTH OFICIAL</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">PRIMEIRO ACESSO</span>
          <h2>Criar conta administrativa.</h2>
          <p>Digite a senha definida para o acesso inicial.</p>
          <FirstAccessForm />
          <small>Após a criação, use normalmente a tela de login.</small>
        </div>
      </section>
    </main>
  );
}

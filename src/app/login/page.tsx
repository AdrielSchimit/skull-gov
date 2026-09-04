import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/data";
import { LoginForm } from "@/app/login/login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await getCurrentUser();
  if (session.user) redirect("/dashboard");
  return <main className="login-page">
    <section className="login-context"><Brand /><div><span className="eyebrow">DECISÃO COM EVIDÊNCIA</span><h1>Licitação boa é a que cabe na operação — e no caixa.</h1><p>Descubra contratos públicos de software perto de Barrinha e entenda, antes do edital vencer, se vale atacar.</p></div><div className="login-decision"><span><i className="green-dot" />ATACAR</span><span><i className="amber-dot" />ANALISAR</span><span><i className="red-dot" />EVITAR</span></div></section>
    <section className="login-panel"><div className="login-card"><span className="eyebrow">ACESSO SEGURO</span><h2>Bem-vindo de volta.</h2><p>Use a conta vinculada à sua empresa.</p><LoginForm /><small>O acesso é isolado por empresa com políticas RLS no Supabase.</small></div></section>
  </main>;
}

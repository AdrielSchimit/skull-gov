import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/data";
import { LoginForm } from "@/app/login/login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await getCurrentUser();
  if (session.user) redirect("/dashboard");
  return <main className="login-page">
    <section className="login-context"><Brand /><div><span className="eyebrow">OPORTUNIDADES PARA O SEU NEGÓCIO</span><h1>Entre e veja o que o poder público está comprando de empresas como a sua.</h1><p>O SKULL GOV cruza seu perfil com oportunidades públicas, prioriza distância, aderência, prazo e esforço de caixa e ajuda você a decidir onde vale participar.</p></div><div className="login-decision"><span><i className="green-dot" />ATACAR</span><span><i className="amber-dot" />ANALISAR</span><span><i className="red-dot" />EVITAR</span></div></section>
    <section className="login-panel"><div className="login-card"><span className="eyebrow">ACESSO SEGURO</span><h2>Bem-vindo de volta.</h2><p>Use a conta vinculada à sua empresa.</p><LoginForm /><small>Primeiro acesso? <Link href="/cadastro"><strong>Criar Radar pelo CNPJ</strong></Link><br />Cada empresa fica isolada por tenant e políticas RLS no Supabase.</small></div></section>
  </main>;
}

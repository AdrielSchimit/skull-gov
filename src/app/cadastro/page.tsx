import Link from "next/link";
import { Brand } from "@/components/brand";
import { SignupForm } from "@/app/cadastro/signup-form";

export const metadata = { title: "Criar Radar da empresa" };

export default function SignupPage() {
  return (
    <main className="login-page onboarding-page">
      <section className="login-context">
        <Brand />
        <div>
          <span className="eyebrow">SKULL GOV · NOVO CLIENTE</span>
          <h1>Seu CNPJ entra. Seu Radar nasce pronto.</h1>
          <p>Informe o CNPJ e o SKULL GOV identifica a empresa, os CNAEs e o nicho para montar automaticamente a primeira configuração de oportunidades públicas.</p>
        </div>
        <div className="login-decision">
          <span><i className="green-dot" />CNPJ AUTOMÁTICO</span>
          <span><i className="green-dot" />NICHO IDENTIFICADO</span>
          <span><i className="green-dot" />RADAR PERSONALIZADO</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card onboarding-card">
          <span className="eyebrow">PRÉ-CADASTRO</span>
          <h2>Configure sua empresa.</h2>
          <p>Você não precisa saber palavras-chave de licitação. A configuração inicial é criada a partir do seu CNPJ e pode ser refinada depois.</p>
          <SignupForm />
          <small>Já tem uma conta? <Link href="/login">Entrar</Link></small>
        </div>
      </section>
    </main>
  );
}

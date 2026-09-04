"use client";

import { ArrowRight, Building2, Radar, ShieldCheck, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { signupClient, type SignupState } from "@/app/cadastro/actions";

const initialState: SignupState = { error: null, success: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupClient, initialState);
  return (
    <form action={formAction} className="login-form">
      <div className="onboarding-benefits">
        <span><Building2 size={15} /> Identificamos sua empresa pelo CNPJ</span>
        <span><Radar size={15} /> O nicho configura seu Radar automaticamente</span>
        <span><ShieldCheck size={15} /> Sua conta fica isolada das demais empresas</span>
      </div>
      <label>CNPJ<input inputMode="numeric" name="cnpj" placeholder="00.000.000/0000-00" autoComplete="organization" required /></label>
      <label>E-mail do responsável<input type="email" name="email" autoComplete="email" placeholder="voce@empresa.com.br" required /></label>
      <label>Senha<input type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
      <label>Raio de oportunidades
        <select name="radiusKm" defaultValue="">
          <option value="">Automático pelo nicho</option>
          <option value="100">Até 100 km</option>
          <option value="200">Até 200 km</option>
          <option value="300">Até 300 km</option>
          <option value="500">Até 500 km</option>
          <option value="1000">Brasil / até 1000 km</option>
        </select>
      </label>
      <p className="onboarding-note">Ao continuar, o SKULL GOV consulta dados públicos do CNPJ, identifica CNAEs e monta um perfil inicial de busca. Depois você pode ajustar produtos, serviços e região.</p>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      <button className="button button-primary" disabled={pending}>
        <UserPlus size={17} />{pending ? "Preparando sua empresa…" : "Criar meu Radar"}<ArrowRight size={17} />
      </button>
    </form>
  );
}

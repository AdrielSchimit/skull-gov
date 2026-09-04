"use client";

import { ArrowRight, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { signupClient, type SignupState } from "@/app/cadastro/actions";

const initialState: SignupState = { error: null, success: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupClient, initialState);
  return (
    <form action={formAction} className="login-form">
      <label>E-mail<input type="email" name="email" autoComplete="email" required /></label>
      <label>Senha<input type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
      <button className="button button-primary" disabled={pending}>
        <UserPlus size={17} />{pending ? "Criando conta…" : "Criar acesso"}<ArrowRight size={17} />
      </button>
    </form>
  );
}

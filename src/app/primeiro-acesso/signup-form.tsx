"use client";

import { ArrowRight, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { createFirstAdmin, type FirstAccessState } from "@/app/primeiro-acesso/actions";

const initialState: FirstAccessState = { error: null, success: null };

export function FirstAccessForm() {
  const [state, formAction, pending] = useActionState(createFirstAdmin, initialState);

  return (
    <form action={formAction} className="login-form">
      <label>
        E-mail
        <input type="email" value="schimitadriel100@gmail.com" disabled readOnly />
      </label>
      <label>
        Senha
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
      <button className="button button-primary" disabled={pending}>
        <UserPlus size={17} />
        {pending ? "Criando acesso…" : "Criar acesso SKULL Admin"}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}

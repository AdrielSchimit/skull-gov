"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  return <form action={formAction} className="login-form">
    <label>E-mail<input type="email" name="email" autoComplete="email" placeholder="voce@empresa.com.br" required /></label>
    <label>Senha<input type="password" name="password" autoComplete="current-password" placeholder="••••••••" minLength={8} required /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="button button-primary" disabled={pending}><LockKeyhole size={17} />{pending ? "Entrando…" : "Entrar no SKULL GOV"}<ArrowRight size={17} /></button>
  </form>;
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface LoginState { error: string | null }
const loginSchema = z.object({ email: z.email("Informe um e-mail válido."), password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.") });

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase ainda não configurado. Consulte o README." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-mail ou senha incorretos." };
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface FirstAccessState {
  error: string | null;
  success: string | null;
}

const schema = z.object({
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

const ADMIN_EMAIL = "schimitadriel100@gmail.com";

export async function createFirstAdmin(
  _: FirstAccessState,
  formData: FormData,
): Promise<FirstAccessState> {
  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Senha inválida.", success: null };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Supabase não configurado.", success: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: parsed.data.password,
    options: {
      emailRedirectTo: "https://skull-gov.vercel.app/auth/callback?next=/dashboard",
      data: { name: "Adriel" },
    },
  });

  if (error) {
    return {
      error: "Não foi possível criar o primeiro acesso. Se a conta já existir, use a tela de login.",
      success: null,
    };
  }

  if (data.session) redirect("/dashboard");

  return {
    error: null,
    success: "Conta criada. Confirme o e-mail recebido e depois entre normalmente no SKULL GOV.",
  };
}

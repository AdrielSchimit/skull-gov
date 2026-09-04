"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SignupState {
  error: string | null;
  success: string | null;
}

const schema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export async function signupClient(_: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase não configurado.", success: null };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: {
      emailRedirectTo: "https://skull-gov.vercel.app/auth/callback?next=/dashboard",
    },
  });

  if (error) return { error: "Não foi possível criar a conta. Se ela já existir, use a tela de login.", success: null };
  if (data.session) redirect("/dashboard");
  return { error: null, success: "Conta criada. Confirme o e-mail recebido e depois entre normalmente." };
}

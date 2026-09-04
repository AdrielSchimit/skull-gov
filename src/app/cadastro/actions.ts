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

const redirectTo = "https://skull-gov.vercel.app/auth/callback?next=/dashboard";

export async function signupClient(_: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase não configurado.", success: null };

  const email = parsed.data.email.toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    const resend = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (!resend.error) {
      return {
        error: null,
        success: "A conta já existe e está aguardando confirmação. Reenviamos o e-mail de confirmação. Confira também Spam e Promoções.",
      };
    }

    return {
      error: "A conta já pode ter sido criada, mas não foi possível reenviar a confirmação agora. Tente novamente em alguns minutos.",
      success: null,
    };
  }

  if (data.session) redirect("/dashboard");

  return {
    error: null,
    success: "Conta criada. Enviamos o e-mail de confirmação. Confira também Spam e Promoções e depois entre normalmente.",
  };
}

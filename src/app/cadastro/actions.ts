"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { lookupAndClassifyCompany } from "@/lib/company-onboarding";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SignupState {
  error: string | null;
  success: string | null;
}

const schema = z.object({
  cnpj: z.string().min(14, "Informe o CNPJ da empresa."),
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  radiusKm: z.coerce.number().int().min(20).max(1000).optional(),
});

const redirectTo = "https://skull-gov.vercel.app/auth/callback?next=/dashboard";

export async function signupClient(_: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({
    cnpj: formData.get("cnpj"),
    email: formData.get("email"),
    password: formData.get("password"),
    radiusKm: formData.get("radiusKm") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase não configurado.", success: null };

  const email = parsed.data.email.toLowerCase().trim();

  let company;
  try {
    company = await lookupAndClassifyCompany(parsed.data.cnpj);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível consultar o CNPJ.", success: null };
  }

  const radiusKm = parsed.data.radiusKm ?? company.recommendedRadiusKm;
  const { error: onboardingError } = await supabase.rpc("prepare_client_onboarding", {
    p_email: email,
    p_cnpj: company.cnpj,
    p_legal_name: company.legalName,
    p_trade_name: company.tradeName,
    p_city: company.city,
    p_state: company.state,
    p_cnaes: company.cnaes,
    p_niche_code: company.nicheCode,
    p_niche_label: company.nicheLabel,
    p_positive_keywords: company.positiveKeywords,
    p_negative_keywords: company.negativeKeywords,
    p_radius_km: radiusKm,
    p_source_data: company.sourceData,
  });

  if (onboardingError) {
    const message = onboardingError.message.includes("já possui")
      ? "Este e-mail já está vinculado a uma conta. Use a tela de login."
      : "Não foi possível preparar o ambiente da empresa. Tente novamente.";
    return { error: message, success: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: redirectTo,
      data: { company_name: company.tradeName, niche: company.nicheCode },
    },
  });

  if (error) {
    const resend = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo } });
    if (!resend.error) {
      return { error: null, success: `${company.tradeName} já está preparada no SKULL GOV. Reenviamos o e-mail de confirmação para concluir o acesso.` };
    }
    return { error: "A empresa foi preparada, mas não foi possível concluir o acesso agora. Tente entrar ou repetir o cadastro em alguns minutos.", success: null };
  }

  if (data.session) redirect("/dashboard");

  return {
    error: null,
    success: `${company.tradeName} identificada como ${company.nicheLabel}. O Radar foi configurado automaticamente em um raio de ${radiusKm} km. Confirme o e-mail para entrar.`,
  };
}

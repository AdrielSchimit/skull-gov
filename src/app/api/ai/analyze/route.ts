import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeTenderWithGemini, getAiStatus } from "@/lib/ai/tender-analysis";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ opportunityId: z.string().uuid() });

export async function GET() {
  return NextResponse.json(getAiStatus());
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para analisar o edital." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Oportunidade inválida." }, { status: 400 });

  const [{ data: profile }, { data: opportunity, error: opportunityError }] = await Promise.all([
    supabase.from("profiles").select("tenant_id,role").eq("id", user.id).maybeSingle(),
    supabase.from("opportunities").select("*").eq("id", parsed.data.opportunityId).maybeSingle(),
  ]);

  if (opportunityError || !opportunity) return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });
  if (!profile?.tenant_id) return NextResponse.json({ error: "Sua conta ainda não possui empresa/tenant configurado." }, { status: 403 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "IA preparada, aguardando GEMINI_API_KEY na Vercel.", code: "AI_NOT_CONFIGURED", ...getAiStatus() }, { status: 503 });
  }

  try {
    await supabase.from("opportunity_analyses").upsert({
      tenant_id: profile.tenant_id,
      opportunity_id: opportunity.id,
      status: "processing",
      provider: "Google Gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      summary: {},
      error_message: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,opportunity_id" });

    const analysis = await analyzeTenderWithGemini(opportunity as unknown as Opportunity);
    const { error: saveError } = await supabase.from("opportunity_analyses").upsert({
      tenant_id: profile.tenant_id,
      opportunity_id: opportunity.id,
      status: "ready",
      provider: analysis.provider,
      model: analysis.model,
      summary: analysis.summary,
      error_message: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,opportunity_id" });
    if (saveError) return NextResponse.json({ error: "A análise foi concluída, mas não pôde ser salva.", analysis: analysis.summary }, { status: 200 });
    return NextResponse.json({ analysis: analysis.summary, provider: analysis.provider, model: analysis.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida na análise.";
    await supabase.from("opportunity_analyses").upsert({
      tenant_id: profile.tenant_id,
      opportunity_id: opportunity.id,
      status: "failed",
      provider: "Google Gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      summary: {},
      error_message: message,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,opportunity_id" });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

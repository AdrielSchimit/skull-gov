import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchOpenContractings } from "@/lib/pncp/pncp-client";
import { normalizeContracting } from "@/lib/pncp/pncp-normalizer";
import { matchesProspectingOpportunity, PROSPECTING_PROFILES, type ProspectingProfileKey } from "@/lib/prospecting";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  niche: z.string(),
  radius: z.number().int().min(50).max(300).default(180),
});

// Municípios do eixo comercial da região de Barrinha. Códigos IBGE oficiais.
// A busca por município evita varrer milhares de pregões do estado inteiro durante uma demonstração.
const REGION = [
  { city: "Barrinha", ibge: "3505609", km: 0 },
  { city: "Jaboticabal", ibge: "3524303", km: 18 },
  { city: "Sertãozinho", ibge: "3551702", km: 24 },
  { city: "Ribeirão Preto", ibge: "3543402", km: 37 },
  { city: "Bebedouro", ibge: "3506102", km: 41 },
  { city: "Araraquara", ibge: "3503208", km: 66 },
  { city: "Batatais", ibge: "3505906", km: 83 },
  { city: "Barretos", ibge: "3505500", km: 91 },
  { city: "Franca", ibge: "3516200", km: 126 },
] as const;

// Pregão eletrônico, pregão presencial e dispensa são as modalidades mais úteis para comércio local.
const RETAIL_MODALITIES = [6, 7, 8] as const;
const toPncpDate = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");

type Normalized = Omit<Opportunity, "id" | "tenant_id">;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "skull_admin") return NextResponse.json({ error: "Acesso restrito à gestão SKULL." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !(parsed.data.niche in PROSPECTING_PROFILES)) return NextResponse.json({ error: "Perfil de prospecção inválido." }, { status: 400 });

  const niche = parsed.data.niche as ProspectingProfileKey;
  const radius = parsed.data.radius;
  const cities = REGION.filter((item) => item.km <= radius);
  const horizon = new Date(Date.now() + 45 * 86_400_000);
  const matches = new Map<string, Normalized>();
  let consulted = 0;
  let errors = 0;

  // Executa em pequenos lotes para não pressionar a API pública do PNCP.
  const jobs = cities.flatMap((city) => RETAIL_MODALITIES.map((modality) => ({ city, modality })));
  for (let offset = 0; offset < jobs.length; offset += 6) {
    const batch = jobs.slice(offset, offset + 6);
    const results = await Promise.allSettled(batch.map(async ({ city, modality }) => {
      const page = await fetchOpenContractings({
        endDate: toPncpDate(horizon),
        modalityCode: modality,
        page: 1,
        pageSize: 50,
        state: "SP",
        municipalityIbgeCode: city.ibge,
      }, { cacheSeconds: 0 });
      return { city, page };
    }));

    for (const result of results) {
      if (result.status === "rejected") { errors += 1; continue; }
      consulted += result.value.page.data.length;
      for (const raw of result.value.page.data) {
        const normalized = normalizeContracting(raw, { sourceName: "PNCP" });
        if (!normalized) continue;
        // Usa a distância regional conhecida na demonstração, mesmo se o normalizador ainda não possuir a cidade.
        const withDistance = { ...normalized, distance_km: result.value.city.km } as Normalized;
        if (!matchesProspectingOpportunity(withDistance as Opportunity, niche, radius)) continue;
        matches.set(withDistance.pncp_id, withDistance);
      }
    }
  }

  let inserted = 0;
  let updated = 0;
  const opportunities = [...matches.values()];
  for (const item of opportunities) {
    const { data: existing } = await supabase.from("opportunities").select("pncp_id").eq("pncp_id", item.pncp_id).maybeSingle();
    const { error } = await supabase.from("opportunities").upsert(item, { onConflict: "pncp_id" });
    if (error) { errors += 1; continue; }
    if (existing) updated += 1; else inserted += 1;
  }

  await supabase.from("sync_runs").insert({
    status: "completed",
    started_by: user.id,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    filters: { mode: "prospeccao", niche, radius, cities: cities.map((item) => item.city), source: "PNCP propostas abertas" },
    found_count: consulted,
    inserted_count: inserted,
    updated_count: updated,
    error_count: errors,
  });

  return NextResponse.json({
    consulted,
    compatible: matches.size,
    inserted,
    updated,
    errors,
    cities: cities.map((item) => item.city),
    source: "PNCP · propostas abertas",
  });
}

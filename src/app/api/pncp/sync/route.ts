import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchPublishedContractings, PNCP_MODALITIES } from "@/lib/pncp/pncp-client";
import { normalizeContracting } from "@/lib/pncp/pncp-normalizer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ state: z.string().regex(/^[A-Z]{2}$/).default("SP"), days: z.number().int().min(1).max(30).default(14) });
const toPncpDate = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "skull_admin") return NextResponse.json({ error: "Apenas SKULL Admin pode sincronizar o PNCP." }, { status: 403 });

  let input: z.infer<typeof bodySchema>;
  try { input = bodySchema.parse(await request.json()); } catch { return NextResponse.json({ error: "Parâmetros de sincronização inválidos." }, { status: 400 }); }

  const now = new Date();
  const start = new Date(now.getTime() - input.days * 86_400_000);
  const { data: run, error: runError } = await supabase.from("sync_runs").insert({ status: "running", started_by: user.id, filters: input }).select("id").single();
  if (runError || !run) return NextResponse.json({ error: runError?.message ?? "Não foi possível registrar a sincronização." }, { status: 500 });

  let found = 0;
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const normalized = new Map<string, ReturnType<typeof normalizeContracting>>();

  try {
    for (const modalityCode of PNCP_MODALITIES) {
      let page = 1;
      let totalPages = 1;
      do {
        try {
          const result = await fetchPublishedContractings({ startDate: toPncpDate(start), endDate: toPncpDate(now), modalityCode, page, pageSize: 50, state: input.state }, { cacheSeconds: 0 });
          found += result.data.length;
          for (const item of result.data) {
            const opportunity = normalizeContracting(item);
            if (opportunity) normalized.set(opportunity.pncp_id, opportunity);
          }
          totalPages = Math.min(result.totalPaginas || 1, 3);
        } catch { errors += 1; }
        await pause(120);
        page += 1;
      } while (page <= totalPages);
    }

    if (found === 0 && errors >= PNCP_MODALITIES.length) {
      throw new Error("A API oficial do PNCP não respondeu nesta execução.");
    }

    const opportunities = [...normalized.values()].filter((value): value is NonNullable<typeof value> => value !== null);
    for (let offset = 0; offset < opportunities.length; offset += 100) {
      const batch = opportunities.slice(offset, offset + 100);
      const ids = batch.map((item) => item.pncp_id);
      const { data: existing, error: existingError } = await supabase.from("opportunities").select("pncp_id").in("pncp_id", ids);
      if (existingError) throw existingError;
      const existingIds = new Set((existing ?? []).map((item) => item.pncp_id as string));
      const { error: upsertError } = await supabase.from("opportunities").upsert(batch, { onConflict: "pncp_id" });
      if (upsertError) throw upsertError;
      const existingCount = batch.filter((item) => existingIds.has(item.pncp_id)).length;
      updated += existingCount;
      inserted += batch.length - existingCount;
    }

    await supabase.from("sync_runs").update({ status: "completed", finished_at: new Date().toISOString(), found_count: found, inserted_count: inserted, updated_count: updated, error_count: errors }).eq("id", run.id);
    return NextResponse.json({ found, inserted, updated, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida.";
    await supabase.from("sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), found_count: found, inserted_count: inserted, updated_count: updated, error_count: errors + 1, error_message: message }).eq("id", run.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

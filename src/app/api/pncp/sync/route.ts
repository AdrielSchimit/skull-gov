import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchPublishedContractings, PNCP_MODALITIES } from "@/lib/pncp/pncp-client";
import { normalizeContracting } from "@/lib/pncp/pncp-normalizer";
import { COMPRAS_GOV_MODALITIES, fetchComprasGovContractings } from "@/lib/sources/compras-gov";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ state: z.string().regex(/^[A-Z]{2}$/).default("SP"), days: z.number().int().min(1).max(30).default(14) });
const toPncpDate = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
type Normalized = Omit<Opportunity, "id" | "tenant_id">;

function mergeOpportunity(target: Map<string, Normalized>, incoming: Normalized) {
  const current = target.get(incoming.pncp_id);
  if (!current) {
    target.set(incoming.pncp_id, incoming);
    return;
  }
  target.set(incoming.pncp_id, {
    ...current,
    source_names: Array.from(new Set([...(current.source_names ?? []), ...(incoming.source_names ?? [])])),
    source_refs: { ...(current.source_refs ?? {}), ...(incoming.source_refs ?? {}) },
    estimated_value: current.estimated_value ?? incoming.estimated_value,
    opens_at: current.opens_at ?? incoming.opens_at,
    closes_at: current.closes_at ?? incoming.closes_at,
    source_updated_at: current.source_updated_at ?? incoming.source_updated_at,
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "skull_admin") return NextResponse.json({ error: "Apenas SKULL Admin pode sincronizar o Radar." }, { status: 403 });

  let input: z.infer<typeof bodySchema>;
  try { input = bodySchema.parse(await request.json()); } catch { return NextResponse.json({ error: "Parâmetros de sincronização inválidos." }, { status: 400 }); }

  const now = new Date();
  const start = new Date(now.getTime() - input.days * 86_400_000);
  const { data: run, error: runError } = await supabase.from("sync_runs").insert({ status: "running", started_by: user.id, filters: { ...input, sources: ["PNCP", "Compras.gov"] } }).select("id").single();
  if (runError || !run) return NextResponse.json({ error: runError?.message ?? "Não foi possível registrar a sincronização." }, { status: 500 });

  let inserted = 0;
  let updated = 0;
  const normalized = new Map<string, Normalized>();

  const collectPncp = async () => {
    let found = 0;
    let errors = 0;
    for (const modalityCode of PNCP_MODALITIES) {
      let page = 1;
      let totalPages = 1;
      do {
        try {
          const result = await fetchPublishedContractings({ startDate: toPncpDate(start), endDate: toPncpDate(now), modalityCode, page, pageSize: 50, state: input.state }, { cacheSeconds: 0 });
          found += result.data.length;
          for (const item of result.data) {
            const opportunity = normalizeContracting(item, { sourceName: "PNCP" });
            if (opportunity) mergeOpportunity(normalized, opportunity);
          }
          totalPages = Math.min(result.totalPaginas || 1, 3);
        } catch { errors += 1; }
        await pause(90);
        page += 1;
      } while (page <= totalPages);
    }
    return { found, errors };
  };

  const collectComprasGov = async () => {
    let found = 0;
    let errors = 0;
    for (const modalityCode of COMPRAS_GOV_MODALITIES) {
      let page = 1;
      let totalPages = 1;
      do {
        try {
          const result = await fetchComprasGovContractings({ startDate: toIsoDate(start), endDate: toIsoDate(now), modalityCode, page, pageSize: 100, state: input.state });
          found += result.data.length;
          for (const item of result.data) {
            const opportunity = normalizeContracting(item, { sourceName: "Compras.gov", sourceRef: "https://dadosabertos.compras.gov.br/" });
            if (opportunity) mergeOpportunity(normalized, opportunity);
          }
          totalPages = Math.min(result.totalPaginas || 1, 2);
        } catch { errors += 1; }
        await pause(90);
        page += 1;
      } while (page <= totalPages);
    }
    return { found, errors };
  };

  try {
    const [pncp, comprasGov] = await Promise.all([collectPncp(), collectComprasGov()]);
    const found = pncp.found + comprasGov.found;
    const errors = pncp.errors + comprasGov.errors;
    if (normalized.size === 0 && errors >= PNCP_MODALITIES.length + COMPRAS_GOV_MODALITIES.length) {
      throw new Error("As fontes oficiais não responderam nesta execução.");
    }

    const opportunities = [...normalized.values()];
    for (let offset = 0; offset < opportunities.length; offset += 100) {
      const batch = opportunities.slice(offset, offset + 100);
      const ids = batch.map((item) => item.pncp_id);
      const { data: existing, error: existingError } = await supabase.from("opportunities").select("pncp_id,source_names,source_refs").in("pncp_id", ids);
      if (existingError) throw existingError;
      const existingMap = new Map((existing ?? []).map((item) => [item.pncp_id as string, item]));
      const mergedBatch = batch.map((item) => {
        const previous = existingMap.get(item.pncp_id) as { source_names?: string[]; source_refs?: Record<string, string> } | undefined;
        return previous ? {
          ...item,
          source_names: Array.from(new Set([...(previous.source_names ?? []), ...item.source_names])),
          source_refs: { ...(previous.source_refs ?? {}), ...item.source_refs },
        } : item;
      });
      const { error: upsertError } = await supabase.from("opportunities").upsert(mergedBatch, { onConflict: "pncp_id" });
      if (upsertError) throw upsertError;
      const existingCount = batch.filter((item) => existingMap.has(item.pncp_id)).length;
      updated += existingCount;
      inserted += batch.length - existingCount;
    }

    await supabase.from("sync_runs").update({ status: "completed", finished_at: new Date().toISOString(), found_count: found, inserted_count: inserted, updated_count: updated, error_count: errors }).eq("id", run.id);
    return NextResponse.json({ found, inserted, updated, errors, unique: normalized.size, sources: { PNCP: pncp, "Compras.gov": comprasGov } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida.";
    await supabase.from("sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), found_count: normalized.size, inserted_count: inserted, updated_count: updated, error_count: 1, error_message: message }).eq("id", run.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

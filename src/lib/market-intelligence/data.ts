import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface MarketOverview {
  suppliers: number;
  buyers: number;
  procurements: number;
  items: number;
  results: number;
  homologatedValue: number;
  latestRun: {
    status: string;
    source_system: string;
    resource: string;
    started_at: string;
    finished_at: string | null;
    records_seen: number;
    inserted_count: number;
    updated_count: number;
    failed_count: number;
    error_summary: string | null;
  } | null;
}

export interface MarketSupplierListRow {
  id: string;
  supplier_kind: string;
  normalized_cnpj: string | null;
  masked_document: string | null;
  legal_name: string;
  trade_name: string | null;
  city: string | null;
  state: string | null;
  main_cnae: string | null;
  metrics?: {
    procurements_won: number;
    items_won: number;
    win_rate_items: number | null;
    homologated_value: number;
    distinct_buyers: number;
    participant_coverage_status: string;
    first_activity_at: string | null;
    last_activity_at: string | null;
  } | null;
  lead_score?: {
    total_score: number | null;
    score_version: string;
    explanation: string[];
  } | null;
}

export interface MarketSupplierDetail extends MarketSupplierListRow {
  sources: Array<{ source_system: string; source_key: string; source_url: string | null; data_quality: string; ingested_at: string }>;
  results: Array<{
    id: string;
    homologated_quantity: number | null;
    homologated_unit_value: number | null;
    homologated_total_value: number | null;
    status: string | null;
    result_date: string | null;
    item?: { description: string; unit: string | null; estimated_unit_value: number | null } | null;
    procurement?: { object: string | null; modality: string | null; coverage_status: string; participant_coverage_status: string } | null;
  }>;
}

export async function getMarketOverview(): Promise<{ configured: boolean; error: string | null; data: MarketOverview }> {
  const empty: MarketOverview = { suppliers: 0, buyers: 0, procurements: 0, items: 0, results: 0, homologatedValue: 0, latestRun: null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { configured: false, error: null, data: empty };

  const [suppliers, buyers, procurements, items, results, latestRun, sampleResults] = await Promise.all([
    supabase.from("market_suppliers").select("id", { count: "exact", head: true }),
    supabase.from("market_buyers").select("id", { count: "exact", head: true }),
    supabase.from("market_procurements").select("id", { count: "exact", head: true }),
    supabase.from("market_procurement_items").select("id", { count: "exact", head: true }),
    supabase.from("market_results").select("id", { count: "exact", head: true }),
    supabase.from("market_ingestion_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("market_results").select("homologated_total_value").limit(5000),
  ]);
  const error = [suppliers, buyers, procurements, items, results, latestRun, sampleResults].find((result) => result.error)?.error?.message ?? null;
  const values = (sampleResults.data ?? []) as Array<{ homologated_total_value: number | null }>;
  return {
    configured: true,
    error,
    data: {
      suppliers: suppliers.count ?? 0,
      buyers: buyers.count ?? 0,
      procurements: procurements.count ?? 0,
      items: items.count ?? 0,
      results: results.count ?? 0,
      homologatedValue: values.reduce((total, row) => total + (row.homologated_total_value ?? 0), 0),
      latestRun: latestRun.data as MarketOverview["latestRun"],
    },
  };
}

export async function getMarketSuppliers(options: { query?: string; page?: number; pageSize?: number } = {}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { configured: false, error: null as string | null, data: [] as MarketSupplierListRow[], count: 0 };
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
  let request = supabase
    .from("market_suppliers")
    .select("*, metrics:market_supplier_metrics(*), lead_score:market_lead_scores(*)", { count: "exact" })
    .order("legal_name")
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (options.query) {
    const safeQuery = options.query.replace(/[%_,()]/g, "");
    request = request.or(`legal_name.ilike.%${safeQuery}%,normalized_cnpj.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%`);
  }
  const { data, count, error } = await request;
  return { configured: true, error: error?.message ?? null, data: (data ?? []) as unknown as MarketSupplierListRow[], count: count ?? 0 };
}

export async function getMarketSupplier(id: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { configured: false, error: null as string | null, data: null as MarketSupplierDetail | null };
  const [supplier, sources, results] = await Promise.all([
    supabase.from("market_suppliers").select("*, metrics:market_supplier_metrics(*), lead_score:market_lead_scores(*)").eq("id", id).maybeSingle(),
    supabase.from("market_supplier_source_ids").select("source_system,source_key,source_url,data_quality,ingested_at").eq("supplier_id", id).order("ingested_at", { ascending: false }).limit(50),
    supabase.from("market_results").select("id,homologated_quantity,homologated_unit_value,homologated_total_value,status,result_date,item:market_procurement_items(description,unit,estimated_unit_value),procurement:market_procurements(object,modality,coverage_status,participant_coverage_status)").eq("supplier_id", id).order("result_date", { ascending: false, nullsFirst: false }).limit(50),
  ]);
  const error = supplier.error?.message ?? sources.error?.message ?? results.error?.message ?? null;
  if (!supplier.data) return { configured: true, error, data: null };
  return {
    configured: true,
    error,
    data: {
      ...(supplier.data as unknown as MarketSupplierListRow),
      sources: (sources.data ?? []) as MarketSupplierDetail["sources"],
      results: (results.data ?? []) as unknown as MarketSupplierDetail["results"],
    },
  };
}

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AlertRule, Company, CompanyDocument, DashboardMetrics, Opportunity, Participation, SyncRun, UserRole } from "@/lib/types";

export interface PageResult<T> {
  data: T[];
  count: number;
  configured: boolean;
  error: string | null;
}

export async function getServerTimestamp() {
  return Date.now();
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { configured: false, user: null, role: null as UserRole | null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configured: true, user: null, role: null as UserRole | null };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { configured: true, user, role: (data?.role as UserRole | undefined) ?? null };
}

export async function getOpportunities(options: { page?: number; pageSize?: number; filter?: string; query?: string } = {}): Promise<PageResult<Opportunity>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [], count: 0, configured: false, error: null };
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
  let request = supabase.from("opportunities").select("*", { count: "exact" }).order("closes_at", { ascending: true, nullsFirst: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (options.filter === "quick-cash") request = request.gte("skull_score", 70).eq("working_capital", "baixo").gte("estimated_value", 5000).lte("estimated_value", 200000);
  if (options.filter === "drive") request = request.lte("distance_km", 200);
  if (options.filter === "attack") request = request.eq("recommendation", "atacar");
  if (options.query) {
    const safeQuery = options.query.replace(/[%_,()]/g, "");
    request = request.or(`object.ilike.%${safeQuery}%,agency_name.ilike.%${safeQuery}%`);
  }
  const { data, count, error } = await request;
  return { data: (data ?? []) as unknown as Opportunity[], count: count ?? 0, configured: true, error: error?.message ?? null };
}

export async function getOpportunity(id: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: null as Opportunity | null, configured: false, error: null as string | null };
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  return { data: data as unknown as Opportunity | null, configured: true, error: error?.message ?? null };
}

export async function getCompanies(): Promise<PageResult<Company>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [], count: 0, configured: false, error: null };
  const { data, count, error } = await supabase.from("companies").select("*", { count: "exact" }).order("trade_name").limit(50);
  return { data: (data ?? []) as unknown as Company[], count: count ?? 0, configured: true, error: error?.message ?? null };
}

export async function getCompany(id: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: null as Company | null, configured: false, error: null as string | null };
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  return { data: data as unknown as Company | null, configured: true, error: error?.message ?? null };
}

export async function getLatestSync(): Promise<SyncRun | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle();
  return data as unknown as SyncRun | null;
}

export async function getDocuments(): Promise<PageResult<CompanyDocument>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [], count: 0, configured: false, error: null };
  const { data, count, error } = await supabase.from("company_documents").select("*", { count: "exact" }).order("expires_at", { ascending: true, nullsFirst: false }).limit(100);
  return { data: (data ?? []) as unknown as CompanyDocument[], count: count ?? 0, configured: true, error: error?.message ?? null };
}

export async function getParticipations(): Promise<PageResult<Participation>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [], count: 0, configured: false, error: null };
  const { data, count, error } = await supabase.from("participations").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
  return { data: (data ?? []) as unknown as Participation[], count: count ?? 0, configured: true, error: error?.message ?? null };
}

export async function getAlertRules(): Promise<PageResult<AlertRule>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [], count: 0, configured: false, error: null };
  const { data, count, error } = await supabase.from("alert_rules").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
  return { data: (data ?? []) as unknown as AlertRule[], count: count ?? 0, configured: true, error: error?.message ?? null };
}

export async function getDashboardMetrics(): Promise<{ metrics: DashboardMetrics; configured: boolean; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const empty: DashboardMetrics = { newCount: 0, greenCount: 0, closingSoonCount: 0, potentialValue: 0, regionalCount: 0, nationalCount: 0, averageScore: 0, averagePayRisk: null };
  if (!supabase) return { metrics: empty, configured: false, error: null };
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString();
  const soon = new Date(now.getTime() + 48 * 3_600_000).toISOString();
  const [recent, green, closing, regional, national, sample] = await Promise.all([
    supabase.from("opportunities").select("id", { count: "exact", head: true }).gte("published_at", yesterday),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("recommendation", "atacar"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).gte("closes_at", now.toISOString()).lte("closes_at", soon),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).lte("distance_km", 200),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).or("distance_km.gt.200,distance_km.is.null"),
    supabase.from("opportunities").select("estimated_value,skull_score,pay_risk").order("published_at", { ascending: false }).limit(500),
  ]);
  const error = [recent, green, closing, regional, national, sample].find((result) => result.error)?.error?.message ?? null;
  const rows = (sample.data ?? []) as Array<{ estimated_value: number | null; skull_score: number; pay_risk: number | null }>;
  const payValues = rows.flatMap((row) => row.pay_risk === null ? [] : [row.pay_risk]);
  return {
    configured: true,
    error,
    metrics: {
      newCount: recent.count ?? 0,
      greenCount: green.count ?? 0,
      closingSoonCount: closing.count ?? 0,
      potentialValue: rows.reduce((total, row) => total + (row.estimated_value ?? 0), 0),
      regionalCount: regional.count ?? 0,
      nationalCount: national.count ?? 0,
      averageScore: rows.length ? Math.round(rows.reduce((total, row) => total + row.skull_score, 0) / rows.length) : 0,
      averagePayRisk: payValues.length ? Math.round(payValues.reduce((total, value) => total + value, 0) / payValues.length) : null,
    },
  };
}

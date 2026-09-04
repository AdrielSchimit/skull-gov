import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity, UserRole } from "@/lib/types";

export async function getCompanyAwareOpportunities(options: { page?: number; pageSize?: number; filter?: string; query?: string } = {}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [] as Opportunity[], count: 0, configured: false, error: null as string | null, companyName: null as string | null, radiusKm: null as number | null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] as Opportunity[], count: 0, configured: true, error: null as string | null, companyName: null as string | null, radiusKm: null as number | null };

  const { data: profile } = await supabase.from("profiles").select("role,tenant_id").eq("id", user.id).maybeSingle();
  const role = (profile?.role as UserRole | undefined) ?? null;
  const tenantId = profile?.tenant_id as string | null | undefined;
  let companyName: string | null = null;
  let radiusKm: number | null = null;
  let terms: string[] = [];

  if (role !== "skull_admin" && tenantId) {
    const { data: company } = await supabase.from("companies").select("trade_name,preferences,positive_keywords").eq("tenant_id", tenantId).limit(1).maybeSingle();
    if (company) {
      companyName = company.trade_name;
      const preferences = (company.preferences ?? {}) as Record<string, unknown>;
      radiusKm = Number(preferences.radius_km ?? 300);
      terms = ((company.positive_keywords ?? []) as string[]).map((term) => term.replace(/[%_,()]/g, "").trim()).filter(Boolean).slice(0, 18);
    }
  }

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  let request = supabase.from("opportunities").select("*", { count: "exact" }).order("closes_at", { ascending: true, nullsFirst: false });

  if (companyName) {
    request = request.lte("distance_km", radiusKm ?? 300);
    if (terms.length) request = request.or(terms.map((term) => `object.ilike.%${term}%`).join(","));
  }

  if (options.filter === "quick-cash") request = request.in("working_capital", ["baixo", "medio"]);
  if (options.filter === "drive") request = request.lte("distance_km", radiusKm ?? 200);
  if (options.filter === "attack") request = request.eq("recommendation", "atacar");
  if (options.query) {
    const q = options.query.replace(/[%_,()]/g, "");
    request = request.or(`object.ilike.%${q}%,agency_name.ilike.%${q}%`);
  }

  request = request.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await request;
  return { data: (data ?? []) as unknown as Opportunity[], count: count ?? 0, configured: true, error: error?.message ?? null, companyName, radiusKm };
}

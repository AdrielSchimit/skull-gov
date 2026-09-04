import "server-only";

import { classifyEligibility, classifyVertical, type ParticipantEligibility, type Vertical } from "@/lib/classification";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isProspectingProfileKey,
  matchesProspectingOpportunity,
  resolveProspectingProfileKey,
  type ProspectingProfileKey,
} from "@/lib/niche-matcher";
import type { Opportunity, UserRole } from "@/lib/types";

function cleanTerms(values: string[], max = 40) {
  return values.map((term) => term.replace(/[%_,()]/g, "").trim()).filter(Boolean).slice(0, max);
}

function normalize(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function opportunityVertical(opportunity: Opportunity): Vertical {
  return opportunity.vertical ?? classifyVertical({ object: opportunity.object }).vertical;
}

function opportunityEligibility(opportunity: Opportunity): ParticipantEligibility {
  return opportunity.participant_eligibility ?? classifyEligibility({ object: opportunity.object }).status;
}

function matchesTextSearch(opportunity: Opportunity, query: string | undefined) {
  if (!query) return true;
  const q = normalize(query);
  return normalize(opportunity.object).includes(q) || normalize(opportunity.agency_name).includes(q);
}

export async function getCompanyAwareOpportunities(options: { page?: number; pageSize?: number; filter?: string; query?: string; vertical?: Vertical; eligibility?: ParticipantEligibility } = {}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [] as Opportunity[], count: 0, configured: false, error: null as string | null, companyName: null as string | null, radiusKm: null as number | null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] as Opportunity[], count: 0, configured: true, error: null as string | null, companyName: null as string | null, radiusKm: null as number | null };

  const { data: profile } = await supabase.from("profiles").select("role,tenant_id").eq("id", user.id).maybeSingle();
  const role = (profile?.role as UserRole | undefined) ?? null;
  const tenantId = profile?.tenant_id as string | null | undefined;

  let companyName: string | null = null;
  let radiusKm: number | null = null;
  let positiveTerms: string[] = [];
  let negativeTerms: string[] = [];
  let clientMode: string | null = null;

  if (role === "skull_admin") {
    companyName = "SKULL Tecnologia";
    radiusKm = 200;
  } else if (tenantId) {
    const { data: company } = await supabase.from("companies").select("trade_name,preferences,positive_keywords,negative_keywords").eq("tenant_id", tenantId).limit(1).maybeSingle();
    if (company) {
      companyName = company.trade_name;
      const preferences = (company.preferences ?? {}) as Record<string, unknown>;
      radiusKm = Number(preferences.radius_km ?? 300);
      clientMode = typeof preferences.client_mode === "string" ? preferences.client_mode : null;
      positiveTerms = (company.positive_keywords ?? []) as string[];
      negativeTerms = (company.negative_keywords ?? []) as string[];
    }
  }

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));

  if (role === "skull_admin") {
    let adminRequest = supabase.from("opportunities").select("*").or(`closes_at.gte.${new Date().toISOString()},closes_at.is.null`).order("closes_at", { ascending: true, nullsFirst: false }).limit(1000);
    if (options.filter === "quick-cash") adminRequest = adminRequest.in("working_capital", ["baixo", "medio"]);
    if (options.filter === "drive") adminRequest = adminRequest.lte("distance_km", radiusKm ?? 200);
    if (options.filter === "attack") adminRequest = adminRequest.eq("recommendation", "atacar");
    const { data, error } = await adminRequest;
    const vertical = options.vertical ?? "software";
    const filtered = ((data ?? []) as unknown as Opportunity[])
      .filter((item) => opportunityVertical(item) === vertical)
      .filter((item) => !options.eligibility || opportunityEligibility(item) === options.eligibility)
      .filter((item) => matchesTextSearch(item, options.query));
    const start = (page - 1) * pageSize;
    return { data: filtered.slice(start, start + pageSize), count: filtered.length, configured: true, error: error?.message ?? null, companyName, radiusKm };
  }

  // Known retail niches are filtered in application code with the same strict classifier used by Modo Gestor.
  // This prevents cross-tenant noise such as software, sewer works or packaging that only mention a niche word in passing.
  if (clientMode && isProspectingProfileKey(clientMode)) {
    const canonicalClientMode = resolveProspectingProfileKey(clientMode) as ProspectingProfileKey;
    let clientRequest = supabase.from("opportunities").select("*").or(`closes_at.gte.${new Date().toISOString()},closes_at.is.null`).order("closes_at", { ascending: true, nullsFirst: false }).limit(1000);
    if (options.filter === "quick-cash") clientRequest = clientRequest.in("working_capital", ["baixo", "medio"]);
    if (options.filter === "attack") clientRequest = clientRequest.eq("recommendation", "atacar");
    const { data, error } = await clientRequest;
    const filtered = ((data ?? []) as unknown as Opportunity[])
      .filter((item) => matchesProspectingOpportunity(item, canonicalClientMode, radiusKm ?? 300))
      .filter((item) => matchesTextSearch(item, options.query));
    const start = (page - 1) * pageSize;
    return { data: filtered.slice(start, start + pageSize), count: filtered.length, configured: true, error: error?.message ?? null, companyName, radiusKm };
  }

  // Fallback for legacy or generic suppliers that do not yet have a structured client_mode.
  const terms = cleanTerms(positiveTerms);
  const negatives = cleanTerms(negativeTerms);
  let request = supabase.from("opportunities").select("*", { count: "exact" }).or(`closes_at.gte.${new Date().toISOString()},closes_at.is.null`).order("closes_at", { ascending: true, nullsFirst: false });
  if (terms.length) request = request.or(terms.map((term) => `object.ilike.%${term}%`).join(","));
  for (const term of negatives) request = request.not("object", "ilike", `%${term}%`);
  if (companyName) request = request.or(`distance_km.lte.${radiusKm ?? 300},distance_km.is.null,remote_execution.eq.true`);
  if (options.filter === "quick-cash") request = request.in("working_capital", ["baixo", "medio"]);
  if (options.filter === "drive") request = request.lte("distance_km", radiusKm ?? 300);
  if (options.filter === "attack") request = request.eq("recommendation", "atacar");
  if (options.query) {
    const q = options.query.replace(/[%_,()]/g, "");
    request = request.or(`object.ilike.%${q}%,agency_name.ilike.%${q}%`);
  }
  request = request.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await request;
  return { data: (data ?? []) as unknown as Opportunity[], count: count ?? 0, configured: true, error: error?.message ?? null, companyName, radiusKm };
}

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity, UserRole } from "@/lib/types";

const SKULL_TECH_TERMS = [
  "software", "sistema", "site", "portal", "aplicativo", "dashboard", "automação", "integração",
  "API", "SaaS", "hospedagem", "cloud", "suporte de TI", "manutenção de sistema", "desenvolvimento",
  "digitalização", "painel", "plataforma web", "inteligência artificial", "IA",
];

const SKULL_TECH_NEGATIVE = [
  "material de construção", "materiais de construção", "cimento", "argamassa", "madeira", "brita",
  "paisagismo", "urbanismo", "projeto arquitetônico", "arquitetura", "obra civil", "ferramentas",
];

function cleanTerms(values: string[], max = 30) {
  return values
    .map((term) => term.replace(/[%_,()]/g, "").trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function getCompanyAwareOpportunities(
  options: { page?: number; pageSize?: number; filter?: string; query?: string } = {},
) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      data: [] as Opportunity[],
      count: 0,
      configured: false,
      error: null as string | null,
      companyName: null as string | null,
      radiusKm: null as number | null,
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      data: [] as Opportunity[],
      count: 0,
      configured: true,
      error: null as string | null,
      companyName: null as string | null,
      radiusKm: null as number | null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole | undefined) ?? null;
  const tenantId = profile?.tenant_id as string | null | undefined;

  let companyName: string | null = null;
  let radiusKm: number | null = null;
  let positiveTerms: string[] = [];
  let negativeTerms: string[] = [];

  if (role === "skull_admin") {
    companyName = "SKULL Tecnologia";
    radiusKm = 200;
    positiveTerms = SKULL_TECH_TERMS;
    negativeTerms = SKULL_TECH_NEGATIVE;
  } else if (tenantId) {
    const { data: company } = await supabase
      .from("companies")
      .select("trade_name,preferences,positive_keywords,negative_keywords")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    if (company) {
      companyName = company.trade_name;
      const preferences = (company.preferences ?? {}) as Record<string, unknown>;
      radiusKm = Number(preferences.radius_km ?? 300);
      positiveTerms = (company.positive_keywords ?? []) as string[];
      negativeTerms = (company.negative_keywords ?? []) as string[];
    }
  }

  const terms = cleanTerms(positiveTerms);
  const negatives = cleanTerms(negativeTerms);
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));

  let request = supabase
    .from("opportunities")
    .select("*", { count: "exact" })
    .or(`closes_at.gte.${new Date().toISOString()},closes_at.is.null`)
    .order("closes_at", { ascending: true, nullsFirst: false });

  if (terms.length) {
    request = request.or(terms.map((term) => `object.ilike.%${term}%`).join(","));
  }

  for (const term of negatives) {
    request = request.not("object", "ilike", `%${term}%`);
  }

  if (role !== "skull_admin" && companyName) {
    request = request.or(`distance_km.lte.${radiusKm ?? 300},distance_km.is.null,remote_execution.eq.true`);
  }

  if (options.filter === "quick-cash") request = request.in("working_capital", ["baixo", "medio"]);
  if (options.filter === "drive") request = request.lte("distance_km", radiusKm ?? (role === "skull_admin" ? 200 : 300));
  if (options.filter === "attack") request = request.eq("recommendation", "atacar");

  if (options.query) {
    const q = options.query.replace(/[%_,()]/g, "");
    request = request.or(`object.ilike.%${q}%,agency_name.ilike.%${q}%`);
  }

  request = request.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await request;

  return {
    data: (data ?? []) as unknown as Opportunity[],
    count: count ?? 0,
    configured: true,
    error: error?.message ?? null,
    companyName,
    radiusKm,
  };
}

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export interface VerticalRadar {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  base_city: string;
  base_state: string;
  radius_km: number;
  positive_keywords: string[];
  negative_keywords: string[];
  enabled: boolean;
}

export async function getVerticalRadar(slug: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { radar: null as VerticalRadar | null, opportunities: [] as Opportunity[], error: "Supabase não configurado." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { radar: null as VerticalRadar | null, opportunities: [] as Opportunity[], error: "Sessão necessária." };

  const { data: profile } = await supabase.from("profiles").select("role,tenant_id").eq("id", user.id).maybeSingle();
  if (profile?.role !== "skull_admin") return { radar: null as VerticalRadar | null, opportunities: [] as Opportunity[], error: "Acesso restrito ao SKULL Admin." };

  const { data: radar, error: radarError } = await supabase
    .from("vertical_radars")
    .select("*")
    .eq("slug", slug)
    .eq("enabled", true)
    .maybeSingle();

  if (radarError || !radar) return { radar: null as VerticalRadar | null, opportunities: [] as Opportunity[], error: radarError?.message ?? "Radar não encontrado." };

  const terms = ((radar.positive_keywords ?? []) as string[])
    .map((term) => term.replace(/[%_,()]/g, "").trim())
    .filter(Boolean)
    .slice(0, 30);

  const now = new Date().toISOString();
  let request = supabase
    .from("opportunities")
    .select("*")
    .or(`closes_at.gte.${now},closes_at.is.null`)
    .order("closes_at", { ascending: true, nullsFirst: false })
    .limit(50);

  if (terms.length) request = request.or(terms.map((term) => `object.ilike.%${term}%`).join(","));
  request = request.or(`distance_km.lte.${radar.radius_km},distance_km.is.null,remote_execution.eq.true`);

  const { data, error } = await request;
  return {
    radar: radar as VerticalRadar,
    opportunities: (data ?? []) as unknown as Opportunity[],
    error: error?.message ?? null,
  };
}

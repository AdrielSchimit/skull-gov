import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import {
  isProspectingProfileKey,
  matchesProspectingOpportunity,
  PROSPECTING_PROFILES,
  type ProspectingProfileKey,
} from "@/lib/niche-matcher";

export { isProspectingProfileKey, matchesProspectingOpportunity, PROSPECTING_PROFILES };
export type { ProspectingProfileKey };

export async function getProspectingOpportunities(profileKey: ProspectingProfileKey, radiusKm: number) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { data: [] as Opportunity[], count: 0, error: "Supabase não configurado." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] as Opportunity[], count: 0, error: "Sessão necessária." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "skull_admin") return { data: [] as Opportunity[], count: 0, error: "Acesso restrito à gestão SKULL." };

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .or(`closes_at.gte.${new Date().toISOString()},closes_at.is.null`)
    .order("closes_at", { ascending: true, nullsFirst: false })
    .limit(1000);

  if (error) return { data: [] as Opportunity[], count: 0, error: error.message };

  const filtered = ((data ?? []) as unknown as Opportunity[])
    .filter((item) => matchesProspectingOpportunity(item, profileKey, radiusKm))
    .sort((a, b) => {
      const distance = (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
      if (distance !== 0) return distance;
      return new Date(a.closes_at ?? "2999-12-31").getTime() - new Date(b.closes_at ?? "2999-12-31").getTime();
    });

  return { data: filtered.slice(0, 30), count: filtered.length, error: null as string | null };
}

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface SessionContext {
  configured: boolean;
  userId: string | null;
  email: string | null;
  role: UserRole | null;
  tenantId: string | null;
  tenantName: string | null;
  companyName: string | null;
  radiusKm: number | null;
}

export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { configured: false, userId: null, email: null, role: null, tenantId: null, tenantName: null, companyName: null, radiusKm: null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configured: true, userId: null, email: null, role: null, tenantId: null, tenantName: null, companyName: null, radiusKm: null };

  const { data: profile } = await supabase.from("profiles").select("role,tenant_id").eq("id", user.id).maybeSingle();
  const role = (profile?.role as UserRole | undefined) ?? null;
  const tenantId = (profile?.tenant_id as string | null | undefined) ?? null;

  let tenantName: string | null = null;
  let companyName: string | null = null;
  let radiusKm: number | null = null;

  if (tenantId) {
    const [{ data: tenant }, { data: company }] = await Promise.all([
      supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      supabase.from("companies").select("trade_name,preferences").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    ]);
    tenantName = tenant?.name ?? null;
    companyName = company?.trade_name ?? null;
    const preferences = (company?.preferences ?? {}) as Record<string, unknown>;
    radiusKm = Number(preferences.radius_km ?? 0) || null;
  }

  return { configured: true, userId: user.id, email: user.email ?? null, role, tenantId, tenantName, companyName, radiusKm };
}

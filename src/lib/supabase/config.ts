const PRODUCTION_SUPABASE_URL = "https://kctpcbgaescujhsacqmm.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2NYhk_X-Pogremd1JyhZcA_5KILYon-";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PRODUCTION_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? PRODUCTION_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

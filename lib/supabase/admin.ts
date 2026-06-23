import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER ONLY.
 * Bypasses Row-Level Security — use only in trusted server code
 * (Super Admin actions, the public scan/draw endpoints that must write
 * rows the anonymous customer can't, system jobs).
 *
 * Never import this into a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env vars."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

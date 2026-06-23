"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (uses the public anon key).
 * Safe to use in Client Components. RLS policies enforce per-tenant access.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

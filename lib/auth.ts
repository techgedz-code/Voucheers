import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Merchant, Profile, UserRole } from "@/lib/types";

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: Profile;
  merchant: Merchant | null;
}

/**
 * Loads the logged-in user's profile (and merchant, if any).
 * Returns null when not authenticated.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  let merchant: Merchant | null = null;
  if (profile.merchant_id) {
    const { data } = await supabase
      .from("merchants")
      .select("*")
      .eq("id", profile.merchant_id)
      .single();
    merchant = data ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
    merchant,
  };
}

/**
 * Guards a page: requires auth and (optionally) one of the given roles.
 * Redirects to /login or "/" as appropriate.
 */
export async function requireAuth(roles?: UserRole[]): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (roles && !roles.includes(ctx.profile.role)) {
    // Logged in but wrong area — send them to their own home.
    redirect(ctx.profile.role === "super_admin" ? "/admin" : "/dashboard");
  }
  return ctx;
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { rewardDescription } from "@/lib/constants";
import type { RewardType } from "@/lib/types";

export interface CustomerVoucher {
  id: string;
  code: string;
  status: "active" | "redeemed" | "expired" | "void";
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  reward_text: string;
  conditions: string | null;
  outlet_name: string;
  label: string;
}

export interface CustomerSearchResult {
  phone: string;
  email: string | null;
  pdpa_consent: boolean;
  first_seen: string;
  last_seen: string;
  vouchers: CustomerVoucher[];
}

export interface SearchState {
  result?: CustomerSearchResult | null;
  error?: string;
  phone?: string;
}

export async function searchCustomer(
  _prev: SearchState,
  formData: FormData
): Promise<SearchState> {
  const ctx = await requireAuth(["merchant", "staff", "super_admin"]);

  // Super admin manages a specific merchant via the admin client; scope the
  // search to that merchant's outlets so results don't leak across tenants.
  const scopeMerchantId =
    ctx.profile.role === "super_admin"
      ? String(formData.get("merchant_id") || "").trim()
      : null;

  const { createAdminClient } = scopeMerchantId
    ? await import("@/lib/supabase/admin")
    : { createAdminClient: null };
  const supabase = scopeMerchantId && createAdminClient
    ? createAdminClient()
    : await createClient();

  const raw = String(formData.get("phone") || "").trim();
  // Normalise: strip spaces/dashes so "012 345 6789" matches "0123456789"
  const phone = raw.replace(/[\s\-]/g, "");
  if (!phone) return { error: "Enter a phone number to search." };

  // When scoping for super admin, restrict to this merchant's outlet ids.
  let scopeOutletIds: string[] | null = null;
  if (scopeMerchantId && supabase) {
    const { data: outletRows } = await supabase
      .from("outlets")
      .select("id")
      .eq("merchant_id", scopeMerchantId);
    scopeOutletIds = (outletRows ?? []).map((o) => o.id as string);
    if (scopeOutletIds.length === 0) return { phone: raw, result: null };
  }

  // entries are scoped to this merchant's outlets via RLS (merchant/staff) or
  // by explicit outlet filter (super admin managing a merchant).
  let entriesQuery = supabase
    .from("entries")
    .select("id, phone, email, pdpa_consent, created_at, outlets(name)")
    .eq("phone", phone)
    .order("created_at", { ascending: false });
  if (scopeOutletIds) {
    entriesQuery = entriesQuery.in("outlet_id", scopeOutletIds);
  }
  const { data: entries } = await entriesQuery;

  if (!entries || entries.length === 0) {
    return { phone: raw, result: null };
  }

  const entryIds = entries.map((e) => e.id);

  const { data: vouchers } = await supabase
    .from("issued_vouchers")
    .select(
      "id, code, status, issued_at, expires_at, redeemed_at, voucher_types(label, reward_type, value, conditions), outlets(name)"
    )
    .in("entry_id", entryIds)
    .order("issued_at", { ascending: false });

  const mapped: CustomerVoucher[] = (vouchers ?? []).map((v) => {
    const vt = v.voucher_types as unknown as {
      label: string;
      reward_type: RewardType;
      value: number | null;
      conditions: string | null;
    } | null;
    const outlet = v.outlets as unknown as { name: string } | null;
    return {
      id: v.id,
      code: v.code,
      status: v.status as CustomerVoucher["status"],
      issued_at: v.issued_at,
      expires_at: v.expires_at,
      redeemed_at: v.redeemed_at,
      reward_text: vt
        ? rewardDescription(vt.reward_type, vt.value, vt.label)
        : "Voucher",
      conditions: vt?.conditions ?? null,
      outlet_name: outlet?.name ?? "—",
      label: vt?.label ?? "Voucher",
    };
  });

  const allDates = entries.map((e) => e.created_at).sort();

  return {
    phone: raw,
    result: {
      phone: entries[0].phone,
      email: entries[0].email ?? null,
      pdpa_consent: entries[0].pdpa_consent,
      first_seen: allDates[0],
      last_seen: allDates[allDates.length - 1],
      vouchers: mapped,
    },
  };
}


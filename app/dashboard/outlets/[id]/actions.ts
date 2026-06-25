"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import type { RewardType } from "@/lib/types";
import { googleReviewUrl } from "@/lib/constants";

async function getSupabase(role: string) {
  return role === "super_admin" ? createAdminClient() : await createClient();
}

export async function updateOutletBranding(formData: FormData) {
  const ctx = await requireAuth(["merchant", "super_admin"]);
  const supabase = await getSupabase(ctx.profile.role);

  const id = String(formData.get("outlet_id"));
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const placeId = String(formData.get("google_place_id") || "").trim();
  const reviewInput = String(formData.get("review_url") || "").trim();
  const logoUrl = String(formData.get("logo_url") || "").trim();
  const brandColor = String(formData.get("brand_color") || "#e11d48").trim();

  const review_url = reviewInput || (placeId ? googleReviewUrl(placeId) : null);

  await supabase
    .from("outlets")
    .update({
      name: name || undefined,
      address: address || null,
      google_place_id: placeId || null,
      review_url,
      logo_url: logoUrl || null,
      brand_color: brandColor,
    })
    .eq("id", id);

  revalidatePath(`/dashboard/outlets/${id}`);
  revalidatePath(`/admin/merchants`);
}

/** Editable shape sent from the wheel editor (subset of VoucherType). */
export interface SegmentInput {
  id?: string;
  label: string;
  reward_type: RewardType;
  value: number | null;
  validity_days: number;
  conditions: string | null;
  win_weight: number;
  color: string | null;
  stock_limit: number | null;
  daily_limit: number | null;
  sort_order: number;
}

export async function saveCampaignSettings(formData: FormData) {
  const ctx = await requireAuth(["merchant", "super_admin"]);
  const supabase = await getSupabase(ctx.profile.role);
  const campaignId = String(formData.get("campaign_id"));
  const instagram = String(formData.get("instagram_handle") || "").trim();
  const isActive = String(formData.get("is_active")) === "on";
  const limitOnePlay = String(formData.get("limit_one_play_per_day")) === "on";

  await supabase
    .from("campaigns")
    .update({
      instagram_handle: instagram || null,
      is_active: isActive,
      limit_one_play_per_day: limitOnePlay,
    })
    .eq("id", campaignId);

  revalidatePath(`/dashboard/outlets`);
  revalidatePath(`/admin/merchants`);
}

export type SaveSegmentsState = { error?: string; ok?: boolean };

export async function saveVoucherTypes(
  _prev: SaveSegmentsState,
  formData: FormData
): Promise<SaveSegmentsState> {
  const ctx = await requireAuth(["merchant", "super_admin"]);
  const supabase = await getSupabase(ctx.profile.role);

  const campaignId = String(formData.get("campaign_id"));
  let segments: SegmentInput[];
  try {
    segments = JSON.parse(String(formData.get("segments") || "[]"));
  } catch {
    return { error: "Could not read the wheel configuration." };
  }

  if (segments.length === 0) {
    return { error: "Add at least one prize segment." };
  }
  const totalWeight = segments.reduce(
    (s, x) => s + Math.max(0, x.win_weight || 0),
    0
  );
  if (totalWeight <= 0) {
    return { error: "At least one segment must have a win weight above 0." };
  }
  for (const s of segments) {
    if (!s.label.trim()) return { error: "Every segment needs a label." };
    if (s.win_weight < 0) return { error: "Weights cannot be negative." };
  }

  // Verify the campaign exists.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .single();
  if (!campaign) return { error: "Campaign not found." };

  const keepIds = segments.filter((s) => s.id).map((s) => s.id as string);

  // Soft-delete segments that were removed (keeps issued vouchers valid).
  const delQuery = supabase
    .from("voucher_types")
    .update({ is_active: false })
    .eq("campaign_id", campaignId);
  if (keepIds.length > 0) {
    await delQuery.not("id", "in", `(${keepIds.join(",")})`);
  } else {
    await delQuery;
  }

  // Upsert each segment.
  for (const s of segments) {
    const row = {
      campaign_id: campaignId,
      label: s.label.trim(),
      reward_type: s.reward_type,
      value: s.value,
      validity_days: Math.max(1, s.validity_days || 30),
      conditions: s.conditions?.trim() || null,
      win_weight: Math.max(0, s.win_weight || 0),
      color: s.color || "#e11d48",
      stock_limit: s.stock_limit,
      daily_limit: s.daily_limit,
      sort_order: s.sort_order,
      is_active: true,
    };
    if (s.id) {
      await supabase.from("voucher_types").update(row).eq("id", s.id);
    } else {
      await supabase.from("voucher_types").insert(row);
    }
  }

  revalidatePath(`/dashboard/outlets`);
  revalidatePath(`/admin/merchants`);
  return { ok: true };
}

export type CopyConfigState = { ok?: boolean; error?: string; count?: number };

/**
 * Copies one outlet's spin wheel, campaign settings, and visual branding
 * (logo + brand colour) onto every OTHER outlet of the same merchant.
 *
 * Deliberately does NOT touch each outlet's name, address, or Google review
 * link / Place ID — those are unique per physical location and copying the
 * review link would funnel all branches' reviews into one Google listing.
 */
export async function copyConfigToAllOutlets(
  _prev: CopyConfigState,
  formData: FormData
): Promise<CopyConfigState> {
  const ctx = await requireAuth(["merchant", "super_admin"]);
  const supabase = await getSupabase(ctx.profile.role);

  const sourceOutletId = String(formData.get("outlet_id") || "");
  if (!sourceOutletId) return { error: "Missing source outlet." };

  // Source outlet (branding + merchant scope).
  const { data: srcOutlet } = await supabase
    .from("outlets")
    .select("id, merchant_id, logo_url, brand_color")
    .eq("id", sourceOutletId)
    .single();
  if (!srcOutlet) return { error: "Source outlet not found." };

  // Source campaign + its active voucher types.
  const { data: srcCampaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("outlet_id", sourceOutletId)
    .maybeSingle();

  const { data: srcTypes } = srcCampaign
    ? await supabase
        .from("voucher_types")
        .select("*")
        .eq("campaign_id", srcCampaign.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    : { data: [] };

  // Every other outlet of the same merchant.
  const { data: targets } = await supabase
    .from("outlets")
    .select("id")
    .eq("merchant_id", srcOutlet.merchant_id)
    .neq("id", sourceOutletId);

  const targetOutlets = (targets ?? []) as Array<{ id: string }>;
  if (targetOutlets.length === 0) return { ok: true, count: 0 };

  for (const t of targetOutlets) {
    // 1. Visual branding (logo + colour) — name/address/review link untouched.
    await supabase
      .from("outlets")
      .update({
        logo_url: srcOutlet.logo_url,
        brand_color: srcOutlet.brand_color,
      })
      .eq("id", t.id);

    // 2. Ensure the target has a campaign.
    let { data: tCampaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("outlet_id", t.id)
      .maybeSingle();
    if (!tCampaign) {
      const { data: created } = await supabase
        .from("campaigns")
        .insert({ outlet_id: t.id })
        .select("id")
        .single();
      tCampaign = created;
    }
    if (!tCampaign) continue;

    // 3. Campaign settings.
    if (srcCampaign) {
      await supabase
        .from("campaigns")
        .update({
          instagram_handle: srcCampaign.instagram_handle,
          is_active: srcCampaign.is_active,
          limit_one_play_per_day: srcCampaign.limit_one_play_per_day,
        })
        .eq("id", tCampaign.id);
    }

    // 4. Spin wheel: soft-delete the target's current prizes (keeps already
    // issued vouchers valid), then insert fresh copies of the source's prizes.
    await supabase
      .from("voucher_types")
      .update({ is_active: false })
      .eq("campaign_id", tCampaign.id);

    if (srcTypes && srcTypes.length > 0) {
      const rows = srcTypes.map((s) => ({
        campaign_id: tCampaign!.id,
        label: s.label,
        reward_type: s.reward_type,
        value: s.value,
        validity_days: s.validity_days,
        conditions: s.conditions,
        win_weight: s.win_weight,
        color: s.color,
        stock_limit: s.stock_limit,
        daily_limit: s.daily_limit,
        sort_order: s.sort_order,
        is_active: true,
      }));
      await supabase.from("voucher_types").insert(rows);
    }
  }

  revalidatePath(`/dashboard/outlets`);
  revalidatePath(`/admin/merchants`);
  return { ok: true, count: targetOutlets.length };
}

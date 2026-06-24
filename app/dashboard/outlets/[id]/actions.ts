"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { RewardType } from "@/lib/types";
import { googleReviewUrl } from "@/lib/constants";

export async function updateOutletBranding(formData: FormData) {
  await requireAuth(["merchant"]);
  const supabase = await createClient();

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
  await requireAuth(["merchant"]);
  const supabase = await createClient();
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
}

export type SaveSegmentsState = { error?: string; ok?: boolean };

export async function saveVoucherTypes(
  _prev: SaveSegmentsState,
  formData: FormData
): Promise<SaveSegmentsState> {
  await requireAuth(["merchant"]);
  const supabase = await createClient();

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

  // Verify the campaign belongs to the current merchant (RLS also enforces this).
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .single();
  if (!campaign) return { error: "Campaign not found." };

  const keepIds = segments.filter((s) => s.id).map((s) => s.id as string);

  // Soft-delete segments the merchant removed (keeps issued vouchers valid).
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
  return { ok: true };
}

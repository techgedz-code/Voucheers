"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { googleReviewUrl } from "@/lib/constants";

export type OutletFormState = { error?: string; ok?: boolean };

export async function createOutlet(
  _prev: OutletFormState,
  formData: FormData
): Promise<OutletFormState> {
  const ctx = await requireAuth(["merchant"]);
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const placeId = String(formData.get("google_place_id") || "").trim();
  const reviewUrlInput = String(formData.get("review_url") || "").trim();
  const brandColor = String(formData.get("brand_color") || "#e11d48").trim();

  if (!name) return { error: "Outlet name is required." };

  const review_url =
    reviewUrlInput || (placeId ? googleReviewUrl(placeId) : null);

  const { error } = await supabase.from("outlets").insert({
    merchant_id: ctx.merchant!.id,
    name,
    address: address || null,
    google_place_id: placeId || null,
    review_url,
    brand_color: brandColor,
  });

  if (error) {
    // Surfaces the quota / inactive-subscription messages from the DB trigger.
    return { error: error.message };
  }

  revalidatePath("/dashboard/outlets");
  return { ok: true };
}

export async function toggleOutletActive(formData: FormData) {
  await requireAuth(["merchant"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const next = String(formData.get("next")) === "true";
  await supabase.from("outlets").update({ is_active: next }).eq("id", id);
  revalidatePath("/dashboard/outlets");
}

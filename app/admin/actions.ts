"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function approveMerchant(formData: FormData) {
  const ctx = await requireAuth(["super_admin"]);
  const supabase = await createClient();

  const merchantId = String(formData.get("merchant_id"));
  const plan = String(formData.get("plan") || "starter");
  const quota = Math.max(1, parseInt(String(formData.get("quota") || "1"), 10));

  await supabase
    .from("merchants")
    .update({ subscription_status: "active", plan, outlet_quota: quota })
    .eq("id", merchantId);

  // Record a subscription period (manual billing for now).
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  await supabase.from("subscriptions").insert({
    merchant_id: merchantId,
    plan,
    outlet_quota: quota,
    status: "active",
    approved_by: ctx.profile.id,
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  });

  revalidatePath("/admin");
}

export async function setMerchantStatus(formData: FormData) {
  await requireAuth(["super_admin"]);
  const supabase = await createClient();
  const merchantId = String(formData.get("merchant_id"));
  const status = String(formData.get("status"));
  await supabase
    .from("merchants")
    .update({ subscription_status: status })
    .eq("id", merchantId);
  revalidatePath("/admin");
}

export async function updateQuota(formData: FormData) {
  await requireAuth(["super_admin"]);
  const supabase = await createClient();
  const merchantId = String(formData.get("merchant_id"));
  const quota = Math.max(1, parseInt(String(formData.get("quota") || "1"), 10));
  await supabase
    .from("merchants")
    .update({ outlet_quota: quota })
    .eq("id", merchantId);
  revalidatePath("/admin");
}

export async function resolveFlag(formData: FormData) {
  await requireAuth(["super_admin"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase.from("abuse_flags").update({ resolved: true }).eq("id", id);
  revalidatePath("/admin/abuse");
}

export async function runAbuseScan() {
  await requireAuth(["super_admin"]);
  const supabase = await createClient();
  await supabase.rpc("detect_abuse");
  revalidatePath("/admin/abuse");
}

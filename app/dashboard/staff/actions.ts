"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StaffActionState {
  error?: string;
  ok?: boolean;
}

export async function createStaff(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const ctx = await requireAuth(["merchant", "super_admin"]);
  const admin = createAdminClient();

  const name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!email) return { error: "Email is required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  // Super admin passes merchant_id via hidden form field; merchant uses their own id.
  const merchantId =
    ctx.profile.role === "super_admin"
      ? String(formData.get("merchant_id") || "").trim()
      : ctx.merchant?.id;

  if (!merchantId) return { error: "Merchant account not found." };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "staff",
      merchant_id: merchantId,
      full_name: name || null,
    },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      return { error: "A user with this email already exists." };
    }
    return { error: error.message };
  }

  // Explicitly confirm email — createUser's email_confirm flag is not
  // always honoured depending on Supabase project settings.
  if (data.user) {
    await admin.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    });
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/admin/merchants");
  return { ok: true };
}

export async function removeStaff(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  await requireAuth(["merchant", "super_admin"]);
  const admin = createAdminClient();

  const userId = String(formData.get("user_id") || "").trim();
  if (!userId) return { error: "User ID missing." };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/staff");
  revalidatePath("/admin/merchants");
  return { ok: true };
}

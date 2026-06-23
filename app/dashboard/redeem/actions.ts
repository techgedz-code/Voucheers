"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { rewardDescription } from "@/lib/constants";
import type { RewardType } from "@/lib/types";

export interface RedeemState {
  done: boolean;
  ok?: boolean;
  status?: string;
  message?: string;
  rewardText?: string;
  code?: string;
  conditions?: string | null;
  outletName?: string;
}

export async function redeem(
  _prev: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  await requireAuth(["merchant", "staff"]);
  const supabase = await createClient();

  const code = String(formData.get("code") || "").trim();
  if (!code) return { done: true, ok: false, message: "Enter a voucher code." };

  const { data, error } = await supabase.rpc("redeem_voucher", { p_code: code });
  if (error) {
    return { done: true, ok: false, message: error.message };
  }

  const r = data as {
    ok: boolean;
    status: string;
    message: string;
    code?: string;
    label?: string;
    reward_type?: RewardType;
    value?: number | null;
    conditions?: string | null;
    outlet_name?: string;
  };

  return {
    done: true,
    ok: r.ok,
    status: r.status,
    message: r.message,
    code: r.code,
    conditions: r.conditions ?? null,
    outletName: r.outlet_name,
    rewardText:
      r.ok && r.reward_type
        ? rewardDescription(r.reward_type, r.value ?? null, r.label ?? "")
        : undefined,
  };
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, resolveGeo } from "@/lib/request";
import { pickIndex } from "@/lib/wheel";
import { rewardDescription, appUrl } from "@/lib/constants";
import { sendVoucherEmail } from "@/lib/email";
import type { VoucherType } from "@/lib/types";

export async function POST(req: Request) {
  let body: {
    qrToken?: string;
    phone?: string;
    email?: string;
    pdpa_consent?: boolean;
    review_clicked?: boolean;
    instagram_clicked?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const qrToken = (body.qrToken || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();

  if (!qrToken) return NextResponse.json({ error: "Missing code." }, { status: 400 });
  if (!phone || !email)
    return NextResponse.json({ error: "Phone and email are required." }, { status: 400 });
  if (!body.pdpa_consent)
    return NextResponse.json({ error: "Consent is required." }, { status: 400 });

  const supabase = createAdminClient();

  // --- Validate outlet + subscription + campaign ---
  const { data: outlet } = await supabase
    .from("outlets")
    .select("*, merchants(subscription_status)")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!outlet || !outlet.is_active) {
    return NextResponse.json({ error: "This campaign is unavailable." }, { status: 404 });
  }
  const subStatus = (outlet.merchants as { subscription_status?: string } | null)
    ?.subscription_status;
  if (subStatus !== "active") {
    return NextResponse.json({ error: "This campaign is paused." }, { status: 403 });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("outlet_id", outlet.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: "This campaign is paused." }, { status: 403 });
  }

  const { data: vtypesData } = await supabase
    .from("voucher_types")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const vtypes = (vtypesData ?? []) as VoucherType[];
  if (vtypes.length === 0) {
    return NextResponse.json({ error: "No prizes configured." }, { status: 409 });
  }

  // --- Availability: zero out exhausted segments (stock + daily caps) ---
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const effective = await Promise.all(
    vtypes.map(async (vt) => {
      let available = true;
      if (vt.stock_limit != null && vt.issued_count >= vt.stock_limit) {
        available = false;
      }
      if (available && vt.daily_limit != null) {
        const { count } = await supabase
          .from("issued_vouchers")
          .select("id", { count: "exact", head: true })
          .eq("voucher_type_id", vt.id)
          .gte("issued_at", startOfDay.toISOString());
        if ((count ?? 0) >= vt.daily_limit) available = false;
      }
      return { win_weight: available ? vt.win_weight : 0 };
    })
  );

  let prizeIndex = pickIndex(effective);
  if (prizeIndex < 0) {
    // Everything exhausted — land on a "no win" segment if one exists.
    const noneIdx = vtypes.findIndex((v) => v.reward_type === "none");
    prizeIndex = noneIdx >= 0 ? noneIdx : 0;
  }
  const prize = vtypes[prizeIndex];

  // --- Record the entry (silent IP/geo for abuse clustering) ---
  const ip = getClientIp(req.headers);
  const ip_geo = await resolveGeo(ip);
  const { data: entry, error: entryErr } = await supabase
    .from("entries")
    .insert({
      outlet_id: outlet.id,
      phone,
      email,
      pdpa_consent: true,
      ip,
      ip_geo,
      user_agent: req.headers.get("user-agent"),
      review_clicked: !!body.review_clicked,
      instagram_clicked: !!body.instagram_clicked,
    })
    .select("id")
    .single();

  if (entryErr || !entry) {
    return NextResponse.json({ error: "Could not save your entry." }, { status: 500 });
  }

  // --- "No win" outcome: no voucher issued ---
  if (prize.reward_type === "none") {
    return NextResponse.json({
      prizeIndex,
      won: false,
      label: prize.label,
    });
  }

  // --- Issue the voucher ---
  // Reuse a wallet token for returning customers (same phone at same outlet).
  let walletToken: string | null = null;
  const { data: prior } = await supabase
    .from("issued_vouchers")
    .select("wallet_token, entries!inner(phone, outlet_id)")
    .eq("entries.outlet_id", outlet.id)
    .eq("entries.phone", phone)
    .limit(1)
    .maybeSingle();
  if (prior?.wallet_token) walletToken = prior.wallet_token;

  if (!walletToken) {
    walletToken = crypto.randomUUID().replace(/-/g, "");
  }

  const { data: codeData, error: codeErr } = await supabase.rpc("gen_voucher_code");
  const code = (codeData as string) || `V${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  if (codeErr) console.error("gen_voucher_code error", codeErr);

  const expires = new Date();
  expires.setDate(expires.getDate() + (prize.validity_days || 30));

  const { error: ivErr } = await supabase.from("issued_vouchers").insert({
    code,
    entry_id: entry.id,
    voucher_type_id: prize.id,
    outlet_id: outlet.id,
    wallet_token: walletToken,
    expires_at: expires.toISOString(),
  });
  if (ivErr) {
    return NextResponse.json({ error: "Could not issue your voucher." }, { status: 500 });
  }

  await supabase.rpc("increment_issued", { p_id: prize.id });

  const rewardText = rewardDescription(prize.reward_type, prize.value, prize.label);
  const walletUrl = `${appUrl()}/wallet/${walletToken}`;

  // Fire-and-forget email (its own try/catch inside).
  await sendVoucherEmail({
    to: email,
    outletName: outlet.name,
    brandColor: outlet.brand_color ?? "#e11d48",
    rewardText,
    code,
    expiresAt: expires.toISOString(),
    conditions: prize.conditions,
    walletUrl,
  });

  return NextResponse.json({
    prizeIndex,
    won: true,
    voucher: {
      code,
      rewardText,
      label: prize.label,
      expiresAt: expires.toISOString(),
      conditions: prize.conditions,
    },
    walletToken,
    walletUrl,
  });
}

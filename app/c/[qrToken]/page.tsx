import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, resolveGeo } from "@/lib/request";
import type { VoucherType } from "@/lib/types";
import { CustomerFlow } from "./CustomerFlow";

export const dynamic = "force-dynamic";

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="card max-w-sm text-center">
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
      </div>
    </main>
  );
}

export default async function CustomerLanding({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;
  const supabase = createAdminClient();

  const { data: outlet } = await supabase
    .from("outlets")
    .select("*, merchants(subscription_status)")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!outlet) {
    return <Notice title="Campaign not found" body="This QR code isn't active. Please check with the restaurant." />;
  }

  const subStatus = (outlet.merchants as { subscription_status?: string } | null)
    ?.subscription_status;
  if (!outlet.is_active || subStatus !== "active") {
    return <Notice title="Campaign paused" body="This rewards campaign is currently unavailable. Please try again later." />;
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("outlet_id", outlet.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!campaign) {
    return <Notice title="Campaign paused" body="This rewards campaign is currently unavailable. Please try again later." />;
  }

  const { data: vtypes } = await supabase
    .from("voucher_types")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const segments = ((vtypes ?? []) as VoucherType[]).map((v) => ({
    label: v.label,
    color: v.color ?? "#e11d48",
  }));

  if (segments.length === 0) {
    return <Notice title="Coming soon" body="This restaurant hasn't set up its rewards yet. Check back soon!" />;
  }

  // Silent scan log for abuse clustering (never blocks the customer).
  try {
    const h = await headers();
    const ip = getClientIp(h);
    const ip_geo = await resolveGeo(ip);
    await supabase.from("scan_events").insert({
      outlet_id: outlet.id,
      qr_token: qrToken,
      ip,
      ip_geo,
      user_agent: h.get("user-agent"),
    });
  } catch {
    // ignore
  }

  return (
    <CustomerFlow
      qrToken={qrToken}
      outletName={outlet.name}
      brandColor={outlet.brand_color ?? "#e11d48"}
      logoUrl={outlet.logo_url}
      reviewUrl={outlet.review_url}
      instagramHandle={campaign.instagram_handle}
      segments={segments}
    />
  );
}

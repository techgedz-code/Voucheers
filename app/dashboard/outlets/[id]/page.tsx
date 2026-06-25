import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/constants";
import { qrPngDataUrl } from "@/lib/qr";
import type { Campaign, Outlet, VoucherType } from "@/lib/types";
import { VoucherWheelEditor } from "./VoucherWheelEditor";
import { CopyConfigButton } from "./CopyConfigButton";
import { CampaignSettingsForm } from "./CampaignSettingsForm";
import { OutletBrandingForm } from "./OutletBrandingForm";

export default async function OutletDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth(["merchant"]);
  const supabase = await createClient();

  const { data: outlet } = await supabase
    .from("outlets")
    .select("*")
    .eq("id", id)
    .single();
  if (!outlet) notFound();
  const o = outlet as Outlet;

  // Ensure a default campaign exists for this outlet.
  let { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("outlet_id", id)
    .maybeSingle();
  if (!campaign) {
    const { data: created } = await supabase
      .from("campaigns")
      .insert({ outlet_id: id })
      .select("*")
      .single();
    campaign = created;
  }
  const c = campaign as Campaign;

  const { data: vtypes } = await supabase
    .from("voucher_types")
    .select("*")
    .eq("campaign_id", c.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Count sibling outlets so we can offer "copy this setup to all others".
  const { count: outletCount } = await supabase
    .from("outlets")
    .select("id", { count: "exact", head: true });
  const otherOutlets = Math.max(0, (outletCount ?? 1) - 1);

  const scanUrl = `${appUrl()}/c/${o.qr_token}`;
  const qrImg = await qrPngDataUrl(scanUrl, { width: 220, dark: o.brand_color ?? "#111827" });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/outlets" className="hover:text-brand">
          Outlets
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-700">{o.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* QR */}
        <div className="card text-center">
          <h2 className="mb-2 font-semibold">Table QR</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrImg} alt="Outlet QR" className="mx-auto rounded" width={200} height={200} />
          <p className="mt-2 break-all text-xs text-gray-400">{scanUrl}</p>
          <Link
            href={`/dashboard/outlets/${o.id}/print`}
            className="btn-outline mt-3 w-full !py-1.5"
          >
            Print poster
          </Link>
        </div>

        {/* Campaign settings */}
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Campaign settings</h2>
          <CampaignSettingsForm campaign={c} reviewUrl={o.review_url} />
        </div>
      </div>

      {/* Branding & details */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Branding & details</h2>
        <OutletBrandingForm outlet={o} />
      </div>

      {/* Wheel / voucher editor */}
      <div className="card">
        <h2 className="mb-1 font-semibold">Spin wheel & vouchers</h2>
        <p className="mb-4 text-sm text-gray-500">
          Define each prize, its win probability, validity and conditions.
        </p>
        <VoucherWheelEditor
          campaignId={c.id}
          initial={(vtypes ?? []) as VoucherType[]}
        />
      </div>

      {/* Copy this setup to other outlets */}
      {otherOutlets > 0 && (
        <div className="card">
          <h2 className="mb-1 font-semibold">Apply to other outlets</h2>
          <p className="mb-4 text-sm text-gray-500">
            Copy this outlet&apos;s spin wheel, campaign settings, and branding
            (logo &amp; colour) to all your other outlets in one click. Each
            outlet keeps its own name, address, and Google review link.
          </p>
          <CopyConfigButton outletId={o.id} otherCount={otherOutlets} />
        </div>
      )}
    </div>
  );
}

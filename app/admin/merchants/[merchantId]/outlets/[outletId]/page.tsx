import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/constants";
import { qrPngDataUrl } from "@/lib/qr";
import type { Campaign, Outlet, VoucherType } from "@/lib/types";
import { VoucherWheelEditor } from "@/app/dashboard/outlets/[id]/VoucherWheelEditor";
import { CampaignSettingsForm } from "@/app/dashboard/outlets/[id]/CampaignSettingsForm";
import { OutletBrandingForm } from "@/app/dashboard/outlets/[id]/OutletBrandingForm";

export default async function AdminOutletPage({
  params,
}: {
  params: Promise<{ merchantId: string; outletId: string }>;
}) {
  const { merchantId, outletId } = await params;
  await requireAuth(["super_admin"]);
  const admin = createAdminClient();

  const { data: outletData } = await admin
    .from("outlets")
    .select("*")
    .eq("id", outletId)
    .eq("merchant_id", merchantId)
    .single();
  if (!outletData) notFound();
  const o = outletData as Outlet;

  // Ensure a default campaign exists for this outlet.
  let { data: campaign } = await admin
    .from("campaigns")
    .select("*")
    .eq("outlet_id", outletId)
    .maybeSingle();
  if (!campaign) {
    const { data: created } = await admin
      .from("campaigns")
      .insert({ outlet_id: outletId })
      .select("*")
      .single();
    campaign = created;
  }
  const c = campaign as Campaign;

  const { data: vtypes } = await admin
    .from("voucher_types")
    .select("*")
    .eq("campaign_id", c.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const scanUrl = `${appUrl()}/c/${o.qr_token}`;
  const qrImg = await qrPngDataUrl(scanUrl, {
    width: 220,
    dark: o.brand_color ?? "#111827",
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/admin/merchants/${merchantId}/outlets`} className="hover:text-brand">
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
            target="_blank"
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
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/constants";
import { qrPngDataUrl } from "@/lib/qr";
import type { Campaign, Outlet, VoucherType } from "@/lib/types";
import { VoucherWheelEditor } from "@/app/dashboard/outlets/[id]/VoucherWheelEditor";
import { CopyConfigButton } from "@/app/dashboard/outlets/[id]/CopyConfigButton";
import { GameTypeField } from "@/app/dashboard/outlets/[id]/GameTypeField";
import {
  saveCampaignSettings,
  updateOutletBranding,
} from "@/app/dashboard/outlets/[id]/actions";

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

  // Count sibling outlets so we can offer "copy this setup to all others".
  const { count: outletCount } = await admin
    .from("outlets")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId);
  const otherOutlets = Math.max(0, (outletCount ?? 1) - 1);

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
          <form action={saveCampaignSettings} className="space-y-4">
            <input type="hidden" name="campaign_id" value={c.id} />
            <div>
              <label className="label" htmlFor="instagram_handle">
                Instagram handle (optional)
              </label>
              <input
                id="instagram_handle"
                name="instagram_handle"
                defaultValue={c.instagram_handle ?? ""}
                placeholder="@yourrestaurant"
                className="input"
              />
              <p className="mt-1 text-xs text-gray-500">
                Shown as an optional "Follow us" step before the game.
              </p>
            </div>
            <GameTypeField value={c.game_type} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={c.is_active}
                className="h-4 w-4"
              />
              Campaign active (customers can play)
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="limit_one_play_per_day"
                defaultChecked={c.limit_one_play_per_day}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Limit to one play per customer per day
                <span className="block text-xs text-gray-500">
                  Recommended. Prevents the same phone number spinning repeatedly
                  in one day.
                </span>
              </span>
            </label>
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <span className="font-medium">Review link:</span>{" "}
              {o.review_url ? (
                <span className="break-all text-gray-500">{o.review_url}</span>
              ) : (
                <span className="text-amber-600">
                  Not set — add a Google Place ID below.
                </span>
              )}
            </div>
            <button className="btn-primary">Save settings</button>
          </form>
        </div>
      </div>

      {/* Branding & details */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Branding & details</h2>
        <form action={updateOutletBranding} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="outlet_id" value={o.id} />
          <div>
            <label className="label" htmlFor="name">Outlet name</label>
            <input id="name" name="name" defaultValue={o.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="address">Address</label>
            <input id="address" name="address" defaultValue={o.address ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="google_place_id">Google Place ID</label>
            <input
              id="google_place_id"
              name="google_place_id"
              defaultValue={o.google_place_id ?? ""}
              className="input"
              placeholder="ChIJ..."
            />
          </div>
          <div>
            <label className="label" htmlFor="review_url">Review URL (optional override)</label>
            <input
              id="review_url"
              name="review_url"
              defaultValue={o.review_url ?? ""}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="logo_url">Logo image URL</label>
            <input
              id="logo_url"
              name="logo_url"
              defaultValue={o.logo_url ?? ""}
              className="input"
              placeholder="https://.../logo.png (square PNG works best)"
            />
            <p className="mt-1 text-xs text-gray-500">
              Used as the customer&apos;s home-screen wallet icon and on emails.
              Paste a public square image URL.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="brand_color">Brand color</label>
            <input
              id="brand_color"
              name="brand_color"
              type="color"
              defaultValue={o.brand_color ?? "#e11d48"}
              className="h-10 w-20 rounded border border-gray-300"
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary">Save details</button>
          </div>
        </form>
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
            (logo &amp; colour) to all this merchant&apos;s other outlets in one
            click. Each outlet keeps its own name, address, and Google review
            link.
          </p>
          <CopyConfigButton outletId={o.id} otherCount={otherOutlets} />
        </div>
      )}
    </div>
  );
}

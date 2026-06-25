import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Merchant } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default async function AdminMerchantOverview({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  await requireAuth(["super_admin"]);
  const admin = createAdminClient();

  const { data: merchantData } = await admin
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .single();
  if (!merchantData) notFound();
  const merchant = merchantData as Merchant;

  // Outlet ids for this merchant (used to scope voucher counts).
  const { data: outletRows } = await admin
    .from("outlets")
    .select("id")
    .eq("merchant_id", merchantId);
  const outletIds = (outletRows ?? []).map((o) => o.id as string);
  const outletCount = outletIds.length;

  let issued = 0;
  let redeemed = 0;
  if (outletIds.length > 0) {
    const [{ count: issuedCount }, { count: redeemedCount }] = await Promise.all([
      admin
        .from("issued_vouchers")
        .select("id", { count: "exact", head: true })
        .in("outlet_id", outletIds),
      admin
        .from("issued_vouchers")
        .select("id", { count: "exact", head: true })
        .in("outlet_id", outletIds)
        .eq("status", "redeemed"),
    ]);
    issued = issuedCount ?? 0;
    redeemed = redeemedCount ?? 0;
  }

  const stats = [
    { label: "Outlets", value: `${outletCount} / ${merchant.outlet_quota}` },
    { label: "Vouchers issued", value: issued },
    { label: "Vouchers redeemed", value: redeemed },
  ];

  return (
    <div className="space-y-6">
      {/* Merchant info */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{merchant.business_name}</h1>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  STATUS_STYLES[merchant.subscription_status] ?? ""
                }`}
              >
                {merchant.subscription_status}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {merchant.contact_email} · Plan: {merchant.plan ?? "—"} · Outlet
              quota: {merchant.outlet_quota}
            </div>
          </div>
          <Link href="/admin" className="btn-outline !py-1.5">
            Plan & status
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card text-sm text-gray-600">
        You are managing this merchant as super admin. Use the tabs above to
        configure outlets, view analytics and customers, redeem vouchers, or
        manage staff accounts on their behalf. Subscription plan, status, and
        outlet quota are changed from the{" "}
        <Link href="/admin" className="font-medium text-brand">
          Merchants
        </Link>{" "}
        list.
      </div>
    </div>
  );
}

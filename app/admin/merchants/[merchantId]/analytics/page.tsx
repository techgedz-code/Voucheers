import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Outlet } from "@/lib/types";

export default async function AdminMerchantAnalytics({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  await requireAuth(["super_admin"]);
  const admin = createAdminClient();

  const { data: outletsData } = await admin
    .from("outlets")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: true });
  const outlets = (outletsData ?? []) as Outlet[];
  const outletIds = outlets.map((o) => o.id);

  // Empty-merchant short circuit.
  const emptyFunnel = outletIds.length === 0;

  const [scans, entries, reviews, insta, issued, redeemed] = emptyFunnel
    ? [0, 0, 0, 0, 0, 0]
    : await Promise.all([
        admin
          .from("scan_events")
          .select("id", { count: "exact", head: true })
          .in("outlet_id", outletIds)
          .then((r) => r.count ?? 0),
        admin
          .from("entries")
          .select("id", { count: "exact", head: true })
          .in("outlet_id", outletIds)
          .then((r) => r.count ?? 0),
        admin
          .from("entries")
          .select("id", { count: "exact", head: true })
          .in("outlet_id", outletIds)
          .eq("review_clicked", true)
          .then((r) => r.count ?? 0),
        admin
          .from("entries")
          .select("id", { count: "exact", head: true })
          .in("outlet_id", outletIds)
          .eq("instagram_clicked", true)
          .then((r) => r.count ?? 0),
        admin
          .from("issued_vouchers")
          .select("id", { count: "exact", head: true })
          .in("outlet_id", outletIds)
          .then((r) => r.count ?? 0),
        admin
          .from("issued_vouchers")
          .select("id", { count: "exact", head: true })
          .in("outlet_id", outletIds)
          .eq("status", "redeemed")
          .then((r) => r.count ?? 0),
      ]);

  const perOutlet = await Promise.all(
    outlets.map(async (o) => {
      const [oScans, oEntries, oIssued, oRedeemed] = await Promise.all([
        admin
          .from("scan_events")
          .select("id", { count: "exact", head: true })
          .eq("outlet_id", o.id)
          .then((r) => r.count ?? 0),
        admin
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("outlet_id", o.id)
          .then((r) => r.count ?? 0),
        admin
          .from("issued_vouchers")
          .select("id", { count: "exact", head: true })
          .eq("outlet_id", o.id)
          .then((r) => r.count ?? 0),
        admin
          .from("issued_vouchers")
          .select("id", { count: "exact", head: true })
          .eq("outlet_id", o.id)
          .eq("status", "redeemed")
          .then((r) => r.count ?? 0),
      ]);
      return {
        name: o.name,
        scans: oScans,
        entries: oEntries,
        issued: oIssued,
        redeemed: oRedeemed,
      };
    })
  );

  const funnel = [
    { label: "QR scans", value: scans },
    { label: "Completed entries", value: entries },
    { label: "Clicked review", value: reviews },
    { label: "Clicked Instagram", value: insta },
    { label: "Vouchers issued", value: issued },
    { label: "Vouchers redeemed", value: redeemed },
  ];
  const top = Math.max(funnel[0].value, 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Analytics</h1>

      <div className="card">
        <h2 className="mb-4 font-semibold">Conversion funnel</h2>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-sm text-gray-600">{f.label}</div>
              <div className="h-6 flex-1 overflow-hidden rounded bg-gray-100">
                <div
                  className="h-full rounded bg-brand"
                  style={{ width: `${Math.round((f.value / top) * 100)}%` }}
                />
              </div>
              <div className="w-12 text-right text-sm font-semibold">{f.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Redemption rate:{" "}
          {issued ? Math.round((redeemed / issued) * 100) : 0}% of issued
          vouchers used.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">By outlet</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Outlet</th>
                <th className="py-2 text-right">Scans</th>
                <th className="py-2 text-right">Entries</th>
                <th className="py-2 text-right">Issued</th>
                <th className="py-2 text-right">Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {perOutlet.map((o) => (
                <tr key={o.name} className="border-b last:border-0">
                  <td className="py-2 font-medium">{o.name}</td>
                  <td className="py-2 text-right">{o.scans}</td>
                  <td className="py-2 text-right">{o.entries}</td>
                  <td className="py-2 text-right">{o.issued}</td>
                  <td className="py-2 text-right">{o.redeemed}</td>
                </tr>
              ))}
              {perOutlet.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-400" colSpan={5}>
                    No outlets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

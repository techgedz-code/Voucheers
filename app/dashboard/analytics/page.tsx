import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Outlet } from "@/lib/types";

export default async function AnalyticsPage() {
  await requireAuth(["merchant"]);
  const supabase = await createClient();

  // Funnel counts (RLS scopes everything to this merchant's outlets).
  const [{ count: scans }, { count: entries }, { count: reviews }, { count: insta }] =
    await Promise.all([
      supabase.from("scan_events").select("id", { count: "exact", head: true }),
      supabase.from("entries").select("id", { count: "exact", head: true }),
      supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("review_clicked", true),
      supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("instagram_clicked", true),
    ]);

  const [{ count: issued }, { count: redeemed }] = await Promise.all([
    supabase.from("issued_vouchers").select("id", { count: "exact", head: true }),
    supabase
      .from("issued_vouchers")
      .select("id", { count: "exact", head: true })
      .eq("status", "redeemed"),
  ]);

  const { data: outletsData } = await supabase
    .from("outlets")
    .select("*")
    .order("created_at", { ascending: true });
  const outlets = (outletsData ?? []) as Outlet[];

  const perOutlet = await Promise.all(
    outlets.map(async (o) => {
      const [{ count: oScans }, { count: oEntries }, { count: oIssued }, { count: oRedeemed }] =
        await Promise.all([
          supabase
            .from("scan_events")
            .select("id", { count: "exact", head: true })
            .eq("outlet_id", o.id),
          supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .eq("outlet_id", o.id),
          supabase
            .from("issued_vouchers")
            .select("id", { count: "exact", head: true })
            .eq("outlet_id", o.id),
          supabase
            .from("issued_vouchers")
            .select("id", { count: "exact", head: true })
            .eq("outlet_id", o.id)
            .eq("status", "redeemed"),
        ]);
      return {
        name: o.name,
        scans: oScans ?? 0,
        entries: oEntries ?? 0,
        issued: oIssued ?? 0,
        redeemed: oRedeemed ?? 0,
      };
    })
  );

  const funnel = [
    { label: "QR scans", value: scans ?? 0 },
    { label: "Completed entries", value: entries ?? 0 },
    { label: "Clicked review", value: reviews ?? 0 },
    { label: "Clicked Instagram", value: insta ?? 0 },
    { label: "Vouchers issued", value: issued ?? 0 },
    { label: "Vouchers redeemed", value: redeemed ?? 0 },
  ];
  const top = Math.max(funnel[0].value, 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

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
          {issued ? Math.round(((redeemed ?? 0) / issued) * 100) : 0}% of issued
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

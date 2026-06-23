import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardHome() {
  const ctx = await requireAuth(["merchant", "staff"]);
  const supabase = await createClient();

  const { count: outletCount } = await supabase
    .from("outlets")
    .select("id", { count: "exact", head: true });

  // Issued vs redeemed (RLS scopes to this merchant's outlets).
  const { count: issuedCount } = await supabase
    .from("issued_vouchers")
    .select("id", { count: "exact", head: true });
  const { count: redeemedCount } = await supabase
    .from("issued_vouchers")
    .select("id", { count: "exact", head: true })
    .eq("status", "redeemed");

  const quota = ctx.merchant?.outlet_quota ?? 0;

  const stats = [
    { label: "Outlets", value: `${outletCount ?? 0} / ${quota}` },
    { label: "Vouchers issued", value: issuedCount ?? 0 },
    { label: "Vouchers redeemed", value: redeemedCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome{ctx.profile.full_name ? `, ${ctx.profile.full_name}` : ""}
        </h1>
        <p className="text-sm text-gray-500">
          Plan: {ctx.merchant?.plan ?? "—"} · Status:{" "}
          {ctx.merchant?.subscription_status}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold">Get started</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-600">
          <li>
            Add your outlet under{" "}
            <Link href="/dashboard/outlets" className="font-medium text-brand">
              Outlets
            </Link>{" "}
            and connect its Google review link.
          </li>
          <li>Set up your spin-wheel vouchers and win probabilities.</li>
          <li>Print the QR code and place it on tables / receipts.</li>
        </ol>
      </div>
    </div>
  );
}

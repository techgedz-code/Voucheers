import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Merchant, Outlet } from "@/lib/types";

export default async function AdminMerchantPage({
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

  const { data: outletsData } = await admin
    .from("outlets")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: true });
  const outlets = (outletsData ?? []) as Outlet[];

  // Fetch staff profiles for this merchant.
  const { data: staffProfiles } = await admin
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("merchant_id", merchantId)
    .eq("role", "staff")
    .order("created_at", { ascending: true });

  const { data: usersData } = await admin.auth.admin.listUsers();
  const userEmailMap = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? null])
  );
  const staff = (staffProfiles ?? []).map((p) => ({
    ...p,
    email: userEmailMap.get(p.id) ?? null,
  }));

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    active: "bg-green-100 text-green-800",
    suspended: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-brand">Merchants</Link>
        <span>/</span>
        <span className="font-medium text-gray-700">{merchant.business_name}</span>
      </div>

      {/* Merchant info */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{merchant.business_name}</h1>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[merchant.subscription_status] ?? ""}`}>
                {merchant.subscription_status}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {merchant.contact_email} · Plan: {merchant.plan ?? "—"} · Outlet quota: {merchant.outlet_quota}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/merchants/${merchantId}/staff`} className="btn-outline !py-1.5">
              Manage staff
            </Link>
          </div>
        </div>
      </div>

      {/* Outlets */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Outlets</h2>
        {outlets.length === 0 ? (
          <div className="card text-sm text-gray-500">No outlets yet for this merchant.</div>
        ) : (
          <div className="space-y-3">
            {outlets.map((o) => (
              <div key={o.id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: o.brand_color ?? "#e11d48" }}
                    />
                    <span className="font-semibold">{o.name}</span>
                    {!o.is_active && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                        inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {o.address || "No address"} ·{" "}
                    {o.review_url ? "Review link set" : "No review link"}
                  </div>
                </div>
                <Link
                  href={`/admin/merchants/${merchantId}/outlets/${o.id}`}
                  className="font-medium text-brand hover:underline text-sm"
                >
                  Configure
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff summary */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Staff</h2>
          <Link href={`/admin/merchants/${merchantId}/staff`} className="text-sm text-brand hover:underline">
            Manage →
          </Link>
        </div>
        {staff.length === 0 ? (
          <div className="card text-sm text-gray-500">No staff accounts yet.</div>
        ) : (
          <div className="card space-y-2">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <div>
                  <div className="font-medium text-sm">{s.full_name ?? <span className="text-gray-400">No name</span>}</div>
                  <div className="text-xs text-gray-500">{s.email ?? "—"}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(s.created_at).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

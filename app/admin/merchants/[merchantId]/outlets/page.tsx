import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Outlet } from "@/lib/types";

export default async function AdminMerchantOutlets({
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Outlets</h1>

      {outlets.length === 0 ? (
        <div className="card text-sm text-gray-500">
          No outlets yet for this merchant.
        </div>
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

      <p className="text-xs text-gray-400">
        Outlet count is capped by the merchant&apos;s quota. Adjust the quota
        from the{" "}
        <Link href="/admin" className="text-brand">
          Merchants
        </Link>{" "}
        list.
      </p>
    </div>
  );
}

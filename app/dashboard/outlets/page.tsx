import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Outlet } from "@/lib/types";
import { OutletForm } from "./OutletForm";

export default async function OutletsPage() {
  const ctx = await requireAuth(["merchant"]);
  const supabase = await createClient();

  const { data: outlets } = await supabase
    .from("outlets")
    .select("*")
    .order("created_at", { ascending: true });

  const list = (outlets ?? []) as Outlet[];
  const quota = ctx.merchant?.outlet_quota ?? 0;
  const active = ctx.merchant?.subscription_status === "active";
  const canAdd =
    ctx.profile.role === "merchant" && active && list.length < quota;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Outlets</h1>
          <span className="text-sm text-gray-500">
            {list.length} / {quota} used
          </span>
        </div>

        {list.length === 0 ? (
          <div className="card text-sm text-gray-500">No outlets yet.</div>
        ) : (
          <div className="space-y-3">
            {list.map((o) => (
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
                <div className="flex items-center gap-3 text-sm">
                  <Link
                    href={`/dashboard/outlets/${o.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ctx.profile.role === "merchant" && (
        <div>
          <div className="card">
            <h2 className="mb-3 font-semibold">Add an outlet</h2>
            <OutletForm canAdd={canAdd} />
          </div>
        </div>
      )}
    </div>
  );
}

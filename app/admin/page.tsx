import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Merchant } from "@/lib/types";
import { approveMerchant, setMerchantStatus, updateQuota } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default async function AdminHome() {
  await requireAuth(["super_admin"]);
  const supabase = await createClient();

  const { data: merchants } = await supabase
    .from("merchants")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (merchants ?? []) as Merchant[];
  const pending = list.filter((m) => m.subscription_status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Merchants</h1>
        <p className="text-sm text-gray-500">
          {list.length} total · {pending.length} awaiting approval
        </p>
      </div>

      <div className="space-y-3">
        {list.map((m) => (
          <div key={m.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.business_name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[m.subscription_status] ?? ""
                    }`}
                  >
                    {m.subscription_status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {m.contact_email} · Plan: {m.plan ?? "—"} · Quota:{" "}
                  {m.outlet_quota}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {m.subscription_status === "pending" ? (
                  <form action={approveMerchant} className="flex items-end gap-2">
                    <input type="hidden" name="merchant_id" value={m.id} />
                    <div>
                      <label className="text-xs text-gray-500">Plan</label>
                      <input
                        name="plan"
                        defaultValue="starter"
                        className="input !py-1.5 w-28"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Outlets</label>
                      <input
                        name="quota"
                        type="number"
                        min={1}
                        defaultValue={1}
                        className="input !py-1.5 w-20"
                      />
                    </div>
                    <button className="btn-primary !py-1.5">Approve</button>
                  </form>
                ) : (
                  <>
                    <form action={updateQuota} className="flex items-end gap-1">
                      <input type="hidden" name="merchant_id" value={m.id} />
                      <div>
                        <label className="text-xs text-gray-500">Quota</label>
                        <input
                          name="quota"
                          type="number"
                          min={1}
                          defaultValue={m.outlet_quota}
                          className="input !py-1.5 w-20"
                        />
                      </div>
                      <button className="btn-outline !py-1.5">Save</button>
                    </form>
                    {m.subscription_status === "active" ? (
                      <form action={setMerchantStatus}>
                        <input type="hidden" name="merchant_id" value={m.id} />
                        <input type="hidden" name="status" value="suspended" />
                        <button className="btn-outline !py-1.5 text-red-600">
                          Suspend
                        </button>
                      </form>
                    ) : (
                      <form action={setMerchantStatus}>
                        <input type="hidden" name="merchant_id" value={m.id} />
                        <input type="hidden" name="status" value="active" />
                        <button className="btn-outline !py-1.5 text-green-600">
                          Reactivate
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="card text-sm text-gray-500">No merchants yet.</div>
        )}
      </div>
    </div>
  );
}

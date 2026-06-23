import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveFlag } from "../actions";

interface FlagRow {
  id: string;
  reason: string;
  detail: Record<string, unknown> | null;
  resolved: boolean;
  created_at: string;
  merchant_id: string;
  merchants: { business_name: string } | null;
}

export default async function AbusePage() {
  await requireAuth(["super_admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("abuse_flags")
    .select("*, merchants(business_name)")
    .order("created_at", { ascending: false });

  const flags = (data ?? []) as unknown as FlagRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abuse flags</h1>
        <p className="text-sm text-gray-500">
          Silent IP/geolocation anomalies for possible cross-outlet QR reuse.
        </p>
      </div>

      <div className="space-y-3">
        {flags.length === 0 && (
          <div className="card text-sm text-gray-500">
            No flags. Anomalies will appear here as scans are analysed.
          </div>
        )}
        {flags.map((f) => (
          <div
            key={f.id}
            className={`card ${f.resolved ? "opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">
                  {f.merchants?.business_name ?? "Unknown merchant"}
                </div>
                <div className="text-sm text-gray-600">{f.reason}</div>
                {f.detail && (
                  <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-500">
                    {JSON.stringify(f.detail, null, 2)}
                  </pre>
                )}
              </div>
              {!f.resolved && (
                <form action={resolveFlag}>
                  <input type="hidden" name="id" value={f.id} />
                  <button className="btn-outline !py-1.5">Resolve</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

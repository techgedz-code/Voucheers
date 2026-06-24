import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CustomerDatabase, type AggregatedCustomer } from "./CustomerDatabase";
import { CustomerSearch } from "./CustomerSearch";

export default async function CustomersPage() {
  await requireAuth(["merchant", "staff"]);
  const supabase = await createClient();

  // Fetch all entries scoped to this merchant via RLS.
  const { data: entriesRaw } = await supabase
    .from("entries")
    .select("id, phone, email, pdpa_consent, outlet_id, created_at, outlets(name)")
    .order("created_at", { ascending: false });

  const entries = (entriesRaw ?? []) as unknown as Array<{
    id: string;
    phone: string;
    email: string | null;
    pdpa_consent: boolean;
    outlet_id: string;
    created_at: string;
    outlets: { name: string } | null;
  }>;

  const entryIds = entries.map((e) => e.id);

  const { data: vouchersRaw } =
    entryIds.length > 0
      ? await supabase
          .from("issued_vouchers")
          .select("entry_id, status")
          .in("entry_id", entryIds)
      : { data: [] };

  const vouchers = (vouchersRaw ?? []) as Array<{
    entry_id: string;
    status: string;
  }>;
  const entryPhoneMap = new Map(entries.map((e) => [e.id, e.phone]));

  // Aggregate entries by phone number.
  const map = new Map<string, AggregatedCustomer>();
  for (const e of entries) {
    const outletName = (e.outlets as { name: string } | null)?.name ?? null;
    const existing = map.get(e.phone);
    if (existing) {
      if (e.created_at < existing.first_seen) existing.first_seen = e.created_at;
      if (e.created_at > existing.last_seen) existing.last_seen = e.created_at;
      existing.visit_count++;
      if (e.outlet_id && !existing.outlet_ids.includes(e.outlet_id)) {
        existing.outlet_ids.push(e.outlet_id);
        if (outletName) existing.outlet_names.push(outletName);
      }
    } else {
      map.set(e.phone, {
        phone: e.phone,
        email: e.email ?? null,
        pdpa_consent: e.pdpa_consent,
        first_seen: e.created_at,
        last_seen: e.created_at,
        visit_count: 1,
        vouchers_issued: 0,
        vouchers_redeemed: 0,
        outlet_ids: e.outlet_id ? [e.outlet_id] : [],
        outlet_names: outletName ? [outletName] : [],
      });
    }
  }

  for (const v of vouchers) {
    const phone = entryPhoneMap.get(v.entry_id);
    if (!phone) continue;
    const customer = map.get(phone);
    if (!customer) continue;
    customer.vouchers_issued++;
    if (v.status === "redeemed") customer.vouchers_redeemed++;
  }

  const customers = Array.from(map.values()).sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
  );

  const { data: outletsRaw } = await supabase
    .from("outlets")
    .select("id, name")
    .order("name");
  const outlets = (outletsRaw ?? []) as Array<{ id: string; name: string }>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          {customers.length} unique customer{customers.length !== 1 ? "s" : ""} across all outlets
        </p>
      </div>

      <CustomerDatabase customers={customers} outlets={outlets} />

      <div>
        <h2 className="mb-1 text-lg font-semibold">Lookup & Redeem</h2>
        <p className="mb-4 text-sm text-gray-500">
          Search by phone to view a customer&apos;s vouchers and redeem on their behalf.
        </p>
        <CustomerSearch />
      </div>
    </div>
  );
}

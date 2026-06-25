import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function escapeCell(value: string | number | boolean | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(escapeCell).join(",");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  await requireAuth(["super_admin"]);
  const { merchantId } = await params;
  const admin = createAdminClient();

  const { searchParams } = req.nextUrl;
  const outletFilter = searchParams.get("outlet") ?? "";
  const searchQ = (searchParams.get("q") ?? "").toLowerCase();
  const consentFilter = searchParams.get("consent") ?? "all";

  // Scope to this merchant's outlets.
  const { data: outletRows } = await admin
    .from("outlets")
    .select("id")
    .eq("merchant_id", merchantId);
  const outletIds = (outletRows ?? []).map((o) => o.id as string);

  if (outletIds.length === 0) {
    const csv = row([
      "Phone",
      "Email",
      "First Visit",
      "Last Visit",
      "Visits",
      "Vouchers Issued",
      "Vouchers Redeemed",
      "Outlets",
      "PDPA Consent",
    ]);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
      },
    });
  }

  const { data: entriesRaw } = await admin
    .from("entries")
    .select("id, phone, email, pdpa_consent, outlet_id, created_at, outlets(name)")
    .in("outlet_id", outletIds)
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
      ? await admin
          .from("issued_vouchers")
          .select("entry_id, status")
          .in("entry_id", entryIds)
      : { data: [] };

  const vouchers = (vouchersRaw ?? []) as Array<{
    entry_id: string;
    status: string;
  }>;
  const entryPhoneMap = new Map(entries.map((e) => [e.id, e.phone]));

  const map = new Map<
    string,
    {
      phone: string;
      email: string | null;
      pdpa_consent: boolean;
      first_seen: string;
      last_seen: string;
      visit_count: number;
      vouchers_issued: number;
      vouchers_redeemed: number;
      outlet_ids: string[];
      outlet_names: string[];
    }
  >();

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

  let customers = Array.from(map.values()).sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
  );

  if (outletFilter) {
    customers = customers.filter((c) => c.outlet_ids.includes(outletFilter));
  }
  if (searchQ) {
    customers = customers.filter(
      (c) =>
        c.phone.includes(searchQ) ||
        (c.email ?? "").toLowerCase().includes(searchQ)
    );
  }
  if (consentFilter === "yes") customers = customers.filter((c) => c.pdpa_consent);
  if (consentFilter === "no") customers = customers.filter((c) => !c.pdpa_consent);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const lines = [
    row([
      "Phone",
      "Email",
      "First Visit",
      "Last Visit",
      "Visits",
      "Vouchers Issued",
      "Vouchers Redeemed",
      "Outlets",
      "PDPA Consent",
    ]),
    ...customers.map((c) =>
      row([
        c.phone,
        c.email,
        fmt(c.first_seen),
        fmt(c.last_seen),
        c.visit_count,
        c.vouchers_issued,
        c.vouchers_redeemed,
        c.outlet_names.join("; "),
        c.pdpa_consent ? "Yes" : "No",
      ])
    ),
  ];

  const csv = lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
    },
  });
}

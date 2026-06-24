"use client";

import { useMemo, useState } from "react";

export interface AggregatedCustomer {
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

interface Props {
  customers: AggregatedCustomer[];
  outlets: { id: string; name: string }[];
}

export function CustomerDatabase({ customers, outlets }: Props) {
  const [search, setSearch] = useState("");
  const [outletFilter, setOutletFilter] = useState("");
  const [consentFilter, setConsentFilter] = useState<"all" | "yes" | "no">("all");

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.phone.includes(q) && !(c.email ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      if (outletFilter && !c.outlet_ids.includes(outletFilter)) return false;
      if (consentFilter === "yes" && !c.pdpa_consent) return false;
      if (consentFilter === "no" && c.pdpa_consent) return false;
      return true;
    });
  }, [customers, search, outletFilter, consentFilter]);

  const exportParams = new URLSearchParams({
    ...(outletFilter ? { outlet: outletFilter } : {}),
    ...(search ? { q: search } : {}),
    ...(consentFilter !== "all" ? { consent: consentFilter } : {}),
  });

  return (
    <div className="card space-y-4">
      {/* Filters + export */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className="label">Search phone / email</label>
          <input
            className="input"
            placeholder="0123456789 or email@example.com"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {outlets.length > 1 && (
          <div>
            <label className="label">Outlet</label>
            <select
              className="input"
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
            >
              <option value="">All outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">PDPA consent</label>
          <select
            className="input"
            value={consentFilter}
            onChange={(e) =>
              setConsentFilter(e.target.value as "all" | "yes" | "no")
            }
          >
            <option value="all">All</option>
            <option value="yes">Given</option>
            <option value="no">Not given</option>
          </select>
        </div>

        <a
          href={`/dashboard/customers/export?${exportParams}`}
          className="btn-outline shrink-0"
          download="customers.csv"
        >
          Export CSV
        </a>
      </div>

      <p className="text-sm text-gray-500">
        Showing <strong>{filtered.length}</strong> of{" "}
        <strong>{customers.length}</strong> customers
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="pb-2 pr-4">Phone</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">First visit</th>
              <th className="pb-2 pr-4">Last visit</th>
              <th className="pb-2 pr-4 text-right">Visits</th>
              <th className="pb-2 pr-4 text-right">Vouchers</th>
              <th className="pb-2 pr-4 text-right">Redeemed</th>
              <th className="pb-2 text-center">PDPA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-6 text-center text-gray-400"
                >
                  No customers match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.phone}
                className="border-b last:border-0 hover:bg-gray-50"
              >
                <td className="py-2 pr-4 font-medium">{c.phone}</td>
                <td className="py-2 pr-4 text-gray-600">
                  {c.email ?? (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  {new Date(c.first_seen).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  {new Date(c.last_seen).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-2 pr-4 text-right">{c.visit_count}</td>
                <td className="py-2 pr-4 text-right">{c.vouchers_issued}</td>
                <td className="py-2 pr-4 text-right">{c.vouchers_redeemed}</td>
                <td className="py-2 text-center">
                  {c.pdpa_consent ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

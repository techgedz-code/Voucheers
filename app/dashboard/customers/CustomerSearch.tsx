"use client";

import { useActionState, useEffect, useState } from "react";
import { searchCustomer, type SearchState } from "./actions";
import { redeem, type RedeemState } from "../redeem/actions";

const initialSearch: SearchState = {};
const initialRedeem: RedeemState = { done: false };

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  redeemed: "bg-gray-200 text-gray-600",
  expired: "bg-red-100 text-red-600",
  void: "bg-yellow-100 text-yellow-700",
};

export function CustomerSearch() {
  const [searchState, searchAction, searching] = useActionState(searchCustomer, initialSearch);
  const [redeemState, redeemAction, redeeming] = useActionState(redeem, initialRedeem);
  const [confirmCode, setConfirmCode] = useState<string | null>(null);

  function startRedeem(code: string) {
    setConfirmCode(code);
  }
  function cancelRedeem() {
    setConfirmCode(null);
  }

  // After a successful redeem, re-run the search so the voucher list
  // reflects the updated status from the database.
  useEffect(() => {
    if (redeemState.done) {
      setConfirmCode(null);
      if (redeemState.ok && searchState.result) {
        const fd = new FormData();
        fd.append("phone", searchState.result.phone);
        searchAction(fd);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redeemState.done]);

  return (
    <div className="space-y-6">
      {/* Search form */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Search by phone number</h2>
        <form action={searchAction} className="flex gap-2">
          <input
            name="phone"
            type="tel"
            defaultValue={searchState.phone ?? ""}
            placeholder="e.g. 0123456789"
            className="input flex-1"
            autoComplete="off"
          />
          <button className="btn-primary shrink-0" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
        {searchState.error && (
          <p className="mt-2 text-sm text-red-600">{searchState.error}</p>
        )}
      </div>

      {/* No result */}
      {searchState.phone && searchState.result === null && (
        <div className="card text-center text-sm text-gray-500">
          No customer found with phone number <strong>{searchState.phone}</strong>.
        </div>
      )}

      {/* Customer found */}
      {searchState.result && (
        <div className="space-y-4">
          {/* Customer profile */}
          <div className="card">
            <h2 className="mb-3 font-semibold">Customer profile</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Phone</dt>
                <dd className="font-medium">{searchState.result.phone}</dd>
              </div>
              {searchState.result.email && (
                <div>
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="font-medium">{searchState.result.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500">First visit</dt>
                <dd>
                  {new Date(searchState.result.first_seen).toLocaleDateString("en-MY", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Last visit</dt>
                <dd>
                  {new Date(searchState.result.last_seen).toLocaleDateString("en-MY", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">PDPA consent</dt>
                <dd>{searchState.result.pdpa_consent ? "✅ Given" : "⚠️ Not given"}</dd>
              </div>
            </dl>
          </div>

          {/* Vouchers */}
          <div className="card">
            <h2 className="mb-3 font-semibold">
              Vouchers ({searchState.result.vouchers.length})
            </h2>

            {/* Redeem result banner */}
            {redeemState.done && (
              <div
                className={`mb-4 rounded-lg p-3 text-sm ${
                  redeemState.ok
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {redeemState.ok ? (
                  <>
                    <strong>✅ Redeemed</strong> — {redeemState.rewardText}.
                    Give the customer their reward.
                  </>
                ) : (
                  <><strong>⛔</strong> {redeemState.message}</>
                )}
              </div>
            )}

            {searchState.result.vouchers.length === 0 ? (
              <p className="text-sm text-gray-500">No vouchers issued yet.</p>
            ) : (
              <div className="space-y-3">
                {searchState.result.vouchers.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-lg border p-3 ${
                      v.status === "active" ? "border-gray-200" : "border-gray-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{v.reward_text}</div>
                        {v.conditions && (
                          <div className="text-xs text-gray-500">{v.conditions}</div>
                        )}
                        <div className="mt-1 text-xs text-gray-400">
                          {v.outlet_name} &middot; Code:{" "}
                          <span className="font-mono font-bold">{v.code}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {v.status === "redeemed" && v.redeemed_at
                            ? `Redeemed ${new Date(v.redeemed_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`
                            : v.status === "active"
                            ? `Valid until ${new Date(v.expires_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`
                            : `Issued ${new Date(v.issued_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${
                          STATUS_BADGE[v.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    {/* Redeem button / confirm flow for active vouchers */}
                    {v.status === "active" && (
                      <div className="mt-3">
                        {confirmCode === v.code ? (
                          <div className="flex gap-2">
                            <form action={redeemAction} className="flex-1">
                              <input type="hidden" name="code" value={v.code} />
                              <button
                                type="submit"
                                disabled={redeeming}
                                className="btn-primary w-full !py-1.5 text-sm"
                              >
                                {redeeming ? "Processing…" : "Confirm redeem"}
                              </button>
                            </form>
                            <button
                              type="button"
                              onClick={cancelRedeem}
                              className="btn-outline !py-1.5 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRedeem(v.code)}
                            className="btn-outline w-full !py-1.5 text-sm"
                          >
                            Redeem this voucher
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { createStaff, removeStaff, type StaffActionState } from "./actions";

interface StaffMember {
  id: string;
  full_name: string | null;
  created_at: string;
  email: string | null;
}

const initial: StaffActionState = {};

export function StaffManager({ staff }: { staff: StaffMember[] }) {
  const [createState, createAction, creating] = useActionState(createStaff, initial);
  const [removeState, removeAction, removing] = useActionState(removeStaff, initial);

  return (
    <div className="space-y-6">
      {/* Current staff */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Staff accounts</h2>
        {staff.length === 0 ? (
          <p className="text-sm text-gray-500">No staff accounts yet.</p>
        ) : (
          <div className="space-y-2">
            {staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
              >
                <div>
                  <div className="font-medium">
                    {s.full_name ?? <span className="text-gray-400">No name</span>}
                  </div>
                  <div className="text-xs text-gray-500">{s.email ?? "—"}</div>
                  <div className="text-xs text-gray-400">
                    Added{" "}
                    {new Date(s.created_at).toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <form action={removeAction}>
                  <input type="hidden" name="user_id" value={s.id} />
                  <button
                    type="submit"
                    disabled={removing}
                    className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                    onClick={(e) => {
                      if (!confirm(`Remove ${s.full_name ?? s.email}? They will lose access immediately.`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        {removeState.error && (
          <p className="mt-2 text-sm text-red-600">{removeState.error}</p>
        )}
      </div>

      {/* Add staff */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Add staff account</h2>
        <p className="mb-4 text-sm text-gray-500">
          Staff can only access the Redeem page. Share the email and password
          with them directly — they log in at the normal login page.
        </p>
        <form action={createAction} className="space-y-3">
          <div>
            <label className="label" htmlFor="full_name">Name</label>
            <input
              id="full_name"
              name="full_name"
              className="input"
              placeholder="e.g. Ahmad (Cashier)"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="staff@example.com"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
            />
          </div>

          {createState.error && (
            <p className="text-sm text-red-600">{createState.error}</p>
          )}
          {createState.ok && (
            <p className="text-sm text-green-600">
              ✅ Staff account created. Share the email and password with them.
            </p>
          )}

          <button className="btn-primary" disabled={creating}>
            {creating ? "Creating…" : "Create staff account"}
          </button>
        </form>
      </div>
    </div>
  );
}

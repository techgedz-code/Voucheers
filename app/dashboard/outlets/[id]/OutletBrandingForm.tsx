"use client";

import { useActionState } from "react";
import type { Outlet } from "@/lib/types";
import { updateOutletBranding, type SaveState } from "./actions";

const initial: SaveState = {};

export function OutletBrandingForm({ outlet }: { outlet: Outlet }) {
  const [state, action, pending] = useActionState(updateOutletBranding, initial);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="outlet_id" value={outlet.id} />
      <div>
        <label className="label" htmlFor="name">Outlet name</label>
        <input id="name" name="name" defaultValue={outlet.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="address">Address</label>
        <input id="address" name="address" defaultValue={outlet.address ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="google_place_id">Google Place ID</label>
        <input
          id="google_place_id"
          name="google_place_id"
          defaultValue={outlet.google_place_id ?? ""}
          className="input"
          placeholder="ChIJ..."
        />
      </div>
      <div>
        <label className="label" htmlFor="review_url">Review URL (optional override)</label>
        <input
          id="review_url"
          name="review_url"
          defaultValue={outlet.review_url ?? ""}
          className="input"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="logo_url">Logo image URL</label>
        <input
          id="logo_url"
          name="logo_url"
          defaultValue={outlet.logo_url ?? ""}
          className="input"
          placeholder="https://.../logo.png (square PNG works best)"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used as the customer&apos;s home-screen wallet icon and on emails. Paste
          a public square image URL.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="brand_color">Brand color</label>
        <input
          id="brand_color"
          name="brand_color"
          type="color"
          defaultValue={outlet.brand_color ?? "#e11d48"}
          className="h-10 w-20 rounded border border-gray-300"
        />
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>

      {(state.error || state.ok) && (
        <div className="sm:col-span-2">
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              ✅ Details saved.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import type { Outlet } from "@/lib/types";
import { updateOutletBranding, type SaveState } from "./actions";

const initial: SaveState = {};

export function OutletBrandingForm({ outlet }: { outlet: Outlet }) {
  const [state, dispatch, pending] = useActionState(updateOutletBranding, initial);

  // Controlled fields. We submit via onSubmit + manual dispatch so React 19's
  // automatic post-action form reset never fires.
  const [name, setName] = useState(outlet.name);
  const [address, setAddress] = useState(outlet.address ?? "");
  const [placeId, setPlaceId] = useState(outlet.google_place_id ?? "");
  const [reviewUrl, setReviewUrl] = useState(outlet.review_url ?? "");
  const [logoUrl, setLogoUrl] = useState(outlet.logo_url ?? "");
  const [brandColor, setBrandColor] = useState(outlet.brand_color ?? "#e11d48");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("outlet_id", outlet.id);
    fd.set("name", name);
    fd.set("address", address);
    fd.set("google_place_id", placeId);
    fd.set("review_url", reviewUrl);
    fd.set("logo_url", logoUrl);
    fd.set("brand_color", brandColor);
    dispatch(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="name">Outlet name</label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="address">Address</label>
        <input
          id="address"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="google_place_id">Google Place ID</label>
        <input
          id="google_place_id"
          name="google_place_id"
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          className="input"
          placeholder="ChIJ..."
        />
      </div>
      <div>
        <label className="label" htmlFor="review_url">Review URL (optional override)</label>
        <input
          id="review_url"
          name="review_url"
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          className="input"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="logo_url">Logo image URL</label>
        <input
          id="logo_url"
          name="logo_url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
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
          value={brandColor}
          onChange={(e) => setBrandColor(e.target.value)}
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

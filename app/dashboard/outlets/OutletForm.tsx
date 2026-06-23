"use client";

import { useActionState } from "react";
import { createOutlet, type OutletFormState } from "./actions";

const initial: OutletFormState = {};

export function OutletForm({ canAdd }: { canAdd: boolean }) {
  const [state, formAction, pending] = useActionState(createOutlet, initial);

  return (
    <form action={formAction} className="space-y-4">
      {!canAdd && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You have reached your outlet quota or your subscription is not active.
          Contact us to add more outlets.
        </p>
      )}
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Outlet created.
        </p>
      )}

      <div>
        <label className="label" htmlFor="name">Outlet name</label>
        <input id="name" name="name" required className="input" placeholder="e.g. Nasi Lemak House — Bangsar" />
      </div>
      <div>
        <label className="label" htmlFor="address">Address (optional)</label>
        <input id="address" name="address" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="google_place_id">Google Place ID</label>
        <input id="google_place_id" name="google_place_id" className="input" placeholder="ChIJ..." />
        <p className="mt-1 text-xs text-gray-500">
          Find it at the Google{" "}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
            target="_blank"
            rel="noreferrer"
            className="text-brand underline"
          >
            Place ID finder
          </a>
          . We build the review link automatically.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="review_url">Or paste a review URL (optional)</label>
        <input id="review_url" name="review_url" className="input" placeholder="https://g.page/r/..." />
      </div>
      <div>
        <label className="label" htmlFor="brand_color">Brand color</label>
        <input id="brand_color" name="brand_color" type="color" defaultValue="#e11d48" className="h-10 w-20 rounded border border-gray-300" />
      </div>

      <button type="submit" disabled={pending || !canAdd} className="btn-primary w-full">
        {pending ? "Creating…" : "Add outlet"}
      </button>
    </form>
  );
}

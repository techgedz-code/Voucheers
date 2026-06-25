"use client";

import { useActionState, useState } from "react";
import type { Campaign } from "@/lib/types";
import { saveCampaignSettings, type SaveState } from "./actions";
import { GameTypeField } from "./GameTypeField";

const initial: SaveState = {};

export function CampaignSettingsForm({
  campaign,
  reviewUrl,
}: {
  campaign: Campaign;
  reviewUrl: string | null;
}) {
  const [state, dispatch, pending] = useActionState(saveCampaignSettings, initial);

  // Controlled fields. We submit via onSubmit + manual dispatch (not
  // <form action={…}>) so React 19's automatic post-action form reset never
  // fires — otherwise it would visually snap the <select> back to its first
  // option even though the state is correct.
  const [instagram, setInstagram] = useState(campaign.instagram_handle ?? "");
  const [gameType, setGameType] = useState(campaign.game_type);
  const [isActive, setIsActive] = useState(campaign.is_active);
  const [limitOnePlay, setLimitOnePlay] = useState(campaign.limit_one_play_per_day);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("campaign_id", campaign.id);
    fd.set("instagram_handle", instagram);
    fd.set("game_type", gameType);
    if (isActive) fd.set("is_active", "on");
    if (limitOnePlay) fd.set("limit_one_play_per_day", "on");
    dispatch(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="instagram_handle">
          Instagram handle (optional)
        </label>
        <input
          id="instagram_handle"
          name="instagram_handle"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@yourrestaurant"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-500">
          Shown as an optional “Follow us” step before the game.
        </p>
      </div>

      <GameTypeField value={gameType} onChange={setGameType} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        Campaign active (customers can play)
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="limit_one_play_per_day"
          checked={limitOnePlay}
          onChange={(e) => setLimitOnePlay(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          Limit to one play per customer per day
          <span className="block text-xs text-gray-500">
            Recommended. Prevents the same phone number spinning repeatedly in
            one day. Turn off to allow unlimited plays.
          </span>
        </span>
      </label>

      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
        <span className="font-medium">Review link:</span>{" "}
        {reviewUrl ? (
          <span className="break-all text-gray-500">{reviewUrl}</span>
        ) : (
          <span className="text-amber-600">
            Not set — add a Google Place ID on the outlet.
          </span>
        )}
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✅ Settings saved.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
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
  const [state, action] = useActionState(saveCampaignSettings, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="campaign_id" value={campaign.id} />
      <div>
        <label className="label" htmlFor="instagram_handle">
          Instagram handle (optional)
        </label>
        <input
          id="instagram_handle"
          name="instagram_handle"
          defaultValue={campaign.instagram_handle ?? ""}
          placeholder="@yourrestaurant"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-500">
          Shown as an optional “Follow us” step before the game.
        </p>
      </div>

      <GameTypeField value={campaign.game_type} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={campaign.is_active}
          className="h-4 w-4"
        />
        Campaign active (customers can play)
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="limit_one_play_per_day"
          defaultChecked={campaign.limit_one_play_per_day}
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

      <SubmitButton className="btn-primary" pendingText="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}

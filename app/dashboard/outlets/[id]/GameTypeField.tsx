"use client";

import { GAME_TYPE_LABELS } from "@/lib/constants";
import type { GameType } from "@/lib/types";

/**
 * Controlled game picker for campaign settings. The chosen game only changes
 * what the customer sees — prizes (voucher types) and win weights are shared
 * across games and configured once below.
 */
export function GameTypeField({
  value,
  onChange,
}: {
  value: GameType;
  onChange: (v: GameType) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor="game_type">
        Game
      </label>
      <select
        id="game_type"
        name="game_type"
        value={value}
        onChange={(e) => onChange(e.target.value as GameType)}
        className="input"
      >
        {(Object.keys(GAME_TYPE_LABELS) as GameType[]).map((g) => (
          <option key={g} value={g}>
            {GAME_TYPE_LABELS[g]}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">
        Customers will play:{" "}
        <span className="font-medium text-gray-700">
          {GAME_TYPE_LABELS[value]}
        </span>
        . Prizes and win odds below are shared across all games.
      </p>
    </div>
  );
}

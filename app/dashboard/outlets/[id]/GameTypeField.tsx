import { GAME_TYPE_LABELS } from "@/lib/constants";
import type { GameType } from "@/lib/types";

/**
 * Game picker for campaign settings. The chosen game only changes what the
 * customer sees — prizes (voucher types) and win weights are shared across
 * games and configured once below.
 */
export function GameTypeField({ value }: { value: GameType }) {
  return (
    <div>
      <label className="label" htmlFor="game_type">
        Game
      </label>
      <select
        id="game_type"
        name="game_type"
        defaultValue={value}
        className="input"
      >
        {(Object.keys(GAME_TYPE_LABELS) as GameType[]).map((g) => (
          <option key={g} value={g}>
            {GAME_TYPE_LABELS[g]}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">
        The game the customer plays to win. Prizes and win odds below are shared
        across all games.
      </p>
    </div>
  );
}

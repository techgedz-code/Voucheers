// Shared spin-wheel probability logic.
// Used client-side for the live % preview and server-side for the actual draw.

export interface Weighted {
  win_weight: number;
}

/** Sum of weights (>= 0). */
export function totalWeight(items: Weighted[]): number {
  return items.reduce((s, i) => s + Math.max(0, i.win_weight || 0), 0);
}

/** Normalized probability (0..1) for each item, in input order. */
export function probabilities(items: Weighted[]): number[] {
  const total = totalWeight(items);
  if (total <= 0) return items.map(() => 0);
  return items.map((i) => Math.max(0, i.win_weight || 0) / total);
}

/** Same as probabilities() but as rounded percentages that sum to ~100. */
export function percentages(items: Weighted[]): number[] {
  return probabilities(items).map((p) => Math.round(p * 1000) / 10);
}

/**
 * Server-authoritative weighted pick. Returns the chosen item's index,
 * or -1 if nothing is selectable (all weights zero / empty).
 * Pass an optional rng for testing.
 */
export function pickIndex(items: Weighted[], rng: () => number = Math.random): number {
  const total = totalWeight(items);
  if (total <= 0) return -1;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, items[i].win_weight || 0);
    if (r < 0) return i;
  }
  return items.length - 1; // floating-point safety
}

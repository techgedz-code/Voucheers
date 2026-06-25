import type { RewardType } from "./types";

export const APP_NAME = "Voucheers";

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  bogo: "Buy 1 Get 1",
  percent_discount: "% Discount",
  fixed_discount: "Cash Discount",
  free_item: "Free Item",
  none: "Try Again",
};

/** Default palette for spin-wheel segments. */
export const WHEEL_COLORS = [
  "#e11d48",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
];

/** Build the Google "write a review" deep link from a Place ID. */
export function googleReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(
    placeId
  )}`;
}

/** Human-readable description of a reward, for display on vouchers. */
export function rewardDescription(
  rewardType: RewardType,
  value: number | null,
  label: string
): string {
  switch (rewardType) {
    case "bogo":
      return "Buy 1 Get 1 Free";
    case "percent_discount":
      return `${value ?? 0}% off your bill`;
    case "fixed_discount":
      return `RM ${value ?? 0} off your bill`;
    case "free_item":
      return label;
    case "none":
      return "Better luck next time!";
    default:
      return label;
  }
}

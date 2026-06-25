// Shared domain types for the Voucher SaaS.
// These mirror the Postgres schema in supabase/migrations.

export type UserRole = "super_admin" | "merchant" | "staff";

export type SubscriptionStatus = "pending" | "active" | "suspended" | "cancelled";

export type GameType = "spin_wheel" | "football";

export type RewardType =
  | "bogo" // buy one get one
  | "percent_discount" // value = percent off
  | "fixed_discount" // value = currency amount off
  | "free_item" // value/label describes the item
  | "none"; // "try again" / no win segment

export type VoucherStatus = "active" | "redeemed" | "expired" | "void";

export interface Profile {
  id: string; // = auth.users.id
  role: UserRole;
  merchant_id: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Merchant {
  id: string;
  business_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  subscription_status: SubscriptionStatus;
  plan: string | null;
  outlet_quota: number;
  created_at: string;
}

export interface Outlet {
  id: string;
  merchant_id: string;
  name: string;
  address: string | null;
  google_place_id: string | null;
  review_url: string | null;
  logo_url: string | null;
  brand_color: string | null;
  qr_token: string; // public, unique — used in /c/[qr_token]
  is_active: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  outlet_id: string;
  name: string;
  game_type: GameType;
  instagram_handle: string | null;
  is_active: boolean;
  limit_one_play_per_day: boolean;
  created_at: string;
}

export interface VoucherType {
  id: string;
  campaign_id: string;
  label: string;
  reward_type: RewardType;
  value: number | null; // percent / amount, depending on reward_type
  validity_days: number; // voucher lifetime after issue
  conditions: string | null; // e.g. "Valid on your next visit only"
  win_weight: number; // merchant-set relative probability (>= 0)
  color: string | null; // wheel segment color
  stock_limit: number | null; // null = unlimited
  daily_limit: number | null; // null = unlimited per day
  issued_count: number;
  sort_order: number;
  is_active: boolean;
}

export interface Entry {
  id: string;
  outlet_id: string;
  phone: string;
  email: string;
  pdpa_consent: boolean;
  ip: string | null;
  ip_geo: string | null; // coarse "city, region, country"
  user_agent: string | null;
  review_clicked: boolean;
  instagram_clicked: boolean;
  created_at: string;
}

export interface IssuedVoucher {
  id: string;
  code: string; // human-readable unique code
  entry_id: string;
  voucher_type_id: string;
  outlet_id: string;
  wallet_token: string; // groups a customer's vouchers into one wallet
  status: VoucherStatus;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null; // staff profile id
}

/** A wheel segment as rendered to the customer (no probabilities leaked). */
export interface WheelSegment {
  id: string;
  label: string;
  color: string;
}

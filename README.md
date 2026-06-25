# Voucheers — Reviews & Rewards SaaS for Restaurants

A subscription SaaS that helps restaurants earn more Google reviews and repeat
visits. Diners scan a QR, are invited (never required) to leave a Google review,
play a spin-the-wheel game, and win a voucher they keep in a branded
"Add to Home Screen" wallet.

> **New here? Start with [SETUP.md](SETUP.md)** for step-by-step instructions to
> run the app (no coding required).

## Who uses it

| Role | Area | What they do |
| --- | --- | --- |
| **Super Admin** (you) | `/admin` | Approve subscriptions, set per-outlet quotas, review abuse flags. |
| **Merchant** (restaurant) | `/dashboard` | Add outlets, configure the spin wheel & vouchers, print QR posters, view analytics, redeem vouchers. |
| **Customer** (diner) | `/c/[code]` | Scan → details → review (optional) → spin → win → wallet. No login, no app install. |

## Tech stack

- **Next.js (App Router, TypeScript)** — one app for all surfaces + API routes
- **Supabase** — Postgres, Auth, Row-Level Security (multi-tenant isolation)
- **Tailwind CSS** — mobile-first UI
- **Resend** — voucher emails · **Google Places** — review links · **ipinfo** — silent geo for abuse checks
- **PWA** — per-restaurant manifest gives a branded home-screen wallet icon

## Key design decisions

- **Compliant "soft gate":** the reward is for participating; the Google review
  is invited but optional and never gated on a positive rating.
- **Server-authoritative draw:** the spin animation is cosmetic; the prize is
  chosen server-side by weighted random ([`lib/wheel.ts`](lib/wheel.ts),
  [`app/api/draw/route.ts`](app/api/draw/route.ts)) so it can't be tampered with.
- **Merchant-set win probabilities** with a live, normalized-to-100% editor
  ([`VoucherWheelEditor`](app/dashboard/outlets/[id]/VoucherWheelEditor.tsx)).
- **Per-outlet billing protection:** unique QR per outlet, Place ID binding,
  outlet-bound redemption, and silent IP/geo anomaly flags
  ([`detect_abuse`](supabase/migrations/0004_abuse.sql)) — no customer location
  prompt.

## Project layout

```
app/
  admin/            Super Admin (merchant approvals, abuse flags)
  dashboard/        Merchant (outlets, wheel editor, analytics, redeem)
  c/[qrToken]/      Public customer flow + spin game
  wallet/[token]/   Branded PWA voucher wallet (+ manifest + icon)
  api/draw/         Server-authoritative prize draw + voucher issuance
lib/                supabase clients, auth, wheel, qr, email, request helpers
supabase/migrations Schema, RLS, triggers, functions (run in order)
```

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build / typecheck
```

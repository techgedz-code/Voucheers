# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # local dev server at http://localhost:3000
npm run build    # production build — ALSO runs full TypeScript type-check (the project's only typecheck gate)
npm run start    # serve the production build
npm run lint     # eslint (next lint)
```

There is no test suite. `npm run build` is the verification gate — it fails on any type error. Run it after changes. The app cannot boot without a configured Supabase project (see `SETUP.md`); `npm run build` works without env vars but runtime pages that hit Supabase will error until `.env.local` is filled.

## What this is

A multi-tenant subscription SaaS sold to restaurants. Diners scan a QR, are invited (never required) to leave a Google review, play a spin-the-wheel game, and win a voucher kept in a branded PWA wallet. Three roles: **Super Admin** (platform owner) at `/admin`, **Merchant** (restaurant) at `/dashboard`, **Customer** (diner) at `/c/[qrToken]` + `/wallet/[walletToken]`.

## Architecture — the load-bearing decisions

**Single Next.js App Router codebase** (Next 16, React 19, TS, Tailwind v3) holds all four surfaces + API routes. Hosted target is Vercel; data layer is **Supabase (Postgres + Auth + RLS)**.

**Three Supabase clients, used deliberately — pick the right one:**
- `lib/supabase/server.ts` (`createClient`) — cookie-bound, **RLS-enforced under the logged-in user**. Use in Server Components / Server Actions for merchant & admin work.
- `lib/supabase/client.ts` — browser client, RLS-enforced. Rarely needed; most logic is server-side.
- `lib/supabase/admin.ts` (`createAdminClient`) — **service-role, bypasses RLS. SERVER ONLY.** Use only for the public customer flow (anon users have no RLS read access) and trusted system jobs. Never import into a Client Component.

**Tenancy & security live in the database, not the app.** `supabase/migrations/*.sql` define schema, RLS policies, triggers, and functions. The app trusts RLS for isolation rather than re-checking ownership in queries. Key pieces:
- Helper SQL fns `auth_role()`, `auth_merchant_id()`, `is_super_admin()` are `SECURITY DEFINER` (bypass RLS to avoid policy recursion) and drive every policy.
- `handle_new_user` trigger creates a `profiles` row on signup and, for role=merchant, auto-creates a `merchants` row — merchant signup is just `supabase.auth.signUp` with metadata (`role`, `business_name`).
- Per-outlet billing is enforced by the `enforce_outlet_quota` trigger (blocks outlet inserts past `outlet_quota` or when subscription ≠ active) and `protect_merchant_fields` (only super admin can change subscription/quota/plan). **Don't reimplement these checks in TypeScript.**
- Tenant data flows `merchant → outlets → campaigns → voucher_types`; vouchers issued via `entries → issued_vouchers`.

**Migrations are applied manually** by pasting each file into the Supabase SQL editor in order (no migration CLI wired up). When adding schema, create a new numbered `supabase/migrations/000N_*.sql` and update `SETUP.md`'s list.

**The prize draw is server-authoritative — never trust the client for outcomes.** `app/api/draw/route.ts` (uses the admin client) validates outlet/subscription/campaign, enforces one-play-per-phone-per-outlet-per-day, zeroes out stock/daily-exhausted segments, then picks via weighted random in `lib/wheel.ts` (`pickIndex`), issues the voucher (`gen_voucher_code` RPC, `increment_issued` RPC), reuses a `wallet_token` for returning customers, and emails the copy. The client (`app/c/[qrToken]/CustomerFlow.tsx`) only animates the wheel to the returned `prizeIndex`. The wheel (`components/SpinWheel.tsx`) renders **equal visual slices** so real odds stay hidden; merchant-set probabilities are a separate concern shown only in the editor.

**Win-probability editor:** `app/dashboard/outlets/[id]/VoucherWheelEditor.tsx` is a `useActionState` client form; `lib/wheel.ts` `percentages()` powers the normalized-to-100% live preview. Removing a prize **soft-deletes** (`is_active=false`) rather than hard-deleting, to keep already-issued vouchers valid.

**Customer wallet is a per-restaurant PWA.** `app/wallet/[walletToken]/manifest.webmanifest/route.ts` and `.../icon/route.ts` dynamically serve a manifest + icon branded to the outlet (logo or generated initial tile), so "Add to Home Screen" yields a restaurant-branded icon. `generateMetadata` in the wallet page wires the manifest/apple-touch-icon.

**Redemption** goes through the `redeem_voucher` SQL RPC (SECURITY DEFINER) called under the staff's auth context — it does the ownership check, expiry, and double-spend prevention atomically. Don't redeem by direct `UPDATE`.

**Auth gating** is two-layered: `proxy.ts` (Next 16's renamed "middleware") refreshes the session and redirects unauthenticated `/dashboard`/`/admin` to `/login`; `lib/auth.ts` `requireAuth(roles)` does the per-page role check and is called at the top of every protected page/action.

**Staff role** is a fourth Supabase auth user type (role = `"staff"`). Merchants create staff accounts via `app/dashboard/staff/` using `admin.auth.admin.createUser()` with `user_metadata: { role: "staff", merchant_id }`. The `handle_new_user` trigger reads `merchant_id` from metadata and sets it on the profile. Two gotchas: (1) `email_confirm: true` in `createUser` is not reliably honoured — always follow up with `admin.auth.admin.updateUserById(id, { email_confirm: true })`; (2) RLS scopes staff data to their merchant via `auth_merchant_id()` (same function as merchant — it reads `merchant_id` from the profile), so staff inherit the correct tenant automatically. Staff are restricted to `/dashboard/redeem` only — `app/dashboard/layout.tsx` renders only the Redeem nav link for staff, and `app/dashboard/page.tsx` redirects staff there on load. All other dashboard pages call `requireAuth(["merchant"])` (not staff).

**Camera scanner** (`app/dashboard/redeem/RedeemClient.tsx`) uses the `BarcodeDetector` Web API — only available on Android Chrome; iOS Safari/Chrome fall back to manual code entry. Critical timing: `startScan()` acquires the `MediaStream` and sets `scanning=true`, but the video element isn't in the DOM yet. A separate `useEffect([scanning])` attaches the stream to the `<video>` ref after React mounts it. Never call `video.srcObject = stream` inside the same function that triggers the conditional render.

**Customer database** (`app/dashboard/customers/`) aggregates entries by phone number in JS on the server (not via SQL `GROUP BY`) — acceptable at restaurant scale and simpler. The same aggregation logic is duplicated in `page.tsx` (for the UI) and `export/route.ts` (for CSV download) — intentionally, per the no-premature-abstraction rule. `CustomerSearch.tsx` (phone lookup + inline redemption) lives in `/dashboard/customers/` but is rendered on the Redeem page so staff can access it. `requireAuth(["merchant", "staff"])` on search/redeem actions; `requireAuth(["merchant"])` on the database page and export route.

## Conventions specific to this codebase

- **Compliance is product-critical:** reviews are "soft-gated" — the reward is for participating, never gated on leaving (or on a positive) review. Never write copy like "review us to win." PDPA consent is required on the customer form.
- **Anti-abuse is silent** — IP/geo is captured server-side (`lib/request.ts`); never add a browser geolocation permission prompt to the customer flow.
- Routes that must not be statically prerendered set `export const dynamic = "force-dynamic"` (public customer/wallet pages, dynamic manifest/icon routes).
- Form Server Actions used directly as `<form action={fn}>` must return `void`; actions consumed by `useActionState` return a state object. Mixing these is a build error.
- The working directory name contains a space, so the npm package is `voucher-saas` and `create-next-app .` won't run here — the scaffold was created manually.
- External integrations degrade gracefully when keys are absent: `lib/email.ts` no-ops without `RESEND_API_KEY`; `lib/request.ts` geo returns null without `IPINFO_TOKEN`.

## Where things live

- `app/admin/*` — super admin (approvals, quota, abuse flags + `runAbuseScan` → `detect_abuse` RPC)
- `app/dashboard/*` — merchant (outlets, `outlets/[id]` campaign+wheel+branding, analytics, redeem)
  - `app/dashboard/redeem/` — voucher scanner (camera + manual entry) + phone-lookup/redemption (`CustomerSearch`)
  - `app/dashboard/customers/` — customer database (aggregated by phone), CSV export, `CustomerSearch` component + `searchCustomer` action
  - `app/dashboard/staff/` — merchant creates/removes staff accounts; `StaffManager` client component
- `app/c/[qrToken]/*` — public customer flow
- `app/wallet/[walletToken]/*` — branded PWA wallet; `VoucherQr.tsx` client component handles tap-to-enlarge QR modal
- `app/api/draw/route.ts` — the draw engine
- `lib/*` — `auth`, `wheel`, `qr`, `email`, `request`, `constants`, `types`, supabase clients
- `supabase/migrations/*` — schema/RLS/triggers/functions (apply in order); `seed_super_admin.sql` promotes a user to super admin

## Known bugs / deferred work

- **Voucher emails not sent** — `lib/email.ts` no-ops silently when `RESEND_API_KEY` is absent. Verify the key is set in Vercel environment variables and that `app/api/draw/route.ts` is calling `sendVoucherEmail`. Fix before production launch.

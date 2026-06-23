# Voucher App — Setup Guide

A step-by-step guide to run the platform locally. No prior coding needed — just follow along.

## What you'll set up

1. **Supabase** — your database + login system (free).
2. **Environment keys** — paste a few secret values into `.env.local`.
3. **Run the app** — `npm run dev`.
4. **Make yourself the Super Admin.**

---

## 1. Create a Supabase project (free)

1. Go to <https://supabase.com> → sign up → **New project**.
2. Pick a name, a strong database password, and the **Southeast Asia (Singapore)** region (closest to Malaysia).
3. Wait ~2 minutes for it to provision.

### Run the database schema

1. In Supabase, open **SQL Editor** → **New query**.
2. Open the file [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in this project, copy **all** of it, paste into the editor, and click **Run**.
3. You should see "Success". This creates all tables, security rules, and triggers.

### (Recommended for testing) Turn off email confirmation

So you can sign up and log in instantly while testing:

1. Supabase → **Authentication** → **Sign In / Providers** → **Email**.
2. Turn **Confirm email** OFF. (Turn it back on before going live.)

---

## 2. Get your keys into `.env.local`

In Supabase → **Project Settings** → **API**, copy these into the matching lines of `.env.local`:

| `.env.local` variable | Where to find it in Supabase |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys → `service_role` (keep secret!) |

Leave `RESEND_API_KEY`, `GOOGLE_MAPS_API_KEY`, and `IPINFO_TOKEN` blank for now — they're only needed for later phases (email, Place ID lookup, abuse geolocation).

---

## 3. Run the app

In a terminal in this folder:

```bash
npm install      # first time only
npm run dev
```

Open <http://localhost:3000>.

---

## 4. Make yourself the Super Admin

1. Go to <http://localhost:3000/signup> and create an account with **your** email.
2. In Supabase **SQL Editor**, open [`supabase/seed_super_admin.sql`](supabase/seed_super_admin.sql), change the email to yours, and **Run** it.
3. Log out and back in. You'll now land on the **Super Admin** area at `/admin`.

---

## How the roles work

- **Super Admin (you):** `/admin` — approve merchants, set how many outlets each can have, review abuse flags.
- **Merchant (restaurant owner):** `/dashboard` — signs up themselves; can't add outlets until you approve them and set a quota.
- **Customer (diner):** scans a QR → no login needed (built in later phases).

## Test the flow so far

1. In a private/incognito window, sign up as a fake restaurant at `/signup`.
2. As Super Admin, go to `/admin`, find the pending merchant, set **Outlets = 1**, click **Approve**.
3. Back in the merchant window, go to `/dashboard/outlets` and add an outlet.
4. Try adding a second outlet — it should be blocked by the quota. ✅

---

## Going live later (not needed now)

- **Hosting:** push to GitHub, import into [Vercel](https://vercel.com), add the same env vars. (Vercel's free tier is non-commercial — use the ~USD $20/mo Pro plan once you charge customers.)
- **Email:** create a free [Resend](https://resend.com) account, verify a sending domain, paste the API key.
- Re-enable **Confirm email** in Supabase.

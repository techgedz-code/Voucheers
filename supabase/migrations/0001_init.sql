-- =============================================================
-- Voucher SaaS — initial schema, RLS, triggers
-- Run this in the Supabase SQL editor (or via the Supabase CLI).
-- =============================================================

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('super_admin', 'merchant', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('pending', 'active', 'suspended', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type game_type as enum ('spin_wheel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reward_type as enum ('bogo', 'percent_discount', 'fixed_discount', 'free_item', 'none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type voucher_status as enum ('active', 'redeemed', 'expired', 'void');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_email text,
  contact_phone text,
  subscription_status subscription_status not null default 'pending',
  plan text,
  outlet_quota int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'merchant',
  merchant_id uuid references merchants(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  plan text not null default 'starter',
  outlet_quota int not null default 1,
  status subscription_status not null default 'pending',
  approved_by uuid references profiles(id),
  period_start timestamptz,
  period_end timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists outlets (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name text not null,
  address text,
  google_place_id text,
  review_url text,
  logo_url text,
  brand_color text default '#e11d48',
  qr_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets(id) on delete cascade,
  name text not null default 'Default campaign',
  game_type game_type not null default 'spin_wheel',
  instagram_handle text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists voucher_types (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  label text not null,
  reward_type reward_type not null,
  value numeric,
  validity_days int not null default 30,
  conditions text,
  win_weight numeric not null default 1 check (win_weight >= 0),
  color text default '#e11d48',
  stock_limit int,
  daily_limit int,
  issued_count int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets(id) on delete cascade,
  phone text not null,
  email text not null,
  pdpa_consent boolean not null default false,
  ip text,
  ip_geo text,
  user_agent text,
  review_clicked boolean not null default false,
  instagram_clicked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists issued_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  entry_id uuid not null references entries(id) on delete cascade,
  voucher_type_id uuid not null references voucher_types(id),
  outlet_id uuid not null references outlets(id) on delete cascade,
  wallet_token text not null,
  status voucher_status not null default 'active',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references profiles(id)
);

-- Per-scan log used for silent IP/geo abuse clustering.
create table if not exists scan_events (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets(id) on delete cascade,
  qr_token text not null,
  ip text,
  ip_geo text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists abuse_flags (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  outlet_id uuid references outlets(id) on delete cascade,
  reason text not null,
  detail jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists idx_profiles_merchant on profiles(merchant_id);
create index if not exists idx_outlets_merchant on outlets(merchant_id);
create index if not exists idx_campaigns_outlet on campaigns(outlet_id);
create index if not exists idx_voucher_types_campaign on voucher_types(campaign_id);
create index if not exists idx_entries_outlet on entries(outlet_id);
create index if not exists idx_issued_outlet on issued_vouchers(outlet_id);
create index if not exists idx_issued_wallet on issued_vouchers(wallet_token);
create index if not exists idx_issued_entry on issued_vouchers(entry_id);
create index if not exists idx_scan_outlet on scan_events(outlet_id);
create index if not exists idx_scan_token on scan_events(qr_token);

-- ---------- Helper functions (SECURITY DEFINER bypasses RLS, avoids recursion) ----------
create or replace function auth_role()
  returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_merchant_id()
  returns uuid language sql stable security definer set search_path = public as $$
  select merchant_id from profiles where id = auth.uid()
$$;

create or replace function is_super_admin()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
$$;

-- ---------- New-user trigger: create profile (+ merchant for owners) ----------
create or replace function handle_new_user()
  returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'merchant');
  v_merchant_id uuid;
  v_business text := new.raw_user_meta_data->>'business_name';
begin
  if v_role = 'merchant' then
    insert into merchants (business_name, contact_email)
    values (coalesce(nullif(v_business, ''), 'My Restaurant'), new.email)
    returning id into v_merchant_id;
  else
    v_merchant_id := nullif(new.raw_user_meta_data->>'merchant_id', '')::uuid;
  end if;

  insert into profiles (id, role, merchant_id, full_name)
  values (new.id, v_role, v_merchant_id, new.raw_user_meta_data->>'full_name');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Protect merchant subscription fields from self-edit ----------
create or replace function protect_merchant_fields()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then
    if new.subscription_status is distinct from old.subscription_status
       or new.outlet_quota is distinct from old.outlet_quota
       or new.plan is distinct from old.plan then
      raise exception 'Only a super admin can change subscription fields.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_merchant on merchants;
create trigger trg_protect_merchant
  before update on merchants
  for each row execute function protect_merchant_fields();

-- ---------- Enforce per-outlet quota + active subscription ----------
create or replace function enforce_outlet_quota()
  returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_quota int;
  v_status subscription_status;
  v_count int;
begin
  select outlet_quota, subscription_status into v_quota, v_status
  from merchants where id = new.merchant_id;

  if v_status <> 'active' then
    raise exception 'Merchant subscription is not active; cannot add outlets.';
  end if;

  select count(*) into v_count from outlets where merchant_id = new.merchant_id;
  if v_count >= v_quota then
    raise exception 'Outlet quota (%) reached. Upgrade the subscription to add more outlets.', v_quota;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_outlet_quota on outlets;
create trigger trg_enforce_outlet_quota
  before insert on outlets
  for each row execute function enforce_outlet_quota();

-- ---------- Unique human-readable voucher code generator ----------
create or replace function gen_voucher_code()
  returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  code text;
  i int;
begin
  loop
    code := 'V';
    for i in 1..7 loop
      code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from issued_vouchers where issued_vouchers.code = code);
  end loop;
  return code;
end;
$$;

-- =============================================================
-- Row-Level Security
-- =============================================================
alter table merchants        enable row level security;
alter table profiles         enable row level security;
alter table subscriptions    enable row level security;
alter table outlets          enable row level security;
alter table campaigns        enable row level security;
alter table voucher_types    enable row level security;
alter table entries          enable row level security;
alter table issued_vouchers  enable row level security;
alter table scan_events      enable row level security;
alter table abuse_flags      enable row level security;

-- profiles
create policy "profiles self read" on profiles
  for select using (id = auth.uid());
create policy "profiles super read" on profiles
  for select using (is_super_admin());
create policy "profiles merchant reads staff" on profiles
  for select using (merchant_id = auth_merchant_id());
create policy "profiles super write" on profiles
  for all using (is_super_admin()) with check (is_super_admin());

-- merchants
create policy "merchants super all" on merchants
  for all using (is_super_admin()) with check (is_super_admin());
create policy "merchants own read" on merchants
  for select using (id = auth_merchant_id());
create policy "merchants own update" on merchants
  for update using (id = auth_merchant_id()) with check (id = auth_merchant_id());

-- subscriptions
create policy "subscriptions super all" on subscriptions
  for all using (is_super_admin()) with check (is_super_admin());
create policy "subscriptions own read" on subscriptions
  for select using (merchant_id = auth_merchant_id());

-- outlets
create policy "outlets super all" on outlets
  for all using (is_super_admin()) with check (is_super_admin());
create policy "outlets merchant all" on outlets
  for all using (merchant_id = auth_merchant_id())
  with check (merchant_id = auth_merchant_id());

-- campaigns (scoped through outlet -> merchant)
create policy "campaigns super all" on campaigns
  for all using (is_super_admin()) with check (is_super_admin());
create policy "campaigns merchant all" on campaigns
  for all using (
    exists (select 1 from outlets o where o.id = campaigns.outlet_id and o.merchant_id = auth_merchant_id())
  ) with check (
    exists (select 1 from outlets o where o.id = campaigns.outlet_id and o.merchant_id = auth_merchant_id())
  );

-- voucher_types (scoped through campaign -> outlet -> merchant)
create policy "voucher_types super all" on voucher_types
  for all using (is_super_admin()) with check (is_super_admin());
create policy "voucher_types merchant all" on voucher_types
  for all using (
    exists (
      select 1 from campaigns c join outlets o on o.id = c.outlet_id
      where c.id = voucher_types.campaign_id and o.merchant_id = auth_merchant_id()
    )
  ) with check (
    exists (
      select 1 from campaigns c join outlets o on o.id = c.outlet_id
      where c.id = voucher_types.campaign_id and o.merchant_id = auth_merchant_id()
    )
  );

-- entries (read-only for merchant/super; writes happen via service role)
create policy "entries super read" on entries
  for select using (is_super_admin());
create policy "entries merchant read" on entries
  for select using (
    exists (select 1 from outlets o where o.id = entries.outlet_id and o.merchant_id = auth_merchant_id())
  );

-- issued_vouchers
create policy "issued super all" on issued_vouchers
  for all using (is_super_admin()) with check (is_super_admin());
create policy "issued merchant read" on issued_vouchers
  for select using (
    exists (select 1 from outlets o where o.id = issued_vouchers.outlet_id and o.merchant_id = auth_merchant_id())
  );
create policy "issued merchant update" on issued_vouchers
  for update using (
    exists (select 1 from outlets o where o.id = issued_vouchers.outlet_id and o.merchant_id = auth_merchant_id())
  ) with check (
    exists (select 1 from outlets o where o.id = issued_vouchers.outlet_id and o.merchant_id = auth_merchant_id())
  );

-- scan_events
create policy "scan super read" on scan_events
  for select using (is_super_admin());
create policy "scan merchant read" on scan_events
  for select using (
    exists (select 1 from outlets o where o.id = scan_events.outlet_id and o.merchant_id = auth_merchant_id())
  );

-- abuse_flags
create policy "abuse super all" on abuse_flags
  for all using (is_super_admin()) with check (is_super_admin());
create policy "abuse merchant read" on abuse_flags
  for select using (merchant_id = auth_merchant_id());

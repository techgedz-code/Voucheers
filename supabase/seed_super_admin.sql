-- =============================================================
-- Promote an existing user to Super Admin (the SaaS owner = you).
--
-- HOW TO USE:
-- 1. First sign up normally in the app with your email (this creates an
--    auth user + a "merchant" profile + a throwaway merchant row).
-- 2. Then run this in the Supabase SQL editor, replacing the email.
--    It flips your profile to super_admin and detaches the throwaway merchant.
-- =============================================================

with me as (
  select id from auth.users where email = 'techgedz@gmail.com'  -- <-- change this
)
update profiles
set role = 'super_admin', merchant_id = null
where id in (select id from me);

-- Optional: clean up the throwaway merchant created during signup.
-- delete from merchants
-- where contact_email = 'techgedz@gmail.com'
--   and not exists (select 1 from profiles p where p.merchant_id = merchants.id);

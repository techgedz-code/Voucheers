-- Add a second game option ("football") alongside the original spin wheel.
-- The draw stays server-authoritative; game_type only changes which game the
-- customer sees. Prizes (voucher_types) are shared across games.
--
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in some
-- Postgres versions. If the Supabase SQL editor complains, run this single
-- statement on its own.
alter type game_type add value if not exists 'football';

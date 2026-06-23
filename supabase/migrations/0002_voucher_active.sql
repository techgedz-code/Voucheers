-- Soft-delete / enable flag for voucher types.
-- Lets a merchant remove a prize from the wheel without breaking
-- already-issued vouchers that still reference it.

alter table voucher_types
  add column if not exists is_active boolean not null default true;

create index if not exists idx_voucher_types_active
  on voucher_types(campaign_id, is_active);

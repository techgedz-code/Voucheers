-- Let merchants toggle the "one play per phone per outlet per day" guard
-- on the customer spin game. Default ON (recommended anti-spam behaviour).

alter table campaigns
  add column if not exists limit_one_play_per_day boolean not null default true;

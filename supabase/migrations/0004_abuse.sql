-- Silent anti-abuse: detect a single outlet QR being scanned from multiple
-- distinct locations (a signal that one QR is being reused across physical
-- outlets to dodge per-outlet billing). Creates abuse_flags for super admin
-- review. Never blocks customers.

create or replace function detect_abuse()
  returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with geo_counts as (
    select outlet_id, qr_token, ip_geo, count(*) as cnt
    from scan_events
    where ip_geo is not null
    group by outlet_id, qr_token, ip_geo
    having count(*) >= 3            -- ignore one-off / incidental locations
  ),
  flagged as (
    select o.merchant_id, gc.outlet_id, gc.qr_token,
           count(*) as location_count,
           jsonb_agg(jsonb_build_object('location', gc.ip_geo, 'scans', gc.cnt)
                     order by gc.cnt desc) as locations
    from geo_counts gc
    join outlets o on o.id = gc.outlet_id
    group by o.merchant_id, gc.outlet_id, gc.qr_token
    having count(*) >= 2           -- 2+ distinct significant locations
  ),
  inserted as (
    insert into abuse_flags (merchant_id, outlet_id, reason, detail)
    select f.merchant_id, f.outlet_id,
      'QR scanned from multiple distinct locations — possible cross-outlet reuse',
      jsonb_build_object('qr_token', f.qr_token, 'location_count', f.location_count, 'locations', f.locations)
    from flagged f
    where not exists (
      select 1 from abuse_flags af
      where af.outlet_id = f.outlet_id
        and af.resolved = false
        and af.reason like 'QR scanned from multiple%'
    )
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end;
$$;

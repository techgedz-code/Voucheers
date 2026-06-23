-- Server-side functions used by the customer draw and staff redemption.

-- Atomically bump the issued counter for a voucher type.
create or replace function increment_issued(p_id uuid)
  returns void language sql security definer set search_path = public as $$
  update voucher_types set issued_count = issued_count + 1 where id = p_id;
$$;

-- Redeem a voucher by code. Validates caller ownership, expiry, and prevents
-- double-spend. Returns a JSON result describing the outcome.
create or replace function redeem_voucher(p_code text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v record;
  v_caller_merchant uuid;
  v_is_super boolean;
begin
  select role = 'super_admin', merchant_id
    into v_is_super, v_caller_merchant
  from profiles where id = auth.uid();

  select iv.*, o.merchant_id as outlet_merchant, o.name as outlet_name,
         vt.label, vt.reward_type, vt.value, vt.conditions
    into v
  from issued_vouchers iv
  join outlets o on o.id = iv.outlet_id
  join voucher_types vt on vt.id = iv.voucher_type_id
  where upper(iv.code) = upper(p_code);

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found',
      'message', 'Voucher code not found.');
  end if;

  -- Authorisation: super admin, or staff/merchant of the voucher's outlet.
  if not coalesce(v_is_super, false) and v.outlet_merchant is distinct from v_caller_merchant then
    return jsonb_build_object('ok', false, 'status', 'forbidden',
      'message', 'This voucher belongs to another business.');
  end if;

  if v.status = 'redeemed' then
    return jsonb_build_object('ok', false, 'status', 'already_redeemed',
      'message', 'Voucher already redeemed.',
      'redeemed_at', v.redeemed_at);
  end if;

  if v.status = 'void' then
    return jsonb_build_object('ok', false, 'status', 'void',
      'message', 'Voucher is void.');
  end if;

  if v.expires_at < now() then
    update issued_vouchers set status = 'expired' where id = v.id;
    return jsonb_build_object('ok', false, 'status', 'expired',
      'message', 'Voucher has expired.', 'expires_at', v.expires_at);
  end if;

  update issued_vouchers
    set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
  where id = v.id;

  return jsonb_build_object(
    'ok', true, 'status', 'redeemed',
    'message', 'Voucher redeemed.',
    'code', v.code,
    'label', v.label,
    'reward_type', v.reward_type,
    'value', v.value,
    'conditions', v.conditions,
    'outlet_name', v.outlet_name
  );
end;
$$;

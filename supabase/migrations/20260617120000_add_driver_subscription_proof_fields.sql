alter table public.driver_profiles
  add column if not exists provider_payment_reference text,
  add column if not exists provider_payment_amount numeric(10,2),
  add column if not exists provider_payment_status text not null default 'pending',
  add column if not exists provider_payment_proof_url text,
  add column if not exists provider_last_paid_at timestamptz,
  add column if not exists provider_next_payment_at timestamptz;

with latest_driver_payments as (
  select distinct on (user_id)
    user_id,
    payment_reference,
    amount,
    status,
    proof_url,
    activated_at,
    expires_at,
    created_at,
    plan_type
  from public.payments
  where plan_type in ('provider_monthly', 'provider_quarterly', 'provider_annual')
  order by user_id, created_at desc
)
update public.driver_profiles dp
set
  provider_payment_reference = coalesce(dp.provider_payment_reference, lp.payment_reference),
  provider_payment_amount = coalesce(dp.provider_payment_amount, lp.amount),
  provider_payment_status = coalesce(nullif(dp.provider_payment_status, ''), lp.status, 'pending'),
  provider_payment_proof_url = coalesce(dp.provider_payment_proof_url, lp.proof_url),
  provider_last_paid_at = coalesce(dp.provider_last_paid_at, lp.activated_at, lp.created_at),
  provider_next_payment_at = coalesce(
    dp.provider_next_payment_at,
    lp.expires_at,
    case
      when lp.plan_type = 'provider_monthly' then coalesce(lp.activated_at, lp.created_at) + interval '1 month'
      when lp.plan_type = 'provider_quarterly' then coalesce(lp.activated_at, lp.created_at) + interval '3 months'
      else coalesce(lp.activated_at, lp.created_at) + interval '12 months'
    end
  ),
  provider_expires_at = coalesce(
    dp.provider_expires_at,
    lp.expires_at,
    case
      when lp.plan_type = 'provider_monthly' then coalesce(lp.activated_at, lp.created_at) + interval '1 month'
      when lp.plan_type = 'provider_quarterly' then coalesce(lp.activated_at, lp.created_at) + interval '3 months'
      else coalesce(lp.activated_at, lp.created_at) + interval '12 months'
    end
  )
from latest_driver_payments lp
where dp.user_id = lp.user_id;

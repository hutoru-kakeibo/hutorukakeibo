-- households.cancel_at_period_end を追加。
-- Stripeで「期間終了時に解約」した場合、subscription.status はすぐには
-- 'canceled' にならず 'active' のまま期間終了を迎える。そのため既存の
-- subscription_status だけでは「解約予約中」を判別できず、UIが
-- 「次回のお支払い」のままになってしまっていた。このフラグを追加し、
-- Webhookから同期する。

alter table public.households
  add column cancel_at_period_end boolean not null default false;

-- protect_household_billing_columns トリガーの保護対象に追加
create or replace function public.protect_household_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.plan := old.plan;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.subscription_status := old.subscription_status;
  new.current_period_end := old.current_period_end;
  new.cancel_at_period_end := old.cancel_at_period_end;
  return new;
end;
$$;

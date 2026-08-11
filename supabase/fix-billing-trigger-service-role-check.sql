-- 修正: protect_household_billing_columns トリガーの service_role 判定を直す。
--
-- 問題: current_user = 'service_role' で判定していたが、Supabase はコネクション
-- プーリングを使うため、service_role キーで接続しても current_user は実際の
-- Postgres ロールを反映しない（プーラーの共有ロールのまま）。そのため Stripe
-- Webhook からの正当な更新（households.plan など）まで常に元の値へ巻き戻されて
-- しまい、決済してもプレミアムに切り替わらないバグになっていた。
--
-- 修正: auth.role()（request.jwt.claim.role を読む Supabase 標準ヘルパー）で判定する。

create or replace function public.protect_household_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Stripe Webhook（service role）からの更新はそのまま通す
  -- 注意: Supabase はコネクションプーリングを使うため current_user は JWT のロールを
  -- 反映しない。必ず auth.role()（request.jwt.claim.role を読む）で判定すること。
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- それ以外（アプリのクライアント）からの更新では課金関連カラムを元の値に戻す
  new.plan := old.plan;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.subscription_status := old.subscription_status;
  new.current_period_end := old.current_period_end;
  return new;
end;
$$;

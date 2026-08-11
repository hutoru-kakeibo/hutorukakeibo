-- Stripe によるサブスク課金（プレミアムプラン）の本実装用。
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行してください。

-- households に Stripe の識別子と契約状態を持たせる。
-- plan カラム（'free' | 'premium'）は既存のまま使い、Webhook がこれを更新する。
alter table public.households
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  -- Stripe のサブスク状態をそのまま保持（active / trialing / past_due / canceled など）
  add column subscription_status text,
  -- 現在の課金期間の終了日時。解約予約中でもこの日までは利用できる
  add column current_period_end timestamptz;

create unique index households_stripe_customer_idx
  on public.households (stripe_customer_id)
  where stripe_customer_id is not null;

-- ============================================================
-- 課金関連カラムの保護
--
-- 既存の "members can update their household" ポリシーはメンバーに全カラムの
-- 更新を許すため、そのままだと無料ユーザーが anon キーで plan を 'premium' に
-- 書き換えられてしまう。トリガーでクライアントからの変更を無効化する。
--
-- Webhook は service role キーで接続する（DBロールが service_role になる）ため、
-- この保護を通過して plan を更新できる。
-- ============================================================
create or replace function public.protect_household_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Stripe Webhook（service role）からの更新はそのまま通す
  if current_user = 'service_role' then
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

create trigger protect_household_billing_columns
  before update on public.households
  for each row execute function public.protect_household_billing_columns();

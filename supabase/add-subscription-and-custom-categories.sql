-- 機能追加: サブスク課金の前段階（プレミアムプラン判定 + カスタムカテゴリ）
-- 実際の決済処理（Stripe 等）はまだ実装していません。plan 列は手動で切り替えてテストしてください。
-- 例: update households set plan = 'premium' where id = '対象のhousehold id';
-- Supabase の SQL Editor で、このファイルの中身を全部実行してください。

-- ============================================================
-- 1. households にプラン列を追加
-- ============================================================

alter table public.households
  add column if not exists plan text not null default 'free' check (plan in ('free', 'premium'));

-- ============================================================
-- 2. expenses.category_id の固定6種類チェックを撤回
--    （カスタムカテゴリのUUIDも category_id に入るようになるため）
-- ============================================================

alter table public.expenses
  drop constraint if exists expenses_category_id_check;

-- ============================================================
-- 3. カスタムカテゴリ用テーブル
-- ============================================================

create table if not exists public.custom_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  emoji text not null default '🏷️',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists custom_categories_household_idx on public.custom_categories (household_id);

alter table public.custom_categories enable row level security;

-- 閲覧: household メンバーなら誰でも
create policy "members can view custom categories" on public.custom_categories
  for select using (public.is_household_member(household_id));

-- 作成: household がプレミアムプランの場合のみ（DB側で強制することで、
-- クライアント側の制御を迂回した直接APIコールでも課金制限を維持する）
create policy "premium households can create custom categories" on public.custom_categories
  for insert with check (
    created_by = auth.uid()
    and public.is_household_member(household_id)
    and exists (
      select 1 from public.households
      where id = household_id and plan = 'premium'
    )
  );

-- 削除: household メンバーなら誰でも（プランがダウングレードされても既存カテゴリの整理はできるようにする）
create policy "members can delete custom categories" on public.custom_categories
  for delete using (public.is_household_member(household_id));

-- 機能追加: 全体予算とは別に、カテゴリごとの予算を設定できるようにする。
-- キャラクターの状態判定（スリム/まるまる等）は引き続き households.monthly_budget（全体予算）のみを参照する。
-- Supabase の SQL Editor で実行してください。

create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id text not null,
  monthly_budget integer not null check (monthly_budget > 0),
  created_at timestamptz not null default now(),
  unique (household_id, category_id)
);

create index category_budgets_household_idx on public.category_budgets (household_id);

alter table public.category_budgets enable row level security;

-- households.monthly_budget の編集と同じ考え方で、household メンバーなら誰でも管理できる
create policy "members can view category budgets" on public.category_budgets
  for select using (public.is_household_member(household_id));

create policy "members can insert category budgets" on public.category_budgets
  for insert with check (public.is_household_member(household_id));

create policy "members can update category budgets" on public.category_budgets
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members can delete category budgets" on public.category_budgets
  for delete using (public.is_household_member(household_id));

-- 修正パッチ: household_members の SELECT ポリシーが自分自身を再帰的に問い合わせており、
-- "infinite recursion detected in policy" エラーの原因になっていた。
-- SECURITY DEFINER 関数（RLSを経由せず内部でチェックする）に置き換えて解消する。
-- Supabase の SQL Editor で、このファイルの中身を全部実行してください。

-- ============================================================
-- 1. RLSを経由しないメンバーシップ確認用ヘルパー関数
-- ============================================================

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = target_household_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_household_member(uuid) to authenticated;

create or replace function public.shares_household_with(other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from household_members hm1
    join household_members hm2 on hm1.household_id = hm2.household_id
    where hm1.user_id = auth.uid() and hm2.user_id = other_user_id
  );
$$;

grant execute on function public.shares_household_with(uuid) to authenticated;

-- ============================================================
-- 2. 既存ポリシーを、上記ヘルパー関数を使う形に差し替え
-- ============================================================

drop policy if exists "profiles are viewable by self and co-members" on public.profiles;
create policy "profiles are viewable by self and co-members" on public.profiles
  for select using (
    id = auth.uid() or public.shares_household_with(id)
  );

drop policy if exists "members can view household roster" on public.household_members;
create policy "members can view household roster" on public.household_members
  for select using (
    user_id = auth.uid() or public.is_household_member(household_id)
  );

drop policy if exists "members can view their household" on public.households;
create policy "members can view their household" on public.households
  for select using (public.is_household_member(id));

drop policy if exists "members can update their household" on public.households;
create policy "members can update their household" on public.households
  for update using (public.is_household_member(id));

drop policy if exists "members can view household expenses" on public.expenses;
create policy "members can view household expenses" on public.expenses
  for select using (public.is_household_member(household_id));

drop policy if exists "members can insert expenses" on public.expenses;
create policy "members can insert expenses" on public.expenses
  for insert with check (
    created_by = auth.uid() and public.is_household_member(household_id)
  );

drop policy if exists "members can delete household expenses" on public.expenses;
create policy "members can delete household expenses" on public.expenses
  for delete using (public.is_household_member(household_id));

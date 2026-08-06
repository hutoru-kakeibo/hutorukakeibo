-- 太る家計簿: 初期スキーマ
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行してください。
-- （このリポジトリには Supabase CLI を導入していないため、手動実行を前提としています）

-- ============================================================
-- 1. テーブル定義
-- ============================================================

-- households: 家族・パートナーで共有する家計簿の単位。
-- 1人が複数の household に所属でき、profiles.active_household_id で表示中のものを管理する。
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#22a06b',
  monthly_budget integer not null default 30000 check (monthly_budget >= 0),
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id),
  -- サブスク課金の前段階。実際の決済処理は未実装で、この列は手動で切り替えて運用する。
  plan text not null default 'free' check (plan in ('free', 'premium')),
  -- 「記録」タブのカテゴリ表示順（カテゴリIDの配列）。ドラッグ並べ替えで更新される。
  -- 未登録のカテゴリ（新しく追加されたもの等）はこの配列に含まれず、末尾に自然順で表示される。
  category_order jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  active_household_id uuid references public.households (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- category_id は固定カテゴリの文字列 ID、またはカスタムカテゴリの UUID のどちらも入るため
-- チェック制約は付けない（アプリ側で選択肢を制御する）。
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  amount integer not null check (amount > 0),
  category_id text not null,
  expense_date date not null,
  memo text not null default '',
  created_at timestamptz not null default now()
);

-- custom_categories: プレミアムプランの household のみ作成できる、独自のカテゴリ
create table public.custom_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  emoji text not null default '🏷️',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- category_budgets: 全体予算(households.monthly_budget)とは別に、カテゴリごとに設定できる任意の予算。
-- キャラクターの状態判定は引き続き全体予算のみを参照し、こちらは「統計」の診断で使う。
create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id text not null,
  monthly_budget integer not null check (monthly_budget > 0),
  created_at timestamptz not null default now(),
  unique (household_id, category_id)
);

create index expenses_household_date_idx on public.expenses (household_id, expense_date desc);
create index household_members_user_idx on public.household_members (user_id);
create index custom_categories_household_idx on public.custom_categories (household_id);
create index category_budgets_household_idx on public.category_budgets (household_id);

-- ============================================================
-- 2. 新規ユーザー登録時の自動プロビジョニング
--    (プロフィール作成 + 個人用 household 作成 + メンバー登録)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  generated_code text;
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  generated_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.households (name, color, owner_id, invite_code)
  values ('マイ家計簿', '#22a06b', new.id, generated_code)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id)
  values (new_household_id, new.id);

  update public.profiles set active_household_id = new_household_id where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. 招待コードでの参加用関数（households を直接 select させずに済むよう security definer で実行）
--    1人が複数の household に所属できるため、参加しても既存の所属はそのまま維持し、
--    表示中の household を参加先に切り替えるだけにする。
-- ============================================================

create or replace function public.join_household_by_invite_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  select id into target_household_id from public.households where invite_code = code;

  if target_household_id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.household_members (household_id, user_id)
  values (target_household_id, auth.uid())
  on conflict (household_id, user_id) do nothing;

  update public.profiles set active_household_id = target_household_id where id = auth.uid();

  return target_household_id;
end;
$$;

-- ============================================================
-- 3b. 新しい household を作成する（自分がホストになる）
-- ============================================================

create or replace function public.create_household(household_name text, household_color text default '#22a06b')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  generated_code text;
begin
  generated_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.households (name, color, owner_id, invite_code)
  values (household_name, household_color, auth.uid(), generated_code)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id)
  values (new_household_id, auth.uid());

  update public.profiles set active_household_id = new_household_id where id = auth.uid();

  return new_household_id;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;

-- ============================================================
-- 3c. 表示中の household を切り替える（メンバーであることを検証してから切り替える）
-- ============================================================

create or replace function public.set_active_household(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_member(target_household_id) then
    raise exception 'not_a_member';
  end if;

  update public.profiles set active_household_id = target_household_id where id = auth.uid();
end;
$$;

grant execute on function public.set_active_household(uuid) to authenticated;

-- ============================================================
-- 3d. ホストによるメンバー削除・非ホストの退出
-- ============================================================

create or replace function public.remove_household_member(target_household_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
begin
  select (owner_id = auth.uid()) into is_owner from public.households where id = target_household_id;

  if not coalesce(is_owner, false) then
    raise exception 'not_authorized';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'owner_cannot_remove_self';
  end if;

  delete from public.household_members
  where household_id = target_household_id and user_id = target_user_id;

  update public.profiles
  set active_household_id = null
  where id = target_user_id and active_household_id = target_household_id;
end;
$$;

grant execute on function public.remove_household_member(uuid, uuid) to authenticated;

create or replace function public.leave_household(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
begin
  select (owner_id = auth.uid()) into is_owner from public.households where id = target_household_id;

  if coalesce(is_owner, false) then
    raise exception 'owner_cannot_leave';
  end if;

  delete from public.household_members
  where household_id = target_household_id and user_id = auth.uid();

  update public.profiles
  set active_household_id = null
  where id = auth.uid() and active_household_id = target_household_id;
end;
$$;

grant execute on function public.leave_household(uuid) to authenticated;

-- ホストが自分の household を削除する。関連データは外部キーの
-- on delete cascade / on delete set null で自動的に片付く。
create or replace function public.delete_household(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  member_household_count int;
begin
  select (owner_id = auth.uid()) into is_owner
  from public.households
  where id = target_household_id;

  if not coalesce(is_owner, false) then
    raise exception 'not_authorized';
  end if;

  select count(*) into member_household_count
  from public.household_members
  where user_id = auth.uid();

  if member_household_count <= 1 then
    raise exception 'cannot_delete_last_household';
  end if;

  delete from public.households where id = target_household_id;
end;
$$;

grant execute on function public.delete_household(uuid) to authenticated;

grant execute on function public.join_household_by_invite_code(text) to authenticated;

-- ============================================================
-- 4. Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.expenses enable row level security;

-- household_members への RLS ポリシーが自分自身を再帰的に問い合わせると
-- "infinite recursion detected in policy" になるため、SECURITY DEFINER 関数で
-- RLSを経由せずにメンバーシップを確認する（Supabase 公式に推奨されるパターン）。
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

-- profiles: 自分自身、または同じ household に属するメンバーのプロフィールを閲覧可能
create policy "profiles are viewable by self and co-members" on public.profiles
  for select using (
    id = auth.uid() or public.shares_household_with(id)
  );

create policy "users can update own profile" on public.profiles
  for update using (id = auth.uid());

-- households: メンバーのみ閲覧・更新可能
create policy "members can view their household" on public.households
  for select using (public.is_household_member(id));

create policy "members can update their household" on public.households
  for update using (public.is_household_member(id));

-- household_members: 自分の所属、または同じ household の名簿を閲覧可能
create policy "members can view household roster" on public.household_members
  for select using (
    user_id = auth.uid() or public.is_household_member(household_id)
  );

-- expenses: household メンバーのみ閲覧・追加・削除可能
create policy "members can view household expenses" on public.expenses
  for select using (public.is_household_member(household_id));

create policy "members can insert expenses" on public.expenses
  for insert with check (
    created_by = auth.uid() and public.is_household_member(household_id)
  );

create policy "members can update household expenses" on public.expenses
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members can delete household expenses" on public.expenses
  for delete using (public.is_household_member(household_id));

-- custom_categories: 閲覧はメンバー全員、作成はプレミアムプランの household のみ
alter table public.custom_categories enable row level security;

create policy "members can view custom categories" on public.custom_categories
  for select using (public.is_household_member(household_id));

create policy "premium households can create custom categories" on public.custom_categories
  for insert with check (
    created_by = auth.uid()
    and public.is_household_member(household_id)
    and exists (
      select 1 from public.households
      where id = household_id and plan = 'premium'
    )
  );

create policy "members can delete custom categories" on public.custom_categories
  for delete using (public.is_household_member(household_id));

-- category_budgets: households.monthly_budget と同じ考え方で、メンバーなら誰でも管理できる
create policy "members can view category budgets" on public.category_budgets
  for select using (public.is_household_member(household_id));

create policy "members can insert category budgets" on public.category_budgets
  for insert with check (public.is_household_member(household_id));

create policy "members can update category budgets" on public.category_budgets
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "members can delete category budgets" on public.category_budgets
  for delete using (public.is_household_member(household_id));

-- ============================================================
-- 5. Realtime（家族間でのリアルタイム反映に必要）
-- ============================================================

alter publication supabase_realtime add table public.expenses;

-- 機能追加: 家計簿の複数作成・切り替え・色分け・ホストによるメンバー管理
-- Supabase の SQL Editor で、このファイルの中身を全部実行してください。

-- ============================================================
-- 1. カラム追加
-- ============================================================

alter table public.households
  add column if not exists color text not null default '#22a06b';

alter table public.profiles
  add column if not exists active_household_id uuid references public.households (id) on delete set null;

-- ============================================================
-- 2. 新規ユーザー登録トリガーを更新
--    (作成した個人用 household を active_household_id にも設定する)
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

-- ============================================================
-- 3. 招待コード参加: 「1人1household」の制約を撤回し、複数所属を許可する
--    （参加時に前の household から自動離脱していた挙動を削除し、
--    参加した household に切り替えるだけにする）
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
-- 4. 新しい household を作成する（自分がホストになる）
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
-- 5. 表示中の household を切り替える（メンバーであることを検証してから切り替える）
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
-- 6. ホストによるメンバー削除（ホスト以外は実行不可、自分自身も削除不可）
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

-- ============================================================
-- 7. 非ホストのメンバーが household から退出する（ホストは退出不可）
-- ============================================================

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

-- 修正パッチ: 招待コードで参加した際、参加前に所属していた household
-- （多くは自動作成された個人用）から自動的に離脱するようにする。
-- 誰もいなくなった household は片付ける。
-- Supabase の SQL Editor で実行してください（既存関数を安全に置き換えるだけです）。

create or replace function public.join_household_by_invite_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
  previous_household_id uuid;
begin
  select id into target_household_id from public.households where invite_code = code;

  if target_household_id is null then
    raise exception 'invalid_invite_code';
  end if;

  select household_id into previous_household_id
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  insert into public.household_members (household_id, user_id)
  values (target_household_id, auth.uid())
  on conflict (household_id, user_id) do nothing;

  if previous_household_id is not null and previous_household_id <> target_household_id then
    delete from public.household_members
    where household_id = previous_household_id and user_id = auth.uid();

    if not exists (select 1 from public.household_members where household_id = previous_household_id) then
      delete from public.households where id = previous_household_id;
    end if;
  end if;

  return target_household_id;
end;
$$;

-- 機能追加: ホストが自分の家計簿を削除できるようにする。
-- household_members / expenses / custom_categories は households への
-- 外部キーに on delete cascade が設定済みのため、household を削除すれば
-- 関連データ（支出記録・カテゴリ・メンバー情報）も自動的に削除される。
-- profiles.active_household_id も on delete set null 済みのため、
-- 削除されたhouseholdを表示していたメンバーは自動的にnullへ戻る。
-- Supabase の SQL Editor で実行してください。

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

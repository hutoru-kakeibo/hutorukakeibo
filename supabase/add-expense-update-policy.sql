-- 機能追加: 取引の再編集を可能にする。
-- expenses テーブルには SELECT / INSERT / DELETE ポリシーしかなく、
-- UPDATE ポリシーが無いため編集リクエストが常にブロックされていた。
-- Supabase の SQL Editor で実行してください。

create policy "members can update household expenses" on public.expenses
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

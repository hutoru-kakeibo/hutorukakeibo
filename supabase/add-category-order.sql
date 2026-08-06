-- カテゴリの並び順をユーザーがドラッグで変更できるようにするための追加カラム。
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行してください。

alter table public.households
  add column category_order jsonb not null default '[]'::jsonb;

-- 既存の RLS ポリシー「members can update their household」がそのまま適用されるため、
-- ポリシーの追加は不要（household のメンバーであれば誰でも更新できる）。

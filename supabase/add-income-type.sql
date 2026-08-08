-- 「記録」タブで収入も記録できるようにするための追加カラム。
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行してください。

alter table public.expenses
  add column type text not null default 'expense' check (type in ('expense', 'income'));

-- 既存の RLS ポリシー（expenses テーブル）はカラムに依存しない条件のため、
-- ポリシーの追加・変更は不要。

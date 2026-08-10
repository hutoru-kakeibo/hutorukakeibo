-- 収入カテゴリでもカスタムカテゴリの追加・ドラッグ並べ替え・削除を
-- 支出と同様にできるようにするための追加カラム。
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行してください。

alter table public.custom_categories
  add column type text not null default 'expense' check (type in ('expense', 'income'));

alter table public.households
  add column income_category_order jsonb not null default '[]'::jsonb;

-- 既存の RLS ポリシー（custom_categories / households）はどちらもカラムに
-- 依存しない条件のため、ポリシーの追加・変更は不要。

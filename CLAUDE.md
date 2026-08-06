# 太る家計簿 — 開発ガイド

> **作業を始める前に [HANDOVER.md](HANDOVER.md) を読むこと。**
> 特に「§4 ハマりどころと技術的知見」には、過去に実際に踏んだ地雷とその解決策がまとまっている。

キャラクター育成型の家計簿 PWA。Next.js 16 (App Router/Turbopack) + Supabase + Vercel。
本番: https://hutorukakeibo.vercel.app

## コマンド

```bash
npm run dev     # 開発（Service Worker 無効）
npm run build   # next build && serwist build serwist.config.mjs
npm run start   # 本番ビルド起動（PWA検証はこちら）
npm run lint
```

Claude Code のシェルは Node の PATH を引き継がないことがある。その場合は先頭に付ける:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## 必ず守ること

- **PWA/SW の検証は `npm run build && npm run start`**。`dev` では SW が登録されない
- **変更が反映されないときはまず SW キャッシュを疑う**（HANDOVER §4.6 のクリア用スニペット）
- **`window.confirm()` / `alert()` を使わない**。iOS の PWA で無反応になる。確認UIはアプリ内パネルで実装（HANDOVER §4.5）
- **Supabase 呼び出しは必ず `error` を受けて `console.error` する**。握りつぶすとRLSの失敗が見えなくなる（HANDOVER §4.3）
- **RLS ポリシーは `is_household_member()` / `shares_household_with()` 経由で書く**。テーブルを自己参照すると無限再帰する（HANDOVER §4.2）
- **`useEffect` 内の非同期処理は先頭に `await Promise.resolve()`** を挟む。lint (`react-hooks/set-state-in-effect`) が通らない（HANDOVER §4.4）
- **DBスキーマを変えたら3点セットを更新**: 差分パッチSQL / `supabase/schema.sql` / `src/lib/supabase/database.types.ts`
- **`.env.local` は絶対にコミットしない**

## 完了の基準

`npm run lint` → `npm run build` → **実機ブラウザでの動作確認**まで通して初めて完了。
ビルドが通っただけで「実装できました」と報告しない。

## デプロイ

`git push origin main` で Vercel が自動デプロイ。
**DBスキーマ変更を伴う場合は、push の前に Supabase SQL Editor でパッチを適用しておく。**

## ユーザーとのやりとり

非エンジニア寄り。Supabase/Vercel のダッシュボード操作は画面上の場所から具体的に案内する。
秘密情報（APIキー等）はチャットに貼らせず、ユーザー自身がダッシュボードに直接入力してもらう。

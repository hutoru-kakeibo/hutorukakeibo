# 太る家計簿 — 開発引継書

> **バージョン 1.0**（2026-08-06 時点）— 本番稼働中の状態を記録したもの
> タグ: `v1.0.0`

このドキュメントは、本プロジェクトを別の開発者（または別の Claude Code セッション）へ引き継ぐための体系的なまとめです。
**「4. ハマりどころと技術的知見」は特に重要**です。同じ失敗を繰り返さないよう、着手前に一読してください。

---

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| アプリ名 | **太る家計簿**（旧称 PetiteBudget。リポジトリ名・パッケージ名は `petite-budget` のまま） |
| コンセプト | 支出が予算を超えるほどキャラクターが太っていくゲーミフィケーション家計簿 |
| ターゲット | iPhone Safari / PWA（ホーム画面追加）でのモバイル利用がメイン |
| 本番URL | https://hutorukakeibo.vercel.app |
| リポジトリ | https://github.com/hutoru-kakeibo/hutorukakeibo |
| ローカルパス | `C:\家計簿アプリ開発\petite-budget` |

### 実装済み機能

- Google OAuth ログイン（Supabase Auth）
- 支出の記録・編集・削除（カテゴリ / 金額 / 日付 / メモ）
- 支出割合に応じた5段階のキャラクター状態変化
- 統計（カテゴリ別円グラフ / 日別棒グラフ）と家計簿診断（S〜Dランク）
- 取引履歴（カテゴリ絞り込み・日付/金額ソート・タップで編集）
- 複数家計簿の作成・切り替え・色分け
- 招待コードによる家族/パートナー共有（Realtime同期）、ホストによるメンバー管理・家計簿削除
- SNS共有（Web Share API + Canvas生成画像）、閲覧専用スナップショットリンク
- カスタムカテゴリ（プレミアムプラン限定 / **課金処理自体は未実装**）
- カテゴリ別予算（全体予算とは別に任意設定。キャラクター判定は全体予算のみ参照、診断へは超過額を反映。ホーム/統計に進捗バーで可視化）
- PWA（オフラインキャッシュ・ホーム画面インストール）
- 予算管理のネスト画面（設定タブ → 「予算管理」→「家計簿全体の予算」「カテゴリ別の予算」。ルートは `/settings/budget`, `/settings/budget/overall`, `/settings/budget/categories`）
- 「記録」タブのカテゴリをドラッグで並べ替え（`@dnd-kit`。順序は `households.category_order`（jsonb配列）に保存し、家計簿メンバー間で共有される。並び順は「記録」画面だけでなく `useAllCategories` を使う全画面に反映される）
- 設定タブからユーザー自身の表示名を変更可能（`profiles.display_name` を更新。DBスキーマ変更なし、既存のRLSでカバー済み）
- 2人以上で共有する家計簿では、ホーム/取引履歴に「誰が記録したか」（👤 表示名）を表示（`expenses.created_by` は既存カラム。アプリ側で未使用だったのを `Expense.createdBy` として利用するように変更。DBスキーマ変更なし）
- 「ホーム」タブの「最近の記録」にも日付/金額ソートを追加（直近5件を対象に並び替え。ソートUIは `SortButton`（[SortButton.tsx](src/components/expenses/SortButton.tsx)）として共通化し、取引履歴ページと共用）
- 「ホーム」タブの「最近の記録」下部に「もっと見る →」リンクを設置し、統計タブの「取引履歴」（`/stats/transactions`）へ遷移できるように
- 収入の記録・統計を追加。`expenses` テーブルに `type`（`'expense' | 'income'`）カラムを追加し、支出と同じテーブルで管理。「記録」タブは支出/収入のトグルで切り替え、収入カテゴリは固定5種（給与・ボーナス・お小遣い・副業・その他、カスタム化やドラッグ並べ替えなし）。「統計」タブも支出/収入トグルでカテゴリ内訳・日別グラフ・取引履歴（`/stats/transactions?type=income`）を切り替え表示。**予算・キャラクター判定・診断は支出のみを参照し、収入の影響を受けない**（`ExpensesContext` の `expenses` は常に type=expense のみを返す設計で担保）

---

## 2. 技術スタック

```
Next.js 16.3.0 (App Router / Turbopack)
React 19.2.8 / TypeScript 5.x (strict)
Tailwind CSS v4
Serwist 9.5.12         … PWA (next-pwa の後継)
Supabase               … Auth + PostgreSQL + Realtime
Recharts 3.10.1        … グラフ
@dnd-kit                … カテゴリのドラッグ並べ替え（core / sortable / utilities）
Vercel                 … ホスティング（GitHub連携で自動デプロイ）
```

### なぜこの構成か（意思決定の記録）

| 選択 | 理由 |
|---|---|
| **Supabase**（Firebaseではなく） | 「共有家計簿」がリレーショナルに素直に表現でき、RLSで権限をDB側に寄せられる。集計もSQLで完結 |
| **Serwist**（next-pwa ではなく） | `next-pwa` / `@ducanh2912/next-pwa` はどちらも webpack プラグインで、**Next.js 16 の Turbopack と非互換**（実地で確認済み。詳細は §4.1） |
| **household 単位のプラン管理** | ホストが課金すれば共有メンバー全員がプレミアム機能を使える設計 |

---

## 3. 環境構築

### 3.1 必要なもの

- **Node.js 24.x**（`winget install OpenJS.NodeJS.LTS` で導入済み。実行パス: `C:\Program Files\nodejs\`）
- Git（設定はリポジトリローカルに設定済み: `hutoru-kakeibo` / `hutoru.kakeibo@gmail.com`）

> ⚠️ **Claude Code のシェルは Node の PATH を引き継がないことがある。** その場合は各コマンドの先頭に以下を付ける:
> ```powershell
> $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
> ```

### 3.2 環境変数

`petite-budget/.env.local`（gitignore済み・**コミット禁止**）:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cwxiurfqflcxypzldnjh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（Supabaseダッシュボード → Project Settings → API Keys の anon public）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Vercel 側にも同じ2つ（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）が設定済み。

### 3.3 コマンド

```bash
npm run dev     # 開発サーバー（Service Worker は無効）
npm run build   # next build && serwist build serwist.config.mjs
npm run start   # 本番ビルドの起動（PWA検証はこちらで）
npm run lint    # ESLint
npx tsc --noEmit  # 型チェック単体
```

**PWA / Service Worker の検証は必ず `npm run build && npm run start` で行うこと。** `dev` では SW が登録されない。

---

## 4. ハマりどころと技術的知見 ⚠️ 最重要

過去に実際に踏んだ地雷とその解決策。**同じ問題に再度時間を使わないこと。**

### 4.1 Turbopack と webpack ベースの PWA プラグインは非互換

Next.js 16 は Turbopack がデフォルト。`@serwist/next` の webpack プラグインモードを使うとビルドが落ちる:

```
⨯ ERROR: This build is using Turbopack, with a `webpack` config and no `turbopack` config.
```

**解決策**: Serwist の **configurator モード**を採用。Service Worker のビルドを Next のビルドパイプラインから切り離し、`next build` の後に `serwist build` を独立実行する。

- 設定: [serwist.config.mjs](serwist.config.mjs)（`export default await serwist({...})` の**トップレベル await が必須**。CLI は default export を await しない）
- SW本体: [src/app/sw.ts](src/app/sw.ts)
- `next.config.ts` には `turbopack: {}` を明示（webpack設定なしの警告抑制）
- CLI は `serwist.config.js` を探すため、**ファイル名を明示的に渡す**（`serwist build serwist.config.mjs`）
- `esbuild` が別途必要（devDependency に追加済み）
- 生成物 `public/sw.js` は gitignore + ESLint ignore 済み

### 4.2 RLS の無限再帰（`infinite recursion detected in policy`）

`household_members` の SELECT ポリシーの中で `household_members` を再帰的に問い合わせると、PostgreSQL がエラーを返す。
**症状が厄介**: DBにデータは正しく存在するのに、クライアントからの読み取りだけが静かに失敗する。

**解決策**: `SECURITY DEFINER` 関数で RLS を迂回してメンバーシップを判定する（Supabase 公式推奨パターン）。

```sql
create or replace function public.is_household_member(target_household_id uuid)
returns boolean language sql security definer set search_path = public stable
as $$ select exists (select 1 from household_members
     where household_id = target_household_id and user_id = auth.uid()); $$;
```

以降すべてのポリシーはこの関数（と `shares_household_with`）を経由している。**新しいテーブルにRLSを足すときも必ずこのパターンを使うこと。**

### 4.3 Supabase のエラーを握りつぶさない

上記4.2の発見が遅れた原因は、クライアント側で `const { data } = await supabase...` と書き、`error` を見ていなかったこと。
**必ず `error` を受け取り `console.error` で出す。** 既存コードはすべて対応済み。

### 4.4 `react-hooks/set-state-in-effect`（ESLint v9 / eslint-plugin-react-hooks v6）

`useEffect` の本体から**同期的に** `setState` を呼ぶとエラーになる。

**解決策は2通り、状況で使い分け**:
- 外部ストア同期 → `useSyncExternalStore`（localStorage時代に使用。現在は削除済み）
- 非同期データ取得 → effect 内で定義した async 関数の**先頭に `await Promise.resolve()` を挟む**（現行の各 Context で採用）

```ts
useEffect(() => {
  let cancelled = false;
  async function run() {
    await Promise.resolve();   // ← これが無いとlintエラー
    if (cancelled) return;
    setLoading(true);
    ...
  }
  run();
  return () => { cancelled = true; };
}, [deps]);
```

### 4.5 iOS の PWA で `window.confirm()` / `alert()` が動かない

ホーム画面から起動した standalone 表示の PWA では、ネイティブダイアログが無反応になることがある。
**ボタンを押しても何も起きない**という症状で現れる。

**解決策**: 確認UIはすべて**アプリ内のパネル**（`useState` で出し分け）で実装する。
参考実装: [HouseholdManageCard.tsx](src/components/household/HouseholdManageCard.tsx)（退出・削除確認）、[ExpenseForm.tsx](src/components/expenses/ExpenseForm.tsx)（カテゴリ削除確認）

### 4.6 Service Worker のキャッシュで変更が反映されない

「実装したのに画面が変わらない」の大半はこれ。デバッグ時は以下をブラウザのコンソールで実行してから再読み込みする:

```js
(async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  for (const n of await caches.keys()) await caches.delete(n);
})()
```

ユーザーに依頼する場合は「`Ctrl+Shift+R`」または「シークレットウィンドウで開く」。

### 4.7 キャラクター画像の背景透過処理

いただく画像は**背景が透過ではなく濃いグレー（≈RGB 49,49,51）で塗りつぶされている**。そのまま使うと四角い背景が出る。

**手順**（ブラウザの Canvas API で実施。追加ライブラリ不要）:

1. 画像を `file:///` で開き、Canvas に描画
2. **縁のピクセルの中央値から背景色を自動計測**（決め打ちにしない）
3. 背景色からの距離でアルファを決定（`dist <= 8` → 完全透明、`>= 26` → 完全不透明、間は線形補間）
4. **色にじみ補正（decontamination）**: 半透明ピクセルは `(色 - (1-a)×背景色) / a` で元の色を復元。これをやらないと輪郭に灰色のフリンジが残る
5. 768×768 にリサイズして `public/characters/` に保存

検証は**マゼンタ背景に重ねて拡大**し、フリンジが無いか目視する。

> `Read` ツールの画像プレビューが古いキャッシュを返すことがある（黒背景に見える等）。ファイル自体が壊れているか確認するには、Canvas API で実ピクセル値（RGBA）を直接読むこと。

### 4.8 その他

| 事象 | 対処 |
|---|---|
| 日本語パスで `create-next-app` が失敗 | npmパッケージ名の検証に通らない。**ASCII名のサブディレクトリ**（`petite-budget`）を作って生成した |
| Next.js 16 で `middleware.ts` が非推奨 | `npx @next/codemod@canary middleware-to-proxy .` で **`src/proxy.ts`（export `proxy`）** にリネーム済み |
| Recharts の `Tooltip formatter` 型エラー | `(value: number) =>` ではなく `(value) => formatYen(Number(value))` と書く |
| `database.types.ts` の `Update: Record<string, never>` | 更新を実装した時に**必ず対応するフィールドを追加する**。忘れると `Type 'number' is not assignable to type 'never'` |
| PowerShell でのクォート地獄 | 複雑な JS/Node ワンライナーは**スクリプトファイルに書いて実行**する |
| Vercel の環境変数入力 | Key欄に変数名、Value欄に値。逆に入れると `invalid characters` エラー |

---

## 5. アーキテクチャ

### 5.1 ディレクトリ構成

```
src/
├── app/
│   ├── (main)/              … ボトムナビ付きの認証必須エリア
│   │   ├── page.tsx         … ホーム（キャラクター・予算・最近の記録）
│   │   ├── input/           … 支出の記録／編集（?id=xxx で編集モード）
│   │   ├── stats/           … 統計・診断
│   │   │   └── transactions/… 取引履歴（絞り込み・ソート）
│   │   └── settings/        … 設定・家計簿管理・カテゴリ管理
│   ├── login/               … ログイン（認証不要）
│   ├── share/[data]/        … 公開スナップショット（認証不要・動的ルート）
│   ├── auth/callback/       … OAuth コールバック（PKCE のコード交換）
│   ├── manifest.ts          … PWA マニフェスト（型安全）
│   └── sw.ts                … Service Worker のソース
├── contexts/                … AuthContext → HouseholdContext → CustomCategoriesContext → ExpensesContext（この順に依存）
├── components/              … 機能別（auth / billing / character / expenses / household / nav / share / stats / pwa / providers）
├── hooks/useAllCategories   … 固定カテゴリ + カスタムカテゴリの統合・解決
├── lib/
│   ├── character/           … logic.ts（5段階判定）, diagnosis.ts（S〜Dランク診断）
│   ├── expenses/            … categories, types, utils（集計）
│   ├── household/colors.ts  … 家計簿の6色パレット
│   ├── share/               … encode（Base64URL）, renderShareImage（Canvas）, shareCharacterStatus（Web Share API）
│   └── supabase/            … client / server / env / database.types
└── proxy.ts                 … 旧 middleware。Supabase セッションの自動更新
```

### 5.2 Context の依存順序

`AppProviders` でこの順にネストしている（**順序を変えると壊れる**）:

```
AuthProvider            … Supabase の認証状態
 └ HouseholdProvider    … 所属household一覧 + 表示中household（user に依存）
    └ CustomCategoriesProvider  … activeHousehold のカスタムカテゴリ
       └ ExpensesProvider       … activeHousehold の支出（Realtime購読）
```

### 5.3 キャラクターのロジック

[src/lib/character/logic.ts](src/lib/character/logic.ts) — 支出/予算の比率で5段階:

| 比率 | 段階 | 画像 |
|---|---|---|
| < 0.5 | スリム | `slim.png` |
| < 0.8 | 順調 | 🙂（**画像未提供**） |
| < 1.0 | ややふっくら | 😐（**画像未提供**） |
| < 1.3 | ぽっちゃり | `round.png` |
| ≥ 1.3 | まるまる | `overweight.png` |

しきい値は「100%到達前に気づけるよう 80% で警告する」という意図。
画像は [CharacterAvatar.tsx](src/components/character/CharacterAvatar.tsx) の `ILLUSTRATED_STAGES` に登録し、**未登録の段階は絵文字に自動フォールバック**する。新しい画像が届いたら §4.7 の手順で透過処理し、この対応表に1行足すだけでよい。

---

## 6. データベース

### 6.1 テーブル

| テーブル | 役割 |
|---|---|
| `profiles` | ユーザープロフィール + `active_household_id`（表示中の家計簿） |
| `households` | 家計簿。`name` / `color` / `monthly_budget` / `invite_code` / `owner_id`（ホスト） / `plan`(`free`\|`premium`) / `category_order`（カテゴリ表示順のjsonb配列） |
| `household_members` | 所属関係（多対多）。**1人が複数の家計簿に所属できる** |
| `expenses` | 支出・収入の両方を格納（`type`: `'expense' \| 'income'`）。`category_id` は type ごとに別名前空間（支出=固定カテゴリの文字列ID/カスタムカテゴリのUUID、収入=`src/lib/expenses/incomeCategories.ts` の固定ID）。**CHECK制約なし** |
| `custom_categories` | カスタムカテゴリ。作成は premium プランのみ（RLSで強制） |
| `category_budgets` | カテゴリごとの任意予算。`(household_id, category_id)` でunique。**キャラクター判定には使わない**（診断の追加インサイトのみ） |

### 6.2 SQL 関数（すべて `SECURITY DEFINER`）

| 関数 | 用途 |
|---|---|
| `handle_new_user()` | 新規登録トリガー。プロフィール + 個人用household + メンバー登録を自動作成 |
| `is_household_member(uuid)` / `shares_household_with(uuid)` | RLS再帰回避用のヘルパー（§4.2） |
| `create_household(name, color)` | 家計簿作成（自分がホスト） |
| `join_household_by_invite_code(code)` | 招待コードで参加 |
| `set_active_household(uuid)` | 表示中の家計簿を切り替え |
| `remove_household_member(uuid, uuid)` | ホストによるメンバー削除 |
| `leave_household(uuid)` | 非ホストの退出（ホストは不可） |
| `delete_household(uuid)` | ホストによる削除（最後の1つは不可） |

### 6.3 SQL ファイルの運用

**Supabase CLI は未導入**。SQL は Supabase ダッシュボードの SQL Editor に手で貼って実行している。

- [supabase/schema.sql](supabase/schema.sql) … **常に最新の完全な状態**。新規環境を1から作るならこれ1本
- `supabase/add-*.sql` / `fix-*.sql` … 既存環境への差分パッチ（適用済み。履歴として保持）

> **スキーマを変更したら、必ず差分パッチと `schema.sql` の両方を更新すること。**
> あわせて [src/lib/supabase/database.types.ts](src/lib/supabase/database.types.ts)（手書きの型定義）も更新する。

### 6.4 プランの切り替え（課金未実装のため手動）

```sql
-- household の一覧とIDを確認
select id, name, plan from households;

-- プレミアムに昇格
update households set plan = 'premium' where id = '対象のID';
```

---

## 7. 外部サービスと設定

| サービス | URL | 用途・メモ |
|---|---|---|
| **Supabase** | https://supabase.com/dashboard | プロジェクト ref: `cwxiurfqflcxypzldnjh` / アカウント: `hutoru.kakeibo@gmail.com` |
| **Vercel** | https://vercel.com | GitHub連携。`main` への push で自動デプロイ |
| **GitHub** | https://github.com/hutoru-kakeibo/hutorukakeibo | |
| **Google Cloud Console** | https://console.cloud.google.com | OAuth クライアント（アプリ名「太る家計簿」） |

### 認証まわりの設定箇所（変更時は3箇所すべて確認）

1. **Google Cloud Console** → 承認済みリダイレクトURI: `https://cwxiurfqflcxypzldnjh.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → Google（Client ID / Secret）
3. **Supabase** → Authentication → URL Configuration → Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://hutorukakeibo.vercel.app/auth/callback`

> 新しいドメインを追加する場合は 3 に追記が必要。忘れるとログインが失敗する。

---

## 8. 更新・デプロイ手順

```bash
# 1. 変更を加える
# 2. 検証（この3つは必ず通してから push）
npm run lint
npm run build
npm run start   # ブラウザで実機確認

# 3. コミット & プッシュ（= 本番デプロイ）
git add -A
git commit -m "変更内容"
git push origin main
```

`main` に push すると Vercel が自動でビルド・デプロイする。反映確認は:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://hutorukakeibo.vercel.app/
```

**DBスキーマの変更を伴う場合は、push の前に Supabase SQL Editor でパッチを適用しておくこと**（本番アプリが先に新カラムを参照すると壊れる）。

---

## 9. 開発の経緯（要約）

| 段階 | 内容 |
|---|---|
| Step 1 | 環境構築。Node導入、Next.js 16 生成、Tailwind v4、**PWAをSerwist configuratorモードで確立**（§4.1） |
| Step 2 | ボトムナビ・ルーティング・モック認証・支出入力・キャラクターロジック。当初は localStorage |
| Step 3 | Recharts によるグラフ、診断ロジック、Web Share API + Canvas画像、公開スナップショットリンク |
| Step 4 | iPhone 3サイズでのレスポンシブ検証、タップ領域、セーフエリア、PWAインストール要件確認 |
| Supabase接続 | Google OAuth 本実装、localStorage → DB移行。**RLS無限再帰バグを発見・修正**（§4.2） |
| 機能追加 | 複数家計簿 → 取引履歴/ソート/再編集 → サブスク前段階（カスタムカテゴリ）→ 家計簿削除 → カテゴリ別予算 → ホーム/統計への予算進捗の可視化 |
| デプロイ | GitHub + Vercel 連携、アプリ名変更、OGP設定 |
| デザイン調整 | 診断バッジを「ランク文字」→「AI」表記に変更、ホーム画面アイコン（icon-192/512, apple-touch-icon）を `og-image.png` ベースのround.pngキャラクター意匠に統一、設定タブの予算関連UIを「予算管理」ネスト画面へ再編（`/settings/budget` 配下） |
| 機能追加 | 「記録」タブのカテゴリをドラッグ&ドロップで並べ替え可能に（`@dnd-kit` 導入、`households.category_order` に永続化） |
| 機能追加 | 表示名のユーザー自身での変更、2人以上の共有家計簿での記録者表示（ホーム/取引履歴） |
| 機能追加 | 「ホーム」タブ「最近の記録」への日付/金額ソート追加 |
| UI追加 | 「ホーム」タブ「最近の記録」に「もっと見る」リンクを追加し、取引履歴へ導線を設置 |
| 機能追加 | 収入の記録・統計に対応（`expenses.type` 追加、「記録」「統計」タブに支出/収入トグルを追加。予算・キャラクター判定は支出のみ参照） |

---

## 10. 残タスク

### 優先度: 高
- [ ] **キャラクター画像2種**（「順調」`fit` / 「ややふっくら」`chubby`）。届いたら §4.7 の手順で透過 → `ILLUSTRATED_STAGES` に登録
- [ ] **課金処理の本実装**。決済プロバイダ（Stripe等）を選定し、Webhook で `households.plan` を更新する。UI側の枠（[PaywallNotice.tsx](src/components/billing/PaywallNotice.tsx)）は用意済みで、現状は「準備中」の alert のみ

### 優先度: 中
- [ ] 月をまたいだ過去データの閲覧（現状は当月のみ）
- [ ] カスタムカテゴリの編集（現状は作成と削除のみ）
- [ ] 独自ドメインの設定

### 技術的負債
- [ ] `database.types.ts` が手書き。Supabase CLI を導入して `supabase gen types typescript` に置き換えたい
- [ ] 自動テストが皆無。すべて手動＋ブラウザ検証
- [ ] `PaywallNotice` の `alert()` は §4.5 の理由で iOS PWA では動かない可能性が高い（課金実装時にアプリ内UIへ置き換えること）

---

## 11. 作業上の注意

- **ユーザーは非エンジニア寄り。** Supabase/Vercel のダッシュボード操作は画面の場所から具体的に案内する。「トグルスイッチ」等の用語も通じないことがあるため、見た目で説明する
- **検証は実機ブラウザで行う。** ビルドが通っただけで「完了」と報告しない。DOM/ネットワーク/コンソールを実際に確認する
- **`.env.local` は絶対にコミットしない**（gitignore済みだが、新規ファイル追加時は `git status` で確認）
- **秘密情報をチャットに貼らせない。** 値はユーザー自身がダッシュボードに直接入力してもらう

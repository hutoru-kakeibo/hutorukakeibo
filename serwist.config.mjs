// Serwist の "configurator モード" 設定。
// @serwist/next の webpack プラグインは Next.js 16 の Turbopack と非互換なため、
// `next build` の後に `serwist build` を実行して public/sw.js を生成する。
import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

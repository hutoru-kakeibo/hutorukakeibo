import Stripe from "stripe";

/**
 * サーバー専用の Stripe クライアント。
 * ここで読む環境変数には NEXT_PUBLIC_ を付けていないため、クライアントバンドルには載らない。
 * このモジュールは Route Handler からのみ import すること。
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY が未設定です。Vercel/.env.local に設定してください。");
  }
  return new Stripe(secretKey);
}

export function getStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID が未設定です。Vercel/.env.local に設定してください。");
  }
  return priceId;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET が未設定です。Vercel/.env.local に設定してください。");
  }
  return secret;
}

/** 決済完了後などの戻り先に使う、このアプリの公開URL */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel では自動で入る（プレビュー環境でも正しいURLになる）
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

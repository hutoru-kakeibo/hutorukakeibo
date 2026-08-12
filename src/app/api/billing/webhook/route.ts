import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe の署名検証には生のリクエストボディが必要なため、必ず動的実行にする
export const dynamic = "force-dynamic";

/** このステータスの間はプレミアム機能を使えるものとして扱う */
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function toIsoOrNull(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;
}

/**
 * サブスクの状態を households に反映する。
 * household_id は Checkout 作成時に subscription.metadata へ入れている。
 */
async function syncSubscription(subscription: Stripe.Subscription) {
  const householdId = subscription.metadata?.household_id;
  if (!householdId) {
    console.error("[billing] subscription に household_id がありません", subscription.id);
    return;
  }

  const status = subscription.status;
  // 期間終了日は items 側に入る（API バージョンによりトップレベルに無いことがある）
  const periodEnd = subscription.items.data[0]?.current_period_end;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("households")
    .update({
      plan: ACTIVE_STATUSES.has(status) ? "premium" : "free",
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      current_period_end: toIsoOrNull(periodEnd),
    })
    .eq("id", householdId);

  if (error) {
    console.error("[billing] households の更新に失敗しました", error);
    throw error;
  }
}

// 一時的な診断用。Vercel側のSTRIPE_WEBHOOK_SECRETが意図した値になっているか
// 末尾6文字だけを比較するために追加。原因特定後に削除すること。
export function GET() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  return NextResponse.json({
    webhookSecretTail: secret.slice(-6),
    webhookSecretLength: secret.length,
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ message: "署名がありません" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    // 署名検証の失敗は「正規の Stripe からのリクエストではない」ことを意味する
    console.error("[billing] Webhook の署名検証に失敗しました", error);
    // 一時的な診断用: 原因特定のためエラーメッセージを返す。特定後に削除すること。
    return NextResponse.json(
      { message: "署名が不正です", debug: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // Checkout 経由では subscription 側の metadata が空なことがあるため補完する
        if (!subscription.metadata?.household_id) {
          const householdId = session.metadata?.household_id ?? session.client_reference_id;
          if (householdId) {
            subscription.metadata = { ...subscription.metadata, household_id: householdId };
            await stripe.subscriptions.update(subscriptionId, {
              metadata: { household_id: householdId },
            });
          }
        }
        await syncSubscription(subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }

      default:
        // 購読していないイベントは無視してよい（Stripe には 200 を返す）
        break;
    }
  } catch (error) {
    // 500 を返すと Stripe が自動リトライしてくれる
    console.error(`[billing] Webhook (${event.type}) の処理に失敗しました`, error);
    return NextResponse.json({ message: "処理に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

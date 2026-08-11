import { NextResponse } from "next/server";
import { getSiteUrl, getStripe, getStripePriceId } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

/**
 * プレミアムプランの Stripe Checkout セッションを作成する。
 * 課金単位は household（家計簿）で、ホストのみが購入できる。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ message: "ログインが必要です" }, { status: 401 });
  }

  let householdId: string;
  try {
    const body = (await request.json()) as { householdId?: unknown };
    if (typeof body.householdId !== "string" || !body.householdId) {
      return NextResponse.json({ message: "householdId が不正です" }, { status: 400 });
    }
    householdId = body.householdId;
  } catch {
    return NextResponse.json({ message: "リクエストの形式が不正です" }, { status: 400 });
  }

  // RLS 越しに読めること自体がメンバーである証明になるが、購入はホストのみに限定する
  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, name, owner_id, plan, stripe_customer_id")
    .eq("id", householdId)
    .maybeSingle();

  if (householdError) {
    console.error("[billing] household の取得に失敗しました", householdError);
    return NextResponse.json({ message: "家計簿の取得に失敗しました" }, { status: 500 });
  }
  if (!household) {
    return NextResponse.json({ message: "家計簿が見つかりません" }, { status: 404 });
  }
  if (household.owner_id !== userData.user.id) {
    return NextResponse.json(
      { message: "プレミアムへのアップグレードは家計簿のホストのみ行えます" },
      { status: 403 },
    );
  }
  if (household.plan === "premium") {
    return NextResponse.json({ message: "すでにプレミアムプランです" }, { status: 409 });
  }

  const stripe = getStripe();
  const siteUrl = getSiteUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      // 既存の顧客がいれば再利用し、無ければ Stripe 側で作成させる
      ...(household.stripe_customer_id
        ? { customer: household.stripe_customer_id }
        : { customer_email: userData.user.email ?? undefined }),
      // Webhook で「どの家計簿の課金か」を特定するための情報
      client_reference_id: household.id,
      metadata: { household_id: household.id },
      subscription_data: { metadata: { household_id: household.id } },
      success_url: `${siteUrl}/settings?billing=success`,
      cancel_url: `${siteUrl}/settings?billing=cancelled`,
      locale: "ja",
    });

    if (!session.url) {
      return NextResponse.json({ message: "決済ページの作成に失敗しました" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing] Checkout セッションの作成に失敗しました", error);
    return NextResponse.json({ message: "決済ページの作成に失敗しました" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSiteUrl, getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Stripe カスタマーポータルへのリンクを作成する。
 * 支払い方法の変更・解約・領収書の確認はすべて Stripe 側の画面で行う。
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

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, owner_id, stripe_customer_id")
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
      { message: "プランの管理は家計簿のホストのみ行えます" },
      { status: 403 },
    );
  }
  if (!household.stripe_customer_id) {
    return NextResponse.json({ message: "課金情報が見つかりません" }, { status: 404 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: household.stripe_customer_id,
      return_url: `${getSiteUrl()}/settings`,
      locale: "ja",
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing] カスタマーポータルの作成に失敗しました", error);
    return NextResponse.json({ message: "管理ページの作成に失敗しました" }, { status: 500 });
  }
}

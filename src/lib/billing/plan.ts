/** プレミアムプランの料金表示。Stripe 側の Price と必ず一致させること */
export const PREMIUM_PRICE_YEN = 170;

export const PREMIUM_PRICE_LABEL = `月額 ${PREMIUM_PRICE_YEN}円（税込）`;

/** Stripe のサブスク状態のうち、プレミアム機能を使える状態 */
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function isActiveSubscriptionStatus(status: string | null): boolean {
  return status !== null && ACTIVE_STATUSES.has(status);
}

/** 支払いに問題が起きている状態（ユーザーに対処を促す） */
export function isPaymentIssueStatus(status: string | null): boolean {
  return status === "past_due" || status === "unpaid" || status === "incomplete";
}

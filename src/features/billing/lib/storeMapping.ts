import { type StoreSubscription } from './entitlement';

/**
 * Store records reduced to what entitlement needs. These are structural
 * copies of the expo-iap fields we read, so the mapping stays pure and is
 * tested with plain objects; the adapter passes the real types in.
 */
export type StorePurchaseLike = {
  productId: string;
  platform?: string;
  transactionDate: number;
  isAutoRenewing: boolean;
  expirationDateIOS?: number | null;
  revocationDateIOS?: number | null;
  offerIOS?: { paymentMode: string; type: string } | null;
  renewalInfoIOS?: {
    willAutoRenew: boolean;
    gracePeriodExpirationDate?: number | null;
    isInBillingRetry?: boolean | null;
  } | null;
};

export type StoreProductLike = {
  id: string;
  displayPrice: string;
  price?: number | null;
  currency?: string | null;
  introductoryPricePaymentModeIOS?: string | null;
  introductoryPriceNumberOfPeriodsIOS?: string | null;
  introductoryPriceSubscriptionPeriodIOS?: string | null;
  subscriptionOffers?:
    | readonly { paymentMode?: string | null; period?: { unit: string; value: number } | null }[]
    | null;
};

/**
 * Play does not tell the client when a period ends. An active Play purchase
 * is trusted for a day and re-checked on the next launch or foreground.
 */
export const PLAY_RECHECK_MS = 24 * 60 * 60 * 1000;

export function toStoreSubscription(purchase: StorePurchaseLike, now: number): StoreSubscription {
  const expiresAt = purchase.expirationDateIOS ?? now + PLAY_RECHECK_MS;
  return {
    productId: purchase.productId,
    expiresAt,
    willRenew: purchase.renewalInfoIOS?.willAutoRenew ?? purchase.isAutoRenewing,
    isTrial:
      purchase.offerIOS?.paymentMode === 'free-trial' ||
      purchase.offerIOS?.paymentMode === 'freeTrial',
    gracePeriodEndsAt: purchase.renewalInfoIOS?.gracePeriodExpirationDate ?? null,
    inBillingRetry: purchase.renewalInfoIOS?.isInBillingRetry ?? false,
    revoked: purchase.revocationDateIOS != null,
  };
}

/** The newest transaction for our products wins; older ones are history. */
export function latestSubscription(
  purchases: readonly StorePurchaseLike[],
  productIds: readonly string[],
  now: number,
): StoreSubscription | null {
  const ours = purchases
    .filter((p) => productIds.includes(p.productId))
    .sort((a, b) => b.transactionDate - a.transactionDate);
  const newest = ours[0];
  return newest ? toStoreSubscription(newest, now) : null;
}

const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };

/** Free-trial length in days, from whichever fields the platform filled in. */
export function trialDays(product: StoreProductLike): number | null {
  if (product.introductoryPricePaymentModeIOS === 'free-trial') {
    const periods = Number(product.introductoryPriceNumberOfPeriodsIOS ?? '1') || 1;
    const unit = (product.introductoryPriceSubscriptionPeriodIOS ?? '').toLowerCase();
    const days = UNIT_DAYS[unit];
    if (days) return periods * days;
  }
  for (const offer of product.subscriptionOffers ?? []) {
    if (offer.paymentMode === 'free-trial' && offer.period) {
      const days = UNIT_DAYS[offer.period.unit.toLowerCase()];
      if (days) return offer.period.value * days;
    }
  }
  return null;
}

/** RevenueCat's view of the "pro" entitlement, structurally. */
export type RevenueCatEntitlementLike = {
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  productIdentifier: string;
  expirationDateMillis: number | null;
  billingIssueDetectedAtMillis: number | null;
};

/**
 * RevenueCat already decided whether the entitlement is active; we keep its
 * answer and only translate. A lifetime grant has no expiry, so it reads as
 * a period that never ends.
 */
export function fromRevenueCat(
  entitlement: RevenueCatEntitlementLike | undefined,
): StoreSubscription | null {
  if (!entitlement) return null;
  const expiresAt = entitlement.expirationDateMillis ?? Number.MAX_SAFE_INTEGER;
  return {
    productId: entitlement.productIdentifier,
    expiresAt,
    willRenew: entitlement.willRenew,
    isTrial: entitlement.periodType === 'TRIAL',
    inBillingRetry: entitlement.billingIssueDetectedAtMillis !== null,
    // While RevenueCat still reports the entitlement active during a billing
    // issue, that is the store's grace period.
    gracePeriodEndsAt:
      entitlement.isActive && entitlement.billingIssueDetectedAtMillis !== null ? expiresAt : null,
  };
}

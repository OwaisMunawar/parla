/**
 * Price comparisons for the paywall, computed from the store's own numbers
 * and formatted in the store's currency. The store's `displayPrice` is used
 * as-is wherever it exists; these only fill in what it does not say.
 */
export type PricedPlan = {
  period: 'monthly' | 'yearly';
  price: number | null;
  currency: string | null;
};

export function formatMoney(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** "$5.00" for a $59.99 yearly plan; null when the store gave no number. */
export function monthlyEquivalent(plan: PricedPlan, locale?: string): string | null {
  if (plan.period !== 'yearly' || plan.price === null || !plan.currency) return null;
  return formatMoney(Math.floor((plan.price / 12) * 100) / 100, plan.currency, locale);
}

/** Whole-percent saving of yearly over twelve monthly payments, if positive. */
export function yearlySaving(
  yearly: PricedPlan | undefined,
  monthly: PricedPlan | undefined,
): number | null {
  if (!yearly?.price || !monthly?.price || yearly.currency !== monthly.currency) return null;
  const saving = 1 - yearly.price / (monthly.price * 12);
  return saving > 0 ? Math.floor(saving * 100) : null;
}

import { AppError } from '@/core/errors/AppError';

import { type StoreSubscription } from '../lib/entitlement';
import { PRODUCTS, type Billing, type Plan, type PurchaseResult } from './Billing';

const DAY = 86_400_000;

export const fakePlans: Plan[] = [
  {
    productId: PRODUCTS.yearly,
    period: 'yearly',
    displayPrice: '$59.99',
    price: 59.99,
    currency: 'USD',
    trialDays: 7,
  },
  {
    productId: PRODUCTS.monthly,
    period: 'monthly',
    displayPrice: '$9.99',
    price: 9.99,
    currency: 'USD',
    trialDays: null,
  },
];

export type FakeBilling = Billing & {
  /** What the next purchase does. */
  nextOutcome: 'purchase' | 'cancel' | 'pending' | 'fail';
  /** The store's view, as restore/current would report it. */
  subscription: StoreSubscription | null;
  /** Simulates a renewal, refund or a purchase made on another device. */
  emit(subscription: StoreSubscription | null): void;
  manageOpened: number;
};

/** In-memory store for component tests, with outcomes chosen per test. */
export function createFakeBilling(
  now: () => number = Date.now,
  plans: Plan[] = fakePlans,
): FakeBilling {
  const listeners = new Set<(sub: StoreSubscription | null) => void>();
  const fake: FakeBilling = {
    provider: 'fake',
    nextOutcome: 'purchase',
    subscription: null,
    manageOpened: 0,
    connect: async () => {},
    plans: async () => plans,
    async purchase(productId): Promise<PurchaseResult> {
      const plan = plans.find((p) => p.productId === productId);
      if (!plan) throw new AppError('BILLING_PRODUCT_NOT_FOUND', productId);
      switch (fake.nextOutcome) {
        case 'cancel':
          return { status: 'cancelled' };
        case 'pending':
          return { status: 'pending' };
        case 'fail':
          throw new AppError('BILLING_FAILED', 'The store declined the purchase.');
        case 'purchase': {
          const trial = plan.trialDays !== null;
          const length = trial
            ? plan.trialDays! * DAY
            : plan.period === 'yearly'
              ? 365 * DAY
              : 30 * DAY;
          fake.subscription = {
            productId,
            expiresAt: now() + length,
            willRenew: true,
            isTrial: trial,
          };
          return { status: 'purchased', subscription: fake.subscription };
        }
      }
    },
    restore: async () => fake.subscription,
    current: async () => fake.subscription,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(subscription) {
      fake.subscription = subscription;
      listeners.forEach((l) => l(subscription));
    },
    async manageSubscriptions() {
      fake.manageOpened++;
    },
    disconnect() {
      listeners.clear();
    },
  };
  return fake;
}

import { type StoreSubscription } from '../lib/entitlement';

export const PRODUCTS = {
  monthly: 'com.owaismunawar.parla.pro.monthly',
  yearly: 'com.owaismunawar.parla.pro.yearly',
} as const;

export const PRODUCT_IDS: readonly string[] = [PRODUCTS.yearly, PRODUCTS.monthly];

export type PlanPeriod = 'monthly' | 'yearly';

export type Plan = {
  productId: string;
  period: PlanPeriod;
  /** Localised by the store, e.g. "$59.99" or "59,99 €". Never formatted by us. */
  displayPrice: string;
  price: number | null;
  currency: string | null;
  /** Introductory free trial length, when the learner is eligible. */
  trialDays: number | null;
};

export type PurchaseResult =
  | { status: 'purchased'; subscription: StoreSubscription }
  | { status: 'cancelled' }
  /** Ask to Buy, SCA or a slow card: the store will report back later. */
  | { status: 'pending' };

export type BillingProvider = 'storekit' | 'play' | 'revenuecat' | 'fake';

/**
 * The store, seen from the app. expo-iap (StoreKit 2 / Play Billing) is the
 * default; RevenueCat is an adapter behind the same interface; tests use the
 * fake. Entitlement rules never live here, only store I/O: see
 * lib/entitlement.ts and engine/entitlementService.ts.
 */
export interface Billing {
  readonly provider: BillingProvider;
  connect(): Promise<void>;
  plans(): Promise<Plan[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  /** Re-syncs with the store account and returns the current subscription. */
  restore(): Promise<StoreSubscription | null>;
  current(): Promise<StoreSubscription | null>;
  /** Renewals, refunds and purchases finished outside the app. */
  onChange(listener: (subscription: StoreSubscription | null) => void): () => void;
  manageSubscriptions(): Promise<void>;
  disconnect(): void;
}

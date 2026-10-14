import type Purchases from 'react-native-purchases';
import {
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';

import { AppError, toAppError } from '@/core/errors/AppError';

import { type StoreSubscription } from '../lib/entitlement';
import { fromRevenueCat } from '../lib/storeMapping';
import { PRODUCTS, type Billing, type Plan } from './Billing';

export const PRO_ENTITLEMENT = 'pro';

type PurchasesModule = typeof Purchases;

/**
 * RevenueCat behind the same Billing interface, for teams that want receipt
 * validation, webhooks and cross-platform entitlements without running a
 * server. The SDK is passed in rather than imported: it is an optional
 * native dependency (see README, Monetisation), and the default build does
 * not link it.
 */
export function createRevenueCatBilling(options: {
  purchases: PurchasesModule;
  apiKey: string;
}): Billing {
  const { purchases } = options;
  const packages = new Map<string, PurchasesPackage>();
  let configured = false;

  const toSubscription = (info: CustomerInfo): StoreSubscription | null =>
    fromRevenueCat(info.entitlements.active[PRO_ENTITLEMENT]);

  const connect = async () => {
    if (configured) return;
    if (!options.apiKey) {
      throw new AppError('BILLING_UNAVAILABLE', 'RevenueCat is selected but no API key is set.');
    }
    purchases.configure({ apiKey: options.apiKey });
    configured = true;
  };

  return {
    provider: 'revenuecat',
    connect,

    async plans() {
      await connect();
      const offerings = await purchases.getOfferings();
      const available = offerings.current?.availablePackages ?? [];
      packages.clear();
      return available.map((pkg): Plan => {
        packages.set(pkg.product.identifier, pkg);
        const intro = pkg.product.introPrice;
        return {
          productId: pkg.product.identifier,
          period: pkg.product.identifier === PRODUCTS.yearly ? 'yearly' : 'monthly',
          displayPrice: pkg.product.priceString,
          price: pkg.product.price,
          currency: pkg.product.currencyCode,
          trialDays:
            intro && intro.price === 0
              ? intro.periodNumberOfUnits *
                (intro.periodUnit === 'WEEK' ? 7 : intro.periodUnit === 'MONTH' ? 30 : 1)
              : null,
        };
      });
    },

    async purchase(productId) {
      await connect();
      const pkg = packages.get(productId);
      if (!pkg)
        throw new AppError(
          'BILLING_PRODUCT_NOT_FOUND',
          `${productId} is not in the current offering`,
        );
      try {
        const { customerInfo } = await purchases.purchasePackage(pkg);
        const subscription = toSubscription(customerInfo);
        if (!subscription)
          throw new AppError('BILLING_FAILED', 'Purchase finished without the Pro entitlement.');
        return { status: 'purchased', subscription };
      } catch (error) {
        if ((error as Partial<PurchasesError>).userCancelled) return { status: 'cancelled' };
        throw toAppError(error, 'BILLING_FAILED');
      }
    },

    async restore() {
      await connect();
      return toSubscription(await purchases.restorePurchases());
    },

    async current() {
      await connect();
      return toSubscription(await purchases.getCustomerInfo());
    },

    onChange(listener) {
      const handler = (info: CustomerInfo) => listener(toSubscription(info));
      purchases.addCustomerInfoUpdateListener(handler);
      return () => {
        purchases.removeCustomerInfoUpdateListener(handler);
      };
    },

    manageSubscriptions: () => purchases.showManageSubscriptions(),

    disconnect() {},
  };
}

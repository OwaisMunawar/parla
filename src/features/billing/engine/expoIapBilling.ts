import {
  deepLinkToSubscriptions,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';

import { AppError, toAppError } from '@/core/errors/AppError';

import { type StoreSubscription } from '../lib/entitlement';
import { latestSubscription, toStoreSubscription, trialDays } from '../lib/storeMapping';
import { PRODUCT_IDS, PRODUCTS, type Billing, type Plan, type PurchaseResult } from './Billing';

const ANDROID_PACKAGE = 'com.owaismunawar.parla';

/**
 * StoreKit 2 and Play Billing through expo-iap.
 *
 * There is no receipt server in this repo: StoreKit 2 transactions arrive
 * JWS-verified on device and expo-iap only surfaces verified ones, which is
 * an honest baseline for a client-only app. The seam for server-side checks
 * (App Store Server API, Play Developer API) is `finish` below; see
 * docs/ARCHITECTURE.md, ADR-005.
 */
export function createExpoIapBilling(now: () => number = Date.now): Billing {
  const listeners = new Set<(sub: StoreSubscription | null) => void>();
  let pending: {
    productId: string;
    resolve: (result: PurchaseResult) => void;
    reject: (error: AppError) => void;
  } | null = null;
  const subscriptions: { remove(): void }[] = [];
  let connected: Promise<void> | null = null;

  const finish = async (purchase: Purchase) => {
    await finishTransaction({ purchase, isConsumable: false });
    return toStoreSubscription(purchase, now());
  };

  const connect = () => {
    connected ??= (async () => {
      try {
        await initConnection();
      } catch (error) {
        connected = null;
        throw toAppError(
          error,
          'BILLING_UNAVAILABLE',
          'The store is not available on this device.',
        );
      }
      subscriptions.push(
        purchaseUpdatedListener((purchase) => {
          if (!PRODUCT_IDS.includes(purchase.productId)) return;
          if (purchase.purchaseState === 'pending') {
            if (pending?.productId === purchase.productId) pending.resolve({ status: 'pending' });
            pending = null;
            return;
          }
          void finish(purchase).then(
            (subscription) => {
              if (pending?.productId === purchase.productId) {
                pending.resolve({ status: 'purchased', subscription });
                pending = null;
              }
              listeners.forEach((listener) => listener(subscription));
            },
            (error: unknown) => {
              pending?.reject(toAppError(error, 'BILLING_FAILED'));
              pending = null;
            },
          );
        }),
        purchaseErrorListener((error) => {
          if (!pending) return;
          if (isUserCancelledError(error)) pending.resolve({ status: 'cancelled' });
          else pending.reject(toAppError(error, 'BILLING_FAILED'));
          pending = null;
        }),
      );
    })();
    return connected;
  };

  const current = async () => {
    await connect();
    const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
    return latestSubscription(purchases, PRODUCT_IDS, now());
  };

  return {
    provider: Platform.OS === 'ios' ? 'storekit' : 'play',
    connect,

    async plans() {
      await connect();
      const products = ((await fetchProducts({ skus: [...PRODUCT_IDS], type: 'subs' })) ??
        []) as ProductSubscription[];
      return products
        .map((product): Plan => ({
          productId: product.id,
          period: product.id === PRODUCTS.yearly ? 'yearly' : 'monthly',
          displayPrice: product.displayPrice,
          price: product.price ?? null,
          currency: product.currency ?? null,
          trialDays: trialDays(product),
        }))
        .sort((a) => (a.period === 'yearly' ? -1 : 1));
    },

    async purchase(productId) {
      await connect();
      if (pending) throw new AppError('BILLING_PENDING', 'A purchase is already in progress.');
      const result = new Promise<PurchaseResult>((resolve, reject) => {
        pending = { productId, resolve, reject };
      });
      try {
        let offerToken: string | undefined;
        if (Platform.OS === 'android') {
          // Play needs the offer token of the base plan or trial offer.
          const [product] = ((await fetchProducts({ skus: [productId], type: 'subs' })) ??
            []) as ProductSubscription[];
          if (!product) throw new AppError('BILLING_PRODUCT_NOT_FOUND', `${productId} not found`);
          offerToken = product.subscriptionOffers?.[0]?.offerTokenAndroid ?? undefined;
        }
        await requestPurchase({
          type: 'subs',
          request: {
            apple: { sku: productId },
            google: {
              skus: [productId],
              subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : undefined,
            },
          },
        });
      } catch (error) {
        pending = null;
        if (isUserCancelledError(error)) return { status: 'cancelled' };
        throw toAppError(error, 'BILLING_FAILED');
      }
      return result;
    },

    async restore() {
      await connect();
      await restorePurchases();
      return current();
    },

    current,

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async manageSubscriptions() {
      await deepLinkToSubscriptions({
        skuAndroid: PRODUCTS.yearly,
        packageNameAndroid: ANDROID_PACKAGE,
      });
    },

    disconnect() {
      subscriptions.splice(0).forEach((s) => s.remove());
      connected = null;
      void endConnection().catch(() => undefined);
    },
  };
}

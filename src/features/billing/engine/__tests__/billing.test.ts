import type Purchases from 'react-native-purchases';

import { createTestServices } from '@/test-utils/testServices';

import { monthlyEquivalent, yearlySaving } from '../../lib/planMath';
import {
  fromRevenueCat,
  latestSubscription,
  PLAY_RECHECK_MS,
  toStoreSubscription,
  trialDays,
  type StorePurchaseLike,
} from '../../lib/storeMapping';
import { PRODUCTS } from '../Billing';
import { createFakeBilling } from '../fakeBilling';
import { createRevenueCatBilling, PRO_ENTITLEMENT } from '../revenueCatBilling';

const now = Date.parse('2026-10-14T10:00:00Z');
const DAY = 86_400_000;

describe('entitlement service', () => {
  it('purchases a trial, caches it and survives a restart', async () => {
    const services = await createTestServices();
    await services.entitlement.refresh();
    expect(services.entitlement.state.get().status).toBe('none');

    const plans = await services.entitlement.plans();
    expect(plans[0]).toMatchObject({ period: 'yearly', trialDays: 7 });
    const result = await services.entitlement.purchase(PRODUCTS.yearly);
    expect(result.status).toBe('purchased');
    expect(services.entitlement.state.get().status).toBe('trial');
    expect(services.entitlement.hasPro()).toBe(true);
  });

  it('follows store changes, restores and opens subscription management', async () => {
    const services = await createTestServices();
    await services.entitlement.refresh();
    services.billing.emit({
      productId: PRODUCTS.monthly,
      expiresAt: now + 30 * DAY,
      willRenew: true,
      isTrial: false,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(services.entitlement.state.get().status).toBe('active');

    services.billing.subscription = null;
    expect((await services.entitlement.restore()).status).toBe('expired');
    await services.entitlement.manage();
    expect(services.billing.manageOpened).toBe(1);
    services.entitlement.dispose();
  });

  it('keeps the cached state when the store is unreachable', async () => {
    const services = await createTestServices();
    await services.entitlement.purchase(PRODUCTS.yearly);
    services.billing.current = async () => {
      throw new Error('offline');
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await services.entitlement.refresh();
    expect(services.entitlement.state.get().status).toBe('trial');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reports cancelled, pending and failed purchases without granting Pro', async () => {
    const services = await createTestServices();
    services.billing.nextOutcome = 'cancel';
    expect((await services.entitlement.purchase(PRODUCTS.yearly)).status).toBe('cancelled');
    services.billing.nextOutcome = 'pending';
    expect((await services.entitlement.purchase(PRODUCTS.monthly)).status).toBe('pending');
    services.billing.nextOutcome = 'fail';
    await expect(services.entitlement.purchase(PRODUCTS.yearly)).rejects.toMatchObject({
      code: 'BILLING_FAILED',
    });
    await expect(services.entitlement.purchase('nope')).rejects.toMatchObject({
      code: 'BILLING_PRODUCT_NOT_FOUND',
    });
    expect(services.entitlement.hasPro()).toBe(false);
    services.billing.nextOutcome = 'purchase';
    expect((await services.entitlement.purchase(PRODUCTS.monthly)).status).toBe('purchased');
    expect(services.entitlement.state.get().status).toBe('active');
  });
});

describe('store mapping', () => {
  const purchase = (overrides: Partial<StorePurchaseLike> = {}): StorePurchaseLike => ({
    productId: PRODUCTS.yearly,
    transactionDate: now,
    isAutoRenewing: true,
    expirationDateIOS: now + 7 * DAY,
    offerIOS: { paymentMode: 'free-trial', type: 'introductory' },
    renewalInfoIOS: {
      willAutoRenew: true,
      gracePeriodExpirationDate: null,
      isInBillingRetry: false,
    },
    ...overrides,
  });

  it('maps a StoreKit trial', () => {
    expect(toStoreSubscription(purchase(), now)).toEqual({
      productId: PRODUCTS.yearly,
      expiresAt: now + 7 * DAY,
      willRenew: true,
      isTrial: true,
      gracePeriodEndsAt: null,
      inBillingRetry: false,
      revoked: false,
    });
  });

  it('maps Play purchases with a recheck window, refunds and billing retry', () => {
    const play = toStoreSubscription(
      { productId: PRODUCTS.monthly, transactionDate: now, isAutoRenewing: false },
      now,
    );
    expect(play).toMatchObject({
      expiresAt: now + PLAY_RECHECK_MS,
      willRenew: false,
      isTrial: false,
    });
    expect(toStoreSubscription(purchase({ revocationDateIOS: now }), now).revoked).toBe(true);
    expect(
      toStoreSubscription(
        purchase({
          renewalInfoIOS: {
            willAutoRenew: true,
            gracePeriodExpirationDate: now + DAY,
            isInBillingRetry: true,
          },
        }),
        now,
      ),
    ).toMatchObject({ gracePeriodEndsAt: now + DAY, inBillingRetry: true });
  });

  it('picks the newest transaction for our products', () => {
    const older = purchase({ transactionDate: now - DAY, productId: PRODUCTS.monthly });
    const other = purchase({ transactionDate: now + DAY, productId: 'someone.else' });
    expect(
      latestSubscription([older, purchase(), other], [PRODUCTS.yearly, PRODUCTS.monthly], now)
        ?.productId,
    ).toBe(PRODUCTS.yearly);
    expect(latestSubscription([other], [PRODUCTS.yearly], now)).toBeNull();
  });

  it('reads trial length from either platform', () => {
    expect(
      trialDays({
        id: 'x',
        displayPrice: '$1',
        introductoryPricePaymentModeIOS: 'free-trial',
        introductoryPriceNumberOfPeriodsIOS: '1',
        introductoryPriceSubscriptionPeriodIOS: 'week',
      }),
    ).toBe(7);
    expect(
      trialDays({
        id: 'x',
        displayPrice: '$1',
        subscriptionOffers: [{ paymentMode: 'free-trial', period: { unit: 'day', value: 3 } }],
      }),
    ).toBe(3);
    expect(
      trialDays({ id: 'x', displayPrice: '$1', introductoryPricePaymentModeIOS: 'pay-up-front' }),
    ).toBeNull();
  });

  it('translates a RevenueCat entitlement', () => {
    expect(fromRevenueCat(undefined)).toBeNull();
    expect(
      fromRevenueCat({
        isActive: true,
        willRenew: true,
        periodType: 'TRIAL',
        productIdentifier: PRODUCTS.yearly,
        expirationDateMillis: null,
        billingIssueDetectedAtMillis: now,
      }),
    ).toMatchObject({
      isTrial: true,
      expiresAt: Number.MAX_SAFE_INTEGER,
      inBillingRetry: true,
      gracePeriodEndsAt: Number.MAX_SAFE_INTEGER,
    });
  });
});

describe('plan math', () => {
  it('derives a monthly equivalent and the yearly saving', () => {
    const yearly = { period: 'yearly' as const, price: 59.99, currency: 'USD' };
    const monthly = { period: 'monthly' as const, price: 9.99, currency: 'USD' };
    expect(monthlyEquivalent(yearly)).toBe('$4.99');
    expect(monthlyEquivalent(monthly)).toBeNull();
    expect(yearlySaving(yearly, monthly)).toBe(49);
    expect(yearlySaving(yearly, { ...monthly, currency: 'EUR' })).toBeNull();
    expect(yearlySaving({ ...yearly, price: 200 }, monthly)).toBeNull();
  });
});

describe('fake billing', () => {
  it('disconnects listeners', async () => {
    const billing = createFakeBilling(() => now);
    const listener = jest.fn();
    billing.onChange(listener);
    billing.disconnect();
    billing.emit(null);
    expect(listener).not.toHaveBeenCalled();
    await billing.connect();
    expect(await billing.restore()).toBeNull();
  });
});

describe('RevenueCat adapter', () => {
  function fakePurchases(options: { cancel?: boolean; entitled?: boolean } = {}) {
    const entitlement = {
      isActive: true,
      willRenew: true,
      periodType: 'TRIAL',
      productIdentifier: PRODUCTS.yearly,
      expirationDateMillis: now + 7 * DAY,
      billingIssueDetectedAtMillis: null,
    };
    const info = {
      entitlements: {
        active: options.entitled === false ? {} : { [PRO_ENTITLEMENT]: entitlement },
      },
    };
    const listeners: ((i: unknown) => void)[] = [];
    const pkg = {
      product: {
        identifier: PRODUCTS.yearly,
        priceString: '$59.99',
        price: 59.99,
        currencyCode: 'USD',
        introPrice: { price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' },
      },
    };
    const module = {
      configure: jest.fn(),
      getOfferings: async () => ({ current: { availablePackages: [pkg] } }),
      purchasePackage: async () => {
        if (options.cancel) throw Object.assign(new Error('cancelled'), { userCancelled: true });
        return { customerInfo: info };
      },
      restorePurchases: async () => info,
      getCustomerInfo: async () => info,
      addCustomerInfoUpdateListener: (l: (i: unknown) => void) => listeners.push(l),
      removeCustomerInfoUpdateListener: jest.fn(() => true),
      showManageSubscriptions: jest.fn(async () => undefined),
      listeners,
    };
    return module;
  }

  it('loads plans, purchases and restores through the Pro entitlement', async () => {
    const purchases = fakePurchases();
    const billing = createRevenueCatBilling({
      purchases: purchases as unknown as typeof Purchases,
      apiKey: 'appl_test',
    });
    const plans = await billing.plans();
    expect(plans).toEqual([
      expect.objectContaining({
        productId: PRODUCTS.yearly,
        period: 'yearly',
        displayPrice: '$59.99',
        trialDays: 7,
      }),
    ]);
    expect(purchases.configure).toHaveBeenCalledTimes(1);
    expect(await billing.purchase(PRODUCTS.yearly)).toMatchObject({
      status: 'purchased',
      subscription: { isTrial: true },
    });
    expect((await billing.restore())?.productId).toBe(PRODUCTS.yearly);
    expect((await billing.current())?.productId).toBe(PRODUCTS.yearly);

    const listener = jest.fn();
    const off = billing.onChange(listener);
    purchases.listeners[0]?.({ entitlements: { active: {} } });
    expect(listener).toHaveBeenCalledWith(null);
    off();
    expect(purchases.removeCustomerInfoUpdateListener).toHaveBeenCalled();
    await billing.manageSubscriptions();
    billing.disconnect();
    expect(billing.provider).toBe('revenuecat');
  });

  it('handles cancellation, missing packages, missing keys and a purchase without the entitlement', async () => {
    const cancelled = createRevenueCatBilling({
      purchases: fakePurchases({ cancel: true }) as unknown as typeof Purchases,
      apiKey: 'k',
    });
    await expect(cancelled.purchase(PRODUCTS.yearly)).rejects.toMatchObject({
      code: 'BILLING_PRODUCT_NOT_FOUND',
    });
    await cancelled.plans();
    expect(await cancelled.purchase(PRODUCTS.yearly)).toEqual({ status: 'cancelled' });

    const unentitled = createRevenueCatBilling({
      purchases: fakePurchases({ entitled: false }) as unknown as typeof Purchases,
      apiKey: 'k',
    });
    await unentitled.plans();
    await expect(unentitled.purchase(PRODUCTS.yearly)).rejects.toMatchObject({
      code: 'BILLING_FAILED',
    });

    const keyless = createRevenueCatBilling({
      purchases: fakePurchases() as unknown as typeof Purchases,
      apiKey: '',
    });
    await expect(keyless.current()).rejects.toMatchObject({ code: 'BILLING_UNAVAILABLE' });
  });
});

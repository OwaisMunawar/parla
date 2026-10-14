/**
 * Build-time configuration. Expo inlines `process.env.EXPO_PUBLIC_*` only
 * when each variable is read by its full name, so they are spelled out here
 * once and nowhere else reads `process.env`.
 */
export type BillingProviderSetting = 'storekit' | 'revenuecat';

export type AppConfig = {
  demo: boolean;
  tutorUrl: string | null;
  billingProvider: BillingProviderSetting;
  revenueCatIosKey: string;
  revenueCatAndroidKey: string;
};

export function readConfig(): AppConfig {
  const tutorUrl = process.env.EXPO_PUBLIC_TUTOR_URL?.trim();
  return {
    demo: process.env.EXPO_PUBLIC_DEMO === '1',
    tutorUrl: tutorUrl ? tutorUrl : null,
    billingProvider:
      process.env.EXPO_PUBLIC_BILLING_PROVIDER === 'revenuecat' ? 'revenuecat' : 'storekit',
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  };
}

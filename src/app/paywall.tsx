import { useLocalSearchParams, useRouter } from 'expo-router';

import { PaywallScreen, type PaywallSource } from '@/features/billing/screens/PaywallScreen';

const sources: readonly PaywallSource[] = ['onboarding', 'quota', 'home', 'settings'];

export default function PaywallRoute() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const resolved = sources.find((s) => s === source) ?? 'home';
  return (
    <PaywallScreen
      source={resolved}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
    />
  );
}

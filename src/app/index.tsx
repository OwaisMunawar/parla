import { Redirect } from 'expo-router';

import { useLiveQuery } from '@/composition/ServicesProvider';

export default function Index() {
  const { data, loading } = useLiveQuery('profile', ['profile'], (s) => s.profiles.get());
  if (loading && data === undefined) return null;
  return <Redirect href={data?.onboardedAt ? '/(tabs)' : '/onboarding'} />;
}

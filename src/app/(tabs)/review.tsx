import { useLiveQuery } from '@/composition/ServicesProvider';
import { Screen } from '@/core/ui';
import { ReviewScreen } from '@/features/review/screens/ReviewScreen';

export default function ReviewRoute() {
  const { data: profile } = useLiveQuery('profile', ['profile'], (s) => s.profiles.get());
  if (!profile) return <Screen>{null}</Screen>;
  return <ReviewScreen language={profile.language} />;
}

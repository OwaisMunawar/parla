import { useLocalSearchParams } from 'expo-router';

import { useLiveQuery } from '@/composition/ServicesProvider';
import { EmptyState, Screen } from '@/core/ui';
import { findDrill } from '@/features/pronunciation/content/drills';
import { DrillScreen } from '@/features/pronunciation/screens/DrillScreen';

export default function DrillRoute() {
  const { drillId } = useLocalSearchParams<{ drillId: string }>();
  const { data: profile, loading } = useLiveQuery('profile', ['profile'], (s) => s.profiles.get());
  if (loading && !profile) return <Screen>{null}</Screen>;
  const drill = profile ? findDrill(profile.language, drillId) : undefined;
  if (!profile || !drill) {
    return (
      <Screen>
        <EmptyState icon="info" title="Drill not found" message={drillId} />
      </Screen>
    );
  }
  // Keyed so "next sentence" mounts a fresh attempt.
  return <DrillScreen key={drill.id} drill={drill} language={profile.language} />;
}

import { useLocalSearchParams } from 'expo-router';

import { useLiveQuery } from '@/composition/ServicesProvider';
import { EmptyState, Screen } from '@/core/ui';
import { findScenario } from '@/features/conversation/content';
import { ConversationScreen } from '@/features/conversation/screens/ConversationScreen';

export default function ConversationRoute() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  const { data: profile, loading } = useLiveQuery('profile', ['profile'], (s) => s.profiles.get());
  if (loading && !profile) return <Screen>{null}</Screen>;
  const scenario = profile ? findScenario(profile.language, scenarioId) : undefined;
  if (!profile || !scenario) {
    return (
      <Screen>
        <EmptyState icon="info" title="Scenario not found" message={scenarioId} />
      </Screen>
    );
  }
  return (
    <ConversationScreen scenario={scenario} language={profile.language} level={profile.level} />
  );
}

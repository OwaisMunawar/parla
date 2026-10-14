import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useLiveQuery } from '@/composition/ServicesProvider';
import { languageInfo } from '@/core/content/languages';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import {
  Card,
  Icon,
  Pill,
  ProgressRing,
  ScalePressable,
  Screen,
  SectionTitle,
  Text,
} from '@/core/ui';

import { QuotaBanner } from '../../billing/components/QuotaBanner';
import { useConversationQuota, useEntitlement } from '../../billing/hooks/useEntitlement';
import { canStartConversation } from '../../billing/lib/quota';
import { StreakFlame } from '../../progress/components/StreakFlame';
import { drillsFor } from '../../pronunciation/content/drills';
import { scenariosFor } from '../content';
import { ScenarioCard } from '../components/ScenarioCard';

export function HomeScreen() {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const { pro } = useEntitlement();
  const quota = useConversationQuota();
  const { data } = useLiveQuery(
    'home',
    ['profile', 'progress', 'review', 'entitlement'],
    async (s) => {
      const profile = await s.profiles.get();
      if (!profile) return null;
      return {
        profile,
        snapshot: await s.progress.snapshot(),
        due: await s.review.counts(profile.language),
      };
    },
  );

  if (!data) return <Screen>{null}</Screen>;
  const { profile, snapshot, due } = data;
  const scenarios = scenariosFor(profile.language);

  const openScenario = (id: string) => {
    if (quota && !canStartConversation(quota)) {
      router.push({ pathname: '/paywall', params: { source: 'quota' } });
      return;
    }
    router.push({ pathname: '/conversation/[scenarioId]', params: { scenarioId: id } });
  };

  return (
    <Screen scroll tabBar testID="home-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pill
          label={`${languageInfo[profile.language].badge} · ${profile.level}`}
          tone="accent"
          icon="globe"
        />
        {pro && <Pill label="PRO" tone="warning" icon="crown" testID="pro-badge" />}
        <View style={{ flex: 1 }} />
        <ScalePressable
          accessibilityRole="button"
          accessibilityLabel={t('common.days', { count: snapshot.streak.days })}
          onPress={() => router.push('/(tabs)/progress')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <StreakFlame lit={snapshot.streak.practisedToday} size={26} />
          <Text
            variant="headline"
            style={{ color: snapshot.streak.practisedToday ? colors.flame : colors.textMuted }}>
            {snapshot.streak.days}
          </Text>
        </ScalePressable>
      </View>

      <Text variant="display">{t('home.greeting')}</Text>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <ProgressRing
          progress={snapshot.goalFraction}
          size={76}
          stroke={9}
          color={colors.flame}
          accessibilityLabel={t('home.goal', { xp: snapshot.todayXp, goal: snapshot.dailyGoalXp })}>
          <Text variant="headline">{snapshot.todayXp}</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="headline">
            {t('home.goal', { xp: snapshot.todayXp, goal: snapshot.dailyGoalXp })}
          </Text>
          <ScalePressable
            accessibilityRole="button"
            testID="home-review-link"
            onPress={() => router.push('/(tabs)/review')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="cards" size={14} color={colors.accent} />
            <Text variant="callout" color="accent">
              {due.total > 0 ? t('home.reviewDue', { count: due.total }) : t('home.reviewNone')}
            </Text>
          </ScalePressable>
        </View>
      </Card>

      {quota && <QuotaBanner quota={quota} />}

      <SectionTitle>{t('home.scenarios')}</SectionTitle>
      <View style={{ gap: spacing.md }}>
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            locked={quota ? !canStartConversation(quota) : false}
            onPress={() => openScenario(scenario.id)}
          />
        ))}
      </View>

      <SectionTitle>{t('home.drills')}</SectionTitle>
      <View style={{ gap: spacing.md }}>
        {drillsFor(profile.language).map((drill) => (
          <ScalePressable
            key={drill.id}
            testID={`drill-${drill.id}`}
            accessibilityRole="button"
            accessibilityLabel={drill.text}
            onPress={() =>
              router.push({ pathname: '/drill/[drillId]', params: { drillId: drill.id } })
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              borderRadius: radii.lg,
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderBottomWidth: 4,
              borderColor: colors.border,
            }}>
            <Icon name="waveform" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="callout" numberOfLines={1}>
                {drill.text}
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {drill.focus}
              </Text>
            </View>
            <Icon name="chevronRight" size={14} color={colors.textFaint} />
          </ScalePressable>
        ))}
      </View>
    </Screen>
  );
}

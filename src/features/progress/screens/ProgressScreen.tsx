import { View } from 'react-native';

import { useLiveQuery } from '@/composition/ServicesProvider';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Card, Icon, ProgressBar, ProgressRing, Screen, SectionTitle, Text } from '@/core/ui';

import { StreakFlame } from '../components/StreakFlame';
import { WeeklyChart } from '../components/WeeklyChart';
import { MAX_FREEZES } from '../lib/streak';
import { daysOnGoal } from '../lib/xp';

export function ProgressScreen() {
  const { colors, spacing } = useTheme();
  const { data } = useLiveQuery('progress', ['progress', 'profile'], (s) => s.progress.snapshot());
  if (!data) return <Screen>{null}</Screen>;
  const { streak, level } = data;

  return (
    <Screen scroll tabBar testID="progress-screen">
      <Text variant="display">{t('progress.title')}</Text>

      <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
        <StreakFlame lit={streak.practisedToday} size={110} />
        <Text
          variant="hero"
          testID="streak-days"
          style={{ color: streak.practisedToday ? colors.flame : colors.text }}>
          {streak.days}
        </Text>
        <Text variant="headline" color="textMuted">
          {t('progress.streak')}
        </Text>
        <Text variant="caption" color="textFaint">
          {t('progress.longest', { count: data.longestStreak })}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: 999,
            backgroundColor: colors.accentSoft,
          }}>
          {Array.from({ length: MAX_FREEZES }, (_, i) => (
            <Icon
              key={i}
              name="snowflake"
              size={18}
              color={i < streak.freezes ? colors.accent : colors.textFaint}
            />
          ))}
          <Text variant="callout" color="accent" style={{ fontWeight: '700' }}>
            {t('progress.freezes', { count: streak.freezes })}
          </Text>
        </View>
        <Text variant="caption" color="textMuted" align="center">
          {t('progress.freezeHint')}
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat
          icon="bolt"
          tint={colors.flame}
          label={t('progress.totalXp')}
          value={data.totalXp.toLocaleString()}
        />
        <Stat
          icon="book"
          tint={colors.success}
          label={t('progress.words')}
          value={String(data.wordsLearned)}
        />
      </View>

      <SectionTitle>{t('progress.week')}</SectionTitle>
      <Card style={{ gap: spacing.md }}>
        <Text variant="callout" color="textMuted">
          {`${daysOnGoal(data.week, data.dailyGoalXp)} / 7 · ${t('home.goal', { xp: data.todayXp, goal: data.dailyGoalXp })}`}
        </Text>
        <WeeklyChart week={data.week} goal={data.dailyGoalXp} />
      </Card>

      <SectionTitle>{t('progress.level')}</SectionTitle>
      <Card
        testID="cefr-card"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <ProgressRing
          progress={level.fraction}
          size={78}
          stroke={9}
          accessibilityLabel={level.level}>
          <Text variant="title">{level.level}</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="headline">
            {level.next
              ? t('progress.toNext', {
                  percent: Math.round(level.fraction * 100),
                  next: level.next,
                })
              : level.level}
          </Text>
          <ProgressBar progress={level.fraction} />
        </View>
      </Card>
    </Screen>
  );
}

function Stat({
  icon,
  tint,
  label,
  value,
}: {
  icon: 'bolt' | 'book';
  tint: string;
  label: string;
  value: string;
}) {
  const { spacing } = useTheme();
  return (
    <Card style={{ flex: 1, gap: spacing.xs }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={20} color={tint} />
      <Text variant="title">{value}</Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </Card>
  );
}

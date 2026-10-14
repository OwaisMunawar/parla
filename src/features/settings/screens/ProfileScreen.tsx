import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useLiveQuery, useServices } from '@/composition/ServicesProvider';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Card, ListRow, Pill, Screen, SectionTitle, Text, useToast } from '@/core/ui';

import { useEntitlement } from '../../billing/hooks/useEntitlement';
import { type EntitlementState } from '../../billing/lib/entitlement';

function statusLine(state: EntitlementState): string {
  const date = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  switch (state.status) {
    case 'none':
      return t('settings.status_none');
    case 'trial':
      return t('settings.status_trial', { date: date(state.endsAt) });
    case 'active':
      return t('settings.status_active', { date: date(state.renewsAt) });
    case 'grace':
      return t('settings.status_grace', { date: date(state.graceEndsAt) });
    case 'expired':
      return t('settings.status_expired');
  }
}

export function ProfileScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const services = useServices();
  const toast = useToast();
  const { state, pro } = useEntitlement();
  const { data: profile } = useLiveQuery('profile', ['profile', 'progress'], (s) =>
    s.profiles.get(),
  );

  return (
    <Screen scroll tabBar testID="profile-screen">
      <Text variant="display">{t('settings.title')}</Text>

      <SectionTitle>{t('settings.subscription')}</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        <ListRow
          icon="crown"
          title={pro ? 'Parla Pro' : t('settings.status_none')}
          detail={statusLine(state)}
          trailing={
            <Pill
              label={state.status.toUpperCase()}
              tone={pro ? 'success' : 'neutral'}
              testID="entitlement-status"
            />
          }
        />
        {!pro && (
          <ListRow
            icon="sparkles"
            title={t('settings.upgrade')}
            onPress={() => router.push({ pathname: '/paywall', params: { source: 'settings' } })}
            testID="settings-upgrade"
          />
        )}
        <ListRow
          icon="restore"
          title={t('settings.restore')}
          onPress={() =>
            void services.entitlement.restore().then(
              (next) => {
                services.changes.emit('entitlement');
                toast.show({
                  message:
                    next.status === 'none' ? t('paywall.nothingToRestore') : t('paywall.restored'),
                });
              },
              () => toast.show({ message: t('paywall.unavailable') }),
            )
          }
        />
        <ListRow
          icon="gear"
          title={t('settings.manage')}
          onPress={() => void services.entitlement.manage()}
        />
      </Card>

      {profile && (
        <>
          <SectionTitle>{t('settings.learning')}</SectionTitle>
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            <ListRow
              icon="globe"
              title={t('settings.language')}
              detail={t(`languages.${profile.language}`)}
            />
            <ListRow icon="target" title={t('settings.level')} detail={profile.level} />
            <ListRow
              icon="flame"
              title={t('settings.dailyGoal')}
              detail={t('common.xp', { count: profile.dailyGoalXp })}
            />
            <ListRow
              icon="bell"
              title={t('settings.reminder')}
              detail={profile.reminderTime ?? t('onboarding.reminderOff')}
            />
          </Card>
        </>
      )}

      <SectionTitle>{t('settings.engines')}</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        <ListRow
          icon="waveform"
          title={t('settings.recognizer')}
          detail={t(`recognizer.${services.recognizer.kind}`)}
        />
        <ListRow
          icon="sparkles"
          title={t('settings.tutor')}
          detail={t(`tutor.${services.tutor.kind}`)}
        />
        <ListRow icon="lock" title={t('settings.store')} detail={services.billing.provider} />
      </Card>
      {services.config.demo && (
        <View style={{ alignItems: 'center' }}>
          <Pill label={t('settings.demo')} tone="warning" icon="info" />
        </View>
      )}
    </Screen>
  );
}

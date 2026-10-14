import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Button, Card, Icon, ProgressBar, Text } from '@/core/ui';

import { type Quota } from '../lib/quota';

/**
 * The free tier made visible before it bites: a quiet counter while slots
 * remain, the upsell card once they are gone.
 */
export function QuotaBanner({ quota }: { quota: Quota }) {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  if (quota.unlimited) return null;

  if (quota.exhausted) {
    return (
      <Card
        testID="quota-upsell"
        style={{ gap: spacing.md, borderColor: colors.accent, borderWidth: 2 }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="crown" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline">
              {t('home.freeUsed', { used: quota.used, limit: quota.limit })}
            </Text>
            <Text variant="caption" color="textMuted">
              {t('conversation.blockedBody')}
            </Text>
          </View>
        </View>
        <ProgressBar progress={1} color={colors.accent} height={8} />
        <Button
          testID="quota-upgrade"
          label={t('settings.upgrade')}
          icon="crown"
          onPress={() => router.push({ pathname: '/paywall', params: { source: 'quota' } })}
        />
      </Card>
    );
  }

  return (
    <View testID="quota-counter" style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="textMuted">
          {t('home.freeLeft', { count: quota.remaining })}
        </Text>
        <Text
          variant="caption"
          color="accent"
          style={{ fontWeight: '800' }}
          onPress={() => router.push({ pathname: '/paywall', params: { source: 'home' } })}>
          {t('home.goPro')}
        </Text>
      </View>
      <ProgressBar progress={quota.used / quota.limit} height={6} />
    </View>
  );
}

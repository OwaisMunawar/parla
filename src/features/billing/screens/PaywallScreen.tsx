import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useServices } from '@/composition/ServicesProvider';
import { isAppError } from '@/core/errors/AppError';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import {
  Button,
  Card,
  Celebration,
  Icon,
  IconButton,
  Screen,
  Text,
  useToast,
  type IconName,
} from '@/core/ui';

import { PlanCard } from '../components/PlanCard';
import { type Plan } from '../engine/Billing';
import { useEntitlement } from '../hooks/useEntitlement';
import { monthlyEquivalent, yearlySaving } from '../lib/planMath';
import { FREE_CONVERSATIONS_PER_DAY } from '../lib/quota';

export type PaywallSource = 'onboarding' | 'quota' | 'home' | 'settings';

const benefits: {
  icon: IconName;
  key: 'paywall.benefitUnlimited' | 'paywall.benefitPacks' | 'paywall.benefitScenarios';
}[] = [
  { icon: 'chat', key: 'paywall.benefitUnlimited' },
  { icon: 'cards', key: 'paywall.benefitPacks' },
  { icon: 'sparkles', key: 'paywall.benefitScenarios' },
];

/**
 * Soft paywall: always dismissible, prices straight from the store, and the
 * trial terms stated next to the button rather than in grey under the fold.
 */
export function PaywallScreen({ source, onClose }: { source: PaywallSource; onClose: () => void }) {
  const { colors, spacing } = useTheme();
  const services = useServices();
  const toast = useToast();
  const { pro } = useEntitlement();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    let alive = true;
    services.entitlement.plans().then(
      (loaded) => {
        if (!alive) return;
        setPlans(loaded);
        // An empty catalogue means the store answered but has nothing for us:
        // no StoreKit configuration, or products not approved yet.
        if (loaded.length === 0) setError(t('paywall.unavailable'));
        setSelected(
          loaded.find((p) => p.period === 'yearly')?.productId ?? loaded[0]?.productId ?? null,
        );
      },
      () => alive && (setPlans([]), setError(t('paywall.unavailable'))),
    );
    return () => {
      alive = false;
    };
  }, [services.entitlement]);

  const plan = plans?.find((p) => p.productId === selected);
  const yearly = plans?.find((p) => p.period === 'yearly');
  const monthly = plans?.find((p) => p.period === 'monthly');

  const buy = async () => {
    if (!plan) return;
    setBusy('buy');
    setError(null);
    try {
      const result = await services.entitlement.purchase(plan.productId);
      services.changes.emit('entitlement');
      if (result.status === 'purchased') setCelebrate(true);
      if (result.status === 'pending') toast.show({ message: t('paywall.pending') });
    } catch (cause) {
      setError(
        isAppError(cause, 'BILLING_UNAVAILABLE') ? t('paywall.unavailable') : t('paywall.failed'),
      );
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const state = await services.entitlement.restore();
      services.changes.emit('entitlement');
      toast.show({
        message: state.status === 'none' ? t('paywall.nothingToRestore') : t('paywall.restored'),
      });
    } catch {
      setError(t('paywall.unavailable'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll testID="paywall-screen" edges={['bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <IconButton
          icon="close"
          label={t('common.close')}
          onPress={onClose}
          testID="paywall-close"
        />
      </View>

      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 24,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-6deg' }],
          }}>
          <Icon name="crown" size={38} color={colors.onAccent} />
        </View>
        <Text variant="overline" color="accent">
          {t('paywall.subtitle')}
        </Text>
        <Text variant="display" align="center">
          {t('paywall.title')}
        </Text>
      </View>

      {source === 'quota' && (
        <Card
          testID="paywall-quota"
          style={{ backgroundColor: colors.flameSoft, borderColor: 'transparent' }}>
          <Text variant="headline" align="center" style={{ color: colors.flame }}>
            {t('home.freeUsed', {
              used: FREE_CONVERSATIONS_PER_DAY,
              limit: FREE_CONVERSATIONS_PER_DAY,
            })}
          </Text>
        </Card>
      )}

      <View style={{ gap: spacing.md }}>
        {benefits.map((benefit) => (
          <View
            key={benefit.key}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.successSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name={benefit.icon} size={16} color={colors.success} />
            </View>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {t(benefit.key)}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        {plans?.map((p) => (
          <PlanCard
            key={p.productId}
            plan={p}
            selected={p.productId === selected}
            monthlyEquivalent={monthlyEquivalent(p)}
            savingPercent={p.period === 'yearly' ? yearlySaving(yearly, monthly) : null}
            onPress={() => setSelected(p.productId)}
          />
        ))}
      </View>

      {error ? (
        <Text color="danger" align="center" testID="paywall-error">
          {error}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {pro ? (
          <Button
            label={t('common.done')}
            icon="checkCircle"
            onPress={onClose}
            testID="paywall-done"
          />
        ) : (
          <Button
            testID="paywall-cta"
            variant="flame"
            label={plan?.trialDays ? t('paywall.ctaTrial') : t('paywall.cta')}
            loading={busy === 'buy'}
            disabled={!plan || busy !== null}
            onPress={() => void buy()}
          />
        )}
        {plan?.trialDays && !pro ? (
          <Text variant="caption" color="textMuted" align="center">
            {t('paywall.trialThen', { days: plan.trialDays, price: plan.displayPrice })}
          </Text>
        ) : null}
        <Button
          variant="ghost"
          label={t('paywall.restore')}
          loading={busy === 'restore'}
          disabled={busy !== null}
          onPress={() => void restore()}
          testID="paywall-restore"
        />
        {source === 'onboarding' && !pro ? (
          <Button
            variant="ghost"
            label={t('common.maybeLater')}
            onPress={onClose}
            testID="paywall-later"
          />
        ) : null}
        <Text variant="caption" color="textFaint" align="center">
          {t('paywall.fineprint')}
        </Text>
      </View>
      <Celebration play={celebrate} onDone={() => setCelebrate(false)} />
    </Screen>
  );
}

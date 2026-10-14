import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { createSystemClock } from '@/core/clock/Clock';
import { readConfig } from '@/core/config/env';
import { openExpoSqliteDriver } from '@/core/db/expoSqliteDriver';
import { migrate } from '@/core/db/migrate';
import { createIdGenerator } from '@/core/lib/id';
import { withBundledClips, withFallback } from '@/core/speech/clipRecognizer';
import { createNativeRecognizer } from '@/core/speech/nativeRecognizer';
import { createNativeSpeaker } from '@/core/speech/nativeSpeaker';
import { createScriptedRecognizer } from '@/core/speech/scriptedRecognizer';
import { type Billing } from '@/features/billing/engine/Billing';
import { createExpoIapBilling } from '@/features/billing/engine/expoIapBilling';
import { createRevenueCatBilling } from '@/features/billing/engine/revenueCatBilling';
import { createScriptedTutor } from '@/features/conversation/engine/scriptedTutor';
import { createServerTutor, type StreamingFetch } from '@/features/conversation/engine/serverTutor';
import { createClipResolver } from '@/features/demo/data/clipResolver';
import { seedDemo } from '@/features/demo/engine/seedDemo';
import { createExpoReminderScheduler } from '@/features/progress/data/notifications';
import { publishStreakSnapshot } from '@/features/widget/data/nativeWidget';

import { assembleServices, type AppServices } from './AppServices';

function createBilling(config: ReturnType<typeof readConfig>): Billing {
  if (config.billingProvider === 'revenuecat') {
    // Optional dependency, linked only when RevenueCat is enabled (README, Monetisation).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const purchases = require('react-native-purchases').default;
    return createRevenueCatBilling({
      purchases,
      apiKey: Platform.OS === 'ios' ? config.revenueCatIosKey : config.revenueCatAndroidKey,
    });
  }
  return createExpoIapBilling();
}

/** The composition root for device and simulator builds. */
export async function createNativeServices(): Promise<AppServices> {
  const config = readConfig();
  const clock = createSystemClock();
  const db = await openExpoSqliteDriver(config.demo ? 'parla-demo.db' : 'parla.db');
  await migrate(db);

  // Which language's clips to feed in demo mode; follows the profile.
  let currentLanguage = 'es';
  const native = createNativeRecognizer();
  // Demo mode feeds bundled clips to the real recogniser; a device without
  // speech recognition falls back to the scripted one, which the UI labels.
  const services = assembleServices({
    config: { demo: config.demo },
    clock,
    ids: createIdGenerator(),
    db,
    billing: createBilling(config),
    tutor: config.tutorUrl
      ? createServerTutor({
          baseUrl: config.tutorUrl,
          fetch: expoFetch as unknown as StreamingFetch,
        })
      : createScriptedTutor(),
    recognizer: withFallback(
      config.demo
        ? withBundledClips(
            native,
            createClipResolver(() => currentLanguage),
          )
        : native,
      createScriptedRecognizer(),
    ),
    speaker: createNativeSpeaker(),
    reminders: createExpoReminderScheduler(),
    publishWidget: publishStreakSnapshot,
  });

  if (config.demo) {
    await seedDemo({
      profiles: services.profiles,
      progress: services.progressRepo,
      reviews: services.reviewRepo,
      conversations: services.conversations,
      scheduler: services.scheduler,
      clock,
    });
  }
  const profile = await services.profiles.get();
  if (profile) currentLanguage = profile.language;
  services.changes.on(async (topic) => {
    if (topic !== 'profile') return;
    const next = await services.profiles.get();
    if (next) currentLanguage = next.language;
  });
  return services;
}

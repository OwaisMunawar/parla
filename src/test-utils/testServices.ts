import { assembleServices, type AppServices } from '@/composition/AppServices';
import { createManualClock, type ManualClock } from '@/core/clock/Clock';
import { createSequentialIds } from '@/core/lib/id';
import { createScriptedRecognizer } from '@/core/speech/scriptedRecognizer';
import { createSilentSpeaker } from '@/core/speech/Speaker';
import { type SpeechRecognizer } from '@/core/speech/SpeechRecognizer';
import { createFakeBilling, type FakeBilling } from '@/features/billing/engine/fakeBilling';
import { createScriptedTutor } from '@/features/conversation/engine/scriptedTutor';
import { type Tutor } from '@/features/conversation/engine/Tutor';
import { type Profile } from '@/features/onboarding/data/profileRepository';
import { createNoopReminderScheduler } from '@/features/progress/data/reminderScheduler';
import { type StreakWidgetProps } from '@/features/widget/lib/streakSnapshot';

import { createMigratedTestDriver } from './sqliteTestDriver';

export type TestServices = AppServices & {
  clock: ManualClock;
  billing: FakeBilling;
  speaker: ReturnType<typeof createSilentSpeaker>;
  widgets: StreakWidgetProps[];
};

export const testProfile: Profile = {
  language: 'es',
  goal: 'travel',
  level: 'A2',
  levelPoints: 100,
  dailyGoalXp: 40,
  reminderTime: '19:30',
  onboardedAt: 1,
};

/**
 * Real services over in-memory SQLite, with fakes only at the edges: the
 * clock, the store, the recogniser, TTS and the tutor's latency.
 */
export async function createTestServices(
  options: {
    now?: string;
    zone?: string;
    profile?: Profile | null;
    recognizer?: SpeechRecognizer;
    tutor?: Tutor;
  } = {},
): Promise<TestServices> {
  const clock = createManualClock(
    options.now ?? '2026-10-14T09:00:00Z',
    options.zone ?? 'Europe/Madrid',
  );
  const billing = createFakeBilling(() => clock.now().getTime());
  const widgets: StreakWidgetProps[] = [];
  const services = assembleServices({
    config: { demo: false },
    clock,
    ids: createSequentialIds(),
    db: await createMigratedTestDriver(),
    billing,
    tutor: options.tutor ?? createScriptedTutor({ latencyMs: 0 }),
    recognizer: options.recognizer ?? createScriptedRecognizer({ wordMs: 0 }),
    speaker: createSilentSpeaker(),
    reminders: createNoopReminderScheduler(),
    publishWidget: (props) => widgets.push(props),
    fuzz: false,
  });
  const profile = options.profile === undefined ? testProfile : options.profile;
  if (profile) await services.profiles.save(profile, clock.now().getTime());
  return { ...(services as TestServices), clock, billing, widgets };
}

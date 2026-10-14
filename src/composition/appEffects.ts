import { languageInfo } from '@/core/content/languages';
import { t } from '@/core/i18n/translate';
import { parseReminderTime } from '@/features/onboarding/data/profileRepository';
import { reminderCopy } from '@/features/progress/lib/reminder';
import { buildStreakSnapshot } from '@/features/widget/lib/streakSnapshot';

import { type AppServices } from './AppServices';

/**
 * Side effects that follow the data rather than any one screen: the widget
 * snapshot and the reminder copy are rebuilt whenever progress, reviews or
 * the profile change. Debounced so a conversation turn that touches all
 * three publishes once.
 */
export function startAppEffects(services: AppServices): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    const profile = await services.profiles.get();
    if (!profile) return;
    const snapshot = await services.progress.snapshot();
    const due = await services.review.counts(profile.language);
    const languageName = t(`languages.${profile.language}`);

    services.publishWidget(
      buildStreakSnapshot({
        streak: snapshot.streak,
        dueReviews: due.total,
        goalFraction: snapshot.goalFraction,
        languageName: languageInfo[profile.language].badge,
      }),
    );

    const time = parseReminderTime(profile.reminderTime);
    if (time) {
      await services.reminders.schedule(
        time,
        reminderCopy(snapshot.streak, languageName, due.total),
      );
    } else {
      await services.reminders.cancel().catch(() => undefined);
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      run().catch((error: unknown) => console.warn('App effects failed', error));
    }, 400);
  };

  const off = services.changes.on(schedule);
  schedule();
  return () => {
    off();
    if (timer) clearTimeout(timer);
  };
}

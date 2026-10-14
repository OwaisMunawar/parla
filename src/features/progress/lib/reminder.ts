import { type StreakView } from './streak';

export type ReminderCopy = { title: string; body: string };

/**
 * The daily reminder's words, chosen from the streak at scheduling time.
 * Copy that names what is at stake ("your 14-day streak") outperforms a
 * generic nudge, and a learner with no streak gets an invitation, not guilt.
 */
export function reminderCopy(
  streak: StreakView,
  languageName: string,
  dueReviews: number,
): ReminderCopy {
  if (streak.days >= 2) {
    return {
      title: `Keep your ${streak.days}-day streak`,
      body:
        dueReviews > 0
          ? `Two minutes of ${languageName} and ${dueReviews} phrases to review.`
          : `A two-minute conversation keeps it alive.`,
    };
  }
  return {
    title: `Time for a little ${languageName}`,
    body: 'Order a coffee, ask for directions, or drill one sentence.',
  };
}

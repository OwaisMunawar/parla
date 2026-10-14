import { type StreakView } from '../../progress/lib/streak';

/**
 * Everything the home-screen widget shows, computed in the app. The widget
 * extension renders props and nothing else: it has no database, no clock
 * logic and no network, so it can never disagree with the app.
 */
export type StreakWidgetProps = {
  streak: number;
  practisedToday: boolean;
  freezes: number;
  dueReviews: number;
  /** 0..1 of today's XP goal. */
  goal: number;
  language: string;
  /** Short line under the number, already chosen for the state. */
  caption: string;
};

export function buildStreakSnapshot(input: {
  streak: StreakView;
  dueReviews: number;
  goalFraction: number;
  languageName: string;
}): StreakWidgetProps {
  const { streak, dueReviews } = input;
  const caption = streak.practisedToday
    ? dueReviews > 0
      ? `${dueReviews} to review`
      : 'Done for today'
    : streak.days > 0
      ? streak.protectedTonight
        ? 'Freeze ready tonight'
        : 'Speak today to keep it'
      : 'Start a streak today';
  return {
    streak: streak.days,
    practisedToday: streak.practisedToday,
    freezes: streak.freezes,
    dueReviews,
    goal: Math.round(Math.min(1, Math.max(0, input.goalFraction)) * 100) / 100,
    language: input.languageName,
    caption,
  };
}

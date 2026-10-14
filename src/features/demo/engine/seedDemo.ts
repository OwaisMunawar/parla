import { type Clock } from '@/core/clock/Clock';
import { addDays, dayKey } from '@/core/lib/localDate';

import { type ConversationRepository } from '../../conversation/data/conversationRepository';
import { findScenario } from '../../conversation/content';
import { type ProfileRepository } from '../../onboarding/data/profileRepository';
import { type ProgressRepository } from '../../progress/data/progressRepository';
import { emptyStreak, recordPractice } from '../../progress/lib/streak';
import { type ReviewRepository } from '../../review/data/reviewRepository';
import { type Scheduler } from '../../review/lib/scheduler';
import { demoLearner, demoReviewCards, demoVocabulary } from '../content/learner';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Seeds the fictional learner on first launch in demo mode. Idempotent: a
 * profile already present means the demo was seeded (or the learner has
 * real data), and nothing is touched.
 *
 * History is generated relative to the clock, so the streak always ends
 * today whenever the demo is opened, and review cards get real FSRS
 * schedules by replaying their review history rather than invented numbers.
 */
export async function seedDemo(deps: {
  profiles: ProfileRepository;
  progress: ProgressRepository;
  reviews: ReviewRepository;
  conversations: ConversationRepository;
  scheduler: Scheduler;
  clock: Clock;
}): Promise<boolean> {
  const { profiles, progress, reviews, conversations, scheduler, clock } = deps;
  if (await profiles.get()) return false;

  const now = clock.now().getTime();
  const zone = clock.timeZone();
  const today = dayKey(clock.now(), zone);
  const days = demoLearner.dailyXp.length;

  await profiles.save(
    {
      language: demoLearner.language,
      goal: demoLearner.goal,
      level: demoLearner.level,
      levelPoints: demoLearner.levelPoints,
      dailyGoalXp: demoLearner.dailyGoalXp,
      reminderTime: demoLearner.reminderTime,
      onboardedAt: now - days * DAY,
    },
    now,
  );

  let streak = emptyStreak;
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i - days + 1);
    const at = now - (days - 1 - i) * DAY;
    await progress.addActivity({
      kind: 'conversation',
      language: demoLearner.language,
      xp: demoLearner.dailyXp[i] ?? 30,
      day,
      at,
    });
    streak = recordPractice(streak, day);
  }
  await progress.saveStreak(streak);
  await progress.addVocabulary(
    demoLearner.language,
    demoVocabulary.map(([term, meaning]) => ({ term, meaning })),
    now - 3 * DAY,
  );

  // Two finished conversations earlier today: one free slot left, so the
  // demo shows a conversation and then the "3 of 3" upsell.
  for (const [index, scenarioId] of ['directions', 'interview'].entries()) {
    const scenario = findScenario(demoLearner.language, scenarioId);
    if (!scenario) continue;
    const startedAt = now - (3 - index) * HOUR;
    const id = await conversations.start({
      scenarioId,
      language: demoLearner.language,
      day: today,
      at: startedAt,
    });
    const first = scenario.steps[0]!;
    await conversations.addMessage(id, {
      role: 'tutor',
      text: first.tutor,
      translation: first.translation,
      corrections: [],
      createdAt: startedAt,
    });
    await conversations.addMessage(id, {
      role: 'learner',
      text: first.demoUtterance,
      translation: null,
      corrections: [],
      createdAt: startedAt + 20_000,
    });
    await conversations.finish(id, startedAt + 5 * 60_000, demoLearner.level);
  }

  for (const [index, card] of demoReviewCards.entries()) {
    const createdAt = now - (10 - (index % 6)) * DAY;
    let schedule = scheduler.newSchedule(new Date(createdAt));
    let at = createdAt;
    for (const grade of card.reviews) {
      schedule = scheduler.review(schedule, grade, new Date(at));
      at = Math.min(schedule.due, now - HOUR);
    }
    await reviews.add({
      language: demoLearner.language,
      kind: card.kind,
      prompt: card.prompt,
      answer: card.answer,
      note: card.note,
      sourceMessageId: null,
      createdAt,
      schedule,
    });
  }
  return true;
}

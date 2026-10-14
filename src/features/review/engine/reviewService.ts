import { type Clock } from '@/core/clock/Clock';
import { dayKey } from '@/core/lib/localDate';

import { type Correction, type VocabularyItem } from '../../conversation/lib/tutorContract';
import { type ReviewCard, type ReviewRepository } from '../data/reviewRepository';
import { buildQueue, dueCounts, type DueCounts } from '../lib/queue';
import { type Grade, type Scheduler } from '../lib/scheduler';

/** New cards per day for free learners; Pro review packs lift it. */
export const NEW_CARDS_PER_DAY = { free: 10, pro: 25 } as const;

export function createReviewService(deps: {
  repository: ReviewRepository;
  scheduler: Scheduler;
  clock: Clock;
  isPro: () => boolean;
}) {
  const { repository, scheduler, clock, isPro } = deps;
  const newLimit = () => (isPro() ? NEW_CARDS_PER_DAY.pro : NEW_CARDS_PER_DAY.free);

  /** Midnight in the learner's zone, as an instant, for "new cards today". */
  const startOfToday = () => {
    const now = clock.now();
    const today = dayKey(now, clock.timeZone());
    // Walk back in hour steps until the local day changes; exact enough for a
    // daily limit and immune to DST, unlike subtracting a fixed offset.
    let probe = now.getTime();
    while (dayKey(new Date(probe - 3_600_000), clock.timeZone()) === today) probe -= 3_600_000;
    return probe - (probe % 60_000);
  };

  return {
    async addCorrection(input: {
      language: string;
      correction: Correction;
      sourceMessageId: string | null;
    }) {
      const now = clock.now();
      return repository.add({
        language: input.language,
        kind: 'phrase',
        prompt: `Say it correctly: "${input.correction.original}"`,
        answer: input.correction.corrected,
        note: input.correction.explanation,
        sourceMessageId: input.sourceMessageId,
        createdAt: now.getTime(),
        schedule: scheduler.newSchedule(now),
      });
    },

    async addVocabulary(
      language: string,
      item: VocabularyItem,
      sourceMessageId: string | null = null,
    ) {
      const now = clock.now();
      return repository.add({
        language,
        kind: 'vocabulary',
        prompt: item.meaning,
        answer: item.term,
        note: null,
        sourceMessageId,
        createdAt: now.getTime(),
        schedule: scheduler.newSchedule(now),
      });
    },

    async queue(language: string): Promise<ReviewCard[]> {
      const cards = await repository.all(language);
      const seen = await repository.newIntroducedSince(startOfToday());
      return buildQueue(cards, clock.now(), newLimit(), seen);
    },

    async counts(language: string): Promise<DueCounts> {
      const cards = await repository.all(language);
      const seen = await repository.newIntroducedSince(startOfToday());
      return dueCounts(cards, clock.now(), newLimit(), seen);
    },

    preview(card: ReviewCard) {
      return scheduler.preview(card.schedule, clock.now());
    },

    async grade(card: ReviewCard, grade: Grade) {
      const now = clock.now();
      const schedule = scheduler.review(card.schedule, grade, now);
      await repository.saveReview(card.id, grade, schedule, now.getTime());
      return schedule;
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;

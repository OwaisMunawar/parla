import { addDays } from '@/core/lib/localDate';
import { createTestServices } from '@/test-utils/testServices';

import { seedDemo } from '../../../demo/engine/seedDemo';
import { NEW_CARDS_PER_DAY } from '../../../review/engine/reviewService';

const HOUR = 3_600_000;

describe('progress service', () => {
  it('records practice into XP, streak and level together', async () => {
    const services = await createTestServices();
    const first = await services.progress.record({ kind: 'conversation', xp: 30, language: 'es' });
    expect(first).toMatchObject({ xp: 30, goalJustReached: false, levelUp: null });
    expect(first.streak).toMatchObject({ days: 1, practisedToday: true });

    const second = await services.progress.record({ kind: 'drill', xp: 15, language: 'es' });
    expect(second.goalJustReached).toBe(true);
    expect(
      (await services.progress.record({ kind: 'drill', xp: 5, language: 'es' })).goalJustReached,
    ).toBe(false);

    const snapshot = await services.progress.snapshot();
    expect(snapshot).toMatchObject({
      today: '2026-10-14',
      todayXp: 50,
      totalXp: 50,
      dailyGoalXp: 40,
      goalFraction: 1,
    });
    expect(snapshot.week).toHaveLength(7);
    expect((await services.profiles.get())?.levelPoints).toBe(150);
  });

  it('promotes on the tutor estimate and keeps working without a profile', async () => {
    const services = await createTestServices();
    const outcome = await services.progress.record({
      kind: 'conversation',
      xp: 15,
      language: 'es',
      tutorEstimate: 'B2',
    });
    expect(outcome.levelUp).toBe('B1');

    const bare = await createTestServices({ profile: null });
    await bare.progress.record({ kind: 'review', xp: 2, language: 'es' });
    const snapshot = await bare.progress.snapshot();
    expect(snapshot).toMatchObject({ dailyGoalXp: 40, wordsLearned: 0 });
    expect(snapshot.level.level).toBe('A1');
  });

  it('spends a freeze for a missed day when reconciling', async () => {
    const services = await createTestServices();
    for (let i = 0; i < 7; i++) {
      await services.progress.record({ kind: 'drill', xp: 5, language: 'es' });
      services.clock.advance(24 * HOUR);
    }
    services.clock.advance(24 * HOUR); // one day skipped
    await services.progress.reconcile();
    const streak = await services.progressRepo.streak();
    expect(streak).toMatchObject({ current: 7, freezes: 0 });
    await services.progress.reconcile();
    expect(await services.progressRepo.streak()).toEqual(streak);
  });
});

describe('review service', () => {
  it('turns corrections and vocabulary into cards without duplicates', async () => {
    const services = await createTestServices();
    const correction = {
      original: 'una café',
      corrected: 'un café',
      explanation: 'Masculine.',
      type: 'gender' as const,
    };
    expect(
      (await services.review.addCorrection({ language: 'es', correction, sourceMessageId: null }))
        .added,
    ).toBe(true);
    expect(
      (await services.review.addCorrection({ language: 'es', correction, sourceMessageId: null }))
        .added,
    ).toBe(false);
    await services.review.addVocabulary('es', { term: 'el semáforo', meaning: 'traffic lights' });

    const queue = await services.review.queue('es');
    expect(queue.map((c) => c.answer)).toEqual(['un café', 'el semáforo']);
    expect(queue[0]).toMatchObject({ kind: 'phrase', note: 'Masculine.' });
    expect(await services.review.counts('es')).toMatchObject({ new: 2, total: 2 });
  });

  it('grades a card, logs it and respects the new-card limit', async () => {
    const services = await createTestServices();
    for (let i = 0; i < NEW_CARDS_PER_DAY.free + 2; i++) {
      await services.review.addVocabulary('es', { term: `palabra ${i}`, meaning: `word ${i}` });
    }
    expect((await services.review.counts('es')).new).toBe(NEW_CARDS_PER_DAY.free);

    const [card] = await services.review.queue('es');
    const preview = services.review.preview(card!);
    expect(preview.easy.due).toBeGreaterThan(preview.again.due);
    const schedule = await services.review.grade(card!, 'good');
    expect(schedule.reps).toBe(1);
    expect((await services.reviewRepo.get(card!.id))?.schedule.reps).toBe(1);
    expect((await services.review.counts('es')).new).toBe(NEW_CARDS_PER_DAY.free - 1);

    await services.billing.purchase('com.owaismunawar.parla.pro.yearly');
    await services.entitlement.refresh();
    expect((await services.review.counts('es')).new).toBe(NEW_CARDS_PER_DAY.free + 1);
    expect(await services.reviewRepo.get('missing')).toBeNull();
  });
});

describe('demo seed', () => {
  it('seeds a fourteen-day streak ending today, cards, history and vocabulary once', async () => {
    const services = await createTestServices({ profile: null });
    const deps = {
      profiles: services.profiles,
      progress: services.progressRepo,
      reviews: services.reviewRepo,
      conversations: services.conversations,
      scheduler: services.scheduler,
      clock: services.clock,
    };
    expect(await seedDemo(deps)).toBe(true);
    expect(await seedDemo(deps)).toBe(false);

    const snapshot = await services.progress.snapshot();
    expect(snapshot.streak).toMatchObject({ days: 14, practisedToday: true, freezes: 2 });
    expect(snapshot.wordsLearned).toBeGreaterThan(30);
    expect(await services.conversations.startedOn(snapshot.today)).toBe(2);
    const cards = await services.reviewRepo.all('es');
    expect(cards).toHaveLength(12);
    expect((await services.review.counts('es')).total).toBeGreaterThan(3);
    expect((await services.progressRepo.xpByDay(addDays(snapshot.today, -13))).length).toBe(14);
  });
});

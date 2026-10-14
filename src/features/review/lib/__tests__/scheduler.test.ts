import { buildQueue, dueCounts, type Queueable } from '../queue';
import {
  createScheduler,
  formatInterval,
  GRADES,
  isDue,
  stateOf,
  type CardSchedule,
} from '../scheduler';

const start = new Date('2026-10-01T09:00:00Z');
const MIN = 60_000;
const DAY = 86_400_000;

describe('scheduler', () => {
  const scheduler = createScheduler();

  it('creates new cards due now', () => {
    const card = scheduler.newSchedule(start);
    expect(stateOf(card)).toBe('new');
    expect(card.due).toBe(start.getTime());
    expect(isDue(card, start)).toBe(true);
    expect(scheduler.retrievability(card, start)).toBeNull();
  });

  it('orders intervals again < hard < good < easy', () => {
    const preview = scheduler.preview(scheduler.newSchedule(start), start);
    const due = GRADES.map((grade) => preview[grade].due);
    expect(due).toEqual([...due].sort((a, b) => a - b));
    expect(preview.again.due - start.getTime()).toBeLessThan(10 * MIN);
    expect(preview.easy.due - start.getTime()).toBeGreaterThanOrEqual(DAY);
  });

  it('graduates a card and grows the interval on success', () => {
    let card = scheduler.review(scheduler.newSchedule(start), 'good', start);
    let now = new Date(card.due);
    card = scheduler.review(card, 'good', now);
    expect(stateOf(card)).toBe('review');
    const first = card.scheduledDays;
    now = new Date(card.due);
    card = scheduler.review(card, 'good', now);
    expect(card.scheduledDays).toBeGreaterThan(first);
    expect(card.reps).toBe(3);
    expect(card.lastReview).toBe(now.getTime());
    const r = scheduler.retrievability(card, now);
    expect(r).toBeGreaterThan(0.9);
  });

  it('sends a forgotten review card to relearning and counts the lapse', () => {
    let card = scheduler.review(scheduler.newSchedule(start), 'easy', start);
    card = scheduler.review(card, 'again', new Date(card.due));
    expect(stateOf(card)).toBe('relearning');
    expect(card.lapses).toBe(1);
  });

  it('is deterministic without fuzz', () => {
    const capped = createScheduler({ maximumIntervalDays: 30 });
    let card = capped.newSchedule(start);
    let now = start;
    for (let i = 0; i < 8; i++) {
      card = capped.review(card, 'good', now);
      now = new Date(card.due);
    }
    // Eight good reviews would reach months uncapped; the cap holds it near 30.
    expect(card.scheduledDays).toBeLessThan(35);
    const again = createScheduler({ maximumIntervalDays: 30 });
    let replay = again.newSchedule(start);
    let t = start;
    for (let i = 0; i < 8; i++) {
      replay = again.review(replay, 'good', t);
      t = new Date(replay.due);
    }
    expect(replay).toEqual(card);
  });

  it('formats intervals compactly', () => {
    expect(formatInterval(10_000)).toBe('<1m');
    expect(formatInterval(10 * MIN)).toBe('10m');
    expect(formatInterval(5 * 60 * MIN)).toBe('5h');
    expect(formatInterval(3 * DAY)).toBe('3d');
    expect(formatInterval(65 * DAY)).toBe('2mo');
    expect(formatInterval(550 * DAY)).toBe('1.5y');
  });
});

describe('queue', () => {
  const s = createScheduler();
  const make = (id: string, schedule: Partial<CardSchedule>, createdAt = 0): Queueable => ({
    id,
    createdAt,
    schedule: { ...s.newSchedule(start), ...schedule },
  });
  const now = new Date(start.getTime() + DAY);

  const cards = [
    make('new-late', {}, 20),
    make('new-early', {}, 10),
    make('review-old', { state: 2, due: start.getTime() - DAY }),
    make('review-new', { state: 2, due: start.getTime() }),
    make('review-future', { state: 2, due: now.getTime() + DAY }),
    make('learning', { state: 1, due: start.getTime() + 5 * MIN }),
    make('relearning', { state: 3, due: start.getTime() + MIN }),
  ];

  it('puts learning first, then reviews by due date, then new cards up to the limit', () => {
    expect(buildQueue(cards, now, 1).map((c) => c.id)).toEqual([
      'relearning',
      'learning',
      'review-old',
      'review-new',
      'new-early',
    ]);
    expect(buildQueue(cards, now, 5, 5).some((c) => c.schedule.state === 0)).toBe(false);
  });

  it('counts what is due', () => {
    expect(dueCounts(cards, now, 10)).toEqual({ new: 2, learning: 2, review: 2, total: 6 });
  });
});

import { isDue, type CardSchedule } from './scheduler';

export type Queueable = { id: string; schedule: CardSchedule; createdAt: number };

export type DueCounts = { new: number; learning: number; review: number; total: number };

/**
 * Today's session order: cards in (re)learning first, because their steps are
 * minutes apart and waiting loses the point of the step; then reviews, most
 * overdue first; then new cards, oldest first, up to the daily limit so a
 * long conversation does not bury tomorrow under fifty new phrases.
 */
export function buildQueue<T extends Queueable>(
  cards: readonly T[],
  now: Date,
  newPerDay: number,
  newSeenToday = 0,
): T[] {
  const due = cards.filter((card) => isDue(card.schedule, now));
  const learning = due
    .filter((card) => card.schedule.state === 1 || card.schedule.state === 3)
    .sort(byDue);
  const review = due.filter((card) => card.schedule.state === 2).sort(byDue);
  const fresh = cards
    .filter((card) => card.schedule.state === 0)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, Math.max(0, newPerDay - newSeenToday));
  return [...learning, ...review, ...fresh];
}

export function dueCounts(
  cards: readonly Queueable[],
  now: Date,
  newPerDay: number,
  newSeenToday = 0,
): DueCounts {
  const queue = buildQueue(cards, now, newPerDay, newSeenToday);
  const counts = { new: 0, learning: 0, review: 0, total: queue.length };
  for (const card of queue) {
    if (card.schedule.state === 0) counts.new++;
    else if (card.schedule.state === 2) counts.review++;
    else counts.learning++;
  }
  return counts;
}

function byDue(a: Queueable, b: Queueable): number {
  return a.schedule.due - b.schedule.due;
}

/**
 * Calendar days as `YYYY-MM-DD` strings in the learner's zone.
 *
 * A streak is about calendar days the learner lived through, not 24-hour
 * windows: a lesson at 23:50 and one at 00:10 are two days, and the 23-hour
 * day when clocks go forward is still one day. Converting an instant to a day
 * key once, at the edge, and doing all arithmetic on keys sidesteps DST.
 */
export type DayKey = string;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function dayKey(instant: Date, timeZone: string): DayKey {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toUtcMidnight(key: DayKey): number {
  const match = DAY_KEY.exec(key);
  if (!match) throw new RangeError(`Not a day key: ${key}`);
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

function fromUtcMidnight(ms: number): DayKey {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDayKey(value: string): value is DayKey {
  return DAY_KEY.test(value);
}

export function addDays(key: DayKey, days: number): DayKey {
  return fromUtcMidnight(toUtcMidnight(key) + days * MS_PER_DAY);
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / MS_PER_DAY);
}

/** 0 = Monday … 6 = Sunday, the ISO convention the weekly chart uses. */
export function isoWeekday(key: DayKey): number {
  return (new Date(toUtcMidnight(key)).getUTCDay() + 6) % 7;
}

export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -isoWeekday(key));
}

export function lastNDays(today: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
}

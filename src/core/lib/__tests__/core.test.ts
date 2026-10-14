import { createManualClock, createSystemClock } from '@/core/clock/Clock';
import { cefrAt, cefrIndex, isCefrLevel, isLanguage } from '@/core/content/languages';
import { AppError, isAppError, toAppError } from '@/core/errors/AppError';

import { editDistance, similarity } from '../editDistance';
import { createIdGenerator, createSequentialIds } from '../id';
import {
  addDays,
  dayKey,
  daysBetween,
  isDayKey,
  isoWeekday,
  lastNDays,
  startOfWeek,
} from '../localDate';
import { createEmitter, createStore } from '../store';

describe('localDate', () => {
  it('derives the calendar day in a zone', () => {
    const instant = new Date('2026-10-14T23:30:00Z');
    expect(dayKey(instant, 'UTC')).toBe('2026-10-14');
    expect(dayKey(instant, 'Europe/Madrid')).toBe('2026-10-15');
    expect(dayKey(instant, 'America/Los_Angeles')).toBe('2026-10-14');
  });

  it('does day arithmetic on keys', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-03-09', '2026-03-07')).toBe(-2);
    expect(isoWeekday('2026-10-12')).toBe(0);
    expect(isoWeekday('2026-10-18')).toBe(6);
    expect(startOfWeek('2026-10-14')).toBe('2026-10-12');
    expect(lastNDays('2026-10-14', 3)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
    expect(isDayKey('2026-10-14')).toBe(true);
    expect(isDayKey('14/10/2026')).toBe(false);
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });
});

describe('clock', () => {
  it('manual clocks move and change zone', () => {
    const clock = createManualClock('2026-10-14T10:00:00Z', 'UTC');
    clock.advance(60_000);
    expect(clock.now().toISOString()).toBe('2026-10-14T10:01:00.000Z');
    clock.set('2026-01-01T00:00:00Z');
    clock.setTimeZone('Asia/Tokyo');
    expect(dayKey(clock.now(), clock.timeZone())).toBe('2026-01-01');
    expect(clock.timeZone()).toBe('Asia/Tokyo');
  });

  it('the system clock reports a zone', () => {
    const clock = createSystemClock();
    expect(typeof clock.timeZone()).toBe('string');
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });
});

describe('editDistance', () => {
  it('counts edits and normalises similarity', () => {
    expect(editDistance('gracias', 'gracia')).toBe(1);
    expect(editDistance('', 'abc')).toBe(3);
    expect(editDistance('abc', '')).toBe(3);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(similarity('', '')).toBe(1);
    expect(similarity('casa', 'casa')).toBe(1);
    expect(similarity('casa', 'perro')).toBeLessThan(0.3);
  });
});

describe('ids', () => {
  it('generates unique prefixed ids', () => {
    const next = createIdGenerator(() => 0.5);
    const ids = new Set(Array.from({ length: 50 }, () => next('card')));
    expect(ids.size).toBe(50);
    expect([...ids][0]).toMatch(/^card_/);
    const seq = createSequentialIds();
    expect([seq('a'), seq('a'), seq('b')]).toEqual(['a_1', 'a_2', 'b_1']);
  });
});

describe('store and emitter', () => {
  it('notifies on change only', () => {
    const store = createStore(1);
    const listener = jest.fn();
    const off = store.subscribe(listener);
    store.set(1);
    store.set((n) => n + 1);
    expect(store.get()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    store.set(3);
    expect(listener).toHaveBeenCalledTimes(1);

    const emitter = createEmitter<string>();
    const heard: string[] = [];
    const stop = emitter.on((e) => heard.push(e));
    emitter.emit('a');
    stop();
    emitter.emit('b');
    expect(heard).toEqual(['a']);
  });
});

describe('content and errors', () => {
  it('guards languages and levels', () => {
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('de')).toBe(false);
    expect(isCefrLevel('B2')).toBe(true);
    expect(isCefrLevel('D1')).toBe(false);
    expect(cefrAt(cefrIndex('B1') + 1)).toBe('B2');
    expect(cefrAt(99)).toBe('C2');
    expect(cefrAt(-3)).toBe('A1');
  });

  it('normalises thrown values into coded errors', () => {
    const coded = new AppError('NOT_FOUND', 'missing');
    expect(toAppError(coded, 'UNKNOWN')).toBe(coded);
    expect(isAppError(coded, 'NOT_FOUND')).toBe(true);
    expect(isAppError(coded, 'UNKNOWN')).toBe(false);
    expect(toAppError(new Error('boom'), 'SPEECH_FAILED').message).toBe('boom');
    expect(toAppError({ message: 'native' }, 'SPEECH_FAILED').message).toBe('native');
    const wrapped = toAppError('plain', 'TUTOR_FAILED', 'Tutor failed');
    expect(wrapped).toMatchObject({
      code: 'TUTOR_FAILED',
      message: 'Tutor failed',
      cause: 'plain',
    });
  });
});

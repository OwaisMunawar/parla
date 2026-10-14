import { createTestDriver } from '@/test-utils/sqliteTestDriver';
import { createTestServices } from '@/test-utils/testServices';

import { clipKey } from '../../../features/demo/lib/clipKey';
import {
  formatReminderTime,
  parseReminderTime,
} from '../../../features/onboarding/data/profileRepository';
import { reminderCopy } from '../../../features/progress/lib/reminder';
import { buildStreakSnapshot } from '../../../features/widget/lib/streakSnapshot';
import { migrate } from '../migrate';
import { migrations } from '../migrations';

describe('migrations', () => {
  it('migrates an empty database to the latest version, once', async () => {
    const db = createTestDriver();
    expect(await migrate(db)).toEqual({ from: 0, to: migrations.length });
    expect(await migrate(db)).toEqual({ from: migrations.length, to: migrations.length });
    const tables = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'activities',
        'conversations',
        'entitlement',
        'messages',
        'profile',
        'review_cards',
        'streak',
      ]),
    );
    db.close();
  });

  it('rolls back a failing migration and rejects gaps', async () => {
    const db = createTestDriver();
    await expect(
      migrate(db, [
        { version: 1, name: 'broken', statements: ['CREATE TABLE ok (id INTEGER)', 'NOT SQL'] },
      ]),
    ).rejects.toMatchObject({ code: 'DB_MIGRATION_FAILED' });
    expect(await db.query("SELECT name FROM sqlite_master WHERE name = 'ok'")).toEqual([]);
    await expect(migrate(db, [{ version: 2, name: 'gap', statements: [] }])).rejects.toMatchObject({
      code: 'DB_MIGRATION_FAILED',
    });
  });
});

describe('repositories', () => {
  it('saves and updates the profile', async () => {
    const services = await createTestServices();
    const updated = await services.profiles.update({ level: 'B1', reminderTime: null }, 2);
    expect(updated).toMatchObject({ level: 'B1', reminderTime: null, goal: 'travel' });
    expect(await services.profiles.get()).toEqual(updated);

    const empty = await createTestServices({ profile: null });
    expect(await empty.profiles.update({ level: 'B1' }, 2)).toBeNull();
    await empty.db.run(
      "INSERT INTO profile (id, language, goal, cefr_level, daily_goal_xp, created_at) VALUES (1, 'es', 'surfing', 'A1', 20, 0)",
    );
    expect((await empty.profiles.get())?.goal).toBe('conversation');
  });

  it('round-trips messages and drops corrupt corrections', async () => {
    const services = await createTestServices();
    const id = await services.conversations.start({
      scenarioId: 'cafe',
      language: 'es',
      day: '2026-10-14',
      at: 1,
    });
    await services.conversations.addMessage(id, {
      role: 'learner',
      text: 'una café',
      translation: null,
      corrections: [
        { original: 'una café', corrected: 'un café', explanation: 'x', type: 'gender' },
      ],
      createdAt: 2,
    });
    await services.db.run('UPDATE messages SET corrections = \'[{"bad":1}]\' WHERE position = 0');
    await services.conversations.addMessage(id, {
      role: 'tutor',
      text: 'Claro',
      translation: 'Sure',
      corrections: [],
      createdAt: 3,
    });
    await services.db.run("UPDATE messages SET corrections = 'not json' WHERE position = 1");
    const messages = await services.conversations.messages(id);
    expect(messages.map((m) => m.corrections)).toEqual([[], []]);
    expect((await services.conversations.recent())[0]).toMatchObject({
      id,
      turns: 1,
      endedAt: null,
    });
  });

  it('stores entitlement, vocabulary and activity totals', async () => {
    const services = await createTestServices();
    expect(await services.progressRepo.totalXp()).toBe(0);
    expect(
      await services.progressRepo.addVocabulary(
        'es',
        [
          { term: ' Hola ', meaning: 'hi' },
          { term: 'hola', meaning: 'hi' },
        ],
        1,
      ),
    ).toBe(1);
    expect(await services.progressRepo.wordsLearned('es')).toBe(1);
  });
});

describe('reminders, widget and clips', () => {
  const view = {
    days: 14,
    practisedToday: false,
    atRisk: true,
    freezes: 1,
    protectedTonight: true,
  };

  it('parses and formats reminder times', () => {
    expect(parseReminderTime('19:30')).toEqual({ hour: 19, minute: 30 });
    expect(parseReminderTime('24:00')).toBeNull();
    expect(parseReminderTime(null)).toBeNull();
    expect(formatReminderTime(7, 5)).toBe('07:05');
  });

  it('writes reminder copy from the streak', () => {
    expect(reminderCopy(view, 'Spanish', 4)).toEqual({
      title: 'Keep your 14-day streak',
      body: 'Two minutes of Spanish and 4 phrases to review.',
    });
    expect(reminderCopy(view, 'Spanish', 0).body).toBe('A two-minute conversation keeps it alive.');
    expect(reminderCopy({ ...view, days: 0 }, 'French', 0).title).toBe('Time for a little French');
  });

  it('builds the widget snapshot for each state', () => {
    const base = { dueReviews: 3, goalFraction: 1.4, languageName: 'ES' };
    expect(buildStreakSnapshot({ ...base, streak: view })).toMatchObject({
      streak: 14,
      goal: 1,
      caption: 'Freeze ready tonight',
    });
    expect(
      buildStreakSnapshot({ ...base, streak: { ...view, protectedTonight: false } }).caption,
    ).toBe('Speak today to keep it');
    expect(
      buildStreakSnapshot({ ...base, streak: { ...view, practisedToday: true } }).caption,
    ).toBe('3 to review');
    expect(
      buildStreakSnapshot({ ...base, dueReviews: 0, streak: { ...view, practisedToday: true } })
        .caption,
    ).toBe('Done for today');
    expect(
      buildStreakSnapshot({ ...base, goalFraction: -1, streak: { ...view, days: 0 } }),
    ).toMatchObject({
      goal: 0,
      caption: 'Start a streak today',
    });
  });

  it('names clips after what they say', () => {
    expect(clipKey('es', '¿Dónde está la estación?')).toBe('es/donde-esta-la-estacion');
  });
});

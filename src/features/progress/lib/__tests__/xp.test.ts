import {
  addLevelPoints,
  daysOnGoal,
  goalProgress,
  levelProgress,
  POINTS_PER_LEVEL,
  weeklyXp,
  XP,
} from '../xp';

describe('xp', () => {
  it('scales drill XP with the score and never awards zero', () => {
    expect(XP.drill(92)).toBe(9);
    expect(XP.drill(0)).toBe(1);
  });

  it('builds a zero-filled week ending today', () => {
    const week = weeklyXp(
      [
        { day: '2026-10-14', xp: 20 },
        { day: '2026-10-14', xp: 5 },
        { day: '2026-10-09', xp: 40 },
        { day: '2026-10-01', xp: 99 },
      ],
      '2026-10-14',
    );
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ day: '2026-10-08', xp: 0 });
    expect(week[1]).toEqual({ day: '2026-10-09', xp: 40 });
    expect(week[6]).toEqual({ day: '2026-10-14', xp: 25 });
    expect(daysOnGoal(week, 30)).toBe(1);
  });

  it('clamps goal progress', () => {
    expect(goalProgress(15, 30)).toBe(0.5);
    expect(goalProgress(90, 30)).toBe(1);
    expect(goalProgress(5, 0)).toBe(1);
  });
});

describe('CEFR level progress', () => {
  it('reports progress towards the next band', () => {
    expect(levelProgress('A2', POINTS_PER_LEVEL / 2)).toEqual({
      level: 'A2',
      next: 'B1',
      fraction: 0.5,
    });
    expect(levelProgress('C2', 100)).toEqual({ level: 'C2', next: null, fraction: 1 });
  });

  it('promotes when points overflow a band', () => {
    expect(addLevelPoints('A1', 550, 100)).toEqual({ level: 'A2', points: 50 });
    expect(addLevelPoints('A1', 0, 2 * POINTS_PER_LEVEL)).toEqual({ level: 'B1', points: 0 });
    expect(addLevelPoints('C1', 590, 10)).toEqual({ level: 'C2', points: 0 });
    expect(addLevelPoints('A2', 10, -5)).toEqual({ level: 'A2', points: 10 });
  });

  it('lets the tutor estimate promote early but never demote', () => {
    expect(addLevelPoints('A2', 100, 10, 'B2')).toEqual({ level: 'B1', points: 0 });
    expect(addLevelPoints('B1', 100, 10, 'A1')).toEqual({ level: 'B1', points: 110 });
  });
});

import {
  scorePlacement,
  SPEAKING_PASS,
  type PlacementAnswer,
  type PlacementQuestion,
} from '../placement';

const questions: PlacementQuestion[] = [
  {
    id: 'l1',
    kind: 'listening',
    level: 'A1',
    audioText: 'hola',
    options: ['a', 'b'],
    answerIndex: 0,
  },
  { id: 's1', kind: 'speaking', level: 'A1', sentence: 'Hola', translation: 'Hi' },
  { id: 'l2', kind: 'listening', level: 'A2', audioText: 'x', options: ['a', 'b'], answerIndex: 1 },
  { id: 's3', kind: 'speaking', level: 'B1', sentence: 'x', translation: 'x' },
  { id: 'l4', kind: 'listening', level: 'B2', audioText: 'x', options: ['a', 'b'], answerIndex: 0 },
];

const all = (overrides: Record<string, PlacementAnswer> = {}): PlacementAnswer[] =>
  [
    { questionId: 'l1', kind: 'listening', chosenIndex: 0 },
    { questionId: 's1', kind: 'speaking', score: 90 },
    { questionId: 'l2', kind: 'listening', chosenIndex: 1 },
    { questionId: 's3', kind: 'speaking', score: 80 },
    { questionId: 'l4', kind: 'listening', chosenIndex: 0 },
  ].map((answer) => overrides[answer.questionId] ?? (answer as PlacementAnswer));

describe('scorePlacement', () => {
  it('places a learner who passes everything at B2', () => {
    const result = scorePlacement(questions, all());
    expect(result.level).toBe('B2');
    expect(result.correct).toBe(5);
    expect(result.ladder.map((r) => r.level)).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('stops the ladder at the first level not passed', () => {
    const result = scorePlacement(
      questions,
      all({ l2: { questionId: 'l2', kind: 'listening', chosenIndex: 0 } }),
    );
    expect(result.level).toBe('A1');
    expect(result.ladder.find((r) => r.level === 'B2')?.passed).toBe(true);
  });

  it('gives partial credit for a close speaking attempt', () => {
    const close = scorePlacement(
      questions,
      all({ s1: { questionId: 's1', kind: 'speaking', score: SPEAKING_PASS - 10 } }),
    );
    expect(close.ladder[0]?.credit).toBeCloseTo((1 + 0.36) / 2);
    expect(close.ladder[0]?.passed).toBe(true);
  });

  it('places a beginner who skips everything at A1', () => {
    const skipped = questions.map((q) => ({ questionId: q.id, kind: 'skipped' }) as const);
    expect(scorePlacement(questions, skipped)).toMatchObject({ level: 'A1', correct: 0 });
    expect(scorePlacement(questions, []).level).toBe('A1');
  });

  it('gives no credit for an answer of the wrong kind', () => {
    const mismatched = all({ l1: { questionId: 'l1', kind: 'speaking', score: 100 } });
    expect(scorePlacement(questions, mismatched).ladder[0]?.credit).toBe(0.5);
  });
});

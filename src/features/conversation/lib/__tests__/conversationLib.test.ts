import { findScenario, rulesFor, scenariosFor } from '../../content';
import {
  estimateLevel,
  findCorrections,
  markCorrections,
  scriptedReply,
  wholeWords,
} from '../scriptedTurn';
import { createEventDecoder, encodeEvent, settle } from '../turnStream';
import { tutorReplySchema, tutorTurnRequestSchema } from '../tutorContract';

const cafe = findScenario('es', 'cafe')!;

describe('scripted tutor turns', () => {
  it('spots the scripted mistake and moves to the next step', () => {
    const reply = scriptedReply({
      scenario: cafe,
      turnIndex: 0,
      learnerText: 'hola quiero una café con leche por favor',
      level: 'A1',
      languageRules: rulesFor('es'),
    });
    expect(reply.corrections).toEqual([
      expect.objectContaining({ original: 'una café', corrected: 'un café', type: 'gender' }),
    ]);
    expect(reply.reply).toBe(cafe.steps[1]!.tutor);
    expect(reply.done).toBe(false);
    expect(tutorReplySchema.parse(reply)).toEqual(reply);
  });

  it('closes the scenario after the last step', () => {
    const reply = scriptedReply({
      scenario: cafe,
      turnIndex: cafe.steps.length - 1,
      learnerText: 'para llevar puedo pagar con tarjeta',
      level: 'A1',
      languageRules: [],
    });
    expect(reply.done).toBe(true);
    expect(reply.reply).toBe(cafe.closing.tutor);
    expect(reply.corrections).toEqual([]);
  });

  it('applies language-wide rules with capture groups, once per fragment', () => {
    const corrections = findCorrections(
      'Yo soy veintiocho años y yo soy veintiocho años',
      rulesFor('es'),
    );
    expect(corrections).toHaveLength(1);
    expect(corrections[0]).toMatchObject({
      original: 'Yo soy veintiocho años',
      corrected: 'tengo veintiocho años',
    });
    expect(findCorrections('je suis vingt-huit ans', rulesFor('fr'))[0]?.corrected).toBe(
      "j'ai vingt-huit ans",
    );
    expect(findCorrections('sono 30 anni', rulesFor('it'))[0]?.corrected).toBe('ho 30 anni');
    // Whole words only, accents included: "unacafé" and "una cafés" are not matches.
    expect(wholeWords('una café').test('una cafés')).toBe(false);
    expect(wholeWords('una café').test('quiero una café.')).toBe(true);
  });

  it('nudges the level estimate from one utterance', () => {
    expect(estimateLevel('hola', 2, 'A2')).toBe('A1');
    expect(estimateLevel('uno dos tres cuatro cinco seis siete ocho nueve diez', 0, 'A2')).toBe(
      'B1',
    );
    expect(estimateLevel('hola amigo', 0, 'A2')).toBe('A2');
  });

  it('marks corrections in the learner line, ignoring overlaps and misses', () => {
    const corrections = [
      { original: 'una café', corrected: 'un café', explanation: 'x', type: 'gender' as const },
      {
        original: 'café con',
        corrected: 'café y',
        explanation: 'overlap',
        type: 'grammar' as const,
      },
      { original: 'nowhere', corrected: 'x', explanation: 'x', type: 'grammar' as const },
    ];
    const segments = markCorrections('Quiero una café con leche', corrections);
    expect(segments.map((s) => [s.text, s.correction?.corrected ?? null])).toEqual([
      ['Quiero ', null],
      ['una café', 'un café'],
      [' con leche', null],
    ]);
    expect(markCorrections('una café', corrections.slice(0, 1))).toHaveLength(1);
  });

  it('ships three scenarios per language, each valid for the server contract', () => {
    for (const language of ['es', 'fr', 'it'] as const) {
      const scenarios = scenariosFor(language);
      expect(scenarios.map((s) => s.id).sort()).toEqual(['cafe', 'directions', 'interview']);
      for (const scenario of scenarios) {
        expect(
          tutorTurnRequestSchema.safeParse({
            language,
            level: scenario.level,
            scenario: {
              id: scenario.id,
              title: scenario.title,
              goal: scenario.goal,
              tutorRole: scenario.tutorRole,
            },
            history: [],
            learnerText: scenario.steps[0]!.demoUtterance,
          }).success,
        ).toBe(true);
        for (const step of scenario.steps) {
          for (const rule of step.rules) expect(() => wholeWords(rule.pattern)).not.toThrow();
        }
      }
    }
    expect(findScenario('es', 'nope')).toBeUndefined();
  });
});

describe('turn stream', () => {
  const final = {
    type: 'final' as const,
    turn: {
      reply: 'Hola',
      translation: 'Hi',
      corrections: [],
      newVocabulary: [],
      cefrEstimate: 'A1' as const,
      done: false,
    },
  };

  it('decodes events split across arbitrary chunk boundaries', () => {
    const wire = encodeEvent({ type: 'partial', reply: 'Ho' }) + encodeEvent(final);
    const decoder = createEventDecoder();
    const events = [...wire.slice(0, 7), wire.slice(7, 40), wire.slice(40)].flatMap((chunk) =>
      decoder.push(chunk),
    );
    expect([...events, ...decoder.end()].map((e) => e.type)).toEqual(['partial', 'final']);
  });

  it('skips blank, malformed and unknown lines', () => {
    const decoder = createEventDecoder();
    expect(decoder.push('\n{bad json}\n{"type":"mystery"}\n')).toEqual([]);
    expect(decoder.push('{"type":"error","message":"x"}')).toEqual([]);
    expect(decoder.end()).toEqual([{ type: 'error', message: 'x' }]);
  });

  it('settles to the first final or error and reports partials', () => {
    const partials: string[] = [];
    expect(
      settle([{ type: 'partial', reply: 'Ho' }, final], (p) => p.reply && partials.push(p.reply)),
    ).toEqual({
      ok: true,
      turn: final.turn,
    });
    expect(partials).toEqual(['Ho']);
    expect(settle([{ type: 'error', message: 'down' }])).toEqual({ ok: false, message: 'down' });
    expect(settle([{ type: 'partial' }])).toBeNull();
  });
});

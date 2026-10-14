import { type Recognition } from '@/core/speech/SpeechRecognizer';

import { alignWords } from '../alignment';
import { heardTokens, sameWords, scorePronunciation, usableConfidence } from '../score';
import { normaliseWord, tokenize } from '../tokenize';

const heard = (transcript: string, confidence: number | null = 0.95): Recognition => ({
  transcript,
  confidence,
  words: [],
});

describe('tokenize', () => {
  it('drops edge punctuation, keeps elision and accents', () => {
    expect(tokenize('¿Dónde está la estación?').map((t) => t.display)).toEqual([
      'Dónde',
      'está',
      'la',
      'estación',
    ]);
    expect(tokenize("J’ai bu l'eau.").map((t) => t.exact)).toEqual(["j'ai", 'bu', "l'eau"]);
    expect(normaliseWord('Está')).toEqual({ exact: 'está', loose: 'esta' });
    expect(tokenize('  ¡ !  ')).toEqual([]);
  });
});

describe('alignWords', () => {
  const align = (a: string, b: string) => alignWords(tokenize(a), tokenize(b)).map((op) => op.kind);

  it('matches identical sentences', () => {
    expect(align('un café con leche', 'un café con leche')).toEqual([
      'match',
      'match',
      'match',
      'match',
    ]);
  });

  it('reports a substitution, not a miss plus an extra', () => {
    expect(align('un café con leche', 'un café con lecho')).toEqual([
      'match',
      'match',
      'match',
      'substitution',
    ]);
  });

  it('finds the missed word even when a neighbour is also wrong', () => {
    // "gracia" must pair with "gracias", leaving "muchas" as the miss.
    const ops = alignWords(tokenize('muchas gracias señor'), tokenize('gracia señor'));
    expect(ops.map((op) => op.kind)).toEqual(['missed', 'substitution', 'match']);
  });

  it('marks extra words and handles empty input', () => {
    expect(align('hola', 'hola hola').sort()).toEqual(['extra', 'match']);
    expect(align('hola amigo', 'hola amigo bueno')).toEqual(['match', 'match', 'extra']);
    expect(align('hola amigo', '')).toEqual(['missed', 'missed']);
    expect(align('', 'hola')).toEqual(['extra']);
  });

  it('treats an accent-only difference as an inexact match', () => {
    const [op] = alignWords(tokenize('está'), tokenize('esta'));
    expect(op).toEqual({ kind: 'match', targetIndex: 0, heardIndex: 0, exact: false });
  });
});

describe('scorePronunciation', () => {
  it('scores a clean attempt as great', () => {
    const result = scorePronunciation(
      'Quiero un café, por favor.',
      heard('quiero un café por favor'),
    );
    expect(result.overall).toBe(98);
    expect(result.verdict).toBe('great');
    expect(result.words.every((w) => w.verdict === 'good' && w.reason === 'clear')).toBe(true);
  });

  it('colours a near miss, a missed word and an extra', () => {
    const result = scorePronunciation('muchas gracias señor', heard('gracia señor bueno', null));
    expect(result.words.map((w) => [w.word, w.verdict, w.reason])).toEqual([
      ['muchas', 'missed', 'not-heard'],
      ['gracias', 'close', 'near-miss'],
      ['señor', 'good', 'clear'],
    ]);
    expect(result.extras).toEqual(['bueno']);
    expect(result.verdict).toBe('keep-practising');
  });

  it('marks unrelated words as different and accents as close', () => {
    const result = scorePronunciation('perro está', heard('gato esta', null));
    expect(result.words[0]).toMatchObject({ verdict: 'missed', reason: 'different-word' });
    expect(result.words[1]).toMatchObject({ verdict: 'good', reason: 'accent', score: 0.8 });
  });

  it('uses per-word segment confidence when the platform gives it', () => {
    const result = scorePronunciation('buenos días', {
      transcript: 'buenos días',
      confidence: 0.9,
      words: [
        { text: 'buenos', confidence: 0.95 },
        { text: 'días', confidence: 0.3 },
      ],
    });
    expect(result.words[0]?.reason).toBe('clear');
    expect(result.words[1]).toMatchObject({ reason: 'low-confidence', verdict: 'close' });
  });

  it('scores nothing heard as zero', () => {
    expect(scorePronunciation('hola', heard('')).overall).toBe(0);
    expect(scorePronunciation('', heard('hola')).overall).toBe(0);
  });

  it('ignores unusable confidences', () => {
    expect(usableConfidence(-1)).toBeNull();
    expect(usableConfidence(0)).toBeNull();
    expect(usableConfidence(undefined)).toBeNull();
    expect(usableConfidence(Number.NaN)).toBeNull();
    expect(usableConfidence(1.4)).toBe(1);
    expect(heardTokens(heard('Hola amigo', 0)).every((t) => t.confidence === null)).toBe(true);
  });

  it('compares answers word for word, ignoring case, punctuation and accents', () => {
    expect(sameWords('¿Dónde está?', 'donde esta')).toBe(true);
    expect(sameWords('un café', 'una café')).toBe(false);
    expect(sameWords('un café', 'un')).toBe(false);
  });
});

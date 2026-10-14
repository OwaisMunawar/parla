/**
 * Words as the learner sees them and as the aligner compares them.
 *
 * Punctuation around a word is dropped (¿Dónde? and dónde are the same word),
 * but apostrophes and hyphens inside one are kept: French elision ("l'eau",
 * "j'ai") and Italian ("un'altra") are single spoken units, and recognisers
 * return them that way.
 */
export type Token = {
  /** Original spelling, for display. */
  display: string;
  /** Lower-cased, typographic apostrophes folded, diacritics kept. */
  exact: string;
  /** `exact` with diacritics removed, for "right word, wrong accent" matches. */
  loose: string;
};

const EDGE_PUNCTUATION = /^[\s"'“”‘’«»¿¡(.,;:!?…)\]-]+|[\s"'“”‘’«»¿¡(.,;:!?…)\]-]+$/gu;
const APOSTROPHES = /[’‘`´]/g;
const DIACRITICS = /\p{M}/gu;

export function normaliseWord(word: string): { exact: string; loose: string } {
  const exact = word.replace(APOSTROPHES, "'").replace(EDGE_PUNCTUATION, '').toLocaleLowerCase();
  const loose = exact.normalize('NFD').replace(DIACRITICS, '');
  return { exact, loose };
}

export function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .map((display) => ({
      display: display.replace(EDGE_PUNCTUATION, ''),
      ...normaliseWord(display),
    }))
    .filter((token) => token.exact.length > 0);
}

import { en, type Dictionary } from './en';

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

type StripPlural<K extends string> = K extends `${infer Base}_one` | `${infer Base}_other`
  ? Base
  : K;

/** Every valid key, with plural pairs addressed by their base name. */
export type TranslationKey = StripPlural<Leaves<Dictionary>>;

export type TranslationParams = Record<string, string | number>;

function lookup(dictionary: unknown, path: string): string | undefined {
  let node: unknown = dictionary;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Keys are checked at compile time, so a typo is a type error rather than a
 * raw key on screen. A missing translation in another locale falls back to
 * English, then to the key itself.
 */
export function createTranslator(dictionary: unknown = en, locale = 'en') {
  // Hermes ships without Intl.PluralRules. English, Spanish, French and
  // Italian UI copy only needs one/other, which this fallback covers.
  const plurals =
    typeof Intl.PluralRules === 'function'
      ? new Intl.PluralRules(locale)
      : { select: (n: number) => (n === 1 ? 'one' : 'other') };
  return function t(key: TranslationKey, params: TranslationParams = {}): string {
    let template: string | undefined;
    if (typeof params.count === 'number') {
      const form = plurals.select(params.count);
      template =
        lookup(dictionary, `${key}_${form}`) ??
        lookup(dictionary, `${key}_other`) ??
        lookup(en, `${key}_${form}`) ??
        lookup(en, `${key}_other`);
    }
    template ??= lookup(dictionary, key) ?? lookup(en, key) ?? key;
    return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
      params[name] === undefined ? `{{${name}}}` : String(params[name]),
    );
  };
}

export const t = createTranslator();

export const LANGUAGES = ['es', 'fr', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

type LanguageInfo = {
  /** BCP-47 tag handed to the recogniser and to TTS. */
  locale: string;
  /** Endonym, shown in the picker next to the English name. */
  nativeName: string;
  /** Short code for the badge; flags are not languages. */
  badge: string;
};

export const languageInfo: Record<Language, LanguageInfo> = {
  es: { locale: 'es-ES', nativeName: 'Español', badge: 'ES' },
  fr: { locale: 'fr-FR', nativeName: 'Français', badge: 'FR' },
  it: { locale: 'it-IT', nativeName: 'Italiano', badge: 'IT' },
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function isCefrLevel(value: unknown): value is CefrLevel {
  return typeof value === 'string' && (CEFR_LEVELS as readonly string[]).includes(value);
}

export function cefrIndex(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function cefrAt(index: number): CefrLevel {
  const clamped = Math.max(0, Math.min(CEFR_LEVELS.length - 1, Math.trunc(index)));
  return CEFR_LEVELS[clamped] ?? 'A1';
}

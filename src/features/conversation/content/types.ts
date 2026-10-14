import { type CefrLevel, type Language } from '@/core/content/languages';

import { type CorrectionType, type VocabularyItem } from '../lib/tutorContract';

/**
 * A mistake the scripted tutor can spot. `pattern` runs case-insensitively
 * on what the recogniser heard; recognisers drop punctuation and capitals, so
 * patterns never depend on them. They match whole words (see `wholeWords`).
 */
export type ScriptedRule = {
  pattern: string;
  /** Replacement for the matched fragment; `$1` refers to capture groups. */
  corrected: string;
  explanation: string;
  type: CorrectionType;
};

export type ScriptStep = {
  tutor: string;
  translation: string;
  /** English nudge shown under the talk button. */
  hint: string;
  /**
   * What the demo learner says, mistakes included. It is the text of the
   * bundled audio clip for this step and the scripted recogniser's output.
   */
  demoUtterance: string;
  vocabulary: VocabularyItem[];
  rules: ScriptedRule[];
};

export type ScenarioIcon = 'cup' | 'briefcase' | 'map';

export type Scenario = {
  id: string;
  language: Language;
  icon: ScenarioIcon;
  level: CefrLevel;
  title: string;
  subtitle: string;
  goal: string;
  tutorRole: string;
  steps: ScriptStep[];
  closing: { tutor: string; translation: string };
};

import { type Language } from '@/core/content/languages';

import { spanishRules, spanishScenarios } from './es';
import { frenchRules, frenchScenarios } from './fr';
import { italianRules, italianScenarios } from './it';
import { type Scenario, type ScriptedRule } from './types';

export type { Scenario, ScriptedRule, ScriptStep, ScenarioIcon } from './types';

const scenarios: Record<Language, Scenario[]> = {
  es: spanishScenarios,
  fr: frenchScenarios,
  it: italianScenarios,
};

const languageRules: Record<Language, ScriptedRule[]> = {
  es: spanishRules,
  fr: frenchRules,
  it: italianRules,
};

export function scenariosFor(language: Language): Scenario[] {
  return scenarios[language];
}

export function findScenario(language: Language, id: string): Scenario | undefined {
  return scenarios[language].find((scenario) => scenario.id === id);
}

export function rulesFor(language: Language): ScriptedRule[] {
  return languageRules[language];
}

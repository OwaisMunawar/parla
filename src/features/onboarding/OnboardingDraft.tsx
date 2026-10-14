import { createContext, use, useMemo, useState, type ReactNode } from 'react';

import { type CefrLevel, type Language } from '@/core/content/languages';

import { type LearningGoal } from './data/profileRepository';

export type OnboardingDraft = {
  language: Language;
  goal: LearningGoal;
  level: CefrLevel;
  dailyGoalXp: number;
  reminderTime: string | null;
};

const initial: OnboardingDraft = {
  language: 'es',
  goal: 'conversation',
  level: 'A1',
  dailyGoalXp: 40,
  reminderTime: '19:30',
};

type DraftApi = { draft: OnboardingDraft; update: (patch: Partial<OnboardingDraft>) => void };

const DraftContext = createContext<DraftApi | null>(null);

/** Answers collected across the onboarding steps, saved once at the end. */
export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initial);
  const api = useMemo(
    () => ({
      draft,
      update: (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch })),
    }),
    [draft],
  );
  return <DraftContext value={api}>{children}</DraftContext>;
}

export function useOnboardingDraft(): DraftApi {
  const api = use(DraftContext);
  if (!api) throw new Error('useOnboardingDraft must be used inside OnboardingDraftProvider');
  return api;
}

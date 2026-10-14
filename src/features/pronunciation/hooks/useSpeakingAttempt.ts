import { useEffect, useState } from 'react';

import { useServices } from '@/composition/ServicesProvider';
import { useStore } from '@/core/hooks/useStore';

import { createSpeakingAttempt } from '../engine/speakingAttempt';

export function useSpeakingAttempt(locale: string) {
  const { recognizer } = useServices();
  const [attempt] = useState(() => createSpeakingAttempt(recognizer));
  useEffect(() => {
    void attempt.prepare(locale);
    return () => attempt.dispose();
  }, [attempt, locale]);
  return { attempt, state: useStore(attempt.state) };
}

import * as Speech from 'expo-speech';

import { type Speaker } from './Speaker';

/**
 * expo-speech with a per-language voice. iOS ships compact voices by
 * default and enhanced ones on request; picking the best installed voice for
 * the locale is the difference between a tutor and a train announcement.
 */
export function createNativeSpeaker(): Speaker {
  const voices = new Map<string, Promise<string | undefined>>();

  const voiceFor = (locale: string) => {
    let pending = voices.get(locale);
    if (!pending) {
      pending = Speech.getAvailableVoicesAsync()
        .then((all) => {
          const language = locale.slice(0, 2).toLowerCase();
          const candidates = all.filter((v) => v.language.toLowerCase().startsWith(language));
          const exact = candidates.filter((v) => v.language.toLowerCase() === locale.toLowerCase());
          const pool = exact.length > 0 ? exact : candidates;
          const enhanced = pool.find((v) => v.quality === Speech.VoiceQuality.Enhanced);
          return (enhanced ?? pool[0])?.identifier;
        })
        .catch(() => undefined);
      voices.set(locale, pending);
    }
    return pending;
  };

  return {
    speak(text, locale, options) {
      void voiceFor(locale).then((voice) => {
        Speech.stop();
        Speech.speak(text, {
          language: locale,
          voice,
          rate: options?.rate ?? 0.95,
          onDone: options?.onDone,
          onStopped: options?.onDone,
          onError: options?.onDone,
        });
      });
    },
    stop: () => Speech.stop(),
  };
}

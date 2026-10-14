/** Text to speech for the tutor's lines and listening prompts. */
export interface Speaker {
  speak(text: string, locale: string, options?: { rate?: number; onDone?: () => void }): void;
  stop(): void;
}

/** Silent speaker for tests and for screenshot runs where audio is noise. */
export function createSilentSpeaker(): Speaker & { spoken: string[] } {
  const spoken: string[] = [];
  return {
    spoken,
    speak(text, _locale, options) {
      spoken.push(text);
      options?.onDone?.();
    },
    stop() {},
  };
}

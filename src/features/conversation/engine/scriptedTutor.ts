import { AppError } from '@/core/errors/AppError';

import { findScenario, rulesFor } from '../content';
import { scriptedReply } from '../lib/scriptedTurn';
import { type Tutor } from './Tutor';

/**
 * Deterministic tutor for demo mode and tests. A small delay and a streamed
 * partial make it behave like the real one, so the UI states (thinking,
 * streaming, done) are exercised the same way in both.
 */
export function createScriptedTutor(options: { latencyMs?: number } = {}): Tutor {
  const latency = options.latencyMs ?? 450;
  return {
    kind: 'scripted',
    async reply(request, { signal, onPartial } = {}) {
      const scenario = findScenario(request.language, request.scenario.id);
      if (!scenario) {
        throw new AppError('NOT_FOUND', `No script for ${request.language}/${request.scenario.id}`);
      }
      const result = scriptedReply({
        scenario,
        turnIndex: request.turnIndex,
        learnerText: request.learnerText,
        level: request.level,
        languageRules: rulesFor(request.language),
      });

      await wait(latency / 2, signal);
      const words = result.reply.split(' ');
      onPartial?.({ reply: words.slice(0, Math.ceil(words.length / 2)).join(' ') });
      await wait(latency / 2, signal);
      return result;
    },
  };
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AppError('CANCELLED', 'Tutor turn cancelled'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new AppError('CANCELLED', 'Tutor turn cancelled'));
      },
      { once: true },
    );
  });
}

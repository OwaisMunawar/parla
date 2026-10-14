import { AppError } from '@/core/errors/AppError';
import { type RecognitionListener, type SpeechRecognizer } from '@/core/speech/SpeechRecognizer';
import { createTestServices, type TestServices } from '@/test-utils/testServices';

import { conversationQuota } from '../../../billing/lib/quota';
import { findScenario } from '../../content';
import { createConversationSession } from '../conversationSession';
import { type Tutor } from '../Tutor';

const cafe = findScenario('es', 'cafe')!;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A recogniser the test drives by hand. */
function manualRecognizer() {
  let listener: RecognitionListener | null = null;
  const recognizer: SpeechRecognizer & {
    say(text: string): void;
    fail(code: AppError['code']): void;
    permission: boolean;
  } = {
    kind: 'on-device',
    permission: true,
    prepare: async () => ({ available: true, kind: 'on-device' }),
    requestPermission: async () => recognizer.permission,
    start(_request, next) {
      listener = next;
      return {
        stop: () => undefined,
        abort: () => listener?.onError(new AppError('CANCELLED', 'x')),
      };
    },
    say(text) {
      listener?.onVolume?.(0.5);
      listener?.onInterim?.(text.split(' ')[0] ?? '');
      listener?.onFinal({ transcript: text, confidence: 0.9, words: [] });
    },
    fail(code) {
      listener?.onError(new AppError(code, code));
    },
  };
  return recognizer;
}

async function setup(options: { tutor?: Tutor; startedToday?: number } = {}) {
  const services = await createTestServices();
  const recognizer = manualRecognizer();
  const onChange = jest.fn();
  const session = createConversationSession({
    scenario: cafe,
    language: 'es',
    level: 'A2',
    recognizer,
    tutor: options.tutor ?? services.tutor,
    speaker: services.speaker,
    conversations: services.conversations,
    progressRepo: services.progressRepo,
    progress: services.progress,
    review: services.review,
    clock: services.clock,
    quota: async () =>
      conversationQuota({ hasPro: false, startedToday: options.startedToday ?? 0 }),
    onChange,
  });
  return { services, recognizer, session, onChange };
}

async function speak(
  session: ReturnType<typeof createConversationSession>,
  recognizer: ReturnType<typeof manualRecognizer>,
  text: string,
) {
  await session.pressIn();
  recognizer.say(text);
  for (let i = 0; i < 10; i++) await flush();
}

describe('conversation session', () => {
  let s: Awaited<ReturnType<typeof setup>>;
  let services: TestServices;
  beforeEach(async () => {
    s = await setup();
    services = s.services;
  });

  it('opens with the tutor line, spoken, before anything counts against the quota', async () => {
    await s.session.begin();
    const state = s.session.state.get();
    expect(state.messages.map((m) => m.role)).toEqual(['tutor']);
    expect(services.speaker.spoken).toEqual([cafe.steps[0]!.tutor]);
    expect(state.phase).toBe('idle');
    expect(await services.conversations.startedOn('2026-10-14')).toBe(0);
  });

  it('runs a turn: transcript, corrections, tutor reply, XP and persistence', async () => {
    await s.session.begin();
    await speak(s.session, s.recognizer, 'hola quiero una café con leche');

    const state = s.session.state.get();
    expect(state.messages.map((m) => m.role)).toEqual(['tutor', 'learner', 'tutor']);
    expect(state.messages[1]!.corrections[0]?.corrected).toBe('un café');
    expect(state.turn).toBe(1);
    expect(state.xp).toBe(5);
    expect(state.phase).toBe('idle');
    expect(s.onChange).toHaveBeenCalled();
    expect(await services.conversations.startedOn('2026-10-14')).toBe(1);
    const [summary] = await services.conversations.recent();
    expect((await services.conversations.messages(summary!.id)).map((m) => m.role)).toEqual([
      'tutor',
      'learner',
      'tutor',
    ]);
    expect(await services.progressRepo.wordsLearned('es')).toBe(1);
  });

  it('finishes the scenario with the completion bonus', async () => {
    await s.session.begin();
    for (const step of cafe.steps) await speak(s.session, s.recognizer, step.demoUtterance);
    const state = s.session.state.get();
    expect(state.phase).toBe('done');
    expect(state.xp).toBe(cafe.steps.length * 5 + 10);
    expect((await services.conversations.recent())[0]?.endedAt).not.toBeNull();
    await s.session.pressIn();
    expect(s.session.state.get().phase).toBe('done');
  });

  it('saves a correction to review once', async () => {
    await s.session.begin();
    await speak(s.session, s.recognizer, 'quiero una café');
    const learner = s.session.state.get().messages[1]!;
    await s.session.saveCorrection(learner, learner.corrections[0]!);
    await s.session.saveCorrection(learner, learner.corrections[0]!);
    expect(s.session.state.get().saved).toEqual(['un café']);
    const cards = await services.reviewRepo.all('es');
    expect(cards.map((c) => c.answer)).toEqual(['un café']);
    expect(cards[0]?.sourceMessageId).toBe(learner.id);
  });

  it('surfaces recogniser errors and recovers', async () => {
    await s.session.begin();
    await s.session.pressIn();
    expect(s.session.state.get().phase).toBe('listening');
    expect(s.session.volume.get()).toBe(0);
    s.recognizer.fail('SPEECH_NO_MATCH');
    expect(s.session.state.get()).toMatchObject({
      phase: 'idle',
      error: expect.objectContaining({ code: 'SPEECH_NO_MATCH' }),
    });

    s.recognizer.permission = false;
    await s.session.pressIn();
    expect(s.session.state.get().error?.code).toBe('SPEECH_PERMISSION_DENIED');
  });

  it('blocks a new conversation when the free quota is used up', async () => {
    const blocked = await setup({ startedToday: 3 });
    await blocked.session.begin();
    await blocked.session.pressIn();
    expect(blocked.session.state.get().phase).toBe('blocked');
  });

  it('keeps the learner line out of history when the tutor fails', async () => {
    const failing = await setup({
      tutor: {
        kind: 'server',
        reply: async () => {
          throw new AppError('TUTOR_UNAVAILABLE', 'offline');
        },
      },
    });
    await failing.session.begin();
    await speak(failing.session, failing.recognizer, 'hola');
    const state = failing.session.state.get();
    expect(state.messages.map((m) => m.role)).toEqual(['tutor']);
    expect(state.error?.code).toBe('TUTOR_UNAVAILABLE');
    expect(state.phase).toBe('idle');
  });

  it('replays lines and stops everything on dispose', async () => {
    await s.session.begin();
    s.session.replay(s.session.state.get().messages[0]!);
    expect(services.speaker.spoken).toHaveLength(2);
    await s.session.pressIn();
    s.session.pressOut();
    s.session.dispose();
    expect(s.session.state.get().phase).toBe('idle');
  });
});

import { type Clock } from '@/core/clock/Clock';
import { languageInfo, type CefrLevel, type Language } from '@/core/content/languages';
import { AppError, toAppError } from '@/core/errors/AppError';
import { createStore, type Store } from '@/core/lib/store';
import { type Speaker } from '@/core/speech/Speaker';
import {
  type RecognitionSession,
  type RecognizerKind,
  type SpeechRecognizer,
} from '@/core/speech/SpeechRecognizer';

import { canStartConversation, type Quota } from '../../billing/lib/quota';
import { type ProgressRepository } from '../../progress/data/progressRepository';
import { type PracticeOutcome, type ProgressService } from '../../progress/engine/progressService';
import { XP } from '../../progress/lib/xp';
import { type ReviewService } from '../../review/engine/reviewService';
import { type Scenario } from '../content';
import { type ChatMessage, type ConversationRepository } from '../data/conversationRepository';
import { type Correction } from '../lib/tutorContract';
import { type Tutor } from './Tutor';

export type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'done' | 'blocked';

export type SessionState = {
  phase: Phase;
  messages: ChatMessage[];
  interim: string;
  /** Tutor text while it streams in, before the turn is final. */
  streaming: string | null;
  error: AppError | null;
  recognizer: RecognizerKind;
  turn: number;
  xp: number;
  /** Answers saved to review in this session, by corrected text. */
  saved: string[];
  lastOutcome: PracticeOutcome | null;
};

export type ConversationSession = {
  state: Store<SessionState>;
  /** Mic level, 0..1. Separate from `state` so 12 updates a second redraw only the waveform. */
  volume: Store<number>;
  begin(): Promise<void>;
  pressIn(): Promise<void>;
  pressOut(): void;
  replay(message: ChatMessage): void;
  saveCorrection(message: ChatMessage, correction: Correction): Promise<void>;
  dispose(): void;
};

export type SessionDeps = {
  scenario: Scenario;
  language: Language;
  level: CefrLevel;
  recognizer: SpeechRecognizer;
  tutor: Tutor;
  speaker: Speaker;
  conversations: ConversationRepository;
  progressRepo: ProgressRepository;
  progress: ProgressService;
  review: ReviewService;
  quota: () => Promise<Quota>;
  clock: Clock;
  onChange?: () => void;
};

/**
 * One spoken conversation as a small state machine:
 *
 *   idle ─press─▶ listening ─release─▶ thinking ─reply─▶ speaking ─TTS done─▶ idle
 *     ▲                │ no speech / error                                     │
 *     └────────────────┘                                    last step ─▶ done ─┘
 *
 * `blocked` is the free-tier wall, checked when the learner first speaks.
 * The session owns no UI; the screen renders `state` and forwards presses.
 */
export function createConversationSession(deps: SessionDeps): ConversationSession {
  const { scenario, language, clock } = deps;
  const locale = languageInfo[language].locale;
  const opener = scenario.steps[0];

  const state = createStore<SessionState>({
    phase: 'idle',
    messages: [],
    interim: '',
    streaming: null,
    error: null,
    recognizer: deps.recognizer.kind,
    turn: 0,
    xp: 0,
    saved: [],
    lastOutcome: null,
  });
  const volume = createStore(0);
  const patch = (next: Partial<SessionState>) => state.set((s) => ({ ...s, ...next }));

  let conversationId: string | null = null;
  let listening: RecognitionSession | null = null;
  let abort: AbortController | null = null;
  let disposed = false;
  let level = deps.level;

  const speak = (text: string, then: () => void) => {
    patch({ phase: 'speaking' });
    deps.speaker.speak(text, locale, {
      onDone: () => {
        if (!disposed) then();
      },
    });
  };

  const addMessage = async (message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> => {
    const saved = conversationId
      ? await deps.conversations.addMessage(conversationId, message)
      : { ...message, id: `local_${state.get().messages.length}` };
    patch({ messages: [...state.get().messages, saved] });
    return saved;
  };

  const handleUtterance = async (text: string) => {
    const now = clock.now().getTime();
    if (!conversationId) {
      conversationId = await deps.conversations.start({
        scenarioId: scenario.id,
        language,
        day: deps.progress.today(),
        at: now,
      });
      // The opener was shown before the conversation counted; persist it now.
      for (const message of state.get().messages) {
        await deps.conversations.addMessage(conversationId, message);
      }
    }

    const history = state.get().messages.map((m) => ({ role: m.role, text: m.text }));
    const pendingLearner: ChatMessage = {
      id: 'pending',
      role: 'learner',
      text,
      translation: null,
      corrections: [],
      createdAt: now,
    };
    patch({ phase: 'thinking', interim: '', messages: [...state.get().messages, pendingLearner] });

    abort = new AbortController();
    try {
      const reply = await deps.tutor.reply(
        {
          language,
          level,
          scenario: {
            id: scenario.id,
            title: scenario.title,
            goal: scenario.goal,
            tutorRole: scenario.tutorRole,
          },
          history,
          learnerText: text,
          turnIndex: state.get().turn,
        },
        { signal: abort.signal, onPartial: (p) => p.reply && patch({ streaming: p.reply }) },
      );
      if (disposed) return;

      // Replace the pending bubble with the persisted one, now with corrections.
      patch({ messages: state.get().messages.filter((m) => m.id !== 'pending') });
      await addMessage({ ...pendingLearner, corrections: reply.corrections });
      const tutorMessage = await addMessage({
        role: 'tutor',
        text: reply.reply,
        translation: reply.translation,
        corrections: [],
        createdAt: clock.now().getTime(),
      });
      await deps.progressRepo.addVocabulary(language, reply.newVocabulary, clock.now().getTime());

      level = reply.cefrEstimate;
      const xp = XP.conversationTurn + (reply.done ? XP.conversationComplete : 0);
      const outcome = await deps.progress.record({
        kind: 'conversation',
        xp,
        language,
        refId: conversationId,
        tutorEstimate: reply.done ? reply.cefrEstimate : null,
      });
      if (reply.done)
        await deps.conversations.finish(conversationId, clock.now().getTime(), reply.cefrEstimate);
      patch({
        streaming: null,
        turn: state.get().turn + 1,
        xp: state.get().xp + xp,
        lastOutcome: outcome,
      });
      deps.onChange?.();

      speak(tutorMessage.text, () => patch({ phase: reply.done ? 'done' : 'idle' }));
    } catch (error) {
      if (disposed) return;
      patch({
        phase: 'idle',
        streaming: null,
        messages: state.get().messages.filter((m) => m.id !== 'pending'),
        error: toAppError(error, 'TUTOR_FAILED'),
      });
    } finally {
      abort = null;
    }
  };

  return {
    state,
    volume,

    async begin() {
      const ready = await deps.recognizer.prepare(locale);
      patch({ recognizer: ready.kind });
      if (!opener || state.get().messages.length > 0) return;
      await addMessage({
        role: 'tutor',
        text: opener.tutor,
        translation: opener.translation,
        corrections: [],
        createdAt: clock.now().getTime(),
      });
      speak(opener.tutor, () => patch({ phase: 'idle' }));
    },

    async pressIn() {
      const current = state.get();
      if (current.phase === 'thinking' || current.phase === 'done' || current.phase === 'listening')
        return;
      deps.speaker.stop();

      if (!conversationId && !canStartConversation(await deps.quota())) {
        patch({ phase: 'blocked' });
        return;
      }
      if (!(await deps.recognizer.requestPermission())) {
        patch({
          error: new AppError('SPEECH_PERMISSION_DENIED', 'Microphone or speech access is off.'),
        });
        return;
      }

      const step = scenario.steps[Math.min(current.turn, scenario.steps.length - 1)];
      patch({ phase: 'listening', interim: '', error: null });
      listening = deps.recognizer.start(
        {
          locale,
          contextualStrings: step?.vocabulary.map((v) => v.term),
          expected: step?.demoUtterance,
        },
        {
          onVolume: (level) => volume.set(level),
          onInterim: (text) => patch({ interim: text }),
          onFinal: (result) => {
            listening = null;
            volume.set(0);
            patch({ recognizer: deps.recognizer.kind });
            void handleUtterance(result.transcript.trim());
          },
          onError: (error) => {
            listening = null;
            volume.set(0);
            patch({ phase: 'idle', interim: '', error: error.code === 'CANCELLED' ? null : error });
          },
        },
      );
    },

    pressOut() {
      listening?.stop();
    },

    replay(message) {
      deps.speaker.speak(message.text, locale);
    },

    async saveCorrection(message, correction) {
      if (state.get().saved.includes(correction.corrected)) return;
      await deps.review.addCorrection({
        language,
        correction,
        sourceMessageId: message.id.startsWith('local_') ? null : message.id,
      });
      patch({ saved: [...state.get().saved, correction.corrected] });
      deps.onChange?.();
    },

    dispose() {
      disposed = true;
      listening?.abort();
      abort?.abort();
      deps.speaker.stop();
    },
  };
}

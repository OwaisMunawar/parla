import {
  type PartialTutorReply,
  type TutorReply,
  type TutorTurnRequest,
} from '../lib/tutorContract';

export type TutorKind = 'scripted' | 'server';

export type TutorCallOptions = {
  signal?: AbortSignal;
  /** Streams the reply text as it arrives, so TTS-free reading can start early. */
  onPartial?: (partial: PartialTutorReply) => void;
};

/**
 * One tutor turn. Implementations: the scripted tutor (demo, tests, no key)
 * and the server tutor (any model, via server/). Screens only see this.
 */
export interface Tutor {
  readonly kind: TutorKind;
  reply(
    request: TutorTurnRequest & { turnIndex: number },
    options?: TutorCallOptions,
  ): Promise<TutorReply>;
}

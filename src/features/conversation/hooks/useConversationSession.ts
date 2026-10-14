import { useEffect, useState } from 'react';

import { useServices } from '@/composition/ServicesProvider';
import { type CefrLevel, type Language } from '@/core/content/languages';
import { useStore } from '@/core/hooks/useStore';

import { conversationQuota } from '../../billing/lib/quota';
import { type Scenario } from '../content';
import { createConversationSession, type ConversationSession } from '../engine/conversationSession';

/** Owns one session for the lifetime of the screen, wired to app services. */
export function useConversationSession(scenario: Scenario, language: Language, level: CefrLevel) {
  const services = useServices();
  const [session] = useState<ConversationSession>(() =>
    createConversationSession({
      scenario,
      language,
      level,
      recognizer: services.recognizer,
      tutor: services.tutor,
      speaker: services.speaker,
      conversations: services.conversations,
      progressRepo: services.progressRepo,
      progress: services.progress,
      review: services.review,
      clock: services.clock,
      quota: async () =>
        conversationQuota({
          hasPro: services.entitlement.hasPro(),
          startedToday: await services.conversations.startedOn(services.progress.today()),
        }),
      onChange: () => {
        services.changes.emit('conversation');
        services.changes.emit('progress');
        services.changes.emit('review');
      },
    }),
  );

  useEffect(() => {
    void session.begin();
    return () => session.dispose();
  }, [session]);

  return { session, state: useStore(session.state) };
}

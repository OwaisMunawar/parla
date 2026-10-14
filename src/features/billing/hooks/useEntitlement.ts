import { useServices, useLiveQuery } from '@/composition/ServicesProvider';
import { useStore } from '@/core/hooks/useStore';

import { hasPro, type EntitlementState } from '../lib/entitlement';
import { conversationQuota, type Quota } from '../lib/quota';

export function useEntitlement(): { state: EntitlementState; pro: boolean } {
  const { entitlement } = useServices();
  const state = useStore(entitlement.state);
  return { state, pro: hasPro(state) };
}

/** Today's free-tier usage, live across screens. */
export function useConversationQuota(): Quota | undefined {
  const { pro } = useEntitlement();
  const { data } = useLiveQuery(`quota:${pro}`, ['conversation', 'entitlement'], async (s) =>
    conversationQuota({
      hasPro: pro,
      startedToday: await s.conversations.startedOn(s.progress.today()),
    }),
  );
  return data;
}

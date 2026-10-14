/**
 * The free tier: three conversations per calendar day.
 *
 * A conversation counts once the learner has spoken in it, not when the
 * screen opens, so browsing scenarios or backing out of one never burns a
 * slot. The day is the learner's local day, the same key the streak uses.
 */
export const FREE_CONVERSATIONS_PER_DAY = 3;

export type Quota =
  | { unlimited: true }
  | { unlimited: false; used: number; limit: number; remaining: number; exhausted: boolean };

export function conversationQuota(input: {
  hasPro: boolean;
  startedToday: number;
  limit?: number;
}): Quota {
  if (input.hasPro) return { unlimited: true };
  const limit = input.limit ?? FREE_CONVERSATIONS_PER_DAY;
  const used = Math.max(0, Math.trunc(input.startedToday));
  const remaining = Math.max(0, limit - used);
  return {
    unlimited: false,
    used: Math.min(used, limit),
    limit,
    remaining,
    exhausted: remaining === 0,
  };
}

/**
 * Whether a new conversation may start. Resuming one already counted today
 * is always allowed: hitting the limit mid-sentence would be hostile.
 */
export function canStartConversation(quota: Quota, resumingCounted = false): boolean {
  return quota.unlimited || resumingCounted || !quota.exhausted;
}

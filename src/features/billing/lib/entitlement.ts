/**
 * The Pro entitlement as an explicit state machine:
 *
 *   none ──purchase──▶ trial ──period ends, renews──▶ active
 *     │                  │                              │
 *     └──purchase──▶ active ◀──recovered── grace ◀──billing issue
 *                        │                   │
 *                        └──lapses───▶ expired ◀──grace ends
 *
 * The store is the source of truth; this machine exists so the app can
 * answer "does this learner have Pro right now" offline and between store
 * syncs, and so every edge (a trial that is cancelled, a renewal that fails,
 * a refund) has one tested answer instead of ad-hoc `if`s across screens.
 */
export type EntitlementState =
  | { status: 'none' }
  | { status: 'trial'; productId: string; endsAt: number; willRenew: boolean }
  | { status: 'active'; productId: string; renewsAt: number; willRenew: boolean }
  | { status: 'grace'; productId: string; graceEndsAt: number }
  | { status: 'expired'; productId: string; expiredAt: number };

export type EntitlementStatus = EntitlementState['status'];

/**
 * What the store reports about the newest subscription transaction.
 * `null` from a sync means the store knows of no current subscription.
 */
export type StoreSubscription = {
  productId: string;
  expiresAt: number;
  willRenew: boolean;
  isTrial: boolean;
  /** Set by the store when a renewal failed and billing grace is running. */
  gracePeriodEndsAt?: number | null;
  inBillingRetry?: boolean;
  revoked?: boolean;
};

export type EntitlementEvent =
  | { type: 'purchased'; subscription: StoreSubscription }
  | { type: 'synced'; subscription: StoreSubscription | null }
  | { type: 'autoRenewChanged'; willRenew: boolean }
  | { type: 'revoked' }
  | { type: 'tick' };

/**
 * When a period ends while auto-renew is on and the store has not yet told us
 * about the renewal (offline, or StoreKit has not delivered it), we keep
 * access for this long rather than locking out someone who is paying.
 */
export const OFFLINE_RENEWAL_ALLOWANCE_MS = 3 * 24 * 60 * 60 * 1000;

export const noEntitlement: EntitlementState = { status: 'none' };

export function hasPro(state: EntitlementState): boolean {
  return state.status === 'trial' || state.status === 'active' || state.status === 'grace';
}

export function fromStore(sub: StoreSubscription | null, now: number): EntitlementState {
  if (sub === null) return noEntitlement;
  if (sub.revoked) return { status: 'expired', productId: sub.productId, expiredAt: now };

  if (sub.expiresAt > now) {
    return sub.isTrial
      ? {
          status: 'trial',
          productId: sub.productId,
          endsAt: sub.expiresAt,
          willRenew: sub.willRenew,
        }
      : {
          status: 'active',
          productId: sub.productId,
          renewsAt: sub.expiresAt,
          willRenew: sub.willRenew,
        };
  }

  const graceEndsAt = sub.gracePeriodEndsAt ?? null;
  if (graceEndsAt !== null && graceEndsAt > now) {
    return { status: 'grace', productId: sub.productId, graceEndsAt };
  }
  return { status: 'expired', productId: sub.productId, expiredAt: sub.expiresAt };
}

export function transition(
  state: EntitlementState,
  event: EntitlementEvent,
  now: number,
): EntitlementState {
  switch (event.type) {
    case 'purchased':
      return fromStore(event.subscription, now);

    case 'synced': {
      // A sync that finds nothing only demotes someone who had Pro; a learner
      // who never subscribed stays "none" rather than becoming "expired".
      if (event.subscription === null) {
        return state.status === 'none' || state.status === 'expired'
          ? state
          : { status: 'expired', productId: state.productId, expiredAt: now };
      }
      return fromStore(event.subscription, now);
    }

    case 'autoRenewChanged':
      if (state.status === 'trial' || state.status === 'active') {
        return { ...state, willRenew: event.willRenew };
      }
      return state;

    case 'revoked':
      return state.status === 'none'
        ? state
        : { status: 'expired', productId: state.productId, expiredAt: now };

    case 'tick':
      return tick(state, now);
  }
}

function tick(state: EntitlementState, now: number): EntitlementState {
  switch (state.status) {
    case 'trial':
    case 'active': {
      const periodEnd = state.status === 'trial' ? state.endsAt : state.renewsAt;
      if (now < periodEnd) return state;
      if (!state.willRenew) {
        return { status: 'expired', productId: state.productId, expiredAt: periodEnd };
      }
      const graceEndsAt = periodEnd + OFFLINE_RENEWAL_ALLOWANCE_MS;
      return now < graceEndsAt
        ? { status: 'grace', productId: state.productId, graceEndsAt }
        : { status: 'expired', productId: state.productId, expiredAt: periodEnd };
    }
    case 'grace':
      return now < state.graceEndsAt
        ? state
        : { status: 'expired', productId: state.productId, expiredAt: state.graceEndsAt };
    case 'none':
    case 'expired':
      return state;
  }
}

export function parseEntitlement(json: string | null | undefined): EntitlementState {
  if (!json) return noEntitlement;
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    const productId = typeof raw.productId === 'string' ? raw.productId : '';
    const num = (key: string) => (typeof raw[key] === 'number' ? (raw[key] as number) : 0);
    switch (raw.status) {
      case 'trial':
        return {
          status: 'trial',
          productId,
          endsAt: num('endsAt'),
          willRenew: raw.willRenew === true,
        };
      case 'active':
        return {
          status: 'active',
          productId,
          renewsAt: num('renewsAt'),
          willRenew: raw.willRenew === true,
        };
      case 'grace':
        return { status: 'grace', productId, graceEndsAt: num('graceEndsAt') };
      case 'expired':
        return { status: 'expired', productId, expiredAt: num('expiredAt') };
      default:
        return noEntitlement;
    }
  } catch {
    return noEntitlement;
  }
}

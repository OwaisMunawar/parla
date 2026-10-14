import {
  fromStore,
  hasPro,
  noEntitlement,
  OFFLINE_RENEWAL_ALLOWANCE_MS,
  parseEntitlement,
  transition,
  type EntitlementState,
  type StoreSubscription,
} from '../entitlement';
import { canStartConversation, conversationQuota, FREE_CONVERSATIONS_PER_DAY } from '../quota';

const DAY = 86_400_000;
const now = Date.parse('2026-10-14T10:00:00Z');
const yearly = 'com.owaismunawar.parla.pro.yearly';

const sub = (overrides: Partial<StoreSubscription> = {}): StoreSubscription => ({
  productId: yearly,
  expiresAt: now + 7 * DAY,
  willRenew: true,
  isTrial: true,
  ...overrides,
});

describe('entitlement state machine', () => {
  it('none → trial on a trial purchase, and trial grants Pro', () => {
    const state = transition(noEntitlement, { type: 'purchased', subscription: sub() }, now);
    expect(state).toEqual({
      status: 'trial',
      productId: yearly,
      endsAt: now + 7 * DAY,
      willRenew: true,
    });
    expect(hasPro(state)).toBe(true);
    expect(hasPro(noEntitlement)).toBe(false);
  });

  it('trial → active when the store reports the first paid period', () => {
    const trial = fromStore(sub(), now);
    const later = now + 8 * DAY;
    const active = transition(
      trial,
      { type: 'synced', subscription: sub({ isTrial: false, expiresAt: later + 365 * DAY }) },
      later,
    );
    expect(active.status).toBe('active');
  });

  it('a cancelled trial expires at its end instead of renewing', () => {
    let state = fromStore(sub(), now);
    state = transition(state, { type: 'autoRenewChanged', willRenew: false }, now);
    expect(state).toMatchObject({ status: 'trial', willRenew: false });
    expect(transition(state, { type: 'tick' }, now + DAY).status).toBe('trial');
    expect(transition(state, { type: 'tick' }, now + 7 * DAY)).toEqual({
      status: 'expired',
      productId: yearly,
      expiredAt: now + 7 * DAY,
    });
  });

  it('keeps access briefly when a renewing period ends before the store syncs', () => {
    const active = fromStore(sub({ isTrial: false, expiresAt: now + DAY }), now);
    const grace = transition(active, { type: 'tick' }, now + DAY + 1);
    expect(grace).toEqual({
      status: 'grace',
      productId: yearly,
      graceEndsAt: now + DAY + OFFLINE_RENEWAL_ALLOWANCE_MS,
    });
    expect(hasPro(grace)).toBe(true);
    expect(transition(grace, { type: 'tick' }, now + 2 * DAY)).toBe(grace);
    expect(transition(grace, { type: 'tick' }, now + 10 * DAY).status).toBe('expired');
    expect(transition(active, { type: 'tick' }, now + 10 * DAY).status).toBe('expired');
  });

  it('enters store billing grace and recovers to active', () => {
    const expired = now - DAY;
    const grace = fromStore(
      sub({
        isTrial: false,
        expiresAt: expired,
        gracePeriodEndsAt: now + 5 * DAY,
        inBillingRetry: true,
      }),
      now,
    );
    expect(grace.status).toBe('grace');
    const recovered = transition(
      grace,
      { type: 'synced', subscription: sub({ isTrial: false, expiresAt: now + 30 * DAY }) },
      now,
    );
    expect(recovered.status).toBe('active');
    expect(
      fromStore(sub({ isTrial: false, expiresAt: expired, gracePeriodEndsAt: now - 1 }), now)
        .status,
    ).toBe('expired');
  });

  it('a refund or revocation removes access immediately', () => {
    const active = fromStore(sub({ isTrial: false }), now);
    expect(transition(active, { type: 'revoked' }, now)).toEqual({
      status: 'expired',
      productId: yearly,
      expiredAt: now,
    });
    expect(transition(noEntitlement, { type: 'revoked' }, now)).toBe(noEntitlement);
    expect(fromStore(sub({ revoked: true }), now).status).toBe('expired');
  });

  it('an empty sync demotes Pro but never turns "none" into "expired"', () => {
    const trial = fromStore(sub(), now);
    expect(transition(trial, { type: 'synced', subscription: null }, now).status).toBe('expired');
    expect(transition(noEntitlement, { type: 'synced', subscription: null }, now)).toBe(
      noEntitlement,
    );
    const expired: EntitlementState = { status: 'expired', productId: yearly, expiredAt: 1 };
    expect(transition(expired, { type: 'synced', subscription: null }, now)).toBe(expired);
    expect(fromStore(null, now)).toBe(noEntitlement);
  });

  it('ignores events that do not apply to the current state', () => {
    expect(transition(noEntitlement, { type: 'autoRenewChanged', willRenew: true }, now)).toBe(
      noEntitlement,
    );
    expect(transition(noEntitlement, { type: 'tick' }, now)).toBe(noEntitlement);
    const expired: EntitlementState = { status: 'expired', productId: yearly, expiredAt: 1 };
    expect(transition(expired, { type: 'tick' }, now)).toBe(expired);
  });

  it('round-trips through storage and rejects garbage', () => {
    const states: EntitlementState[] = [
      noEntitlement,
      fromStore(sub(), now),
      fromStore(sub({ isTrial: false }), now),
      { status: 'grace', productId: yearly, graceEndsAt: now },
      { status: 'expired', productId: yearly, expiredAt: now },
    ];
    for (const state of states) expect(parseEntitlement(JSON.stringify(state))).toEqual(state);
    expect(parseEntitlement(null)).toBe(noEntitlement);
    expect(parseEntitlement('nope')).toBe(noEntitlement);
    expect(parseEntitlement('{"status":"vip"}')).toBe(noEntitlement);
    expect(parseEntitlement('{"status":"trial"}')).toEqual({
      status: 'trial',
      productId: '',
      endsAt: 0,
      willRenew: false,
    });
  });
});

describe('daily conversation quota', () => {
  it('free learners get three conversations a day', () => {
    expect(conversationQuota({ hasPro: false, startedToday: 0 })).toEqual({
      unlimited: false,
      used: 0,
      limit: FREE_CONVERSATIONS_PER_DAY,
      remaining: 3,
      exhausted: false,
    });
    const used = conversationQuota({ hasPro: false, startedToday: 3 });
    expect(used).toMatchObject({ used: 3, remaining: 0, exhausted: true });
    expect(canStartConversation(used)).toBe(false);
    expect(canStartConversation(used, true)).toBe(true);
  });

  it('clamps odd counts and honours a custom limit', () => {
    expect(conversationQuota({ hasPro: false, startedToday: 9 })).toMatchObject({ used: 3 });
    expect(conversationQuota({ hasPro: false, startedToday: -2, limit: 5 })).toMatchObject({
      used: 0,
      remaining: 5,
    });
  });

  it('Pro is unlimited', () => {
    const quota = conversationQuota({ hasPro: true, startedToday: 40 });
    expect(quota).toEqual({ unlimited: true });
    expect(canStartConversation(quota)).toBe(true);
  });
});

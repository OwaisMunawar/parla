import { type Clock } from '@/core/clock/Clock';
import { toAppError } from '@/core/errors/AppError';
import { createStore, type Store } from '@/core/lib/store';

import { type EntitlementRepository } from '../data/entitlementRepository';
import {
  hasPro,
  noEntitlement,
  transition,
  type EntitlementEvent,
  type EntitlementState,
} from '../lib/entitlement';
import { type Billing, type Plan, type PurchaseResult } from './Billing';

export type EntitlementService = {
  state: Store<EntitlementState>;
  /** Cached state first, then the store's answer. Safe to call on every foreground. */
  refresh(): Promise<void>;
  plans(): Promise<Plan[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<EntitlementState>;
  manage(): Promise<void>;
  hasPro(): boolean;
  dispose(): void;
};

/**
 * Glue between the store (Billing) and the state machine. Every store answer
 * becomes an event; the machine decides what it means; the result is cached
 * and published. Screens subscribe to `state` and never call Billing directly.
 */
export function createEntitlementService(deps: {
  billing: Billing;
  repository: EntitlementRepository;
  clock: Clock;
}): EntitlementService {
  const { billing, repository, clock } = deps;
  const state = createStore<EntitlementState>(noEntitlement);
  let loaded = false;

  const apply = async (event: EntitlementEvent) => {
    const next = transition(state.get(), event, clock.now().getTime());
    state.set(next);
    await repository.save(next, clock.now().getTime());
    return next;
  };

  const unsubscribe = billing.onChange((subscription) => {
    void apply({ type: 'synced', subscription });
  });

  return {
    state,

    async refresh() {
      if (!loaded) {
        state.set(await repository.get());
        loaded = true;
      }
      await apply({ type: 'tick' });
      try {
        await apply({ type: 'synced', subscription: await billing.current() });
      } catch (error) {
        // Offline or no store: the cached state (already ticked) stands.
        console.warn(toAppError(error, 'BILLING_UNAVAILABLE').message);
      }
    },

    plans: () => billing.plans(),

    async purchase(productId) {
      const result = await billing.purchase(productId);
      if (result.status === 'purchased') {
        await apply({ type: 'purchased', subscription: result.subscription });
      }
      return result;
    },

    async restore() {
      return apply({ type: 'synced', subscription: await billing.restore() });
    },

    manage: () => billing.manageSubscriptions(),

    hasPro: () => hasPro(state.get()),

    dispose() {
      unsubscribe();
      billing.disconnect();
    },
  };
}

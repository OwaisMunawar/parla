import { type SqlExecutor } from '@/core/db/SqlDriver';

import { parseEntitlement, type EntitlementState } from '../lib/entitlement';

/**
 * The last known entitlement, so Pro survives a cold start in airplane mode.
 * It is a cache of the store's answer, never a source of truth: every launch
 * re-syncs and the store wins.
 */
export function createEntitlementRepository(db: SqlExecutor) {
  return {
    async get(): Promise<EntitlementState> {
      const [row] = await db.query<{ state: string }>('SELECT state FROM entitlement WHERE id = 1');
      return parseEntitlement(row?.state);
    },
    async save(state: EntitlementState, at: number): Promise<void> {
      await db.run(
        `INSERT INTO entitlement (id, state, updated_at) VALUES (1, ?, ?)
         ON CONFLICT (id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
        [JSON.stringify(state), at],
      );
    },
  };
}

export type EntitlementRepository = ReturnType<typeof createEntitlementRepository>;

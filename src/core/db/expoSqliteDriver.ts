import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { type Row, type SqlDriver, type SqlExecutor, type SqlValue } from './SqlDriver';

/**
 * expo-sqlite behind the driver interface.
 *
 * Statements go through one queue because SQLite transactions belong to the
 * connection, not to the caller: without it, a streak update fired from one
 * screen could land inside another screen's "finish conversation" transaction
 * and be rolled back with it.
 */
export async function openExpoSqliteDriver(name: string): Promise<SqlDriver> {
  const db = await openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return createDriver(db);
}

function createDriver(db: SQLiteDatabase): SqlDriver {
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.then(work, work);
    tail = result.catch(() => undefined);
    return result;
  };

  const direct: SqlExecutor = {
    query: <T extends Row = Row>(sql: string, params: readonly SqlValue[] = []) =>
      db.getAllAsync<T>(sql, [...params]),
    run: async (sql: string, params: readonly SqlValue[] = []) => {
      const result = await db.runAsync(sql, [...params]);
      return { rowsAffected: result.changes, insertId: result.lastInsertRowId };
    },
  };

  return {
    query: (sql, params) => enqueue(() => direct.query(sql, params)),
    run: (sql, params) => enqueue(() => direct.run(sql, params)),
    transaction: (work) =>
      enqueue(async () => {
        await db.execAsync('BEGIN IMMEDIATE');
        try {
          const result = await work(direct);
          await db.execAsync('COMMIT');
          return result;
        } catch (error) {
          await db.execAsync('ROLLBACK');
          throw error;
        }
      }),
    close: () => db.closeSync(),
  };
}

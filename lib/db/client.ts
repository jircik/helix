import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import * as schema from './schema';

export type HelixDb = BetterSQLite3Database<typeof schema>;
const MIGRATIONS_FOLDER = path.join(process.cwd(), 'lib/db/migrations');
let cached: HelixDb | null = null;

export function getDb(): HelixDb {
  if (cached) return cached;
  const sqlite = new Database(process.env.DATABASE_URL?.trim() || './helix.db');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  cached = drizzle(sqlite, { schema });
  return cached;
}

export function createTestDb(): { db: HelixDb; close: () => void } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, close: () => sqlite.close() };
}

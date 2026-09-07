import nextEnv from '@next/env';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';

nextEnv.loadEnvConfig(process.cwd());

const { getDb } = await import('./client');
migrate(getDb(), { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') });
console.log('Migrations aplicadas.');

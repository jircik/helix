import nextEnv from '@next/env';
import { defineConfig } from 'drizzle-kit';

nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: process.env.DATABASE_URL ?? './helix.db' },
});

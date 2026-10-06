import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb, type HelixDb } from '@/lib/db/client';
import { account, session, user, verification } from '@/lib/db/schema';
import { ensureDefaultStages } from '@/lib/db/seed';

/** `npm run dev` escuta em 127.0.0.1, mas o navegador pode abrir por localhost. */
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const DAY = 60 * 60 * 24;

export function createAuth(db: HelixDb) {
  return betterAuth({
    // Lido de BETTER_AUTH_SECRET / BETTER_AUTH_URL; em produção a lib recusa subir sem segredo.
    database: drizzleAdapter(db, { provider: 'sqlite', schema: { user, session, account, verification } }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    session: { expiresIn: 7 * DAY, updateAge: DAY },
    trustedOrigins: process.env.NODE_ENV === 'production' ? [] : DEV_ORIGINS,
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production',
      customRules: { '/sign-up/email': { window: 60 * 60, max: 5 } },
    },
    databaseHooks: {
      user: { create: { after: async (created) => { ensureDefaultStages(db, created.id); } } },
    },
  });
}

export type HelixAuth = ReturnType<typeof createAuth>;

let cached: HelixAuth | null = null;
export function getAuth(): HelixAuth {
  cached ??= createAuth(getDb());
  return cached;
}

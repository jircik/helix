// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { DEFAULT_STAGES, stages } from '@/lib/db/schema';
import { createAuth } from './auth';

let db: HelixDb;
let close: () => void;
beforeEach(() => { ({ db, close } = createTestDb()); });
afterEach(() => close());

const BODY = { name: 'Ana', email: 'ana@teste.dev', password: 'senha-segura-1' };

describe('createAuth', () => {
  it('cadastro cria o usuário com as etapas padrão', async () => {
    const auth = createAuth(db);
    const { user } = await auth.api.signUpEmail({ body: BODY });
    const rows = db.select().from(stages).where(eq(stages.userId, user.id)).all();
    expect(rows.map((s) => s.name)).toEqual(DEFAULT_STAGES.map((s) => s.name));
  });

  it('login devolve cookie que resolve a sessão do usuário', async () => {
    const auth = createAuth(db);
    const { user } = await auth.api.signUpEmail({ body: BODY });
    const res = await auth.api.signInEmail({ body: { email: BODY.email, password: BODY.password }, asResponse: true });
    const cookie = res.headers.get('set-cookie')!.split(';')[0];
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.id).toBe(user.id);
  });

  it('recusa senha curta e e-mail repetido', async () => {
    const auth = createAuth(db);
    await expect(auth.api.signUpEmail({ body: { ...BODY, password: '123' } })).rejects.toThrow();
    await auth.api.signUpEmail({ body: BODY });
    await expect(auth.api.signUpEmail({ body: BODY })).rejects.toThrow();
  });

  it('fora de produção aceita localhost e 127.0.0.1 como origem', () => {
    const auth = createAuth(db);
    expect(auth.options.trustedOrigins).toEqual(
      expect.arrayContaining(['http://localhost:3000', 'http://127.0.0.1:3000']),
    );
  });
});

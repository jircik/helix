import type { HelixDb } from './client';
import { user } from './schema';
import { ensureDefaultStages } from './seed';

/**
 * Cria um usuário direto no banco para testes, sem passar pelo Better Auth.
 * Por padrão já grava o funil padrão, como o cadastro real faz.
 */
export function createTestUser(db: HelixDb, id = 'user-a', withStages = true): string {
  const now = new Date();
  db.insert(user).values({
    id, name: `Usuário ${id}`, email: `${id}@teste.dev`, emailVerified: false, createdAt: now, updatedAt: now,
  }).run();
  if (withStages) ensureDefaultStages(db, id);
  return id;
}

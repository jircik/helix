import { eq } from 'drizzle-orm';
import type { HelixDb } from './client';
import { DEFAULT_STAGES, stages } from './schema';

/** Grava o funil padrão do usuário atomicamente. Não faz nada se ele já tiver etapas. */
export function ensureDefaultStages(db: HelixDb, userId: string): void {
  db.transaction((tx) => {
    if (tx.select({ id: stages.id }).from(stages).where(eq(stages.userId, userId)).limit(1).get()) return;
    tx.insert(stages).values(DEFAULT_STAGES.map((stage) => ({ ...stage, userId }))).run();
  });
}

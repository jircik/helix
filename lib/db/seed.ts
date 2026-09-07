import type { HelixDb } from './client';
import { DEFAULT_STAGES, stages } from './schema';

/** Grava o funil padrão atomicamente. Não faz nada se já houver etapas. */
export function seedStages(db: HelixDb): void {
  db.transaction((tx) => {
    if (tx.select({ id: stages.id }).from(stages).limit(1).get()) return;
    tx.insert(stages).values(DEFAULT_STAGES).run();
  });
}

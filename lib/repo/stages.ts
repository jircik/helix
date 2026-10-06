import { and, asc, eq } from 'drizzle-orm';
import type { HelixDb } from '@/lib/db/client';
import { leads, stages, STAGE_KINDS, type Stage, type StageKind } from '@/lib/db/schema';
import { addActivity } from './activities';
import * as v from '@/lib/validate';

function color(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    throw new Error('Cor inválida: use hexadecimal, como #737373.');
  }
  return value;
}

export function listStages(db: HelixDb, userId: string): Stage[] {
  return db.select().from(stages).where(eq(stages.userId, userId)).orderBy(asc(stages.position)).all();
}

/** Etapa de outro usuário é tratada como inexistente. */
export function getStage(db: HelixDb, userId: string, id: number): Stage | null {
  return db.select().from(stages).where(and(eq(stages.id, id), eq(stages.userId, userId))).get() ?? null;
}

export function createStage(
  db: HelixDb,
  userId: string,
  input: { name: string; kind?: StageKind; color?: string | null },
): Stage {
  v.object(input);
  const last = listStages(db, userId).at(-1);
  return db.insert(stages).values({
    userId,
    name: v.text(input.name, 'Nome')!,
    kind: v.choice(input.kind ?? 'open', STAGE_KINDS, 'Tipo'),
    color: color(input.color),
    position: (last?.position ?? 0) + 1,
  }).returning().get();
}

export function renameStage(db: HelixDb, userId: string, id: number, name: string): Stage {
  return updateStage(db, userId, id, { name });
}

export function updateStage(
  db: HelixDb,
  userId: string,
  id: number,
  patch: { name?: string; kind?: StageKind; color?: string | null },
): Stage {
  v.integer(id, 'Etapa');
  const raw = v.object(patch);
  v.keys(raw, ['name', 'kind', 'color']);
  const current = getStage(db, userId, id);
  if (!current) throw new Error(`Etapa ${id} não encontrada.`);
  const values: Partial<Stage> = {};
  if ('name' in raw) values.name = v.text(raw.name, 'Nome')!;
  if ('kind' in raw) values.kind = v.choice(raw.kind, STAGE_KINDS, 'Tipo');
  if ('color' in raw) values.color = color(raw.color);
  if (!Object.keys(values).length) throw new Error('Informe o que alterar na etapa.');
  db.update(stages).set(values).where(and(eq(stages.id, id), eq(stages.userId, userId))).run();
  return getStage(db, userId, id)!;
}

export function reorderStages(db: HelixDb, userId: string, orderedIds: number[]): Stage[] {
  const existing = listStages(db, userId);
  if (!Array.isArray(orderedIds) || orderedIds.length !== existing.length ||
      new Set(orderedIds).size !== existing.length ||
      orderedIds.some((id) => !existing.some((stage) => stage.id === id))) {
    throw new Error('Informe todas as etapas uma única vez para reordenar.');
  }
  return db.transaction((db) => {
    orderedIds.forEach((id, index) => {
      db.update(stages).set({ position: index + 1 }).where(and(eq(stages.id, id), eq(stages.userId, userId))).run();
    });
    return listStages(db, userId);
  });
}

/**
 * Excluir etapa exige destino para os leads que estavam nela.
 * Sem cascade e sem órfão — um lead sempre pertence a alguma etapa.
 * Origem e destino precisam ser do mesmo usuário.
 */
export function deleteStage(db: HelixDb, userId: string, id: number, moveLeadsTo: number): void {
  v.integer(id, 'Etapa');
  v.integer(moveLeadsTo, 'Destino');
  if (id === moveLeadsTo) {
    throw new Error('Não é possível mover os leads para a mesma etapa que será excluída.');
  }
  const current = getStage(db, userId, id);
  if (!current) throw new Error(`Etapa ${id} não encontrada.`);

  const destination = getStage(db, userId, moveLeadsTo);
  if (!destination) throw new Error(`Etapa de destino ${moveLeadsTo} não encontrada.`);

  if (listStages(db, userId).length <= 1) {
    throw new Error('O funil precisa de pelo menos uma etapa.');
  }

  db.transaction((db) => {
    const now = new Date().toISOString();
    const inStage = and(eq(leads.stageId, id), eq(leads.userId, userId));
    const moving = db.select({ id: leads.id }).from(leads).where(inStage).all();
    for (const lead of moving) addActivity(db, userId, {
      leadId: lead.id, kind: 'stage_change', body: `${current.name} → ${destination.name}`,
    }, now);
    db.update(leads).set({ stageId: moveLeadsTo, updatedAt: now }).where(inStage).run();
    db.delete(stages).where(eq(stages.id, id)).run();
    listStages(db, userId).forEach((stage, index) => {
      db.update(stages).set({ position: index + 1 }).where(eq(stages.id, stage.id)).run();
    });
  });
}

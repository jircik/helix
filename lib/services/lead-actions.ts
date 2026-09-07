import type { HelixDb } from '@/lib/db/client';
import type { Lead } from '@/lib/db/schema';
import { addActivity } from '@/lib/repo/activities';
import { getLead, updateUserBlock, type UserBlockPatch } from '@/lib/repo/leads';
import { getStage } from '@/lib/repo/stages';
import * as v from '@/lib/validate';

/** Move o lead e registra a mudança na timeline automaticamente. */
export function moveLeadToStage(
  db: HelixDb,
  leadId: number,
  stageId: number,
  now: string,
): Lead {
  v.integer(leadId, 'Lead');
  v.integer(stageId, 'Etapa');
  return db.transaction((db) => {
  const lead = getLead(db, leadId);
  if (!lead) throw new Error(`Lead ${leadId} não encontrado.`);

  const destination = getStage(db, stageId);
  if (!destination) throw new Error(`Etapa ${stageId} não encontrada.`);

  if (lead.stageId === stageId) return lead;

  const origin = lead.stageId ? getStage(db, lead.stageId) : null;
  const updated = updateUserBlock(db, leadId, { stageId }, now);

  addActivity(db, {
    leadId,
    kind: 'stage_change',
    body: `${origin?.name ?? 'Sem etapa'} → ${destination.name}`,
  }, now);

  return updated;
  });
}

/** Edição do painel e movimentação compartilham a mesma transação e histórico. */
export function editLead(db: HelixDb, id: number, patch: UserBlockPatch, now: string): Lead {
  v.object(patch);
  const { stageId, ...fields } = patch;
  return db.transaction((tx) => {
    updateUserBlock(tx, id, fields, now);
    if ('stageId' in patch) {
      if (stageId == null) throw new Error('Escolha uma etapa para o lead.');
      moveLeadToStage(tx, id, stageId, now);
    }
    return getLead(tx, id)!;
  });
}

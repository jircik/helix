import { desc, eq } from 'drizzle-orm';
import type { HelixDb } from '@/lib/db/client';
import { activities, leads, ACTIVITY_KINDS, type Activity, type ActivityKind } from '@/lib/db/schema';
import * as v from '@/lib/validate';

export interface NewActivityInput {
  leadId: number;
  kind: ActivityKind;
  body?: string | null;
  /** Quando aconteceu de fato. Diferente de quando foi digitado. */
  occurredAt?: string;
}

export function addActivity(
  db: HelixDb,
  input: NewActivityInput,
  now: string,
): Activity {
  v.integer(input.leadId, 'Lead');
  v.choice(input.kind, ACTIVITY_KINDS, 'Atividade');
  if (!db.select({ id: leads.id }).from(leads).where(eq(leads.id, input.leadId)).get()) {
    throw new Error(`Lead ${input.leadId} não encontrado.`);
  }
  return db.insert(activities).values({
    leadId: input.leadId,
    kind: input.kind,
    body: input.body == null ? null : v.text(input.body, 'Descrição', true),
    occurredAt: v.timestamp(input.occurredAt ?? now, 'Quando aconteceu'),
    createdAt: now,
  }).returning().get();
}

export function listActivities(db: HelixDb, leadId: number): Activity[] {
  v.integer(leadId, 'Lead');
  if (!db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId)).get()) {
    throw new Error(`Lead ${leadId} não encontrado.`);
  }
  return db.select().from(activities)
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.occurredAt), desc(activities.id))
    .all();
}

/** O histórico de etapas só pode ser criado pela movimentação transacional. */
export function recordActivity(db: HelixDb, input: NewActivityInput, now: string): Activity {
  v.object(input);
  if (input.kind === 'stage_change') throw new Error('Mudanças de etapa são registradas automaticamente.');
  return addActivity(db, input, now);
}

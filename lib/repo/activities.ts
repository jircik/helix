import { and, desc, eq } from 'drizzle-orm';
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

/** Atividade não tem dono próprio: herda o do lead, que precisa ser do usuário. */
function assertOwnLead(db: HelixDb, userId: string, leadId: number): void {
  if (!db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, leadId), eq(leads.userId, userId))).get()) {
    throw new Error(`Lead ${leadId} não encontrado.`);
  }
}

export function addActivity(
  db: HelixDb,
  userId: string,
  input: NewActivityInput,
  now: string,
): Activity {
  v.integer(input.leadId, 'Lead');
  v.choice(input.kind, ACTIVITY_KINDS, 'Atividade');
  assertOwnLead(db, userId, input.leadId);
  return db.insert(activities).values({
    leadId: input.leadId,
    kind: input.kind,
    body: input.body == null ? null : v.text(input.body, 'Descrição', true),
    occurredAt: v.timestamp(input.occurredAt ?? now, 'Quando aconteceu'),
    createdAt: now,
  }).returning().get();
}

export function listActivities(db: HelixDb, userId: string, leadId: number): Activity[] {
  v.integer(leadId, 'Lead');
  assertOwnLead(db, userId, leadId);
  return db.select().from(activities)
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.occurredAt), desc(activities.id))
    .all();
}

/** O histórico de etapas só pode ser criado pela movimentação transacional. */
export function recordActivity(db: HelixDb, userId: string, input: NewActivityInput, now: string): Activity {
  v.object(input);
  if (input.kind === 'stage_change') throw new Error('Mudanças de etapa são registradas automaticamente.');
  return addActivity(db, userId, input, now);
}

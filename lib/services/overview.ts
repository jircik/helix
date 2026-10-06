import { and, asc, count, desc, eq, isNotNull, lte, ne, or, isNull } from 'drizzle-orm';
import type { HelixDb } from '@/lib/db/client';
import { leads, searches, stages } from '@/lib/db/schema';
import { countByTemperature } from '@/lib/repo/leads';

export function listSearches(db: HelixDb, userId: string, limit = 20) {
  return db.select().from(searches).where(eq(searches.userId, userId))
    .orderBy(desc(searches.executedAt), desc(searches.id)).limit(limit).all();
}

export function getOverview(db: HelixDb, userId: string, now = new Date()) {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return {
    porTemperatura: countByTemperature(db, userId),
    pendentes: db.select({ value: count() }).from(leads)
      .where(and(eq(leads.userId, userId), eq(leads.verification, 'pendente'), ne(leads.temperature, 'frio'))).get()?.value ?? 0,
    proximasAcoes: db.select({ lead: leads }).from(leads).leftJoin(stages, eq(leads.stageId, stages.id))
      .where(and(eq(leads.userId, userId), isNotNull(leads.nextActionAt), lte(leads.nextActionAt, endOfDay.toISOString()),
        ne(leads.verification, 'descartado'), or(isNull(stages.kind), eq(stages.kind, 'open'))))
      .orderBy(asc(leads.nextActionAt), asc(leads.id)).limit(10).all().map(({ lead }) => lead),
    ultimasBuscas: listSearches(db, userId, 5),
  };
}

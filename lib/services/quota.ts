import { and, eq, gte, sum } from 'drizzle-orm';
import type { HelixDb } from '@/lib/db/client';
import { searches } from '@/lib/db/schema';
import { HttpError } from '@/lib/api/http-error';
import type { QuotaLimits } from '@/lib/env';
import { QUOTA_EXCEEDED_MESSAGE, type QuotaStatus } from '@/lib/quota-shared';

export type { QuotaLimits, QuotaStatus };
export { QUOTA_EXCEEDED_MESSAGE };

export class QuotaExceededError extends HttpError {
  constructor() { super(429, QUOTA_EXCEEDED_MESSAGE); }
}

/** O dia da cota é o dia UTC: executed_at é ISO em UTC, então a comparação é textual. */
function startOfUtcDay(now: string): string {
  return `${now.slice(0, 10)}T00:00:00.000Z`;
}

function usedSince(db: HelixDb, since: string, userId?: string): number {
  const conditions = [gte(searches.executedAt, since), eq(searches.isSample, false)];
  if (userId) conditions.push(eq(searches.userId, userId));
  const row = db.select({ value: sum(searches.apiRequests) }).from(searches).where(and(...conditions)).get();
  return Number(row?.value ?? 0);
}

/**
 * Conta chamadas à Places API, não buscas: cada página é uma chamada cobrada.
 * Buscas de exemplo não chamam o Google e não entram na conta.
 */
export function quotaStatus(db: HelixDb, userId: string, limits: QuotaLimits, now: string): QuotaStatus {
  const since = startOfUtcDay(now);
  const userUsed = usedSince(db, since, userId);
  const globalUsed = usedSince(db, since);
  const remaining = Math.max(0, Math.min(limits.perUser - userUsed, limits.global - globalUsed));
  return { used: userUsed, limit: limits.perUser, remaining };
}

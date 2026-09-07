import type { HelixDb } from '@/lib/db/client';
import { listLeads, type ListLeadsInput } from '@/lib/repo/leads';
import { toCsv } from '@/lib/export/csv';
import type { Lead } from '@/lib/db/schema';

export function exportLeads(db: HelixDb, input: ListLeadsInput): string {
  return db.transaction((tx) => {
    const rows: Lead[] = [];
    for (let offset = 0; ; offset += 500) {
      const page = listLeads(tx, { ...input, limit: 500, offset });
      rows.push(...page.rows);
      if (rows.length >= page.total || page.rows.length === 0) return toCsv(rows);
    }
  });
}

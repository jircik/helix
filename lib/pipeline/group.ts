import type { Lead, Stage } from '@/lib/db/schema';

export interface StageColumn {
  stage: Stage;
  leads: Lead[];
}

/** Toda etapa vira coluna, mesmo vazia. Lead órfão cai na primeira. */
export function groupByStage(stages: Stage[], rows: Lead[]): StageColumn[] {
  if (stages.length === 0) return [];

  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const known = new Set(ordered.map((s) => s.id));
  const columns = new Map<number, Lead[]>(ordered.map((s) => [s.id, []]));
  const fallback = ordered[0].id;

  for (const row of rows) {
    const target = row.stageId != null && known.has(row.stageId) ? row.stageId : fallback;
    columns.get(target)!.push(row);
  }

  return ordered.map((stage) => ({ stage, leads: columns.get(stage.id)! }));
}

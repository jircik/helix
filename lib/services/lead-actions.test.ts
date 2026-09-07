import { describe, it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { leads } from '@/lib/db/schema';
import { seedStages } from '@/lib/db/seed';
import { addActivity, listActivities } from '@/lib/repo/activities';
import {
  listStages, createStage, renameStage, reorderStages, deleteStage,
} from '@/lib/repo/stages';
import { moveLeadToStage } from './lead-actions';

let close: () => void;
function freshDb(): HelixDb {
  const t = createTestDb();
  close = t.close;
  seedStages(t.db);
  return t.db;
}
afterEach(() => close?.());

const NOW = '2026-09-06T12:00:00.000Z';

function insertLead(db: HelixDb, over: Record<string, unknown> = {}) {
  return db.insert(leads).values({
    placeId: `p${Math.random()}`, name: 'Lead', temperature: 'quente',
    capturedAt: NOW, createdAt: NOW, updatedAt: NOW, ...over,
  }).returning().get();
}

describe('addActivity', () => {
  it('grava a atividade com occurredAt informado', () => {
    const db = freshDb();
    const lead = insertLead(db);

    const out = addActivity(db, {
      leadId: lead.id, kind: 'ligacao', body: 'não atendeu',
      occurredAt: '2026-09-05T09:00:00.000Z',
    }, NOW);

    expect(out.kind).toBe('ligacao');
    expect(out.occurredAt).toBe('2026-09-05T09:00:00.000Z');
    expect(out.createdAt).toBe(NOW);
  });

  it('usa agora como occurredAt quando não informado', () => {
    const db = freshDb();
    const lead = insertLead(db);
    expect(addActivity(db, { leadId: lead.id, kind: 'nota' }, NOW).occurredAt).toBe(NOW);
  });

  it('lista da mais recente para a mais antiga', () => {
    const db = freshDb();
    const lead = insertLead(db);
    addActivity(db, { leadId: lead.id, kind: 'nota', body: 'primeira', occurredAt: '2026-09-01T00:00:00.000Z' }, NOW);
    addActivity(db, { leadId: lead.id, kind: 'nota', body: 'segunda', occurredAt: '2026-09-03T00:00:00.000Z' }, NOW);

    expect(listActivities(db, lead.id).map((a) => a.body)).toEqual(['segunda', 'primeira']);
  });
});

describe('moveLeadToStage', () => {
  it('muda a etapa do lead', () => {
    const db = freshDb();
    const etapas = listStages(db);
    const lead = insertLead(db, { stageId: etapas[0].id });

    const out = moveLeadToStage(db, lead.id, etapas[2].id, NOW);
    expect(out.stageId).toBe(etapas[2].id);
  });

  it('grava stage_change com os nomes das etapas', () => {
    const db = freshDb();
    const etapas = listStages(db);
    const lead = insertLead(db, { stageId: etapas[0].id });

    moveLeadToStage(db, lead.id, etapas[2].id, NOW);

    const [atividade] = listActivities(db, lead.id);
    expect(atividade.kind).toBe('stage_change');
    expect(atividade.body).toBe(`${etapas[0].name} → ${etapas[2].name}`);
  });

  it('não grava atividade quando a etapa é a mesma', () => {
    const db = freshDb();
    const etapas = listStages(db);
    const lead = insertLead(db, { stageId: etapas[1].id });

    moveLeadToStage(db, lead.id, etapas[1].id, NOW);
    expect(listActivities(db, lead.id)).toHaveLength(0);
  });

  it('lança erro quando a etapa não existe', () => {
    const db = freshDb();
    const lead = insertLead(db);
    expect(() => moveLeadToStage(db, lead.id, 999, NOW)).toThrow(/999/);
  });
});

describe('stages', () => {
  it('lista em ordem de position', () => {
    expect(listStages(freshDb()).map((s) => s.name)).toEqual([
      'Novo', 'Contatado', 'Reunião', 'Proposta', 'Fechado', 'Perdido',
    ]);
  });

  it('cria etapa no fim da fila', () => {
    const db = freshDb();
    const nova = createStage(db, { name: 'Negociação', kind: 'open', color: '#555' });
    expect(nova.position).toBe(7);
    expect(listStages(db).at(-1)!.name).toBe('Negociação');
  });

  it('renomeia', () => {
    const db = freshDb();
    const alvo = listStages(db)[0];
    expect(renameStage(db, alvo.id, 'Entrada').name).toBe('Entrada');
  });

  it('reordena conforme a lista de ids', () => {
    const db = freshDb();
    const etapas = listStages(db);
    const invertido = [...etapas].reverse().map((s) => s.id);

    const out = reorderStages(db, invertido);
    expect(out.map((s) => s.id)).toEqual(invertido);
    expect(out.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('ao excluir, move os leads para a etapa indicada', () => {
    const db = freshDb();
    const etapas = listStages(db);
    const lead = insertLead(db, { stageId: etapas[2].id });

    deleteStage(db, etapas[2].id, etapas[0].id);

    const row = db.select().from(leads).where(eq(leads.id, lead.id)).get()!;
    expect(row.stageId).toBe(etapas[0].id);
    expect(listStages(db)).toHaveLength(5);
  });

  it('recompacta as posições após excluir', () => {
    const db = freshDb();
    const etapas = listStages(db);
    deleteStage(db, etapas[2].id, etapas[0].id);
    expect(listStages(db).map((s) => s.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('recusa mover os leads para a própria etapa excluída', () => {
    const db = freshDb();
    const alvo = listStages(db)[1];
    expect(() => deleteStage(db, alvo.id, alvo.id)).toThrow(/mesma etapa/i);
  });

  it('recusa destino inexistente', () => {
    const db = freshDb();
    const alvo = listStages(db)[1];
    expect(() => deleteStage(db, alvo.id, 999)).toThrow(/999/);
  });

  it('recusa excluir a última etapa restante', () => {
    const db = freshDb();
    const etapas = listStages(db);
    for (let i = 1; i < etapas.length; i++) {
      deleteStage(db, etapas[i].id, etapas[0].id);
    }
    expect(() => deleteStage(db, etapas[0].id, etapas[0].id)).toThrow();
  });
});

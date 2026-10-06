import { describe, it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { leads } from '@/lib/db/schema';
import { createTestUser } from '@/lib/db/test-users';
import { addActivity, listActivities } from '@/lib/repo/activities';
import {
  listStages, createStage, renameStage, reorderStages, deleteStage,
} from '@/lib/repo/stages';
import { moveLeadToStage } from './lead-actions';

let close: () => void;
function freshDb(): HelixDb {
  const t = createTestDb();
  close = t.close;
  createTestUser(t.db);
  return t.db;
}
afterEach(() => close?.());

const NOW = '2026-09-06T12:00:00.000Z';
const U = 'user-a';

function insertLead(db: HelixDb, over: Record<string, unknown> = {}) {
  return db.insert(leads).values({ userId: U,
    placeId: `p${Math.random()}`, name: 'Lead', temperature: 'quente',
    capturedAt: NOW, createdAt: NOW, updatedAt: NOW, ...over,
  }).returning().get();
}

describe('addActivity', () => {
  it('grava a atividade com occurredAt informado', () => {
    const db = freshDb();
    const lead = insertLead(db);

    const out = addActivity(db, U, {
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
    expect(addActivity(db, U, { leadId: lead.id, kind: 'nota' }, NOW).occurredAt).toBe(NOW);
  });

  it('lista da mais recente para a mais antiga', () => {
    const db = freshDb();
    const lead = insertLead(db);
    addActivity(db, U, { leadId: lead.id, kind: 'nota', body: 'primeira', occurredAt: '2026-09-01T00:00:00.000Z' }, NOW);
    addActivity(db, U, { leadId: lead.id, kind: 'nota', body: 'segunda', occurredAt: '2026-09-03T00:00:00.000Z' }, NOW);

    expect(listActivities(db, U, lead.id).map((a) => a.body)).toEqual(['segunda', 'primeira']);
  });
});

describe('moveLeadToStage', () => {
  it('muda a etapa do lead', () => {
    const db = freshDb();
    const etapas = listStages(db, U);
    const lead = insertLead(db, { stageId: etapas[0].id });

    const out = moveLeadToStage(db, U, lead.id, etapas[2].id, NOW);
    expect(out.stageId).toBe(etapas[2].id);
  });

  it('grava stage_change com os nomes das etapas', () => {
    const db = freshDb();
    const etapas = listStages(db, U);
    const lead = insertLead(db, { stageId: etapas[0].id });

    moveLeadToStage(db, U, lead.id, etapas[2].id, NOW);

    const [atividade] = listActivities(db, U, lead.id);
    expect(atividade.kind).toBe('stage_change');
    expect(atividade.body).toBe(`${etapas[0].name} → ${etapas[2].name}`);
  });

  it('não grava atividade quando a etapa é a mesma', () => {
    const db = freshDb();
    const etapas = listStages(db, U);
    const lead = insertLead(db, { stageId: etapas[1].id });

    moveLeadToStage(db, U, lead.id, etapas[1].id, NOW);
    expect(listActivities(db, U, lead.id)).toHaveLength(0);
  });

  it('lança erro quando a etapa não existe', () => {
    const db = freshDb();
    const lead = insertLead(db);
    expect(() => moveLeadToStage(db, U, lead.id, 999, NOW)).toThrow(/999/);
  });
});

describe('stages', () => {
  it('lista em ordem de position', () => {
    expect(listStages(freshDb(), U).map((s) => s.name)).toEqual([
      'Novo', 'Contatado', 'Reunião', 'Proposta', 'Fechado', 'Perdido',
    ]);
  });

  it('cria etapa no fim da fila', () => {
    const db = freshDb();
    const nova = createStage(db, U, { name: 'Negociação', kind: 'open', color: '#555' });
    expect(nova.position).toBe(7);
    expect(listStages(db, U).at(-1)!.name).toBe('Negociação');
  });

  it('renomeia', () => {
    const db = freshDb();
    const alvo = listStages(db, U)[0];
    expect(renameStage(db, U, alvo.id, 'Entrada').name).toBe('Entrada');
  });

  it('reordena conforme a lista de ids', () => {
    const db = freshDb();
    const etapas = listStages(db, U);
    const invertido = [...etapas].reverse().map((s) => s.id);

    const out = reorderStages(db, U, invertido);
    expect(out.map((s) => s.id)).toEqual(invertido);
    expect(out.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('ao excluir, move os leads para a etapa indicada', () => {
    const db = freshDb();
    const etapas = listStages(db, U);
    const lead = insertLead(db, { stageId: etapas[2].id });

    deleteStage(db, U, etapas[2].id, etapas[0].id);

    const row = db.select().from(leads).where(eq(leads.id, lead.id)).get()!;
    expect(row.stageId).toBe(etapas[0].id);
    expect(listStages(db, U)).toHaveLength(5);
  });

  it('recompacta as posições após excluir', () => {
    const db = freshDb();
    const etapas = listStages(db, U);
    deleteStage(db, U, etapas[2].id, etapas[0].id);
    expect(listStages(db, U).map((s) => s.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('recusa mover os leads para a própria etapa excluída', () => {
    const db = freshDb();
    const alvo = listStages(db, U)[1];
    expect(() => deleteStage(db, U, alvo.id, alvo.id)).toThrow(/mesma etapa/i);
  });

  it('recusa destino inexistente', () => {
    const db = freshDb();
    const alvo = listStages(db, U)[1];
    expect(() => deleteStage(db, U, alvo.id, 999)).toThrow(/999/);
  });

  it('recusa excluir a última etapa restante', () => {
    const db = freshDb();
    const etapas = listStages(db, U);
    for (let i = 1; i < etapas.length; i++) {
      deleteStage(db, U, etapas[i].id, etapas[0].id);
    }
    expect(() => deleteStage(db, U, etapas[0].id, etapas[0].id)).toThrow();
  });
});

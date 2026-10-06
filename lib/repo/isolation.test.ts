import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { createTestUser } from '@/lib/db/test-users';
import { leads, stages } from '@/lib/db/schema';
import { countByTemperature, deleteLeads, getLead, listLeads, updateUserBlock, upsertPlace } from './leads';
import { deleteStage, getStage, listStages, reorderStages, updateStage } from './stages';
import { addActivity, listActivities } from './activities';
import type { NormalizedPlace } from '@/lib/places/types';

const NOW = '2026-10-05T12:00:00.000Z';
let db: HelixDb;
let close: () => void;
let A: string;
let B: string;
beforeEach(() => { ({ db, close } = createTestDb()); A = createTestUser(db, 'user-a'); B = createTestUser(db, 'user-b'); });
afterEach(() => close());

function place(over: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
    placeId: 'ChIJ1', name: 'Barbearia Um', formattedAddress: 'Rua A, 1', lat: -23.5, lng: -46.6,
    phone: null, websiteUri: null, rating: 4.5, userRatingCount: 30, businessStatus: 'OPERATIONAL',
    primaryType: 'barber_shop', primaryTypeDisplay: 'Barbearia', googleMapsUri: null,
    rawJson: '{}', temperature: 'quente', ...over,
  };
}

describe('isolamento nos repositórios', () => {
  it('o mesmo place_id vira um lead por usuário, e a rebusca de um não toca o outro', () => {
    const a = upsertPlace(db, A, place(), NOW);
    const b = upsertPlace(db, B, place(), NOW);
    expect(a.leadId).not.toBe(b.leadId);
    expect(a.wasNew && b.wasNew).toBe(true);
    updateUserBlock(db, B, b.leadId, { notes: 'só do B' }, NOW);
    upsertPlace(db, A, place({ name: 'Renomeada' }), NOW);
    expect(getLead(db, B, b.leadId)?.name).toBe('Barbearia Um');
    expect(getLead(db, B, b.leadId)?.notes).toBe('só do B');
  });

  it('novo lead entra na primeira etapa do próprio usuário', () => {
    const { leadId } = upsertPlace(db, B, place(), NOW);
    expect(getLead(db, B, leadId)?.stageId).toBe(listStages(db, B)[0].id);
  });

  it('listagem, busca textual e contagem só enxergam o próprio usuário', () => {
    upsertPlace(db, A, place({ placeId: 'a1', name: 'Café do A' }), NOW);
    upsertPlace(db, B, place({ placeId: 'b1', name: 'Café do B' }), NOW);
    expect(listLeads(db, A, {}).rows.map((l) => l.name)).toEqual(['Café do A']);
    expect(listLeads(db, A, { search: 'Café' }).rows.map((l) => l.name)).toEqual(['Café do A']);
    expect(countByTemperature(db, A).quente).toBe(1);
  });

  it('leitura, edição e exclusão de lead alheio se comportam como inexistente', () => {
    const { leadId } = upsertPlace(db, B, place(), NOW);
    expect(getLead(db, A, leadId)).toBeNull();
    expect(() => updateUserBlock(db, A, leadId, { notes: 'x' }, NOW)).toThrow(/não encontrado/);
    expect(deleteLeads(db, A, { ids: [leadId] })).toBe(0);
    expect(() => addActivity(db, A, { leadId, kind: 'nota', body: 'x' }, NOW)).toThrow(/não encontrado/);
    expect(() => listActivities(db, A, leadId)).toThrow(/não encontrado/);
    expect(getLead(db, B, leadId)?.notes).toBeNull();
  });

  it('lead não pode apontar para etapa de outro usuário', () => {
    const { leadId } = upsertPlace(db, A, place(), NOW);
    const etapaB = listStages(db, B)[1].id;
    expect(() => updateUserBlock(db, A, leadId, { stageId: etapaB }, NOW)).toThrow(/não encontrada/);
  });

  it('etapas alheias são invisíveis para leitura, edição, reordenação e exclusão', () => {
    const etapasB = listStages(db, B);
    const etapasA = listStages(db, A);
    expect(getStage(db, A, etapasB[0].id)).toBeNull();
    expect(() => updateStage(db, A, etapasB[0].id, { name: 'x' })).toThrow(/não encontrada/);
    expect(() => reorderStages(db, A, etapasB.map((s) => s.id))).toThrow(/todas as etapas/);
    expect(() => deleteStage(db, A, etapasB[0].id, etapasA[0].id)).toThrow(/não encontrada/);
    expect(() => deleteStage(db, A, etapasA[0].id, etapasB[0].id)).toThrow(/não encontrada/);
    expect(db.select().from(stages).all()).toHaveLength(12);
    expect(db.select().from(leads).all()).toHaveLength(0);
  });

  it('deleteLeads sem filtro é recusado mesmo com o escopo do usuário', () => {
    expect(() => deleteLeads(db, A, {})).toThrow(/Delimite/);
  });
});

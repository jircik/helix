import { describe, it, expect } from 'vitest';
import { groupByStage } from './group';
import type { Lead, Stage } from '@/lib/db/schema';

const NOW = '2026-09-06T12:00:00.000Z';

const STAGES: Stage[] = [
  { id: 1, name: 'Novo', position: 1, color: null, kind: 'open' },
  { id: 2, name: 'Contatado', position: 2, color: null, kind: 'open' },
  { id: 3, name: 'Fechado', position: 3, color: null, kind: 'won' },
];

function lead(id: number, stageId: number | null): Lead {
  return {
    id, placeId: `p${id}`, name: `Lead ${id}`, formattedAddress: null,
    lat: null, lng: null, phone: null, websiteUri: null, rating: null,
    userRatingCount: null, businessStatus: null, primaryType: null,
    primaryTypeDisplay: null, googleMapsUri: null, rawJson: '{}',
    capturedAt: NOW, temperature: 'quente', stageId, verification: 'pendente',
    disqualifyReason: null, verifiedBy: null, verifiedAt: null,
    contactName: null, email: null, instagram: null, whatsapp: null,
    notes: null, nextAction: null, nextActionAt: null,
    createdAt: NOW, updatedAt: NOW,
  } as Lead;
}

describe('groupByStage', () => {
  it('devolve uma coluna por etapa, na ordem', () => {
    const out = groupByStage(STAGES, []);
    expect(out.map((c) => c.stage.name)).toEqual(['Novo', 'Contatado', 'Fechado']);
  });

  it('mantém colunas vazias', () => {
    const out = groupByStage(STAGES, [lead(1, 2)]);
    expect(out[0].leads).toHaveLength(0);
    expect(out[1].leads).toHaveLength(1);
  });

  it('agrupa os leads na etapa certa', () => {
    const out = groupByStage(STAGES, [lead(1, 1), lead(2, 1), lead(3, 3)]);
    expect(out[0].leads.map((l) => l.id)).toEqual([1, 2]);
    expect(out[2].leads.map((l) => l.id)).toEqual([3]);
  });

  it('joga lead sem etapa na primeira coluna', () => {
    const out = groupByStage(STAGES, [lead(9, null)]);
    expect(out[0].leads.map((l) => l.id)).toEqual([9]);
  });

  it('joga lead com etapa inexistente na primeira coluna', () => {
    const out = groupByStage(STAGES, [lead(9, 77)]);
    expect(out[0].leads.map((l) => l.id)).toEqual([9]);
  });

  it('devolve lista vazia quando não há etapas', () => {
    expect(groupByStage([], [lead(1, null)])).toEqual([]);
  });
});

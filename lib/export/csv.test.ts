import { describe, it, expect } from 'vitest';
import { toCsv, CSV_HEADER } from './csv';
import type { Lead } from '@/lib/db/schema';

const NOW = '2026-09-06T12:00:00.000Z';

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: 1, placeId: 'p1', name: 'Barbearia Um', formattedAddress: 'Rua A, 1',
    lat: -23.5, lng: -46.6, phone: '(11) 90000-0001', websiteUri: null,
    rating: 4.5, userRatingCount: 30, businessStatus: 'OPERATIONAL',
    primaryType: 'barber_shop', primaryTypeDisplay: 'Barbearia',
    googleMapsUri: 'https://maps.google.com/?cid=1', rawJson: '{}',
    capturedAt: NOW, temperature: 'quente', stageId: null,
    verification: 'pendente', disqualifyReason: null, verifiedBy: null,
    verifiedAt: null, contactName: null, email: null, instagram: null,
    whatsapp: null, notes: null, nextAction: null, nextActionAt: null,
    createdAt: NOW, updatedAt: NOW, ...over,
  } as Lead;
}

describe('toCsv', () => {
  it.each(['=HYPERLINK("http://example.com")', '+SUM(1,2)', '-1+2', '@SUM(1,2)', '\t=1+1'])('neutraliza fórmula em campo de texto %s', (name) => {
    expect(toCsv([lead({ name })])).toContain('"\'' + name.replace(/"/g, '""') + '"');
  });
  it('começa pelo cabeçalho', () => {
    expect(toCsv([]).split('\n')[0]).toBe(CSV_HEADER.map((h) => `"${h}"`).join(','));
  });

  it('escreve uma linha por lead', () => {
    expect(toCsv([lead(), lead({ id: 2 })]).split('\n')).toHaveLength(3);
  });

  it('escapa aspas duplicando', () => {
    expect(toCsv([lead({ name: 'Bar "do" Zé' })])).toContain('"Bar ""do"" Zé"');
  });

  it('escreve campo nulo como string vazia', () => {
    expect(toCsv([lead({ phone: null })])).toContain('""');
  });

  it('inclui a temperatura', () => {
    expect(toCsv([lead({ temperature: 'morno' })])).toContain('"morno"');
  });

  it('mantém quebra de linha dentro do campo entre aspas', () => {
    const csv = toCsv([lead({ notes: 'linha 1\nlinha 2' })]);
    expect(csv).toContain('"linha 1\nlinha 2"');
  });
});

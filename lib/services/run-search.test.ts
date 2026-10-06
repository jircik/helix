import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { leads, searches, leadSearches, type Lead } from '@/lib/db/schema';
import { createTestUser } from '@/lib/db/test-users';
import { applyClientFilters, runSearch } from './run-search';
import type { SearchTextResponse } from '@/lib/places/types';

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
const deps = (fetchFn: unknown) => ({
  apiKey: 'k',
  fetchFn: fetchFn as typeof fetch,
  sleep: async () => {},
  now: () => NOW,
  limits: { perUser: 1000, global: 1000 },
});

function ok(body: SearchTextResponse) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

const RESULTADOS: SearchTextResponse = {
  places: [
    { id: 'a', displayName: { text: 'Sem site' } },
    { id: 'b', displayName: { text: 'Insta' }, websiteUri: 'https://instagram.com/b' },
    { id: 'c', displayName: { text: 'Com site' }, websiteUri: 'https://c.com.br' },
    { displayName: { text: 'Sem id fica de fora' } },
  ],
};

function lead(over: Partial<Lead>): Lead {
  return {
    id: 1, userId: 'user-a', isSample: false, placeId: 'x', name: 'X', formattedAddress: null, lat: null, lng: null,
    phone: null, websiteUri: null, rating: null, userRatingCount: null,
    businessStatus: 'OPERATIONAL', primaryType: null, primaryTypeDisplay: null,
    googleMapsUri: null, rawJson: '{}', capturedAt: NOW, temperature: 'quente',
    stageId: null, verification: 'pendente', disqualifyReason: null,
    verifiedBy: null, verifiedAt: null, contactName: null, email: null,
    instagram: null, whatsapp: null, notes: null, nextAction: null,
    nextActionAt: null, createdAt: NOW, updatedAt: NOW, ...over,
  } as Lead;
}

describe('applyClientFilters', () => {
  it('sem filtros devolve tudo', () => {
    const rows = [lead({ id: 1 }), lead({ id: 2, temperature: 'frio' })];
    expect(applyClientFilters(rows, {})).toHaveLength(2);
  });

  it('filtra por temperatura', () => {
    const rows = [
      lead({ id: 1, temperature: 'quente' }),
      lead({ id: 2, temperature: 'morno' }),
      lead({ id: 3, temperature: 'frio' }),
    ];
    const out = applyClientFilters(rows, { temperatures: ['quente', 'morno'] });
    expect(out.map((r) => r.id)).toEqual([1, 2]);
  });

  it('exige telefone quando requirePhone', () => {
    const rows = [lead({ id: 1, phone: '(11) 1' }), lead({ id: 2, phone: null })];
    expect(applyClientFilters(rows, { requirePhone: true }).map((r) => r.id)).toEqual([1]);
  });

  it('filtra por faixa de avaliações', () => {
    const rows = [
      lead({ id: 1, userRatingCount: 5 }),
      lead({ id: 2, userRatingCount: 50 }),
      lead({ id: 3, userRatingCount: 500 }),
    ];
    const out = applyClientFilters(rows, { minReviews: 10, maxReviews: 100 });
    expect(out.map((r) => r.id)).toEqual([2]);
  });

  it('trata contagem nula como zero na faixa mínima', () => {
    const rows = [lead({ id: 1, userRatingCount: null })];
    expect(applyClientFilters(rows, { minReviews: 1 })).toHaveLength(0);
  });

  it('exclui fechado permanentemente quando pedido', () => {
    const rows = [
      lead({ id: 1, businessStatus: 'OPERATIONAL' }),
      lead({ id: 2, businessStatus: 'CLOSED_PERMANENTLY' }),
    ];
    const out = applyClientFilters(rows, { excludeClosed: true });
    expect(out.map((r) => r.id)).toEqual([1]);
  });
});

describe('runSearch', () => {
  it('grava TODOS os resultados válidos, inclusive os frios', async () => {
    const db = freshDb();
    const fetchFn = vi.fn().mockResolvedValue(ok(RESULTADOS));

    await runSearch(db, U, {
      textQuery: 'barbearia Pinheiros',
      filters: { temperatures: ['quente'] },
    }, deps(fetchFn));

    const rows = db.select().from(leads).all();
    expect(rows).toHaveLength(3); // 'd' cai no normalize por não ter id
    expect(rows.map((r) => r.temperature).sort()).toEqual(['frio', 'morno', 'quente']);
  });

  it('devolve apenas os leads que passaram no filtro', async () => {
    const db = freshDb();
    const fetchFn = vi.fn().mockResolvedValue(ok(RESULTADOS));

    const out = await runSearch(db, U, {
      textQuery: 'barbearia',
      filters: { temperatures: ['quente'] },
    }, deps(fetchFn));

    expect(out.leadIds).toHaveLength(1);
    expect(out.rawCount).toBe(3);
  });

  it('grava a busca com contagens e filtros congelados', async () => {
    const db = freshDb();
    const fetchFn = vi.fn().mockResolvedValue(ok(RESULTADOS));

    const out = await runSearch(db, U, {
      textQuery: 'barbearia Pinheiros',
      includedType: 'barber_shop',
      minRating: 4,
      filters: { temperatures: ['quente'], excludeClosed: true },
    }, deps(fetchFn));

    const row = db.select().from(searches).all()[0];
    expect(row.id).toBe(out.searchId);
    expect(row.textQuery).toBe('barbearia Pinheiros');
    expect(row.includedType).toBe('barber_shop');
    expect(row.minRating).toBe(4);
    expect(row.rawCount).toBe(3);
    expect(row.newCount).toBe(3);
    expect(row.apiRequests).toBe(1);
    expect(row.pagesFetched).toBe(1);
    expect(row.executedAt).toBe(NOW);
    expect(row.error).toBeNull();
    expect(JSON.parse(row.filtersJson)).toEqual({
      temperatures: ['quente'], excludeClosed: true,
    });
  });

  it('liga cada lead à busca em lead_searches', async () => {
    const db = freshDb();
    const fetchFn = vi.fn().mockResolvedValue(ok(RESULTADOS));

    const out = await runSearch(db, U, { textQuery: 'x' }, deps(fetchFn));

    const joins = db.select().from(leadSearches).all();
    expect(joins).toHaveLength(3);
    expect(joins.every((j) => j.searchId === out.searchId)).toBe(true);
    expect(joins.every((j) => j.wasNew)).toBe(true);
  });

  it('na segunda rodada conta newCount zero e marca wasNew falso', async () => {
    const db = freshDb();
    const fetchFn = vi.fn().mockResolvedValue(ok(RESULTADOS));

    await runSearch(db, U, { textQuery: 'x' }, deps(fetchFn));
    const out = await runSearch(db, U, { textQuery: 'x' }, deps(fetchFn));

    expect(out.newCount).toBe(0);
    expect(db.select().from(leads).all()).toHaveLength(3);

    const joins = db.select().from(leadSearches).all()
      .filter((j) => j.searchId === out.searchId);
    expect(joins.every((j) => j.wasNew === false)).toBe(true);
  });

  it('grava a busca com a mensagem de erro quando a API falha', async () => {
    const db = freshDb();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false, status: 429, text: async () => 'RESOURCE_EXHAUSTED',
    } as Response);

    await expect(
      runSearch(db, U, { textQuery: 'x' }, deps(fetchFn)),
    ).rejects.toThrow(/429/);

    const row = db.select().from(searches).all()[0];
    expect(row.error).toMatch(/429/);
    expect(row.rawCount).toBe(0);
    expect(db.select().from(leads).all()).toHaveLength(0);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { createTestUser } from '@/lib/db/test-users';
import { searches } from '@/lib/db/schema';
import { QuotaExceededError, quotaStatus } from './quota';
import { runSearch } from './run-search';

const NOW = '2026-10-05T15:00:00.000Z';
let db: HelixDb;
let close: () => void;
beforeEach(() => { ({ db, close } = createTestDb()); createTestUser(db, 'user-a'); createTestUser(db, 'user-b'); });
afterEach(() => close());

let seq = 0;
/** Cada página devolve um lugar novo; `pages` controla quantas páginas existem. */
function google(pages: number) {
  let served = 0;
  return vi.fn(async () => {
    served++;
    const body = { places: [{ id: `p${++seq}`, displayName: { text: `Lugar ${seq}` } }], nextPageToken: served < pages ? `t${served}` : undefined };
    return new Response(JSON.stringify(body));
  });
}
const deps = (fetchFn: unknown, limits = { perUser: 6, global: 30 }) => ({
  apiKey: 'k', fetchFn: fetchFn as typeof fetch, sleep: async () => {}, now: () => NOW, limits,
});
const used = (userId: string, limits = { perUser: 6, global: 30 }) => quotaStatus(db, userId, limits, NOW);

describe('quotaStatus', () => {
  it('soma só as chamadas reais do dia UTC do usuário', () => {
    db.insert(searches).values([
      { userId: 'user-a', textQuery: 'hoje', filtersJson: '{}', executedAt: '2026-10-05T01:00:00.000Z', apiRequests: 2 },
      { userId: 'user-a', textQuery: 'ontem', filtersJson: '{}', executedAt: '2026-10-04T23:59:59.000Z', apiRequests: 3 },
      { userId: 'user-a', textQuery: 'exemplo', filtersJson: '{}', executedAt: NOW, apiRequests: 3, isSample: true },
      { userId: 'user-b', textQuery: 'do B', filtersJson: '{}', executedAt: NOW, apiRequests: 1 },
    ]).run();
    expect(used('user-a')).toEqual({ used: 2, limit: 6, remaining: 4 });
  });

  it('o restante respeita o menor entre o limite do usuário e o global', () => {
    db.insert(searches).values({ userId: 'user-b', textQuery: 'x', filtersJson: '{}', executedAt: NOW, apiRequests: 28 }).run();
    expect(used('user-a').remaining).toBe(2);
  });
});

describe('runSearch com cota', () => {
  it('bloqueia com 429 quando o usuário esgota a cota, sem gravar busca', async () => {
    await runSearch(db, 'user-a', { textQuery: 'a', maxPages: 3 }, deps(google(3), { perUser: 3, global: 30 }));
    const fetchFn = google(3);
    const error = await runSearch(db, 'user-a', { textQuery: 'b', maxPages: 1 }, deps(fetchFn, { perUser: 3, global: 30 })).catch((e) => e);
    expect(error).toBeInstanceOf(QuotaExceededError);
    expect(error.status).toBe(429);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(db.select().from(searches).all()).toHaveLength(1);
  });

  it('o limite global bloqueia outro usuário', async () => {
    await runSearch(db, 'user-a', { textQuery: 'a', maxPages: 3 }, deps(google(3), { perUser: 6, global: 3 }));
    await expect(runSearch(db, 'user-b', { textQuery: 'b', maxPages: 1 }, deps(google(1), { perUser: 6, global: 3 })))
      .rejects.toBeInstanceOf(QuotaExceededError);
  });

  it('com cota parcial, a busca roda com menos páginas', async () => {
    await runSearch(db, 'user-a', { textQuery: 'a', maxPages: 3 }, deps(google(3), { perUser: 4, global: 30 }));
    const fetchFn = google(3);
    const out = await runSearch(db, 'user-a', { textQuery: 'b', maxPages: 3 }, deps(fetchFn, { perUser: 4, global: 30 }));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(out.apiRequests).toBe(1);
  });

  it('devolve a reserva que não foi usada', async () => {
    await runSearch(db, 'user-a', { textQuery: 'a', maxPages: 3 }, deps(google(1)));
    expect(used('user-a').used).toBe(1);
  });

  it('erro do Google cobra só as chamadas feitas', async () => {
    const fetchFn = vi.fn(async () => new Response('boom', { status: 500 }));
    await expect(runSearch(db, 'user-a', { textQuery: 'a', maxPages: 3 }, deps(fetchFn))).rejects.toThrow(/500/);
    expect(used('user-a').used).toBe(1);
  });

  it('duas buscas simultâneas não furam o limite', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const slow = vi.fn(async () => { await gate; return new Response(JSON.stringify({ places: [] })); });
    const limits = { perUser: 3, global: 30 };
    const first = runSearch(db, 'user-a', { textQuery: 'a', maxPages: 3 }, deps(slow, limits));
    const second = runSearch(db, 'user-a', { textQuery: 'b', maxPages: 3 }, deps(slow, limits));
    await expect(second).rejects.toBeInstanceOf(QuotaExceededError);
    release();
    await first;
    expect(slow).toHaveBeenCalledTimes(1);
  });
});

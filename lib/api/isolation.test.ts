import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { createTestUser } from '@/lib/db/test-users';
import { leads, searches, searchPresets, stages } from '@/lib/db/schema';
import { listStages } from '@/lib/repo/stages';
import { GET as listLeadsRoute, DELETE as deleteLeadsRoute } from '@/app/api/leads/route';
import { GET as getLeadRoute, PATCH as patchLeadRoute } from '@/app/api/leads/[id]/route';
import { PUT as moveRoute } from '@/app/api/leads/[id]/stage/route';
import { GET as timelineRoute, POST as activityRoute } from '@/app/api/leads/[id]/activities/route';
import { GET as exportRoute } from '@/app/api/leads/export/route';
import { GET as overviewRoute } from '@/app/api/overview/route';
import { GET as searchesRoute, POST as searchRoute } from '@/app/api/searches/route';
import { GET as stagesRoute, PUT as reorderRoute } from '@/app/api/stages/route';
import { PATCH as patchStageRoute, DELETE as deleteStageRoute } from '@/app/api/stages/[id]/route';

let db: HelixDb;
let close: () => void;
vi.mock('@/lib/db/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/db/client')>(), getDb: () => db,
}));
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: async () => 'user-a' }));
vi.mock('@/lib/env', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/env')>(),
  getEnv: () => ({ googlePlacesKey: 'k', googleMapsBrowserKey: 'k', databaseUrl: ':memory:' }),
}));

const NOW = '2026-10-05T12:00:00.000Z';
let leadB: number;
let stageB: number;
let presetB: number;
beforeEach(() => {
  ({ db, close } = createTestDb());
  createTestUser(db, 'user-a');
  createTestUser(db, 'user-b');
  stageB = listStages(db, 'user-b')[0].id;
  leadB = db.insert(leads).values({ userId: 'user-b', name: 'Segredo do B', temperature: 'quente', stageId: stageB,
    capturedAt: NOW, createdAt: NOW, updatedAt: NOW }).returning().get().id;
  db.insert(searches).values({ userId: 'user-b', textQuery: 'busca do B', filtersJson: '{}', executedAt: NOW }).run();
  presetB = db.insert(searchPresets).values({ userId: 'user-b', name: 'p', textQuery: 'q', filtersJson: '{}',
    createdAt: NOW }).returning().get().id;
});
afterEach(() => close());

const req = (path: string, init?: RequestInit) => new Request('http://localhost' + path, init);
const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });
const p = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe('usuário A não alcança nada do usuário B', () => {
  it.each([
    ['GET lead', () => getLeadRoute(req(`/api/leads/${leadB}`), p(leadB))],
    ['PATCH lead', () => patchLeadRoute(req(`/api/leads/${leadB}`, json('PATCH', { notes: 'x' })), p(leadB))],
    ['PUT etapa do lead', () => moveRoute(req(`/api/leads/${leadB}/stage`, json('PUT', { stageId: listStages(db, 'user-a')[0].id })), p(leadB))],
    ['GET timeline', () => timelineRoute(req(`/api/leads/${leadB}/activities`), p(leadB))],
    ['POST atividade', () => activityRoute(req(`/api/leads/${leadB}/activities`, json('POST', { kind: 'nota', body: 'x' })), p(leadB))],
    ['PATCH etapa', () => patchStageRoute(req(`/api/stages/${stageB}`, json('PATCH', { name: 'x' })), p(stageB))],
    ['DELETE etapa', () => deleteStageRoute(req(`/api/stages/${stageB}?moveLeadsTo=${listStages(db, 'user-a')[0].id}`, { method: 'DELETE' }), p(stageB))],
    ['POST busca com preset alheio', () => searchRoute(req('/api/searches', json('POST', { textQuery: 'x', presetId: presetB })))],
  ])('%s → 404', async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(404);
  });

  it('mover lead próprio para etapa alheia → 404', async () => {
    const leadA = db.insert(leads).values({ userId: 'user-a', name: 'A', temperature: 'quente',
      capturedAt: NOW, createdAt: NOW, updatedAt: NOW }).returning().get().id;
    const res = await moveRoute(req(`/api/leads/${leadA}/stage`, json('PUT', { stageId: stageB })), p(leadA));
    expect(res.status).toBe(404);
  });

  it('listagens, overview, histórico e CSV não contêm dados do B', async () => {
    const all = await (await listLeadsRoute(req('/api/leads?temperatures=quente,morno,frio&verifications=pendente,qualificado,descartado'))).json();
    expect(all.total).toBe(0);
    const overview = await (await overviewRoute(req('/api/overview'))).json();
    expect(overview.porTemperatura.quente).toBe(0);
    expect(await (await searchesRoute(req('/api/searches'))).json()).toEqual([]);
    expect((await (await stagesRoute(req('/api/stages'))).json()).every((s: { userId: string }) => s.userId === 'user-a')).toBe(true);
    expect(await (await exportRoute(req('/api/leads/export'))).text()).not.toContain('Segredo do B');
  });

  it('DELETE por ids alheios apaga zero e reordenar com etapas alheias falha', async () => {
    expect(await (await deleteLeadsRoute(req(`/api/leads?ids=${leadB}`, { method: 'DELETE' }))).json()).toEqual({ deleted: 0 });
    const reorder = await reorderRoute(req('/api/stages', json('PUT', { orderedIds: listStages(db, 'user-b').map((s) => s.id) })));
    expect(reorder.status).toBe(400);
    expect(db.select().from(leads).all()).toHaveLength(1);
    expect(db.select().from(stages).all()).toHaveLength(12);
  });
});

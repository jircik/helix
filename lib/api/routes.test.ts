import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { createTestUser } from '@/lib/db/test-users';
import { leads } from '@/lib/db/schema';
import { GET as list } from '@/app/api/leads/route';
import { PATCH as patch } from '@/app/api/leads/[id]/route';
import { POST as search } from '@/app/api/searches/route';
import { GET as exportCsv } from '@/app/api/leads/export/route';
import { GET as timeline, POST as activity } from '@/app/api/leads/[id]/activities/route';

let db: HelixDb;
let close: () => void;
vi.mock('@/lib/db/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/db/client')>(), getDb: () => db,
}));
const sessionUser = vi.hoisted(() => ({ id: 'user-a' as string | null }));
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: async () => sessionUser.id }));
beforeEach(() => { ({ db, close } = createTestDb()); createTestUser(db); sessionUser.id = 'user-a'; });
afterEach(() => close());
const NOW = '2026-09-07T12:00:00.000Z';
function lead(name: string) { return db.insert(leads).values({ userId: 'user-a', name, temperature: 'quente', capturedAt: NOW, createdAt: NOW, updatedAt: NOW }).returning().get(); }
describe('rotas reais com banco em memória', () => {
  it('sem sessão, toda rota responde 401', async () => {
    sessionUser.id = null;
    const res = await list(new Request('http://localhost/api/leads'));
    expect(res.status).toBe(401);
  });
  it('não permite criar histórico de mudança de etapa manualmente', async () => {
    const first = lead('Original');
    const res = await activity(new Request('http://localhost/api/leads/1/activities', { method: 'POST', body: JSON.stringify({ kind: 'stage_change', body: 'Inventado' }) }), { params: Promise.resolve({ id: String(first.id) }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/automaticamente/);
  });
  it('timeline de lead inexistente retorna 404', async () => {
    const res = await timeline(new Request('http://localhost/api/leads/999/activities'), { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });
  it('busca IDs exatos e mantém filtros', async () => {
    const first = lead('Primeiro'); lead('Segundo');
    const res = await list(new Request(`http://localhost/api/leads?ids=${first.id}`));
    expect(res.status).toBe(200);
    expect((await res.json()).rows.map((l: { name: string }) => l.name)).toEqual(['Primeiro']);
  });
  it('rejeita JSON inválido na busca sem executar o cliente externo', async () => {
    const res = await search(new Request('http://localhost/api/searches', { method: 'POST', body: '{' }));
    expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: 'JSON inválido.' });
  });
  it('PATCH não aceita alterar dados Google', async () => {
    const first = lead('Original');
    const res = await patch(new Request('http://localhost/api/leads/1', { method: 'PATCH', body: JSON.stringify({ name: 'Inválido' }) }), { params: Promise.resolve({ id: String(first.id) }) });
    expect(res.status).toBe(400); expect((await res.json()).error).toMatch(/não permitido/);
    expect(db.select().from(leads).get()?.name).toBe('Original');
  });
  it.each(['limit=-1', 'offset=-1', 'temperatures=errada', 'stageId=abc'])('retorna JSON 400 para filtro inválido %s', async (query) => {
    const res = await list(new Request('http://localhost/api/leads?' + query));
    expect(res.status).toBe(400); expect((await res.json()).error).toBeTruthy();
  });
  it('exportação compartilha filtro e gera download', async () => {
    lead('Café exportado');
    const res = await exportCsv(new Request('http://localhost/api/leads/export'));
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(await res.text()).toContain('Café exportado');
  });
});

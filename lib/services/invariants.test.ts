import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { seedStages } from '@/lib/db/seed';
import { leads, searches, leadSearches, activities } from '@/lib/db/schema';
import { getLead, listLeads, updateUserBlock, type UserBlockPatch } from '@/lib/repo/leads';
import { listStages, deleteStage, reorderStages, updateStage } from '@/lib/repo/stages';
import { editLead, moveLeadToStage } from './lead-actions';
import { runSearch } from './run-search';
import { getOverview } from './overview';
import { exportLeads } from './export-leads';
import { fetchPlaces } from '@/lib/places/client';

const NOW = '2026-09-07T12:00:00.000Z';
let db: HelixDb;
let close: () => void;
beforeEach(() => { ({ db, close } = createTestDb()); seedStages(db); });
afterEach(() => close());
function insert(over: Partial<typeof leads.$inferInsert> = {}) {
  return db.insert(leads).values({ name: 'Café São José', temperature: 'quente', stageId: listStages(db)[0].id,
    capturedAt: NOW, createdAt: NOW, updatedAt: NOW, ...over }).returning().get();
}
const success = (places: unknown[], nextPageToken?: string) => new Response(JSON.stringify({ places, nextPageToken }));

describe('integridade do CRM', () => {
  it('rejeita campos Google recebidos por JSON em tempo de execução', () => {
    const lead = insert();
    expect(() => updateUserBlock(db, lead.id, { name: 'Alterado', notes: 'não salvar' } as unknown as UserBlockPatch, NOW)).toThrow(/Campo não permitido/);
    expect(getLead(db, lead.id)?.name).toBe('Café São José');
    expect(getLead(db, lead.id)?.notes).toBeNull();
  });
  it('salva edição e mudança de etapa com histórico; destino inválido desfaz toda a edição', () => {
    const lead = insert();
    editLead(db, lead.id, { stageId: listStages(db)[1].id, contactName: 'Maria' }, NOW);
    expect(db.select().from(activities).get()?.body).toBe('Novo → Contatado');
    expect(() => editLead(db, lead.id, { stageId: 999, contactName: 'Não persistir' }, NOW)).toThrow(/999/);
    expect(getLead(db, lead.id)?.contactName).toBe('Maria');
    expect(db.select().from(activities).all()).toHaveLength(1);
  });
  it('falha na timeline desfaz a movimentação', () => {
    const lead = insert();
    db.run(sql`CREATE TRIGGER reject_activity BEFORE INSERT ON activities BEGIN SELECT RAISE(ABORT, 'falha simulada'); END`);
    expect(() => moveLeadToStage(db, lead.id, listStages(db)[1].id, NOW)).toThrow();
    expect(getLead(db, lead.id)?.stageId).toBe(lead.stageId);
  });
  it('exclusão de etapa preserva leads e registra os nomes no histórico', () => {
    const lead = insert();
    const [origin, destination] = listStages(db);
    deleteStage(db, origin.id, destination.id);
    expect(getLead(db, lead.id)?.stageId).toBe(destination.id);
    expect(db.select().from(activities).get()?.body).toBe('Novo → Contatado');
  });
  it('reordenação inválida não altera posições e cor/tipo persistem', () => {
    const stages = listStages(db);
    expect(() => reorderStages(db, [stages[0].id, stages[0].id])).toThrow();
    expect(listStages(db)).toEqual(stages);
    expect(updateStage(db, stages[0].id, { color: '#123456', kind: 'won' })).toMatchObject({ color: '#123456', kind: 'won' });
  });
  it('busca FTS ignora acentos e acompanha alterações nas notas', () => {
    const lead = insert();
    expect(listLeads(db, { search: 'cafe sao' }).rows.map((l) => l.id)).toEqual([lead.id]);
    updateUserBlock(db, lead.id, { notes: 'Orçamento enviado' }, NOW);
    expect(listLeads(db, { search: 'orcamento' }).total).toBe(1);
    expect(listLeads(db, { search: '" OR zzz *' }).total).toBe(0);
  });
  it('exige motivo e impede apagar o motivo de um descartado', () => {
    const lead = insert();
    expect(() => editLead(db, lead.id, { verification: 'descartado' }, NOW)).toThrow(/motivo/);
    editLead(db, lead.id, { verification: 'descartado', disqualifyReason: 'Tem site' }, NOW);
    expect(() => editLead(db, lead.id, { disqualifyReason: null }, NOW)).toThrow(/motivo/);
  });
  it('normaliza datas para UTC e rejeita datas sem fuso', () => {
    const lead = insert();
    expect(editLead(db, lead.id, { nextActionAt: '2026-09-08T09:00:00-03:00' }, NOW).nextActionAt).toBe('2026-09-08T12:00:00.000Z');
    expect(() => editLead(db, lead.id, { nextActionAt: '2026-09-08' }, NOW)).toThrow(/fuso/);
  });
  it('overview remove descartados e etapas encerradas das próximas ações', () => {
    insert({ name: 'Ativo', nextActionAt: NOW });
    insert({ verification: 'descartado', nextActionAt: NOW });
    insert({ stageId: listStages(db).find((s) => s.kind === 'won')!.id, nextActionAt: NOW });
    insert({ nextActionAt: '2027-01-01T00:00:00.000Z' });
    expect(getOverview(db, new Date(NOW)).proximasAcoes.map((l) => l.name)).toEqual(['Ativo']);
  });
  it('exporta todas as páginas e respeita o mesmo filtro', () => {
    db.transaction(() => { for (let i = 0; i < 505; i++) insert({ name: `Lead ${i}` }); });
    insert({ name: 'Frio não exportado', temperature: 'frio' });
    const csv = exportLeads(db, { temperatures: ['quente'] });
    expect(csv.split('\n')).toHaveLength(506);
    expect(csv).not.toContain('Frio não exportado');
  });
});

describe('busca parcial e limites', () => {
  it('preserva página recebida, erro e duas tentativas quando a segunda página falha', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(success([{ id: 'p1', displayName: { text: 'Encontrado' } }], 'next'))
      .mockResolvedValueOnce(new Response('RESOURCE_EXHAUSTED', { status: 429 }));
    await expect(runSearch(db, { textQuery: 'café' }, { apiKey: 'test', fetchFn, sleep: async () => {}, now: () => NOW })).rejects.toThrow(/429/);
    expect(db.select().from(searches).get()).toMatchObject({ pagesFetched: 1, apiRequests: 2, newCount: 1, rawCount: 1 });
    expect(db.select().from(leads).get()?.name).toBe('Encontrado');
    expect(db.select().from(leadSearches).all()).toHaveLength(1);
  });
  it('registra também uma tentativa de rede que não recebeu resposta', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Conexão interrompida'));
    await expect(runSearch(db, { textQuery: 'x' }, { apiKey: 'test', fetchFn })).rejects.toThrow(/Conexão/);
    expect(db.select().from(searches).get()).toMatchObject({ apiRequests: 1, pagesFetched: 0, rawCount: 0 });
  });
  it.each([0, -1, 1.5, Number.NaN, Infinity])('recusa maxPages %s sem fazer chamadas', async (maxPages) => {
    const fetchFn = vi.fn();
    await expect(fetchPlaces({ textQuery: 'x', maxPages }, { apiKey: 'test', fetchFn })).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('desfaz lote se a gravação da procedência falhar e mantém auditoria', async () => {
    db.run(sql`CREATE TRIGGER reject_join BEFORE INSERT ON lead_searches BEGIN SELECT RAISE(ABORT, 'falha simulada'); END`);
    const fetchFn = vi.fn().mockResolvedValue(success([{ id: 'x', displayName: { text: 'Não persistir' } }]));
    await expect(runSearch(db, { textQuery: 'x' }, { apiKey: 'test', fetchFn })).rejects.toThrow();
    expect(db.select().from(leads).all()).toEqual([]);
    expect(db.select().from(searches).get()?.apiRequests).toBe(1);
    expect(db.select().from(searches).get()?.error).toBeTruthy();
  });
  it('repetir busca mantém todos os campos manuais e histórico', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(success([{ id: 'x', displayName: { text: 'Google' } }])));
    const deps = { apiKey: 'test', fetchFn, now: () => NOW };
    await runSearch(db, { textQuery: 'x' }, deps);
    const lead = db.select().from(leads).get()!;
    editLead(db, lead.id, { verification: 'descartado', disqualifyReason: 'Tem site', notes: 'Manual', stageId: listStages(db)[2].id }, NOW);
    const before = getLead(db, lead.id);
    const out = await runSearch(db, { textQuery: 'x' }, deps);
    expect(out.newCount).toBe(0);
    expect(getLead(db, lead.id)).toEqual(before);
    expect(db.select().from(activities).all()).toHaveLength(1);
    expect(db.select().from(leadSearches).where(eq(leadSearches.leadId, lead.id)).all()).toHaveLength(2);
  });
});

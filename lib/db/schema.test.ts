import { afterEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type HelixDb } from './client';
import { activities, DEFAULT_STAGES, leads, searches, stages, user } from './schema';
import { ensureDefaultStages } from './seed';
import { createTestUser } from './test-users';

let close: (() => void) | undefined;
function freshDb(): HelixDb {
  const testDb = createTestDb();
  close = testDb.close;
  return testDb.db;
}
afterEach(() => {
  close?.();
  close = undefined;
});

const NOW = '2026-09-06T12:00:00.000Z';
function baseLead(overrides: Partial<typeof leads.$inferInsert> = {}) {
  return {
    userId: 'user-a', placeId: 'place-1', name: 'Barbearia Teste', temperature: 'quente' as const,
    capturedAt: NOW, createdAt: NOW, updatedAt: NOW, ...overrides,
  };
}

describe('schema', () => {
  it('rejeita place_id duplicado para o mesmo usuário', () => {
    const db = freshDb();
    createTestUser(db);
    db.insert(leads).values(baseLead()).run();
    expect(() => db.insert(leads).values(baseLead({ name: 'Outra' })).run()).toThrow(/UNIQUE/i);
  });

  it('permite o mesmo place_id em usuários diferentes', () => {
    const db = freshDb();
    createTestUser(db, 'user-a');
    createTestUser(db, 'user-b');
    db.insert(leads).values(baseLead({ userId: 'user-a' })).run();
    db.insert(leads).values(baseLead({ userId: 'user-b' })).run();
    expect(db.select().from(leads).all()).toHaveLength(2);
  });

  it('ensureDefaultStages grava o funil padrão do usuário em ordem', () => {
    const db = freshDb();
    createTestUser(db, 'user-a', false);
    ensureDefaultStages(db, 'user-a');
    const rows = db.select().from(stages).orderBy(stages.position).all();
    expect(rows.map((stage) => stage.name)).toEqual(DEFAULT_STAGES.map((stage) => stage.name));
    expect(rows.every((stage) => stage.userId === 'user-a')).toBe(true);
    expect(rows.at(-1)?.kind).toBe('lost');
  });

  it('ensureDefaultStages é idempotente por usuário e independente entre usuários', () => {
    const db = freshDb();
    createTestUser(db, 'user-a', false);
    createTestUser(db, 'user-b', false);
    ensureDefaultStages(db, 'user-a');
    ensureDefaultStages(db, 'user-a');
    ensureDefaultStages(db, 'user-b');
    expect(db.select().from(stages).all()).toHaveLength(DEFAULT_STAGES.length * 2);
  });

  it('apagar o usuário apaga etapas, leads, atividades e buscas em cascata', () => {
    const db = freshDb();
    createTestUser(db);
    const lead = db.insert(leads).values(baseLead()).returning().get();
    db.insert(activities).values({ leadId: lead.id, kind: 'nota', body: 'oi', occurredAt: NOW, createdAt: NOW }).run();
    db.insert(searches).values({ userId: 'user-a', textQuery: 'x', filtersJson: '{}', executedAt: NOW }).run();
    db.delete(user).where(eq(user.id, 'user-a')).run();
    expect(db.select().from(stages).all()).toHaveLength(0);
    expect(db.select().from(leads).all()).toHaveLength(0);
    expect(db.select().from(activities).all()).toHaveLength(0);
    expect(db.select().from(searches).all()).toHaveLength(0);
  });

  it('permite múltiplos leads sem place_id', () => {
    const db = freshDb(); createTestUser(db);
    db.insert(leads).values(baseLead({ placeId: null, name: 'Manual A' })).run();
    db.insert(leads).values(baseLead({ placeId: null, name: 'Manual B' })).run();
    expect(db.select().from(leads).all()).toHaveLength(2);
  });

  it('usa pendente como verificação padrão', () => {
    const db = freshDb(); createTestUser(db);
    db.insert(leads).values(baseLead()).run();
    expect(db.select().from(leads).get()?.verification).toBe('pendente');
  });

  it('rejeita valores fora dos enums no SQLite', () => {
    const db = freshDb(); createTestUser(db, 'user-a', false);
    expect(() => db.run(sql`insert into stages (user_id, name, position, kind) values ('user-a', 'Inválida', 1, 'paused')`))
      .toThrow();
    expect(() => db.run(sql`insert into leads (user_id, name, captured_at, temperature, created_at, updated_at) values ('user-a', 'Inválido', ${NOW}, 'fervendo', ${NOW}, ${NOW})`))
      .toThrow();
  });

  it('apaga atividades em cascata ao apagar o lead', () => {
    const db = freshDb(); createTestUser(db);
    const lead = db.insert(leads).values(baseLead()).returning().get();
    db.insert(activities).values({ leadId: lead.id, kind: 'nota', body: 'oi', occurredAt: NOW, createdAt: NOW }).run();
    db.delete(leads).where(eq(leads.id, lead.id)).run();
    expect(db.select().from(activities).all()).toHaveLength(0);
  });

  it('indexa nome, endereço e notas no FTS5', () => {
    const db = freshDb(); createTestUser(db);
    const lead = db.insert(leads).values(baseLead({ formattedAddress: 'Rua Augusta', notes: 'Cliente premium' })).returning().get();
    for (const term of ['Barbearia', 'Augusta', 'premium']) {
      const matches = db.all<{ rowid: number }>(sql`select rowid from leads_fts where leads_fts match ${term}`);
      expect(matches).toEqual([{ rowid: lead.id }]);
    }
  });

  it('mantém o índice FTS5 sincronizado após update e delete', () => {
    const db = freshDb(); createTestUser(db);
    const lead = db.insert(leads).values(baseLead({ notes: 'antiga' })).returning().get();
    db.update(leads).set({ notes: 'renovada' }).where(eq(leads.id, lead.id)).run();
    expect(db.all(sql`select rowid from leads_fts where leads_fts match 'antiga'`)).toEqual([]);
    expect(db.all(sql`select rowid from leads_fts where leads_fts match 'renovada'`)).toHaveLength(1);
    db.delete(leads).where(eq(leads.id, lead.id)).run();
    expect(db.all(sql`select rowid from leads_fts where leads_fts match 'renovada'`)).toEqual([]);
  });
});

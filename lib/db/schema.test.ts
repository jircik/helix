import { afterEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type HelixDb } from './client';
import { activities, DEFAULT_STAGES, leads, stages } from './schema';
import { seedStages } from './seed';

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
    placeId: 'place-1', name: 'Barbearia Teste', temperature: 'quente' as const,
    capturedAt: NOW, createdAt: NOW, updatedAt: NOW, ...overrides,
  };
}

describe('schema', () => {
  it('rejeita place_id duplicado', () => {
    const db = freshDb();
    db.insert(leads).values(baseLead()).run();
    expect(() => db.insert(leads).values(baseLead({ name: 'Outra' })).run()).toThrow(/UNIQUE/i);
  });

  it('permite múltiplos leads sem place_id', () => {
    const db = freshDb();
    db.insert(leads).values(baseLead({ placeId: null, name: 'Manual A' })).run();
    db.insert(leads).values(baseLead({ placeId: null, name: 'Manual B' })).run();
    expect(db.select().from(leads).all()).toHaveLength(2);
  });

  it('usa pendente como verificação padrão', () => {
    const db = freshDb();
    db.insert(leads).values(baseLead()).run();
    expect(db.select().from(leads).get()?.verification).toBe('pendente');
  });

  it('rejeita valores fora dos enums no SQLite', () => {
    const db = freshDb();
    expect(() => db.run(sql`insert into stages (name, position, kind) values ('Inválida', 1, 'paused')`))
      .toThrow();
    expect(() => db.run(sql`insert into leads (name, captured_at, temperature, created_at, updated_at) values ('Inválido', ${NOW}, 'fervendo', ${NOW}, ${NOW})`))
      .toThrow();
  });

  it('apaga atividades em cascata ao apagar o lead', () => {
    const db = freshDb();
    const lead = db.insert(leads).values(baseLead()).returning().get();
    db.insert(activities).values({ leadId: lead.id, kind: 'nota', body: 'oi', occurredAt: NOW, createdAt: NOW }).run();
    db.delete(leads).where(eq(leads.id, lead.id)).run();
    expect(db.select().from(activities).all()).toHaveLength(0);
  });

  it('indexa nome, endereço e notas no FTS5', () => {
    const db = freshDb();
    const lead = db.insert(leads).values(baseLead({ formattedAddress: 'Rua Augusta', notes: 'Cliente premium' })).returning().get();
    for (const term of ['Barbearia', 'Augusta', 'premium']) {
      const matches = db.all<{ rowid: number }>(sql`select rowid from leads_fts where leads_fts match ${term}`);
      expect(matches).toEqual([{ rowid: lead.id }]);
    }
  });

  it('mantém o índice FTS5 sincronizado após update e delete', () => {
    const db = freshDb();
    const lead = db.insert(leads).values(baseLead({ notes: 'antiga' })).returning().get();
    db.update(leads).set({ notes: 'renovada' }).where(eq(leads.id, lead.id)).run();
    expect(db.all(sql`select rowid from leads_fts where leads_fts match 'antiga'`)).toEqual([]);
    expect(db.all(sql`select rowid from leads_fts where leads_fts match 'renovada'`)).toHaveLength(1);
    db.delete(leads).where(eq(leads.id, lead.id)).run();
    expect(db.all(sql`select rowid from leads_fts where leads_fts match 'renovada'`)).toEqual([]);
  });

  it('seedStages grava as etapas padrão em ordem', () => {
    const db = freshDb();
    seedStages(db);
    const rows = db.select().from(stages).orderBy(stages.position).all();
    expect(rows.map((stage) => stage.name)).toEqual(DEFAULT_STAGES.map((stage) => stage.name));
    expect(rows.at(-1)?.kind).toBe('lost');
  });

  it('seedStages é idempotente', () => {
    const db = freshDb();
    seedStages(db);
    seedStages(db);
    expect(db.select().from(stages).all()).toHaveLength(DEFAULT_STAGES.length);
  });
});

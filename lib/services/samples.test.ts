import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { createTestUser } from '@/lib/db/test-users';
import { activities, leads, searches } from '@/lib/db/schema';
import { listLeads, type ListLeadsInput } from '@/lib/repo/leads';
import { listStages } from '@/lib/repo/stages';
import { quotaStatus } from './quota';
import { generateSamples, getSampleState, removeSamples } from './samples';

const NOW = new Date('2026-10-05T15:00:00.000Z');
let db: HelixDb;
let close: () => void;
beforeEach(() => { ({ db, close } = createTestDb()); createTestUser(db, 'user-a'); createTestUser(db, 'user-b'); });
afterEach(() => close());
const TODOS: ListLeadsInput = { temperatures: ['quente', 'morno', 'frio'], verifications: ['pendente', 'qualificado', 'descartado'] };

describe('dados de exemplo', () => {
  it('gera 60 leads de exemplo nas etapas do próprio usuário, com atividades e buscas', () => {
    const out = generateSamples(db, 'user-a', NOW);
    expect(out.leads).toBe(60);
    expect(out.searches).toBeGreaterThan(0);
    const rows = db.select().from(leads).all();
    const etapas = new Set(listStages(db, 'user-a').map((s) => s.id));
    expect(rows.every((l) => l.userId === 'user-a' && l.isSample && l.placeId?.startsWith('FAKE-'))).toBe(true);
    expect(rows.every((l) => l.stageId != null && etapas.has(l.stageId))).toBe(true);
    expect(db.select().from(activities).all().length).toBeGreaterThan(0);
    expect(getSampleState(db, 'user-a')).toEqual({ hasSamples: true, hasLeads: true });
    expect(getSampleState(db, 'user-b')).toEqual({ hasSamples: false, hasLeads: false });
  });

  it('recusa gerar de novo enquanto houver exemplos', () => {
    generateSamples(db, 'user-a', NOW);
    expect(() => generateSamples(db, 'user-a', NOW)).toThrow(/já tem dados de exemplo/);
    expect(db.select().from(leads).all()).toHaveLength(60);
  });

  it('dois usuários podem ter exemplos ao mesmo tempo', () => {
    generateSamples(db, 'user-a', NOW);
    generateSamples(db, 'user-b', NOW);
    expect(listLeads(db, 'user-b', { ...TODOS, limit: 500 }).total).toBe(60);
  });

  it('buscas de exemplo não consomem a cota', () => {
    generateSamples(db, 'user-a', NOW);
    expect(quotaStatus(db, 'user-a', { perUser: 6, global: 30 }, NOW.toISOString()).used).toBe(0);
  });

  it('remover apaga só os exemplos do usuário e preserva leads reais', () => {
    generateSamples(db, 'user-a', NOW);
    generateSamples(db, 'user-b', NOW);
    const iso = NOW.toISOString();
    db.insert(leads).values({ userId: 'user-a', placeId: 'ChIJreal', name: 'Lead real', temperature: 'quente',
      capturedAt: iso, createdAt: iso, updatedAt: iso }).run();
    expect(removeSamples(db, 'user-a').leads).toBe(60);
    expect(listLeads(db, 'user-a', { ...TODOS }).rows.map((l) => l.name)).toEqual(['Lead real']);
    expect(listLeads(db, 'user-b', { ...TODOS, limit: 500 }).total).toBe(60);
    expect(db.select().from(searches).all().every((s) => s.userId === 'user-b')).toBe(true);
    expect(getSampleState(db, 'user-a')).toEqual({ hasSamples: false, hasLeads: true });
  });
});

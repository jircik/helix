import { describe, it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { leads, stages } from '@/lib/db/schema';
import { seedStages } from '@/lib/db/seed';
import { upsertPlace, upsertPlaces } from './leads';
import type { NormalizedPlace } from '@/lib/places/types';

let close: () => void;
function freshDb(): HelixDb {
  const t = createTestDb();
  close = t.close;
  seedStages(t.db);
  return t.db;
}
afterEach(() => close?.());

const T1 = '2026-09-01T10:00:00.000Z';
const T2 = '2026-09-20T10:00:00.000Z';

function place(over: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
    placeId: 'ChIJ1', name: 'Barbearia Um', formattedAddress: 'Rua A, 1',
    lat: -23.5, lng: -46.6, phone: '(11) 90000-0001', websiteUri: null,
    rating: 4.5, userRatingCount: 30, businessStatus: 'OPERATIONAL',
    primaryType: 'barber_shop', primaryTypeDisplay: 'Barbearia',
    googleMapsUri: 'https://maps.google.com/?cid=1',
    rawJson: '{}', temperature: 'quente', ...over,
  };
}

describe('upsertPlace', () => {
  it('insere um lead novo e marca wasNew', () => {
    const db = freshDb();
    const out = upsertPlace(db, place(), T1);

    expect(out.wasNew).toBe(true);
    const row = db.select().from(leads).all()[0];
    expect(row.name).toBe('Barbearia Um');
    expect(row.temperature).toBe('quente');
    expect(row.verification).toBe('pendente');
  });

  it('coloca o lead novo na primeira etapa do funil', () => {
    const db = freshDb();
    const out = upsertPlace(db, place(), T1);

    const first = db.select().from(stages).orderBy(stages.position).all()[0];
    const row = db.select().from(leads).where(eq(leads.id, out.leadId)).get()!;
    expect(row.stageId).toBe(first.id);
  });

  it('não duplica ao reprocessar o mesmo place_id', () => {
    const db = freshDb();
    const a = upsertPlace(db, place(), T1);
    const b = upsertPlace(db, place(), T2);

    expect(b.wasNew).toBe(false);
    expect(b.leadId).toBe(a.leadId);
    expect(db.select().from(leads).all()).toHaveLength(1);
  });

  it('atualiza o bloco do Google e renova capturedAt', () => {
    const db = freshDb();
    upsertPlace(db, place(), T1);
    upsertPlace(db, place({
      name: 'Barbearia Um — Matriz',
      websiteUri: 'https://barbeariaum.com.br',
      temperature: 'frio',
      rating: 4.9,
    }), T2);

    const row = db.select().from(leads).all()[0];
    expect(row.name).toBe('Barbearia Um — Matriz');
    expect(row.websiteUri).toBe('https://barbeariaum.com.br');
    expect(row.temperature).toBe('frio');
    expect(row.rating).toBe(4.9);
    expect(row.capturedAt).toBe(T2);
    expect(row.updatedAt).toBe(T2);
  });

  it('NUNCA ressuscita o bloco do usuário na re-busca', () => {
    const db = freshDb();
    const { leadId } = upsertPlace(db, place(), T1);

    const etapas = db.select().from(stages).orderBy(stages.position).all();
    db.update(leads).set({
      verification: 'descartado',
      disqualifyReason: 'tem site, achei no Instagram',
      verifiedBy: 'manual',
      verifiedAt: T1,
      stageId: etapas[3].id,
      notes: 'ligar em janeiro',
      contactName: 'João',
      nextAction: 'follow-up',
      nextActionAt: T2,
    }).where(eq(leads.id, leadId)).run();

    upsertPlace(db, place({ rating: 5 }), T2);

    const row = db.select().from(leads).where(eq(leads.id, leadId)).get()!;
    expect(row.verification).toBe('descartado');
    expect(row.disqualifyReason).toBe('tem site, achei no Instagram');
    expect(row.verifiedBy).toBe('manual');
    expect(row.stageId).toBe(etapas[3].id);
    expect(row.notes).toBe('ligar em janeiro');
    expect(row.contactName).toBe('João');
    expect(row.nextAction).toBe('follow-up');
    expect(row.rating).toBe(5); // bloco do Google atualizou
  });

  it('preserva createdAt do primeiro encontro', () => {
    const db = freshDb();
    upsertPlace(db, place(), T1);
    upsertPlace(db, place(), T2);
    expect(db.select().from(leads).all()[0].createdAt).toBe(T1);
  });
});

describe('upsertPlaces', () => {
  it('processa um lote e reporta quais eram inéditos', () => {
    const db = freshDb();
    upsertPlace(db, place({ placeId: 'ChIJ1' }), T1);

    const out = upsertPlaces(db, [
      place({ placeId: 'ChIJ1' }),
      place({ placeId: 'ChIJ2', name: 'Dois' }),
      place({ placeId: 'ChIJ3', name: 'Três' }),
    ], T2);

    expect(out.map((o) => o.wasNew)).toEqual([false, true, true]);
    expect(db.select().from(leads).all()).toHaveLength(3);
  });

  it('deduplica place_id repetido dentro do mesmo lote', () => {
    const db = freshDb();
    const out = upsertPlaces(db, [
      place({ placeId: 'ChIJ9' }),
      place({ placeId: 'ChIJ9' }),
    ], T1);

    expect(out).toHaveLength(2);
    expect(out[0].wasNew).toBe(true);
    expect(out[1].wasNew).toBe(false);
    expect(db.select().from(leads).all()).toHaveLength(1);
  });
});

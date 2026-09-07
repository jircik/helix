import { describe, it, expect, afterEach } from 'vitest';
import { createTestDb, type HelixDb } from '@/lib/db/client';
import { leads, leadSearches, searches, stages } from '@/lib/db/schema';
import { seedStages } from '@/lib/db/seed';
import {
  listLeads, getLead, updateUserBlock, countByTemperature, DEFAULT_LIST_INPUT,
} from './leads';

let close: () => void;
function freshDb(): HelixDb {
  const t = createTestDb();
  close = t.close;
  seedStages(t.db);
  return t.db;
}
afterEach(() => close?.());

const NOW = '2026-09-06T12:00:00.000Z';
const LATER = '2026-09-07T12:00:00.000Z';

function insert(db: HelixDb, over: Record<string, unknown> = {}) {
  return db.insert(leads).values({
    placeId: `p${Math.random()}`,
    name: 'Lead',
    temperature: 'quente',
    capturedAt: NOW, createdAt: NOW, updatedAt: NOW,
    ...over,
  }).returning().get();
}

describe('listLeads', () => {
  it('o padrão mostra só quente não descartado', () => {
    const db = freshDb();
    insert(db, { name: 'Quente', temperature: 'quente' });
    insert(db, { name: 'Frio', temperature: 'frio' });
    insert(db, { name: 'Descartado', temperature: 'quente', verification: 'descartado' });

    const out = listLeads(db, DEFAULT_LIST_INPUT);
    expect(out.rows.map((r) => r.name)).toEqual(['Quente']);
    expect(out.total).toBe(1);
  });

  it('filtra por várias temperaturas', () => {
    const db = freshDb();
    insert(db, { name: 'A', temperature: 'quente' });
    insert(db, { name: 'B', temperature: 'morno' });
    insert(db, { name: 'C', temperature: 'frio' });

    const out = listLeads(db, { temperatures: ['quente', 'morno'] });
    expect(out.rows.map((r) => r.name).sort()).toEqual(['A', 'B']);
  });

  it('filtra por etapa', () => {
    const db = freshDb();
    const etapas = db.select().from(stages).orderBy(stages.position).all();
    insert(db, { name: 'Na etapa 2', stageId: etapas[1].id });
    insert(db, { name: 'Na etapa 1', stageId: etapas[0].id });

    const out = listLeads(db, { stageId: etapas[1].id });
    expect(out.rows.map((r) => r.name)).toEqual(['Na etapa 2']);
  });

  it('busca textual por nome e endereço, sem diferenciar maiúsculas', () => {
    const db = freshDb();
    insert(db, { name: 'Barbearia Valentins', formattedAddress: 'Rua Teodoro, 10' });
    insert(db, { name: 'Academia Forma', formattedAddress: 'Av. Paulista, 900' });

    expect(listLeads(db, { search: 'valentins' }).rows).toHaveLength(1);
    expect(listLeads(db, { search: 'PAULISTA' }).rows).toHaveLength(1);
    expect(listLeads(db, { search: 'inexistente' }).rows).toHaveLength(0);
  });

  it('pagina e devolve o total sem paginação', () => {
    const db = freshDb();
    for (let i = 0; i < 25; i++) insert(db, { name: `Lead ${i}` });

    const out = listLeads(db, { limit: 10, offset: 20 });
    expect(out.rows).toHaveLength(5);
    expect(out.total).toBe(25);
  });

  it('ordena do mais recente para o mais antigo', () => {
    const db = freshDb();
    insert(db, { name: 'Velho', updatedAt: NOW });
    insert(db, { name: 'Novo', updatedAt: LATER });

    expect(listLeads(db, {}).rows.map((r) => r.name)).toEqual(['Novo', 'Velho']);
  });
});

describe('getLead', () => {
  it('devolve o lead pelo id', () => {
    const db = freshDb();
    const row = insert(db, { name: 'Achado' });
    expect(getLead(db, row.id)?.name).toBe('Achado');
  });

  it('devolve null quando não existe', () => {
    expect(getLead(freshDb(), 999)).toBeNull();
  });
});

describe('updateUserBlock', () => {
  it('grava os campos do usuário e atualiza updatedAt', () => {
    const db = freshDb();
    const row = insert(db);

    const out = updateUserBlock(db, row.id, {
      contactName: 'Maria', notes: 'ligar segunda', whatsapp: '11999999999',
    }, LATER);

    expect(out.contactName).toBe('Maria');
    expect(out.notes).toBe('ligar segunda');
    expect(out.updatedAt).toBe(LATER);
  });

  it('carimba verifiedBy e verifiedAt ao sair de pendente', () => {
    const db = freshDb();
    const row = insert(db);

    const out = updateUserBlock(db, row.id, {
      verification: 'descartado', disqualifyReason: 'tem site',
    }, LATER);

    expect(out.verifiedBy).toBe('manual');
    expect(out.verifiedAt).toBe(LATER);
  });

  it('não carimba verificação quando ela não muda', () => {
    const db = freshDb();
    const row = insert(db);
    const out = updateUserBlock(db, row.id, { notes: 'só uma nota' }, LATER);
    expect(out.verifiedBy).toBeNull();
    expect(out.verifiedAt).toBeNull();
  });

  it('nunca altera o bloco do Google', () => {
    const db = freshDb();
    const row = insert(db, { name: 'Original', websiteUri: null, temperature: 'quente' });

    const out = updateUserBlock(db, row.id, {
      verification: 'descartado', disqualifyReason: 'achei o site na mão',
    }, LATER);

    expect(out.name).toBe('Original');
    expect(out.websiteUri).toBeNull();
    expect(out.temperature).toBe('quente');
    expect(out.capturedAt).toBe(NOW);
  });

  it('lança erro quando o lead não existe', () => {
    expect(() => updateUserBlock(freshDb(), 999, { notes: 'x' }, LATER))
      .toThrow(/999/);
  });
});

describe('countByTemperature', () => {
  it('conta as três temperaturas incluindo as zeradas', () => {
    const db = freshDb();
    insert(db, { temperature: 'quente' });
    insert(db, { temperature: 'quente' });
    insert(db, { temperature: 'morno' });

    expect(countByTemperature(db)).toEqual({ quente: 2, morno: 1, frio: 0 });
  });
});

describe('listLeads por busca', () => {
  function insertSearch(db: HelixDb, textQuery: string) {
    return db.insert(searches).values({
      textQuery, filtersJson: '{}', executedAt: NOW,
    }).returning().get();
  }
  function link(db: HelixDb, leadId: number, searchId: number, wasNew = true) {
    db.insert(leadSearches).values({ leadId, searchId, wasNew }).run();
  }

  it('devolve só os leads ligados à busca', () => {
    const db = freshDb();
    const a = insert(db, { name: 'Da busca' });
    const b = insert(db, { name: 'De outra busca' });
    const busca = insertSearch(db, 'barbearia Pinheiros');
    const outra = insertSearch(db, 'academia Moema');
    link(db, a.id, busca.id);
    link(db, b.id, outra.id);

    const out = listLeads(db, { searchId: busca.id });
    expect(out.rows.map((row) => row.name)).toEqual(['Da busca']);
    expect(out.total).toBe(1);
  });

  it('inclui o lead que aparece em duas buscas', () => {
    const db = freshDb();
    const lead = insert(db, { name: 'Reencontrado' });
    const primeira = insertSearch(db, 'primeira');
    const segunda = insertSearch(db, 'segunda');
    link(db, lead.id, primeira.id, true);
    link(db, lead.id, segunda.id, false);

    expect(listLeads(db, { searchId: primeira.id }).rows).toHaveLength(1);
    expect(listLeads(db, { searchId: segunda.id }).rows).toHaveLength(1);
  });

  it('não repete o lead quando o join casa mais de uma vez', () => {
    const db = freshDb();
    const lead = insert(db, { name: 'Único' });
    const busca = insertSearch(db, 'busca');
    link(db, lead.id, busca.id);

    const out = listLeads(db, { searchId: busca.id });
    expect(out.rows).toHaveLength(1);
    expect(out.total).toBe(1);
  });

  it('devolve vazio para busca sem leads', () => {
    const db = freshDb();
    insert(db, { name: 'Solto' });
    const vazia = insertSearch(db, 'nada encontrou');

    const out = listLeads(db, { searchId: vazia.id });
    expect(out.rows).toEqual([]);
    expect(out.total).toBe(0);
  });

  it('combina a busca com os demais filtros', () => {
    const db = freshDb();
    const quente = insert(db, { name: 'Quente', temperature: 'quente' });
    const frio = insert(db, { name: 'Frio', temperature: 'frio' });
    const busca = insertSearch(db, 'busca');
    link(db, quente.id, busca.id);
    link(db, frio.id, busca.id);

    const out = listLeads(db, { searchId: busca.id, temperatures: ['quente'] });
    expect(out.rows.map((row) => row.name)).toEqual(['Quente']);
  });

  it('sem searchId não filtra por busca', () => {
    const db = freshDb();
    insert(db, { name: 'Sem busca nenhuma' });
    expect(listLeads(db, {}).rows).toHaveLength(1);
  });
});

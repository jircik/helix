/**
 * Dados de exemplo por usuário: leads fictícios para ver o app cheio sem
 * gastar a API do Google. Tudo fica marcado com is_sample; os place_id
 * começam com `FAKE-` para nunca colidir com ids reais do Google.
 */
import { and, count, eq } from 'drizzle-orm';
import type { HelixDb } from '@/lib/db/client';
import {
  activities, leadSearches, leads, searches,
  type ActivityKind, type NewLead, type Temperature, type Verification,
} from '@/lib/db/schema';
import { listStages } from '@/lib/repo/stages';

const FAKE_PREFIX = 'FAKE-';

/** Gerador determinístico: rodar duas vezes produz a mesma base. */
let state = 0;
function resetRandom() { state = 20260907; }
function rnd(): number {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const chance = (p: number) => rnd() < p;

const BAIRROS = [
  { nome: 'Pinheiros', lat: -23.5670, lng: -46.7020 },
  { nome: 'Vila Madalena', lat: -23.5540, lng: -46.6910 },
  { nome: 'Itaim Bibi', lat: -23.5860, lng: -46.6780 },
  { nome: 'Moema', lat: -23.6000, lng: -46.6650 },
  { nome: 'Perdizes', lat: -23.5370, lng: -46.6790 },
  { nome: 'Tatuapé', lat: -23.5400, lng: -46.5760 },
  { nome: 'Santana', lat: -23.5020, lng: -46.6250 },
  { nome: 'Butantã', lat: -23.5710, lng: -46.7220 },
  { nome: 'Jardins', lat: -23.5680, lng: -46.6690 },
  { nome: 'Vila Mariana', lat: -23.5890, lng: -46.6340 },
] as const;

const RUAS = [
  'R. Teodoro Sampaio', 'R. dos Pinheiros', 'Av. Rebouças', 'R. Harmonia',
  'R. Fradique Coutinho', 'Av. Brigadeiro Faria Lima', 'R. Joaquim Floriano',
  'Al. Santos', 'R. Turiassu', 'Av. Pompeia', 'R. Cardeal Arcoverde',
  'R. Augusta', 'Av. Paulista', 'R. Vergueiro', 'R. Domingos de Morais',
] as const;

interface Ramo {
  tipo: string;
  display: string;
  nomes: readonly string[];
  /** domínio de marketplace típico do ramo, quando existe */
  market?: string;
}

const RAMOS: readonly Ramo[] = [
  { tipo: 'barber_shop', display: 'Barbearia', nomes: ['Barbearia do Léo', 'Barbearia Navalha', 'The Captain Barber', 'Barba Negra', 'Corte Fino', 'Barbearia Valentins', 'Studio Barber', 'Barbearia Central'], market: 'booksy.com' },
  { tipo: 'beauty_salon', display: 'Salão de beleza', nomes: ['Salão Bella Vita', 'Studio Hair', 'Espaço Vip Beleza', 'Cabelo & Cia', 'Salão Charme', 'Beauty Room'], market: 'trinks.com' },
  { tipo: 'gym', display: 'Academia', nomes: ['Academia Forma', 'Iron House Gym', 'Corpo em Ação', 'Studio Fit', 'CrossBox Treino', 'Academia Movimento'] },
  { tipo: 'dentist', display: 'Clínica odontológica', nomes: ['OdontoVida', 'Clínica Sorriso Real', 'Dental Care SP', 'Odonto Prime', 'Sorriso & Saúde'], market: 'doctoralia.com.br' },
  { tipo: 'restaurant', display: 'Restaurante', nomes: ['Cantina da Nona', 'Restaurante Sabor Caseiro', 'Tempero da Casa', 'Bistrô 47', 'Casa do Prato'], market: 'ifood.com.br' },
  { tipo: 'bakery', display: 'Padaria', nomes: ['Padaria Estrela', 'Pão de Ouro', 'Padaria São Judas', 'Doce Manhã'], market: 'ifood.com.br' },
  { tipo: 'pet_store', display: 'Pet shop', nomes: ['Pet Amigo', 'Mundo Pet', 'Cão & Gato Store', 'Pet Vida'] },
  { tipo: 'car_repair', display: 'Oficina mecânica', nomes: ['Auto Center Silva', 'Oficina do Zé', 'MecânicaExpress', 'Garagem 21'] },
  { tipo: 'lawyer', display: 'Escritório de advocacia', nomes: ['Ramos Advogados', 'Nunes & Associados', 'Advocacia Ferreira'] },
  { tipo: 'physiotherapist', display: 'Estúdio de pilates', nomes: ['Studio Pilates Equilíbrio', 'Core Pilates', 'Espaço Postura'] },
  { tipo: 'real_estate_agency', display: 'Imobiliária', nomes: ['Imobiliária Horizonte', 'Casa Nova Imóveis', 'Lar Ideal'] },
  { tipo: 'store', display: 'Ótica', nomes: ['Ótica Visão Clara', 'Ótica Central', 'Olhar Ótica'] },
  { tipo: 'florist', display: 'Floricultura', nomes: ['Flor de Lis', 'Floricultura Jardim'] },
  { tipo: 'tattoo_parlor', display: 'Estúdio de tatuagem', nomes: ['Tinta Preta Tattoo', 'Ink Studio SP'] },
] as const;

const SOCIAIS = ['instagram.com', 'facebook.com', 'linktr.ee', 'business.site'] as const;

const NOTAS = [
  'Dono atende só depois das 14h.',
  'Já tem orçamento de outra agência, mas achou caro.',
  'Pediu pra retornar mês que vem.',
  'Instagram bem cuidado, provavelmente valoriza presença digital.',
  'Atendente disse que o responsável viaja muito.',
  'Interessado, mas quer ver portfólio antes.',
  'Falei com a sócia, ela vai levar pro marido.',
] as const;

const PROXIMAS = [
  'Ligar de novo', 'Mandar proposta', 'Enviar portfólio no WhatsApp',
  'Confirmar reunião', 'Follow-up por e-mail', 'Passar na loja',
] as const;

const MOTIVOS = [
  'tem site, achei pelo nome no Google',
  'fechou as portas',
  'fora do perfil — franquia, site vem da matriz',
  'já tem agência fixa',
  'não atende telefone há semanas',
] as const;

const CORPOS: Record<string, readonly string[]> = {
  ligacao: ['Não atendeu.', 'Falei com o dono, pediu pra mandar por WhatsApp.', 'Caiu na secretária.', 'Atendente pegou recado.'],
  whatsapp: ['Mandei apresentação, visualizou.', 'Respondeu que vai olhar com calma.', 'Enviei orçamento.', 'Sem resposta até agora.'],
  email: ['Enviei proposta comercial.', 'Follow-up do orçamento.', 'Mandei cases parecidos.'],
  dm: ['Chamei no Instagram.', 'Respondeu o direct, pediu telefone.'],
  visita: ['Passei na loja, dono não estava.', 'Conversei pessoalmente, gostou da ideia.'],
  nota: ['Concorrente da rua já fez site com a gente.', 'Movimento bom no horário do almoço.'],
};

function slug(nome: string): string {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

let reference = new Date();
function iso(daysAgo: number, hour = 10): string {
  const d = new Date(reference);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, int(0, 59), 0, 0);
  return d.toISOString();
}

const TOTAL = 60;

type SampleRow = Omit<NewLead, 'userId' | 'stageId'> & { stagePosition: number };
function build(): { rows: SampleRow[]; extras: Array<{ acts: number; overdue: boolean }> } {
  const rows: SampleRow[] = [];
  const extras: Array<{ acts: number; overdue: boolean }> = [];
  const usados = new Set<string>();

  for (let i = 0; i < TOTAL; i++) {
    const ramo = pick(RAMOS);
    const bairro = pick(BAIRROS);

    let nome = `${pick(ramo.nomes)} ${bairro.nome}`;
    while (usados.has(nome)) nome = `${pick(ramo.nomes)} ${bairro.nome} ${int(2, 9)}`;
    usados.add(nome);

    // Distribuição realista: a maior parte do que interessa é quente.
    const r = rnd();
    const temperature: Temperature = r < 0.55 ? 'quente' : r < 0.77 ? 'morno' : 'frio';

    let websiteUri: string | null = null;
    if (temperature === 'morno') {
      websiteUri = ramo.market && chance(0.45)
        ? `https://www.${ramo.market}/${slug(nome)}`
        : `https://${pick(SOCIAIS)}/${slug(nome)}`;
    } else if (temperature === 'frio') {
      websiteUri = `https://www.${slug(nome).slice(0, 22)}.com.br`;
    }

    const capturado = int(1, 25);

    // Verificação: só o que já foi olhado sai de pendente.
    let verification: Verification = 'pendente';
    let disqualifyReason: string | null = null;
    let verifiedBy: 'manual' | 'ai' | null = null;
    let verifiedAt: string | null = null;

    if (temperature === 'frio') {
      // Frio quase sempre já foi descartado na triagem.
      if (chance(0.75)) {
        verification = 'descartado';
        disqualifyReason = 'tem site próprio';
      }
    } else if (chance(0.38)) {
      if (chance(0.72)) {
        verification = 'qualificado';
      } else {
        verification = 'descartado';
        disqualifyReason = pick(MOTIVOS);
      }
    }
    if (verification !== 'pendente') {
      verifiedBy = 'manual';
      verifiedAt = iso(int(0, capturado));
    }

    // Etapa: só quem foi qualificado anda no funil.
    let stagePosition = 1;
    if (verification === 'qualificado') {
      const r2 = rnd();
      stagePosition = r2 < 0.34 ? 2 : r2 < 0.60 ? 3 : r2 < 0.80 ? 4 : r2 < 0.92 ? 5 : 6;
    } else if (verification === 'descartado' && chance(0.3)) {
      stagePosition = 6;
    }

    const trabalhado = verification === 'qualificado';
    const overdue = trabalhado && stagePosition <= 4 && chance(0.45);
    const futuro = trabalhado && stagePosition <= 4 && !overdue && chance(0.5);

    const nextAction = overdue || futuro ? pick(PROXIMAS) : null;
    const nextActionAt = overdue ? iso(int(1, 9), 12) : futuro ? iso(-int(1, 12), 12) : null;

    const semTelefone = chance(0.12);
    const fechado = chance(0.05);

    rows.push({
      placeId: `${FAKE_PREFIX}${String(i + 1).padStart(4, '0')}`,
      name: nome,
      formattedAddress: `${pick(RUAS)}, ${int(10, 2400)} - ${bairro.nome}, São Paulo - SP`,
      lat: bairro.lat + (rnd() - 0.5) * 0.018,
      lng: bairro.lng + (rnd() - 0.5) * 0.018,
      phone: semTelefone ? null : `(11) 9${int(4000, 9999)}-${int(1000, 9999)}`,
      websiteUri,
      rating: chance(0.08) ? null : Number((3.1 + rnd() * 1.9).toFixed(1)),
      userRatingCount: chance(0.08) ? null : int(3, 640),
      businessStatus: fechado ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL',
      primaryType: ramo.tipo,
      primaryTypeDisplay: ramo.display,
      googleMapsUri: `https://maps.google.com/?cid=${int(10 ** 10, 10 ** 11)}`,
      rawJson: JSON.stringify({ fake: true, ramo: ramo.tipo }),
      capturedAt: iso(capturado),
      temperature,
      stagePosition,
      verification,
      disqualifyReason,
      verifiedBy,
      verifiedAt,
      contactName: trabalhado && chance(0.7)
        ? pick(['Maria', 'João', 'Cláudia', 'Roberto', 'Fernanda', 'Paulo', 'Juliana'])
        : null,
      email: trabalhado && chance(0.45) ? `contato@${slug(nome).slice(0, 18)}.com.br` : null,
      instagram: chance(0.4) ? `@${slug(nome).slice(0, 20)}` : null,
      whatsapp: trabalhado && chance(0.6) ? `11 9${int(4000, 9999)}${int(1000, 9999)}` : null,
      notes: chance(0.3) ? pick(NOTAS) : null,
      nextAction,
      nextActionAt,
      createdAt: iso(capturado),
      updatedAt: iso(int(0, capturado)),
    });

    extras.push({ acts: trabalhado ? int(1, 5) : chance(0.15) ? 1 : 0, overdue });
  }

  return { rows, extras };
}

const CONSULTAS = [
  { q: 'barbearia Pinheiros São Paulo', tipo: 'barber_shop' },
  { q: 'salão de beleza Moema São Paulo', tipo: 'beauty_salon' },
  { q: 'academia Perdizes São Paulo', tipo: 'gym' },
  { q: 'clínica odontológica Itaim Bibi São Paulo', tipo: 'dentist' },
  { q: 'pet shop Tatuapé São Paulo', tipo: 'pet_store' },
  { q: 'restaurante Vila Madalena São Paulo', tipo: 'restaurant' },
] as const;

export interface SampleState { hasSamples: boolean; hasLeads: boolean }

export function getSampleState(db: HelixDb, userId: string): SampleState {
  const sample = db.select({ value: count() }).from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.isSample, true))).get()?.value ?? 0;
  const all = db.select({ value: count() }).from(leads).where(eq(leads.userId, userId)).get()?.value ?? 0;
  return { hasSamples: sample > 0, hasLeads: all > 0 };
}

export function generateSamples(db: HelixDb, userId: string, now = new Date()) {
  return db.transaction((tx) => {
    if (getSampleState(tx, userId).hasSamples) {
      throw new Error('Sua conta já tem dados de exemplo. Remova-os antes de gerar de novo.');
    }
    const etapas = listStages(tx, userId);
    if (!etapas.length) throw new Error('Nenhuma etapa no funil.');
    // A posição sorteada (1–6) vira a etapa equivalente do usuário; funis menores ficam com a última.
    const etapaNa = (position: number) => etapas[Math.min(position, etapas.length) - 1];

    resetRandom();
    reference = now;
    const { rows, extras } = build();

    const ids = rows.map(({ stagePosition, ...row }) => tx.insert(leads).values({
      ...row, userId, isSample: true, stageId: etapaNa(stagePosition).id,
    }).returning({ id: leads.id }).get().id);

    let totalAtividades = 0;
    ids.forEach((leadId, i) => {
      const position = rows[i].stagePosition;
      if (position > 1) {
        tx.insert(activities).values({
          leadId, kind: 'stage_change', body: `${etapas[0].name} → ${etapaNa(position).name}`,
          occurredAt: iso(int(1, 14)), createdAt: iso(int(1, 14)),
        }).run();
        totalAtividades++;
      }
      for (let a = 0; a < extras[i].acts; a++) {
        const kind = pick(['ligacao', 'whatsapp', 'email', 'dm', 'visita', 'nota']) as ActivityKind;
        const quando = iso(int(0, 21), int(9, 18));
        tx.insert(activities).values({ leadId, kind, body: pick(CORPOS[kind]), occurredAt: quando, createdAt: quando }).run();
        totalAtividades++;
      }
    });

    let buscas = 0;
    CONSULTAS.forEach((consulta, i) => {
      const doRamo = ids.filter((_, idx) => rows[idx].primaryType === consulta.tipo);
      if (!doRamo.length) return;
      const paginas = doRamo.length > 40 ? 3 : doRamo.length > 20 ? 2 : 1;
      const searchId = tx.insert(searches).values({
        userId,
        isSample: true,
        textQuery: consulta.q,
        includedType: consulta.tipo,
        minRating: i % 3 === 0 ? 4 : null,
        filtersJson: JSON.stringify({ temperatures: ['quente'], excludeClosed: true }),
        pagesFetched: paginas,
        // Mostra no histórico quantas chamadas uma busca real teria feito; a cota ignora is_sample.
        apiRequests: paginas,
        rawCount: doRamo.length,
        newCount: doRamo.length,
        executedAt: iso(int(1, 20), int(9, 19)),
      }).returning({ id: searches.id }).get().id;
      for (const leadId of doRamo) tx.insert(leadSearches).values({ leadId, searchId, wasNew: true }).run();
      buscas++;
    });

    return { leads: ids.length, activities: totalAtividades, searches: buscas };
  });
}

/** Atividades e vínculos de busca saem pelo ON DELETE CASCADE. */
export function removeSamples(db: HelixDb, userId: string) {
  return db.transaction((tx) => ({
    leads: tx.delete(leads).where(and(eq(leads.userId, userId), eq(leads.isSample, true))).returning({ id: leads.id }).all().length,
    searches: tx.delete(searches).where(and(eq(searches.userId, userId), eq(searches.isSample, true))).returning({ id: searches.id }).all().length,
  }));
}

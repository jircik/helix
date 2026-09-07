/**
 * Popula o banco com leads fictícios para avaliar a interface cheia.
 *
 *   npm run db:seed:fake          # recusa se já houver leads
 *   npm run db:seed:fake -- --force   # apaga os fictícios e regrava
 *
 * Nada aqui é usado em produção. Os place_id começam com `FAKE-`, o que
 * torna a limpeza exata e impede colisão com resultados reais do Google.
 */
import { like } from 'drizzle-orm';
import { getDb } from '../lib/db/client';
import {
  activities, leadSearches, leads, searches, stages,
  type ActivityKind, type NewLead, type Temperature, type Verification,
} from '../lib/db/schema';

const FAKE_PREFIX = 'FAKE-';

/** Gerador determinístico: rodar duas vezes produz a mesma base. */
let state = 20260907;
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

function iso(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, int(0, 59), 0, 0);
  return d.toISOString();
}

const TOTAL = 140;

function build(): { rows: NewLead[]; extras: Array<{ acts: number; overdue: boolean }> } {
  const rows: NewLead[] = [];
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
    let stageId = 1;
    if (verification === 'qualificado') {
      const r2 = rnd();
      stageId = r2 < 0.34 ? 2 : r2 < 0.60 ? 3 : r2 < 0.80 ? 4 : r2 < 0.92 ? 5 : 6;
    } else if (verification === 'descartado' && chance(0.3)) {
      stageId = 6;
    }

    const trabalhado = verification === 'qualificado';
    const overdue = trabalhado && stageId <= 4 && chance(0.45);
    const futuro = trabalhado && stageId <= 4 && !overdue && chance(0.5);

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
      stageId,
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

function main() {
  const force = process.argv.includes('--force');
  const db = getDb();

  const existentes = db.select({ id: leads.id }).from(leads).all();
  const fakeExistentes = db.select({ id: leads.id }).from(leads)
    .where(like(leads.placeId, `${FAKE_PREFIX}%`)).all();
  const reais = existentes.length - fakeExistentes.length;

  if (existentes.length > 0 && !force) {
    console.error(
      `Já existem ${existentes.length} leads (${reais} reais, ${fakeExistentes.length} fictícios).\n` +
      'Rode com --force para apagar os fictícios e regravar. Leads reais nunca são tocados.',
    );
    process.exit(1);
  }

  if (db.select().from(stages).all().length === 0) {
    console.error('Nenhuma etapa no funil. Rode `npm run db:seed` antes.');
    process.exit(1);
  }

  if (fakeExistentes.length > 0) {
    // ON DELETE CASCADE limpa activities e lead_searches junto.
    db.delete(leads).where(like(leads.placeId, `${FAKE_PREFIX}%`)).run();
    db.delete(searches).where(like(searches.textQuery, '%[fake]%')).run();
    console.log(`Removidos ${fakeExistentes.length} leads fictícios anteriores.`);
  }

  const { rows, extras } = build();

  const gravados = db.transaction((tx) => {
    const ids: number[] = [];
    for (const row of rows) {
      ids.push(tx.insert(leads).values(row).returning({ id: leads.id }).get().id);
    }

    let totalAtividades = 0;
    ids.forEach((leadId, i) => {
      const lead = rows[i];
      const quantas = extras[i].acts;

      if (lead.stageId && lead.stageId > 1) {
        const nome = ['', 'Novo', 'Contatado', 'Reunião', 'Proposta', 'Fechado', 'Perdido'][lead.stageId];
        tx.insert(activities).values({
          leadId, kind: 'stage_change', body: `Novo → ${nome}`,
          occurredAt: iso(int(1, 14)), createdAt: iso(int(1, 14)),
        }).run();
        totalAtividades++;
      }

      for (let a = 0; a < quantas; a++) {
        const kind = pick(['ligacao', 'whatsapp', 'email', 'dm', 'visita', 'nota']) as ActivityKind;
        const quando = iso(int(0, 21), int(9, 18));
        tx.insert(activities).values({
          leadId, kind, body: pick(CORPOS[kind]),
          occurredAt: quando, createdAt: quando,
        }).run();
        totalAtividades++;
      }
    });

    let vinculos = 0;
    CONSULTAS.forEach((consulta, i) => {
      const doRamo = ids.filter((_, idx) => rows[idx].primaryType === consulta.tipo);
      const brutos = doRamo.length;
      const paginas = brutos > 40 ? 3 : brutos > 20 ? 2 : 1;

      const searchId = tx.insert(searches).values({
        textQuery: `${consulta.q} [fake]`,
        includedType: consulta.tipo,
        minRating: i % 3 === 0 ? 4 : null,
        filtersJson: JSON.stringify({ temperatures: ['quente'], excludeClosed: true }),
        pagesFetched: paginas,
        apiRequests: paginas,
        rawCount: brutos,
        newCount: brutos,
        executedAt: iso(int(1, 20), int(9, 19)),
      }).returning({ id: searches.id }).get().id;

      for (const leadId of doRamo) {
        tx.insert(leadSearches).values({ leadId, searchId, wasNew: true }).run();
        vinculos++;
      }
    });

    return { leads: ids.length, atividades: totalAtividades, buscas: CONSULTAS.length, vinculos };
  });

  const porTemp = { quente: 0, morno: 0, frio: 0 };
  for (const r of rows) porTemp[r.temperature as Temperature]++;
  const acoesVencidas = extras.filter((e) => e.overdue).length;

  console.log(
    `\nBase fictícia gravada.\n` +
    `  leads:      ${gravados.leads}  (quente ${porTemp.quente} · morno ${porTemp.morno} · frio ${porTemp.frio})\n` +
    `  atividades: ${gravados.atividades}\n` +
    `  buscas:     ${gravados.buscas}  (${gravados.vinculos} vínculos de procedência)\n` +
    `  próximas ações vencidas: ${acoesVencidas}\n\n` +
    `Para limpar: npm run db:seed:fake -- --clean\n`,
  );
}

function clean() {
  const db = getDb();
  const alvo = db.select({ id: leads.id }).from(leads)
    .where(like(leads.placeId, `${FAKE_PREFIX}%`)).all();
  db.delete(leads).where(like(leads.placeId, `${FAKE_PREFIX}%`)).run();
  db.delete(searches).where(like(searches.textQuery, '%[fake]%')).run();
  console.log(`Removidos ${alvo.length} leads fictícios. Leads reais preservados.`);
}

if (process.argv.includes('--clean')) clean();
else main();

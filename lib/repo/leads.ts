import { and, asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { HelixDb } from '@/lib/db/client';
import { leads, stages, type Lead, type Temperature, type Verification } from '@/lib/db/schema';
import type { NormalizedPlace } from '@/lib/places/types';
import * as v from '@/lib/validate';
import { VERIFICATIONS } from '@/lib/db/schema';

export interface UpsertOutcome {
  leadId: number;
  wasNew: boolean;
}

function firstStageId(db: HelixDb): number | null {
  const first = db.select().from(stages).orderBy(asc(stages.position)).limit(1).get();
  return first?.id ?? null;
}

/**
 * Insere ou atualiza um lead pelo place_id.
 *
 * Atualiza APENAS o bloco do Google. verification, stageId, notes, contatos e
 * next_action pertencem ao usuário e nunca são tocados aqui — sem isso, todo
 * re-scan obrigaria a re-avaliar trabalho já feito.
 */
export function upsertPlace(
  db: HelixDb,
  place: NormalizedPlace,
  now: string,
): UpsertOutcome {
  const existing = db.select({ id: leads.id })
    .from(leads)
    .where(eq(leads.placeId, place.placeId))
    .get();

  const googleBlock = {
    name: place.name,
    formattedAddress: place.formattedAddress,
    lat: place.lat,
    lng: place.lng,
    phone: place.phone,
    websiteUri: place.websiteUri,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    businessStatus: place.businessStatus,
    primaryType: place.primaryType,
    primaryTypeDisplay: place.primaryTypeDisplay,
    googleMapsUri: place.googleMapsUri,
    rawJson: place.rawJson,
    capturedAt: now,
    temperature: place.temperature,
    updatedAt: now,
  };

  if (existing) {
    db.update(leads).set(googleBlock).where(eq(leads.id, existing.id)).run();
    return { leadId: existing.id, wasNew: false };
  }

  const inserted = db.insert(leads).values({
    placeId: place.placeId,
    ...googleBlock,
    stageId: firstStageId(db),
    verification: 'pendente',
    createdAt: now,
  }).returning({ id: leads.id }).get();

  return { leadId: inserted.id, wasNew: true };
}

export function upsertPlaces(
  db: HelixDb,
  places: NormalizedPlace[],
  now: string,
): UpsertOutcome[] {
  return db.transaction((tx) => places.map((place) => upsertPlace(tx, place, now)));
}


export interface ListLeadsInput {
  ids?: number[];
  temperatures?: Temperature[];
  verifications?: Verification[];
  stageId?: number | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export interface ListLeadsResult {
  rows: Lead[];
  total: number;
}

/** A lista abre no que interessa: quente e ainda vivo. */
export const DEFAULT_LIST_INPUT: ListLeadsInput = {
  temperatures: ['quente'],
  verifications: ['pendente', 'qualificado'],
};

function listConditions(input: ListLeadsInput): SQL[] {
  const parts: SQL[] = [];
  if (input.ids) {
    input.ids.forEach((id) => v.integer(id, 'Lead'));
    parts.push(input.ids.length ? inArray(leads.id, input.ids) : sql`0`);
  }

  if (input.temperatures?.length) {
    parts.push(inArray(leads.temperature, input.temperatures));
  }
  if (input.verifications?.length) {
    parts.push(inArray(leads.verification, input.verifications));
  }
  if (typeof input.stageId === 'number') {
    parts.push(eq(leads.stageId, input.stageId));
  }
  const term = input.search?.trim();
  if (term) {
    const tokens = term.match(/[\p{L}\p{N}]+/gu) ?? [];
    const query = tokens.map((token) => `"${token}"*`).join(' AND ');
    parts.push(query ? sql`${leads.id} in (select rowid from leads_fts where leads_fts match ${query})` : sql`0`);
  }
  return parts;
}

export function listLeads(db: HelixDb, input: ListLeadsInput): ListLeadsResult {
  v.integer(input.limit ?? 50, 'Limite', 1, 500);
  v.integer(input.offset ?? 0, 'Página', 0);
  if (input.stageId != null) v.integer(input.stageId, 'Etapa');
  const parts = listConditions(input);
  const where = parts.length ? and(...parts) : undefined;

  const total = db.select({ value: count() }).from(leads).where(where).get()?.value ?? 0;

  const rows = db.select().from(leads)
    .where(where)
    .orderBy(desc(leads.updatedAt), desc(leads.id))
    .limit(input.limit ?? 50)
    .offset(input.offset ?? 0)
    .all();

  return { rows, total };
}

export function getLead(db: HelixDb, id: number): Lead | null {
  return db.select().from(leads).where(eq(leads.id, id)).get() ?? null;
}

export interface UserBlockPatch {
  stageId?: number | null;
  verification?: Verification;
  disqualifyReason?: string | null;
  contactName?: string | null;
  email?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
}

/**
 * Escreve apenas o bloco do usuário. Nenhum campo do Google é aceito aqui —
 * quando o usuário descobre que o negócio tem site, isso vira
 * disqualifyReason, nunca uma edição do snapshot.
 */
export function updateUserBlock(
  db: HelixDb,
  id: number,
  patch: UserBlockPatch,
  now: string,
): Lead {
  v.integer(id, 'Lead');
  const raw = v.object(patch);
  const textFields = ['disqualifyReason', 'contactName', 'email', 'instagram', 'whatsapp', 'notes', 'nextAction'] as const;
  v.keys(raw, [...textFields, 'stageId', 'verification', 'nextActionAt']);
  const current = getLead(db, id);
  if (!current) throw new Error(`Lead ${id} não encontrado.`);

  const values: Record<string, unknown> = { updatedAt: now };
  for (const key of textFields) if (key in raw) values[key] = v.text(raw[key], key, true);
  if ('nextActionAt' in raw) values.nextActionAt = raw.nextActionAt == null || raw.nextActionAt === ''
    ? null : v.timestamp(raw.nextActionAt, 'Próxima ação');
  if ('verification' in raw) values.verification = v.choice(raw.verification, VERIFICATIONS, 'Verificação');
  if ('stageId' in raw) {
    values.stageId = raw.stageId == null ? null : v.integer(raw.stageId, 'Etapa');
    if (values.stageId != null && !db.select().from(stages).where(eq(stages.id, values.stageId as number)).get()) {
      throw new Error(`Etapa ${values.stageId} não encontrada.`);
    }
  }
  if ((values.verification ?? current.verification) === 'descartado' &&
      !String(('disqualifyReason' in values ? values.disqualifyReason : current.disqualifyReason) ?? '').trim()) {
    throw new Error('Informe o motivo do descarte.');
  }

  if (patch.verification && patch.verification !== current.verification) {
    values.verifiedBy = patch.verification === 'pendente' ? null : 'manual';
    values.verifiedAt = patch.verification === 'pendente' ? null : now;
  }

  db.update(leads).set(values).where(eq(leads.id, id)).run();
  return getLead(db, id)!;
}

export function countByTemperature(db: HelixDb): Record<Temperature, number> {
  const rows = db
    .select({ temperature: leads.temperature, value: count() })
    .from(leads)
    .groupBy(leads.temperature)
    .all();

  const out: Record<Temperature, number> = { quente: 0, morno: 0, frio: 0 };
  for (const row of rows) out[row.temperature] = row.value;
  return out;
}

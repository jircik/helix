import { eq, inArray } from 'drizzle-orm';
import type { HelixDb } from '@/lib/db/client';
import { leads, leadSearches, searches, searchPresets, TEMPERATURES, type Lead, type Temperature } from '@/lib/db/schema';
import { fetchPlaces, PlacesFetchError, validateQuery, type PlacesDeps } from '@/lib/places/client';
import { normalize } from '@/lib/places/normalize';
import { upsertPlaces } from '@/lib/repo/leads';
import * as v from '@/lib/validate';

export interface ClientFilters {
  temperatures?: Temperature[];
  requirePhone?: boolean;
  minReviews?: number | null;
  maxReviews?: number | null;
  excludeClosed?: boolean;
}

export interface RunSearchInput {
  textQuery: string;
  includedType?: string | null;
  minRating?: number | null;
  maxPages?: number;
  filters?: ClientFilters;
  presetId?: number | null;
}

export interface RunSearchResult {
  searchId: number;
  rawCount: number;
  newCount: number;
  apiRequests: number;
  pagesFetched: number;
  leadIds: number[];
}

export type RunSearchDeps = PlacesDeps & { now?: () => string };

/**
 * Filtros client-side. Rodam DEPOIS da gravação — os 60 resultados entram no
 * banco de qualquer forma, o filtro só decide o que a tela mostra.
 */
export function applyClientFilters(rows: Lead[], filters: ClientFilters): Lead[] {
  return rows.filter((row) => {
    if (filters.temperatures?.length && !filters.temperatures.includes(row.temperature)) {
      return false;
    }
    if (filters.requirePhone && !row.phone) return false;

    const reviews = row.userRatingCount ?? 0;
    if (typeof filters.minReviews === 'number' && reviews < filters.minReviews) return false;
    if (typeof filters.maxReviews === 'number' && reviews > filters.maxReviews) return false;

    if (filters.excludeClosed && row.businessStatus === 'CLOSED_PERMANENTLY') return false;

    return true;
  });
}

export async function runSearch(
  db: HelixDb,
  input: RunSearchInput,
  deps: RunSearchDeps,
): Promise<RunSearchResult> {
  validateQuery(input);
  const now = deps.now?.() ?? new Date().toISOString();
  const filters = input.filters ?? {};
  v.object(filters);
  v.keys(filters as Record<string, unknown>, ['temperatures', 'requirePhone', 'minReviews', 'maxReviews', 'excludeClosed']);
  if (filters.temperatures !== undefined) {
    if (!Array.isArray(filters.temperatures)) throw new Error('Temperaturas inválidas.');
    filters.temperatures.forEach((t) => v.choice(t, TEMPERATURES, 'Temperatura'));
  }
  for (const key of ['requirePhone', 'excludeClosed'] as const) {
    if (filters[key] !== undefined && typeof filters[key] !== 'boolean') throw new Error(`${key}: valor inválido.`);
  }
  for (const key of ['minReviews', 'maxReviews'] as const) {
    if (filters[key] != null) v.integer(filters[key], key, 0);
  }
  if (filters.minReviews != null && filters.maxReviews != null && filters.minReviews > filters.maxReviews) {
    throw new Error('O mínimo de avaliações não pode ultrapassar o máximo.');
  }
  if (input.presetId != null) {
    v.integer(input.presetId, 'Preset');
    if (!db.select().from(searchPresets).where(eq(searchPresets.id, input.presetId)).get()) throw new Error('Preset não encontrado.');
  }

  // A busca é gravada antes da chamada para que a falha também fique registrada.
  const search = db.insert(searches).values({
    presetId: input.presetId ?? null,
    textQuery: input.textQuery,
    includedType: input.includedType ?? null,
    minRating: input.minRating ?? null,
    filtersJson: JSON.stringify(filters),
    executedAt: now,
  }).returning({ id: searches.id }).get();

  let fetched;
  let fetchError: unknown;
  try {
    fetched = await fetchPlaces(
      {
        textQuery: input.textQuery,
        includedType: input.includedType,
        minRating: input.minRating,
        maxPages: input.maxPages,
      },
      deps,
    );
  } catch (error) {
    fetchError = error;
    fetched = error instanceof PlacesFetchError ? error.partial : { places: [], pagesFetched: 0, apiRequests: 0 };
  }

  try {
  const result = db.transaction((db) => {
  const normalized = fetched.places
    .map(normalize)
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const outcomes = upsertPlaces(db, normalized, now);
  const newCount = outcomes.filter((o) => o.wasNew).length;

  if (outcomes.length > 0) {
    // Um place_id repetido no mesmo lote gera o mesmo leadId duas vezes;
    // a chave composta de lead_searches não aceita duplicata.
    const seen = new Set<number>();
    const joinRows = outcomes.filter((o) => {
      if (seen.has(o.leadId)) return false;
      seen.add(o.leadId);
      return true;
    }).map((o) => ({ leadId: o.leadId, searchId: search.id, wasNew: o.wasNew }));

    db.insert(leadSearches).values(joinRows).run();
  }

  db.update(searches).set({
    error: fetchError ? (fetchError instanceof Error ? fetchError.message : String(fetchError)) : null,
    pagesFetched: fetched.pagesFetched,
    apiRequests: fetched.apiRequests,
    rawCount: normalized.length,
    newCount,
  }).where(eq(searches.id, search.id)).run();

  const leadIds = outcomes.map((o) => o.leadId);
  const rows = leadIds.length
    ? db.select().from(leads).where(inArray(leads.id, leadIds)).all()
    : [];

  return {
    searchId: search.id,
    rawCount: normalized.length,
    newCount,
    apiRequests: fetched.apiRequests,
    pagesFetched: fetched.pagesFetched,
    leadIds: applyClientFilters(rows, filters).map((r) => r.id),
  };
  });
  if (fetchError) throw fetchError;
  return result;
  } catch (error) {
    db.update(searches).set({
      error: error instanceof Error ? error.message : String(error),
      pagesFetched: fetched.pagesFetched, apiRequests: fetched.apiRequests,
    }).where(eq(searches.id, search.id)).run();
    throw error;
  }
}

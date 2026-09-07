import type { PlaceRaw, SearchTextResponse } from './types';
import * as v from '@/lib/validate';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/**
 * A cobrança segue o tier mais caro pedido. websiteUri e nationalPhoneNumber
 * já colocam a chamada em Enterprise, então places.id (Essentials) e
 * places.location (Pro) entram sem custo extra.
 * nextPageToken é campo de resposta, não é cobrado, e fica explícito
 * para não haver dúvida sobre a paginação.
 */
export const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

/** Limite duro da API: 20 por página, 3 páginas, 60 resultados. */
export const MAX_PAGES = 3;
export const PAGE_SIZE = 20;
const PAGE_DELAY_MS = 500;

export interface PlacesQuery {
  textQuery: string;
  includedType?: string | null;
  minRating?: number | null;
  maxPages?: number;
}

export interface PlacesFetchResult {
  places: PlaceRaw[];
  pagesFetched: number;
  apiRequests: number;
}

export interface PlacesDeps {
  apiKey: string;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class PlacesFetchError extends Error {
  constructor(message: string, public readonly partial: PlacesFetchResult) {
    super(message);
    this.name = 'PlacesFetchError';
  }
}

export function validateQuery(query: PlacesQuery): void {
  v.object(query);
  v.text(query.textQuery, 'O que buscar');
  if (query.includedType != null) v.text(query.includedType, 'Tipo');
  if (query.maxPages !== undefined) v.integer(query.maxPages, 'Páginas');
  if (query.minRating != null) v.number(query.minRating, 'Nota mínima', 0, 5);
}

export function buildRequestBody(
  query: PlacesQuery,
  pageToken?: string,
): Record<string, unknown> {
  validateQuery(query);
  const body: Record<string, unknown> = {
    textQuery: query.textQuery,
    pageSize: PAGE_SIZE,
    languageCode: 'pt-BR',
    regionCode: 'BR',
  };

  if (query.includedType) {
    body.includedType = query.includedType;
    body.strictTypeFiltering = true;
  }
  if (typeof query.minRating === 'number') {
    body.minRating = query.minRating;
  }
  if (pageToken) {
    body.pageToken = pageToken;
  }
  return body;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchPlaces(
  query: PlacesQuery,
  deps: PlacesDeps,
): Promise<PlacesFetchResult> {
  validateQuery(query);
  const doFetch = deps.fetchFn ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const limit = Math.min(query.maxPages ?? MAX_PAGES, MAX_PAGES);

  const places: PlaceRaw[] = [];
  let pageToken: string | undefined;
  let apiRequests = 0;
  let pagesFetched = 0;

  try {
  for (let page = 0; page < limit; page++) {
    apiRequests++;
    const res = await doFetch(ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': deps.apiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify(buildRequestBody(query, pageToken)),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Places API respondeu ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as SearchTextResponse;
    if (!data || typeof data !== 'object' || (data.places !== undefined && !Array.isArray(data.places))) {
      throw new Error('Places API retornou uma resposta inválida.');
    }
    places.push(...(data.places ?? []));
    pagesFetched++;

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;

    if (page + 1 < limit) await sleep(PAGE_DELAY_MS);
  }
  } catch (error) {
    throw new PlacesFetchError(error instanceof Error ? error.message : String(error), {
      places, pagesFetched, apiRequests,
    });
  }

  return { places, pagesFetched, apiRequests };
}

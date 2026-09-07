import { describe, it, expect, vi } from 'vitest';
import { buildRequestBody, fetchPlaces, PLACES_FIELD_MASK } from './client';
import type { SearchTextResponse } from './types';

const noSleep = async () => {};

function jsonResponse(body: SearchTextResponse) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function page(n: number, token?: string): SearchTextResponse {
  return {
    places: Array.from({ length: 20 }, (_, i) => ({
      id: `p${n}-${i}`,
      displayName: { text: `Lugar ${n}-${i}` },
    })),
    nextPageToken: token,
  };
}

describe('PLACES_FIELD_MASK', () => {
  it('inclui id e location — dedup e mapa dependem deles', () => {
    expect(PLACES_FIELD_MASK).toContain('places.id');
    expect(PLACES_FIELD_MASK).toContain('places.location');
  });

  it('inclui nextPageToken para a paginação funcionar', () => {
    expect(PLACES_FIELD_MASK).toContain('nextPageToken');
  });
});

describe('buildRequestBody', () => {
  it('sempre envia pt-BR e BR', () => {
    const body = buildRequestBody({ textQuery: 'barbearia Pinheiros' });
    expect(body).toMatchObject({
      textQuery: 'barbearia Pinheiros',
      pageSize: 20,
      languageCode: 'pt-BR',
      regionCode: 'BR',
    });
  });

  it('ativa strictTypeFiltering junto com includedType', () => {
    const body = buildRequestBody({ textQuery: 'academia', includedType: 'gym' });
    expect(body.includedType).toBe('gym');
    expect(body.strictTypeFiltering).toBe(true);
  });

  it('omite includedType e minRating quando nulos', () => {
    const body = buildRequestBody({ textQuery: 'x', includedType: null, minRating: null });
    expect(body).not.toHaveProperty('includedType');
    expect(body).not.toHaveProperty('strictTypeFiltering');
    expect(body).not.toHaveProperty('minRating');
  });

  it('inclui o pageToken quando informado', () => {
    expect(buildRequestBody({ textQuery: 'x' }, 'tok').pageToken).toBe('tok');
  });
});

describe('fetchPlaces', () => {
  it('busca até 3 páginas e conta uma request por página', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse(page(1, 't1')))
      .mockResolvedValueOnce(jsonResponse(page(2, 't2')))
      .mockResolvedValueOnce(jsonResponse(page(3, 't3')));

    const out = await fetchPlaces(
      { textQuery: 'barbearia' },
      { apiKey: 'k', fetchFn, sleep: noSleep },
    );

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(out.places).toHaveLength(60);
    expect(out.pagesFetched).toBe(3);
    expect(out.apiRequests).toBe(3);
  });

  it('para quando a API não devolve nextPageToken', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(jsonResponse(page(1, 't1')))
      .mockResolvedValueOnce(jsonResponse(page(2)));

    const out = await fetchPlaces(
      { textQuery: 'barbearia' },
      { apiKey: 'k', fetchFn, sleep: noSleep },
    );

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(out.apiRequests).toBe(2);
  });

  it('respeita maxPages menor que o teto', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(page(1, 't1')));

    const out = await fetchPlaces(
      { textQuery: 'x', maxPages: 1 },
      { apiKey: 'k', fetchFn, sleep: noSleep },
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(out.pagesFetched).toBe(1);
  });

  it('nunca passa de 3 páginas mesmo se pedirem mais', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(page(1, 't1')));

    await fetchPlaces(
      { textQuery: 'x', maxPages: 10 },
      { apiKey: 'k', fetchFn, sleep: noSleep },
    );

    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('manda a chave e a field mask nos headers', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ places: [] }));

    await fetchPlaces({ textQuery: 'x' }, { apiKey: 'minha-chave', fetchFn, sleep: noSleep });

    const [, init] = fetchFn.mock.calls[0];
    expect(init.headers['X-Goog-Api-Key']).toBe('minha-chave');
    expect(init.headers['X-Goog-FieldMask']).toBe(PLACES_FIELD_MASK);
    expect(init.method).toBe('POST');
  });

  it('lança erro com status e corpo quando a API recusa', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false, status: 403, text: async () => 'PERMISSION_DENIED',
    } as Response);

    await expect(
      fetchPlaces({ textQuery: 'x' }, { apiKey: 'k', fetchFn, sleep: noSleep }),
    ).rejects.toThrow(/403.*PERMISSION_DENIED/s);
  });

  it('trata resposta sem places como página vazia', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));

    const out = await fetchPlaces({ textQuery: 'x' }, { apiKey: 'k', fetchFn, sleep: noSleep });

    expect(out.places).toEqual([]);
    expect(out.apiRequests).toBe(1);
  });
});

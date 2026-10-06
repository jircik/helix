import { describe, it, expect } from 'vitest';
import { getQuotaLimits, readEnv } from './env';

describe('readEnv', () => {
  it('lê as três variáveis quando todas estão presentes', () => {
    const env = readEnv({
      GOOGLE_PLACES_KEY: 'chave-server',
      NEXT_PUBLIC_GOOGLE_MAPS_KEY: 'chave-browser',
      DATABASE_URL: './helix.db',
    });

    expect(env).toEqual({
      googlePlacesKey: 'chave-server',
      googleMapsBrowserKey: 'chave-browser',
      databaseUrl: './helix.db',
    });
  });

  it('usa ./helix.db quando DATABASE_URL não é informada', () => {
    const env = readEnv({
      GOOGLE_PLACES_KEY: 'chave-server',
      NEXT_PUBLIC_GOOGLE_MAPS_KEY: 'chave-browser',
    });

    expect(env.databaseUrl).toBe('./helix.db');
  });

  it('lança erro nomeando a variável que falta', () => {
    expect(() =>
      readEnv({ NEXT_PUBLIC_GOOGLE_MAPS_KEY: 'chave-browser' }),
    ).toThrow('GOOGLE_PLACES_KEY');
  });

  it('lança erro quando a chave do browser está vazia ou só contém espaços', () => {
    expect(() =>
      readEnv({ GOOGLE_PLACES_KEY: 'chave-server', NEXT_PUBLIC_GOOGLE_MAPS_KEY: '  ' }),
    ).toThrow('NEXT_PUBLIC_GOOGLE_MAPS_KEY');
  });
});

describe('getQuotaLimits', () => {
  it('usa 6 por usuário e 30 global por padrão', () => {
    expect(getQuotaLimits({})).toEqual({ perUser: 6, global: 30 });
  });
  it('lê inteiros das variáveis', () => {
    expect(getQuotaLimits({ PLACES_DAILY_LIMIT_PER_USER: '2', PLACES_DAILY_LIMIT_GLOBAL: '10' })).toEqual({ perUser: 2, global: 10 });
  });
  it('recusa valor inválido em vez de liberar a cota', () => {
    expect(() => getQuotaLimits({ PLACES_DAILY_LIMIT_GLOBAL: 'muito' })).toThrow(/PLACES_DAILY_LIMIT_GLOBAL/);
  });
});

import { describe, it, expect } from 'vitest';
import { readEnv } from './env';

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

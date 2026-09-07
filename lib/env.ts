export interface HelixEnv {
  googlePlacesKey: string;
  googleMapsBrowserKey: string;
  databaseUrl: string;
}

type RawEnv = Record<string, string | undefined>;

function required(raw: RawEnv, key: string): string {
  const value = raw[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `Variável de ambiente ${key} não definida. Copie .env.example para .env e preencha.`,
    );
  }
  return value;
}

export function readEnv(raw: RawEnv): HelixEnv {
  return {
    googlePlacesKey: required(raw, 'GOOGLE_PLACES_KEY'),
    googleMapsBrowserKey: required(raw, 'NEXT_PUBLIC_GOOGLE_MAPS_KEY'),
    databaseUrl: raw.DATABASE_URL?.trim() || './helix.db',
  };
}

export function getEnv(): HelixEnv {
  return readEnv(process.env);
}

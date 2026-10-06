export interface HelixEnv {
  googlePlacesKey: string;
  googleMapsBrowserKey: string;
  databaseUrl: string;
}

export type RawEnv = Record<string, string | undefined>;

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

export interface QuotaLimits { perUser: number; global: number }

function limit(raw: RawEnv, key: string, fallback: number): number {
  const value = raw[key]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Variável de ambiente ${key} precisa ser um inteiro maior ou igual a zero.`);
  }
  return parsed;
}

/** Padrões mantêm o uso abaixo das 1.000 chamadas grátis/mês da SKU Text Search Enterprise. */
export function getQuotaLimits(raw: RawEnv = process.env): QuotaLimits {
  return {
    perUser: limit(raw, 'PLACES_DAILY_LIMIT_PER_USER', 6),
    global: limit(raw, 'PLACES_DAILY_LIMIT_GLOBAL', 30),
  };
}

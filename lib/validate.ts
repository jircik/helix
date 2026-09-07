/** Validação compartilhada entre os serviços HTTP e futuros consumidores locais. */
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Informe um objeto válido.');
  }
  return value as Record<string, unknown>;
}

export function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`Campo não permitido: ${key}.`);
  }
}

export function text(value: unknown, field: string, nullable = false): string | null {
  if (nullable && (value == null || value === '')) return null;
  if (typeof value !== 'string' || (!nullable && !value.trim())) {
    throw new Error(`${field}: informe um texto válido.`);
  }
  return value.trim() || null;
}

export function integer(value: unknown, field: string, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${field}: informe um número inteiro entre ${min} e ${max}.`);
  }
  return value;
}

export function number(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field}: informe um número entre ${min} e ${max}.`);
  }
  return value;
}

export function choice<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new Error(`${field}: valor inválido.`);
  }
  return value as T;
}

export function timestamp(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error(`${field}: informe data e hora com fuso horário.`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${field}: data inválida.`);
  return date.toISOString();
}

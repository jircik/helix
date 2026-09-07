import { DEFAULT_LIST_INPUT, type ListLeadsInput } from '@/lib/repo/leads';
import { TEMPERATURES, VERIFICATIONS } from '@/lib/db/schema';
import * as v from '@/lib/validate';

function csvList<T extends string>(value: string | null, choices: readonly T[]): T[] | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
  return parts.length ? parts.map((part) => v.choice(part, choices, 'Filtro')) : undefined;
}

export function routeId(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('Identificador inválido.');
  return v.integer(Number(value), 'Identificador');
}

/**
 * Sem temperatures nem verifications na query, aplica o padrão da lista:
 * quente e ainda vivo.
 */
export function leadListInputFromParams(params: URLSearchParams): ListLeadsInput {
  const usarPadrao = !params.has('temperatures') && !params.has('verifications');

  return {
    ids: params.has('ids') ? params.get('ids')!.split(',').filter(Boolean).map(routeId) : undefined,
    temperatures: usarPadrao
      ? DEFAULT_LIST_INPUT.temperatures
      : csvList(params.get('temperatures'), TEMPERATURES),
    verifications: usarPadrao
      ? DEFAULT_LIST_INPUT.verifications
      : csvList(params.get('verifications'), VERIFICATIONS),
    searchId: params.has('searchId') ? routeId(params.get('searchId')!) : undefined,
    stageId: params.has('stageId') ? routeId(params.get('stageId')!) : undefined,
    search: params.get('search'),
    limit: params.has('limit') ? v.integer(Number(params.get('limit')), 'Limite', 1, 500) : 50,
    offset: params.has('offset') ? v.integer(Number(params.get('offset')), 'Página', 0) : 0,
  };
}

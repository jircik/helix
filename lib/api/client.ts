import { ROUTES } from '@/lib/routes';

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== 'undefined') {
    const next = window.location.pathname + window.location.search;
    window.location.assign(ROUTES.login + '?next=' + encodeURIComponent(next));
    throw new Error('Sua sessão expirou. Entre novamente.');
  }
  let body: unknown;
  try { body = await res.json(); } catch { throw new Error(`Resposta inválida do servidor (${res.status}).`); }
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Erro ${res.status}`);
  }
  return body as T;
}

export async function apiAllLeads(params: URLSearchParams): Promise<import('@/lib/db/schema').Lead[]> {
  const rows: import('@/lib/db/schema').Lead[] = [];
  const query = new URLSearchParams(params);
  query.set('limit', '500');
  for (let offset = 0; ; offset += 500) {
    query.set('offset', String(offset));
    const page = await apiGet<{ rows: import('@/lib/db/schema').Lead[]; total: number }>('/api/leads?' + query);
    rows.push(...page.rows);
    if (rows.length >= page.total || page.rows.length === 0) return rows;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { cache: 'no-store' }));
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  return parse<T>(await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }));
}

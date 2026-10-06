import { getDb } from '@/lib/db/client';
import { ensureDefaultStages } from '@/lib/db/seed';
import { getSessionUserId } from '@/lib/auth/session';
import { HttpError } from './http-error';

export { HttpError };

export function jsonOk<T>(data: T): Response {
  return Response.json(data as unknown as Record<string, unknown>, { status: 200 });
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function handle<T>(fn: () => T | Promise<T>): Promise<Response> {
  try {
    return jsonOk(await fn());
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.message, error.status);
    const message = error instanceof SyntaxError ? 'JSON inválido.' : error instanceof Error ? error.message : String(error);
    const status = /não encontrad/i.test(message) ? 404 : 400;
    return jsonError(message, status);
  }
}

/**
 * Resolve o usuário da sessão ou responde 401. O userId nunca vem do request.
 * Garante o funil padrão caso o hook de cadastro tenha falhado.
 */
export async function withUser(
  request: Request,
  fn: (userId: string) => Response | Promise<Response>,
): Promise<Response> {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return jsonError('Entre na sua conta para continuar.', 401);
  ensureDefaultStages(getDb(), userId);
  return fn(userId);
}

export function authed<T>(request: Request, fn: (userId: string) => T | Promise<T>): Promise<Response> {
  return withUser(request, (userId) => handle(() => fn(userId)));
}

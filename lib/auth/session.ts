import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from './auth';

/** Única origem do userId nas rotas: a sessão validada no banco. */
export async function getSessionUserId(headers: Headers): Promise<string | null> {
  const result = await getAuth().api.getSession({ headers });
  return result?.user.id ?? null;
}

export interface SessionUser { id: string; name: string; email: string }

export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await getAuth().api.getSession({ headers: await headers() });
  return result ? { id: result.user.id, name: result.user.name, email: result.user.email } : null;
}

/** Para server components: o proxy só vê se o cookie existe; aqui ele é validado de fato. */
export async function requireUser(): Promise<SessionUser> {
  const current = await getSessionUser();
  if (!current) redirect('/entrar');
  return current;
}

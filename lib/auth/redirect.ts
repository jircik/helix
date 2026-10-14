import { ROUTES } from '@/lib/routes';

const AUTH_PAGES: string[] = [ROUTES.login, ROUTES.signup];

/** Só aceita caminho interno; qualquer outra coisa volta para o dashboard. */
export function safeNext(value: string | null | undefined): string {
  if (!value || /[\u0000-\u001f\u007f]/.test(value) || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return ROUTES.dashboard;
  const path = value.split('?')[0];
  return AUTH_PAGES.includes(path) ? ROUTES.dashboard : value;
}

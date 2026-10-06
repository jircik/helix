const AUTH_PAGES = ['/entrar', '/criar-conta'];

/** Só aceita caminho interno; qualquer outra coisa volta para o início. */
export function safeNext(value: string | null | undefined): string {
  if (!value || /[\u0000-\u001f\u007f]/.test(value) || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  const path = value.split('?')[0];
  return AUTH_PAGES.includes(path) ? '/' : value;
}

import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { ROUTES } from '@/lib/routes';

const PUBLIC_PAGES: string[] = ['/', ROUTES.login, ROUTES.signup];

/**
 * Checagem otimista: só olha se o cookie existe, sem tocar no banco.
 * A validação real acontece no layout (requireUser) e em cada rota de API (authed).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PAGES.includes(pathname) || getSessionCookie(request)) return NextResponse.next();
  const url = new URL(ROUTES.login, request.url);
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.svg).*)'],
};

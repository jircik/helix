import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

let handler: ReturnType<typeof toNextJsHandler> | null = null;
/** Lazy: next build importa este módulo e não pode abrir o banco nessa hora. */
const auth = () => (handler ??= toNextJsHandler(getAuth()));

export const GET = (request: Request) => auth().GET(request);
export const POST = (request: Request) => auth().POST(request);

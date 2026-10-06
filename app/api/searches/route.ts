import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { getEnv } from '@/lib/env';
import { runSearch } from '@/lib/services/run-search';
import { listSearches } from '@/lib/services/overview';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return authed(request, (userId) => listSearches(getDb(), userId)); }
export async function POST(request: Request) {
  return authed(request, async (userId) =>
    runSearch(getDb(), userId, await request.json(), { apiKey: getEnv().googlePlacesKey }));
}

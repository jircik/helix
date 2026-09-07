import { getDb } from '@/lib/db/client';
import { handle } from '@/lib/api/respond';
import { getEnv } from '@/lib/env';
import { runSearch } from '@/lib/services/run-search';
import { listSearches } from '@/lib/services/overview';

export const dynamic = 'force-dynamic';
export async function GET() { return handle(() => listSearches(getDb())); }
export async function POST(request: Request) {
  return handle(async () => runSearch(getDb(), await request.json(), { apiKey: getEnv().googlePlacesKey }));
}

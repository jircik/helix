import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { getOverview } from '@/lib/services/overview';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return authed(request, (userId) => getOverview(getDb(), userId)); }

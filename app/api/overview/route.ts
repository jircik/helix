import { getDb } from '@/lib/db/client';
import { handle } from '@/lib/api/respond';
import { getOverview } from '@/lib/services/overview';

export const dynamic = 'force-dynamic';
export async function GET() { return handle(() => getOverview(getDb())); }

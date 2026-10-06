import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { getQuotaLimits } from '@/lib/env';
import { quotaStatus } from '@/lib/services/quota';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return authed(request, (userId) => quotaStatus(getDb(), userId, getQuotaLimits(), new Date().toISOString()));
}

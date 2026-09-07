import { getDb } from '@/lib/db/client';
import { handle } from '@/lib/api/respond';
import { leadListInputFromParams } from '@/lib/api/params';
import { listLeads } from '@/lib/repo/leads';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(() =>
    listLeads(getDb(), leadListInputFromParams(new URL(request.url).searchParams)),
  );
}

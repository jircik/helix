import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { recordActivity, listActivities } from '@/lib/repo/activities';
import { routeId } from '@/lib/api/params';
import { object } from '@/lib/validate';
import type { ActivityKind } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return authed(request, async (userId) => {
    const { id } = await params;
    return listActivities(getDb(), userId, routeId(id));
  });
}

export async function POST(request: Request, { params }: Params) {
  return authed(request, async (userId) => {
    const { id } = await params;
    const body = object(await request.json()) as {
      kind: ActivityKind; body?: string; occurredAt?: string;
    };
    return recordActivity(getDb(), userId, {
      leadId: routeId(id),
      kind: body.kind,
      body: body.body,
      occurredAt: body.occurredAt,
    }, new Date().toISOString());
  });
}

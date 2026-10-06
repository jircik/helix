import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { routeId } from '@/lib/api/params';
import { moveLeadToStage } from '@/lib/services/lead-actions';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return authed(request, async (userId) => {
    const { id } = await params;
    const { stageId } = (await request.json()) as { stageId: number };
    return moveLeadToStage(getDb(), userId, routeId(id), stageId, new Date().toISOString());
  });
}

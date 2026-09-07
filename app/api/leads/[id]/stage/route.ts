import { getDb } from '@/lib/db/client';
import { handle } from '@/lib/api/respond';
import { moveLeadToStage } from '@/lib/services/lead-actions';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const { stageId } = (await request.json()) as { stageId: number };
    return moveLeadToStage(getDb(), Number(id), stageId, new Date().toISOString());
  });
}

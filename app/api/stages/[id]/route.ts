import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { deleteStage, updateStage } from '@/lib/repo/stages';
import { routeId } from '@/lib/api/params';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return authed(request, async (userId) => {
    const { id } = await params;
    return updateStage(getDb(), userId, routeId(id), await request.json());
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return authed(request, async (userId) => {
    const { id } = await params;
    const moveLeadsTo = Number(new URL(request.url).searchParams.get('moveLeadsTo'));
    if (!moveLeadsTo) throw new Error('Informe moveLeadsTo — os leads precisam de uma etapa de destino.');
    deleteStage(getDb(), userId, routeId(id), moveLeadsTo);
    return { ok: true };
  });
}

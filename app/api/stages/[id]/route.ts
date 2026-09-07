import { getDb } from '@/lib/db/client';
import { handle } from '@/lib/api/respond';
import { deleteStage, updateStage } from '@/lib/repo/stages';
import { routeId } from '@/lib/api/params';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    return updateStage(getDb(), routeId(id), await request.json());
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const moveLeadsTo = Number(new URL(request.url).searchParams.get('moveLeadsTo'));
    if (!moveLeadsTo) {
      throw new Error('Informe moveLeadsTo — os leads precisam de uma etapa de destino.');
    }
    deleteStage(getDb(), Number(id), moveLeadsTo);
    return { ok: true };
  });
}

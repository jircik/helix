import { getDb } from '@/lib/db/client';
import { handle } from '@/lib/api/respond';
import { getLead, type UserBlockPatch } from '@/lib/repo/leads';
import { editLead } from '@/lib/services/lead-actions';
import { routeId } from '@/lib/api/params';
import { listActivities } from '@/lib/repo/activities';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const lead = getLead(getDb(), routeId(id));
    if (!lead) throw new Error(`Lead ${id} não encontrado.`);
    return { lead, activities: listActivities(getDb(), lead.id) };
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const patch = (await request.json()) as UserBlockPatch;
    return editLead(getDb(), routeId(id), patch, new Date().toISOString());
  });
}

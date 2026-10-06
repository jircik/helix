import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { getLead, type UserBlockPatch } from '@/lib/repo/leads';
import { editLead } from '@/lib/services/lead-actions';
import { routeId } from '@/lib/api/params';
import { listActivities } from '@/lib/repo/activities';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return authed(request, async (userId) => {
    const { id } = await params;
    const lead = getLead(getDb(), userId, routeId(id));
    if (!lead) throw new Error(`Lead ${id} não encontrado.`);
    return { lead, activities: listActivities(getDb(), userId, lead.id) };
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return authed(request, async (userId) => {
    const { id } = await params;
    const patch = (await request.json()) as UserBlockPatch;
    return editLead(getDb(), userId, routeId(id), patch, new Date().toISOString());
  });
}

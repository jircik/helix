import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { createStage, listStages, reorderStages } from '@/lib/repo/stages';
import type { StageKind } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) { return authed(request, (userId) => listStages(getDb(), userId)); }

export async function POST(request: Request) {
  return authed(request, async (userId) => {
    const body = (await request.json()) as { name: string; kind?: StageKind; color?: string };
    return createStage(getDb(), userId, body);
  });
}

export async function PUT(request: Request) {
  return authed(request, async (userId) => {
    const { orderedIds } = (await request.json()) as { orderedIds: number[] };
    return reorderStages(getDb(), userId, orderedIds);
  });
}

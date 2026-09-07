import { getDb } from '@/lib/db/client';
import { handle } from '@/lib/api/respond';
import { createStage, listStages, reorderStages } from '@/lib/repo/stages';
import type { StageKind } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(() => listStages(getDb()));
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as
      { name: string; kind?: StageKind; color?: string };
    return createStage(getDb(), body);
  });
}

export async function PUT(request: Request) {
  return handle(async () => {
    const { orderedIds } = (await request.json()) as { orderedIds: number[] };
    return reorderStages(getDb(), orderedIds);
  });
}

import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { generateSamples, getSampleState, removeSamples } from '@/lib/services/samples';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) { return authed(request, (userId) => getSampleState(getDb(), userId)); }
export async function POST(request: Request) { return authed(request, (userId) => generateSamples(getDb(), userId)); }
export async function DELETE(request: Request) { return authed(request, (userId) => removeSamples(getDb(), userId)); }

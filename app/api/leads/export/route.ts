import { getDb } from '@/lib/db/client';
import { leadListInputFromParams } from '@/lib/api/params';
import { exportLeads } from '@/lib/services/export-leads';
import { jsonError, withUser } from '@/lib/api/respond';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withUser(request, (userId) => {
    try {
      const params = new URL(request.url).searchParams;
      const csv = exportLeads(getDb(), userId, leadListInputFromParams(params));
      const hoje = new Date().toISOString().slice(0, 10);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="helix-leads-${hoje}.csv"`,
        },
      });
    } catch (error) { return jsonError(error instanceof Error ? error.message : String(error), 400); }
  });
}

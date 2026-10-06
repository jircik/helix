import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { jsonError, jsonOk } from '@/lib/api/respond';

export const dynamic = 'force-dynamic';

/** Público e sem sessão: usado pelo healthcheck do Railway. */
export async function GET() {
  try {
    getDb().get(sql`select 1`);
    return jsonOk({ ok: true });
  } catch (error) {
    console.error('[health] banco indisponível:', error);
    return jsonError('Banco indisponível.', 503);
  }
}

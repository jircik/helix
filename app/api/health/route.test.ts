import { describe, expect, it, vi } from 'vitest';

const holder = vi.hoisted(() => ({ broken: false }));
vi.mock('@/lib/db/client', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/db/client')>();
  const { db } = real.createTestDb();
  return { ...real, getDb: () => { if (holder.broken) throw new Error('disco'); return db; } };
});

import { GET } from './route';

describe('GET /api/health', () => {
  it('200 com banco respondendo, sem exigir sessão', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
  it('503 quando o banco falha', async () => {
    holder.broken = true;
    expect((await GET()).status).toBe(503);
  });
});

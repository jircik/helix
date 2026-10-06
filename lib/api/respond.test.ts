import { describe, it, expect, vi } from 'vitest';
import { authed, handle, HttpError, jsonError, jsonOk, withUser } from './respond';

const sessionUser = vi.hoisted(() => ({ id: null as string | null }));
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: async () => sessionUser.id }));
vi.mock('@/lib/db/client', () => ({ getDb: () => ({}) }));
vi.mock('@/lib/db/seed', () => ({ ensureDefaultStages: vi.fn() }));

describe('jsonOk', () => {
  it('devolve 200 com o corpo serializado', async () => {
    const res = jsonOk({ ok: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('jsonError', () => {
  it('devolve o status pedido com a mensagem', async () => {
    const res = jsonError('deu ruim', 422);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'deu ruim' });
  });
});

describe('handle', () => {
  it('devolve 200 com o resultado da função', async () => {
    const res = await handle(() => ({ valor: 1 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valor: 1 });
  });

  it('aguarda promessas', async () => {
    const res = await handle(async () => ({ valor: 2 }));
    expect(await res.json()).toEqual({ valor: 2 });
  });

  it('converte erro comum em 400', async () => {
    const res = await handle(() => { throw new Error('entrada inválida'); });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entrada inválida' });
  });

  it('converte erro de ausência em 404', async () => {
    const res = await handle(() => { throw new Error('Lead 9 não encontrado.'); });
    expect(res.status).toBe(404);
  });

  it('converte valor não-Error em 400 com texto', async () => {
    const res = await handle(() => { throw 'texto solto'; });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'texto solto' });
  });
});

describe('HttpError', () => {
  it('handle usa o status do erro', async () => {
    const res = await handle(() => { throw new HttpError(429, 'calma'); });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'calma' });
  });
});

describe('authed', () => {
  it('sem sessão responde 401 e não executa a função', async () => {
    sessionUser.id = null;
    const fn = vi.fn();
    const res = await authed(new Request('http://localhost/x'), fn);
    expect(res.status).toBe(401);
    expect(fn).not.toHaveBeenCalled();
  });

  it('com sessão passa o userId da sessão', async () => {
    sessionUser.id = 'user-a';
    const res = await authed(new Request('http://localhost/x'), (userId) => ({ userId }));
    expect(await res.json()).toEqual({ userId: 'user-a' });
  });

  it('withUser devolve a Response da função sem embrulhar', async () => {
    sessionUser.id = 'user-a';
    const res = await withUser(new Request('http://localhost/x'), () => new Response('csv'));
    expect(await res.text()).toBe('csv');
  });
});

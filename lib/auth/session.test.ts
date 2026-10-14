// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const getSession = vi.hoisted(() => vi.fn());
vi.mock('./auth', () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'better-auth.session_token=velho' }) }));
const redirect = vi.hoisted(() => vi.fn((path: string) => { throw new Error(`redirect:${path}`); }));
vi.mock('next/navigation', () => ({ redirect }));

import { requireUser } from './session';

describe('requireUser', () => {
  it('cookie presente mas sessão inválida redireciona para /login', async () => {
    getSession.mockResolvedValueOnce(null);
    await expect(requireUser()).rejects.toThrow('redirect:/login');
  });

  it('sessão válida devolve só id, nome e e-mail', async () => {
    getSession.mockResolvedValueOnce({ user: { id: 'u1', name: 'Ana', email: 'a@b.c', image: null }, session: {} });
    await expect(requireUser()).resolves.toEqual({ id: 'u1', name: 'Ana', email: 'a@b.c' });
  });
});

import { describe, it, expect } from 'vitest';
import { handle, jsonError, jsonOk } from './respond';

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

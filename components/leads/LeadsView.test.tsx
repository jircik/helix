import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadsView } from './LeadsView';
import type { Lead } from '@/lib/db/schema';

const NOW = '2026-09-06T12:00:00.000Z';

function lead(over: Partial<Lead>): Lead {
  return {
    id: 1, placeId: 'p1', name: 'Barbearia Um', formattedAddress: 'Rua A, 1',
    lat: -23.5, lng: -46.6, phone: '(11) 90000-0001', websiteUri: null,
    rating: 4.5, userRatingCount: 30, businessStatus: 'OPERATIONAL',
    primaryType: 'barber_shop', primaryTypeDisplay: 'Barbearia',
    googleMapsUri: null, rawJson: '{}', capturedAt: NOW, temperature: 'quente',
    stageId: null, verification: 'pendente', disqualifyReason: null,
    verifiedBy: null, verifiedAt: null, contactName: null, email: null,
    instagram: null, whatsapp: null, notes: null, nextAction: null,
    nextActionAt: null, createdAt: NOW, updatedAt: NOW, ...over,
  } as Lead;
}

interface Call { url: string; method: string }

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

/** Serve a lista pedida e guarda cada chamada para conferir o DELETE. */
function stubFetch(rows: Lead[], total = rows.length): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    if (url.startsWith('/api/stages')) return Promise.resolve(json([]));
    if (method === 'DELETE') return Promise.resolve(json({ deleted: 1 }));
    return Promise.resolve(json({ rows, total }));
  }));
  return calls;
}

function deletes(calls: Call[]): Call[] {
  return calls.filter((call) => call.method === 'DELETE');
}

async function renderLista(rows: Lead[], total = rows.length): Promise<Call[]> {
  const calls = stubFetch(rows, total);
  render(<LeadsView />);
  await waitFor(() => expect(screen.getByText(rows[0].name)).toBeDefined());
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

const DOIS = [lead({ id: 1, name: 'Barbearia Um' }), lead({ id: 2, name: 'Barbearia Dois' })];

describe('LeadsView — exclusão de leads', () => {
  it('não mostra a barra de ações sem seleção', async () => {
    await renderLista(DOIS);
    expect(screen.queryByRole('button', { name: /apagar selecionados/i })).toBeNull();
  });

  it('marcar um lead abre a barra com a contagem', async () => {
    await renderLista(DOIS);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Barbearia Um' }));
    expect(screen.getByText('1 lead selecionado')).toBeDefined();
  });

  it('marcar a página inteira conta os dois', async () => {
    await renderLista(DOIS);

    await userEvent.click(screen.getByRole('checkbox', { name: /todos os leads da página/i }));
    expect(screen.getByText('2 leads selecionados')).toBeDefined();
  });

  it('a lixeira da linha confirma nomeando o lead', async () => {
    await renderLista(DOIS);

    await userEvent.click(screen.getByRole('button', { name: 'Apagar Barbearia Dois' }));
    const dialogo = screen.getByRole('dialog');
    expect(screen.getByRole('heading', { name: 'Apagar lead' })).toBeDefined();
    expect(dialogo.textContent).toContain('Barbearia Dois');
  });

  it('cancelar não apaga nada', async () => {
    const calls = await renderLista(DOIS);

    await userEvent.click(screen.getByRole('button', { name: 'Apagar Barbearia Um' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(deletes(calls)).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'Apagar lead' })).toBeNull();
  });

  it('confirmar manda o id do lead junto com o filtro da tela', async () => {
    const calls = await renderLista(DOIS);

    await userEvent.click(screen.getByRole('button', { name: 'Apagar Barbearia Dois' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => expect(deletes(calls)).toHaveLength(1));
    const params = new URLSearchParams(deletes(calls)[0].url.split('?')[1]);
    expect(params.get('ids')).toBe('2');
    expect(params.get('temperatures')).toBe('quente');
    // Paginação não descreve o recorte a apagar.
    expect(params.has('limit')).toBe(false);
    expect(params.has('offset')).toBe(false);
  });

  it('a seleção múltipla manda todos os ids marcados', async () => {
    const calls = await renderLista(DOIS);

    await userEvent.click(screen.getByRole('checkbox', { name: /todos os leads da página/i }));
    await userEvent.click(screen.getByRole('button', { name: /apagar selecionados/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => expect(deletes(calls)).toHaveLength(1));
    expect(new URLSearchParams(deletes(calls)[0].url.split('?')[1]).get('ids')).toBe('1,2');
  });

  it('oferece estender a seleção ao filtro inteiro quando sobra lead fora da página', async () => {
    const calls = await renderLista(DOIS, 120);

    await userEvent.click(screen.getByRole('checkbox', { name: /todos os leads da página/i }));
    await userEvent.click(screen.getByRole('button', { name: /selecionar os 120 leads do filtro/i }));
    expect(screen.getByText('120 leads selecionados')).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: /apagar selecionados/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => expect(deletes(calls)).toHaveLength(1));
    const params = new URLSearchParams(deletes(calls)[0].url.split('?')[1]);
    // Sem ids: o servidor resolve o recorte, inclusive o que está fora da página.
    expect(params.has('ids')).toBe(false);
    expect(params.get('all')).toBe('1');
  });

  it('não oferece o filtro inteiro quando a página já é tudo', async () => {
    await renderLista(DOIS);

    await userEvent.click(screen.getByRole('checkbox', { name: /todos os leads da página/i }));
    expect(screen.queryByRole('button', { name: /leads do filtro/i })).toBeNull();
  });

  it('limpar seleção fecha a barra', async () => {
    await renderLista(DOIS);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Barbearia Um' }));
    await userEvent.click(screen.getByRole('button', { name: /limpar seleção/i }));

    expect(screen.queryByRole('button', { name: /apagar selecionados/i })).toBeNull();
  });

  it('recarrega a lista depois de apagar', async () => {
    const calls = await renderLista(DOIS);
    const antes = calls.filter((call) => call.method === 'GET').length;

    await userEvent.click(screen.getByRole('button', { name: 'Apagar Barbearia Um' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => {
      expect(calls.filter((call) => call.method === 'GET').length).toBeGreaterThan(antes);
    });
  });

  it('mostra o erro do servidor e mantém a confirmação aberta', async () => {
    stubFetch(DOIS);
    vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/stages')) return Promise.resolve(json([]));
      if ((init?.method ?? 'GET') === 'DELETE') {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Informe quais leads apagar.' }), { status: 400 }));
      }
      return Promise.resolve(json({ rows: DOIS, total: 2 }));
    }));
    render(<LeadsView />);
    await waitFor(() => expect(screen.getByText('Barbearia Um')).toBeDefined());

    await userEvent.click(screen.getByRole('button', { name: 'Apagar Barbearia Um' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Informe quais leads apagar.'));
    expect(screen.getByRole('heading', { name: 'Apagar lead' })).toBeDefined();
  });
});

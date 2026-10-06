import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from './SearchForm';

const apiGet = vi.hoisted(() => vi.fn(async () => ({ used: 2, limit: 6, remaining: 4 })));
vi.mock('@/lib/api/client', () => ({ apiGet }));

describe('prospecção inteiramente em modal', () => {
  it('mostra só a ação principal e não consulta a API ao abrir', async () => {
    const onSearch = vi.fn();
    render(<SearchForm running={false} onSearch={onSearch} />);
    expect(screen.queryByLabelText('O que buscar')).toBeNull();
    expect(screen.queryByLabelText('Nota mínima')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Fazer prospecção' }));
    expect(screen.getByRole('dialog', { name: 'Nova prospecção' })).toBeDefined();
    expect(onSearch).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Buscar estabelecimentos' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('envia texto e filtros juntos, preservando a última busca ao reabrir', async () => {
    const onSearch = vi.fn();
    render(<SearchForm running={false} onSearch={onSearch} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fazer prospecção' }));
    await userEvent.type(screen.getByLabelText('O que buscar'), 'Oficinas em São Paulo');
    await userEvent.type(screen.getByLabelText('Nota mínima'), '4.5');
    await userEvent.click(screen.getByRole('combobox', { name: 'Limite de resultados' }));
    await userEvent.click(screen.getByRole('option', { name: 'Até 20 · 1 página' }));
    expect(onSearch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Buscar estabelecimentos' }));
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ textQuery: 'Oficinas em São Paulo', maxPages: 1, minRating: 4.5 }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Fazer prospecção' }));
    expect((screen.getByLabelText('Nota mínima') as HTMLInputElement).value).toBe('4.5');
    expect((screen.getByLabelText('O que buscar') as HTMLInputElement).value).toBe('Oficinas em São Paulo');
  });
  it('cancelar e Escape descartam mudanças sem disparar buscas', async () => {
    const onSearch = vi.fn();
    render(<SearchForm running={false} onSearch={onSearch} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fazer prospecção' }));
    await userEvent.type(screen.getByLabelText('Nota mínima'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fazer prospecção' }));
    expect((screen.getByLabelText('Nota mínima') as HTMLInputElement).value).toBe('');
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('mostra quantas chamadas restam hoje', async () => {
    render(<SearchForm running={false} onSearch={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fazer prospecção' }));
    expect(await screen.findByText('Restam 4 de 6 chamadas à API hoje.')).toBeDefined();
  });

  it('sem cota, bloqueia a busca e explica o motivo', async () => {
    apiGet.mockResolvedValueOnce({ used: 6, limit: 6, remaining: 0 });
    render(<SearchForm running={false} onSearch={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fazer prospecção' }));
    await userEvent.type(screen.getByLabelText('O que buscar'), 'Padarias');
    expect(await screen.findByText(/Limite diário de demonstração atingido/)).toBeDefined();
    expect((screen.getByRole('button', { name: 'Buscar estabelecimentos' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

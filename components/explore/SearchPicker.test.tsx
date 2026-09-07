import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPicker, TODA_A_BASE } from './SearchPicker';
import type { Search } from '@/lib/db/schema';

function search(over: Partial<Search> = {}): Search {
  return {
    id: 1, presetId: null, textQuery: 'barbearia Pinheiros São Paulo',
    includedType: null, minRating: null, filtersJson: '{}',
    pagesFetched: 1, apiRequests: 1, rawCount: 20, newCount: 20,
    executedAt: '2026-09-07T12:00:00.000Z', error: null, ...over,
  } as Search;
}

describe('SearchPicker', () => {
  it('oferece "Toda a base" mesmo sem nenhuma busca', async () => {
    render(<SearchPicker searches={[]} value={TODA_A_BASE} onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Busca' }).textContent).toContain('Toda a base');
  });

  it('mostra a query, a contagem e a data de cada busca', async () => {
    render(<SearchPicker searches={[search()]} value="1" onChange={() => {}} />);

    const gatilho = screen.getByRole('combobox', { name: 'Busca' });
    expect(gatilho.textContent).toContain('barbearia Pinheiros São Paulo');
    expect(gatilho.textContent).toContain('20 leads');
    expect(gatilho.textContent).toContain('07/09');
  });

  it('marca a busca que falhou em vez de mostrar contagem zerada', () => {
    render(<SearchPicker searches={[search({ error: 'Places API respondeu 429' })]} value="1" onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Busca' }).textContent).toContain('falhou');
  });

  it('avisa a escolha de outra busca', async () => {
    const onChange = vi.fn();
    render(
      <SearchPicker
        searches={[search({ id: 1 }), search({ id: 2, textQuery: 'academia Moema' })]}
        value="1"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Busca' }));
    await userEvent.click(await screen.findByRole('option', { name: /academia Moema/ }));

    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('permite voltar para toda a base', async () => {
    const onChange = vi.fn();
    render(<SearchPicker searches={[search()]} value="1" onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Busca' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Toda a base' }));

    expect(onChange).toHaveBeenCalledWith(TODA_A_BASE);
  });
});

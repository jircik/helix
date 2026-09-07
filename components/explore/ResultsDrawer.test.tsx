import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsDrawer } from './ResultsDrawer';
import type { Lead } from '@/lib/db/schema';

const NOW = '2026-09-06T12:00:00.000Z';

function lead(id: number, over: Partial<Lead> = {}): Lead {
  return {
    id, placeId: `p${id}`, name: `Lead ${id}`, formattedAddress: 'Rua X, 1',
    lat: -23.5, lng: -46.6, phone: null, websiteUri: null, rating: 4.2,
    userRatingCount: 12, businessStatus: 'OPERATIONAL', primaryType: null,
    primaryTypeDisplay: 'Barbearia', googleMapsUri: null, rawJson: '{}',
    capturedAt: NOW, temperature: 'quente', stageId: null,
    verification: 'pendente', disqualifyReason: null, verifiedBy: null,
    verifiedAt: null, contactName: null, email: null, instagram: null,
    whatsapp: null, notes: null, nextAction: null, nextActionAt: null,
    createdAt: NOW, updatedAt: NOW, ...over,
  } as Lead;
}

describe('ResultsDrawer', () => {
  const noop = () => {};

  it('mostra a contagem de resultados', () => {
    render(<ResultsDrawer rows={[lead(1), lead(2)]} selectedId={null} onSelect={noop} onOpen={noop} />);
    expect(screen.getByText(/2 resultados/i)).toBeDefined();
  });

  it('usa singular com um resultado', () => {
    render(<ResultsDrawer rows={[lead(1)]} selectedId={null} onSelect={noop} onOpen={noop} />);
    expect(screen.getByText(/1 resultado/i)).toBeDefined();
  });

  it('avisa quando não há resultado', () => {
    render(<ResultsDrawer rows={[]} selectedId={null} onSelect={noop} onOpen={noop} />);
    expect(screen.getByText(/nenhum resultado/i)).toBeDefined();
  });

  it('aceita uma mensagem de vazio própria', () => {
    render(<ResultsDrawer rows={[]} selectedId={null} onSelect={noop} onOpen={noop}
      emptyMessage="Essa busca não devolveu nada." />);
    expect(screen.getByText('Essa busca não devolveu nada.')).toBeDefined();
  });

  it('seleciona ao clicar no card', async () => {
    const onSelect = vi.fn();
    render(<ResultsDrawer rows={[lead(7)]} selectedId={null} onSelect={onSelect} onOpen={noop} />);

    await userEvent.click(screen.getByRole('heading', { name: 'Lead 7' }));
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('marca o card selecionado', () => {
    const { container } = render(
      <ResultsDrawer rows={[lead(3)]} selectedId={3} onSelect={noop} onOpen={noop} />,
    );
    expect(container.querySelector('.lead-card[aria-current="true"]')).not.toBeNull();
  });

  it('abre o detalhe sem depender da seleção', async () => {
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    render(<ResultsDrawer rows={[lead(5)]} selectedId={null} onSelect={onSelect} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: /ver detalhes/i }));
    expect(onOpen).toHaveBeenCalledWith(5);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renderiza o botão de filtros que recebe', () => {
    render(<ResultsDrawer rows={[]} selectedId={null} onSelect={noop} onOpen={noop}
      toolbar={<button type="button">Filtros</button>} />);
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeDefined();
  });
});

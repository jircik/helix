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
  it('mostra a contagem de resultados', () => {
    render(<ResultsDrawer rows={[lead(1), lead(2)]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/2 resultados/i)).toBeDefined();
  });

  it('usa singular com um resultado', () => {
    render(<ResultsDrawer rows={[lead(1)]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/1 resultado/i)).toBeDefined();
  });

  it('avisa quando não há resultado', () => {
    render(<ResultsDrawer rows={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/nenhum resultado/i)).toBeDefined();
  });

  it('seleciona ao clicar no card', async () => {
    const onSelect = vi.fn();
    render(<ResultsDrawer rows={[lead(7)]} selectedId={null} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /lead 7/i }));
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('marca o card selecionado com aria-pressed', () => {
    render(<ResultsDrawer rows={[lead(3)]} selectedId={3} onSelect={() => {}} />);
    expect(screen.getByRole('button', { pressed: true })).toBeDefined();
  });
});

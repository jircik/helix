import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadTable } from './LeadTable';
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

describe('LeadTable', () => {
  it('mostra nome, tipo e telefone', () => {
    render(<LeadTable rows={[lead({})]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('Barbearia Um')).toBeDefined();
    expect(screen.getByText('Barbearia')).toBeDefined();
    expect(screen.getByText('(11) 90000-0001')).toBeDefined();
  });

  it('mostra travessão quando não há telefone', () => {
    render(<LeadTable rows={[lead({ phone: null })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('mostra a temperatura', () => {
    render(<LeadTable rows={[lead({ temperature: 'morno' })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('Morno')).toBeDefined();
  });

  it('avisa quando a lista está vazia', () => {
    render(<LeadTable rows={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/nenhum lead/i)).toBeDefined();
  });

  it('chama onSelect com o id ao clicar na linha', async () => {
    const onSelect = vi.fn();
    render(<LeadTable rows={[lead({ id: 42 })]} selectedId={null} onSelect={onSelect} />);

    await userEvent.click(screen.getByText('Barbearia Um'));
    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('marca a linha selecionada', () => {
    render(<LeadTable rows={[lead({ id: 7 })]} selectedId={7} onSelect={() => {}} />);
    expect(screen.getByRole('row', { selected: true })).toBeDefined();
  });

  it('mostra uma lupa por linha, rotulada com o nome do lead', () => {
    render(<LeadTable rows={[lead({ name: 'Barbearia Dois' })]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Ver detalhes de Barbearia Dois' })).toBeDefined();
  });

  it('a lupa abre o detalhe do lead', async () => {
    const onSelect = vi.fn();
    render(<LeadTable rows={[lead({ id: 9 })]} selectedId={null} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /ver detalhes de/i }));
    expect(onSelect).toHaveBeenCalledWith(9);
  });

  it('a lupa não dispara a seleção duas vezes ao propagar para a linha', async () => {
    const onSelect = vi.fn();
    render(<LeadTable rows={[lead({ id: 9 })]} selectedId={null} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /ver detalhes de/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

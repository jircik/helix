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

const SELECTION = {
  checked: [] as number[],
  onCheck: () => {},
  onCheckAll: () => {},
  onDelete: () => {},
};

describe('LeadTable', () => {
  it('mostra nome, tipo e telefone', () => {
    render(<LeadTable rows={[lead({})]} selectedId={null} onSelect={() => {}} {...SELECTION} />);
    expect(screen.getByText('Barbearia Um')).toBeDefined();
    expect(screen.getByText('Barbearia')).toBeDefined();
    expect(screen.getByText('(11) 90000-0001')).toBeDefined();
  });

  it('mostra travessão quando não há telefone', () => {
    render(<LeadTable rows={[lead({ phone: null })]} selectedId={null} onSelect={() => {}} {...SELECTION} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('mostra a temperatura', () => {
    render(<LeadTable rows={[lead({ temperature: 'morno' })]} selectedId={null} onSelect={() => {}} {...SELECTION} />);
    expect(screen.getByText('Morno')).toBeDefined();
  });

  it('avisa quando a lista está vazia', () => {
    render(<LeadTable rows={[]} selectedId={null} onSelect={() => {}} {...SELECTION} />);
    expect(screen.getByText(/nenhum lead/i)).toBeDefined();
  });

  it('chama onSelect com o id ao clicar na linha', async () => {
    const onSelect = vi.fn();
    render(<LeadTable rows={[lead({ id: 42 })]} selectedId={null} onSelect={onSelect} {...SELECTION} />);

    await userEvent.click(screen.getByText('Barbearia Um'));
    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('marca a linha selecionada', () => {
    render(<LeadTable rows={[lead({ id: 7 })]} selectedId={7} onSelect={() => {}} {...SELECTION} />);
    expect(screen.getByRole('row', { selected: true })).toBeDefined();
  });

  it('mostra uma lupa por linha, rotulada com o nome do lead', () => {
    render(<LeadTable rows={[lead({ name: 'Barbearia Dois' })]} selectedId={null} onSelect={() => {}} {...SELECTION} />);
    expect(screen.getByRole('button', { name: 'Ver detalhes de Barbearia Dois' })).toBeDefined();
  });

  it('a lupa abre o detalhe do lead', async () => {
    const onSelect = vi.fn();
    render(<LeadTable rows={[lead({ id: 9 })]} selectedId={null} onSelect={onSelect} {...SELECTION} />);

    await userEvent.click(screen.getByRole('button', { name: /ver detalhes de/i }));
    expect(onSelect).toHaveBeenCalledWith(9);
  });

  it('a lupa não dispara a seleção duas vezes ao propagar para a linha', async () => {
    const onSelect = vi.fn();
    render(<LeadTable rows={[lead({ id: 9 })]} selectedId={null} onSelect={onSelect} {...SELECTION} />);

    await userEvent.click(screen.getByRole('button', { name: /ver detalhes de/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('marca um lead pelo checkbox da linha', async () => {
    const onCheck = vi.fn();
    render(<LeadTable rows={[lead({ id: 5, name: 'Barbearia Um' })]} selectedId={null}
      onSelect={() => {}} {...SELECTION} onCheck={onCheck} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Barbearia Um' }));
    expect(onCheck).toHaveBeenCalledWith(5, true);
  });

  it('marcar não abre o detalhe do lead', async () => {
    const onSelect = vi.fn();
    render(<LeadTable rows={[lead({ id: 5 })]} selectedId={null}
      onSelect={onSelect} {...SELECTION} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /selecionar barbearia/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('desmarca o lead já marcado', async () => {
    const onCheck = vi.fn();
    render(<LeadTable rows={[lead({ id: 5 })]} selectedId={null}
      onSelect={() => {}} {...SELECTION} checked={[5]} onCheck={onCheck} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /selecionar barbearia/i }));
    expect(onCheck).toHaveBeenCalledWith(5, false);
  });

  it('o checkbox do cabeçalho marca a página inteira', async () => {
    const onCheckAll = vi.fn();
    render(<LeadTable rows={[lead({ id: 1 }), lead({ id: 2, name: 'Dois' })]} selectedId={null}
      onSelect={() => {}} {...SELECTION} onCheckAll={onCheckAll} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /todos os leads da página/i }));
    expect(onCheckAll).toHaveBeenCalledWith(true);
  });

  it('o cabeçalho fica marcado quando toda a página está marcada', () => {
    render(<LeadTable rows={[lead({ id: 1 }), lead({ id: 2, name: 'Dois' })]} selectedId={null}
      onSelect={() => {}} {...SELECTION} checked={[1, 2]} />);

    const todos = screen.getByRole('checkbox', { name: /todos os leads da página/i }) as HTMLInputElement;
    expect(todos.checked).toBe(true);
    expect(todos.indeterminate).toBe(false);
  });

  it('o cabeçalho fica indeterminado com seleção parcial', () => {
    render(<LeadTable rows={[lead({ id: 1 }), lead({ id: 2, name: 'Dois' })]} selectedId={null}
      onSelect={() => {}} {...SELECTION} checked={[1]} />);

    const todos = screen.getByRole('checkbox', { name: /todos os leads da página/i }) as HTMLInputElement;
    expect(todos.checked).toBe(false);
    expect(todos.indeterminate).toBe(true);
  });

  it('mostra uma lixeira por linha, rotulada com o nome do lead', () => {
    render(<LeadTable rows={[lead({ name: 'Barbearia Dois' })]} selectedId={null}
      onSelect={() => {}} {...SELECTION} />);

    expect(screen.getByRole('button', { name: 'Apagar Barbearia Dois' })).toBeDefined();
  });

  it('a lixeira pede a exclusão daquele lead sem abrir o detalhe', async () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    const row = lead({ id: 12 });
    render(<LeadTable rows={[row]} selectedId={null}
      onSelect={onSelect} {...SELECTION} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: /apagar barbearia/i }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadDetail } from './LeadDetail';
import type { Activity, Lead, Stage } from '@/lib/db/schema';

const NOW = '2026-09-06T12:00:00.000Z';

const STAGES: Stage[] = [
  { id: 1, name: 'Novo', position: 1, color: null, kind: 'open' },
  { id: 2, name: 'Contatado', position: 2, color: null, kind: 'open' },
];

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: 1, placeId: 'p1', name: 'Barbearia Um', formattedAddress: 'Rua A, 1',
    lat: -23.5, lng: -46.6, phone: '(11) 90000-0001', websiteUri: null,
    rating: 4.5, userRatingCount: 30, businessStatus: 'OPERATIONAL',
    primaryType: 'barber_shop', primaryTypeDisplay: 'Barbearia',
    googleMapsUri: null, rawJson: '{}', capturedAt: NOW, temperature: 'quente',
    stageId: 1, verification: 'pendente', disqualifyReason: null,
    verifiedBy: null, verifiedAt: null, contactName: null, email: null,
    instagram: null, whatsapp: null, notes: null, nextAction: null,
    nextActionAt: null, createdAt: NOW, updatedAt: NOW, ...over,
  } as Lead;
}

const noop = async () => {};

describe('LeadDetail', () => {
  it('separa visualmente os três blocos', () => {
    render(<LeadDetail lead={lead()} activities={[]} stages={STAGES}
      onPatch={noop} onAddActivity={noop} />);

    expect(screen.getByRole('heading', { name: /dados do google/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /seus dados/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /timeline/i })).toBeDefined();
  });

  it('mostra os campos do Google como texto, não como campo editável', () => {
    render(<LeadDetail lead={lead()} activities={[]} stages={STAGES}
      onPatch={noop} onAddActivity={noop} />);

    expect(screen.getByText('Rua A, 1')).toBeDefined();
    expect(screen.queryByDisplayValue('Rua A, 1')).toBeNull();
  });

  it('mostra "sem site" quando não há websiteUri', () => {
    render(<LeadDetail lead={lead({ websiteUri: null })} activities={[]} stages={STAGES}
      onPatch={noop} onAddActivity={noop} />);
    expect(screen.getByText(/sem site/i)).toBeDefined();
  });

  it('mostra a data de captura do snapshot', () => {
    render(<LeadDetail lead={lead()} activities={[]} stages={STAGES}
      onPatch={noop} onAddActivity={noop} />);
    expect(screen.getByText(/capturado em/i)).toBeDefined();
  });

  it('envia o patch ao salvar os seus dados', async () => {
    const onPatch = vi.fn(async () => {});
    render(<LeadDetail lead={lead()} activities={[]} stages={STAGES}
      onPatch={onPatch} onAddActivity={noop} />);

    await userEvent.type(screen.getByLabelText('Contato'), 'Maria');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onPatch).toHaveBeenCalledWith(
      expect.objectContaining({ contactName: 'Maria' }),
    );
  });

  it('pede motivo ao descartar', async () => {
    const onPatch = vi.fn(async () => {});
    render(<LeadDetail lead={lead()} activities={[]} stages={STAGES}
      onPatch={onPatch} onAddActivity={noop} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Verificação' }));
    await userEvent.click(screen.getByRole('option', { name: 'Descartado' }));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onPatch).not.toHaveBeenCalled();
    expect(screen.getByText(/informe o motivo/i)).toBeDefined();
  });

  it('lista as atividades', () => {
    const activities: Activity[] = [{
      id: 1, leadId: 1, kind: 'ligacao', body: 'não atendeu',
      occurredAt: NOW, createdAt: NOW,
    }];
    render(<LeadDetail lead={lead()} activities={activities} stages={STAGES}
      onPatch={noop} onAddActivity={noop} />);

    expect(screen.getByText('não atendeu')).toBeDefined();
    expect(within(screen.getByRole('list')).getByText(/ligação/i)).toBeDefined();
  });

  it('registra nova atividade', async () => {
    const onAddActivity = vi.fn(async () => {});
    render(<LeadDetail lead={lead()} activities={[]} stages={STAGES}
      onPatch={noop} onAddActivity={onAddActivity} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Tipo' }));
    await userEvent.click(screen.getByRole('option', { name: 'WhatsApp' }));
    await userEvent.type(screen.getByLabelText('O que aconteceu'), 'mandei orçamento');
    await userEvent.click(screen.getByRole('button', { name: /registrar/i }));

    expect(onAddActivity).toHaveBeenCalledWith({
      kind: 'whatsapp', body: 'mandei orçamento',
    });
  });
});

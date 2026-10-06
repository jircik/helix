import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadModal } from './LeadModal';
import type { Activity, ActivityKind, Lead, Stage } from '@/lib/db/schema';
import type { UserBlockPatch } from '@/lib/repo/leads';

const NOW = '2026-09-06T12:00:00.000Z';

const STAGES: Stage[] = [
  { id: 1, userId: 'user-a', name: 'Novo', position: 1, color: null, kind: 'open' },
  { id: 2, userId: 'user-a', name: 'Contatado', position: 2, color: null, kind: 'open' },
  { id: 3, userId: 'user-a', name: 'Proposta', position: 3, color: null, kind: 'open' },
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
const patchSpy = () => vi.fn<(patch: UserBlockPatch) => Promise<void>>(async () => {});

interface Overrides {
  activities: Activity[];
  onPatch: (patch: UserBlockPatch) => Promise<void>;
  onMoveStage: (stageId: number) => Promise<void>;
  onAddActivity: (input: { kind: ActivityKind; body: string }) => Promise<void>;
  onClose: () => void;
}

function setup(over: Partial<Lead> = {}, props: Partial<Overrides> = {}) {
  return render(
    <LeadModal
      lead={lead(over)}
      activities={props.activities ?? []}
      stages={STAGES}
      onPatch={props.onPatch ?? noop}
      onMoveStage={props.onMoveStage ?? noop}
      onAddActivity={props.onAddActivity ?? noop}
      onClose={props.onClose ?? (() => {})}
    />,
  );
}

describe('LeadModal', () => {
  it('abre com o nome do lead como título', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Barbearia Um' })).toBeDefined();
  });

  it('mostra telefone e temperatura no subtítulo', () => {
    const { container } = setup();
    const subtitulo = container.querySelector('.modal-subtitle')!;
    expect(subtitulo.textContent).toContain('(11) 90000-0001');
    expect(subtitulo.textContent).toContain('Quente');
  });

  it('oferece três abas', () => {
    setup();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Empresa', 'Dados', 'Mapa']);
  });

  it('abre na aba Empresa', () => {
    setup();
    expect(screen.getByRole('tab', { name: 'Empresa' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Dados' }).getAttribute('aria-selected')).toBe('false');
  });

  it('mostra os campos do Google como texto, não como campo editável', () => {
    setup();
    expect(screen.getByText('Rua A, 1')).toBeDefined();
    expect(screen.queryByDisplayValue('Rua A, 1')).toBeNull();
  });

  it('mostra "sem site" quando não há websiteUri', () => {
    setup({ websiteUri: null });
    expect(screen.getByText(/sem site/i)).toBeDefined();
  });

  it('mostra a data de captura do snapshot', () => {
    setup();
    expect(screen.getByText(/capturado em/i)).toBeDefined();
  });

  it('troca para a aba Dados ao clicar', async () => {
    setup();
    await userEvent.click(screen.getByRole('tab', { name: 'Dados' }));
    expect(screen.getByRole('tab', { name: 'Dados' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('Contato')).toBeDefined();
  });

  it('não mostra os campos editáveis enquanto a aba Empresa está ativa', () => {
    setup();
    expect(screen.queryByLabelText('Contato')).toBeNull();
  });

  it('envia o patch ao salvar os seus dados', async () => {
    const onPatch = patchSpy();
    setup({}, { onPatch });

    await userEvent.click(screen.getByRole('tab', { name: 'Dados' }));
    await userEvent.type(screen.getByLabelText('Contato'), 'Maria');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ contactName: 'Maria' }));
  });

  it('não deixa o patch tocar em campo do Google', async () => {
    const onPatch = patchSpy();
    setup({}, { onPatch });

    await userEvent.click(screen.getByRole('tab', { name: 'Dados' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const patch = onPatch.mock.calls[0][0] as Record<string, unknown>;
    for (const campo of ['name', 'websiteUri', 'temperature', 'capturedAt', 'phone', 'rating']) {
      expect(patch).not.toHaveProperty(campo);
    }
  });

  it('pede motivo ao descartar', async () => {
    const onPatch = patchSpy();
    setup({ verification: 'descartado' }, { onPatch });

    await userEvent.click(screen.getByRole('tab', { name: 'Dados' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onPatch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/informe o motivo/i);
  });

  it('lista as atividades', async () => {
    const activities: Activity[] = [{
      id: 1, leadId: 1, kind: 'ligacao', body: 'não atendeu',
      occurredAt: NOW, createdAt: NOW,
    }];
    setup({}, { activities });

    await userEvent.click(screen.getByRole('tab', { name: 'Dados' }));
    const timeline = within(screen.getByRole('list'));
    expect(timeline.getByText('não atendeu')).toBeDefined();
    expect(timeline.getByText(/ligação/i)).toBeDefined();
  });

  it('registra nova atividade', async () => {
    const onAddActivity = vi.fn(async () => {});
    setup({}, { onAddActivity });

    await userEvent.click(screen.getByRole('tab', { name: 'Dados' }));
    await userEvent.type(screen.getByLabelText('O que aconteceu'), 'mandei orçamento');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(onAddActivity).toHaveBeenCalledWith({ kind: 'ligacao', body: 'mandei orçamento' });
  });

  it('mostra a etapa atual no seletor do topo', () => {
    setup({ stageId: 3 });
    expect(screen.getByRole('combobox', { name: 'Etapa do funil' }).textContent).toContain('Proposta');
  });

  it('move a etapa ao escolher outra no seletor do topo', async () => {
    const onMoveStage = vi.fn(async () => {});
    setup({ stageId: 1 }, { onMoveStage });

    await userEvent.click(screen.getByRole('combobox', { name: 'Etapa do funil' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Contatado' }));

    expect(onMoveStage).toHaveBeenCalledWith(2);
  });

  it('fecha pelo botão do cabeçalho', async () => {
    const onClose = vi.fn();
    setup({}, { onClose });

    await userEvent.click(screen.getByRole('button', { name: 'Fechar detalhes do lead' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('a aba Mapa mostra o endereço do lead', async () => {
    setup({ formattedAddress: 'Rua A, 1' });
    await userEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
    expect(screen.getByRole('tabpanel').textContent).toContain('Rua A, 1');
  });

  it('a aba Mapa avisa quando o lead não tem coordenada', async () => {
    setup({ lat: null, lng: null });
    await userEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
    expect(screen.getByText(/não tem coordenada/i)).toBeDefined();
  });
});

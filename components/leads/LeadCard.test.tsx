import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadCard, initials, leadReason, shortAddress } from './LeadCard';
import type { Lead } from '@/lib/db/schema';

const NOW = '2026-09-06T12:00:00.000Z';

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: 1, placeId: 'p1', name: 'Barbearia Valentins',
    formattedAddress: 'R. Pascoal Bianco, 9 - Pinheiros, São Paulo - SP, 05425-050',
    lat: -23.5, lng: -46.6, phone: '(11) 90000-0001', websiteUri: null,
    rating: 4.9, userRatingCount: 111, businessStatus: 'OPERATIONAL',
    primaryType: 'barber_shop', primaryTypeDisplay: 'Barbearia',
    googleMapsUri: null, rawJson: '{}', capturedAt: NOW, temperature: 'quente',
    stageId: 1, verification: 'pendente', disqualifyReason: null,
    verifiedBy: null, verifiedAt: null, contactName: null, email: null,
    instagram: null, whatsapp: null, notes: null, nextAction: null,
    nextActionAt: null, createdAt: NOW, updatedAt: NOW, ...over,
  } as Lead;
}

describe('initials', () => {
  it('usa a inicial das duas primeiras palavras', () => {
    expect(initials('Barbearia Valentins')).toBe('BV');
  });

  it('usa as duas primeiras letras quando há uma palavra só', () => {
    expect(initials('Trinks')).toBe('TR');
  });

  it('ignora pontuação e emoji', () => {
    expect(initials('Studio Luiz Barber 💈')).toBe('SL');
  });

  it('devolve travessão quando não sobra letra', () => {
    expect(initials('💈')).toBe('—');
  });
});

describe('leadReason', () => {
  it('diz sem site no quente', () => {
    expect(leadReason(lead({ temperature: 'quente' }))).toBe('Sem site');
  });

  it('diz tem site no frio', () => {
    expect(leadReason(lead({ temperature: 'frio', websiteUri: 'https://x.com.br' }))).toBe('Tem site');
  });

  it('nomeia o canal do morno', () => {
    expect(leadReason(lead({ temperature: 'morno', websiteUri: 'https://instagram.com/x' })))
      .toBe('Só Instagram');
    expect(leadReason(lead({ temperature: 'morno', websiteUri: 'https://www.ifood.com.br/loja/y' })))
      .toBe('Só Ifood');
  });

  it('cai em rede social quando a URL é impossível de ler', () => {
    expect(leadReason(lead({ temperature: 'morno', websiteUri: 'não é url' })))
      .toBe('Só rede social');
  });
});

describe('shortAddress', () => {
  it('mostra bairro e cidade, sem número nem CEP', () => {
    expect(shortAddress('R. Pascoal Bianco, 9 - Pinheiros, São Paulo - SP, 05425-050'))
      .toBe('Pinheiros, São Paulo · SP, 05425-050');
  });

  it('avisa quando não há endereço', () => {
    expect(shortAddress(null)).toBe('Sem endereço');
  });
});

describe('LeadCard', () => {
  const noop = () => {};

  it('mostra nome, iniciais, temperatura e tipo', () => {
    render(<LeadCard lead={lead()} selected={false} onSelect={noop} onOpen={noop} />);
    expect(screen.getByRole('heading', { name: 'Barbearia Valentins' })).toBeDefined();
    expect(screen.getByText('BV')).toBeDefined();
    expect(screen.getByText('Quente')).toBeDefined();
    expect(screen.getByText('Barbearia')).toBeDefined();
    expect(screen.getByText('111 aval.')).toBeDefined();
  });

  it('mostra o motivo de ser lead no rodapé', () => {
    render(<LeadCard lead={lead()} selected={false} onSelect={noop} onOpen={noop} />);
    expect(screen.getByText('Sem site')).toBeDefined();
  });

  it('omite a nota quando o lead não tem', () => {
    render(<LeadCard lead={lead({ rating: null })} selected={false} onSelect={noop} onOpen={noop} />);
    expect(screen.queryByText('4.9')).toBeNull();
  });

  it('seleciona ao clicar no card', async () => {
    const onSelect = vi.fn();
    render(<LeadCard lead={lead({ id: 12 })} selected={false} onSelect={onSelect} onOpen={noop} />);

    await userEvent.click(screen.getByRole('heading', { name: 'Barbearia Valentins' }));
    expect(onSelect).toHaveBeenCalledWith(12);
  });

  it('abre o detalhe sem selecionar junto', async () => {
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    render(<LeadCard lead={lead({ id: 12 })} selected={false} onSelect={onSelect} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: /ver detalhes/i }));
    expect(onOpen).toHaveBeenCalledWith(12);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('marca o card selecionado', () => {
    const { container } = render(
      <LeadCard lead={lead()} selected onSelect={noop} onOpen={noop} />,
    );
    expect(container.querySelector('[aria-current="true"]')).not.toBeNull();
  });
});

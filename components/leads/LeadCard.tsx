'use client';

import type { Lead } from '@/lib/db/schema';
import { extractHost } from '@/lib/classify/temperature';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';

/** Duas letras a partir das palavras do nome, como no mockup. */
export function initials(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  const [first, second] = words;
  if (!first) return '—';
  if (!second) return first.slice(0, 2).toUpperCase();
  return (first[0]! + second[0]!).toUpperCase();
}

/**
 * Por que este é um lead, em duas palavras. O quente não tem site; o morno
 * mostra ONDE está — saber que é só Instagram muda a abordagem.
 */
export function leadReason(lead: Lead): string {
  if (lead.temperature === 'quente') return 'Sem site';
  const host = extractHost(lead.websiteUri);
  if (lead.temperature === 'frio') return 'Tem site';
  if (!host) return 'Só rede social';
  const marca = host.replace(/^www\./, '').split('.')[0];
  return 'Só ' + marca.charAt(0).toUpperCase() + marca.slice(1);
}

/** Bairro e cidade, sem o CEP e o número da rua. */
export function shortAddress(address: string | null): string {
  if (!address) return 'Sem endereço';
  const parts = address.split(' - ');
  return parts.length >= 2 ? parts.slice(1, 3).join(' · ') : address;
}

interface Props {
  lead: Lead;
  selected: boolean;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
}

export function LeadCard({ lead, selected, onSelect, onOpen }: Props) {
  return (
    <article
      className="lead-card"
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(lead.id)}
    >
      <div className="lead-card-top">
        <span className="lead-initials" aria-hidden="true">{initials(lead.name)}</span>
        <TemperatureBadge temperature={lead.temperature} />
      </div>

      <h3>{lead.name}</h3>
      <p className="lead-card-place">{shortAddress(lead.formattedAddress)}</p>

      <div className="lead-tags">
        <span>{lead.primaryTypeDisplay ?? 'Sem tipo'}</span>
        <span>{lead.userRatingCount ?? 0} aval.</span>
        {lead.rating != null && <span>{lead.rating}</span>}
      </div>

      <footer>
        <span className="mono">{leadReason(lead)}</span>
        <button
          type="button"
          className="lead-card-open"
          onClick={(event) => { event.stopPropagation(); onOpen(lead.id); }}
        >
          Ver detalhes →
        </button>
      </footer>
    </article>
  );
}

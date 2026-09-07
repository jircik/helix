'use client';

import type { Lead } from '@/lib/db/schema';
import { Icon } from '@/components/ui/Icon';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';

interface Props {
  rows: Lead[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function LeadTable({ rows, selectedId, onSelect }: Props) {
  if (rows.length === 0) {
    return <p className="empty">Nenhum lead com esses filtros.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Empresa</th>
          <th>Tipo</th>
          <th>Telefone</th>
          <th>Avaliações</th>
          <th>Temperatura</th>
          <th><span className="sr-only">Detalhes</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            aria-selected={row.id === selectedId}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(row.id); }
            }}
            onClick={() => onSelect(row.id)}
          >
            <td>
              <strong>{row.name}</strong>
              <br />
              <small style={{ color: 'var(--muted)' }}>
                {row.formattedAddress ?? '—'}
              </small>
            </td>
            <td>{row.primaryTypeDisplay ?? '—'}</td>
            <td>{row.phone ?? '—'}</td>
            <td>{row.userRatingCount ?? 0}</td>
            <td><TemperatureBadge temperature={row.temperature} /></td>
            <td className="row-action-cell">
              <button
                type="button"
                className="row-action"
                aria-label={'Ver detalhes de ' + row.name}
                title="Ver detalhes"
                onClick={(event) => { event.stopPropagation(); onSelect(row.id); }}
              >
                <Icon name="search" width={16} height={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

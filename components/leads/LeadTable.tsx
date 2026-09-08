'use client';

import type { Lead } from '@/lib/db/schema';
import { Icon } from '@/components/ui/Icon';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';

interface Props {
  rows: Lead[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Ids marcados na coluna de seleção — vem de fora porque a barra de ações também os usa. */
  checked: number[];
  onCheck: (id: number, checked: boolean) => void;
  onCheckAll: (checked: boolean) => void;
  onDelete: (lead: Lead) => void;
}

export function LeadTable({ rows, selectedId, onSelect, checked, onCheck, onCheckAll, onDelete }: Props) {
  if (rows.length === 0) {
    return <p className="empty">Nenhum lead com esses filtros.</p>;
  }

  const marcados = new Set(checked);
  const naPagina = rows.filter((row) => marcados.has(row.id)).length;
  const todos = naPagina === rows.length;

  return (
    <table>
      <thead>
        <tr>
          <th className="select-cell">
            <input
              type="checkbox"
              aria-label="Selecionar todos os leads da página"
              checked={todos}
              // Parcial vira traço: sem isso o cabeçalho mente sobre o que está marcado.
              ref={(el) => { if (el) el.indeterminate = naPagina > 0 && !todos; }}
              onChange={(event) => onCheckAll(event.target.checked)}
            />
          </th>
          <th>Empresa</th>
          <th>Tipo</th>
          <th>Telefone</th>
          <th>Avaliações</th>
          <th>Temperatura</th>
          <th><span className="sr-only">Ações</span></th>
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
            {/* A célula inteira absorve o clique: marcar não pode abrir o detalhe. */}
            <td className="select-cell" onClick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                aria-label={'Selecionar ' + row.name}
                checked={marcados.has(row.id)}
                onChange={(event) => onCheck(row.id, event.target.checked)}
              />
            </td>
            <td>
              <strong>{row.name}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>
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
              <button
                type="button"
                className="row-action row-action-danger"
                aria-label={'Apagar ' + row.name}
                title="Apagar lead"
                onClick={(event) => { event.stopPropagation(); onDelete(row); }}
              >
                <Icon name="trash" width={16} height={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

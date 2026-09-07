'use client';

import { useEffect, useRef } from 'react';
import type { Lead } from '@/lib/db/schema';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';

interface Props {
  rows: Lead[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ResultsDrawer({ rows, selectedId, onSelect }: Props) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  // Clicar no pin rola o drawer até o card correspondente.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <aside className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="panel-head">
        <span className="mono">
          {rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {rows.length === 0 ? (
          <p className="empty">Nenhum resultado. Rode uma busca.</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.id}
              ref={row.id === selectedId ? selectedRef : undefined}
              aria-pressed={row.id === selectedId}
              onClick={() => onSelect(row.id)}
              style={{
                width: '100%', padding: 16, textAlign: 'left', border: 0,
                borderBottom: '1px solid var(--line)',
                background: row.id === selectedId ? 'var(--soft)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{row.name}</strong>
                <TemperatureBadge temperature={row.temperature} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                {row.formattedAddress ?? 'Sem endereço'}
              </div>
              <div className="mono" style={{ marginTop: 6 }}>
                {row.primaryTypeDisplay ?? 'Sem tipo'} · {row.userRatingCount ?? 0} avaliações
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

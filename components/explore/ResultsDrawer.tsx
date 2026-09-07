'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { Lead } from '@/lib/db/schema';
import { LeadCard } from '@/components/leads/LeadCard';

interface Props {
  rows: Lead[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onOpen: (id: number) => void;
  /** Botão de filtros, montado por quem usa o drawer. */
  toolbar?: ReactNode;
  emptyMessage?: string;
}

export function ResultsDrawer({
  rows, selectedId, onSelect, onOpen, toolbar,
  emptyMessage = 'Nenhum resultado. Rode uma busca ou troque os filtros.',
}: Props) {
  const selectedRef = useRef<HTMLDivElement | null>(null);

  // Clicar no pin rola o drawer até o card correspondente.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <aside className="panel results-drawer" aria-label="Resultados">
      <div className="panel-head">
        <span className="mono">
          {rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}
        </span>
        {toolbar}
      </div>
      <div className="results-scroll">
        {rows.length === 0 ? (
          <p className="empty">{emptyMessage}</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} ref={row.id === selectedId ? selectedRef : undefined}>
              <LeadCard
                lead={row}
                selected={row.id === selectedId}
                onSelect={onSelect}
                onOpen={onOpen}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

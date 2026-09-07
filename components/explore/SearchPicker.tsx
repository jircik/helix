'use client';

import type { Search } from '@/lib/db/schema';
import { Select } from '@/components/ui/Select';

export const TODA_A_BASE = '';

function label(search: Search): string {
  const quando = new Date(search.executedAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
  });
  const contagem = search.error ? 'falhou' : `${search.rawCount} leads`;
  return `${search.textQuery} · ${contagem} · ${quando}`;
}

interface Props {
  searches: Search[];
  value: string;
  onChange: (value: string) => void;
}

export function SearchPicker({ searches, value, onChange }: Props) {
  return (
    <label className="field search-picker">
      <span className="mono">Busca</span>
      <Select
        aria-label="Busca"
        value={value}
        onValueChange={onChange}
        options={[
          { value: TODA_A_BASE, label: 'Toda a base' },
          ...searches.map((search) => ({ value: String(search.id), label: label(search) })),
        ]}
      />
    </label>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { Lead } from '@/lib/db/schema';

export interface LatLng {
  lat: number;
  lng: number;
}

export const SAO_PAULO: LatLng = { lat: -23.5505, lng: -46.6333 };

export function useSelection(rows: Lead[]) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  if (selectedId !== null && !rows.some((row) => row.id === selectedId)) setSelectedId(null);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const center = useMemo<LatLng>(() => {
    if (selected?.lat != null && selected.lng != null) {
      return { lat: selected.lat, lng: selected.lng };
    }
    const comCoordenada = rows.filter(
      (row): row is Lead & { lat: number; lng: number } =>
        row.lat != null && row.lng != null,
    );
    if (comCoordenada.length === 0) return SAO_PAULO;

    const soma = comCoordenada.reduce(
      (acc, row) => ({ lat: acc.lat + row.lat, lng: acc.lng + row.lng }),
      { lat: 0, lng: 0 },
    );
    return {
      lat: soma.lat / comCoordenada.length,
      lng: soma.lng / comCoordenada.length,
    };
  }, [rows, selected]);

  return { selectedId, select: setSelectedId, selected, center };
}

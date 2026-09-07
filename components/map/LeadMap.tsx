'use client';

import { AdvancedMarker, APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import type { Lead } from '@/lib/db/schema';
import type { LatLng } from '@/components/explore/useSelection';

const COLORS: Record<Lead['temperature'], string> = {
  quente: '#b4381f',
  morno: '#7a5b1f',
  frio: '#737373',
};

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map?.panTo(center);
  }, [map, center]);
  return null;
}

interface Props {
  rows: Lead[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  center: LatLng;
  zoom?: number;
}

export function LeadMap({ rows, selectedId, onSelect, center, zoom = 14 }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const [error, setError] = useState(false);

  if (!apiKey) {
    return (
      <div className="empty">
        Defina NEXT_PUBLIC_GOOGLE_MAPS_KEY no .env para carregar o mapa.
      </div>
    );
  }
  if (error) return <div role="alert" className="empty">Não foi possível carregar o mapa. Confira a chave do Google Maps e sua conexão.</div>;

  const comCoordenada = rows.filter(
    (row): row is Lead & { lat: number; lng: number } =>
      row.lat != null && row.lng != null,
  );

  return (
    <APIProvider apiKey={apiKey} language="pt-BR" region="BR" onError={() => setError(true)}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'}
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
      >
        <Recenter center={center} />
        {comCoordenada.map((row) => (
          <AdvancedMarker
            key={row.id}
            position={{ lat: row.lat, lng: row.lng }}
            onClick={() => onSelect(row.id)}
            title={row.name}
          >
            <span
              style={{
                display: 'block',
                width: row.id === selectedId ? 20 : 13,
                height: row.id === selectedId ? 20 : 13,
                background: COLORS[row.temperature],
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,.4)',
              }}
            />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}

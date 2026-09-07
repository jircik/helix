'use client';

import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import type { Lead } from '@/lib/db/schema';
import { HELIX_MAP_STYLE } from '@/config/map-style';
import type { LatLng } from '@/components/explore/useSelection';

const COLORS: Record<Lead['temperature'], string> = {
  quente: '#b4381f',
  morno: '#7a5b1f',
  frio: '#737373',
};

/** Quadrado centrado na origem — o mesmo canto reto do resto da interface. */
const PIN_PATH = 'M -5 -5 H 5 V 5 H -5 Z';

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
  if (error) {
    return (
      <div role="alert" className="empty">
        Não foi possível carregar o mapa. Confira a chave do Google Maps e sua conexão.
      </div>
    );
  }

  const comCoordenada = rows.filter(
    (row): row is Lead & { lat: number; lng: number } =>
      row.lat != null && row.lng != null,
  );

  return (
    <APIProvider apiKey={apiKey} language="pt-BR" region="BR" onError={() => setError(true)}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        styles={HELIX_MAP_STYLE}
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        clickableIcons={false}
        style={{ width: '100%', height: '100%' }}
      >
        <Recenter center={center} />
        {comCoordenada.map((row) => (
          <Marker
            key={row.id}
            position={{ lat: row.lat, lng: row.lng }}
            onClick={() => onSelect(row.id)}
            title={row.name}
            zIndex={row.id === selectedId ? 2 : 1}
            icon={{
              path: PIN_PATH,
              fillColor: COLORS[row.temperature],
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: row.id === selectedId ? 1.7 : 1.1,
            }}
          />
        ))}
      </Map>
    </APIProvider>
  );
}

/**
 * Estilo do mapa nas cores do Helix — preto sobre off-white.
 *
 * As cores espelham os tokens de `app/globals.css`:
 *   --paper #fbfbf9 · --soft #f6f6f3 · --line #e6e6e2 · --muted #737373
 *
 * Este array só tem efeito quando o mapa NÃO recebe `mapId`: com um Map ID
 * o Google ignora o estilo inline e usa o estilo da nuvem amarrado a ele.
 * Se um dia você criar um Map ID com estilo próprio no Console, remova o
 * `styles` do LeadMap e volte a passar o `mapId`.
 *
 * Edite à vontade — é configuração, não regra de negócio.
 */
export const HELIX_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // base
  { elementType: 'geometry', stylers: [{ color: '#f4f4f0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a84' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fbfbf9' }, { weight: 3 }] },

  // ícones de ponto de interesse poluem — os pins do lead têm que dominar
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // limites administrativos e bairros
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#dedeD7' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#73736d' }] },

  // terreno
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f0f0ec' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eeeee9' }] },

  // vias — brancas com contorno fino, como as bordas de 1px do app
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6e6e2' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9a9a94' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ebebe6' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d8d8d1' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#6f6f6a' }] },

  // água — o tom mais escuro do mapa, para o rio ainda se ler
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dededa' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#a5a59f' }] },
];

/**
 * Mesma estrutura do estilo claro, com os papéis invertidos: o terreno vira
 * quase preto, as vias ganham um cinza que ainda se lê, e os rótulos clareiam
 * o suficiente para contrastar sem competir com os pins.
 */
export const HELIX_MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#171715' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a82' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0b0a' }, { weight: 3 }] },

  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2f2f2b' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#9c9c93' }] },

  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#1b1b19' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#191917' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c28' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#232320' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7d7d75' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a34' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a26' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#9c9c93' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5f5f59' }] },
];

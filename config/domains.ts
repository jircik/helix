/**
 * Domínios que indicam presença digital SEM site próprio.
 * Um negócio listado aqui é lead morno: tem canal, não tem site.
 * Edite à vontade — é configuração, não regra de negócio.
 */
export const DOMAIN_GROUPS = {
  social: [
    'instagram.com', 'facebook.com', 'fb.com', 'fb.me',
    'linktr.ee', 'beacons.ai', 'bio.link', 'linkin.bio',
    'wa.me', 'api.whatsapp.com',
    'tiktok.com', 'linkedin.com', 'youtube.com',
    'business.site', 'negocio.site',
  ],
  marketplace: [
    'ifood.com.br', 'rappi.com.br', '99food.com.br',
    'doctoralia.com.br', 'booksy.com', 'trinks.com',
    'agendei.com.br', 'zenklub.com.br', 'getninjas.com.br',
  ],
} as const;

export type DomainGroups = { social: readonly string[]; marketplace: readonly string[] };

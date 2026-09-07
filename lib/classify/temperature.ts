import { DOMAIN_GROUPS, type DomainGroups } from '@/config/domains';
import type { Temperature } from '@/lib/db/schema';

export function extractHost(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (trimmed === '') return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let host: string;
  try {
    host = new URL(withProtocol).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host.includes('.')) return null;
  return host.replace(/^www\./, '');
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * quente = sem site       → alvo da prospecção
 * morno  = social/marketplace → tem canal, não tem site
 * frio   = site próprio   → insumo da auditoria da v2
 */
export function classify(
  websiteUri: string | null | undefined,
  groups: DomainGroups = DOMAIN_GROUPS,
): Temperature {
  const host = extractHost(websiteUri);
  if (host === null) return 'quente';

  const known = [...groups.social, ...groups.marketplace];
  if (known.some((domain) => matchesDomain(host, domain))) return 'morno';

  return 'frio';
}

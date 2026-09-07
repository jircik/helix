import type { Lead } from '@/lib/db/schema';

export const CSV_HEADER = [
  'nome', 'tipo', 'endereco', 'telefone', 'site', 'temperatura',
  'avaliacao', 'qtd_avaliacoes', 'situacao', 'verificacao', 'motivo_descarte',
  'contato', 'email', 'instagram', 'whatsapp', 'proxima_acao', 'quando',
  'notas', 'google_maps', 'capturado_em',
] as const;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let content = String(value);
  if (typeof value === 'string' && (/^[\t\r\n]/.test(content) || /^\s*[=+@-]/.test(content))) content = "'" + content;
  return `"${content.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Lead[]): string {
  const header = CSV_HEADER.map((h) => `"${h}"`).join(',');

  const lines = rows.map((row) => [
    row.name, row.primaryTypeDisplay, row.formattedAddress, row.phone,
    row.websiteUri, row.temperature, row.rating, row.userRatingCount,
    row.businessStatus, row.verification, row.disqualifyReason,
    row.contactName, row.email, row.instagram, row.whatsapp,
    row.nextAction, row.nextActionAt, row.notes, row.googleMapsUri,
    row.capturedAt,
  ].map(cell).join(','));

  return [header, ...lines].join('\n');
}

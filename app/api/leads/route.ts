import { getDb } from '@/lib/db/client';
import { authed } from '@/lib/api/respond';
import { leadListInputFromParams } from '@/lib/api/params';
import { deleteLeads, listLeads } from '@/lib/repo/leads';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return authed(request, (userId) =>
    listLeads(getDb(), userId, leadListInputFromParams(new URL(request.url).searchParams)));
}

/**
 * Apaga o recorte descrito na query — os mesmos filtros da listagem, mais um
 * `ids` opcional para a seleção manual.
 *
 * `all=1` é obrigatório quando não vem `ids`: apagar tudo que o filtro pega é
 * uma escolha explícita da tela, nunca o efeito de uma query malformada.
 */
export async function DELETE(request: Request) {
  return authed(request, (userId) => {
    const params = new URL(request.url).searchParams;
    if (!params.has('ids') && params.get('all') !== '1') throw new Error('Informe quais leads apagar.');
    return { deleted: deleteLeads(getDb(), userId, leadListInputFromParams(params)) };
  });
}

'use client';

import Link from 'next/link';
import { useSampleState } from './useSampleState';
import { ROUTES } from '@/lib/routes';

/** Mostrado quando a conta ainda não tem nenhum lead. */
export function EmptyWorkspace() {
  const { busy, erro, generate } = useSampleState(false);
  return (
    <section className="panel empty-workspace">
      <span className="mono">Comece por aqui</span>
      <h2>Sua base ainda está vazia</h2>
      <p>Busque estabelecimentos reais no Google ou gere dados de exemplo para ver o Helix funcionando. Os exemplos não usam a API e podem ser removidos quando quiser.</p>
      <div className="empty-workspace-actions">
        <Link className="btn" href={ROUTES.explore}>Buscar no Google</Link>
        <button type="button" className="btn btn-outline" onClick={generate} disabled={busy}>Gerar dados de exemplo</button>
      </div>
      {erro && <p role="alert" className="error">{erro}</p>}
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Lead, Search, Temperature } from '@/lib/db/schema';
import { apiGet } from '@/lib/api/client';
import { EmptyWorkspace } from '@/components/samples/EmptyWorkspace';
import { ROUTES } from '@/lib/routes';

interface Overview {
  porTemperatura: Record<Temperature, number>;
  pendentes: number;
  proximasAcoes: Lead[];
  ultimasBuscas: Search[];
}

function Metric({ label, value, primary = false }: { label: string; value: number; primary?: boolean }) {
  return (
    <article className={primary ? 'panel metric metric-primary' : 'panel metric'} style={{ padding: 20 }}>
      <span className="mono">{label}</span>
      <strong style={{ display: 'block', marginTop: 10, fontSize: 32, fontWeight: 500 }}>
        {value}
      </strong>
    </article>
  );
}

export function OverviewView() {
  const [data, setData] = useState<Overview | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Overview>('/api/overview').then(setData).catch((e) =>
      setErro(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  if (erro) return <div className="view"><p className="error">{erro}</p></div>;
  if (!data) return <div className="view"><p className="empty">Carregando…</p></div>;

  const t = data.porTemperatura;
  if (t.quente + t.morno + t.frio === 0) return <div className="view"><EmptyWorkspace /></div>;

  return (
    <div className="view">
      <span className="mono">Prospecção</span>
      <h1>Helix</h1>
      <p className="page-description">Encontre oportunidades perto de você. Verifique os leads e acompanhe cada próximo passo.</p>

      <div style={{
        marginTop: 24, display: 'grid', gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      }}>
        <Metric primary label="Quentes — sem site" value={data.porTemperatura.quente} />
        <Metric label="Mornos — só social" value={data.porTemperatura.morno} />
        <Metric label="Frios — têm site" value={data.porTemperatura.frio} />
        <Metric label="A verificar" value={data.pendentes} />
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <h2 style={{ margin: 0, fontSize: 13 }}>Próximas ações vencendo</h2>
          <Link className="mono" href="/leads">Ver leads</Link>
        </div>
        {data.proximasAcoes.length === 0 ? (
          <p className="empty">Nenhuma ação vencida.</p>
        ) : (
          <div className="table-scroll"><table>
            <thead>
              <tr><th>Empresa</th><th>Ação</th><th>Quando</th></tr>
            </thead>
            <tbody>
              {data.proximasAcoes.map((lead) => (
                <tr key={lead.id}>
                  <td><Link href={'/leads?leadId=' + lead.id}>{lead.name}</Link></td>
                  <td>{lead.nextAction ?? '—'}</td>
                  <td>{lead.nextActionAt ? new Date(lead.nextActionAt).toLocaleDateString('pt-BR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <h2 style={{ margin: 0, fontSize: 13 }}>Últimas buscas</h2>
          <Link className="mono" href={ROUTES.explore}>Nova busca</Link>
        </div>
        {data.ultimasBuscas.length === 0 ? (
          <p className="empty">Nenhuma busca ainda.</p>
        ) : (
          <div className="table-scroll"><table>
            <thead>
              <tr>
                <th>Busca</th><th>Brutos</th><th>Inéditos</th><th>Novos / chamada</th>
                <th>Chamadas</th><th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimasBuscas.map((s) => (
                <tr key={s.id}>
                  <td>{s.textQuery}{s.error && <> — <span style={{ color: 'var(--quente)' }}>falhou</span></>}</td>
                  <td>{s.rawCount}</td>
                  <td>{s.newCount}</td>
                  <td>{s.apiRequests ? (s.newCount / s.apiRequests).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}</td>
                  <td>{s.apiRequests}</td>
                  <td>{new Date(s.executedAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <p style={{ marginTop: 24 }}>
        <a className="btn btn-outline" download href="/api/leads/export">Exportar CSV dos quentes</a>
      </p>
    </div>
  );
}

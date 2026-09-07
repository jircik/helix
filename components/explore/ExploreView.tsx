'use client';

import { useState } from 'react';
import type { Lead } from '@/lib/db/schema';
import type { RunSearchInput, RunSearchResult } from '@/lib/services/run-search';
import { apiGet, apiSend } from '@/lib/api/client';
import { SearchForm } from './SearchForm';
import { ResultsDrawer } from './ResultsDrawer';
import { LeadMap } from '@/components/map/LeadMap';
import { useSelection } from './useSelection';

export function ExploreView() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [resumo, setResumo] = useState<RunSearchResult | null>(null);
  const [running, setRunning] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { selectedId, select, center } = useSelection(rows);

  async function buscar(input: RunSearchInput) {
    setRunning(true);
    setErro(null);
    setResumo(null);
    try {
      const out = await apiSend<RunSearchResult>('/api/searches', 'POST', input);
      setResumo(out);

      if (out.leadIds.length === 0) {
        setRows([]);
        return;
      }
      const lista = await apiGet<{ rows: Lead[] }>(
        `/api/leads?ids=${out.leadIds.join(',')}&temperatures=quente,morno,frio&verifications=pendente,qualificado,descartado&limit=60`,
      );
      setRows(lista.rows.filter((row) => out.leadIds.includes(row.id)));
    } catch (e) {
      setRows([]);
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="view">
      <div className="page-heading"><div><span className="mono">Prospecção geográfica</span><h1>Explorar</h1></div>
        <SearchForm onSearch={buscar} running={running} />
      </div>
      <p className="page-description">Encontre seu próximo cliente. Defina o perfil da busca e explore as oportunidades no mapa.</p>

      {erro && <p className="error" style={{ marginTop: 16 }}>{erro}</p>}

      <div style={{ marginTop: 24, display: 'grid', gap: 24 }}>
        {resumo && (
          <p className="mono">
            {resumo.rawCount} brutos · {resumo.newCount} inéditos ·{' '}
            {resumo.leadIds.length} após filtro · {resumo.apiRequests} chamadas ·{' '}
            {resumo.pagesFetched} páginas
          </p>
        )}

        <div className="explore-grid">
          <ResultsDrawer rows={rows} selectedId={selectedId} onSelect={select} />
          <div className="panel" style={{ overflow: 'hidden' }}>
            <LeadMap rows={rows} selectedId={selectedId} onSelect={select} center={center} />
          </div>
        </div>
      </div>
    </div>
  );
}

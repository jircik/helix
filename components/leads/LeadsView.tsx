'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Lead, Stage, Temperature } from '@/lib/db/schema';
import { apiGet } from '@/lib/api/client';
import { LeadTable } from './LeadTable';
import { LeadModal } from './LeadModal';
import { useLeadDetail } from './useLeadDetail';
import { LeadFilters } from './LeadFilters';

export function LeadsView({ initialLeadId = null }: { initialLeadId?: number | null }) {
  const [temperatures, setTemperatures] = useState<Temperature[]>(['quente']);
  const [incluirDescartados, setIncluirDescartados] = useState(false);
  const [busca, setBusca] = useState('');
  const [stageId, setStageId] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stages, setStages] = useState<Stage[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loadedQuery, setLoadedQuery] = useState('');
  const params = new URLSearchParams({
    temperatures: temperatures.join(','),
    verifications: incluirDescartados ? 'pendente,qualificado,descartado' : 'pendente,qualificado',
    limit: '50', offset: String(offset),
  });
  if (busca.trim()) params.set('search', busca.trim());
  if (stageId) params.set('stageId', stageId);
  const query = params.toString();
  const requestKey = query + ':' + revision;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      apiGet<{ rows: Lead[]; total: number }>('/api/leads?' + query).then((out) => {
        if (!active) return;
        setRows(out.rows); setTotal(out.total); setErro(null); setLoadedQuery(requestKey);
      }).catch((e: Error) => { if (active) { setErro(e.message); setLoadedQuery(requestKey); } });
    }, 120);
    return () => { active = false; clearTimeout(timer); };
  }, [query, requestKey]);

  useEffect(() => {
    let active = true;
    apiGet<Stage[]>('/api/stages').then((out) => { if (active) setStages(out); })
      .catch((e: Error) => { if (active) setErro(e.message); });
    return () => { active = false; };
  }, []);

  const detalhe = useLeadDetail(useCallback(() => {
    setRevision((value) => value + 1);
  }, []), initialLeadId);
  const selectedId = detalhe.openId;
  function changeFilters(action: () => void) { action(); setOffset(0); }
  const loading = loadedQuery !== requestKey;

  return (
    <div className="view">
      <div className="page-heading"><div><span className="mono">Base comercial</span><h1>Leads</h1></div>
        <a className="btn btn-outline" href={'/api/leads/export?' + query}>Exportar CSV</a>
      </div>
      {(erro || detalhe.erro) && <p role="alert" className="error">{erro ?? detalhe.erro}</p>}
      <LeadFilters temperatures={temperatures} incluirDescartados={incluirDescartados}
        busca={busca} stageId={stageId} stages={stages}
        onTemperatures={(value) => changeFilters(() => setTemperatures(value))}
        onDescartados={(value) => changeFilters(() => setIncluirDescartados(value))}
        onBusca={(value) => changeFilters(() => setBusca(value))}
        onStage={(value) => changeFilters(() => setStageId(value))} />
      <div className="leads-layout">
        <div>
          <div className="panel table-scroll" aria-busy={loading}>
            {loading ? <p className="empty">Carregando leads…</p> :
              <LeadTable rows={rows} selectedId={selectedId} onSelect={detalhe.open} />}
          </div>
          <div className="pagination">
            <span className="mono">{total} leads · página {Math.floor(offset / 50) + 1}</span>
            <button className="btn btn-outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 50))}>Anterior</button>
            <button className="btn btn-outline" disabled={offset + 50 >= total || loading} onClick={() => setOffset(offset + 50)}>Próxima</button>
          </div>
        </div>
      </div>
      {detalhe.openId !== null && detalhe.detail && (
        <LeadModal
          key={detalhe.detail.lead.id + ':' + detalhe.detail.lead.updatedAt}
          lead={detalhe.detail.lead}
          activities={detalhe.detail.activities}
          stages={stages}
          onPatch={detalhe.patch}
          onMoveStage={detalhe.moveStage}
          onAddActivity={detalhe.addActivity}
          onClose={detalhe.close}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { Activity, ActivityKind, Lead, Stage, Temperature } from '@/lib/db/schema';
import type { UserBlockPatch } from '@/lib/repo/leads';
import { apiGet, apiSend } from '@/lib/api/client';
import { LeadTable } from './LeadTable';
import { LeadDetail } from './LeadDetail';
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
  const [selectedId, setSelectedId] = useState<number | null>(initialLeadId);
  const [detail, setDetail] = useState<{ lead: Lead; activities: Activity[] } | null>(null);
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

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    apiGet<{ lead: Lead; activities: Activity[] }>('/api/leads/' + selectedId)
      .then((out) => { if (active) setDetail(out); })
      .catch((e: Error) => { if (active) setErro(e.message); });
    return () => { active = false; };
  }, [selectedId, revision]);

  async function patch(body: UserBlockPatch) {
    if (selectedId === null) return;
    await apiSend('/api/leads/' + selectedId, 'PATCH', body);
    setRevision((value) => value + 1);
  }
  async function addActivity(input: { kind: ActivityKind; body: string }) {
    if (selectedId === null) return;
    await apiSend('/api/leads/' + selectedId + '/activities', 'POST', input);
    setRevision((value) => value + 1);
  }
  function changeFilters(action: () => void) { action(); setOffset(0); }
  const shownDetail = detail?.lead.id === selectedId ? detail : null;
  const loading = loadedQuery !== requestKey;

  return (
    <div className="view">
      <div className="page-heading"><div><span className="mono">Base comercial</span><h1>Leads</h1></div>
        <a className="btn btn-outline" href={'/api/leads/export?' + query}>Exportar CSV</a>
      </div>
      {erro && <p role="alert" className="error">{erro}</p>}
      <LeadFilters temperatures={temperatures} incluirDescartados={incluirDescartados}
        busca={busca} stageId={stageId} stages={stages}
        onTemperatures={(value) => changeFilters(() => setTemperatures(value))}
        onDescartados={(value) => changeFilters(() => setIncluirDescartados(value))}
        onBusca={(value) => changeFilters(() => setBusca(value))}
        onStage={(value) => changeFilters(() => setStageId(value))} />
      <div className={selectedId !== null ? 'leads-layout with-detail' : 'leads-layout'}>
        <div>
          <div className="panel table-scroll" aria-busy={loading}>
            {loading ? <p className="empty">Carregando leads…</p> :
              <LeadTable rows={rows} selectedId={selectedId} onSelect={setSelectedId} />}
          </div>
          <div className="pagination">
            <span className="mono">{total} leads · página {Math.floor(offset / 50) + 1}</span>
            <button className="btn btn-outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 50))}>Anterior</button>
            <button className="btn btn-outline" disabled={offset + 50 >= total || loading} onClick={() => setOffset(offset + 50)}>Próxima</button>
          </div>
        </div>
        {selectedId !== null && <aside aria-label="Detalhes do lead">
          <button className="btn btn-outline" style={{ marginBottom: 16 }} onClick={() => setSelectedId(null)}>Fechar</button>
          {shownDetail ? <LeadDetail key={shownDetail.lead.id + ':' + shownDetail.lead.updatedAt} lead={shownDetail.lead}
            activities={shownDetail.activities} stages={stages} onPatch={patch} onAddActivity={addActivity} />
            : <p className="empty">Carregando detalhes…</p>}
        </aside>}
      </div>
    </div>
  );
}

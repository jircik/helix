'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Activity, ActivityKind, Lead, Search, Stage } from '@/lib/db/schema';
import type { UserBlockPatch } from '@/lib/repo/leads';
import type { RunSearchInput, RunSearchResult } from '@/lib/services/run-search';
import { apiGet, apiSend } from '@/lib/api/client';
import { FilterButton, FILTROS_PADRAO, describeFilters, type FilterValues } from '@/components/leads/FilterDialog';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadModal } from '@/components/leads/LeadModal';
import { LeadMap } from '@/components/map/LeadMap';
import { ResultsDrawer } from './ResultsDrawer';
import { SearchForm } from './SearchForm';
import { SearchPicker, TODA_A_BASE } from './SearchPicker';
import { useSelection } from './useSelection';

type Mode = 'mapa' | 'lista';

const LIMIT = 200;

export function ExploreView() {
  const [mode, setMode] = useState<Mode>('mapa');
  const [searches, setSearches] = useState<Search[]>([]);
  const [searchId, setSearchId] = useState<string>(TODA_A_BASE);
  const [pickerReady, setPickerReady] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(FILTROS_PADRAO);
  const [stages, setStages] = useState<Stage[]>([]);

  const [rows, setRows] = useState<Lead[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [resumo, setResumo] = useState<RunSearchResult | null>(null);
  const [running, setRunning] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ lead: Lead; activities: Activity[] } | null>(null);
  const [revision, setRevision] = useState(0);

  const { selectedId, select, center } = useSelection(rows);

  // Abre na última busca; sem nenhuma, mostra toda a base.
  useEffect(() => {
    let active = true;
    Promise.all([apiGet<Search[]>('/api/searches'), apiGet<Stage[]>('/api/stages')])
      .then(([listaBuscas, listaEtapas]) => {
        if (!active) return;
        setSearches(listaBuscas);
        setStages(listaEtapas);
        const ultima = listaBuscas.find((search) => !search.error);
        setSearchId(ultima ? String(ultima.id) : TODA_A_BASE);
        setPickerReady(true);
      })
      .catch((e: Error) => { if (active) { setErro(e.message); setPickerReady(true); } });
    return () => { active = false; };
  }, []);

  const params = new URLSearchParams({
    temperatures: filters.temperatures.join(','),
    verifications: filters.incluirDescartados
      ? 'pendente,qualificado,descartado'
      : 'pendente,qualificado',
    limit: String(LIMIT),
  });
  if (searchId) params.set('searchId', searchId);
  if (filters.stageId) params.set('stageId', filters.stageId);
  const query = params.toString();

  const requestKey = query + ':' + revision;

  useEffect(() => {
    if (!pickerReady) return;
    let active = true;
    apiGet<{ rows: Lead[] }>('/api/leads?' + query)
      .then((out) => { if (active) { setRows(out.rows); setErro(null); } })
      .catch((e: Error) => { if (active) { setRows([]); setErro(e.message); } })
      .finally(() => { if (active) setLoadedKey(requestKey); });
    return () => { active = false; };
  }, [query, requestKey, pickerReady]);

  const carregarDetalhe = useCallback(async (id: number) => {
    setDetail(await apiGet<{ lead: Lead; activities: Activity[] }>('/api/leads/' + id));
  }, []);

  useEffect(() => {
    if (openId === null) return;
    let active = true;
    apiGet<{ lead: Lead; activities: Activity[] }>('/api/leads/' + openId)
      .then((out) => { if (active) setDetail(out); })
      .catch((e: Error) => { if (active) setErro(e.message); });
    return () => { active = false; };
  }, [openId, revision]);

  async function buscar(input: RunSearchInput) {
    setRunning(true);
    setErro(null);
    setResumo(null);
    try {
      const out = await apiSend<RunSearchResult>('/api/searches', 'POST', input);
      setResumo(out);
      const listaBuscas = await apiGet<Search[]>('/api/searches');
      setSearches(listaBuscas);
      setSearchId(String(out.searchId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function patch(body: UserBlockPatch) {
    if (openId === null) return;
    await apiSend('/api/leads/' + openId, 'PATCH', body);
    setRevision((value) => value + 1);
  }
  async function moveStage(stageId: number) {
    if (openId === null) return;
    await apiSend('/api/leads/' + openId + '/stage', 'PUT', { stageId });
    setRevision((value) => value + 1);
  }
  async function addActivity(input: { kind: ActivityKind; body: string }) {
    if (openId === null) return;
    await apiSend('/api/leads/' + openId + '/activities', 'POST', input);
    await carregarDetalhe(openId);
  }

  const filterButton = <FilterButton values={filters} stages={stages} onApply={setFilters} />;
  const shownDetail = detail?.lead.id === openId ? detail : null;
  const loading = !pickerReady || loadedKey !== requestKey;
  const vazio = searchId
    ? 'Essa busca não devolveu nada com estes filtros.'
    : 'Nenhum lead na base com estes filtros.';

  return (
    <div className="view">
      <div className="page-heading">
        <div><span className="mono">Prospecção geográfica</span><h1>Explorar</h1></div>
        <div className="explore-actions">
          <div className="view-toggle" role="group" aria-label="Modo de visualização">
            <button
              type="button" className="tab" aria-pressed={mode === 'mapa'}
              onClick={() => setMode('mapa')}
            >Mapa</button>
            <button
              type="button" className="tab" aria-pressed={mode === 'lista'}
              onClick={() => setMode('lista')}
            >Lista</button>
          </div>
          <SearchForm onSearch={buscar} running={running} />
        </div>
      </div>
      <p className="page-description">
        Escolha uma busca para trabalhar aquele recorte, ou veja toda a base no mapa.
      </p>

      <div className="explore-bar">
        <SearchPicker searches={searches} value={searchId} onChange={setSearchId} />
        {mode === 'lista' && (
          <div className="explore-bar-filters">
            {filterButton}
            <span className="filter-summary">{describeFilters(filters, stages)}</span>
          </div>
        )}
      </div>

      {erro && <p role="alert" className="error">{erro}</p>}

      {resumo && (
        <p className="mono explore-summary">
          {resumo.rawCount} brutos · {resumo.newCount} inéditos ·{' '}
          {resumo.apiRequests} chamadas · {resumo.pagesFetched} páginas
        </p>
      )}

      {mode === 'mapa' ? (
        <div className="explore-grid" aria-busy={loading}>
          <ResultsDrawer
            rows={rows}
            selectedId={selectedId}
            onSelect={select}
            onOpen={setOpenId}
            toolbar={filterButton}
            emptyMessage={loading ? 'Carregando…' : vazio}
          />
          <div className="panel" style={{ overflow: 'hidden' }}>
            <LeadMap rows={rows} selectedId={selectedId} onSelect={select} center={center} />
          </div>
        </div>
      ) : (
        <div aria-busy={loading}>
          <p className="mono explore-count">
            {rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}
          </p>
          {rows.length === 0 ? (
            <p className="empty">{loading ? 'Carregando…' : vazio}</p>
          ) : (
            <div className="lead-card-grid">
              {rows.map((row) => (
                <LeadCard
                  key={row.id}
                  lead={row}
                  selected={row.id === selectedId}
                  onSelect={select}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {openId !== null && shownDetail && (
        <LeadModal
          key={shownDetail.lead.id + ':' + shownDetail.lead.updatedAt}
          lead={shownDetail.lead}
          activities={shownDetail.activities}
          stages={stages}
          onPatch={patch}
          onMoveStage={moveStage}
          onAddActivity={addActivity}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

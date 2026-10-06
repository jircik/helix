'use client';

import { useEffect, useState } from 'react';
import type { Temperature } from '@/lib/db/schema';
import type { RunSearchInput } from '@/lib/services/run-search';
import { apiGet } from '@/lib/api/client';
import { QUOTA_EXCEEDED_MESSAGE, type QuotaStatus } from '@/lib/quota-shared';
import { BUSINESS_TYPES } from '@/config/business-types';
import { useSampleState } from '@/components/samples/useSampleState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';

const TEMPERATURES: Temperature[] = ['quente', 'morno', 'frio'];
const DEFAULTS = {
  textQuery: '', includedType: '', minRating: '', maxPages: 3, temperatures: ['quente'] as Temperature[],
  requirePhone: false, excludeClosed: true, minReviews: '', maxReviews: '',
};
type Options = typeof DEFAULTS;

function SearchFilters({ value, onApply, onClose }: { value: Options; onApply: (value: Options) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  useEffect(() => {
    let active = true;
    apiGet<QuotaStatus>('/api/searches/quota').then((out) => { if (active) setQuota(out); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const samples = useSampleState(false);
  const semCota = quota?.remaining === 0;
  function set<K extends keyof Options>(key: K, value: Options[K]) { setDraft((prev) => ({ ...prev, [key]: value })); }
  return <Modal title="Nova prospecção" eyebrow="Encontre seu próximo cliente" onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (draft.textQuery.trim()) onApply({ ...draft, textQuery: draft.textQuery.trim() }); }}>
      <div className="modal-body">
        <section className="filter-section"><label className="field prospect-query"><span>O que você procura?</span>
          <input aria-label="O que buscar" required value={draft.textQuery} onChange={(event) => set('textQuery', event.target.value)} placeholder="Ex.: barbearias em Pinheiros, São Paulo" />
        </label><p>Combine o tipo de negócio com a cidade ou o bairro.</p></section>
        <section className="filter-section"><h3>Busca no Google</h3><p>Defina o perfil dos estabelecimentos e o alcance da consulta.</p>
          <label className="field"><span>Tipo de estabelecimento</span><Select aria-label="Tipo de estabelecimento" value={draft.includedType} onValueChange={(value) => set('includedType', value)}
            options={[{ value: '', label: 'Todos os tipos' }, ...BUSINESS_TYPES.map(([value, label]) => ({ value, label }))]} /></label>
          <div className="filter-grid">
            <label className="field"><span>Nota mínima</span><input type="number" step="0.5" min="0" max="5" value={draft.minRating} onChange={(e) => set('minRating', e.target.value)} placeholder="Qualquer nota" /></label>
            <label className="field"><span>Limite de resultados</span><Select aria-label="Limite de resultados" value={draft.maxPages} onValueChange={(value) => set('maxPages', Number(value))}
              options={[{ value: 1, label: 'Até 20 · 1 página' }, { value: 2, label: 'Até 40 · 2 páginas' }, { value: 3, label: 'Até 60 · 3 páginas' }]} /></label>
          </div>
        </section>
        <section className="filter-section"><h3>Resultados exibidos</h3><p>Todos os resultados recebidos são salvos na base. Estes filtros definem quais aparecem após a busca.</p>
          <fieldset className="checks"><legend>Temperatura</legend>{TEMPERATURES.map((temperature) => <label key={temperature}>
            <input type="checkbox" checked={draft.temperatures.includes(temperature)} onChange={() => set('temperatures', draft.temperatures.includes(temperature) ? draft.temperatures.filter((item) => item !== temperature) : [...draft.temperatures, temperature])} />{temperature}
          </label>)}</fieldset>
          <label className="check"><input type="checkbox" checked={draft.requirePhone} onChange={(e) => set('requirePhone', e.target.checked)} />Somente com telefone</label>
          <label className="check"><input type="checkbox" checked={draft.excludeClosed} onChange={(e) => set('excludeClosed', e.target.checked)} />Excluir estabelecimentos fechados</label>
          <div className="filter-grid">
            <label className="field"><span>Mínimo de avaliações</span><input type="number" min="0" value={draft.minReviews} onChange={(e) => set('minReviews', e.target.value)} placeholder="Sem mínimo" /></label>
            <label className="field"><span>Máximo de avaliações</span><input type="number" min={draft.minReviews || '0'} value={draft.maxReviews} onChange={(e) => set('maxReviews', e.target.value)} placeholder="Sem máximo" /></label>
          </div>
        </section>
        <p className="filter-note">Cada página consulta a API e pode gerar cobrança no Google. O Helix limita cada busca a três páginas.</p>
        {quota && (semCota
          ? <>
            <p role="alert" className="error">{QUOTA_EXCEEDED_MESSAGE}</p>
            <button type="button" className="btn btn-outline" disabled={samples.busy} onClick={samples.generate}>Gerar dados de exemplo</button>
            {samples.erro && <p role="alert" className="error">{samples.erro}</p>}
          </>
          : <p className="filter-note">Restam {quota.remaining} de {quota.limit} chamadas à API hoje.</p>)}
      </div>
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setDraft({ ...DEFAULTS, textQuery: draft.textQuery })}>Restaurar padrão</button>
        <span /><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn" disabled={!draft.textQuery.trim() || semCota}>Buscar estabelecimentos<Icon name="arrow" width="14" height="14" /></button></div>
    </form>
  </Modal>;
}

export function SearchForm({ onSearch, running }: { onSearch: (input: RunSearchInput) => void; running: boolean }) {
  const [options, setOptions] = useState<Options>(DEFAULTS);
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="btn prospect-master" aria-haspopup="dialog" onClick={() => setOpen(true)} disabled={running}>
      {running ? 'Buscando oportunidades…' : 'Fazer prospecção'}<Icon name="arrow" width="16" height="16" />
    </button>
    {open && <SearchFilters value={options} onClose={() => setOpen(false)} onApply={(value) => {
      if (running) return;
      setOptions(value); setOpen(false);
      onSearch({ textQuery: value.textQuery, includedType: value.includedType || null,
        minRating: value.minRating ? Number(value.minRating) : null, maxPages: value.maxPages,
        filters: { temperatures: value.temperatures, requirePhone: value.requirePhone, excludeClosed: value.excludeClosed,
          minReviews: value.minReviews ? Number(value.minReviews) : null, maxReviews: value.maxReviews ? Number(value.maxReviews) : null } });
    }} />}
  </>;
}

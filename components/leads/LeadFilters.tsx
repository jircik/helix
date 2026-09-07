'use client';
import { useState } from 'react';
import type { Stage, Temperature } from '@/lib/db/schema';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';

interface Props {
  temperatures: Temperature[]; incluirDescartados: boolean; busca: string; stageId: string; stages: Stage[];
  onTemperatures: (value: Temperature[]) => void; onDescartados: (value: boolean) => void;
  onBusca: (value: string) => void; onStage: (value: string) => void;
}
function FilterDialog({ props, onClose }: { props: Props; onClose: () => void }) {
  const [temperatures, setTemperatures] = useState(props.temperatures);
  const [discarded, setDiscarded] = useState(props.incluirDescartados);
  const [stageId, setStageId] = useState(props.stageId);
  return <Modal title="Filtros da base" onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); props.onTemperatures(temperatures); props.onDescartados(discarded); props.onStage(stageId); onClose(); }}>
      <div className="modal-body filter-section">
        <fieldset className="checks"><legend>Temperatura</legend>
          {(['quente', 'morno', 'frio'] as const).map((temperature) => <label key={temperature}>
            <input type="checkbox" checked={temperatures.includes(temperature)} onChange={() => setTemperatures(temperatures.includes(temperature) ? temperatures.filter((value) => value !== temperature) : [...temperatures, temperature])} />{temperature}
          </label>)}
        </fieldset>
        <label className="field"><span>Etapa do funil</span><Select aria-label="Etapa do funil" value={stageId} onValueChange={setStageId}
          options={[{ value: '', label: 'Todas as etapas' }, ...props.stages.map((stage) => ({ value: stage.id, label: stage.name }))]} /></label>
        <label className="check"><input type="checkbox" checked={discarded} onChange={(event) => setDiscarded(event.target.checked)} />Incluir descartados</label>
      </div>
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => { setTemperatures(['quente']); setDiscarded(false); setStageId(''); }}>Restaurar padrão</button>
        <span /><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn">Aplicar filtros</button></div>
    </form>
  </Modal>;
}
export function LeadFilters(props: Props) {
  const [open, setOpen] = useState(false);
  const summary = [props.temperatures.length ? props.temperatures.join(', ') : 'Todas as temperaturas',
    props.stages.find((stage) => String(stage.id) === props.stageId)?.name || 'todas as etapas',
    props.incluirDescartados ? 'incluindo descartados' : 'sem descartados'].join(' · ');
  return <>
    <div className="lead-search-bar"><div className="search-toolbar">
      <label className="field filter-search"><span className="mono">Buscar na base</span>
        <input placeholder="Nome, endereço ou nota…" value={props.busca} onChange={(event) => props.onBusca(event.target.value)} />
      </label>
      <button type="button" className="btn btn-outline" aria-haspopup="dialog" onClick={() => setOpen(true)}><Icon name="filter" width="14" height="14" />Filtros</button>
    </div><p className="filter-summary" aria-label="Filtros aplicados">{summary}</p></div>
    {open && <FilterDialog props={props} onClose={() => setOpen(false)} />}
  </>;
}

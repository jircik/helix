'use client';

import type { Stage, Temperature } from '@/lib/db/schema';
import { FilterButton, describeFilters, type FilterValues } from './FilterDialog';

interface Props {
  temperatures: Temperature[];
  incluirDescartados: boolean;
  busca: string;
  stageId: string;
  stages: Stage[];
  onTemperatures: (value: Temperature[]) => void;
  onDescartados: (value: boolean) => void;
  onBusca: (value: string) => void;
  onStage: (value: string) => void;
}

export function LeadFilters(props: Props) {
  const values: FilterValues = {
    temperatures: props.temperatures,
    incluirDescartados: props.incluirDescartados,
    stageId: props.stageId,
  };

  function apply(next: FilterValues) {
    props.onTemperatures(next.temperatures);
    props.onDescartados(next.incluirDescartados);
    props.onStage(next.stageId);
  }

  return (
    <div className="lead-search-bar">
      <div className="search-toolbar">
        <label className="field filter-search">
          <span className="mono">Buscar na base</span>
          <input
            placeholder="Nome, endereço ou nota…"
            value={props.busca}
            onChange={(event) => props.onBusca(event.target.value)}
          />
        </label>
        <FilterButton values={values} stages={props.stages} onApply={apply} />
      </div>
      <p className="filter-summary" aria-label="Filtros aplicados">
        {describeFilters(values, props.stages)}
      </p>
    </div>
  );
}

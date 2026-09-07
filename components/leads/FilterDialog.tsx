'use client';

import { useState } from 'react';
import type { Stage, Temperature } from '@/lib/db/schema';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';

export interface FilterValues {
  temperatures: Temperature[];
  incluirDescartados: boolean;
  stageId: string;
}

export const FILTROS_PADRAO: FilterValues = {
  temperatures: ['quente'],
  incluirDescartados: false,
  stageId: '',
};

/** Quantos filtros fogem do padrão — vira o contador ao lado do botão. */
export function countActiveFilters(values: FilterValues): number {
  let total = 0;
  const mesmasTemperaturas =
    values.temperatures.length === FILTROS_PADRAO.temperatures.length
    && FILTROS_PADRAO.temperatures.every((t) => values.temperatures.includes(t));
  if (!mesmasTemperaturas) total++;
  if (values.incluirDescartados) total++;
  if (values.stageId) total++;
  return total;
}

export function describeFilters(values: FilterValues, stages: Stage[]): string {
  return [
    values.temperatures.length ? values.temperatures.join(', ') : 'todas as temperaturas',
    stages.find((stage) => String(stage.id) === values.stageId)?.name ?? 'todas as etapas',
    values.incluirDescartados ? 'incluindo descartados' : 'sem descartados',
  ].join(' · ');
}

function Dialog({ values, stages, onApply, onClose }: {
  values: FilterValues;
  stages: Stage[];
  onApply: (values: FilterValues) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(values);

  function toggle(temperature: Temperature) {
    setDraft((prev) => ({
      ...prev,
      temperatures: prev.temperatures.includes(temperature)
        ? prev.temperatures.filter((value) => value !== temperature)
        : [...prev.temperatures, temperature],
    }));
  }

  return (
    <Modal title="Filtros da base" eyebrow="Refinar resultados" onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onApply(draft); onClose(); }}>
        <div className="modal-body filter-section">
          <fieldset className="checks">
            <legend>Temperatura</legend>
            {(['quente', 'morno', 'frio'] as const).map((temperature) => (
              <label key={temperature}>
                <input
                  type="checkbox"
                  checked={draft.temperatures.includes(temperature)}
                  onChange={() => toggle(temperature)}
                />
                {temperature}
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span>Etapa do funil</span>
            <Select
              aria-label="Etapa do funil"
              value={draft.stageId}
              onValueChange={(stageId) => setDraft((prev) => ({ ...prev, stageId }))}
              options={[
                { value: '', label: 'Todas as etapas' },
                ...stages.map((stage) => ({ value: stage.id, label: stage.name })),
              ]}
            />
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={draft.incluirDescartados}
              onChange={(event) => setDraft((prev) => ({ ...prev, incluirDescartados: event.target.checked }))}
            />
            Incluir descartados
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={() => setDraft(FILTROS_PADRAO)}>
            Restaurar padrão
          </button>
          <span />
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn">Aplicar filtros</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Botão que abre o diálogo de filtros, com o contador do que está fora do
 * padrão. Compartilhado pela tela Leads e pela Explorar — cada uma decide
 * onde ele fica.
 */
export function FilterButton({ values, stages, onApply }: {
  values: FilterValues;
  stages: Stage[];
  onApply: (values: FilterValues) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(values);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Icon name="filter" width="14" height="14" />
        Filtros
        {active > 0 && <b className="filter-count">{active}</b>}
      </button>
      {open && (
        <Dialog values={values} stages={stages} onApply={onApply} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

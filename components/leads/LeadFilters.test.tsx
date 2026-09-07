import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadFilters } from './LeadFilters';

describe('filtros da base em modal', () => {
  it('só publica as alterações ao aplicar', async () => {
    const onTemperatures = vi.fn(), onDescartados = vi.fn(), onStage = vi.fn();
    render(<LeadFilters temperatures={['quente']} incluirDescartados={false} busca="" stageId="" stages={[]}
      onTemperatures={onTemperatures} onDescartados={onDescartados} onStage={onStage} onBusca={vi.fn()} />);
    expect(screen.queryByLabelText('Incluir descartados')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    await userEvent.click(screen.getByLabelText('Incluir descartados'));
    expect(onDescartados).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(onDescartados).toHaveBeenCalledWith(true);
    expect(onTemperatures).toHaveBeenCalledWith(['quente']);
    expect(onStage).toHaveBeenCalledWith('');
  });
});

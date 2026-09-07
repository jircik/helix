import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const options = [{ value: '', label: 'Todas as etapas' }, { value: 1, label: 'Novo' }, { value: 2, label: 'Contatado' }];
function Example() {
  const [value, setValue] = useState('');
  return <Select aria-label="Etapa" options={options} value={value} onValueChange={setValue} />;
}
describe('Select do Helix', () => {
  it('seleciona uma opção e permite retornar à opção vazia', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Etapa' }));
    await userEvent.click(screen.getByRole('option', { name: 'Novo' }));
    expect(screen.getByRole('combobox').textContent).toContain('Novo');
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Todas as etapas' }));
    expect(screen.getByRole('combobox').textContent).toContain('Todas as etapas');
  });
  it('mantém o controle desabilitado durante uma operação', async () => {
    const onValueChange = vi.fn();
    render(<Select aria-label="Etapa" options={options} value="" onValueChange={onValueChange} disabled />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('abre pelo teclado e fecha com Escape sem alterar a seleção', async () => {
    render(<Example />);
    screen.getByRole('combobox').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeDefined();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox').textContent).toContain('Todas as etapas');
  });
});

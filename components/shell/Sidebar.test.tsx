import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/configuracoes/etapa' }));
describe('sidebar recolhível', () => {
  it('alterna entre a marca por escrito e somente o símbolo', async () => {
    render(<Sidebar />);
    const brand = screen.getByRole('link', { name: 'Helix — início' });
    expect(brand.textContent).toBe('HELIX');
    expect(brand.querySelector('svg')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(brand.textContent).toBe('');
    expect(brand.querySelector('svg')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(brand.textContent).toBe('HELIX');
  });
  it('mantém nomes acessíveis, ícones e a seção ativa ao recolher', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    const settings = screen.getByRole('link', { name: 'Configurações' });
    expect(settings.getAttribute('aria-current')).toBe('page');
    expect(settings.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Explorar' }).getAttribute('title')).toBe('Explorar');
  });
});

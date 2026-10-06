import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/configuracoes/etapa', useRouter: () => router }));
const signOut = vi.hoisted(() => vi.fn(async () => ({ data: {}, error: null })));
const getSession = vi.hoisted(() => vi.fn(async () => ({ data: null, error: null })));
vi.mock('@/lib/auth/client', () => ({ authClient: { signOut, getSession } }));
const USER = { name: 'Ana Souza', email: 'ana@teste.dev' };
describe('sidebar recolhível', () => {
  it('alterna entre a marca por escrito e somente o símbolo', async () => {
    render(<Sidebar user={USER} />);
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
    render(<Sidebar user={USER} />);
    await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    const settings = screen.getByRole('link', { name: 'Configurações' });
    expect(settings.getAttribute('aria-current')).toBe('page');
    expect(settings.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Explorar' }).getAttribute('title')).toBe('Explorar');
  });
  it('mostra o usuário e sai da conta', async () => {
    render(<Sidebar user={USER} />);
    expect(screen.getByText('Ana Souza')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(signOut).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/entrar');
  });

  it('renova a sessão uma vez ao montar', () => {
    getSession.mockClear();
    render(<Sidebar user={USER} />);
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it('recolhida mostra só a inicial', async () => {
    render(<Sidebar user={USER} />);
    await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(screen.getByText('A').className).toContain('sidebar-avatar');
  });
});

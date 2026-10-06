import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountView } from './AccountView';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const authClient = vi.hoisted(() => ({ updateUser: vi.fn(), changePassword: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/auth/client', () => ({ authClient }));
beforeEach(() => vi.clearAllMocks());

const USER = { name: 'Ana', email: 'ana@teste.dev' };

describe('AccountView', () => {
  it('mostra o e-mail sem permitir edição', () => {
    render(<AccountView user={USER} />);
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).readOnly).toBe(true);
  });

  it('salva o nome e atualiza a página', async () => {
    authClient.updateUser.mockResolvedValue({ data: {}, error: null });
    render(<AccountView user={USER} />);
    const nome = screen.getByLabelText('Nome');
    await userEvent.clear(nome);
    await userEvent.type(nome, 'Ana Souza');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(authClient.updateUser).toHaveBeenCalledWith({ name: 'Ana Souza' });
    expect(router.refresh).toHaveBeenCalled();
    expect(await screen.findByText('Nome atualizado.')).toBeDefined();
  });

  it('troca a senha encerrando as outras sessões e traduz senha atual errada', async () => {
    authClient.changePassword.mockResolvedValue({ data: null, error: { code: 'INVALID_PASSWORD', status: 400 } });
    render(<AccountView user={USER} />);
    await userEvent.type(screen.getByLabelText('Senha atual'), 'errada-123');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'nova-senha-1');
    await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect(authClient.changePassword).toHaveBeenCalledWith({
      currentPassword: 'errada-123', newPassword: 'nova-senha-1', revokeOtherSessions: true,
    });
    expect((await screen.findByRole('alert')).textContent).toBe('Senha atual incorreta.');
  });

  it('mostra mensagem genérica quando changePassword é rejeitada', async () => {
    authClient.changePassword.mockRejectedValue(new Error('network'));
    render(<AccountView user={USER} />);
    await userEvent.type(screen.getByLabelText('Senha atual'), 'errada-123');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'nova-senha-1');
    await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Não foi possível concluir. Tente novamente.');
  });
});

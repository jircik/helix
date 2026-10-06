import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthForm } from './AuthForm';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const authClient = vi.hoisted(() => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
}));
vi.mock('@/lib/auth/client', () => ({ authClient }));

beforeEach(() => { vi.clearAllMocks(); });

describe('AuthForm', () => {
  it('entrar envia e-mail e senha e vai para o next', async () => {
    authClient.signIn.email.mockResolvedValue({ data: {}, error: null });
    render(<AuthForm mode="entrar" next="/leads" />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@teste.dev');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura-1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(authClient.signIn.email).toHaveBeenCalledWith({ email: 'ana@teste.dev', password: 'senha-segura-1' });
    expect(router.replace).toHaveBeenCalledWith('/leads');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('criar conta pede nome e mostra o erro traduzido', async () => {
    authClient.signUp.email.mockResolvedValue({ data: null, error: { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', status: 422 } });
    render(<AuthForm mode="criar-conta" next="/" />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@teste.dev');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura-1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(authClient.signUp.email).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@teste.dev', password: 'senha-segura-1' });
    expect((await screen.findByRole('alert')).textContent).toBe('Já existe uma conta com este e-mail.');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('cada tela aponta para a outra preservando o next', () => {
    render(<AuthForm mode="entrar" next="/pipeline" />);
    expect(screen.getByRole('link', { name: 'Criar conta' }).getAttribute('href')).toBe('/criar-conta?next=%2Fpipeline');
  });

  it('falha de rede mostra erro genérico e reabilita o botão', async () => {
    authClient.signIn.email.mockRejectedValue(new Error('network'));
    render(<AuthForm mode="entrar" next="/" />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@teste.dev');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura-1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Não foi possível concluir. Tente novamente.');
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
  });
});

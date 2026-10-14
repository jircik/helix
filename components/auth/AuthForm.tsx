'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/lib/routes';

type Mode = 'login' | 'signup';
const COPY = {
  login: { title: 'Entrar no Helix', action: 'Entrar', other: ROUTES.signup, otherLabel: 'Criar conta', otherText: 'Ainda não tem conta?' },
  signup: { title: 'Criar sua conta', action: 'Criar conta', other: ROUTES.login, otherLabel: 'Entrar', otherText: 'Já tem conta?' },
} as const;

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    setEnviando(true);
    setErro(null);
    let error: { code?: string; status?: number; message?: string } | null = null;
    try {
      const result = mode === 'login'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name: String(form.get('name') ?? '').trim(), email, password });
      error = result.error;
    } catch {
      setErro(authErrorMessage(null));
      return;
    } finally {
      setEnviando(false);
    }
    if (error) { setErro(authErrorMessage(error)); return; }
    router.replace(next);
    router.refresh();
  }

  return (
    <section className="panel auth-card">
      <div className="auth-brand"><Logo /><span>HELIX</span></div>
      <span className="mono">CRM de prospecção geográfica</span>
      <h1>{copy.title}</h1>
      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && <label className="field"><span>Nome</span>
          <input name="name" required autoComplete="name" /></label>}
        <label className="field"><span>E-mail</span>
          <input name="email" type="email" required autoComplete="email" /></label>
        <label className="field"><span>Senha</span>
          <input name="password" type="password" required minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {erro && <p role="alert" className="error">{erro}</p>}
        <button className="btn" disabled={enviando}>{copy.action}</button>
      </form>
      <p className="auth-switch">{copy.otherText}{' '}
        <Link href={`${copy.other}?next=${encodeURIComponent(next)}`}>{copy.otherLabel}</Link></p>
    </section>
  );
}

'use client';

import { SampleControls } from '@/components/samples/SampleBanner';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';

type Feedback = { kind: 'ok' | 'erro'; text: string } | null;

function FeedbackLine({ value }: { value: Feedback }) {
  if (!value) return null;
  return value.kind === 'erro'
    ? <p role="alert" className="error account-feedback">{value.text}</p>
    : <p role="status" className="account-feedback">{value.text}</p>;
}

export function AccountView({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [nomeFeedback, setNomeFeedback] = useState<Feedback>(null);
  const [senhaFeedback, setSenhaFeedback] = useState<Feedback>(null);

  async function salvarNome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) { setNomeFeedback({ kind: 'erro', text: authErrorMessage(error) }); return; }
      setNomeFeedback({ kind: 'ok', text: 'Nome atualizado.' });
      router.refresh();
    } catch {
      setNomeFeedback({ kind: 'erro', text: authErrorMessage(null) });
    }
  }

  async function alterarSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: String(data.get('currentPassword') ?? ''),
        newPassword: String(data.get('newPassword') ?? ''),
        revokeOtherSessions: true,
      });
      if (error) { setSenhaFeedback({ kind: 'erro', text: authErrorMessage(error) }); return; }
      form.reset();
      setSenhaFeedback({ kind: 'ok', text: 'Senha alterada. Outras sessões foram encerradas.' });
    } catch {
      setSenhaFeedback({ kind: 'erro', text: authErrorMessage(null) });
    }
  }

  async function sair() {
    try { await authClient.signOut(); } catch { /* segue para a tela de entrada mesmo assim */ }
    router.replace('/entrar');
    router.refresh();
  }

  return <div className="view">
    <span className="mono">Seu acesso</span><h1>Conta</h1>
    <p className="page-description">Seus dados de acesso. Sem recuperação por e-mail nesta versão: guarde bem a sua senha.</p>
    <div className="account">
      <form className="account-section" onSubmit={salvarNome}>
        <div className="account-intro"><h2>Perfil</h2><p>Como você aparece no Helix.</p></div>
        <div className="account-fields">
          <label className="field"><span>E-mail</span><input className="account-static" value={user.email} readOnly /></label>
          <label className="field"><span>Nome</span><input name="name" defaultValue={user.name} required /></label>
          <div className="account-actions"><FeedbackLine value={nomeFeedback} /><button className="btn">Salvar nome</button></div>
        </div>
      </form>
      <form className="account-section" onSubmit={alterarSenha}>
        <div className="account-intro"><h2>Senha</h2><p>Ao trocar, as outras sessões abertas são encerradas.</p></div>
        <div className="account-fields">
          <label className="field"><span>Senha atual</span><input name="currentPassword" type="password" required autoComplete="current-password" /></label>
          <label className="field"><span>Nova senha</span><input name="newPassword" type="password" required minLength={8} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" /></label>
          <div className="account-actions"><FeedbackLine value={senhaFeedback} /><button className="btn">Alterar senha</button></div>
        </div>
      </form>
      <SampleControls />
      <section className="account-section">
        <div className="account-intro"><h2>Sessão</h2><p>Encerra o acesso neste navegador.</p></div>
        <div className="account-fields">
          <div className="account-actions"><button type="button" className="btn btn-outline" onClick={sair}>Sair da conta</button></div>
        </div>
      </section>
    </div>
  </div>;
}

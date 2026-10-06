'use client';

import { useSampleState } from './useSampleState';

export function SampleBanner() {
  const { state, busy, erro, remove } = useSampleState();
  if (!state?.hasSamples) return null;
  return (
    <div className="sample-banner" role="status">
      <span>Você está vendo dados de exemplo.</span>
      <button type="button" className="btn btn-outline" onClick={remove} disabled={busy}>Remover exemplos</button>
      {erro && <span className="error">{erro}</span>}
    </div>
  );
}

/** Versão para Configurações → Conta: uma seção da página, que gera ou remove conforme o estado. */
export function SampleControls() {
  const { state, busy, erro, generate, remove } = useSampleState();
  if (!state) return null;
  return (
    <section className="account-section">
      <div className="account-intro">
        <h2>Dados de exemplo</h2>
        <p>60 leads fictícios em São Paulo, com histórico e buscas. Não consomem a cota do Google.</p>
      </div>
      <div className="account-fields">
        <div className="account-actions">
          {erro && <p role="alert" className="error account-feedback">{erro}</p>}
          {state.hasSamples
            ? <button type="button" className="btn btn-outline" onClick={remove} disabled={busy}>Remover exemplos</button>
            : <button type="button" className="btn" onClick={generate} disabled={busy}>Gerar dados de exemplo</button>}
        </div>
      </div>
    </section>
  );
}

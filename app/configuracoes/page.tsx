import Link from 'next/link';

export default function SettingsPage() {
  return <div className="view"><span className="mono">Seu espaço de trabalho</span><h1>Configurações</h1>
    <p className="page-description">Ajuste o Helix ao seu processo comercial. As configurações ficam organizadas por assunto.</p>
    <Link className="panel settings-card" href="/configuracoes/etapa"><span className="mono">Comercial</span><h2>Etapas do funil <span aria-hidden="true">↗</span></h2>
      <p>Defina nomes, cores, ordem e quais etapas representam negócios ganhos ou perdidos.</p><span className="settings-card-action">Configurar etapas →</span></Link>
    <Link className="panel settings-card" href="/configuracoes/aparencia"><span className="mono">Interface</span><h2>Aparência <span aria-hidden="true">↗</span></h2>
      <p>Escolha entre o tema claro, o escuro ou deixe acompanhar o sistema.</p><span className="settings-card-action">Escolher tema →</span></Link>
  </div>;
}

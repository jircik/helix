import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';
import type { Temperature } from '@/lib/db/schema';
import { ROUTES } from '@/lib/routes';

const REPO_URL = 'https://github.com/jircik/helix';

// Prévia estática: nomes fictícios, só para mostrar a cara da lista.
const PREVIEW: { name: string; address: string; channel: string; temperature: Temperature }[] = [
  { name: 'Padaria Bom Grão', address: 'R. dos Pinheiros, 812', channel: 'Sem site', temperature: 'quente' },
  { name: 'Oficina do Tião', address: 'R. Cardeal Arcoverde, 1430', channel: 'Sem site', temperature: 'quente' },
  { name: 'Ateliê Linha Fina', address: 'R. Teodoro Sampaio, 2051', channel: 'Instagram', temperature: 'morno' },
  { name: 'Pet Shop Quatro Patas', address: 'R. Fradique Coutinho, 377', channel: 'Marketplace', temperature: 'morno' },
  { name: 'Café Esquina', address: 'R. Mourato Coelho, 96', channel: 'cafeesquina.com.br', temperature: 'frio' },
];

const TEMPERATURES: { temperature: Temperature; title: string; text: string }[] = [
  { temperature: 'quente', title: 'Sem site', text: 'Nenhuma URL no Google. É o alvo principal da prospecção.' },
  { temperature: 'morno', title: 'Só rede social ou marketplace', text: 'Já tem um canal, mas ainda falta um site próprio.' },
  { temperature: 'frio', title: 'Site próprio', text: 'Fica registrado, mas sai do topo da lista.' },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'explore', title: 'Buscar no mapa', text: 'Defina texto, tipo, nota mínima e região. Mapa e lista andam sincronizados.' },
  { icon: 'leads', title: 'Organizar os leads', text: 'Busca por nome, endereço ou notas, filtros e exportação em CSV.' },
  { icon: 'pipeline', title: 'Mover no pipeline', text: 'Arraste entre etapas. Cada mudança entra na timeline do lead.' },
  { icon: 'overview', title: 'Acompanhar', text: 'Temperaturas, pendências, próximas ações e histórico de buscas.' },
];

const DETAILS: { title: string; text: string }[] = [
  { title: 'Dados isolados por conta', text: 'Recurso de outra conta responde 404, não 403, para não revelar que existe.' },
  { title: 'Cota diária com reserva atômica', text: 'Requisições concorrentes não ultrapassam o limite da API do Google.' },
  { title: 'Nova busca não apaga trabalho', text: 'Só os dados do Google são atualizados. Notas, etapa e histórico ficam.' },
  { title: 'Backup diário automático', text: 'Cópia do banco todo dia, guardando as 7 mais recentes.' },
];

export function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link className="brand landing-brand" href="/" aria-label="Helix — início"><Logo /><span>HELIX</span></Link>
        <nav className="landing-nav" aria-label="Conta">
          <Link className="btn btn-outline" href={ROUTES.login}>Entrar</Link>
          <Link className="btn" href={ROUTES.signup}>Criar conta</Link>
        </nav>
      </header>

      <main id="conteudo">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <span className="mono">CRM de prospecção geográfica</span>
            <h1 id="landing-title">Encontre negócios que ainda não têm site.</h1>
            <p className="landing-lead">
              O Helix busca estabelecimentos no Google Maps, separa quem não tem site de quem já tem
              e acompanha cada contato num pipeline até o fechamento.
            </p>
            <div className="landing-actions">
              <Link className="btn landing-cta" href={ROUTES.signup}>Criar conta grátis <Icon name="arrow" /></Link>
              <Link className="btn btn-outline landing-cta" href={ROUTES.login}>Já tenho conta</Link>
            </div>
          </div>

          <figure className="panel landing-preview">
            <div className="panel-head">
              <span className="mono">Busca · padarias e comércio em Pinheiros</span>
              <span className="mono landing-preview-count">5 de 48</span>
            </div>
            <ul className="landing-preview-list">
              {PREVIEW.map((lead) => (
                <li key={lead.name}>
                  <span className="landing-initial" aria-hidden="true">{lead.name.charAt(0)}</span>
                  <span className="landing-preview-name">
                    <strong>{lead.name}</strong>
                    <span>{lead.address}</span>
                  </span>
                  <span className="landing-preview-channel">{lead.channel}</span>
                  <TemperatureBadge temperature={lead.temperature} />
                </li>
              ))}
            </ul>
            <figcaption className="sr-only">Exemplo da lista de leads com nomes fictícios.</figcaption>
          </figure>
        </section>

        <section className="landing-section" aria-labelledby="landing-classificacao">
          <div className="landing-section-head">
            <span className="mono">01 · Classificação</span>
            <h2 id="landing-classificacao">Cada resultado já chega com temperatura.</h2>
            <p>A regra é o site: o campo de URL do Google decide onde o estabelecimento entra.</p>
          </div>
          <ul className="landing-grid landing-grid-3">
            {TEMPERATURES.map((item) => (
              <li key={item.temperature} className="panel landing-card">
                <TemperatureBadge temperature={item.temperature} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section" aria-labelledby="landing-fluxo">
          <div className="landing-section-head">
            <span className="mono">02 · Fluxo</span>
            <h2 id="landing-fluxo">Da busca ao fechamento.</h2>
          </div>
          <ol className="landing-grid landing-grid-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="panel landing-card">
                <span className="landing-step"><Icon name={step.icon} aria-hidden="true" /><span className="mono">Passo {index + 1}</span></span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section" aria-labelledby="landing-dentro">
          <div className="landing-section-head">
            <span className="mono">03 · Por dentro</span>
            <h2 id="landing-dentro">Feito para rodar barato e sem vazar dados.</h2>
            <p>Next.js 16, SQLite em modo WAL, Drizzle e Better Auth.</p>
          </div>
          <dl className="landing-details">
            {DETAILS.map((item) => (
              <div key={item.title}>
                <dt>{item.title}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
          <a className="landing-link" href={REPO_URL} target="_blank" rel="noreferrer">
            Ver o código no GitHub <span aria-hidden="true">↗</span></a>
        </section>

        <section className="landing-final" aria-labelledby="landing-final-title">
          <h2 id="landing-final-title">Quem na sua região ainda não tem site?</h2>
          <p>Crie a conta, faça a primeira busca e descubra seus próximos clientes.</p>
          <Link className="btn landing-cta" href={ROUTES.signup}>Criar conta grátis <Icon name="arrow" /></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="mono">Helix · Licença MIT</span>
        <a className="mono" href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </div>
  );
}

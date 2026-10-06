# Helix

[![CI](https://github.com/jircik/helix/actions/workflows/ci.yml/badge.svg)](https://github.com/jircik/helix/actions/workflows/ci.yml) **[helix.jircik.dev](https://helix.jircik.dev)**

Helix is a geographic prospecting CRM: it finds businesses on Google Maps that don't have their own website, ranks them, and tracks outreach through a pipeline. Multi-user with email/password auth, per-account data isolation, and a daily Google API quota with atomic reservation. Next.js 16, SQLite, Drizzle, Better Auth.

<!-- GIF: docs/media/helix.gif (gravado após o deploy) -->

## O que é

CRM de prospecção: encontre estabelecimentos no Google, priorize quem precisa de site e acompanhe os contatos até o fechamento.

A classificação automática é: quente sem URL, morno com rede social/marketplace, frio com site próprio. Todos os resultados recebidos são salvos antes dos filtros de exibição. Uma nova busca atualiza apenas os dados do Google: contato, verificação, motivo de descarte, notas, etapa e histórico são preservados.

## Fluxo

- **Visão geral:** temperaturas, pendências, próximas ações e histórico de buscas.
- **Explorar:** mapa com seleção sincronizada e botão **Fazer prospecção**. Texto, tipo, nota, limite, temperatura, telefone, situação e quantidade de avaliações ficam no modal, que mostra a cota do dia.
- **Leads:** busca textual por nome, endereço ou notas, filtros em modal, paginação, detalhe, exclusão e CSV da seleção completa.
- **Pipeline:** movimentação por arraste ou seletor, com registro automático na timeline.
- **Configurações:** etapas do funil (criação, nome, cor, tipo aberta/ganho/perdido, ordem e exclusão com destino explícito dos leads) e dados de exemplo.
- **Conta:** cadastro e login com e-mail e senha; cada conta enxerga apenas os próprios dados.
- **Dados de exemplo:** 60 leads fictícios por usuário para explorar o app sem gastar a cota do Google; podem ser gerados e removidos a qualquer momento.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Banco | SQLite (better-sqlite3, WAL) + Drizzle ORM |
| Autenticação | Better Auth (e-mail e senha) |
| Mapa e busca | Maps JavaScript API e Places API (New), Text Search |
| Testes | Vitest |
| CI e deploy | GitHub Actions, Railway |

## Decisões

### SQLite em produção

Uma réplica, um volume, modo WAL. O volume do Railway aceita um único processo, o que combina com SQLite e elimina um serviço de banco. O backup é diário e roda dentro do processo (`instrumentation.ts`), com a API de backup do SQLite, mantendo os 7 mais recentes em `BACKUP_DIR`.

### Isolamento entre contas

`userId` é obrigatório em todo repositório e serviço. Recurso de outra conta responde 404, não 403, para não revelar que ele existe. Um teste cria as contas A e B e percorre todas as rotas da API verificando que B nunca alcança dados de A.

### Cota diária do Google

A unidade é a chamada à API. A reserva acontece numa única transação síncrona, então requisições concorrentes não ultrapassam o limite. O free tier da SKU Text Search Enterprise é de 1.000 chamadas por mês, daí os padrões de 30 por dia no total e 6 por dia por usuário (`PLACES_DAILY_LIMIT_GLOBAL` e `PLACES_DAILY_LIMIT_PER_USER`).

### Por que Enterprise

O campo `websiteUri` é a base da classificação (quente, morno, frio) e só está disponível na SKU Enterprise.

### Dados de exemplo fora da cota

Leads de exemplo são marcados com `is_sample` e nunca chamam o Google, então não consomem a cota. Quem não tem cota pode ainda assim ver o app cheio.

## Rodar localmente

Use Node.js 24 (`.nvmrc`) e npm.

```bash
npm ci
cp .env.example .env   # preencha BETTER_AUTH_SECRET e as chaves do Google
npm run db:migrate
npm run dev
```

Abra [127.0.0.1:3000](http://127.0.0.1:3000). Todas as variáveis estão documentadas em [`.env.example`](.env.example). Sem as chaves do Google dá para usar tudo com dados de exemplo, exceto a busca e o mapa.

## Verificação

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Os testes usam SQLite em memória e respostas Google simuladas: não consomem a API nem alteram a base local.

## Deploy

Passo a passo para Railway e Google Cloud em [docs/deploy.md](docs/deploy.md).

## Roadmap

- Recuperação de senha e verificação de e-mail (Resend)
- OAuth (Google e GitHub)
- Exclusão de conta
- Testes E2E (Playwright)
- Agentes de IA na verificação de leads

## Licença

[MIT](LICENSE)

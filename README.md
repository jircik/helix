# Helix

CRM local de prospecção: encontre estabelecimentos no Google, priorize quem precisa de site e acompanhe os contatos até o fechamento.

## Rodar localmente

Use Node.js 24 (a versão está em `.nvmrc`) e npm.

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Os comandos devem ser executados na raiz do projeto. O seed cria as seis etapas iniciais e pode ser executado novamente sem duplicá-las.

O Helix é **single-user, sem autenticação**, e escuta apenas em `127.0.0.1`. Não exponha a aplicação à internet ou à rede local. O banco padrão é `helix.db`; para usar outro caminho, configure `DATABASE_URL` no `.env`.

## Google

Preencha no `.env`:

- `GOOGLE_PLACES_KEY`: chave de servidor da Places API (New).
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`: chave de navegador da Maps JavaScript API.

O visual do mapa vem de `config/map-style.ts`, nas cores do app. O estilo inline
só vale enquanto o mapa não recebe um Map ID: com um Map ID o Google usa o estilo
amarrado a ele no Console e ignora o do código.

Configure APIs, faturamento, cotas e restrições das chaves no seu projeto Google Cloud. A chave de servidor nunca deve receber o prefixo `NEXT_PUBLIC_`. Não versione o `.env`.

Reinicie o servidor depois de alterar as chaves. Em modo de produção, alterações nas variáveis `NEXT_PUBLIC_` exigem um novo build. Sem chaves, você pode usar a base, o pipeline e as configurações; busca e mapa dependem do Google.

A integração usa [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search) com campos explícitos. Cada busca do Helix é limitada a três páginas de até 20 resultados, sem repetição automática de chamadas. As consultas podem gerar cobrança; o número de chamadas fica no histórico.

## Fluxo da v1

- **Visão geral:** temperaturas, pendências, próximas ações e histórico de buscas.
- **Explorar:** mapa com seleção sincronizada e botão preto **Fazer prospecção**. Texto, tipo, nota, limite, temperatura, telefone, situação e quantidade de avaliações ficam no modal.
- **Leads:** busca textual por nome, endereço ou notas, filtros em modal, paginação, detalhe e CSV da seleção completa.
- **Pipeline:** movimentação por arraste ou seletor, com registro automático na timeline.
- **Configurações → Etapas do funil:** `/configuracoes/etapa`. Criação, nome, cor, tipo (aberta/ganho/perdido), ordem e exclusão com destino explícito dos leads. `/etapas` redireciona para a nova rota.

Na base, os filtros só mudam ao clicar em **Aplicar filtros**. Na prospecção, a consulta só acontece ao confirmar **Buscar estabelecimentos** dentro do modal. Cancelar, fechar ou Esc descarta o rascunho sem consultar o Google.

A sidebar pode ser recolhida: expandida mostra HELIX por escrito; recolhida mostra o símbolo e os ícones de navegação. Os dropdowns são personalizados, com suporte a teclado; checkboxes seguem a identidade monocromática.

A classificação automática é: quente sem URL, morno com rede social/marketplace, frio com site próprio. Todos os resultados recebidos são salvos antes dos filtros de exibição. Uma nova busca atualiza apenas os dados do Google: contato, verificação, motivo de descarte, notas, etapa e histórico são preservados.

Não há exclusão de leads. Use a verificação **Descartado**, informando o motivo. Datas são armazenadas em UTC e exibidas no fuso do navegador.

## Verificação e produção local

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm start
```

Os testes automatizados usam SQLite em memória e respostas Google simuladas: não consomem a API e não alteram a base local. Fontes Inter e DM Mono são servidas localmente.

## Backup

SQLite usa WAL. Não copie apenas `helix.db` enquanto a aplicação estiver rodando: transações recentes podem estar no arquivo `-wal`.

Para uma cópia consistente, pare o servidor e use a API de backup do SQLite (substitua os caminhos se necessário):

```bash
node --input-type=module -e 'import Database from "better-sqlite3"; const db = new Database("./helix.db"); await db.backup("./helix-backup.db"); db.close();'
```

Guarde o backup em local seguro, pois contém contatos e notas. CSV é uma exportação comercial, não substitui o backup completo do banco.

## Estrutura

`lib/` concentra classificação, validação, integração, banco, repositórios e serviços. `app/api/` contém os adaptadores HTTP; `components/` contém a interface. Migrações ficam em `lib/db/migrations/`.

Escopo original: [especificação](docs/superpowers/specs/2026-09-06-helix-crm-design.md) e [plano](docs/superpowers/plans/2026-09-06-helix-v1.md). Status e verificações: [entrega da v1](docs/helix-v1-entrega.md).

MCP, agentes de IA, presets editáveis, autenticação e hospedagem pública não fazem parte desta versão.

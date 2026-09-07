# Helix v1 — entrega

Implementação das 15 tarefas do plano, continuando o scaffold existente na branch `feat/helix-v1`.

## Escopo implementado

| Tarefas | Entrega |
| --- | --- |
| 1–3 | Scaffold, ambiente, SQLite/Drizzle, migrações, seed idempotente e classificação por domínio. |
| 4–7 | Normalização, Places com paginação limitada, upsert e serviço de buscas com histórico, contagens e preservação de resultados parciais. |
| 8–10 | Busca FTS5, filtros, edição validada, atividades, movimentações transacionais, etapas e adaptadores HTTP. |
| 11–13 | Interface responsiva baseada no mockup, base paginada, detalhes, Explorar, mapa e seleção sincronizada. |
| 14–15 | Pipeline com arraste/seletor, configuração completa de etapas, visão geral e CSV de todos os resultados filtrados. |

Alterações adicionais pedidas pelo usuário durante a implementação:

- Área `/configuracoes`, com navegação por assunto e etapas em `/configuracoes/etapa`. A rota anterior `/etapas` redireciona para a nova.
- Prospecção inteiramente dentro do modal, aberto pelo botão preto **Fazer prospecção** no cabeçalho. Nenhuma caixa de busca externa; a API só é chamada ao confirmar **Buscar estabelecimentos**.
- Filtros da base em modal, com rascunho, aplicar, cancelar, restaurar padrão e resumo dos valores aplicados.
- Sidebar recolhível, ícones próprios em todos os itens, HELIX por escrito expandida e somente símbolo recolhida.
- Dropdowns personalizados com Radix Select, inclusive no pipeline e nas configurações; checkboxes monocromáticas e campos com estados visuais consistentes. Menus dentro de modais são portados para o próprio diálogo, para respeitar a camada modal do navegador.
- Referência visual mantida em `../mockup-helix`: Inter/DM Mono, preto/off-white, bordas de 1px, cantos retos e backdrop dos modais.

## Correções em relação ao código de exemplo do plano

- Mantida a versão Next.js 16.3.4 já instalada pelo scaffold, seguindo seus guias locais. Node.js 24 recomendado pelas dependências instaladas.
- Fontes empacotadas localmente, sem download de fontes durante o build.
- FTS5 real com migração, triggers e busca por nome, endereço e notas.
- Whitelist de campos impede que JSON recebido pela edição sobrescreva os dados do Google.
- Edição com mudança de etapa, arraste e exclusão de etapa preservam a timeline em transações. Histórico de etapa não pode ser registrado como atividade manual pela API.
- Exclusão de etapa exige destino explícito; nome, cor, tipo e ordem são configuráveis.
- Falha de uma página Google preserva as páginas já recebidas e contabiliza a tentativa que falhou. Não há retry automático; requisições têm timeout.
- Paginação completa na base, no pipeline e na exportação. CSV trata células que poderiam ser interpretadas como fórmulas.
- Próximas ações são convertidas do dia local para ISO UTC; oportunidades ganhas/perdidas ou descartadas não aparecem como ações comerciais pendentes.
- Corrigidas duas inconsistências dos testes de exemplo: fixture sem ID que continha ID e seletor de texto ambíguo na timeline.

## Verificações

- `npm test`: **187 testes passaram, em 23 arquivos**.
- `npm run lint`: passou.
- `npx tsc --noEmit`: passou.
- `npm run build`: passou, incluindo as novas rotas de Configurações.
- Migração e seed executados; base de uso local permanece sem dados sintéticos.
- Testes de repositório, serviços e rotas usam SQLite em memória e Google simulado. Incluem rollback, isolamento dos blocos, re-busca, falhas parciais, filtros, FTS5, paginação e exportação acima de 500 leads.
- Testes de componente cobrem detalhe, tabela, seleção, badges, modais, dropdown personalizado e sidebar recolhível.
- Chromium contra o build de produção: visão geral, segunda página da base, contato e data UTC persistidos após recarga, timeline, atividade manual, seletor e arraste do pipeline, criação/edição/exclusão de etapas, navegação de Configurações e redirecionamento da rota antiga, CSV e seleção de resultados da busca simulada passaram sem erros JavaScript.
- Modais no navegador: aplicar/cancelar, Esc, restauração de foco e filtros da base em tela móvel passaram. As seis telas foram conferidas em largura de 390px sem overflow da página; tabelas, navegação e quadro têm rolagem interna quando necessário.
- Após os últimos pedidos visuais, a suíte e o build foram reexecutados. Chromium confirmou dropdowns personalizados dentro e fora do modal, Escape fechando primeiro o menu, prospecção inteiramente no modal e sidebar nas duas apresentações. O conteúdo recolhido permaneceu dentro dos 1440px do viewport; também foram inspecionados os menus em 390px.

O navegador de teste usa um banco separado em `/tmp/helix-smoke.*`, com 58 estabelecimentos sintéticos. A verificação de Google ao vivo não foi realizada: exige as chaves do projeto e pode consumir cota/faturamento. O mapa e o cliente estão implementados; o estado sem chave é explícito na interface.

## Limites e notas de ambiente

- A aplicação é local e sem autenticação; não foi feito deploy ou push remoto.
- MCP, IA e presets editáveis permanecem fora da v1.
- O build do Next e o Chromium precisaram de execução fora do sandbox: o ambiente restrito impedia o subprocesso TypeScript e a inicialização do navegador. A execução normal foi validada.
- `npm audit` apontou quatro alertas moderados na cadeia de desenvolvimento `drizzle-kit → @esbuild-kit → esbuild`. A correção automática proposta rebaixaria o Drizzle Kit para uma versão incompatível; não foi aplicada. Nenhum alerta foi atribuído às dependências de produção no relatório consultado.
- O fluxo Superpowers foi usado na retomada e na revisão inicial. Após o limite de uso do agente auxiliar, a execução continuou localmente; as tarefas restantes receberam validação direta por testes e inspeção, não revisão independente por subagente.

Instruções de execução, chaves e backup consistente estão no [README](../README.md).

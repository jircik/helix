# Helix — CRM de prospecção geográfica

**Data:** 2026-09-06
**Status:** design aprovado, pronto para plano de implementação

---

## 1. Propósito

Ferramenta pessoal de prospecção para venda de sites e sistemas. Encontra
estabelecimentos no Google Maps que **não têm site próprio** e acompanha o
contato até o fechamento.

A tese do produto é o filtro: negócio sem site é cliente potencial. Tudo no
app existe para achar, verificar e trabalhar esses leads.

**Usuário único, localhost.** Sem autenticação, sem multi-tenant, sem deploy.

### Fora de escopo

Chat integrado, disparo de mensagens, e-mail marketing, multi-usuário,
valores monetários por oportunidade, importação de outras fontes (LinkedIn,
CSV externo), score preditivo.

---

## 2. Stack

| Camada | Escolha |
|---|---|
| App | Next.js (App Router), TypeScript |
| Banco | SQLite (`helix.db`), WAL |
| ORM | Drizzle |
| Mapa | Google Maps JavaScript API |
| Dados | Google Places API (New) — `places:searchText` |
| MCP | Servidor stdio em TypeScript (fase 2) |

Sem Docker, sem Postgres, sem serviço externo. `npm run dev` sobe tudo.
Backup é `cp helix.db`.

**Razão da escolha:** ferramenta de uso diário morre por atrito de
inicialização. Um processo, um arquivo de banco. Drizzle mantém a troca por
Postgres barata caso um dia vire hospedado.

### Estrutura

```
lib/           core em TypeScript puro — não sabe quem o chama
  places/      cliente da API, normalizador
  classify/    classificador de temperatura (função pura)
  repo/        acesso a dados via Drizzle
  services/    casos de uso (executarBusca, verificarLead, moverEtapa)
app/
  api/         rotas HTTP  → consumidas pela UI
  (telas)      overview, explorar, leads, pipeline
mcp/           servidor MCP → sessão Claude          [fase 2]
config/        domínios social/marketplace, tipos de negócio
```

Regra: `app/api/` e `mcp/` são cascas finas sobre `lib/services/`. Nenhum
dos dois contém lógica de negócio. O MCP não fala HTTP — importa `lib/`
direto.

---

## 3. Modelo de dados

Princípio central: **três donos, três blocos.** O que o Google disse, o que
você descobriu, e (na v2) o que a IA avaliou. Nenhum sobrescreve o outro.

```sql
PRAGMA foreign_keys = ON;   -- SQLite vem com isso desligado
PRAGMA journal_mode = WAL;  -- Next.js + MCP no mesmo arquivo
```

### `leads`

```sql
id                    INTEGER PRIMARY KEY
place_id              TEXT UNIQUE          -- nulo p/ lead manual

-- snapshot do Google (read-only na UI)
name                  TEXT NOT NULL
formatted_address     TEXT
lat                   REAL
lng                   REAL
phone                 TEXT
website_uri           TEXT
rating                REAL
user_rating_count     INTEGER
business_status       TEXT                 -- OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
primary_type          TEXT                 -- "gym"
primary_type_display  TEXT                 -- "Academia"
google_maps_uri       TEXT
raw_json              TEXT
captured_at           TEXT NOT NULL

-- derivado
temperature           TEXT NOT NULL        -- quente | morno | frio

-- seus dados (editável)
stage_id              INTEGER REFERENCES stages(id)
verification          TEXT NOT NULL DEFAULT 'pendente'  -- pendente | qualificado | descartado
disqualify_reason     TEXT
verified_by           TEXT                 -- manual | ai
verified_at           TEXT
contact_name          TEXT
email                 TEXT
instagram             TEXT
whatsapp              TEXT
notes                 TEXT
next_action           TEXT
next_action_at        TEXT

created_at            TEXT NOT NULL
updated_at            TEXT NOT NULL
```

`place_id` é `UNIQUE` e anulável — SQLite aceita múltiplos nulos em índice
único, o que permite lead cadastrado à mão.

`lat`/`lng` são obrigatórios para os pins do mapa. Vêm de `places.location`
no field mask.

`temperature` é gravada, não calculada em query, porque é o eixo principal
de filtro e ordenação. Recalculada sempre que `website_uri` muda.

`verified_by` distingue o que você confirmou do que a IA afirmou. Na v1 é
sempre `manual`; existe para a v2 não precisar de migração destrutiva.

Índices: `place_id`, `temperature`, `stage_id`, `verification`,
`next_action_at`. FTS5 sobre `name` + `formatted_address` + `notes`.

### `stages` — funil customizável

```sql
id        INTEGER PRIMARY KEY
name      TEXT NOT NULL
position  INTEGER NOT NULL     -- ordem no kanban
color     TEXT
kind      TEXT NOT NULL        -- open | won | lost
```

Seed: `Novo · Contatado · Reunião · Proposta · Fechado (won) · Perdido (lost)`.

`kind` permite ao app saber o que é fim de linha — sem ele não há cálculo de
conversão nem remoção do fluxo ativo.

Excluir etapa com leads exige escolher o destino dos leads. Sem cascade.

### `activities` — timeline

```sql
id          INTEGER PRIMARY KEY
lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE
kind        TEXT NOT NULL   -- ligacao | email | whatsapp | dm | visita | nota | stage_change
body        TEXT
occurred_at TEXT NOT NULL   -- quando aconteceu, não quando foi digitado
created_at  TEXT NOT NULL
```

Mudança de etapa grava `stage_change` automaticamente. Histórico do funil
sai de graça.

### `searches` — execuções

```sql
id             INTEGER PRIMARY KEY
preset_id      INTEGER REFERENCES search_presets(id)
text_query     TEXT NOT NULL
included_type  TEXT
min_rating     REAL
filters_json   TEXT NOT NULL   -- filtros client-side congelados
pages_fetched  INTEGER
api_requests   INTEGER         -- 1 página = 1 request cobrado
raw_count      INTEGER
new_count      INTEGER
executed_at    TEXT NOT NULL
error          TEXT
```

`filters_json` congelado torna a busca auditável meses depois.

`api_requests` não serve para controle de gasto (a cota gratuita do Google
cobre este volume) e sim para eficiência: `new_count / api_requests` diz
quais queries valem repetir.

### `search_presets`

```sql
id, name, text_query, included_type, min_rating,
filters_json, max_pages, created_at, last_used_at
```

A **lista de filtros disponíveis** é conjunto fixo e vive em código (vira
checkbox na UI). O preset guarda apenas qual combinação foi marcada. Não
existe tabela de "definições de filtro" — seria motor de regras genérico
para seis opções conhecidas.

### `lead_searches` — junção N:N

```sql
lead_id   INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE
search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE
was_new   INTEGER NOT NULL
PRIMARY KEY (lead_id, search_id)
```

Dá procedência ("esse lead veio de qual query") e eficiência por query.

### `assessments` — documentada, **não criada na v1**

```sql
id, lead_id, kind, verdict, score, findings_json, model, created_at
-- kind: site_audit | site_check
```

Terceiro dono do dado. Laudo de IA nunca escreve no bloco do Google nem no
seu. Criada na v2.

---

## 4. Busca e classificação

### Field mask

```
places.id  places.displayName  places.formattedAddress  places.location
places.nationalPhoneNumber  places.websiteUri  places.rating
places.userRatingCount  places.businessStatus  places.primaryType
places.primaryTypeDisplayName  places.googleMapsUri
nextPageToken
```

A cobrança do Places segue o tier mais caro solicitado. `websiteUri` e
`nationalPhoneNumber` já colocam a chamada em Enterprise, então `places.id`
(Essentials) e `places.location` (Pro) entram sem custo adicional.

`nextPageToken` é campo de resposta, não é cobrado, e fica explícito na mask
para remover ambiguidade da paginação.

### Modelo de busca

Uma busca é **uma query de texto**, até 3 páginas, teto de 60 resultados —
limite duro da API. Para mais que isso, o usuário roda outra query
(`academia Vila Madalena`, `crossfit Pinheiros`).

`locationRestriction` (círculo lat/lng + raio) foi **descartado**: o usuário
raciocina por bairro, e o texto já resolve bairro bem. Desenhar círculo
seria traduzir bairro para geometria à mão sem ganho.

**Parâmetros server-side:** `includedType` + `strictTypeFiltering`,
`minRating`, `languageCode: pt-BR`, `regionCode: BR`.

`includedType` é o de maior valor: o texto "academia" traz loja de
suplemento e personal trainer; `gym` com filtragem estrita corta o ruído
antes de consumir as 60 vagas.

**Descartados:** `openNow` (irrelevante para prospecção), `priceLevels`,
`rankPreference`.

**Parâmetros client-side:** temperatura, ausência de telefone, faixa de
número de avaliações, exclusão de `CLOSED_PERMANENTLY`.

### Pipeline de ingestão

```
buildRequest(preset) → fetchPages(≤3, 500ms) → normalize(raw)
  → classify(lead) → upsert(place_id) → gravar search + lead_searches
  → applyClientFilters() [apenas para exibição]
```

Cada passo é função pura em `lib/`, testável sem rede.

### Classificador

```
sem websiteUri                → quente
domínio ∈ SOCIAL_MARKETPLACE  → morno
resto                          → frio
```

Determinístico, sem IA. Lista em `config/`, editável, duas famílias:

- **social** — instagram, facebook, linktr.ee, beacons.ai, bio.link, wa.me,
  tiktok, linkedin
- **marketplace** — ifood, rappi, doctoralia, booksy, trinks, agendei

O grupo marketplace é essencial: restaurante cujo `websiteUri` é uma loja no
iFood **não tem site**. Classificá-lo como frio perderia um lead quente.
Mesma lógica para clínica que só tem perfil no Doctoralia.

### Duas regras de comportamento

**Todos os 60 resultados são gravados, inclusive frios.** O frio de hoje é
"já avaliei, não perco tempo de novo", o morno vira quente quando o negócio
larga o link social, e a auditoria de site da v2 opera exatamente sobre os
frios. Descartá-los na ingestão destruiria o insumo da v2. Para não virar
ruído visual, a lista de leads abre filtrada em
`temperature = 'quente' AND verification <> 'descartado'`.

**Re-busca nunca ressuscita lead.** Rodar a mesma query de novo atualiza os
campos do Google e renova `captured_at`, mas `verification`, `stage_id`,
`notes`, `next_action` e as atividades permanecem intocados. Só entra uma
linha nova em `lead_searches`. Sem isso, todo re-scan obrigaria a
re-avaliar trabalho já feito.

---

## 5. Telas

Identidade visual do mockup mantida: preto `#0a0a0a` sobre off-white
`#fbfbf9`, DM Mono nos rótulos, Inter no corpo, bordas de 1px sem raio.

### Visão geral

Contadores de quente/morno/frio, pendentes de verificação, **próximas ações
vencendo** e últimas buscas com `novos / requests`.

Removidos do mockup: valores em R$, ticket médio, win rate e o gráfico de
performance — não há histórico no dia 1. O gráfico volta quando houver
série temporal real.

### Explorar

Mapa do Google real. Formulário de busca (query, tipo, filtros do preset) e
drawer de resultados.

Seleção sincronizada nos dois sentidos entre card e pin — clicar no card
destaca e centraliza o pin, clicar no pin rola até o card. Pin colorido por
temperatura.

### Leads

Tabela abrindo filtrada em quente e não descartado. A coluna de score do
mockup é substituída por temperatura.

Painel de detalhe em três blocos visualmente distintos: **Google**
(read-only, com `captured_at`), **Seus dados** (editável), **Timeline**.

A separação é a decisão de UI mais importante do app: quando o usuário
descobre que o negócio tem site apesar do Google não listar, isso vira
`disqualify_reason` — nunca uma edição do snapshot.

### Pipeline

Kanban gerado de `stages`. Arrastar muda a etapa e grava `stage_change`.
Sem valores monetários. Tela de configuração de etapas (criar, renomear,
reordenar, cor, `kind`).

---

## 6. MCP — fase 2

Servidor stdio em TypeScript, importando `lib/services/` direto. Sem HTTP,
sem porta, sem autenticação — processo local iniciado pelo Claude Code.

Ferramentas: `search_places`, `list_leads`, `get_lead`, `update_lead`,
`add_activity`, `move_stage`, `list_searches`.

`search_places` exige confirmação explícita para o modelo não varrer dezenas
de queries por conta própria.

**Custo do MCP: zero.** É protocolo e processo local. O que gasta é o que
ele dispara — Places API (mesmo preço da UI) e tokens da sessão Claude.

---

## 7. Ganchos de v2 (IA)

A v2 pretende usar IA para confirmar automaticamente a ausência de site e
para auditar sites existentes (responsividade, SEO, qualidade), tornando os
leads **frios** um alvo de prospecção — um negócio com site ruim já sabe que
precisa de site e já pagou por um.

**O MCP é a camada de IA.** Uma sessão Claude com `WebFetch` mais as
ferramentas do Helix faz exatamente isso. Não há serviço de IA a construir.

Decisões da v1 que mantêm esse caminho aberto, todas de custo desprezível:

1. Gravar os 60 resultados, inclusive frios — insumo da auditoria
2. Preservar `website_uri` nos frios — é a URL a auditar
3. Manter `raw_json` — campo novo da API sai daí sem re-buscar
4. Colunas `verified_by` e `verified_at` — distinguir afirmação da IA de
   confirmação humana
5. `classify()` como função pura isolada — v2 acopla um segundo
   classificador sem tocar na ingestão
6. Tabela `assessments` com forma definida, criada só na v2
7. Nenhum hard delete — descartado é estado, não remoção

---

## 8. Custo e proteção

O volume de uso (poucas dezenas de requests por mês) fica dentro da cota
mensal gratuita por SKU do Google Maps Platform. Custo esperado: zero.

O risco real não é o uso normal e sim um laço com defeito ou o MCP
disparando buscas em sequência. A proteção é do lado do Google, não do app:

**Google Cloud Console → APIs & Services → Places API → Quotas →** limite de
requests por dia. Teto rígido; excedido, a API para de responder.

Os números exatos de preço por tier devem ser confirmados no painel de
billing antes de qualquer aumento de volume.

---

## 9. Restrição de dados

Os Termos do Google Maps Platform permitem cachear `place_id`
indefinidamente; demais campos, por até 30 dias. `captured_at` existe para
tornar essa idade visível na UI. Uso pessoal em localhost tem risco prático
nulo, mas o modelo nasce com o campo.

---

## 10. Aproveitamento do `leads-script`

O projeto `../leads-script` já valida a abordagem. Migra para `lib/`:

- `searchPage` / `fetchAllLeads` → `lib/places/client.ts`, com os campos
  `places.id` e `places.location` adicionados, os parâmetros server-side e a
  contagem de requests
- filtro com/sem site → `lib/classify/` como classificador de três estados
- `toCSV` → exportação sob demanda em rota de API

A observação do README daquele projeto — "estabelecimentos com site no
Instagram/Facebook são leads mornos" — vira classificação de primeira classe
neste design.

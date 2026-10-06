# Deploy do Helix

Produção: `https://helix.jircik.dev`, um serviço no Railway com volume.

## Railway

1. Novo projeto → Deploy from GitHub repo → este repositório, branch `main`.
2. Settings → Deploy:
   - Start command: `npm run railway:start`
   - Healthcheck path: `/api/health`
   - Replicas: **1**. SQLite é de processo único; duas réplicas no mesmo volume corrompem o banco.
   - Ative **Wait for CI**.
3. Volume: montar em `/data`.
4. Variables:
   - `DATABASE_URL=/data/helix.db`
   - `BACKUP_DIR=/data/backups`
   - `BETTER_AUTH_SECRET=` (gere com `openssl rand -base64 32`)
   - `BETTER_AUTH_URL=https://helix.jircik.dev` — Must be exactly the public URL, since the app does not fail fast if it's wrong and auth requests from another origin are rejected.
   - `GOOGLE_PLACES_KEY=`
   - `NEXT_PUBLIC_GOOGLE_MAPS_KEY=` (precisa existir no build: mudou, faça redeploy)
   - `PLACES_DAILY_LIMIT_PER_USER=6`
   - `PLACES_DAILY_LIMIT_GLOBAL=30`
5. Settings → Networking → Custom domain `helix.jircik.dev`; crie o CNAME indicado no DNS (proxy da Cloudflare desligado até o certificado sair).
6. Se o build falhar compilando `better-sqlite3`, adicione um `Dockerfile` baseado em `node:24-bookworm-slim` com `python3 make g++` e repita.

## Google Cloud Console

Text Search Enterprise tem 1.000 chamadas grátis/mês; Dynamic Maps, 10.000 carregamentos.

1. APIs & Services → Places API (New) → Quotas: **Text Search requests per day = 33**.
2. Maps JavaScript API → Quotas: **Map loads per day = 300**.
3. Billing → Budgets & alerts: orçamento **US$ 1** com alerta em 100%.
4. Credentials:
   - chave do mapa (`NEXT_PUBLIC_…`): restrição **HTTP referrers** `https://helix.jircik.dev/*`, `http://localhost:3000/*`, `http://127.0.0.1:3000/*`; APIs: Maps JavaScript API.
   - chave do Places: restrição de API só para Places API (New). Sem restrição por IP (o IP de saída do Railway não é fixo).

## Depois do primeiro deploy

- `curl https://helix.jircik.dev/api/health` → `{"ok":true}`
- Criar conta, gerar exemplos, fazer uma busca real de 1 página, conferir "Restam 5 de 6".
- No Railway, conferir que `/data/backups` tem um arquivo.

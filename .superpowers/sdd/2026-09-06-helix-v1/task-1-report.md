# Task 1

Scaffold inherited from Claude, inspected and committed as 1f754fa. Environment reader and all three tests match plan. Corrected .gitignore to track .env.example while excluding actual env files. Replaced __dirname alias in Vitest with fileURLToPath for ESM compatibility. Recorded installed Next.js version in plan.

Validation: npm test: 1 file / 3 tests passed. npm run lint: exit 0. npm run build: compiled, TypeScript passed, all 4 static pages generated. Initial sandbox build failed DNS for Google Fonts; same build with network succeeded. npm run dev -- --hostname 127.0.0.1 served GET / with HTTP 200, then stopped.

Historical failing test not reproduced because env.ts already existed on takeover. No live Google Places calls or credentials needed.

## Retomada do revisor (2026-09-06)

Removida a dependência de `next/font/google` do layout para que o scaffold compile sem acesso à rede. As variáveis CSS de fonte agora usam fallbacks locais do sistema; a Task 11 poderá substituí-las pelas fontes Inter e DM Mono locais. O layout também define `lang="pt-BR"` e os metadados do Helix (`title: "Helix"`, `description: "CRM de prospecção geográfica"`). Adicionado caso de teste para chave de browser vazia ou somente espaços.

Validação exata:

```text
$ npm test
Test Files  1 passed (1)
Tests       4 passed (4)

$ npm run lint
Process exited with code 0

$ npm run build
Next.js 16.3.4 (Turbopack)
Compiled successfully
Finished TypeScript
Generating static pages ... (4/4)
Route (app): /, /_not-found (static)
Process exited with code 0
```

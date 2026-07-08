# CLAUDE.md — @sistemazero/helpdesk

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod,
> Bun, APIs do Google/Gmail, OpenRouter etc.) — não confie só na memória; APIs mudam. Para
> **pesquisa, exploração e entender padrões**, use o **MCP do Octocode**.

Guia operacional deste package. Leia antes de editar.

## O que é

**Help desk com IA para a caixa `contato@sistemazero.com.br`** (só back-end/API; o front é o
**[@sistemazero/helpdesk-app](../helpdesk-app)**, que consome via api-gateway). Ferramenta INTERNA
da equipe (staff+): lê a caixa do Gmail por **polling** (Gmail API, 1 consent OAuth), agrupa cada
thread num **ticket**, e a IA (OpenRouter) **classifica, resume e rascunha** a resposta — com
**auto-resposta opcional** por toggle quando a base de conhecimento cobre a pergunta. A resposta
sai pela própria Gmail API, na mesma thread, vinda de `contato@`. Runtime: **Bun**. Framework:
**Elysia**. Porta **3013**. Schema Postgres próprio **`helpdesk`**.

> Estado: **F0–F5 COMPLETAS (08/07/2026)** — roadmap inteiro entregue e testado.
> - **F0 (fundação):** schema+migration 0000, repos, rotas tickets-GET/kb/settings, auth
>   (x-internal-token + X-Auth staff+), Sentry, retenção com advisory lock.
> - **F1 (conectar Gmail + ingestão):** secret-box AES-256-GCM, OAuth Google `gmail.modify`+PKCE
>   (client PRÓPRIO, consent INTERNAL), `mime.ts` puro, `gmail-sync-worker` (backfill/incremental/
>   404-resync idempotente por `gmail_message_id`).
> - **F2 (responder pelo app):** `rfc2822.ts` (In-Reply-To/References), `reply.service` com
>   `claimForReply` (guard de duplo-envio por `version`), notas internas, colapso de citação.
> - **F3 (IA):** `OpenRouterClient` (json_object+Zod+1 retry), `prompts.ts` puro, `ticket-ai.service`,
>   `ai-worker` (claim SKIP LOCKED), rotas summarize/regenerate. Sem API key → `ai_status=skipped`.
> - **F4 (KB + auto-resposta):** KB publicada injetada no prompt do rascunho, `auto-reply-policy`
>   PURA, guard de fase `claimAutoReply` (`none`→`sending`, nunca reenvia), migration 0001
>   `is_autoreply` (anti-loop), indicador na UI.
> - **F5 (painel):** `GET /helpdesk/tickets/stats` (agregado no banco: contagens por status +
>   resolvidos hoje/7d + auto-respostas + série densa de 14 dias EM SP), `.env.example`,
>   este guia. 111 testes.

## Decisões travadas (não afrouxar)

1. **Ingestão por POLLING da Gmail API** (não SendGrid Inbound Parse) — 1 consent OAuth, sem
   mexer em DNS/MX. O `gmail-sync-worker` claima a linha da conexão, faz backfill (`last_history_id`
   null → `threads.list(q=GMAIL_BACKFILL_QUERY)`) ou incremental (`history.list`); **404 do
   history (expira ~1 semana) → zera `last_history_id` → full-resync** com dedupe por
   `gmail_message_id` (idempotente). Restart retoma do `last_history_id`.
2. **OAuth Google com consent screen INTERNAL** (org Workspace de sistemazero.com.br), escopo
   **`gmail.modify`** (lê + envia num escopo só). Client OAuth **PRÓPRIO** (≠ marketing). ⚠️ App
   External em "Testing" expira o refresh token em 7 dias — INTERNAL não. Grupo de env ATÔMICO:
   incompleto → rotas de conexão/OAuth respondem 503 `GMAIL_NOT_CONFIGURED`, o boot NUNCA quebra.
3. **Tokens NUNCA em claro**: `access_token_enc`/`refresh_token_enc` (AES-256-GCM versionado
   `v1.<iv>.<tag>.<ct>`, AAD `helpdesk.gmail_connection`, chave `HELPDESK_TOKEN_ENC_KEY`). As
   views nunca expõem `*_enc`; o logger redige.
4. **IA fail-soft**: sem `OPENROUTER_API_KEY`/model → `ai_status='skipped'` e tudo mais funciona;
   o `ai-worker` nem monta. JSON inválido → 1 retry com nudge → `failed` sem quebrar o ticket.
5. **Três defesas anti-duplo-envio**: (a) resposta humana = `claimForReply` bumpa `version`
   (duplo-clique/stale → 409); (b) o poller deduplica por `gmail_message_id` (a resposta que ele
   mesmo enviou não vira mensagem nova); (c) auto-resposta = **guard de fase** `auto_reply_state`
   (`none`→`sending`→`sent`; crash ambíguo → `aborted`, NUNCA reenvia).
6. **Auto-resposta é política PURA e determinística** (`domain/ticket/auto-reply-policy.ts`):
   envia SÓ se TODAS — toggle ON + categoria habilitada + `confidence >= min` + `kbCoverage=covered`
   + sentiment ≠ irritado + sem flags reembolso/jurídico + categoria ≠ pagamento_reembolso + sem
   resposta anterior + `auto_reply_state='none'` (máx 1×/ticket) + inbound não é autoresponder
   (`is_autoreply`) nem no-reply/mailer-daemon. Qualquer falha → rascunho com `reason` visível.
7. **Categoria/prioridade manual NUNCA são sobrescritas pela IA** (`applyClassification`:
   `category = case when category_manual then category else <novo> end`, `priority = coalesce`).
8. **Concorrência otimista** em `tickets.version` (update confere → 0 linhas = `CONCURRENCY_CONFLICT`
   409). As máquinas de estado `ai_status` e `auto_reply_state` NÃO tocam em `version`.
9. **Sem FK cross-schema**: `assigned_to`/`connected_by`/`created_by` são snapshots do auth
   (equipe), com `*_name` snapshot.

## Arquitetura (DDD + Hexagonal — espelha marketing/hub/messaging)

```
src/
├── domain/
│   ├── ticket/{ticket,ticket-message,auto-reply-policy,ticket-stats}.ts   # regras PURAS
│   ├── mail/quote-strip.ts · settings/settings.ts · kb/kb-article.ts
│   └── ports/                 # repos + gmail-client + llm-client + oauth-provider + secret-box
├── application/
│   ├── connection/{gmail-account,oauth,connection}.service.ts
│   ├── tickets/{ticket,reply,ingest}.service.ts
│   ├── ai/{ticket-ai.service,prompts}.ts · kb/kb.service · settings/settings.service
│   └── views.ts               # NUNCA expõe *_enc
├── infrastructure/
│   ├── config/env.ts          # Zod fail-fast; grupos atômicos (Google, IA) → null-config 503
│   ├── security/secret-box.ts # AES-256-GCM, AAD 'helpdesk.gmail_connection'
│   ├── persistence/drizzle/{schema,db,pg-errors,migrations/,*.repository.ts}
│   ├── gateways/google/{gmail-oauth-provider,gmail-client,mime,rfc2822}.ts   # mime/rfc2822 PUROS
│   ├── gateways/openrouter/openrouter-client.ts
│   ├── observability/sentry.ts
│   └── workers/{gmail-sync-worker,ai-worker}.ts
├── interfaces/http/{server,error-handler,auth,dtos}.ts
│   └── routes/{health,tickets,kb,settings,connection,oauth}.routes.ts
├── composition-root.ts (DI + workers + retenção advisory lock 71130324050607093) · index.ts
tests/  fakes/{in-memory,gmail,ai}.ts · helpers.ts (monta a app inteira sem banco) · unit/ ·
        integration/ (via app.handle) — 111 testes
```

## Comandos (de dentro de `packages/helpdesk`)

| Ação | Comando |
| --- | --- |
| Dev (watch) | `bun run dev` (porta 3013) |
| Testes | `bun test` |
| Typecheck | `bun run typecheck` |
| Migrations | `bun run db:generate` / `db:migrate` |
| Lint | `bun run check` / `check:fix` |

Da raiz: `dev:helpdesk`, `test:helpdesk`, `db:helpdesk:generate/migrate`.

## HTTP (tudo via gateway; JWT staff+ verificado lá; aqui `x-internal-token` + X-Auth fail-closed)

Saúde: `GET /health` · `GET /readyz` (banco). Negócio (rate limits no gateway):

- Tickets: `GET /helpdesk/tickets` (filtros status/category/q, offset+`hasMore`) ·
  **`GET /helpdesk/tickets/stats`** (painel — agregado no banco, registrada ANTES de `/:id` p/ a
  rota estática vencer a paramétrica) · `GET /helpdesk/tickets/:id` (+ messages[]) ·
  `PATCH /helpdesk/tickets/:id` (status/category/priority/assignToMe + `version`→409) ·
  `POST …/:id/reply` `{body, version}` · `POST …/:id/notes` `{body}` ·
  `POST …/:id/summarize` · `POST …/:id/draft/regenerate` (IA on-demand, síncrona).
- KB CRUD: `GET|POST /helpdesk/kb` · `GET|PATCH|DELETE /helpdesk/kb/:id` (PATCH exige `version`).
- Config: `GET|PATCH /helpdesk/settings` (toggles de auto-resposta + assinatura; PATCH admin+).
- Conexão: `GET|DELETE /helpdesk/connection` (admin+ na escrita).
- OAuth: `POST /helpdesk/oauth/google/start` (admin+) · `GET /helpdesk/oauth/google/callback`
  (PÚBLICA — o serviço valida o state single-use; sempre 302 p/ `HELPDESK_APP_URL/configuracoes?…`).

**`stats` (contrato do painel):** `{counts:{new,open,waiting}, resolvedToday, resolved7d,
autoRepliedToday, autoReplied7d, volume:[{date 'YYYY-MM-DD' (dia SP), created, autoReplied}]}`.
As janelas/série vivem em `domain/ticket/ticket-stats.ts` (PURO, testado) — Drizzle e in-memory
usam o MESMO recorte (dia SP = UTC-3 fixo, `- interval '3 hours'` no SQL). `resolvedToday/7d` é
proxy por `updated_at` na última transição (não há `resolved_at`); auto-respostas por `auto_replied_at`.

## Workers (processo único, iniciados no composition-root — molde messaging)

1. **gmail-sync-worker** (~45s): claim da linha da conexão (`sync_next_at` + lease) → token fresco
   (refresh lazy) → backfill/incremental → parse MIME → `IngestService.ingest` (from==contato@ →
   outbound `sent_via='gmail'`; senão inbound → upsert ticket por `gmail_thread_id`, `ai_status=pending`).
2. **ai-worker** (~15s): claim `pending` (SKIP LOCKED) → `runPipeline` (classifica+resume, rascunha
   com KB) → `markAiDone` → `maybeAutoReply` (política PURA → envia via ReplyService com guard de
   fase, ou grava o motivo). Try/catch: a auto-resposta NUNCA quebra o processamento da IA.

Retenção (fora do hot path, advisory xact-lock `71130324050607093` — só 1 réplica limpa por ciclo):
`oauth_states` vencidos. ⚠️ `Date` em SQL cru só via `.toISOString()` (gotcha Bun+postgres.js).

## Gotchas (mantenha ao editar)

1. **postgres.js + Bun**: em `sql` cru, `Date` como param SÓ via `.toISOString()`; `count(*)` volta
   como STRING → coagir com `Number()`. Ler timestamp cru volta string → coagir p/ Date se precisar.
2. **`forwardUpstream` × 204/205/304**: `Response.json` estoura em corpo vazio — o error-handler
   trata esses status sem corpo (bug documentado; não regredir).
3. **uuid validado na borda** (DTOs TypeBox) — id lixo → 400, nunca 22P02→500.
4. **OpenRouter**: `AbortController` + `clearTimeout` (NUNCA `AbortSignal.timeout`).
5. **`x-internal-token` é defesa em profundidade**, não a auth: o RBAC real é do gateway.
6. Testes via `app.handle` com fakes in-memory (`tests/helpers.ts` monta a app inteira sem banco);
   SQL cru novo (não coberto pelos fakes) validar com smoke descartável contra o Postgres local.

## Deploy (Railway) — pendências da usuária (fora do código)

1. **GCP**: projeto na org Workspace + OAuth client NOVO, consent screen **INTERNAL**, escopo
   `gmail.modify`; redirect URI `<OAUTH_PUBLIC_BASE_URL>/helpdesk/oauth/google/callback` (por ambiente).
2. **Railway**: criar serviços `helpdesk` (3013) e `helpdesk-app` (3014) em staging+prod, fornecer
   os SVC_IDs (destravam o deploy no CI), setar envs — inclui `HELPDESK_TOKEN_ENC_KEY`
   (`openssl rand -base64 32`) e `HELPDESK_INTERNAL_TOKEN` espelhado no gateway.
3. **Gateway**: `HELPDESK_INTERNAL_TOKEN` está no `PROD_REQUIRED_SECRETS` do gateway — enquanto o
   serviço não existir, isso derruba o boot do gateway em staging a cada redeploy. Remover da lista
   (ou setar a env) até o helpdesk subir.
4. `OPENROUTER_API_KEY` (pode reusar a existente) + `OPENROUTER_HELPDESK_MODEL`.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde · `bun run check` limpo.
- [ ] Mudou schema? `db:generate` + commitou a migration (confira o journal `helpdesk_migrations`).
- [ ] Mudou contrato de rota? Atualizou este guia, o `lib/types.ts` do app e o gateway (se a rota mudou).

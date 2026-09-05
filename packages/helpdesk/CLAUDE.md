# CLAUDE.md — @sistemazero/helpdesk

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod,
> Bun, APIs do Google/Gmail, OpenRouter etc.) — não confie só na memória; APIs mudam. Para
> **pesquisa, exploração e entender padrões**, use o **MCP do Octocode**.

Guia operacional deste package. Leia antes de editar.

## O que é

**Help desk com IA para a caixa `contato@sistemazero.com.br` e o portal do responsável** (só
back-end/API; o front interno é o **[@sistemazero/helpdesk-app](../helpdesk-app)** e a área do
cliente é consumida por Community via api-gateway). A equipe (staff+) lê a caixa do Gmail por
**polling** (Gmail API, 1 consent OAuth), agrupa cada thread num **ticket**, e a IA (OpenRouter)
**classifica, resume e rascunha** a resposta — **sem auto-resposta**: toda resposta exige aprovação
humana. Chamados abertos no portal entram na mesma fila e são respondidos **no portal** (a resposta
vira mensagem da conversa + aviso por e-mail pelo messaging), sem depender da caixa Gmail; só um
ticket que já vive numa thread do Gmail segue por e-mail. Runtime: **Bun**. Framework:
**Elysia**. Porta **3013**. Schema Postgres próprio **`helpdesk`**.

> Estado: **F0–F7 COMPLETAS (01/09/2026)** — roadmap inteiro entregue e testado.
> - **F0 (fundação):** schema+migration 0000, repos, rotas tickets-GET/kb/settings, auth
>   (x-internal-token + X-Auth staff+), Sentry, retenção com advisory lock.
> - **F1 (conectar Gmail + ingestão):** secret-box AES-256-GCM, OAuth Google `gmail.modify`+PKCE
>   (client PRÓPRIO, consent INTERNAL), `mime.ts` puro, `gmail-sync-worker` (backfill/incremental/
>   404-resync idempotente por `gmail_message_id`).
> - **F2 (responder pelo app):** `rfc2822.ts` (In-Reply-To/References), outbox transacional de
>   entrega (guard de duplo-envio por `version`), notas internas e colapso de citação.
> - **F3 (IA):** `OpenRouterClient` (json_object+Zod+1 retry), `prompts.ts` puro, `ticket-ai.service`,
>   `ai-worker` (claim SKIP LOCKED), rotas summarize/regenerate. Sem API key → `ai_status=skipped`.
> - **F4 (KB):** KB publicada injetada no prompt do rascunho. A IA opera somente como copiloto;
>   não há mecanismo de auto-resposta no domínio ou nas configurações. Os candidatos e o total de
>   caracteres são limitados; a seleção lexical descarta artigos sem relação com a conversa.
> - **F5 (painel):** `GET /helpdesk/tickets/stats` (agregado no banco: contagens por status +
>   resolvidos hoje/7d + série densa de 14 dias EM SP), `.env.example` e este guia.
> - **F6 (portal):** tickets iniciados pelo responsável, mensagens do portal com visibilidade
>   explícita, ownership aplicado no SQL e sessão infantil recusada em profundidade.
> - **F7 (fila operacional):** SLA interno de primeira resposta (alta 4h, normal 12h, baixa
>   24h), filtros/ordenação de atenção e responsável, e visibilidade explícita de copiloto IA.

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
   O perfil devolvido pelo Gmail precisa coincidir com `HELPDESK_MAILBOX_ADDRESS` (default
   `contato@sistemazero.com.br`) e o banco permite uma única conexão ativa.
3. **Tokens NUNCA em claro**: `access_token_enc`/`refresh_token_enc` (AES-256-GCM versionado
   `v1.<iv>.<tag>.<ct>`, AAD `helpdesk.gmail_connection`, chave `HELPDESK_TOKEN_ENC_KEY`). As
   views nunca expõem `*_enc`; o logger redige.
4. **IA fail-soft**: sem `OPENROUTER_API_KEY`/model → `ai_status='skipped'` e tudo mais funciona;
   o `ai-worker` nem monta. JSON inválido → 1 retry com nudge → `failed` sem quebrar o ticket.
5. **Três defesas contra envio duplicado**: (a) intenção humana e bump de `version` entram na mesma
   transação antes do Gmail; (b) timeout de transporte vira `delivery_state='unknown'` e exige
   reconciliação explícita por `Message-ID` RFC 822 antes de reenvio. Um `pending` só pode ser
   remediado após dois minutos, protegendo contra crash do processo sem competir com envio em curso;
   rejeição conhecida fica `failed` e libera nova resposta; (c) o poller confirma o intent pendente
   em vez de criar uma segunda mensagem.
6. **IA é copiloto, nunca remetente**: classifica, resume e prepara rascunhos. Não existe toggle,
   rota, worker ou coluna de auto-resposta. Uma futura autonomia exige decisão de produto e desenho
   de segurança dedicado.
7. **Categoria/prioridade manual NUNCA são sobrescritas pela IA** (`applyClassification`:
   `category = case when category_manual then category else <novo> end`, `priority = coalesce`).
8. **Concorrência otimista** em `tickets.version` (update confere → 0 linhas = `CONCURRENCY_CONFLICT`
   409). A máquina de estado `ai_status` NÃO toca em `version`; cada inbound atual incrementa
   `ai_generation`, limpa artefatos anteriores e todas as escritas assíncronas da IA usam CAS por
   geração + tentativa do claim.
9. **Sem FK cross-schema**: `assigned_to`/`connected_by`/`created_by` são snapshots do auth
   (equipe), com `*_name` snapshot.
10. **Portal é exclusivo do responsável:** o gateway remove headers de identidade forjados e o
    serviço recusa `x-auth-account-id` (marca de sessão de perfil/kids). A busca e a escrita usam
    `requester_account_id` no SQL; tickets de e-mail anteriores ao portal só entram quando o
    e-mail verificado da conta coincide. Notas internas (`visibility='internal'`) jamais cruzam
    essa fronteira.
11. **Ticket do portal responde NO portal (09/2026).** O Gmail serve para LER a caixa; responder
    por e-mail só onde a conversa já É e-mail. `ReplyService.reply()` bifurca ANTES do
    `requireConnection()`: `source='portal' && gmail_thread_id IS NULL` → `appendPortalReply`
    (transação única: CAS em `version` +1, `new/open → waiting`, contadores; mensagem
    `kind='portal'`, `direction='outbound'`, `delivery_state` NULL) e depois um AVISO por
    e-mail via gateway → messaging (consumer HMAC `helpdesk`, template `helpdesk-reply`,
    idempotência por MENSAGEM, só o link — nunca o texto). Mensagem e job entram na MESMA
    transação; o `portal-notification-worker` usa claim com lease e retry exponencial sem teto de
    tentativas. Ticket de portal COM thread do Gmail (legado
    respondido por e-mail) segue pelo Gmail. `tickets.portal` (`adult`|`kids`, migration
    0009) vem do BFF (config compilada do app, o cliente não escolhe) e decide o link
    (`/ajuda` vs `/responsavel/ajuda`); nulo cai no adulto. O guarda de "uma saída em voo"
    (`pending`/`unknown`) vale nos dois canais.

## Arquitetura (DDD + Hexagonal — espelha marketing/hub/messaging)

```
src/
├── domain/
│   ├── ticket/{ticket,ticket-message,ticket-sla,ticket-stats}.ts # regras PURAS
│   ├── settings/settings.ts · kb/kb-article.ts
│   └── ports/                 # repos + gmail/llm/oauth/secret-box/messaging + outbox de aviso
├── application/
│   ├── connection/{gmail-account,oauth,connection}.service.ts
│   ├── tickets/{ticket,reply,ingest,customer-ticket}.service.ts · tickets/portal-reply-notification.ts (PURO)
│   ├── ai/{ticket-ai.service,prompts,kb-context}.ts · kb/kb.service · settings/settings.service
│   └── views.ts               # NUNCA expõe *_enc
├── infrastructure/
│   ├── config/env.ts          # Zod fail-fast; grupos atômicos (Google, IA, aviso do portal) → null-config
│   ├── security/secret-box.ts # AES-256-GCM, AAD 'helpdesk.gmail_connection'
│   ├── persistence/drizzle/{schema,db,pg-errors,migrations/,*.repository.ts}
│   ├── gateways/google/{gmail-oauth-provider,gmail-client,mime,rfc2822}.ts   # mime/rfc2822 PUROS
│   ├── gateways/openrouter/openrouter-client.ts
│   ├── gateways/messaging/gateway-messaging-client.ts   # HMAC consumer `helpdesk` → /messaging/send
│   ├── observability/sentry.ts
│   └── workers/{gmail-sync-worker,ai-worker,portal-notification-worker}.ts
├── interfaces/http/{server,error-handler,auth,dtos}.ts
│   └── routes/{health,tickets,customer-tickets,kb,settings,connection,oauth}.routes.ts
├── composition-root.ts (DI + workers + retenção advisory lock 71130324050607093) · index.ts
tests/  fakes/{in-memory,gmail,ai,messaging}.ts · helpers.ts (monta a app inteira sem banco) · unit/ ·
        integration/ (via app.handle; os `drizzle-*` só rodam com
        `HELPDESK_TEST_DATABASE_URL` apontando p/ um banco `helpdesk_test` migrado)
```

Enums, views públicas e o parser puro de citações vivem em
`@sistemazero/helpdesk-contracts`; backend, console e member-shell importam a mesma fonte.

## Comandos (de dentro de `packages/helpdesk`)

| Ação | Comando |
| --- | --- |
| Dev (watch) | `bun run dev` (porta 3013) |
| Testes | `bun test` |
| Typecheck | `bun run typecheck` |
| Migrations | `bun run db:generate` / `db:migrate` |
| Lint | `bun run check` / `check:fix` |

Da raiz: `dev:helpdesk`, `test:helpdesk`, `db:helpdesk:generate/migrate`.

## HTTP (tudo via gateway; aqui `x-internal-token` + identidade injetada fail-closed)

Saúde: `GET /health` · `GET /readyz` (banco). Negócio (rate limits no gateway):

- **Portal do responsável:** `GET|POST /helpdesk/portal/tickets` (listagem própria e abertura) ·
  `GET /helpdesk/portal/tickets/:id` (somente mensagens `visibility='customer'`) ·
  `POST …/:id/messages`. O gateway exige JWT de conta ativa, e o serviço revalida token interno,
  status, identidade/e-mail e a ausência de `x-auth-account-id`; ids de terceiros retornam 404.
  `tickets.source='portal'` começa sem `gmail_thread_id` e é respondido NO portal (decisão 11);
  a thread do Gmail só existe em ticket legado respondido por e-mail, e esse segue por e-mail.
  O BFF manda `portal` (`adult`|`kids`) na criação — campo fora do DTO é DESCARTADO pelo
  Elysia (não 422), o que deixa app e helpdesk deployarem em qualquer ordem. A listagem usa cursor
  opaco por `lastMessageAt,id`; não reintroduza offset numa fila que muda enquanto o cliente navega.

- Tickets: `GET /helpdesk/tickets` (filtros status/category/q + `sla=attention|at_risk|breached`
  + `assignment=assigned|unassigned` e `queue=unassigned` para trabalho ativo sem responsável,
  cursor opaco com snapshot + `hasMore`; fila ordena estourados/risco antes da recência) ·
  **`GET /helpdesk/tickets/stats`** (painel — agregado no banco, registrada ANTES de `/:id` p/ a
  rota estática vencer a paramétrica) · `GET /helpdesk/tickets/:id` (+ messages[]) ·
  `PATCH /helpdesk/tickets/:id` (status/category/priority/assignToMe + `version`→409) ·
  `POST …/:id/reply` `{body, version}` (portal → mensagem na conversa + aviso pelo messaging;
  e-mail → Gmail na mesma thread) ·
  `POST …/:id/deliveries/:messageId/reconcile` (consulta o Gmail, sem reenviar) ·
  `POST …/:id/deliveries/:messageId/mark-failed` `{confirmation:'delivery-not-confirmed'}`
  (decisão humana explícita após revisar o risco) · `POST …/:id/notes` `{body}` ·
  `POST …/:id/summarize` · `POST …/:id/draft/regenerate` (IA on-demand, síncrona).
- KB CRUD: `GET|POST /helpdesk/kb` · `GET|PATCH|DELETE /helpdesk/kb/:id` (PATCH exige `version`).
- Config: `GET|PATCH /helpdesk/settings` (assinatura das respostas humanas; PATCH admin+).
- Conexão: `GET|DELETE /helpdesk/connection` (admin+ na escrita).
- OAuth: `POST /helpdesk/oauth/google/start` (admin+) · `GET /helpdesk/oauth/google/callback`
  (PÚBLICA — o serviço valida o state single-use; sempre 302 p/ `HELPDESK_APP_URL/configuracoes?…`).

**`stats` (contrato do painel):** `{counts:{new,open,waiting}, resolvedToday, resolved7d,
sla:{atRisk,breached,unassigned}, volume:[{date 'YYYY-MM-DD' (dia SP), created}]}`. Cada ticket
interno também devolve `sla` com estado,
meta, deadline e minutos restantes, ou `null` quando o relógio está pausado.
As janelas/série vivem em `domain/ticket/ticket-stats.ts` (PURO, testado) — Drizzle e in-memory
usam o MESMO recorte (dia SP = UTC-3 fixo, `- interval '3 hours'` no SQL).
`resolvedToday/7d` usa `resolved_at`, gravado somente na transição a `resolved`/`closed`; a
migração de backfill usa `updated_at` apenas como aproximação dos registros históricos.

**SLA:** é meta operacional, nunca promessa ao cliente. Começa na última mensagem inbound, fica
ativo em `new`/`open`, entra em risco no último quarto da meta e pausa em `waiting`/`resolved`/
`closed`. A política pura em `ticket-sla.ts` é a fonte de verdade; a expressão SQL só replica a
mesma regra para filtro, ordenação e agregados paginados.

## Workers (processo único, iniciados no composition-root — molde messaging)

1. **gmail-sync-worker** (~45s): claim da linha da conexão (`sync_next_at` + lease) → token fresco
   (refresh lazy) → backfill/incremental → parse MIME → `IngestService.ingest` (from==contato@ →
   outbound `sent_via='gmail'`; senão inbound → upsert ticket por `gmail_thread_id`, `ai_status=pending`).
2. **ai-worker** (~15s): claim `pending` ou lease `processing` vencido (SKIP LOCKED) → `runPipeline`
   (classifica+resume, rascunha com KB relevante e limitada) → `markAiDone`, sempre condicionado
   à geração/tentativa reivindicada.
3. **portal-notification-worker** (~5s): claim do outbox persistente → gateway/messaging com a
   mesma chave idempotente; falha volta a `pending` com backoff e crash é recuperado pelo lease.

Retenção (fora do hot path, advisory xact-lock `71130324050607093` — só 1 réplica limpa por ciclo):
`oauth_states` vencidos e notificações `sent` antigas (30 dias por padrão). Jobs pendentes nunca
são apagados. ⚠️ `Date` em SQL cru só via `.toISOString()` (gotcha Bun+postgres.js).

## Gotchas (mantenha ao editar)

1. **postgres.js + Bun**: em `sql` cru, `Date` como param SÓ via `.toISOString()`; `count(*)` volta
   como STRING → coagir com `Number()`. Ler timestamp cru volta string → coagir p/ Date se precisar.
2. **`forwardUpstream` × 204/205/304**: `Response.json` estoura em corpo vazio — o error-handler
   trata esses status sem corpo (bug documentado; não regredir).
3. **uuid validado na borda** (DTOs TypeBox) — id lixo → 400, nunca 22P02→500.
4. **OpenRouter e cliente do messaging**: `AbortController` + `clearTimeout` (NUNCA
   `AbortSignal.timeout` — o sinal da fábrica não cancela e o timer pendura o `bun test`).
5. **`x-internal-token` é defesa em profundidade**, não a auth: o RBAC real é do gateway.
6. Testes via `app.handle` com fakes in-memory (`tests/helpers.ts` monta a app inteira sem banco);
   SQL cru novo (não coberto pelos fakes) validar com smoke descartável contra o Postgres local.

## Deploy (Railway) — pendências da usuária (fora do código)

1. **GCP**: projeto na org Workspace + OAuth client NOVO, consent screen **INTERNAL**, escopo
   `gmail.modify`; redirect URI `<OAUTH_PUBLIC_BASE_URL>/helpdesk/oauth/google/callback` (por ambiente).
2. **Railway**: criar serviços `helpdesk` (3013) e `helpdesk-app` (3014) em staging+prod, setar
   envs — inclui `HELPDESK_TOKEN_ENC_KEY` (`openssl rand -base64 32`) e
   `HELPDESK_INTERNAL_TOKEN` espelhado no gateway. Depois registrar os IDs como variáveis de
   repositório `RAILWAY_HELPDESK_SERVICE_ID` e `RAILWAY_HELPDESK_APP_SERVICE_ID`: o CI passa a
   incluí-los no staging e o deploy de produção aceita `services=helpdesk,helpdesk-app`.
3. **Gateway**: `HELPDESK_INTERNAL_TOKEN` está no `PROD_REQUIRED_SECRETS` do gateway — enquanto o
   serviço não existir, isso derruba o boot do gateway em staging a cada redeploy. Remover da lista
   (ou setar a env) até o helpdesk subir.
4. `OPENROUTER_API_KEY` (pode reusar a existente) + `OPENROUTER_HELPDESK_MODEL`. ⚠️ A chave
   SOZINHA não liga nada: sem o modelo `aiConfig()` é null e todo ticket nasce `skipped`.
5. **Aviso do portal** (grupo atômico): `GATEWAY_URL`, `HELPDESK_HMAC_SECRET` (MESMO valor no
   gateway, que cadastra o consumer `helpdesk`), `COMMUNITY_URL`, `KIDS_COMMUNITY_URL`; e rodar
   `bun run templates:seed` no messaging de cada ambiente (template `helpdesk-reply` — chave
   ausente = 404 no aviso, a resposta continua indo).

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde · `bun run check` limpo.
- [ ] Mudou schema? `db:generate` + commitou a migration (confira o journal `helpdesk_migrations`).
- [ ] Mudou contrato de rota? Atualizou este guia, o `lib/types.ts` do app e o gateway (se a rota mudou).

## Baseline Studio (08/2026)

- A migration `0002_zappy_studio_category` acrescenta `studio` à classificação. Dúvidas sobre
  Estúdio, blocos, projetos e Zappy usam essa dimensão, separada de `problema_tecnico`, para
  comparar o atendimento humano antes e durante o piloto.

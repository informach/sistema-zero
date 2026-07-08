# CLAUDE.md — @sistemazero/marketing

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod,
> Bun, APIs da Meta/Google/TikTok etc.) — não confie só na memória; APIs mudam. Para **pesquisa,
> exploração e entender padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes.

Guia operacional deste package. Leia antes de editar.

## O que é

**Gerenciamento de marketing digital** (só back-end/API; o front é o
**[@sistemazero/marketing-app](../marketing-app)**, que consome via api-gateway). Ferramenta
INTERNA da equipe (staff+): **pipeline de produção de conteúdo** (ideia → roteiro → gravação →
edição → capa/legenda → revisão → aprovado), **publicações cross-post** por rede/formato
(Instagram/Facebook/YouTube/TikTok) com agendamento, **mídia** (R2 presigned + Google Drive nas
próximas fases) e **métricas** (snapshots por publicação/conta). Runtime: **Bun**. Framework:
**Elysia**. Porta **3011**. Schema Postgres próprio **`marketing`**.

> Estado: **F0 + F1 + F2 COMPLETAS e testadas (07/07/2026)** — além da fundação (CRUD +
> mídia R2 + mark-published), a F1 trouxe secret-box AES-256-GCM, OAuth Google REAL
> (network `youtube`, escopos Drive+YouTube), contas (`GET/DELETE /marketing/accounts`),
> Drive (picker + import → media-transfer-worker Drive→R2), publisher-worker ramo MANUAL
> (awaiting_manual + lembrete WhatsApp via messaging), token-refresh-worker e
> `GET /marketing/publications` (janela p/ Calendário/Painel); a F2 trouxe o
> **youtube-publisher AUTOMÁTICO** (resumable idempotente por provider_session +
> `status.publishAt` nativo com upload antecipado no lead), quota-guard (tabela
> `provider_quota_usage`, reset à meia-noite PT), ramo AUTO do worker, liberação do
> `publish_mode: 'auto'` p/ youtube (binding de conta) e o yt-metrics-worker (snapshots
> canal/vídeos + rotas `GET /marketing/metrics/summary` e `GET /marketing/publications/:id/metrics`).
> Migrations `0000..0003`. 133 testes.
> **Fases seguintes:** F3 = Meta (container→poll→publish, carrossel) + metrics-worker completo;
> F4 = TikTok + archiver R2→Drive; F5 = IA (Light Copy).

## Decisões travadas (não afrouxar)

1. **Etapas em ENUM fixo + checklist por conteúdo.** As etapas de produção (idea..approved) são
   movidas manualmente (`domain/content/stage.ts`: qualquer direção/distância DENTRO da banda;
   mover p/ a mesma etapa = 409). `scheduled`/`published` são **DERIVADAS** das publicações
   (`PublicationService.syncContentStage` materializa) — movimento manual para elas = 409.
   Entrar em `approved` **exige checklist completo** (`CHECKLIST_INCOMPLETE` → 409).
   Os checklists são copiados de **templates EM CÓDIGO** (`domain/pipeline/checklist-templates.ts`,
   snapshot na criação) + itens manuais. NÃO criar builder de workflow em banco.
2. **Conteúdo-mestre → N publicações (cross-post).** Publicação só nasce de conteúdo
   `approved|scheduled|published` (`CONTENT_NOT_APPROVED` → 409). Cada publicação tem
   legenda/capa/horário/status próprios. `network` é DENORMALIZADA do `format`
   (`FORMAT_NETWORK` em `domain/publication/publication.ts`).
3. **`publish_mode manual` é first-class** (o produto funciona SEM nenhuma API social aprovada):
   agendar cria o compromisso; `mark-published` fecha o ciclo (guarda `external_url`).
   `ig_story` é SEMPRE manual (Stories não têm API de publicação em lugar nenhum).
   `publish_mode: 'auto'` hoje responde `AUTO_PUBLISH_UNAVAILABLE` (409) — libera por rede
   quando o publisher da rede existir E houver conta conectada.
4. **Idempotência do futuro publisher**: `publications.provider_session` (jsonb) é o CHECKPOINT
   (creation_id da Meta, uploadUri do YouTube, publish_id do TikTok) — persistir ANTES/DEPOIS de
   cada side-effect; retry NUNCA recria side-effect com id salvo. Claim por
   `publications_claim_idx (status, scheduled_at)` + lease em `next_attempt_at`
   (`publications_lease_idx` parcial) — espelha o send-worker do messaging.
5. **Mídia: presign no SERVIÇO** (≠ hub, que delega ao BFF — aqui o serviço é o dono do bucket
   p/ archiver/import/presigned GET da Meta). Key SERVER-SIDE `marketing/<contentId|inbox>/<uuid>.<ext>`;
   presigned PUT assina **content-type + content-length** (teto real, não consultivo); `confirm`
   confere via HEAD (tamanho divergente → apaga + 400). Bucket R2 **privado** próprio
   (`R2_MARKETING_BUCKET`); a URL que a Meta baixa é presigned GET de 24h — nada público permanente.
   ⚠️ CORS do bucket precisa das origens do marketing-app ANTES do 1º upload (gotcha clássico).
6. **Tokens sociais NUNCA em claro** (fase F1+): colunas `*_enc` (AES-256-GCM versionado
   `v1.<iv>.<tag>.<ct>`, chave `MARKETING_TOKEN_ENC_KEY`); views nunca expõem `_enc`; logger redige.
7. **Concorrência otimista**: `contents`/`publications`/`social_accounts` têm `version`; update
   confere e 0 linhas → `CONCURRENCY_CONFLICT` (409).
8. **Sem FK cross-schema**: `created_by`/`owner_user_id` são snapshots do auth (equipe), com
   `*_name` snapshot (padrão hub).

## Arquitetura (DDD + Hexagonal — espelha hub/messaging)

```
src/
├── domain/            # stage machine, checklist-templates, regras de publicação (PUROS),
│   └── ports/         #   repos + media-store (R2)
├── application/       # idea/content/publication/media services + promote-idea + mappers/views
├── infrastructure/
│   ├── config/env.ts  # Zod fail-fast (R2_* opcionais → presign 503 amigável)
│   ├── persistence/drizzle/  # schema (12 tabelas), db, pg-errors, migrations/, 6 repos
│   ├── gateways/r2/   # R2MediaStore (@aws-sdk, presign PUT/GET + HEAD)
│   └── observability/sentry.ts
├── interfaces/http/   # server, routes/{health,ideas,contents,publications,media}, dtos (TypeBox),
│                      #   auth (x-internal-token + X-Auth-User-* fail-closed staff+), error-handler
├── composition-root.ts (DI + retenção com advisory lock `61120324050607091`) · index.ts
tests/  fakes/in-memory.ts · unit/ (stage, publication-rules) · integration/ (auth, ideas,
        contents, publications, media) — 49 testes via app.handle
```

## Comandos (de dentro de `packages/marketing`)

| Ação | Comando |
| --- | --- |
| Dev (watch) | `bun run dev` (porta 3011) |
| Testes | `bun test` (**sandbox off** — gotcha do monorepo) |
| Typecheck | `bun run typecheck` |
| Migrations | `bun run db:generate` / `db:migrate` |
| Lint | `bun run check` / `check:fix` |

## HTTP (tudo via gateway; JWT staff+ verificado lá; aqui `x-internal-token` + X-Auth fail-closed)

Saúde: `GET /health` · `GET /readyz` (banco). Rotas de negócio (rate limits no gateway:
GET 300/min, escrita 120/min, corpo 512KB):

- Ideias: `GET|POST /marketing/ideas` · `PATCH /marketing/ideas/:id` (status só anda
  `inbox ↔ discarded`; `accepted` é EXCLUSIVO da promoção → 409) ·
  `POST /marketing/ideas/:id/promote` `{contentType, title?}` (cria conteúdo + arquiva a ideia;
  exige status `inbox` e o claim é CONDICIONAL no banco — dupla promoção/corrida → 409
  `IDEA_NOT_PROMOTABLE`)
- Conteúdos: `GET|POST /marketing/contents` (lista = kanban c/ badges checklist/comentários/redes) ·
  `GET /marketing/contents/stage-counts` → `{counts}` (painel; agregado no banco, não pagina) ·
  `GET|PATCH /marketing/contents/:id` (PATCH exige `version`) ·
  `POST …/:id/stage` `{to}` · `POST …/:id/cancel` (cancela JUNTO as publicações ainda
  canceláveis) · `POST …/:id/checklist` ·
  `PATCH|DELETE /marketing/checklist/:id` · `POST …/:id/comments`
- Publicações: `POST /marketing/contents/:id/publications` `{formats[], caption?}` (dedupe de
  formatos; formato com publicação ATIVA no conteúdo → 409; insert único) ·
  `GET|PATCH /marketing/publications/:id` (PATCH não anula `scheduledAt` de agendada → 409;
  cancele ou reagende) · `POST …/:id/schedule` `{scheduledAt}` (janela válida: nada no
  passado ±5min, teto de 2 anos → 400) ·
  `POST …/:id/cancel` · `POST …/:id/mark-published` `{externalUrl?, externalPostId?}`
- Carrossel (F3): `PUT /marketing/publications/:id/assets` `{assetIds[]}` (1..10, PUT semântico —
  a lista enviada É o estado final, na ordem do post; cada asset precisa estar `ready` e ser do
  MESMO conteúdo → 400; publicação não editável → 409). A view de UMA publicação
  (`GET /publications/:id` e retornos de escrita) traz `assetIds` na ordem; listagens trazem `[]`.
  ⚠️ gateway: `marketing-write` ganhou o método `PUT`.
- Publicações (F1/F2): `GET /marketing/publications` (janela `from/to` OPCIONAL sobre
  `scheduled_at` [ambas presentes: from<=to, máx 92d → 400] + `status` CSV validado + `network`/
  `format`/`contentId`, limit 1..200, itens = PublicationView + `contentTitle`/`contentType`) ·
  PATCH aceita `socialAccountId` (binding do modo auto) · `publish_mode: 'auto'` LIBERADO p/
  yt_* quando o publisher está montado E há conta conectada com escopos (senão 409); PÓS-upload
  (`provider_session.videoId` presente, view expõe `hasRemoteVideo`): PATCH de metadados → 409
  (Studio ou cancelar/recriar), reagendar → fase `resync_publish_at` (worker sincroniza o
  publishAt via videos.update), cancelar → aviso de limpeza manual no `lastError`
- Contas/OAuth (F1): `POST /marketing/oauth/:network/start` (só `youtube`; admin+ no gateway) →
  `{authorizeUrl}` · `GET /marketing/oauth/:network/callback` (pública; state single-use ATÔMICO;
  browser → SEMPRE 302 p/ `MARKETING_APP_URL/conexoes?connected=…|error=<code>`) ·
  `GET /marketing/accounts` → `{items (views SEM _enc, com canAutoPublish), autoCapableNetworks}` ·
  `DELETE /marketing/accounts/:id` (revoke best-effort + `revoked`, linha PRESERVADA — FK das métricas)
- Drive (F1): `GET /marketing/drive/files?q&pageToken` (picker; sem conta → 409
  ACCOUNT_NOT_CONNECTED; OAuth off → 503 OAUTH_NOT_CONFIGURED) · `POST /marketing/media/import`
  `{driveFileId|driveUrl, contentId?, kind?}` (id extraído por REGEX — a URL nunca é fetchada;
  asset nasce `importing`, o media-transfer-worker faz o stream Drive→R2)
- Métricas (F2): `GET /marketing/metrics/summary` → `{account (último snapshot do canal),
  topPublications (últimas publicadas + último snapshot, ordenadas por views)}` ·
  `GET /marketing/publications/:id/metrics` → `{snapshots}` (série, 30 últimos)
- Mídia: `POST /marketing/media/presign` `{filename,contentType,sizeBytes,contentId?,kind?}` →
  `{assetId, uploadUrl, contentType}` (PUT direto browser→R2) · `POST /marketing/media/:id/confirm` ·
  `GET /marketing/media/:id/resolve` → `{url}` (presigned GET) · `GET /marketing/media` ·
  `PATCH /marketing/media/:id` (vincular a conteúdo/kind). `contentId` inexistente em
  presign/PATCH → 404 (validado antes da FK; id lixo nunca vira 500)

## Workers (processo único, iniciados no composition-root — molde messaging)

Claim `FOR UPDATE SKIP LOCKED` + lease; shutdown para os workers ANTES de fechar o pool.
1. **publisher-worker** (30s): ramo MANUAL — `scheduled`(manual) vencida → `awaiting_manual` +
   lembrete WhatsApp por fone (`/messaging/send` via gateway, consumer HMAC `marketing`,
   Idempotency-Key `marketing-reminder-<pubId>-<fone>`); teto de tentativas desiste do AVISO mas
   mantém awaiting_manual (Painel é o fallback). Ramo AUTO (F2) — claim de `auto` agendadas dentro
   do LEAD (`YT_UPLOAD_LEAD_HOURS`) → `publishing` + publisher da rede; outcomes: published /
   pending (repoll SEM gastar tentativa — publishAt nativo) / deferred (quota → vira do dia PT) /
   retryable (backoff) / permanent (failed). **Idempotência**: checkpoint no `provider_session`
   ANTES/DEPOIS de cada side-effect; com uploadUri salvo o retry consulta a sessão e retoma —
   `videos.insert` NUNCA é recriado.
2. **media-transfer-worker** (15s): assets `importing` — token fresco → metadado revalidado →
   stream Drive→R2 (`MediaStore.put`, client S3 com timeout próprio de 30min) → head confere →
   `ready`; 403/404/conta desconectada = failed permanente; transitório = backoff.
3. **token-refresh-worker** (10min): renova PROATIVAMENTE tokens vencendo em
   `TOKEN_REFRESH_MARGIN_MS`; `invalid_grant` → `needs_reauth` + log error (Sentry).
4. **yt-metrics-worker** (6h, advisory lock `61120324050607092`): snapshot do canal
   (channels.list, 1 unit) + views/likes/comments das publicadas recentes (videos.list, lotes de
   50 ids = 1 unit) nas tabelas append-only; respeita `metrics_last_collected_at`.

Quota do YouTube: `provider_quota_usage (provider, day PT)` + `YtQuotaGuard` — tetos
`YT_QUOTA_BUDGET_UNITS` (9000) e `YT_UPLOAD_DAILY_CAP` (20); `YT_VIDEOS_INSERT_UNITS` default 1600
(fail-safe modelo antigo; projetos no modelo novo → setar 1). Estouro = deferred p/ meia-noite PT.

Gateway (`gateway.config.ts`): `marketing-read`/`marketing-write` (staff+ wildcards) +
`marketing-accounts-write`/`marketing-oauth-start` (admin+ com `audit`, vencem o wildcard) +
`marketing-oauth-callback` (pública — o serviço validará o state single-use). Envs no gateway:
`MARKETING_URL` + `MARKETING_INTERNAL_TOKEN` (= `INTERNAL_API_TOKEN` daqui). ⚠️ Ao ir a PROD,
adicionar `MARKETING_INTERNAL_TOKEN` na lista `PROD_REQUIRED_SECRETS` do env.ts do gateway.

## Banco (schema `marketing`, journal `marketing_migrations`)

12 tabelas: `ideas`, `contents` (+`content_stage_events`), `checklist_items`, `comments`,
`media_assets` (r2_key/drive_file_id + status pending_upload|importing|ready|archiving|archived|failed),
`social_accounts` (tokens `_enc`), `publications` (+`publication_assets` p/ carrossel),
`metric_publication_snapshots`/`metric_account_snapshots` (append-only), `oauth_states`
(single-use, TTL 10min). Retenção periódica: oauth_states vencidos, snapshots >
`METRICS_RETENTION_DAYS` (730d), stage_events > 365d.

## Config (env.ts)

Obrigatórias: `DATABASE_URL`, `INTERNAL_API_TOKEN` (≥16). Opcionais: `DATABASE_SSL`
(default false — Railway private networking dispensa TLS), `R2_ACCOUNT_ID` /
`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_MARKETING_BUCKET` (ausentes → presign 503
`MEDIA_NOT_CONFIGURED`, nunca quebra o boot), `MARKETING_MAX_UPLOAD_BYTES` (2GB),
`R2_PRESIGN_PUT_TTL_SECONDS` (1h) / `R2_PRESIGN_GET_TTL_SECONDS` (24h), `REQUIRE_STAFF`
(default true; `false` só em dev sem gateway), `SENTRY_DSN`, retenções.

**OAuth Google (grupo ATÔMICO — qualquer um ausente → OAuth/Drive/publisher 503, boot ok):**
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (client Web; redirect URI
`<OAUTH_PUBLIC_BASE_URL>/marketing/oauth/youtube/callback`; APIs Drive + YouTube Data v3
habilitadas; ⚠️ PUBLICAR o app OAuth — em "Testing" o refresh expira em 7 dias),
`MARKETING_TOKEN_ENC_KEY` (32B base64 — `openssl rand -base64 32`), `OAUTH_PUBLIC_BASE_URL`,
`MARKETING_APP_URL`. O publisher automático do YouTube exige o grupo Google + R2.
**Lembrete WhatsApp:** `MARKETING_HMAC_SECRET` (≥16; MESMO valor no gateway — ausente = lembrete
desligado), `MARKETING_REMINDER_PHONES` (CSV E.164 DDI 55; vazio = no-op logado), `GATEWAY_URL`.
**Knobs** (defaults sensatos, ver .env.example): `PUBLISHER_*`, `REMINDER_*`, `MEDIA_TRANSFER_*`,
`TOKEN_REFRESH_*`, `YT_UPLOAD_LEAD_HOURS` (6), `YT_UPLOAD_CHUNK_BYTES` (8MiB, múltiplo de 256KB),
`YT_QUOTA_BUDGET_UNITS` (9000), `YT_VIDEOS_INSERT_UNITS` (1600), `YT_UPLOAD_DAILY_CAP` (20),
`YT_METRICS_INTERVAL_MS` (6h), `YT_METRICS_MAX_AGE_DAYS` (90).

## Deploy (Railway) — PROVISIONADO 07/07/2026

Dockerfile (contexto raiz) + railway.json (preDeploy `db:migrate`, healthcheck `/readyz`,
watchPatterns marketing+core). Serviço `marketing` criado em **staging E produção**
(id `7b8a87e6…`, instâncias com `railwayConfigFile` apontado, repo conectado, triggers
nativos DESARMADOS — deploy só via CI/serviceInstanceDeployV2, padrão da frota). Envs setadas
nos 2 ambientes: `DATABASE_URL` (ref `${{Postgres.DATABASE_URL}}`), `INTERNAL_API_TOKEN`
(gerado, distinto por ambiente; espelhado no `MARKETING_INTERNAL_TOKEN` do gateway),
`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` (refs `${{admin.R2_*}}` — mesmo token S3 da conta),
`R2_MARKETING_BUCKET` = `testes-marketing` (staging) / `sistemazero-marketing` (prod). Buckets
R2 criados com CORS das origens do app. CI: SVC_IDs preenchidos + cases descomentados.

## Gotchas (mantenha ao editar)

1. **postgres.js + Bun**: em `sql` cru, `Date` como param SÓ via `.toISOString()` (escrita) e
   coagir string→Date na leitura (bug documentado do monorepo; a retenção daqui já faz).
2. **23505 via `error.cause`** (Drizzle ≥0.44): usar `pg-errors.ts` (`isUniqueViolation`/`escapeLike`).
3. **uuid validado na borda** (DTOs TypeBox) — id lixo → 400, nunca 22P02→500.
4. **`x-internal-token` é defesa em profundidade**, não a auth: o RBAC real é do gateway.
5. Testes via `app.handle` com fakes in-memory (`tests/helpers.ts` monta a app inteira sem banco).

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Mudou schema? `db:generate` + commitou a migration (confira o journal).
- [ ] Mudou contrato de rota? Atualizou este CLAUDE.md (e o gateway.config, se a rota mudou).

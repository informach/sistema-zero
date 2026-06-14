# CLAUDE.md — @sistemazero/hub

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod,
> Bun, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender padrões**,
> use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

**Comunidade em FÓRUM** (só back-end/API; os front-ends são o **[@sistemazero/community](../community)**
e o **[@sistemazero/community-kids](../community-kids)**, que consomem via api-gateway). Modelo de
fórum (NÃO chat): **servidores (`spaces`) → canais (`channels`) → tópicos (`threads`) →
comentários (`comments`)** + **reações** (emoji) + **moderação** (pré-moderação + reativa).
Tudo segregado por **audiência** (`adult` | `kids`), espelhando as duas vitrines. Runtime: **Bun**.
Linguagem: **TS (ESM)**. Framework HTTP: **Elysia**. Porta **3010**.

> Estado: **back-end COMPLETO e testado** (estrutura admin de spaces/canais + leitura do aluno
> com resolução de acesso + tópicos/comentários com pré-moderação + reações + badge de novidades +
> denúncias + fila de aprovação + ocultar/apagar/fixar/trancar + silenciar/banir) — **31 testes**
> (5 arquivos de integração). Migration `0000_luxuriant_krista_starr` (schema `hub` + 11 tabelas).
> **PENDENTES:** os front-ends (`/comunidade` no community/kids, editor de tópico, UI admin de
> moderação), o fluxo de **anexos UGC** (R2) e os **webhooks de concessão/revogação** — essas duas
> últimas já têm **rota PROVISIONADA no gateway** (`/hub/attachments*`, `/hub/webhooks/grant`) e
> **infra pronta** (tabela `attachments`, `processed_webhooks` + retenção, `GATEWAY_HMAC_SECRET`,
> limites de anexo no env), mas **as rotas inbound ainda NÃO estão montadas no serviço** (`server.ts`
> só monta health/spaces/threads/reactions/report/admin/moderation). Deploy no Railway ainda não feito.

## Conceito central (decisões travadas)

1. **Hierarquia fórum:** `space` (servidor, ex.: "Comunidade do Curso X") → `channel` (fórum
   temático dentro do space) → `thread` (tópico/postagem, corpo em **Markdown**) → `comment`
   (resposta cronológica). Sem chat ao vivo; o "novidades" é um badge calculado na carga
   (`read_state.lastSeenAt` × `max(thread.lastActivityAt)`), não tempo-real.

2. **Acesso = `accessConfig` (jsonb, snapshot)** em space e canal —
   `domain/access/access-config.ts`. Três visibilidades:
   - `public` → qualquer aluno com **conta ativa**.
   - `course_gated` → quem tem **matrícula ativa** em ALGUM dos `courses` (slugs no members) **OU**
     a chave-mestra `all_courses` (só vitrine adult). Resolvido por **S2S ao members** (ver Acesso).
   - `role_gated` → quem tem um dos `roles` (RBAC do auth: superadmin/admin/staff/…).
   No **canal**, `accessConfig = null` **HERDA** o do space; quando definido, o veredito é feito em
   **AND** com o do space — **o canal só ESTREITA o acesso, nunca amplia** (invariante de segurança).

3. **Pré-moderação:** conteúdo (tópico/comentário) de **não-staff** em recurso com
   `requiresApproval=true` nasce `pending` — some para os colegas até um staff **aprovar**; o **autor
   vê o próprio pendente**. Staff publica `visible` direto. Resolução de `requiresApproval`: canal
   `null` herda do space. **Kids nasce com pré-moderação ligada por default** (`requiresApproval ??
   audience === 'kids'` na criação do space — decisão de segurança).

4. **Concorrência otimista:** `spaces`/`channels`/`threads`/`comments` têm coluna `version`; update
   confere a versão e bate → **`ConcurrencyConflict` (409)** se outra escrita venceu. Reorder de
   spaces/canais idem.

5. **Sem FK cross-schema:** o `hub` é dono do schema `hub` no Postgres compartilhado; `author_id`/
   `user_id`/`reporter_id`/`courses[]`/`roles[]` são **snapshots** do auth/members (sem FK para fora).

6. **Reação = toggle idempotente** por (alvo, usuário, emoji) — unique
   `reactions_target_user_emoji_uq`. Emoji limitado a ≤16 chars; **kids** tem **allowlist curada**
   (`domain/reactions/emoji.ts`, 12 emojis); adulto aceita qualquer emoji curto.

7. **Mute × Ban** (`mutes_bans`): **mute** = não posta (mas pode reagir); **ban** = não posta NEM
   reage. Escopo por **canal** (`channelId` preenchido) ou **servidor inteiro** (`channelId = null`);
   `expiresAt = null` = permanente. O `ThreadService`/`ReactionService` vetam na escrita
   (`UserMuted`/`UserBanned` → 403).

8. **Estados de conteúdo** (`content_status`): `pending` → `visible` (aprovar) / `rejected` (recusar);
   qualquer estado → `hidden` (oculta, reversível) / `deleted` (apaga, auditado). `pin`/`unpin` e
   `lock`/`unlock` são flags ortogonais (`is_pinned`/`is_locked`). Toda ação de moderação grava
   auditoria em `moderation_actions` (**best-effort** — falha de log não derruba a ação).

## Arquitetura (DDD + Hexagonal — espelha members/catalog/auth)

```
src/
├── domain/                      # Núcleo puro (sem framework)
│   ├── shared/errors.ts         #   DomainError base
│   ├── hub-errors.ts            #   erros tipados (404/403/400/409 — ver error-handler)
│   ├── access/access-config.ts  #   Visibility, AccessConfig, normalizeAccessConfig
│   ├── space/space.ts           #   tipos Space/Channel/Audience/PostingPolicy
│   ├── thread/thread.ts         #   tipos Thread/Comment
│   ├── reactions/emoji.ts       #   isAllowedEmoji() + KIDS_EMOJI_ALLOWLIST
│   ├── moderation/mute-ban.ts   #   MuteBanKind
│   └── ports/                   #   PORTAS (interfaces): community-admin/community-read/
│                                #     thread/reaction/moderation/read-state repos + members-gateway
├── application/                 # Casos de uso (orquestram as portas)
│   ├── read-community/          #   listSpaces/getSpace/listChannels (com acesso + novidades)
│   ├── threads/                 #   create/list/get/edit thread + comment (pré-moderação, vetos)
│   ├── reactions/ read-state/   #   react/unreact (toggle) + markSeen (badge)
│   ├── moderation/              #   moderation.service (fila/hide/delete/pin/lock/mute/ban) + report.service
│   ├── community-admin/         #   SpaceAdminService + ChannelAdminService (CRUD + reorder)
│   ├── access/                  #   AccessResolutionService (RBAC + course_gated S2S + micro-cache)
│   ├── mappers/                 #   domain → views HTTP (public/admin/moderation/thread)
│   ├── cursor.ts  slug.ts       #   paginação opaca + threadSlug(title, id)
├── infrastructure/
│   ├── config/env.ts            #   Zod fail-fast (ver Config)
│   ├── cache/micro-cache.ts     #   K→V TTL com invalidateUser()
│   ├── persistence/drizzle/     #   schema.ts + db.ts + pg-errors.ts + migrations/ + 7 repos
│   ├── gateways/members-http.gateway.ts  #  S2S → POST /members/internal/access-check
│   └── observability/sentry.ts  #   initSentry/withSentryMirror
├── interfaces/http/
│   ├── server.ts                #   app Elysia (teto de corpo + raw-body p/ HMAC + erro central + Swagger fora de prod)
│   ├── routes/                  #   health/spaces/threads/reactions/report/admin/moderation
│   ├── dtos.ts                  #   TypeBox (params/query/body) — uuid validado na borda
│   ├── auth.ts                  #   requireAdmin/assertInternalCaller/resolveUserId
│   ├── error-handler.ts  raw-body.ts  webhook-auth.ts
├── composition-root.ts          # injeção de dependências (ÚNICO lugar que instancia adapters) + retenção
└── index.ts                     # loadEnv → createApplication → start (SIGINT/SIGTERM, graceful)
```

**Regra de ouro:** `interfaces → application → domain`; `infrastructure` implementa as portas do
domínio. O domínio NUNCA importa de infra/app. `composition-root.ts` é fábrica pura (sem container DI).

## Comandos (de dentro de `packages/hub`)

| Ação | Comando |
| --- | --- |
| Dev (watch) | `bun run dev` |
| Start | `bun run start` |
| Testes | `bun test` (rode com **sandbox off** — ver gotchas dos demais pacotes) |
| Typecheck | `bun run typecheck` (ou da raiz: `bun run --filter '@sistemazero/hub' typecheck`) |
| Lint (Biome) | `bun run check` / `check:fix` |
| Migrations | `bun run db:generate` / `db:migrate` / `db:push` |

## HTTP (todas as rotas são consumidas via api-gateway)

O gateway autentica (JWT/HMAC), aplica RBAC + rate limit e injeta os headers confiáveis
(`X-Auth-User-*` + `x-internal-token`). O serviço **exige o `x-internal-token`** (defesa em
profundidade) em TODAS as rotas de aluno e admin; o RBAC real é do gateway, o serviço confere os
`X-Auth-User-*` (`requireAdmin`, controlável por `REQUIRE_ADMIN` em dev). Os rate limits abaixo são
os do gateway (`gateway.config.ts`).

**Saúde** (sem auth): `GET /health` (liveness), `GET /readyz` (banco alcançável — healthcheck Railway).

**Aluno** (JWT + conta ativa + `x-internal-token`):

| Método | Path | O quê | Rate (gw) |
| --- | --- | --- | --- |
| GET | `/hub/spaces` | lista servidores visíveis (`?audience=adult\|kids`) | 300/min |
| GET | `/hub/spaces/:slug` | detalhe do servidor | 300/min |
| GET | `/hub/spaces/:slug/channels` | canais do servidor (com badge de novidades) | 300/min |
| GET | `/hub/channels/:id/threads` | tópicos do canal (cursor `?cursor=&limit=`) | 300/min |
| POST | `/hub/channels/:id/threads` | cria tópico `{title, body}` (pré-moderação) | 60/min · 64KB |
| GET | `/hub/threads/:id` | detalhe do tópico | 300/min |
| PATCH | `/hub/threads/:id` | edita tópico (autor ou staff) `{body}` | 60/min · 64KB |
| GET | `/hub/threads/:id/comments` | comentários (cursor cronológico) | 300/min |
| POST | `/hub/threads/:id/comments` | comenta `{body, replyToId?}` | 60/min · 64KB |
| PATCH | `/hub/comments/:id` | edita comentário (autor) | 60/min · 64KB |
| POST/DELETE | `/hub/threads/:id/reactions[/:emoji]` | adiciona/remove reação | 120/min |
| POST/DELETE | `/hub/comments/:id/reactions[/:emoji]` | idem comentário | 120/min |
| POST | `/hub/channels/:id/seen` | marca canal como visto (badge) | 120/min |
| POST | `/hub/threads/:id/report` · `/hub/comments/:id/report` | denúncia `{reason}` | 120/min |

**Admin** (`/hub/admin/*` — JWT + RBAC: LEITURA staff+, ESCRITA admin+; `x-internal-token`).
Estrutura (`admin.routes.ts`): `GET/POST /hub/admin/spaces`, `POST /hub/admin/spaces/reorder`,
`GET/PATCH/DELETE /hub/admin/spaces/:id`, `POST /hub/admin/spaces/:id/channels`,
`POST /hub/admin/spaces/:id/channels/reorder`, `PATCH/DELETE /hub/admin/channels/:id`. Moderação
(`moderation.routes.ts`): `GET /hub/admin/pending`, `POST /hub/admin/threads/:id/{approve,reject,
hide,delete,pin,unpin,lock,unlock}` e `…/comments/:id/{approve,reject,hide,delete}`,
`GET /hub/admin/reports` + `POST /hub/admin/reports/:id/resolve` `{action}`,
`POST /hub/admin/{mutes,bans}` + `POST /hub/admin/{mutes,bans}/remove`, `GET /hub/admin/mutes-bans`.
> ⚠️ Mute/ban são `/mutes` e `/bans` (não `/mute`/`/unmute`); remoção é `POST …/remove`, não DELETE.

**Provisionado no gateway, NÃO montado no serviço ainda:** `/hub/attachments` (registro de metadado
de anexo), `/hub/attachments/:id/resolve` (devolve o `storageRef` ao BFF) e `/hub/webhooks/grant`
(HMAC `resign` — concessão/revogação invalida o cache de acesso). Adicione a rota no `server.ts` +
fatia de aplicação quando for implementar — o env e as tabelas já existem.

## Modelo (schema `hub`, Postgres compartilhado `sistemazero` :5433)

11 tabelas, `pgSchema('hub')`, migration `0000`. Enums: `audience`, `space_status`, `visibility`,
`posting_policy`, `content_status`, `reaction_target`, `report_target`, `report_status`,
`moderation_kind`, `mute_ban_kind`, `attachment_kind`, `attachment_status`.

- **`spaces`** — servidor (`slug` único, `audience`, `accessConfig` jsonb, `requiresApproval`,
  `sortOrder`, `status active|archived`, `version`).
- **`channels`** — canal (FK→space cascade, `slug` único no space, `accessConfig` **nullable=herda**,
  `postingPolicy members|staff_only`, `requiresApproval` **nullable=herda**, `version`).
- **`threads`** — tópico (FK→channel, `authorId`, `title`, `slug` único no canal, `body` Markdown,
  `isPinned`, `isLocked`, `status`, `commentCount`, `lastActivityAt`, `version`). Índices:
  `(channel,status,lastActivity)` p/ listagem, `(author,status)` p/ "meus pendentes".
- **`comments`** — comentário (FK→thread, `authorId`, `body`, `status`, `replyToId`, `version`).
- **`attachments`** — metadado UGC (`ownerId`, `threadId`/`commentId` nullable, `kind`,
  `storageRef = r2ugc:<key>` — nunca exposto ao browser, `mime`/`sizeBytes`/dims/`durationSeconds`,
  `status pending_upload|ready`).
- **`reactions`** — toggle (unique `(targetType,targetId,userId,emoji)`).
- **`read_state`** — `lastSeenAt` por (usuário, canal) — unique.
- **`reports`** — denúncia (`targetType`, `spaceId`, `reporterId`, `reason`, `status
  open|resolved|dismissed`).
- **`moderation_actions`** — auditoria (kind + alvos + `moderatorId` + `expiresAt`).
- **`mutes_bans`** — silenciamento/banimento ativo (`userId`, `spaceId`, `channelId` nullable,
  `kind`, `expiresAt` nullable).
- **`processed_webhooks`** — dedupe de webhooks de entrada (`deliveryId` PK, retenção configurável).

## Acesso & integrações

**S2S members** (`infrastructure/gateways/members-http.gateway.ts`): para `course_gated`, o
`AccessResolutionService` chama `POST {MEMBERS_BASE_URL}/members/internal/access-check`
`{userId, courseRefs}` → `{granted[], hasMaster}`, com `x-internal-token = MEMBERS_INTERNAL_TOKEN`,
timeout `MEMBERS_REQUEST_TIMEOUT_MS` (5s default) e **fail-closed** (erro → sem acesso). Resultado em
**micro-cache** por `(userId, spaceId/courseRefs)` com TTL `accessCacheTtlMs` (30s prod / 0 fora);
`invalidateUser()` existe p/ o futuro webhook de grant/revoke.

**R2 (anexos UGC):** o hub só guarda metadado; o presign/upload/HEAD vivem no BFF (member-shell/
community). Buckets `testes-ugc` (dev) / `comunidade-sistema-zero-ugc` (prod). **Fluxo ainda não
ligado** (ver Estado).

**Sentry:** `observability/sentry.ts` (`SENTRY_DSN` ausente = desligado); `withSentryMirror` espelha
o logger.

## Config (env.ts — Zod fail-fast)

- **Sempre:** `DATABASE_URL`, `GATEWAY_HMAC_SECRET` (≥16). `HOST` default `::` (dual-stack — private
  networking IPv6 do Railway). `PORT` 3010. `MAX_REQUEST_BODY_BYTES` 64KB.
- **Obrigatórios em produção** (refine): `INTERNAL_API_TOKEN` (≥16 — o `x-internal-token` que o
  gateway injeta, MESMO valor do `HUB_INTERNAL_TOKEN` do gateway) e `MEMBERS_INTERNAL_TOKEN` (≥16 —
  o members exige na rota S2S).
- Outros: `MEMBERS_BASE_URL`, `ACCESS_CACHE_TTL_MS`, `HMAC_TOLERANCE_SECONDS` (300), `REQUIRE_ADMIN`
  (default `true`; `false` em dev sem gateway), limites de anexo por tipo
  (`ATTACHMENT_MAX_{IMAGE,PDF,DOCUMENT,AUDIO,VIDEO}_BYTES` + `ATTACHMENT_MAX_PER_POST`),
  `PROCESSED_WEBHOOKS_RETENTION_DAYS` (30) + `RETENTION_CLEANUP_INTERVAL_MS` (6h) +
  `ATTACHMENT_ORPHAN_RETENTION_HOURS` (24 — poda anexos `pending_upload` nunca vinculados; o
  objeto no R2 é coletado pelo BFF, dono do bucket).

Segredos que precisam **bater entre serviços** (ver `.env.example` quando criado):
`HUB_INTERNAL_TOKEN` (gateway) = `INTERNAL_API_TOKEN` (hub); `MEMBERS_INTERNAL_TOKEN` (hub) =
`INTERNAL_API_TOKEN` (members); `GATEWAY_HMAC_SECRET` (gateway = hub, p/ os webhooks de grant).

## Deploy

`Dockerfile` (oven/bun, context = raiz do repo) + `railway.json` (`healthcheckPath: /readyz`,
`preDeployCommand: db:migrate`, watchPatterns hub+core). `drizzle.config.ts` usa
`schemaFilter: ['hub']` + journal próprio `hub_migrations` (NÃO compartilhe `__drizzle_migrations`).
Boot: `loadEnv` (fail-fast) → `createApplication` → `start` (listen `::`), com retenção do
`processed_webhooks` num ciclo de 6h sob **advisory xact-lock `51020304050607081`** (único no banco
compartilhado — members=`30792297…`, payments=`8103081227979411315`; nunca reusar a chave). `/readyz`
só promove a réplica quando o `select 1` responde.

## Testes (31, `bun test`)

Integração (`tests/integration/`): `access-read` (9 — public/course_gated/role_gated + herança AND +
cache), `admin-spaces` (9 — CRUD + reorder + concorrência), `moderation` (6 — fila/hide/mute/ban),
`reactions` (6 — toggle + badge), `threads` (7 — criação/pré-moderação/comentário). Fakes
in-memory das portas em `tests/fakes/in-memory.ts`; montagem via `tests/helpers.ts`.

## Gotchas (mantenha ao editar)

1. **Herança + AND do acesso:** mexeu em `access-resolution`? O canal só ESTREITA (AND com o space),
   `null` herda. Quebrar isso vaza conteúdo gated.
2. **Pré-moderação kids:** space kids nasce `requiresApproval=true` por default na rota — não remova.
3. **`version` (concorrência otimista):** toda escrita de space/channel/thread/comment confere a
   versão → 409 `ConcurrencyConflict`. Repos novos seguem o padrão.
4. **23505 via `error.cause`** (Drizzle ≥0.44): use `isUniqueViolation`/`escapeLike` de
   `persistence/drizzle/pg-errors.ts` — o `code` não está no topo do erro.
5. **uuid validado na borda** (DTOs TypeBox): id lixo → 400, nunca `22P02`→500.
6. **`x-internal-token` é defesa em profundidade**, não a auth: o gateway é quem verifica o JWT e
   aplica o RBAC. Sem o token, `X-Auth-User-*` seriam forjáveis por quem alcançasse o serviço direto.
7. **Anexos + webhooks: provisionados, não montados.** Rota no gateway e tabela/env existem, mas o
   `server.ts` ainda não monta `/hub/attachments*` nem `/hub/webhooks/grant` — implemente a fatia
   antes de prometer o comportamento.

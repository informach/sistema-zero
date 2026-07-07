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

> Estado: **Fase 0 (fundação) COMPLETA e testada** — CRUD de ideias/conteúdos/etapas/checklist/
> comentários/publicações + mídia R2 (presign/confirm/resolve) + `mark-published` (modo lembrete)
> + retenção periódica. Migration `0000` (schema + 12 tabelas). 49 testes.
> **Fases seguintes (plano em `~/.claude/plans/eu-tenho-a-plataforma-wise-nebula.md`):**
> F1 = OAuth Google + import Drive→R2 + publisher-worker ramo manual (lembrete via messaging) +
> token-refresh-worker + secret-box (AES-256-GCM p/ tokens); F2 = YouTube auto (resumable +
> `status.publishAt` NATIVO, upload antecipado); F3 = Meta (container→poll→publish, carrossel) +
> metrics-worker; F4 = TikTok + archiver R2→Drive; F5 = IA (Light Copy).

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
- Mídia: `POST /marketing/media/presign` `{filename,contentType,sizeBytes,contentId?,kind?}` →
  `{assetId, uploadUrl, contentType}` (PUT direto browser→R2) · `POST /marketing/media/:id/confirm` ·
  `GET /marketing/media/:id/resolve` → `{url}` (presigned GET) · `GET /marketing/media` ·
  `PATCH /marketing/media/:id` (vincular a conteúdo/kind). `contentId` inexistente em
  presign/PATCH → 404 (validado antes da FK; id lixo nunca vira 500)

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

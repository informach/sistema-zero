# CLAUDE.md — @sistemazero/members

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, jose,
> Bun, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender padrões**,
> use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

**Área de membros** (só back-end/API; o front-end do aluno é o
**[@sistemazero/community](../community)**, que consome via api-gateway).
Dois bounded contexts no mesmo serviço: **acesso** (matrícula/entitlement — visão
materializada de "o que o aluno PODE acessar agora") e **conteúdo+progresso**
(cursos → módulos → aulas polimórficas/compostas + conclusão por aluno). Runtime:
**Bun**. Linguagem: **TS (ESM)**. Porta **3004**.

> Estado: **Fatia 1 feita e testada** (motor de acesso por webhook + consumo do aluno)
> + **gestão de acesso admin** (listar membros, detalhe, conceder manual, revogar/
> expirar/estender) + **autoria de conteúdo admin** (CRUD de cursos/módulos/aulas/blocos/
> anexos + reordenação) + **posição de vídeo/continuar de onde parou** + **quiz validado
> no servidor** + **catálogo "Todos os cursos"** + **publicação por aula**
> (`lessons.is_published` + guard de publicação do curso) + **resolução de download de
> anexo** (rota `/resolve`; view do aluno SEM url) + **classificação do curso**
> (`course_ratings`, estilo Udemy — ver rota abaixo) — **101 testes**. Migrations `0000`
> (schema `members`), `0001` (`lesson_progress`), `0002` (`quiz_attempts`), `0003`
> (`lessons.is_published`) e `0004` (`course_ratings`) — **aplicadas** no Postgres
> compartilhado (`sistemazero`, :5433).

## Conceito central (decisões travadas com o usuário)

1. **Entitlement = direito de acesso, GENÉRICO por tipo de produto** (`course |
   community | download | …`), separado do "o que comprou" (isso é do payments). É
   uma **tabela materializada** alimentada pelos eventos do payments. Padrão Stripe
   Entitlements + "pedido imutável" do e-commerce.
2. **Checagem de acesso = leitura LOCAL** (`status='active' AND (expiresAt IS NULL OR
   expiresAt > now)`). Sem chamar ninguém no caminho quente. Vitalício → `expiresAt`
   null; assinatura → `expiresAt` estendido a cada ciclo + carência. Curso **`archived`
   mantém o acesso** de quem já tem matrícula (só `draft` bloqueia) — `isCourseAccessible`.
   Havendo >1 matrícula ativa p/ o mesmo curso, o detalhe escolhe a **mais forte**
   (vitalícia > validade mais distante).
3. **Snapshot congelado no grant**: resolve no catálogo o que a oferta dá direito e
   **grava** (offer/product/sku/fulfillment/courseRef) na matrícula. Mudar a oferta
   depois NÃO altera quem já comprou.
4. **Aluno = usuário do auth** (`userId` = `x-auth-user-id` injetado pelo gateway).
   Sem identidade duplicada.
5. **Convenção**: `entitlement.courseRef === course.slug` (e === `fulfillment.courseRef`
   do produto no catálogo). É o elo oferta→curso.
6. **Aula = lista ordenada de BLOCOS** (`lesson_blocks`, união discriminada por
   `kind`: rich_text/video/image/audio/quiz/embed). Aula composta (vídeo + interativo
   + texto) = vários blocos. Comunidade só modelada (feature é fatia seguinte).
7. **Quiz é corrigido NO SERVIDOR** (`quiz_attempts` guarda o histórico; score 0–100 por
   conjunto EXATO de choices). O GET da aula **NUNCA envia o gabarito** — a projeção
   member-facing (`toMemberFacingQuizContent`) remove `correctChoiceIds`/`explanation`
   e anexa `quizState` (lastScore/passed/attemptsCount/retryAvailableAt); correções/
   explicações só chegam na RESPOSTA do submit. Reprovou → **cooldown de 5 min**
   (`QUIZ_COOLDOWN`→429). Quiz **com `passingScore`** bloqueia o complete da aula até
   aprovar (`QUIZ_GATE_NOT_PASSED`→409); SEM `passingScore` é fixação (não bloqueia);
   aula já concluída nunca regride. Aprovado uma vez = destravado para sempre.
8. **Posição de vídeo + last-accessed** (`lesson_progress`, 1 linha por aluno+aula,
   upsert): `positionSeconds` retoma o vídeo de onde parou; `updatedAt` alimenta o
   `continueLessonId` (prioridade: última acessada não concluída > 1ª não concluída >
   1ª aula — `resolveContinueLesson`, puro) devolvido no detalhe e em "meus cursos".

## Arquitetura (DDD + Hexagonal — espelha auth/catalog)

```
src/
├── domain/           # núcleo puro
│   ├── shared/          # re-export de erros do core
│   ├── course/          # course (tipos de leitura) + lesson-block (união) + errors
│   ├── entitlement/     # entitlement.aggregate (máquina de estados) + status/snapshot/fulfillment/errors
│   ├── progress/        # computeProgress (puro)
│   ├── rating/          # course-rating (chaves de feedback + isValidRatingHalf)
│   └── ports/           # entitlement/course/progress/course-rating/processed-webhook repos + catalog-gateway
├── application/      # grant/revoke-entitlement, access/check-access, list-my-courses,
│   │                 #   list-catalog (todos os published + hasAccess), get-my-course,
│   │                 #   get-lesson, mark-lesson-complete, get-course-progress,
│   │                 #   save-course-rating/get-course-rating (classificação do curso)
│   └── mappers/         # views.ts (DTOs de saída + Date→ISO)
├── infrastructure/
│   ├── config/env       # Zod fail-fast
│   ├── persistence/drizzle/  # schema (pgSchema('members')), db, repos, migrations
│   └── gateways/        # catalog-http.gateway (resolve /catalog/offers/:slug/entitlements)
├── interfaces/http/  # server, routes/{members(aluno),webhooks(grant/subscription),health}, dtos (TypeBox), auth, webhook-auth, error-handler, raw-body
├── composition-root.ts  # injeção de dependências (ÚNICA) — async
└── index.ts             # loadEnv → createApplication → start (+ sinais)
scripts/seed-course.ts   # curso publicado (aula composta + quiz + anexo); --grant-user concede matrícula de teste
```

## Comandos (de dentro de `packages/members`)

| Comando | O quê |
|---------|-------|
| `bun run dev` / `start` | servidor (watch / produção), porta **3004** |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo) |
| `bun run db:generate` / `db:migrate` | migrations (Drizzle) |
| `bun run db:seed [--slug <s>] [--grant-user <userId>]` | popula curso (idempotente) + matrícula de teste |
| `bun run check` / `check:fix` | Biome |

**Sempre** rode `typecheck` + `bun test` + `check` antes de concluir.

## Fluxo de integração (como o acesso é concedido)

```
COMPRA: payments emite payment.paid → gateway → funil /api/webhooks/payments
  funil: markPaid → registra comprador no auth (obtém userId) → DEPOIS chama:
  funil → gateway POST /members/webhooks/grant (HMAC borda 'funnel' + resign 'gateway')
          { userId, offerRef, paymentId, paidAt, subscription? }
  members: resolve snapshot no catálogo (offerRef) → upsert matrícula(s)

ACESSO: browser logado → Bearer JWT → gateway (injeta x-auth-user-id) → members
        lê matrícula local (status + validade)

ASSINATURA cancelada/expirada → funil → POST /members/webhooks/subscription { subscriptionId }
        members acha as próprias matrículas por subscriptionId e revoga/expira.
```

- **Webhooks de entrada** verificam HMAC sobre o corpo BRUTO com `GATEWAY_HMAC_SECRET`
  (= segredo de resign do gateway), header `x-signature: t=,v1=`. HMAC é checado no
  hook `transform` (**antes** da validação do corpo → 401 antes de 422). Dedupe por
  `x-delivery-id` (tabela `processed_webhooks`). Falha de concessão → o funil devolve
  502 e o gateway re-entrega (members é idempotente pela `idempotencyKey`).
- **Grant de oferta não resolvida** (catálogo 404) → `/webhooks/grant` devolve **502 e
  NÃO marca a entrega** (auto-cura uma corrida; uma divergência de slug permanente
  aflora como falhas repetidas em vez de sumir). `granted:0` por idempotência (já
  concedido) continua sendo **200** (sucesso) — o sinal é `offerFound`, não a contagem.
- **API do aluno = defesa em profundidade**: o gateway injeta `x-internal-token`
  (`header-inject`, sobrescreve qualquer valor do cliente) e o members o exige nas
  rotas do aluno (`INTERNAL_API_TOKEN`, ver §env). Vazio em dev (sem gateway);
  **OBRIGATÓRIO em produção** (boot falha sem ele). É o que torna o `x-auth-user-id`
  confiável (só vale se passou pelo gateway). Webhooks NÃO usam (já têm HMAC).
- **Catálogo** é chamado DIRETO (S2S, `CATALOG_BASE_URL`), fora do caminho quente — a
  rota de entitlements é pública de leitura.
- **`GET /members/catalog`** (rota do aluno, JWT + `x-internal-token`): "Todos os
  cursos" — TODO curso `published` (ordenado por título) com `hasAccess` (matrícula
  ativa de curso do `x-auth-user-id`) e `salesPageUrl` (de `course.metadata.salesPageUrl`,
  string não-vazia; senão `null` → o community cai no fallback `FUNNEL_URL`). Sem
  progresso (catálogo é descoberta/venda). `ListCatalogService` (2 queries, sem N+1).
  O `metadata` ainda NÃO é editável pelos DTOs admin (setar via seed/SQL; fatia futura).
- **`PUT /members/courses/:slug/lessons/:lessonId/position`** (aluno): salva a posição
  do vídeo — body `{positionSeconds: int 0..100000}` (TypeBox), valida matrícula + aula
  pertencer ao curso; upsert em `lesson_progress`. Devolve `{lessonId, positionSeconds,
  updatedAt}`. O GET da aula devolve `positionSeconds` e o detalhe/lista devolvem
  `continueLessonId`.
- **`POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts`** (aluno): corrige
  o quiz no servidor — body `{answers: {questionId: choiceIds[]}}`. Resposta:
  `{score, passed, passingScore, attemptsCount, retryAvailableAt, questions:[{questionId,
  correct, correctChoiceIds, explanation}]}` (gabarito SÓ aqui). 429 `QUIZ_COOLDOWN` no
  retry < 5min após reprovar; 404 `QUIZ_BLOCK_NOT_FOUND` se o bloco não é quiz. O
  `POST /complete` devolve 409 `QUIZ_GATE_NOT_PASSED` se houver quiz com `passingScore`
  sem aprovação.
- **`GET|PUT /members/courses/:slug/rating`** (aluno): classificação do curso estilo Udemy —
  1 linha por (aluno, curso), tabela `course_ratings`. PUT = upsert com **overwrite puro**:
  cada passo do fluxo de modais do community manda o estado ACUMULADO — body
  `{rating: 1..5 passo 0.5 (union de literais TypeBox), comment?: ≤5000|null,
  feedbackAnswers?: {6 chaves fixas: 'yes'|'no'|'unsure'}|null}`. A nota é armazenada como
  `rating_half` = nota×2 (smallint 2..10; conversão SÓ na rota/entrada e no mapper/saída).
  Chave de feedback desconhecida é REMOVIDA pelo `normalize` default do Elysia (exact mirror);
  valor inválido → 400. GET devolve `{rating: CourseRatingView|null}`. Guard: matrícula ativa
  (`requireBySlug` — 403 sem matrícula, 404 draft). O detalhe do curso
  (`GET /members/courses/:slug`) devolve `myRating` (a UI esconde o link "Deixe uma
  classificação" quando não-nulo) e `salesPageUrl` (mesma lógica do catálogo — modal
  Compartilhar). `SaveCourseRatingService`/`GetCourseRatingService` +
  `CourseRatingRepository` (port) + `DrizzleCourseRatingRepository`.
- **`GET /members/courses/:slug/lessons/:lessonId/attachments/:attachmentId/resolve`** (aluno,
  mas consumida SÓ pelo SERVIDOR do community/BFF): devolve a localização REAL do anexo —
  `AttachmentDownloadView {label, fileType, sizeBytes, storageRef}` onde `storageRef` é
  `r2priv:<key>` (bucket R2 privado) ou URL http(s) externa/legada. Mesma régua do GET da aula
  (matrícula ativa + aula publicada + anexo pertencer à aula; `ATTACHMENT_NOT_FOUND`→404).
  **A `LessonAttachmentView` member-facing NÃO traz `url`** — a referência nunca chega ao
  browser; o community baixa do bucket privado e aplica a marca d'água (e-mail do aluno)
  antes de servir. `GetAttachmentDownloadService`.
- Cancelar/expirar assinatura é um **UPDATE atômico set-based** por `subscription_id`
  (sem load-mutate-save por linha → sem lost-update sob corrida com renovação).
- `processed_webhooks` tem `pruneProcessedBefore(date)` (retenção; chamar por cron —
  não roda no caminho quente).

## Admin (painel `@sistemazero/admin`)

Gestão de acesso pelo operador. Caminho `/members/admin/*` (distinto da API do aluno;
**sem** `x-internal-token` — segue o padrão do catálogo). RBAC real no gateway
(LEITURA → superadmin/admin/staff; ESCRITA → superadmin/admin); o serviço confere os
headers `X-Auth-User-*` via `requireAdmin` (defesa em profundidade, `env.REQUIRE_ADMIN`,
default `true`). Rotas em `interfaces/http/routes/admin.routes.ts`:

- `GET /members/admin/members` (`?status&courseRef&limit&offset`) → membros distintos
  (1 linha = 1 usuário com matrícula) com sumário (`activeCount/totalCount`, cursos,
  último grant). Identidade (nome/email) **não** vive aqui — o BFF hidrata do auth
  (`POST /auth/admin/users/batch`). `total` = nº de GRUPOS (subquery sobre o `GROUP BY`,
  nunca contar linhas); ordenação `max(granted_at) desc, user_id` (paginação estável).
- `GET /members/admin/members/:userId` → todas as matrículas (qualquer status) + progresso
  por curso. Usa `findCoursesBySlugs` (SEM filtro de status → admin vê draft/archived).
- `POST /members/admin/entitlements` (body `{mode:'offer',offerRef}` | `{mode:'course',courseRef}`,
  + `userId`, `expiresAt?`) → concessão MANUAL. Reusa o agregado (`sourceKind:'manual'`,
  `sourceId:'manual'`, key `manual:${userId}:${productId}`; curso usa `productId=course.id`),
  NÃO o motor de webhook. Idempotente; re-conceder ATIVA devolve a existente; revogada/
  expirada → 409 (use estender). `GrantManualEntitlementService`.
- `PATCH /members/admin/entitlements/:id` (body `{action:'revoke'|'expire'|'extend', expiresAt?}`)
  → carrega por id, aplica a transição no agregado, persiste com concorrência otimista
  (conflito → 409). `ManageEntitlementService`. Erros novos: `ENTITLEMENT_CONFLICT`→409,
  `OFFER_NOT_FOUND`→404.

**Autoria de conteúdo** (`interfaces/http/routes/content.routes.ts`, prefixo `/members/admin`,
coexiste com `admin.routes`). Porta de escrita SEPARADA (`ContentAdminRepository` +
`DrizzleContentAdminRepository`) do `CourseRepository` (leitura do aluno); o fake in-memory
implementa as DUAS sobre os mesmos arrays. 5 serviços (`content-admin/content-admin.service.ts`):
`CourseAdminService`/`Module…`/`Lesson…`/`Block…`/`AttachmentAdminService`. Endpoints:
- Cursos: `GET /courses` (lista, qualquer status), `POST /courses`, `GET /courses/:id` (ÁRVORE
  = curso + módulos + aulas), `PATCH/DELETE /courses/:id`. `delete` poda `lesson_completions`.
- Módulos: `POST /courses/:courseId/modules`, `PATCH/DELETE /modules/:id`,
  `POST /courses/:courseId/modules/reorder`.
- Aulas: `POST /modules/:moduleId/lessons`, `PATCH/DELETE /lessons/:id`,
  `GET /lessons/:id/content` (blocos + anexos, p/ o editor), `POST /modules/:moduleId/lessons/reorder`.
- Blocos: `POST /lessons/:lessonId/blocks`, `PATCH/DELETE /blocks/:id`, `…/blocks/reorder`.
  Conteúdo = **união discriminada por `kind`** (DTO TypeBox `LessonBlockContentSchema`).
- Anexos: `POST /lessons/:lessonId/attachments`, `PATCH/DELETE /attachments/:id`, `…/attachments/reorder`.

Slug duplicado (curso global, aula por curso) → 23505 → `DUPLICATE_SLUG`(409). Reordenar exige os
ids EXATOS dos filhos atuais (senão 400). Cursos têm `version` (concorrência otimista, last-write-wins
na prática — sem version do cliente); módulos/aulas/blocos/anexos não têm version. Erros novos:
`CONTENT_NOT_FOUND`→404, `DUPLICATE_SLUG`→409, `CONCURRENCY_CONFLICT`→409.

**Publicação por aula** (`lessons.is_published`, migration `0003`): `LessonBody` aceita
`isPublished` opcional — **ausente → `false`** (aula nova nasce RASCUNHO; aulas pré-existentes
foram backfilled `true` pelo default do DDL). Guard: criar/publicar curso com `status:'published'`
exige **≥1 aula publicada** → `NO_PUBLISHED_LESSON`(409). Visão do ALUNO filtra rascunhos em tudo:
outline (`findOutline(..., {publishedOnly:true})`), GET da aula/complete/posição de vídeo/quiz-attempt
→ 404 em aula rascunho, e o denominador do progresso usa `countPublishedLessons*` (só publicadas).
O ADMIN vê tudo (árvore com rascunhos; `countLessons` no member-detail é o total real).

## Convenções

- `verbatimModuleSyntax: true` → `import type` para tipos. Imports relativos sem extensão.
- **Não anote** `: Elysia` no retorno das factories de rota.
- Erros de domínio estendem `DomainError` (do core); mapeamento → HTTP no `error-handler`
  (ACCESS_DENIED→403, COURSE/LESSON_NOT_FOUND→404, VALIDATION_ERROR→400).
- DTOs de entrada (webhooks) em **TypeBox**. Saída via mappers (`Date`→ISO).
- Concorrência otimista na matrícula (`version` + `UPDATE … WHERE version = ?`).
- **Sem FK cross-schema**: `user_id`/`product_id`/`offer_id`/`subscription_id` são snapshots.

## Banco (schema `members`)

1 Postgres compartilhado (`sistemazero`, Docker porta **5433**), schema próprio via
`pgSchema('members')` + `schemaFilter:['members']`. **Journal próprio**
(`migrations: { table: 'members_migrations' }`) — NÃO compartilhe `__drizzle_migrations`
entre pacotes (a dedupe por `created_at` pularia migrations). A migration faz
`CREATE SCHEMA "members"`. Tabelas: `courses`, `modules`, `lessons`, `lesson_blocks`,
`lesson_attachments`, `entitlements`, `lesson_completions`, `lesson_progress` (posição
de vídeo/last-accessed — migration `0001`), `quiz_attempts` (histórico de quiz —
migration `0002`), `course_ratings` (classificação do curso, UNIQUE user+course —
migration `0004`), `processed_webhooks`.

## Pendente (fatias seguintes)

- ~~Upload de assets~~ **resolvido fora daqui**: o painel admin sobe p/ R2/Vimeo (`/api/media/*`)
  e a autoria do members segue guardando só URLs (sem storage próprio — por design).
- Feature de comunidade (fórum/feed) — hoje só modelada como kind/accessType.
- ~~Concessão p/ comprador RECORRENTE~~ **RESOLVIDA**: o funil usa `POST /auth/internal/ensure-buyer`
  (create-or-get por e-mail → SEMPRE devolve `userId`) antes do grant.
- Drip/`fulfillment.release`; "acesso até o fim do período" no cancelamento (hoje corta na hora).
- `course_progress` materializado; fan-out direto payments→members (hoje passa pelo funil).
- `metadata.salesPageUrl` editável pelo admin (hoje os DTOs de autoria não tocam `metadata`;
  setar via seed/SQL).
- Visualização das classificações do curso (listagem no admin e/ou média de estrelas no
  catálogo) — esta fatia SÓ coleta/guarda (`course_ratings`), decisão do usuário 04/06/2026.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Sem `any` novo fora de testes; entradas validadas (TypeBox/Zod).
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de rota/webhook/config? Atualizou este `CLAUDE.md`.

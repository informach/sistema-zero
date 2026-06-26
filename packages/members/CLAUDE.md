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
> (`course_ratings`, estilo Udemy — ver rota abaixo) + **bloco e-book** (kind `ebook`:
> PDF privado que vira livro 3D no community; view do aluno SEM url + rota
> `/ebook/resolve`) + **chave-mestra `all_courses`** (06/2026: 1 matrícula cobre TODOS
> os cursos publicados, atuais e futuros — ver Conceito central) + **full review
> 06/2026 com todos os achados corrigidos** (prod-readiness `HOST ::`/`/readyz`/cron
> de retenção/timeout do catálogo; retry da extensão de assinatura; progresso sem
> conclusões de aulas despublicadas; token interno também no admin; guards de
> "última aula publicada"; reativação via extend; oferta vazia → 502; validações
> de quiz/sandbox; cooldown atômico) + **2º full review (prod-readiness, 06/2026) com
> TODOS os achados implementados** (Dockerfile + railway.json — preDeploy `db:migrate`
> APENAS, o seed é de DEV e não vai a prod; índice `processed_at` + prune em LOTES;
> **uuid validado nas bordas** — params TypeBox + `userId` dos webhooks/grant manual,
> id lixo → 400 e nunca 22P02→500; URLs do admin exigem `http(s)` —
> `r2priv:` permitido em anexo/ebook — barrando `javascript:` na borda; cap de 200
> chars no `x-delivery-id`) + **gamificação kids COMPLETA — XP/streak/badges + Zappy Coins
> + avatar + quarto + missões + streak-freeze/férias + ligas + perfil público/ranking
> (06/2026, ver §Gamificação; fonte DETALHADA em
> [`docs/gamificacao.md`](../../docs/gamificacao.md))** — **~317 testes**.
> Migrations `0000` (schema `members`), `0001` (`lesson_progress`), `0002`
> (`quiz_attempts`), `0003` (`lessons.is_published`), `0004` (`course_ratings`), `0005`
> (enum `lesson_block_kind` + `'ebook'`), `0006` (enum `access_type` + `'all_courses'`),
> `0007` (índice `processed_webhooks_processed_at_idx`), `0008` (enum
> `course_audience` + coluna `courses.audience`, default `adult` — plataforma kids),
> `0009` (gamificação: enum `xp_source_type` + `gamification_profiles`/`xp_events`/
> `user_badges`), `0010`/`0011` (marcos pelo ledger `course_complete`/`quiz_perfect` +
> coluna `privileged`), `0012` (coluna `audience` — segregação por vitrine),
> `0013` (bloco `studio`), `0014`/`0015` (`gamification_profiles.account_id` +
> índices de ranking), `0016` (auto-correção do studio), `0017` (`access_type`
> `'all_kids_courses'`), `0018` (Zappy Coins: enum `coin_source_type` +
> `coin_events` + carteira em `gamification_profiles`), `0019` (avatar:
> `avatar_configs`/`avatar_inventory`), `0020` (quarto: `room_state`/`room_inventory`),
> `0021` (missões + freeze/férias: `mission_claims` + `streak_freezes`/
> `freeze_granted_month`/`vacation_from`/`vacation_to`), `0022` (ligas semanais:
> `league_membership`), `0023` (avatar 3D: `avatar_configs.photo_url` — a foto/snapshot),
> `0024` (índices únicos de `sort_order` em módulos/aulas/blocos/anexos) e `0025`
> (**certificados**: enum `lesson_block_kind` + `'certificate'` + tabela `certificates_issued`)
> — **aplicadas** no Postgres compartilhado (`sistemazero`, :5433); **`0026`**
> (`studio_submissions.account_id` — conta RESPONSÁVEL da entrega, p/ o admin mostrar
> criança+responsável; nullable, legado `null`) **gerada, FALTA aplicar** (`db:migrate`).

## Conceito central (decisões travadas com o usuário)

> 📖 A explicação CONCEITUAL do modelo comercial (produto × oferta × matrícula, chave-mestra,
> bônus) está em [`docs/catalogo-e-entitlements.md`](../../docs/catalogo-e-entitlements.md) —
> voltada ao OPERADOR. **Mudou regra de acesso aqui? Atualize o manual também.**

1. **Entitlement = direito de acesso, GENÉRICO por tipo de produto** (`course |
   community | download | …`), separado do "o que comprou" (isso é do payments). É
   uma **tabela materializada** alimentada pelos eventos do payments. Padrão Stripe
   Entitlements + "pedido imutável" do e-commerce.
2. **Checagem de acesso = leitura LOCAL** (`status='active' AND (expiresAt IS NULL OR
   expiresAt > now)`). Sem chamar ninguém no caminho quente. Vitalício → `expiresAt`
   null; assinatura → `expiresAt` estendido a cada ciclo + carência. Curso **`archived`
   mantém o acesso** de quem já tem matrícula (só `draft` bloqueia) — `isCourseAccessible`.
   Havendo >1 matrícula ativa p/ o mesmo curso, o detalhe escolhe a **mais forte**
   (vitalícia > validade mais distante). **Chave-mestra** (`accessType='all_courses'`,
   `courseRef` null): acesso = "matrícula do curso OU chave-mestra ativa"
   (`findActiveForCourse`, query única com OR); cobre cursos publicados DEPOIS do grant
   sem reprocessamento. ⚠️ **Desde 06/2026 a chave-mestra cobre só cursos `adult`**:
   curso `kids` (ver Audiência, item 9) exige matrícula ESPECÍFICA — o
   `CheckAccessService` (ponto único) passa `masterCovers: course.audience === 'adult'`
   ao `findActiveForCourse`, que tira o braço `all_courses` do OR. "Meus cursos" lista
   todos os publicados da VITRINE (+ archived com matrícula específica) com o acesso
   mais forte por curso; o catálogo destrava tudo (`hasAccess`) — na vitrine adult.
   **Equipe interna = chave-mestra VIRTUAL** (06/2026): `superadmin`/`admin`/`staff`
   (header `x-auth-user-role` injetado pelo gateway — confiável pelo `x-internal-token`)
   recebem `EntitlementAggregate.virtualAllCourses()` em memória (NUNCA persistida) em
   TODAS as rotas do aluno — `isPrivilegedActor` resolvido na ROTA e propagado como
   param `privileged` aos services (CheckAccessService + list-catalog + list-my-courses).
   Rascunho continua 404 (check ANTES do bypass); rating de equipe CONTA em
   `course_ratings` (trade-off aceito — a fatia só coleta; se um dia houver média
   pública, filtrar staff na agregação).
   O union `AccessType` local é **mirror TOLERANTE de leitura** (mantém
   download/external/none legados p/ snapshots antigos carregarem) — o catálogo só
   escreve `course`/`all_courses`.
3. **Snapshot congelado no grant**: resolve no catálogo o que a oferta dá direito e
   **grava** (offer/product/sku/fulfillment/courseRef) na matrícula. Mudar a oferta
   depois NÃO altera quem já comprou.
4. **Aluno = usuário do auth** (`userId` = `x-auth-user-id` injetado pelo gateway).
   Sem identidade duplicada.
5. **Convenção**: `entitlement.courseRef === course.slug` (e === `fulfillment.courseRef`
   do produto no catálogo). É o elo oferta→curso.
6. **Aula = lista ordenada de BLOCOS** (`lesson_blocks`, união discriminada por
   `kind`: rich_text/video/image/audio/quiz/embed/ebook/**studio**). Aula composta (vídeo +
   interativo + texto) = vários blocos. Comunidade só modelada (feature é fatia
   seguinte). **Autoria v3 (06/2026):** `embed` aceita SÓ `{html, sandbox?}` no DTO
   (sempre iframe sandbox no front; `embedType`/`src`/`height` são legado tolerado no
   TYPE mas rejeitado na escrita); `ebook` = `{url: 'r2priv:<key>', title?}` — PDF no
   bucket R2 privado que o community renderiza como livro 3D com marca d'água.
   **`studio` (06/2026, migration `0013`):** editor `@sistemazero/studio` embarcado e
   pré-configurado pelo admin — `{initialProject (snapshot Project, JSON opaco — o front
   sanitiza, teto `MAX_STUDIO_PROJECT_CHARS` 1.5M), level?, allowBlocks?, allowCategories?,
   allowedModes?, allowLevelReveal?}`. ⚠️ **`allowBlocks` é RESTRITIVO** (06/2026): lista
   NÃO-vazia = a paleta do aluno mostra SÓ esses blocos (+ as 🗂️ Áreas do projeto, sempre
   visíveis), ignorando nível/categoria; vazia = curadoria por nível. (Era aditivo "sempre
   visível"; sem UI, ninguém usava o sentido antigo.) A config NÃO é segredo (vai inteira ao aluno). O aluno
   ENVIA o projeto (`POST …/blocks/:blockId/studio-submission` `{project}`) → tabela
   `studio_submissions` (1 linha/aluno+bloco, upsert — reenvio último-vence) e isso
   ⚠️ **As rotas que carregam o projeto** (entrega do aluno + autoria do bloco:
   `POST /admin/lessons/:id/blocks` e `PATCH /admin/blocks/:id`) têm teto de CORPO próprio
   `MAX_STUDIO_BODY_BYTES` no server (default **2 MB**, `bodyLimitForPath` em `server.ts`),
   separado do teto pequeno de 64 KB das demais rotas — 06/2026: antes o teto global de 64 KB
   barrava **413 toda entrega não trivial** (era 100% quebrado em prod, onde a env não é setada).
   Corpo acima do teto → **413 em TODAS as rotas** (`onTransform` global; antes só os webhooks
   barravam o oversize, as rotas de aluno caíam em 422 confuso com `{}`).
   **bloqueia a conclusão da aula até enviar** (`STUDIO_GATE_NOT_SUBMITTED`→409, espelha o
   gate do quiz — ver mark-lesson-complete). A projeção member-facing anexa
   `studioState {submitted, submittedAt, lastScore?, passed?}` (como o `quizState`). Admin
   acompanha em `GET /members/admin/blocks/:id/studio-submissions[/:userId]` (lista + projeto
   inteiro + nota/resultado p/ abrir no Estúdio do professor). A entrega grava **`account_id`**
   (conta responsável; no kids = o pai, ≠ do `user_id` que é o PERFIL da criança — no adulto são
   iguais; migration `0026`) → o BFF do admin hidrata a CRIANÇA (nome do perfil) + o RESPONSÁVEL.
   **AUTO-CORREÇÃO (fase 2, migration `0016`):** o `StudioBlock` ganha `activity?`
   (enunciado + `checks[]` união `structure`/`behavior`/`testcase`/`code` + `passingScore?`)
   — `domain/course/studio-activity.ts` (PURO: `gradeStudioActivity`/`evaluateStructureRule`/
   `validateStudioActivityAuthoring`, espelha `quiz.ts`). **Correção HÍBRIDA:** o cliente
   (@sistemazero/studio) roda TUDO e manda `results` no submit; o servidor **RECALCULA só
   `structure`** andando o IR submetido (`verifiedBy:'server'`) e REGISTRA o reportado p/
   behavior/testcase/code (`verifiedBy:'client'`) — só `structure` é à prova de fraude.
   Colunas novas em `studio_submissions`: `score`/`results`/`checked_at`/`passed_at` (STICKY).
   Award `studio_passed` (XP = quiz, idempotente por bloco). Gate: `activity.passingScore`
   exige aprovação (`STUDIO_GATE_NOT_PASSED`→409); sem nota = só envio. ⚠️ as definições
   (esperados/`code`) VÃO ao aluno (feedback instantâneo) — plataforma formativa; o gate
   confiável é o `structure` server-side. As fixtures do `evaluateStructure*` PRECISAM casar
   com as do `structure.ts` do studio. ⚠️ Como behavior/testcase/code são REPORTADOS pelo
   cliente (burláveis), `validateStudioActivityAuthoring` EXIGE ≥1 checagem `structure` quando
   há `passingScore` (gate gated sem structure seria forjável) — espelha "quiz gated precisa
   de ≥1 questão". Atividade FORMATIVA (sem nota) aceita só checagens client-trusted.
   **PROJETO CONTÍNUO (cadeia, carryover):** o `StudioBlock` tem `chain?: string` (campo no
   jsonb `content` — SEM migration). Aulas com o MESMO `chain` no mesmo curso formam uma
   sequência que constrói um único projeto (ex.: um jogo). `GET /members/lessons/:lessonId/
   blocks/:blockId/studio-carryover` → `{project|null}` devolve a ÚLTIMA entrega do aluno no
   bloco studio `chain`-igual da aula PUBLICADA imediatamente anterior (ordem do curso:
   `module.sortOrder`, depois `lesson.sortOrder` — `CourseRepository.findPreceding
   StudioBlockInChain`, query única + `getOne`); o front semeia o editor SÓ na 1ª abertura
   (sem rascunho local). `GetStudioCarryoverService`: acesso pela CONTA, projeto pelo PERFIL
   (`getOne(userId,…)` — nunca vaza de outro aluno); bloco sem `chain`/1ª da cadeia/sem
   entrega → `{project:null}` (cai no `initialProject`). Carrega a última entrega MESMO sem
   ter batido a nota de corte (continuar o WIP). Várias cadeias por curso NÃO se misturam
   (filtro por nome). O "salvar" é a própria ENTREGA — nada novo no save/colunas.
   **VITRINE (Mural dos Criadores, 06/2026):** o `StudioBlock` ganha `showcase?` (`{enabled,
   title?, summary?, defaultCoverUrl?}`, no jsonb `content` — SEM migration). O admin liga
   `enabled` no bloco da ÚLTIMA aula do projeto; ao concluí-la, o `LessonCompleteView` traz
   `showcase: {blockId, title}` (aditivo) → o front kids mostra o botão "Publicar no Mural". O
   conteúdo AUTORITATIVO (a criança não escreve) vem de `GET /members/lessons/:lessonId/blocks/
   :blockId/showcase-payload` (`GetShowcasePayloadService`, espelha o carryover — acesso pela CONTA,
   entrega pelo PERFIL): `{eligible, title, summary, defaultCoverUrl, chain, courseId, audience}`,
   `eligible:false` se o bloco não é vitrine/desabilitado/sem entrega. O BFF re-busca isso no
   clique e publica no hub (`POST /hub/internal/showcase-thread`). ⚠️ O **HUB também re-valida** a
   elegibilidade via `GET /members/internal/showcase-eligibility?accountId=&userId=&lessonId=&blockId=`
   (rota S2S, MESMO `GetShowcasePayloadService`, `privileged:false`) — a rota de publicação é
   alcançável na borda por qualquer conta ativa, então o hub não confia no corpo (full review 18/06).
7. **Quiz é corrigido NO SERVIDOR** (`quiz_attempts` guarda o histórico; score 0–100 por
   conjunto EXATO de choices). O GET da aula **NUNCA envia o gabarito** — a projeção
   member-facing (`toMemberFacingQuizContent`) remove `correctChoiceIds`/`explanation`
   e anexa `quizState` (lastScore/passed/attemptsCount/retryAvailableAt); correções/
   explicações só chegam na RESPOSTA do submit. Quiz **com `passingScore`**: reprovar
   → **cooldown de 5 min** (`QUIZ_COOLDOWN`→429) e bloqueia o complete da aula até
   aprovar (`QUIZ_GATE_NOT_PASSED`→409). Quiz **SEM `passingScore` = fixação**: não
   reprova (`gradeQuizAttempt` → `passed:true` ao enviar) — **sem cooldown** e o XP é
   creditado uma vez (ledger idempotente); nunca bloqueia o complete. Aula já concluída
   nunca regride; aprovado uma vez = destravado para sempre. ⚠️ Quiz **com nota de
   corte EXIGE ≥1 questão** (`validateQuizAuthoring` → 400; e o gate ignora quiz gated
   vazio): um quiz gated sem questões não é respondível → travaria a aula para sempre.
8. **Posição de vídeo + last-accessed** (`lesson_progress`, 1 linha por aluno+aula,
   upsert): `positionSeconds` retoma o vídeo de onde parou; `updatedAt` alimenta o
   `continueLessonId` (prioridade: última acessada não concluída > 1ª não concluída >
   1ª aula — `resolveContinueLesson`, puro) devolvido no detalhe e em "meus cursos".
9. **Audiência do curso = plataforma** (06/2026, migration `0008`): coluna
   `courses.audience` (`adult` | `kids`, default `adult`) — é COLUNA (não metadata)
   porque participa da AUTORIZAÇÃO (chave-mestra, item 2). Segmenta as VITRINES:
   `GET /members/courses` e `/catalog` aceitam `?audience=adult|kids` (ausente →
   `adult`, zero regressão no community; inválido → 400 via `AudienceQuery`) e os
   services filtram `listPublishedCourses(audience)` + descartam matrícula específica
   de curso da outra vitrine na resposta (o ACESSO segue válido — só não aparece ali).
   O DETALHE/aula/quiz/anexos/ebook NÃO filtram por audiência (plataforma é descoberta;
   acesso é matrícula — e a equipe precisa navegar as duas). Autoria: `CourseBody.audience`
   opcional — ausente no CREATE → `adult`; ausente no UPDATE → **PRESERVA a atual**
   (≠ do `salesPageUrl`, que limpa: um PATCH de build antigo do admin não pode rebaixar
   curso kids em silêncio). Views (`MyCourseView`/`CatalogCourseView`/`CourseDetailView`/
   `CourseView` admin) expõem `audience`. O front kids é o `@sistemazero/community-kids`.

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
│   │                 #   save-course-rating/get-course-rating (classificação do curso),
│   │                 #   get-attachment-download/get-ebook-download (resolve p/ o BFF)
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

- **Webhooks de entrada** verificam HMAC sobre a mensagem canônica
  `"<MÉTODO>.<path>.<corpo BRUTO>"` (06/2026 — método+path impedem replay
  cross-endpoint) com `GATEWAY_HMAC_SECRET` (= segredo de resign do gateway),
  header `x-signature: t=,v1=`. HMAC é checado no hook `transform` (**antes** da
  validação do corpo → 401 antes de 422). Dedupe por `x-delivery-id` (tabela
  `processed_webhooks`): checa ANTES, marca só DEPOIS do sucesso. Falha de concessão → o
  funil devolve 502 e o gateway re-entrega (members é idempotente pela `idempotencyKey`).
  ⚠️ **Marcar-após-sucesso é DELIBERADO** (não trocar por "claim-first"): duas entregas
  concorrentes da MESMA delivery podem ambas processar, mas é INÓCUO (grant/revoke
  idempotentes). Um "claim antes de processar" fecharia essa corrida benigna, mas REGREDIRIA
  a crash-safety — um crash entre o claim e a conclusão deduparia para sempre uma concessão
  que nunca completou (comprador sem acesso). A idempotência cobre a corrida; o
  marcar-após-sucesso cobre o crash. (Full review 06/2026.)
- **Notifica o HUB (comunidade) no GRANT** (06/2026): após uma concessão por webhook
  (`/webhooks/grant`, caminho do funil) E no grant manual do admin, o members chama
  `POST /hub/webhooks/grant` `{userId, event:'grant'}` — assinado com HMAC (mesmo canônico
  `<MÉTODO>.<path>.<corpo>` + `GATEWAY_HMAC_SECRET` que o hub verifica) + `x-delivery-id`
  (uuid) p/ dedupe — DIRETO na rede interna (`HUB_BASE_URL`). É **best-effort** (o
  `HubGateway`/`createHubHttpGateway` engole erro/timeout e LOGA `hub.notify_*` — a
  concessão NUNCA falha por causa do hub) e faz o hub invalidar o micro-cache de acesso
  NA HORA, liberando espaços `community_gated`/`course_gated` sem esperar o TTL (~30s).
  Sem `HUB_BASE_URL` (dev/local) → `noopHubGateway` (não notifica). ⚠️ **REVOKES** (admin
  manage + cancel/expire de assinatura) NÃO notificam o hub hoje — a `AdminEntitlementView`
  não traz `userId` e o revoke de assinatura é set-based (sem userIds); a perda de acesso
  na comunidade ocorre dentro do TTL do hub (rede de segurança aceita).
- **Grant de oferta não resolvida** (catálogo 404) → `/webhooks/grant` devolve **502
  `OFFER_UNRESOLVED` e NÃO marca a entrega** (auto-cura uma corrida; uma divergência
  de slug permanente aflora como falhas repetidas em vez de sumir). Oferta resolvida
  **sem nenhum item** (drift de contrato — itens malformados são descartados COM LOG
  no parse do gateway do catálogo) → **502 `OFFER_EMPTY`**, mesma régua. `granted:0`
  por idempotência (já concedido) continua sendo **200** (sucesso) — o sinal é
  `offerFound`/`itemsResolved`, não a contagem.
- **Extensão de assinatura re-tenta sob conflito otimista** (até 3×, recarregando a
  matrícula): sem isso, a renovação que perdesse a corrida p/ um cancel/ação admin
  respondia 200 e a extensão do ciclo se perdia de vez. Conflito persistente → lança
  (5xx → re-entrega). Reentrega do mesmo ciclo (validade já cobre o alvo) = no-op.
  `extendTo` avalia a REATIVAÇÃO de uma `expired` independentemente do avanço da validade
  (06/2026): renovação cujo alvo não move o `expiresAt` (ex.: `expire` marcou o status sem
  mexer numa validade ainda futura) ainda reativa — antes o early-return monotônico engolia
  o caso e a renovação se perdia.
- **API do aluno E rotas admin = defesa em profundidade**: o gateway injeta
  `x-internal-token` (`header-inject`, sobrescreve qualquer valor do cliente) e o
  members o exige nas rotas do aluno **e em `/members/admin/*`** (06/2026 — sem ele,
  qualquer processo que alcançasse o members direto na rede interna forjaria um admin
  via `X-Auth-User-*`) (`INTERNAL_API_TOKEN`, ver §env). Vazio em dev (sem gateway);
  **OBRIGATÓRIO em produção** (boot falha sem ele). É o que torna o
  `x-auth-user-id`/`X-Auth-User-*` confiáveis (só valem se passaram pelo gateway).
  Webhooks NÃO usam (já têm HMAC). O guard `assertInternalCaller` é **fail-CLOSED em
  produção** (06/2026): token `expected` vazio → no-op SÓ se `NODE_ENV !== 'production'`;
  em produção rejeita (401) — defesa em profundidade que não depende SÓ do refine do env
  (um deploy que perdesse o token jamais aceita `X-Auth-*` forjado da rede interna).
- **Catálogo** é chamado DIRETO (S2S, `CATALOG_BASE_URL`), fora do caminho quente. A rota
  de entitlements devolve o **manifesto de entrega** e (06/2026) **exige `x-internal-token`** —
  o members envia `CATALOG_INTERNAL_TOKEN` (= `INTERNAL_API_TOKEN` do catalog; opcional em
  dev/local, **OBRIGATÓRIO em produção** — boot falha sem ele). **Timeout por chamada**
  (`CATALOG_REQUEST_TIMEOUT_MS`, default 10s) — catálogo travado não pendura o webhook.
- **`GET /members/catalog`** (rota do aluno, JWT + `x-internal-token`): "Todos os
  cursos" — TODO curso `published` (ordenado por título) com `hasAccess` (matrícula
  ativa de curso do `x-auth-user-id`) e `salesPageUrl` (de `course.metadata.salesPageUrl`,
  string não-vazia; senão `null` → o community cai no fallback `FUNNEL_URL`). Sem
  progresso (catálogo é descoberta/venda). `ListCatalogService` (2 queries, sem N+1).
  O `salesPageUrl` é editável pela autoria admin (06/2026): `CourseBody` aceita
  `salesPageUrl` (nullable) → vira a chave `metadata.salesPageUrl` — o service atualiza
  SÓ essa chave preservando as demais do jsonb (`withSalesPageUrl`: vazio remove a
  chave; objeto vazio volta a `null`); `CourseView` da autoria devolve `salesPageUrl`.
- **`GET /members/access?refs=<csv>`** (rota do aluno, JWT + `x-internal-token`): "esta
  CONTA tem acesso a estes produtos?" — gate de produtos que NÃO são curso de trilha
  (ex.: o **Estúdio Completo** vendável da vitrine kids). Resolve pela CONTA
  (`resolveAccountId`), reusa o `AccessCheckService` (mesmo motor do `/internal/access-check`
  S2S do hub) e devolve `{ access: { ref: boolean } }` aplicando a regra POR REF:
  `grants.includes(ref) || communities.includes(ref) || hasMaster<Audiência>`. `?audience`
  (default `kids`) escolhe a chave-mestra. **TODA ref pedida volta no mapa** (06/2026):
  `splitRequestedRefs` mantém as pedidas (trim/não-vazias, teto 50) e as de formato
  inválido recebem `false` EXPLÍCITO (em vez de sumir — chamador não distinguia "negado"
  de "descartado"); só as válidas (`parseAccessRefs`, regex de slug) vão ao motor/DB.
  **Equipe interna = passe livre de PRODUTO** (06/2026): se `isPrivilegedActor(headers)`
  (`superadmin`/`admin`/`staff`), a rota curto-circuita e devolve TODAS as refs pedidas como
  `true` (sem tocar matrícula) — é o que destrava o **Estúdio Completo** (`estudio-completo`)
  p/ a equipe testar o Kids sem comprar, espelhando a chave-mestra virtual dos cursos. Travado
  por `tests/integration/privileged-coins.test.ts`.
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
- **`GET /members/courses/:slug/lessons/:lessonId/blocks/:blockId/ebook/resolve`** (aluno,
  consumida SÓ pelo SERVIDOR do community/BFF): devolve a localização REAL do PDF do bloco
  e-book — `EbookDownloadView {title, storageRef}`. Mesma régua do resolve de anexo
  (matrícula ativa + aula publicada + bloco da aula com `kind:'ebook'`;
  `EBOOK_BLOCK_NOT_FOUND`→404). A view member-facing do bloco `ebook` sai **SEM `url`**
  (só `{kind, title?}`). `GetEbookDownloadService`.
- **Certificado de conclusão** (bloco `kind:'certificate'` na ÚLTIMA aula; migration `0025`):
  `GET /members/lessons/:lessonId/blocks/:blockId/certificate` → estado `{eligible, issued,
  revoked, serial?, issuedAt?, revokedAt?}` (`GetCertificateService`); `POST` na mesma rota EMITE
  (idempotente por aluno+curso — `IssueCertificateService`): GATE de elegibilidade = TODAS as
  outras aulas publicadas concluídas **E ≥1 outra aula publicada existir** (`eligibleForCertificate`
  exige piso de 1 — um curso publicado SÓ com a aula do certificado NÃO emite diploma por zero
  trabalho; `CERTIFICATE_NOT_ELIGIBLE`→409; cobre transitivamente quiz/estúdio das OUTRAS aulas),
  congela `certificates_issued` (id público + `serial` `SZ-<ano>-XXXXXXXX` + snapshot
  nome/título) e **conclui a aula do certificado** (→ curso 100% + badge `course-complete`,
  award fail-open). ⚠️ A aula do certificado é **EXCLUSIVA** (só o bloco de certificado): a autoria
  recusa criar/virar um certificado numa aula com outros blocos, e recusa adicionar bloco numa aula
  de certificado (`VALIDATION_ERROR`→400) — senão um quiz/estúdio na MESMA aula seria pulado (a
  emissão conclui a aula direto, sem os gates de `mark-lesson-complete`). O **nome** vem dos headers
  CONFIÁVEIS do gateway (`x-auth-profile-name` kids ?? `x-auth-user-name`; URI-decodado — 1º
  consumidor a ler o nome), NUNCA do corpo. `certificates_issued.course_id` é **SNAPSHOT (SEM FK p/
  `courses`)** — o diploma é credencial PERMANENTE (QR público); apagar o curso NÃO o destrói (a
  validação roda só sobre `course_ref`/`course_title`/`student_name`/`serial`). A config do
  bloco (emissor/assinatura/cor/logo) volta na resposta p/ o BFF montar o PDF (o members NÃO gera
  PDF). Validação PÚBLICA: `GET /members/internal/certificates/:id/validate` (rota S2S, exposta
  no gateway como `public` — o BFF da página `/validar/:id` chama; só dados não-sensíveis
  `{valid, studentName, courseTitle, issuedAt, serial}`). Admin: `POST /members/admin/
  certificates/:id/revoke` (→ `valid:false` na validação; revogação é TERMINAL — reemissão devolve
  410 `CERTIFICATE_REVOKED`; a aula/curso PERMANECEM concluídos, revoke só invalida a credencial).
  `ValidateCertificateService`/`RevokeCertificateService`; helpers PUROS `eligibleForCertificate`/
  `generateSerial` (domain).
- Cancelar/expirar assinatura é um **UPDATE atômico set-based** por `subscription_id`
  (sem load-mutate-save por linha → sem lost-update sob corrida com renovação).
- **Retenção de `processed_webhooks` roda SOZINHA** (06/2026): `setInterval` no
  composition-root (`RETENTION_CLEANUP_INTERVAL_MS`, default 6h) chama
  `pruneProcessedBefore(now - PROCESSED_WEBHOOKS_RETENTION_DAYS)` gateado por
  **advisory xact-lock** (chave `30792292938117747` = 'members' ASCII int8 — o espaço
  é GLOBAL ao banco compartilhado, não colida com a do payments) → só 1 réplica
  limpa por ciclo. Fora do hot path.
- **Liveness/readiness**: `/health` (estático) + **`/readyz`** (probe `select 1` no
  banco; 503 sem ele) — aponte o healthcheck do Railway para `/readyz`. Bind
  **dual-stack `::`** (env `HOST`) — obrigatório p/ `members.railway.internal`
  (private networking é IPv6). Espelha o payments.
- **Cooldown do quiz é atômico** (06/2026): além da pré-checagem (429 com
  `retryAvailableAt`), o `save` da tentativa re-checa o cooldown DENTRO de uma
  transação serializada por (aluno, bloco) via `pg_advisory_xact_lock(hashtextextended)`
  — dois submits simultâneos não furam a janela (o perdedor leva 429 sem gravar).

## Gamificação (kids — fatia 06/2026, vitrine v1 = community-kids)

> 📖 **Fonte DETALHADA (valores exatos de cada subsistema, regras e gotchas):**
> [`docs/gamificacao.md`](../../docs/gamificacao.md). Esta seção é o resumo operacional;
> mudou regra de XP/moeda/missão/streak/loja? Atualize o manual também.
>
> A expansão 06/2026 (6 fases) somou ao núcleo XP/streak/badges os subsistemas:
> **Zappy Coins** (moeda, migration `0018`), **avatar** 3D (`0019`+`0023`), **quarto**
> virtual (`0020`), **missões** diárias/semanais + **streak-freeze/férias** (`0021`) e
> **ligas semanais** (`0022`), além de **badges de maestria do Estúdio** + **perfil
> público com `getRanking`**.

**TUDO é SEGREGADO POR VITRINE** (decisão do usuário 12/06: XP/streak/badges/ranking kids
e adult NÃO se misturam; a audiência vem do CURSO no momento do award — migration `0012`).
Estado em `gamification_profiles` (1/aluno **POR AUDIÊNCIA** — UNIQUE user+audience: xp,
streak, `last_activity_date` = **data civil de São Paulo** `YYYY-MM-DD`, + carteira Zappy
`coin_balance`/`coins_earned_today`/`coins_earned_date`/`lifetime_coins_earned` e
freeze/férias `streak_freezes`/`freeze_granted_month`/`vacation_from`/`vacation_to`), `xp_events`
(ledger **idempotente por UNIQUE (user_id, source_type, source_id)** — re-complete/replay
NUNCA duplica XP; source_id é snapshot SEM FK; coluna `audience` segmenta as CONTAGENS —
um source pertence a um curso, logo a uma audiência) e `user_badges` (UNIQUE
user+audience+slug — a "1ª aula" do kids é independente da do adult). Domain puro em
`domain/gamification/` (XP_VALUES, `quizPassedXp`, `localDateSaoPaulo`/`advanceStreak`/
`effectiveStreak` — timezone FIXA America/Sao_Paulo, cálculo SEMPRE no backend; o "dia"
vira às 03:00Z). Decisões travadas com o usuário (06/2026): **SEM corações/vidas**;
XP = aula 10 · quiz aprovado 20 + bônus `round(score/10)` cap +10 · baú de unidade 25;
**catálogo de badges EM CÓDIGO** (`BADGE_SLUGS`, **17** com a expansão: first-lesson,
streak-7/30/60/180/365, course-complete/-2/-3, quiz-perfect/-10/-30, **studio-first/
studio-master-3/studio-master-10** (maestria do Estúdio, ledger `studio_passed`) e
**coins-saver-300/coins-saver-1000** (poupador, por `lifetime_coins_earned`) — sem
tabela/seed: preDeploy de prod roda só `db:migrate` e o catálogo muda junto com o código que
o detecta). **Marcos são contados pelo LEDGER** (migrations `0010`/`0011`):
curso 100% gera `course_complete` (sourceId = courseId) e quiz com nota 100 gera
`quiz_perfect` (sourceId = blockId) — eventos-marco de **amount 0**, dedupe por source;
o repo deriva as badges do count (1/2/3 cursos; 1/10/30 notas mil). ⚠️ **Marco NÃO move
streak**: o avanço de streak/lastActivityDate é gateado em evento novo de `amount > 0`
(regra "só atividade que rende XP conta" — um re-pass com nota 100 destrava a badge sem
estender o streak). Atividade ANTERIOR às migrations não tem marco retroativo
(regra geral de não-backfill).

- **Award DENTRO das ações existentes**, devolvendo o delta NA RESPOSTA (a UI celebra sem
  round-trip): o complete devolve `LessonCompleteView` = progresso + `gamification:
  {xpAwarded, totalXp, streak:{current,best,extended}, badgesUnlocked[], unitCompleted}`
  (ADITIVO — o community adulto ignora); o quiz devolve o mesmo campo SÓ quando aprovado.
  Streak conta qualquer atividade que rende XP; sem evento novo no ledger, streak/
  lastActivityDate ficam INTOCADOS (mas badge candidata do caller ainda concede — ex.:
  `quiz-perfect` num re-pass com nota 100).
- **`AwardGamificationService` é FAIL-OPEN por design**: erro → log
  `gamification.award_failed` (Sentry via espelho) + `gamification: null` — a gamificação
  NUNCA derruba complete/quiz (rotas usadas também pelo adulto); o ledger idempotente se
  auto-cura na próxima chamada do mesmo source. NÃO remover o try/catch.
- **Baú de fim de unidade**: o complete detecta módulo 100% via
  `listPublishedLessonIds(moduleId)` (só PUBLICADAS, consistente com o progresso) →
  evento `unit_complete` (sourceId = moduleId, dedupado). `markComplete` do progresso
  agora devolve `boolean` (conclusão nova?).
- **`DrizzleGamificationRepository.award`** roda numa transação serializada POR ALUNO via
  `pg_advisory_xact_lock(hashtextextended('gamification:'+userId, 0))` (namespace distinto
  do lock de quiz); o RETURNING do `onConflictDoNothing` separa eventos novos de replays.
  `last_activity_date` é `date` com **`mode: 'string'`** — `mode: 'date'` deslocaria o dia
  via round-trip `Date` UTC.
- **`GET /members/gamification/me?audience=adult|kids`** (rota do aluno, JWT +
  `x-internal-token`; sem CheckAccess — recurso do próprio usuário; `audience` ausente →
  `adult`, como nas listagens — o shell SEMPRE manda a do app): perfil DA VITRINE —
  `{xp, streak:{current,best,activeToday}, badges:[{slug, unlockedAt|null}]}` — catálogo
  COMPLETO na ordem do domain (bloqueada = null); `current` é o streak de EXIBIÇÃO (0
  quando a última atividade foi antes de ontem). **`?ranking=true`** inclui
  `ranking: {position, totalStudents}` da MESMA vitrine: coorte = usuários com ≥1
  matrícula (QUALQUER status — histórico é permanente, como o XP) em curso daquela
  audiência; posição = competition ranking ("1224") por `profiles.xp` da audiência — XP
  estritamente maior fica à frente, empate divide, aluno sem perfil conta com XP 0.
  **SÓ CLIENTE ranqueia** (decisão do usuário): equipe (superadmin/admin/staff) fica fora —
  o members não conhece roles (vivem no auth), então o award grava o snapshot
  `gamification_profiles.privileged` (do `isPrivilegedActor` da rota, migration `0011`) e o
  ranking filtra `privileged = false`; equipe sem perfil (nunca pontuou) ainda conta na
  coorte por presunção — irrelevante na prática (0 XP, não fica à frente de ninguém).
  Cálculo do ranking só quando o param vem (a página de perfil pede; widgets não); as 3
  leituras (membro/total/à-frente) rodam numa transação (snapshot consistente sob award
  concorrente). **Requester FORA da coorte** (sem matrícula na audiência pedida, ou equipe)
  → `getRanking` devolve `null` e o service **OMITE** o `ranking` (06/2026): sem isto vinha
  "1º de 0" ou ranqueava o aluno entre pares dos quais não faz parte — e o front kids
  renderiza `ranking.position` direto (só checa o objeto inteiro nulo, não o campo).
- **Impersonação/equipe**: XP credita no aluno do `x-auth-user-id` — consistente com as
  completions (que já são gravadas); suporte "fazendo aula" pelo aluno gera XP real
  (trade-off aceito, igual ao rating de equipe).
- **Zappy Coins** (moeda, migration `0018`): enum `coin_source_type` + ledger `coin_events`
  (UNIQUE user+audience+source) + carteira em `gamification_profiles` (`coin_balance`,
  `coins_earned_today`/`coins_earned_date`, `lifetime_coins_earned`). Faucets ganham moeda
  junto com o XP (aula/quiz/baú/studio) **com TETO DIÁRIO** (`DAILY_COIN_CAP` = 100, dia civil
  SP; `applyDailyCap` em `domain/gamification/coins.ts`); **marcos de streak** dão bônus
  one-time EXEMPTO do teto (7→20, 30→50, 60→80, 180→150, 365→300, `sourceId streak:<dias>`).
  Gastos via `spendCoins` (`spend_cosmetic`/`spend_room`/`spend_streak_freeze`) com
  `idempotencyKey` — saldo insuficiente → `InsufficientCoinsError` (402). A verdade do saldo é
  `gamification_profiles.coin_balance` (`coin_events.balanceAfter` é auditoria).
  **Equipe interna = moedas VIRTUAIS ilimitadas** (06/2026): `isPrivilegedActor` propagado como
  `privileged` às lojinhas (`Buy{AvatarPart,RoomItem,StreakFreeze}Service`) → `amount/price: 0`
  no `spendCoins`/`buyStreakFreeze` (concede o item SEM debitar; saldo real fica 0, nada no
  ranking) e as leituras (`get-avatar`/`get-room`/`get-gamification`) marcam `balanceUnlimited`/
  `coins.unlimited` → a UI kids mostra ∞. Espelho da chave-mestra virtual; ver `docs/gamificacao.md`
  §4 e `tests/integration/privileged-coins.test.ts`.
- **Streak-freeze + férias** (migration `0021`, colunas `streak_freezes`/
  `freeze_granted_month`/`vacation_from`/`vacation_to` em `gamification_profiles`): a sequência
  só QUEBRA quando NEM férias NEM protetores cobrem o gap. Janela de férias é INCLUSIVA
  `[from, to]` (`setVacation` — valida DIA DE CALENDÁRIO real, não só o formato `\d{4}-\d{2}-\d{2}`:
  full review 06/2026, `2026-02-30`/`2026-13-45` faziam `inclusiveDaysBetween` virar `NaN` →
  `NaN > 30` falso → o teto de 30 dias era bypassado e a janela bizarra persistia como "férias
  quase eternas"); **+1 freeze GRÁTIS por mês civil** (lazy/idempotente na 1ª
  atividade do mês via `freeze_granted_month`) — concedido **só quando há espaço no teto**
  e o mês **só é marcado quando o grátis ENTRA** (06/2026): aluno no teto (5) na 1ª
  atividade não tem o mês queimado — o grátis continua disponível numa atividade futura em
  que haja espaço (antes o marcador avançava com o +1 descartado pelo teto, perdendo o
  benefício do mês). Compra de freeze via `buyStreakFreeze`
  (`STREAK_FREEZE_PRICE`, teto `MAX_STREAK_FREEZES` = 5). `advanceStreak`/`effectiveStreak`/
  `freezesNeeded`/`inVacation` no domain puro consomem/projetam os protetores; `effectiveStreak`
  é o streak de EXIBIÇÃO (projeta 0 quando a cobertura acabou, sem zerar o persistido) — usado
  no `GET /gamification/me` E na área dos pais (`GetChildrenStatsService`, full review 06/2026:
  antes mostrava o `streakCurrent` CRU, exibindo ao pai um streak "vivo" que já quebrou).
  `freezesNeeded` conta os dias-perdidos não-cobertos APÓS o filtro de férias (gap > cap de
  varredura = quebra), sem deixar uma janela de férias enorme "engolir" o cap.
- **Avatar 3D** (migrations `0019` `avatar_configs`/`avatar_inventory` + `0023`
  `avatar_configs.photo_url`): personagem por CATEGORIAS (`domain/avatar/avatar3d-catalog.ts`:
  **14 categorias** — head/hair/eyes/eyebrows/nose/**faceDecor**/facialHair/glasses/hat/top/bottom/
  **outfit**/shoes/accessory —, **~96 peças (89 com GLB + 7 "nenhum")**, paletas de COR por categoria,
  defaults grátis, oclusão `hat→hair` + **`outfit→[top,bottom]`** (vestido/roupa única cobre as duas).
  A categoria **`outfit` (Vestido)** veio da mineração do pack (mesma arte Quaternius CC0): vestido grátis
  tintável (`outfit-01`) + 4 looks pagos, + cabelos longos `hair-08..11` — opções unissex/de menina (22/06).
  **Aproveitamento TOTAL do pack (22/06):** auditoria por md5 achou que `eyes-09..12`/`eyebrow-07..10`/
  `hair-09` eram BYTE-IDÊNTICOS a peças já existentes (re-apontados p/ a arte distinta Eyes/EyeBrow.001-004
  + Hair.004); + peças novas (`head-04`, `beard-06/07`, `hat-07`, `shoes-03`, `acc-07/08`) e a categoria
  nova **`faceDecor` (Pintura de Rosto)** — removível, SEM paleta (cor embutida, igual a hat/accessory):
  `face-none`/`face-01..07` (pintura) + `face-08` (máscara). Só ficou de fora o sazonal PumpkinHead + o
  corpo-base nu. `canonicalize`/`assert` são genéricos (iteram `AVATAR_CATEGORIES`) → categoria nova sem
  código novo.
  `AvatarConfig` v2 (`{version:2, style, slots: cat→{asset,color?}}` em `equipped` jsonb):
  `canonicalize` TOLERANTE (config DiceBear legada/null → default 3D, sem migração) +
  `assertEquippableConfig` ESTRITO (peça existe/categoria certa/grátis OU possuída + cor ∈
  paleta). Cor é GRÁTIS (possuir a peça libera a paleta); compra de peça charge-first
  idempotente (`BuyAvatarPartService`, `reason:'spend_cosmetic'`) — **ATÔMICA** (full review
  06/2026): a posse é gravada na MESMA transação do débito via `spendCoins({grantInventory})`,
  nunca cobra sem entregar; o grant roda também no caminho `ALREADY_SPENT` (recupera retry).
  Idem o quarto (`BuyRoomItemService`). A FOTO (snapshot do canvas
  3D) é a imagem do avatar em todo o app: o BFF sobe o PNG p/ o R2 e grava a URL via
  **`PUT /members/avatar/photo`** (`SetAvatarPhotoService`, valida http(s)); `AvatarStateView`
  traz `equipped`/`parts`/`palettes`/`hideGroups`/`removable`/`photoUrl`/`balance` e
  `PublicProfileView` traz `avatarPhotoUrl`. Members é a fonte da verdade de existência/preço/
  posse/paleta; a APRESENTAÇÃO (rótulo PT) vive no community-kids (`lib/avatar3d-catalog.ts`),
  travada por `tests/unit/catalog-conformance.test.ts`. Cosmético puro; kids-only (v1). O
  render 3D (GLB real — Quaternius CC0 via pack do WawaSensei — R3F) vive no community-kids; os
  ids casam 1:1 com `public/avatar3d/parts/<id>.glb` — aqui é só o portão.
- **Quarto virtual** (migration `0020`, `room_state` jsonb last-write-wins + `room_inventory`):
  grade 12×8, tema + móveis/decoração/plantas/luzes posicionáveis + 1 pet. **Visual 3D no kids
  (06/2026)** — o members ganhou catálogos À PARTE `ROOM_FLOORS` (pisos) e `ROOM_LIGHTINGS`
  (iluminação/clima) + paleta `ROOM_WALL_PALETTE` (pintar paredes, grátis), e o estado JSONB ganhou
  campos OPCIONAIS `placedItems[].rot` (0–3), `wallColors`, `floor`, `lighting` (SEM migração).
  Sink cosmético de moedas. `canonicalizeRoomState` (domain) é o ÚNICO portão — leitura
  (`GetRoomService`, que projeta `items/themes/floors/lightings`) E escrita (`SaveRoomService`):
  descarta não-possuído/fora-da-grade (footprint GIRADO), `rot`→0..3, cor fora da paleta e piso/luz
  não-possuído omitidos. Compra via `BuyRoomItemService` (`roomThing` resolve item/tema/piso/luz;
  charge-first idempotente, `reason:'spend_room'`). DTO `RoomStateBody` + rota alargados p/ os campos
  novos. Endpoints BFF kids: `GET|PUT /api/members/room` + `POST /api/members/room/items/:id/buy`.
- **Missões diárias/semanais** (migration `0021`, `mission_claims`): estilo Duolingo,
  content-driven — catálogo EM CÓDIGO (`DAILY_MISSIONS` 5 / `WEEKLY_MISSIONS` 3 em
  `domain/gamification/missions.ts`; sem seed, igual badges). Atribuição DETERMINÍSTICA por
  (userId, período) via FNV-1a → embaralho parcial de **Fisher–Yates semeado** (`pick`,
  06/2026: alcança QUALQUER subconjunto — antes a janela contígua só atingia `pool.length`
  trios, p.ex. 5 dos 10 diários; `DAILY_SET_SIZE` 3, `WEEKLY_SET_SIZE` 2; semana começa na
  SEGUNDA). Progresso é DERIVADO na leitura contando eventos do ledger `xp_events`
  (`countEventsInPeriod`, SEM hook no award); o prêmio (XP + moedas) é resgatado por
  `claimMission` IDEMPOTENTE (UNIQUE user+audience+slug+período) que **REVALIDA a conclusão no
  servidor** (`count >= target`), credita XP direto no perfil + moedas COM o teto diário, reavalia
  badges de **poupador** se `lifetime_coins_earned` cruzar 300/1000, e **NÃO move o streak**.
  `GET /members/gamification/missions/me` + `POST …/missions/:slug/claim`. ⚠️ **O claim EXIGE
  que a missão esteja ATRIBUÍDA ao perfil no período** (`assignDaily/WeeklyMissions`, full review
  06/2026): o catálogo tem 8 missões mas o aluno só recebe 3+2; sem o guard, várias missões
  compartilham `goalType` com alvos diferentes (`daily-aula` 1 × `daily-aulas-3` 3) e a não-oferecida
  cujo alvo o aluno batesse era resgatável por POST direto (farm de XP sem teto) → `MISSION_NOT_FOUND`.
- **Ligas semanais** (migration `0022`, `league_membership`): coorte competitiva semanal por
  audiência. (Detalhes de tiers/promoção/rebaixamento em `docs/gamificacao.md`.)
- Sem backfill: histórico anterior ao deploy não gera XP retroativo (script manual se um
  dia for pedido). Aluno com tudo 100% não tem fonte de XP p/ estender streak ("revisão
  conta?" = decisão futura, fora da v1).

## Perfis kids (allowance — fatia 06/2026, PR1)

Os perfis "estilo Netflix" vivem no **auth** (`auth.profiles`); o members é só a
**fonte da verdade do TETO**: `GET /members/internal/profile-allowance?accountId=`
(rota S2S interna, exige `x-internal-token`; consumida pelo `auth` ao criar perfil)
devolve `{ maxProfiles }` = MÁXIMO de `snapshot.fulfillment.maxProfiles` entre as
matrículas ATIVAS da conta (`GetProfileAllowanceService` sobre `listActiveByUser`).
O campo `maxProfiles` (kids) entra no `FulfillmentSpec` do catálogo e **congela no
snapshot** no grant — para isso o `parseFulfillment` do `catalog-http.gateway` passou
a preservá-lo (antes descartava campos desconhecidos). Conta sem matrícula ativa → 0;
matrícula ativa SEM o campo (legado) → `DEFAULT_KIDS_MAX_PROFILES` (env, default 1).
Produtos adultos (sem o campo) contribuem 0 → o teto é naturalmente "kids-only" sem
join de audiência.

**Acesso por CONTA em sessão de perfil (PR3):** em sessão de perfil (estilo Netflix) o
gateway injeta `x-auth-account-id` (a CONTA do responsável) além do `x-auth-user-id`
(o PERFIL de criança). O `userId` segue identificando os DADOS (progresso/XP/conclusões/
rating — keyados no perfil); o ACESSO/matrícula resolve pela CONTA. `resolveAccountId`
(`interfaces/http/auth.ts`) = `x-auth-account-id ?? x-auth-user-id` (ausente → compat,
a conta É o id). As rotas passam `accountId` aos casos de uso de conteúdo, que o usam
SÓ no `CheckAccessService` (param opcional `accountId`, default → userId — zero
regressão no community adulto); `ListMyCourses`/`ListCatalog` resolvem `hasAccess`/
"meus cursos" pela conta e o PROGRESSO pelo perfil. O XP/streak/badges de
`GET /gamification/me` são do PERFIL (keyados no userId); só a COORTE do ranking usa o
accountId.

**Ranking por PERFIL (PR3b):** `gamification_profiles.account_id` (migration `0014`,
backfilled = user_id nas linhas legadas) é o elo perfil→conta. O award grava o
account_id **só no INSERT** (é IMUTÁVEL por perfil — nunca no update; sobrescrever a
cada award re-keyaria o perfil p/ si mesmo se uma chamada de sessão de perfil chegasse
sem `x-auth-account-id`); threading accountId em mark-complete/submit-quiz → AwardInput.
A coorte de `getRanking(userId, accountId, audience)` = PERFIS (não-equipe) da audiência
cuja CONTA tem matrícula na audiência (`account_id IN contas-com-matrícula`). Conta sem
matrícula na audiência → `null` (ranking omitido). Perfis-irmãos da MESMA conta competem
juntos; requester sem perfil (XP 0) ainda é contado. Migration `0015`: `account_id` vira
**NOT NULL** (com backfill defensivo) + índices `gamification_profiles_ranking_idx`
(`audience, privileged, xp`) e `_account_idx` (`account_id`) — sem eles o cálculo do
ranking varria a tabela inteira da vitrine.

## Admin (painel `@sistemazero/admin`)

Gestão de acesso pelo operador. Caminho `/members/admin/*` (distinto da API do aluno).
RBAC real no gateway (LEITURA → superadmin/admin/staff; ESCRITA → superadmin/admin); o
serviço confere os headers `X-Auth-User-*` via `requireAdmin` (defesa em profundidade,
`env.REQUIRE_ADMIN`, default `true`) **e exige o `x-internal-token`** (06/2026 — o
gateway injeta via `membersInternalTransforms`; sem ele os `X-Auth-User-*` seriam
forjáveis por quem alcançasse o serviço direto). `requireAdmin` trata `x-auth-user-status`
**AUSENTE como inativo** (06/2026 — o gateway SEMPRE injeta `active`; a falta indica chamada
que não passou pela borda → 403). Rotas em `interfaces/http/routes/admin.routes.ts`:

- `GET /members/admin/members` (`?status&courseRef&limit&offset`) → membros distintos
  (1 linha = 1 usuário com matrícula) com sumário (`activeCount/totalCount`, cursos,
  último grant). Identidade (nome/email) **não** vive aqui — o BFF hidrata do auth
  (`POST /auth/admin/users/batch`). `total` = nº de GRUPOS (subquery sobre o `GROUP BY`,
  nunca contar linhas); ordenação `max(granted_at) desc, user_id` (paginação estável).
- `GET /members/admin/members/:userId[?profileIds=<csv>]` → todas as matrículas (qualquer
  status) + progresso por curso. Usa `findCoursesBySlugs` (SEM filtro de status → admin vê
  draft/archived). **Perfis (estilo Netflix):** com `?profileIds=` (os perfis da conta, que o
  painel busca no auth) devolve TAMBÉM `profilesProgress` = progresso de CADA perfil sobre os
  MESMOS cursos da família (o nome do perfil é hidratado pelo painel). Ausente → só o progresso
  da conta (compat). `parseProfileIds` valida uuid + capa em 50 na borda.
- `POST /members/admin/entitlements` (body `{mode:'offer',offerRef}` | `{mode:'course',courseRef}`
  | `{mode:'all_courses'}`, + `userId`, `expiresAt?`) → concessão MANUAL. Reusa o agregado
  (`sourceKind:'manual'`, `sourceId:'manual'`, key `manual:${userId}:${productId}`; curso usa
  `productId=course.id`; `all_courses` usa o uuid-sentinela `MANUAL_ALL_COURSES_PRODUCT_ID`
  (nil uuid) — grants de chave-mestra via OFERTA usam o productId real do produto "acesso
  total" do catálogo), NÃO o motor de webhook. Idempotente; re-conceder ATIVA devolve a
  existente; revogada/expirada → 409 (use estender). `GrantManualEntitlementService`.
- `PATCH /members/admin/entitlements/:id` (body `{action:'revoke'|'expire'|'extend', expiresAt?}`)
  → carrega por id, aplica a transição no agregado, persiste com concorrência otimista
  (conflito → 409). **`extend` numa REVOGADA reativa** (`reactivate`: status→active,
  revokedAt→null, validade = a enviada) — é o caminho "use estender" documentado acima;
  o `extendTo` do ciclo de assinatura segue NUNCA ressuscitando `revoked`.
  `ManageEntitlementService`. Erros novos: `ENTITLEMENT_CONFLICT`→409,
  `OFFER_NOT_FOUND`→404. Oferta resolvida sem itens no grant manual → 400.

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
  **Quiz é validado semanticamente** na escrita (`validateQuizAuthoring`, 06/2026):
  ids únicos, ≥2 alternativas/questão, ≥1 correta e toda correta ∈ alternativas → 400;
  quiz SEM questões segue aceito (rascunho do builder). **`sandbox` do embed é
  allowlist** (`allow-scripts|forms|modals|popups|pointer-lock|downloads|presentation|
  orientation-lock`) — `allow-same-origin`/top-navigation → 400 (srcDoc na origin do
  community = XSS). `sortOrder` dos creates é `max+1` DENTRO do INSERT (+RETURNING).
- Anexos: `POST /lessons/:lessonId/attachments`, `PATCH/DELETE /attachments/:id`, `…/attachments/reorder`.

Slug duplicado (curso global, aula por curso) → 23505 → `DUPLICATE_SLUG`(409). Reordenar exige os
ids EXATOS dos filhos atuais (senão 400). Cursos têm `version` (concorrência otimista, last-write-wins
na prática — sem version do cliente); módulos/aulas/blocos/anexos não têm version. Erros novos:
`CONTENT_NOT_FOUND`→404, `DUPLICATE_SLUG`→409, `CONCURRENCY_CONFLICT`→409.

**Publicação por aula** (`lessons.is_published`, migration `0003`): `LessonBody` aceita
`isPublished` opcional — **ausente → `false`** (aula nova nasce RASCUNHO; aulas pré-existentes
foram backfilled `true` pelo default do DDL). Guard: criar/publicar curso com `status:'published'`
exige **≥1 aula publicada** → `NO_PUBLISHED_LESSON`(409) — e o invariante vale **pelo avesso**
(06/2026): despublicar/excluir a ÚLTIMA aula publicada, ou excluir o módulo com as últimas,
num curso `published` → 409 (`countPublishedLessons` com `excludeLessonId/excludeModuleId`).
Visão do ALUNO filtra rascunhos em tudo: outline (`findOutline(..., {publishedOnly:true})`),
GET da aula/complete/posição de vídeo/quiz-attempt → 404 em aula rascunho, e o progresso usa
numerador E denominador sobre publicadas (`countCompletedPublished*` × `countPublishedLessons*`
— conclusão de aula DEPOIS despublicada não conta/infla; o detalhe deriva ambos do outline).
O ADMIN vê tudo (árvore com rascunhos; `countLessons`/`countCompleted` cruas no member-detail).

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
migration `0004`), `processed_webhooks`, `studio_submissions` (entrega do Estúdio,
migrations `0013`/`0016`/`0026` — `0026` add `account_id` = conta responsável da entrega),
`certificates_issued` (certificado de conclusão, UNIQUE
user+course + serial — migration `0025`) e a **gamificação**: `gamification_profiles`/`xp_events`/
`user_badges` (`0009`–`0015`), `coin_events` (Zappy Coins, `0018`), `avatar_configs`
(`0019` + `photo_url` no `0023`)/`avatar_inventory` (`0019`), `room_state`/`room_inventory`
(`0020`), `mission_claims` (`0021`) e `league_membership` (ligas, `0022`).

## Sentry (monitoramento de erros)

`@sentry/bun`, ligado por `SENTRY_DSN` (ausente = no-op; projeto **`sistema-zero-members`**
na org `informach-nucleo-de-aprendizag`, us.sentry.io). Espelha o padrão do payments/auth
(3 camadas, `infrastructure/observability/sentry.ts`):
1. **Espelho de logs** (`withSentryMirror`, no composition-root): TODO log ERROR vira
   evento (fingerprint = nome do evento; contexto = extras) — cobre `grant.offer_empty`/
   `retention.cleanup.failed` etc. `MIRROR_SKIP` evita duplicar o que já é capturado
   como exceção.
2. **`captureException` no error-handler** (500 `unhandled.error`) — evento canônico com stack.
3. **Process handlers/boot** (`index.ts`): init no TOPO (após `loadEnv`), captureException +
   `flushSentry()` no shutdown. `release` = `RAILWAY_GIT_COMMIT_SHA`, `sendDefaultPii: false`
   (PII-free — userId em vez de e-mail nos logs), `tracesSampleRate: 0` (só erros).

## Deploy (Railway)

Serviço próprio no projeto `sistema-zero` via **`packages/members/railway.json`** (config-as-code:
Dockerfile `oven/bun:1` com build context = RAIZ do repo, watchPatterns members/core/lockfile,
healthcheck **`/readyz`**). `preDeployCommand` roda **`db:migrate` APENAS** — diferente do catalog
(`db:deploy` = migrate+seed): o seed do members (`scripts/seed-course.ts`) é **conteúdo de exemplo
de DEV** (curso demo com vídeo/anexos placeholder) e **NÃO pode rodar em produção**; o curso real é
autorado pelo painel admin. **SEM domínio público por design** — members só é alcançado pelo gateway
e recebe webhooks re-assinados por ele via private networking (`members.railway.internal:3004`).

Envs de prod: `NODE_ENV=production` (liga os refines fail-closed), `PORT=3004`,
`DATABASE_URL=${{Postgres.DATABASE_URL}}`, `GATEWAY_HMAC_SECRET` (= o do gateway; obrigatório
SEMPRE — boot falha sem ele), `INTERNAL_API_TOKEN` (= `MEMBERS_INTERNAL_TOKEN` do gateway;
obrigatório em prod), `CATALOG_INTERNAL_TOKEN` (= `INTERNAL_API_TOKEN` do catalog =
`CATALOG_INTERNAL_TOKEN` do gateway — 1 token, 3 hosts; obrigatório em prod) e
**`CATALOG_BASE_URL=http://catalog.railway.internal:3003`** (default `localhost:3003`; em
**produção o boot FALHA** se ainda apontar p/ localhost — refine 06/2026, antes quebrava só o
grant em runtime) e `SENTRY_DSN` (projeto
`sistema-zero-members` — ver §Sentry). **`HUB_BASE_URL`** (opcional; ex.:
`http://hub.railway.internal:3010`) liga a notificação ao hub no grant (best-effort, assina
com o `GATEWAY_HMAC_SECRET`; ausente = não notifica, o TTL do hub cobre; em prod, se setado,
NÃO pode ser localhost — refine) + `HUB_REQUEST_TIMEOUT_MS` (default 4s). Opcional:
`MAX_STUDIO_BODY_BYTES` (default 2 MB — teto
de corpo das rotas de Estúdio; ver §Conceito 6) e `DATABASE_SSL` (default `false`; `true` →
`ssl:'require'` se o Postgres passar a exigir TLS — hoje rede privada sem TLS). No GATEWAY:
`MEMBERS_URL=http://members.railway.internal:3004` + `MEMBERS_INTERNAL_TOKEN`. Ler tokens dos
irmãos com `railway variables --kv`.

## Pendente (fatias seguintes)

- ~~Upload de assets~~ **resolvido fora daqui**: o painel admin sobe p/ R2/Vimeo (`/api/media/*`)
  e a autoria do members segue guardando só URLs (sem storage próprio — por design).
- Feature de comunidade (fórum/feed) — hoje só modelada como kind/accessType.
- ~~Concessão p/ comprador RECORRENTE~~ **RESOLVIDA**: o funil usa `POST /auth/internal/ensure-buyer`
  (create-or-get por e-mail → SEMPRE devolve `userId`) antes do grant.
- Drip/`fulfillment.release`; "acesso até o fim do período" no cancelamento (hoje corta na hora).
- **Estorno → revogação automática** (hoje estornar no payments e revogar a matrícula são 2 passos
  manuais separados no admin — gap vs Hotmart/Kajabi) e **reconciliação de combo alterado**
  (adicionar curso a combo já vendido não re-concede; a chave-mestra cobre o caso "todos os cursos").
- `course_progress` materializado; fan-out direto payments→members (hoje passa pelo funil).
- ~~`metadata.salesPageUrl` editável pelo admin~~ **RESOLVIDO 06/2026**: campo "Página de
  vendas (URL)" no form de curso do painel (ver `GET /members/catalog` acima).
- Visualização das classificações do curso (listagem no admin e/ou média de estrelas no
  catálogo) — esta fatia SÓ coleta/guarda (`course_ratings`), decisão do usuário 04/06/2026.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Sem `any` novo fora de testes; entradas validadas (TypeBox/Zod).
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de rota/webhook/config? Atualizou este `CLAUDE.md`.

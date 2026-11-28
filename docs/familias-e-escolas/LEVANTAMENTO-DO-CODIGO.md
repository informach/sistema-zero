# Famílias e Escolas: levantamento do código

Feito em 28/11/2026, só com leitura, a partir da `staging` daquele dia. São quatro levantamentos: identidade e borda; members e aprendizagem; compra, hub e área dos pais; arquitetura e conferências.

**As linhas citadas envelhecem.** Antes de editar, abra o arquivo e confira. O que um levantamento não conseguiu confirmar está marcado como "não confirmado".

Os caminhos são relativos à raiz do repositório.

---

## A. Identidade, borda e aplicativos

### A1. `packages/auth`

- **Schema** (`src/infrastructure/persistence/drizzle/schema.ts`):
  - enum de papel em `:21`, tabela `users` em `:32-69`, coluna `role` em `:43`;
  - `profiles.account_user_id` em `:234` (o perfil só existe dentro de uma conta, `:229-271`);
  - aparelhos são da família: `study_devices` (`:403-420`, FK obrigatória para `users`), `study_grants` (`:422-445`, único por aparelho e perfil), `study_codes` (`:447-470`, conta + perfil), `study_attempts` (`:472`);
  - `audit_logs` em `:373-400`.
- **Papel:** a lista mora em `src/domain/user/user.role.ts:6-30` (quatro valores). Validada em `interfaces/http/auth.ts:32` (`resolveGatewayActor`) e em `dtos.ts:11`. Aparece literal em `admin.routes.ts:73-76`, `internal.routes.ts:51,66`, `browser-session.service.ts:35`, `desktop-session.service.ts:46,80,102`, nos serviços de administração (cada um com um `PRIVILEGED_ROLES` próprio) e em `impersonation.policy.ts:4-16`.
- **Token:**
  - access de 900 s e refresh de 30 dias (`infrastructure/config/env.ts:56-57`); impersonação 7200 s; bilhete de passagem 60 s (`:60,63`); sessão dos pais com prazo absoluto de 12 h (`domain/study-access/policy.ts:13`);
  - claims em `infrastructure/security/jose-token-issuer.ts:32-93` (`role`, `status`, `typ`, mais `act`, `pfl`, `kids`); `toClaims` em `:125`;
  - o token da criança não leva e-mail nem nome (`:45-51`), vira `customer` exceto para a equipe (`:39`) e carrega `kids={student, sessionId, deviceId, grantId}` (`packages/core/src/security/kids-session.ts:2-4`). Emissão em `study-access.service.ts:193-207`;
  - **a cada renovação**, `application/refresh/refresh.service.ts:71-76` relê a conta e `:111-116` recalcula o perfil. É ali que entra a conferência do vínculo a cada 15 minutos.
- **ensure-buyer:** cria ou encontra a conta pelo e-mail (`ensure-buyer.service.ts:38-77`, rota em `internal.routes.ts:154-171`). Exige nome, sobrenome e senha descartável na criação; não emite token. Chamadores: funil (`packages/funnel/src/server/fulfillment.ts:57`) e indicações (`packages/referrals/.../redeem-scholarship.service.ts:765`), pela borda (`packages/api-gateway/gateway.config.ts:1194-1196`, HMAC **sem** lista de consumidores permitidos). Não existe conta provisória.
- **Criar perfil:** só existe `POST /auth/profiles`, com sessão da conta (`interfaces/http/routes/profiles.routes.ts:134-159`). Exige `requestId`, nome com 3 letras ou mais e data de nascimento (menos de 18 anos); apelido opcional. O teto é conferido na criação: o auth chama o `profile-allowance` do members, e `privileged` pula a chamada (`application/profiles/create-profile.service.ts:136-140`). Todo perfil nasce `pending` e depende da admissão no members. Arquivar existe (`DELETE /auth/profiles/:id`), mas pede login recente do responsável. **Não existe rota interna para criar perfil, nem transferência ou fusão de perfis.**
- **"Entrar como":** quem pode entrar como quem em `impersonation.policy.ts:13`; pedido e troca do bilhete geram só log (`create-impersonation-token.service.ts:65`, `exchange-impersonation-token.service.ts:74`); troca de modo grava em `audit_logs` na mesma transação (`change-impersonation-mode.service.ts:95-138`); a borda grava o pedido (`audit:{}`) e toda escrita 2xx em modo escrita, com `impersonatorId`. Não há campo de motivo.
- **Limite de códigos:** 10 falhas por IP em 10 minutos no resgate (chave `redeem:${ip}`, `study-access.service.ts:116-133`) e por conta na emissão (`:85`). Constantes em `policy.ts:21-22`. A especificação pede limite por computador.
- **Migrations:** `bun run db:generate`, tabela `auth_migrations` (`drizzle.config.ts:20`); última conhecida `0027_profile_public_identity`. A partir da `0018`, nada de `CREATE INDEX` em tabela existente (`packages/auth/CLAUDE.md:689-699`, conferido por `migration-safety.test.ts`). As `0023`/`0024` não foram aplicadas em ambiente real (`auth/CLAUDE.md:37-40`).

### A2. Papéis repetidos fora do auth

Arquivos (não-teste) com a lista de papéis: admin 26, members 19, member-shell 15, community 8, community-kids 6, marketing, helpdesk e helpdesk-app 3 cada, marketing-app 2, arquipelago-api 2, referrals 1, e um em catalog, fiscal, hub, messaging, payments, funnel e palco-gravacao.

Pontos de peso: `packages/members/src/interfaces/http/routes/members.routes.ts` (52 ocorrências), os `interfaces/http/auth.ts` de cada serviço, `packages/admin/src/lib/types.ts:29` (`ADMIN_ROLES`), e o `gateway.config.ts` com **150** blocos `roles:` escritos à mão (mais `arquipelago-routes.ts:22,28` e `subscription-recovery-routes.ts`).

Casa natural: `@sistemazero/core/identity` (`packages/core/src/identity/index.ts`, hoje só o padrão de UUID, já exportado no `package.json`). `packages/core/src/staff/index.ts:92-96` repete a lista.

### A3. `packages/api-gateway`

- **Rota:** formato em `gateway-config.schema.ts:129-171`. `authorize.roles` aceita qualquer texto (`:58`, sem validar contra a lista); quem compara é `authorization.stage.ts:37-44`. Status padrão `active`. `auth.allowedConsumers` em `:48`.
- **Identidade repassada:** `IDENTITY_HEADERS` (`header-rules.ts:60-91`) vem das claims (`claims-user-resolver.ts:14-76`), passa por `AuthenticatedUser` (`authenticated-user.ts:8-53`) e é removida da entrada e reinjetada em `request-transform.stage.ts:35-57`. Para levar instituição e papel: claim nova → `toClaims` do auth → resolver → cabeçalho em `IDENTITY_HEADERS` (a remoção da entrada fica automática).
- **`kids-access-policy.ts:11-102`:** decide o que a criança e o responsável alcançam. Roda antes da conferência no auth (`jwt.strategy.ts:141`), bloqueia caminhos com segmento `admin|internal` (`:40-41`), lista dos pais (`:47-83`) e da criança (`:94-101`). Prefixo novo precisa entrar ali; fora da lista responde 403 `KIDS_CONTEXT_FORBIDDEN`.
- **Serviço novo, passo a passo:**
  1. URL, token interno e `header-inject`, no molde de `gateway.config.ts:235-249`;
  2. consumidor HMAC, se o serviço chama outros (`:369-378`);
  3. entrada em `services` (`:463-470`);
  4. rotas, no molde de `:5223-5245` e `:5392-5413`, ou um módulo condicional como `src/infrastructure/config/arquipelago-routes.ts`, plugado em `:5460-5468`;
  5. `PROD_REQUIRED_SECRETS` e `nonLoopbackProdUrls` em `env.ts:52-71` (variável ali derruba o gateway de produção se não existir no host antes do deploy; **as do serviço novo não entram**);
  6. política Kids;
  7. testes: `tests/unit/route-registry.test.ts` (registro local em `:6-160` e casos com a configuração real, como `:508`), `config.test.ts`, `kids-access-policy.test.ts`, `hmac-consumer-routes.test.ts`.

### A4. Serviço novo: o que exige

Pelo precedente do `referrals`:
- `package.json`, `Dockerfile`, `drizzle.config.ts` (com `schemaFilter` e `migrations.table` próprios), `schema.ts` com `pgSchema` (`packages/referrals/.../schema.ts:39`), `composition-root.ts`, `index.ts`, `CLAUDE.md`;
- `.railway/services/<svc>.json` (molde `referrals.json` ou `arquipelago-api.json`: preDeploy `db:migrate`, `/readyz`);
- `.railway/variables.ts` (`:27-40`, mais os blocos de staging e produção em `:504` e `:531`);
- `.railway/railway.ts:26` e `production-sources.ts:24,126`;
- `.github/workflows/ci.yml`: id do serviço `:1077`, lista de quem redeploya quando o core muda `:1133`, caminho para serviço `:1164`, passo de testes de banco `:427`;
- `scripts/ci/test-service-packages.mjs` acha o pacote sozinho;
- `scripts/dev.ts:35-51` não inclui referrals, helpdesk, hub nem arquipelago-api: o precedente é não incluir.

### A5. Aplicativos

- **community** (vai abrigar a área das instituições): layout em `src/app/(app)/layout.tsx:16-63` (`getSession` + `learnerIdentity(session,'adult')` + `CommunityFrame`); menu em `src/components/community/nav.ts:19-31` (`visibleCommunityNav` em `:45`); `src/proxy.ts` (rota nova entra em `protectedPrefixes`); `src/server/shell.ts` (`createShell({cookieBase:'sz_member', audience:'adult'})`); rotas `/api` são atalhos `export const { POST } = shell.routes.x`.
- **community-kids, área dos pais (`src/app/pais/`):** `layout.tsx` monta o `ParentSessionFrame`; `page.tsx:28-29` exige sessão de responsável; dados de `listReadonly` (perfis no auth), `getProfileAllowanceReadonly`, `listParentCourses` e `server/family-access.ts`; páginas `acompanhamento`, `conta`, `crianca/[id]` (abas em `parent-routes.ts:27-33`: progresso, aparelhos, jogo, perfil), `cursos`, `familia`, `nova-crianca`, `oficinas`, `ajuda`; componentes em `_components/*`; API em `src/app/api/parents/*` com `requireParentGateAccountOnly`.
- **Entrada da criança:** `(auth)/login/aluno/page.tsx` → `shell.study.recognize()` → `StudentEntry`; `/api/study/*` → `packages/member-shell/src/routes/study-access.ts` → auth.
- **member-shell:** `createShell` (`src/index.ts:67-146`) junta as fábricas de `routes/*.ts`; rota nova = fábrica `routes/<x>.ts` + atalhos nos apps. Anti-CSRF em `src/server/proxy.ts:72-77` (`Sec-Fetch-Site` com reserva de `Origin`); política Kids do BFF em `:179` (`lib/kids-bff-policy.ts:14-50`). A sessão lê as claims do cookie de cada app em `claimsToUser` (`src/server/session.ts:96-121`); cookies presos ao host.
- **Não há sessão compartilhada** entre o app Kids (área dos pais) e o app da comunidade adulta. "Escolher a área" é uma página nova (não existe `/entrar` hoje) com dois links de login.
- **admin:** grupos do menu em `NAV_GROUPS` (`src/app/admin/nav.ts:76-180`); o tipo do id aceita só `'turma'|'conteudo'|'negocio'` (`:55`), então o grupo Instituições exige ampliar o tipo; `PLATFORM_SCOPED_PREFIXES` em `:295-309` e `BOTH_COMMUNITIES_PREFIXES` em `:316`; página nova = `src/server/<svc>.ts` (`gatewayFetch`) + `src/app/api/admin/<x>/route.ts` com `forwardUpstream` (molde `src/app/api/admin/referrals/origins/route.ts`); o login recusa papel fora dos três da equipe (`admin/CLAUDE.md:1331`).

### A6. Testes desses pacotes

- Fakes do auth: `packages/auth/tests/fakes/in-memory.ts`; integração em `tests/integration/http-server.test.ts`.
- Banco real opt-in: `tests/db/*` com `TEST_DATABASE_URL`; `PROFILE_ADMISSION_TEST_DATABASE_URL` exige banco descartável `kids_journey_auth_*`.
- Um teste só: `cd packages/<p> && bun test arquivo -t "nome"`.
- Preload: `member-shell/bunfig.toml` carrega `tests/setup-env.ts`; `community-kids/bunfig.toml` carrega `test-setup.ts` e limita a busca a `root=tests`.

---

## B. Members e aprendizagem

### B1. Acesso (entitlements)

- **Schema** (`packages/members/src/infrastructure/persistence/drizzle/schema.ts`): origem `entitlement_source_kind` (`payment|subscription|manual`) em `:227-231`; tipos de acesso em `:210-220` (com `all_kids_courses`); tabela `entitlements` em `:623-658`, única por `(user_id, product_id, source_kind, source_id)` mais `idempotency_key`. **A matrícula é da conta, não da criança.**
- **Liberação manual com prazo:** `POST /members/webhooks/grant-manual` em `interfaces/http/routes/webhooks.routes.ts:170-249`; DTO `GrantManualWebhookBody` em `interfaces/http/dtos.ts:409-446` (`userId`, `expiresAt` ISO ou null, `sourceId` de 1 a 120 caracteres). Só o consumidor `referrals` chama, por HMAC (`members/CLAUDE.md:2102`; borda em `gateway.config.ts:3504-3516`). Pela rota S2S: modos `offer|course|mural_visitor|mural_trial`. `all_kids_courses` só pelo Admin com JWT.
- **Serviço:** `application/grant-manual-entitlement/grant-manual-entitlement.service.ts` — aceita `all_kids_courses` com `sourceId` (`:83`, `grantAllKidsCourses` em `:387-420`, produto sentinela `…0001`); a chave de idempotência ganha `:sourceId` (`:567-570`), então origens diferentes viram matrículas separadas; `sourceKind` sempre `'manual'` (`:586`). Depois do grant, o hub é avisado (`webhooks.routes.ts:226`).
- **Vencimento e lembretes:** sem job próprio; a varredura `expireLapsed` vai no ciclo de retenção (`members/CLAUDE.md:2312-2336`). Os lembretes filtram `payment`, `scholarship:%`, curso com dias anunciados ou assinatura (`renewal-reminder.repository.ts:69,172,290-291,389-397`): um `sourceId` `institution:...` não dispara lembrete. `commerceAccess` classifica pelo prefixo do `sourceId` (`application/access-check/access-check.service.ts:37-41`).
- **Número de perfis:** `application/profile-allowance/get-profile-allowance.service.ts:45-62` usa o **máximo** de `snapshot.fulfillment.maxProfiles` e depois `Math.max` com as vagas ao vivo (`live-benefits.repository.ts:30-35`). Sem `maxProfiles`, cai no `DEFAULT_KIDS_MAX_PROFILES`. Rotas: `internal.routes.ts:89` (S2S do auth) e `members.routes.ts:388-391` (equipe recebe `MAX_SAFE_INTEGER`).
- **Precedente por criança:** `live_enrollments` (`schema.ts:2576-2596`, `account_id` + `learner_id`); `CheckAccessService.assertLive` (`application/access/check-access.service.ts:175-206`) com `EntitlementAggregate.virtualLiveSeat` (`domain/entitlement/entitlement.aggregate.ts:131`); Mural por criança `hasMural` (`live-benefits.repository.ts:36-48`).
- **Onde o acesso é conferido:**
  - curso: `CheckAccessService.requireBySlug/ById` (`check-access.service.ts:70-168`; chave-mestra pela audiência em `:119-129`), chamado por cerca de 25 serviços (get-lesson, mark-lesson-complete, submit-quiz-attempt, submit-studio-project, learning.service, certificate, showcase-payload, lesson-draft-access, teacher-broadcasts...), mais `list-my-courses.service.ts:65` e `list-catalog`;
  - ferramentas: `AccessCheckService.execute` (`access-check.service.ts:46-61`), `GET /members/access` (`members.routes.ts:347-384`, a chave-mestra não conta), Zappy (`members.routes.ts:219-276`), `studio-ai-usage.routes.ts:42-53`, Pensa (`pensa.routes.ts:81-111`), `molda-dos-cenarios.ts:50-55`, `mission-access.ts`, `free-studio-access.service.ts`;
  - hub: `POST /members/internal/access-check` (`internal.routes.ts:73`);
  - posse das criações: `assertToolOwned` (`creations.service.ts:142-151`, cache em `tool-ownership-cache.ts`).
- `all_kids_courses` abre todos os cursos Kids, inclusive os para pais, e **não** abre as ferramentas.

### B2. Aula

- **Importação do manifesto:** `application/learning/learning-import.service.ts` (`preview` `:153-468`, `apply` a partir de `:470`). Cada bloco ganha id estável `importedLearningId(lessonId,'block',key)`. **As seções são reconstruídas inteiras, campo a campo** (`:302-334`: título, objetivo, intent, blocos, workspace, externalTool, `teacherNotes` em `:317`, `completion`). Campo novo fora desse mapeamento se perde.
- **Contratos no core:** `LearningManifest` em `packages/core/src/learning/index.ts:941-1011`, validador em `:1098-1153`, `LessonSection` em `:81-98`; objetivo `SectionJavaScriptProjectCheck` com `id` estável em `core/src/learning/section-progression.ts:87-100` (validador `isSectionCompletion` em `:442+`); quiz em `core/src/learning/manifest-quiz.ts:2` (questões com `id`). Projeção de autoria em `core/src/learning/authoring-manifest-projection.ts`.
- **Marcação de habilidades:** seguir o caminho do `teacherNotes` — `skills?` em `LessonSection`, em cada objetivo e em cada questão; entrar no validador do core, no mapeamento do import e no TypeBox `learning.dtos.ts` (`LessonSectionSchema` `:1082-1106`, objetivos `:1018-1050`; o objetivo Python usa `additionalProperties:false` em `:1033`). As evidências já congelam a definição (`quiz-attempt.repository.ts:69` grava `definition: block.content`; `section-progression.service.ts:1002` grava `checks`). A vista da criança monta campo a campo (`projectObjectiveView` em `section-progression.ts:135-141`, `GetLessonService`), então não vaza a marcação.
- **O que é gravado:** `lesson_evidence` (`schema.ts:1647-1662`, tipos `section_project|platform_action|quiz|studio`): verificação do projeto (`section-progression.service.ts:977-1008`; ensaio da equipe não grava, `:975`), quiz (`quiz-attempt.repository.ts:57-71`), entrega (`studio-submission.repository.ts:140`). `quiz_attempts` (`:679-701`, toda tentativa com nota); `lesson_section_progress.objective_results` (`:535-558`, só o último); `learning_attempts` (`:586-603`); `lesson_block_progress.attempts_count` (`:560-583`); `lesson_completions` (`:661-674`). Tudo por perfil (`user_id`) mais `account_id`.
- **Sincronização Kids → adulto:** regra em `domain/course-publication/course-sync.ts:306-327`, **copia a seção com spread** (um `skills` novo vai junto); executor em `infrastructure/persistence/drizzle/course-sync.ts:120`. Os ids de objetivo e quiz são remapeados: a marcação precisa ficar dentro do item. A primeira sincronização depois do campo novo marca todas as aulas como alteradas.

### B3. Gamificação

- **Sequência:** `domain/gamification/gamification.ts` (`localDateSaoPaulo` `:51`, `advanceStreak` `:117`, `effectiveStreak` `:147`); consumo de protetores no `award` de `gamification.repository.ts:~472-485`, sob advisory lock; estado em `gamification_profiles` (`schema.ts:981-1034`: `streak_freezes`, `vacation_*`).
- **Protetor comprado:** `STREAK_FREEZE_PRICE=80` em `domain/gamification/coins.ts:33`; rotas `POST /members/gamification/streak-freeze/buy` (`members.routes.ts:708`) e `/vacation` (`:720`). Marcos de sequência dão moedas e as medalhas streak-7 a streak-365.
- **Avisos de perda:** nenhum template ou mensagem encontrado no members (a interface do Kids não foi conferida a fundo).
- **Ranking e liga:** `GET /gamification/me?ranking=true` e `/gamification/ranking` (`members.routes.ts:744`). A coorte são os perfis cuja conta tem **qualquer matrícula ativa** na audiência, com `privileged=false` (`gamification.repository.ts:120-129` e `:1472-1484`; o mesmo predicado monta as coortes em `:1136`, `:1203`, `:1426`, `:1812`). Liga em `league_membership` (`schema.ts:1212-1228`), grupo `(audience, week_key, tier)`, sem dimensão de instituição; regras em `domain/gamification/league.ts:12-45` (mínimo 5, sobe e desce 20%). **Consequência:** a liberação da escola (`all_kids_courses`) poria o aluno no ranking geral.
- **XP e posto:** pela política com `curriculum`, Mural, XP e sequência são opcionais para promover (`docs/jornada-do-criador.md:26-30`). Publicar alimenta marcos, medalhas e missões (`course_showcased`).

### B4. Zappy e IA

Três entradas de IA:
1. `/members/ai-usage/consume` — por conta, sem perfil, com **falha aberta** no BFF (`packages/member-shell/src/server/ai-quota.ts:29-52`). Atende Pensa e descrição do jogo. Serviço `application/ai-usage/consume-ai-usage.service.ts`.
2. `/members/internal/zappy/questions`.
3. `/members/internal/studio-ai/usage` (`member-shell/src/routes/studio-zappy.ts:576` e `:755`), serviço `studio-ai-usage.service.ts:29-80` (no Kids exige `estudio-completo`).

- Zappy Kids no BFF: `studio-zappy.ts:508-527` confere o Estúdio e `isStudioZappyAllowed` (capacidade `ai` da Jornada, `server/zappy-access.ts:10-15`). No members: só `estudio-completo` (`members.routes.ts:235-243`).
- Pensa: `canGenerate` em `pensa.routes.ts:81-111` (Kids: capacidades `pensa` + `ai` + produto; `:107`) e `member-shell/src/server/pensa/context.ts:242`.
- Descrição do jogo: `member-shell/src/routes/studio.ts:681-710`, só o adulto exige a capacidade `ai` (`:683-689`); `server/openrouter.ts:65-124`.
- Cota: `AI_LIMIT_DAILY=50` e `AI_LIMIT_MONTHLY=500` em `infrastructure/config/env.ts:156-157`, por conta.
- Onde guardar a chave por criança: **não** em `profile_preferences` (`schema.ts:126-148`), que a criança edita; tabela nova só dos pais. O interruptor é uma política única aplicada na composição das capacidades, no `ConsumeAiUsageService` (que passa a receber o perfil) e no `reserve`, com falha fechada.

### B5. Tempo de uso

Nada é gravado hoje. Sinais existentes: `live_presence` (`schema.ts:2692-2708`, só nos encontros), `POST /members/gamification/activity` (uma vez por sessão), `lesson_navigation.updated_at`, `lesson_progress.updated_at`.

Precedente completo no `packages/arquipelago-api`: `src/domain/sessao-de-tempo.ts` (concessão de 20 s, `pulsar`/`pausar`), `src/domain/intervalo-de-tempo.ts`, tabela `eventos_tempo` (`migrations/0001_eventos_tempo.sql`, 1 a 120 s por evento, por dia), limite da família com BFF em `packages/member-shell/src/routes/arquipelago.ts` (`arquipelagoTempo`, `arquipelagoLimiteDaFamilia`).

### B6. Recados

- `teacher_threads` (`schema.ts:1788-1828`: perfil, conta, audiência, `context_type` em `:1638-1645`, `broadcast_id`, `workflow_status`); `teacher_messages` (`:1830-1862`, autor `teacher|student`); `teacher_thread_staff_reads` (`:1865-1878`); `teacher_broadcasts` e `teacher_broadcast_recipients` (`:1753-1786`).
- A criança responde só nas conversas dela; o lado do professor é qualquer equipe por `requireAdmin` (`teacher-broadcast.routes.ts:14`). Caixa única e global (índice `teacher_threads_lastmsg_idx`). Recado para grupos: só `student|course|kids` (`domain/ports/teacher-broadcast-repository.port.ts:9-12`); worker a cada 5 s (`composition-root.ts:1814`). Não há turma.
- Visualizador de entregas do Admin: rotas em `content.routes.ts:382` (por bloco), `:413` (por curso), `:425` (global); lê `studio_submissions` (`schema.ts:730+`); telas em `packages/admin/src/app/admin/professor/entregas` e `recados`.

### B7. Relatório para os pais

`GET /members/parents/children-stats` (`members.routes.ts:982-997`) → `GetChildrenStatsService` (`application/children-stats/get-children-stats.service.ts`: vista em `:29-69`, semana em `:172-220` com `sumWeeklyXp`, aulas, quizzes, `countBadgesUnlockedInPeriod`, `countSubmittedInPeriodByAudience`, `learning.weeklyTopics` e o Mural pelo hub, sem falhar se o hub cair). Janela `weeklyPeriodKey`/`weekBoundsUtc` (`domain/gamification/missions.ts`), de segunda 03:00Z até agora. O e-mail semanal (`application/parent-report/send-parent-reports.service.ts`) reaproveita o mesmo serviço. Habilidades e tempo de uso entram como mais um item do `Promise.all`.

### B8. Padrões do members

- Camadas em `members/CLAUDE.md:1964-1988`. `composition-root.ts` com cerca de 1.880 linhas (serviços em `~460-1300`, timers em `1668-1830`, advisory locks com chaves fixas `…747`, `…748`, `…749`).
- Fakes `tests/fakes/*-in-memory.ts`, `tests/helpers.ts` (`buildApp` em `:173`).
- `tests/db` com mais de 100 arquivos, opt-in por `*_TEST_DATABASE_URL`, num banco compartilhado (`members/CLAUDE.md:3370-3392`); cada arquivo escreve o próprio DDL com `add column if not exists` e usa `truncate … cascade`.
- Migrations: `db:generate` = `drizzle-kit generate`, journal `members_migrations`. O último `when` conhecido (0176) é `1795400000000`, número redondo carimbado à mão (23/11/2026).
- Conexão: postgres-js com pool `max` 10 e `drizzle(client, { casing })`, igual em todos os serviços (`infrastructure/persistence/drizzle/db.ts:32-43`).

---

## C. Compra, hub e área dos pais

### C1. Catálogo (`packages/catalog`)

- **Oferta:** `src/domain/offer/offer.aggregate.ts`; `OfferContent` (`:25-66`): `allowsCoupon`, `maxProfiles`, `pageSellable`, `altOffer`, `advertisedAccessDays` (JSON sem migração; validação em `src/interfaces/http/dtos.ts:90-109`). Prazo `accessMode` (`lifetime|fixed|billing_cycle`) em `access-policy.ts`, enum em `schema.ts:41`. Assinatura ativa exige `billingIntervalMonths` (`:477-487`); preço maior que zero (`:441`). Ofertas não têm quantidade.
- **Perfis:** `get-offer.service.ts:72-95` põe o `maxProfiles` da oferta no item principal do combo.
- **Cupom:** `quote-offer.service.ts:64-120`; em assinatura só na 1ª cobrança, mínimo R$ 3; cupom de campanha consulta o referrals (`:75-96`).
- **Entrega** (`fulfillment.ts:27`): `course`, `all_courses`, `all_kids_courses`, `community`. Estúdio, Pensa, Pinta, Molda, Clube e Mural são `community`, com a chave igual ao slug.
- **Combo semeado:** `scripts/catalog-seed-definitions.ts`; Comunidade em `:158-199` (chave-mestra `isPrimary` + 6 componentes); ofertas irmãs em `:550-594`.
- **Para o plano pelo código:** combo novo com a chave-mestra (principal), Estúdio, Pensa, Pinta e Molda, sem Clube e Mural; duas ofertas ligadas por `altOffer` (mensal assinatura R$ 69,90 `maxProfiles: 2`; 6 meses `one_time` `fixed` R$ 399). **Não existe campo que limite a oferta ao Pix.** Para travar Arquipélago e ranking geral seria preciso chave nova; quem já assina não recebe chave nova sozinho (precedente do Molda, `catalog/CLAUDE.md:66-69`), por isso a trava escolhida é negativa (lote 12).
- **Perfil extra:** dá para cadastrar como produto `community`, mas o members calcula o máximo (`get-profile-allowance.service.ts:52-57`). Precisa de campo novo que some.
- **Oferta só com código:** não existe. Precedente mais próximo: a consulta externa do cupom de campanha. `pageSellable` desligado e sem `memberPromotion` evitam que a oferta apareça à venda.

### C2. Pagamentos (`packages/payments`)

- Estados PENDING → ACTIVE → CANCELED ou EXPIRED (`src/domain/subscription/subscription.status.ts:10-24`). **Não há pausa.**
- **Cancelar corta a cobrança na Efí na hora** (`payment-gateway.port.ts:319`); o acesso segue até o fim do ciclo mais carência porque o members expira sozinho. Origens do cancelamento em `cancellation-record.ts:3-12` (CUSTOMER, ADMIN, CONSUMER, NONPAYMENT, EXTERNAL, SCHEDULE_COMPLETED), sem "troca de plano". Entradas em `cancel-subscription.service.ts:56,65,137`; o consumidor só cancela o que criou (`:52-69`).
- `updateSubscriptionAmount` (port `:302-306`, `efi.gateway.ts:398`) só é usado em `first-charge-setup.service.ts:131-143`.
- `firstChargeAmountInCents` (`create-subscription.service.ts:131-137`): mínimo R$ 3 e menor que o valor normal; o funil só preenche com cupom (`packages/funnel/src/server/checkout.ts:772`). Base para o desconto na troca.
- O comprador: `interfaces/http/routes/my.routes.ts` — listar (`:77`), trocar cartão (`:89-133`), repetir cobrança (`:134-176`), cancelar (`:177-186`); com sessão de perfil ou suporte, recusa (`:52-60`).
- Do pagamento ao acesso: `packages/funnel/src/server/webhook.ts:44-225` chama `makeGrantMembers` e `makeExtendMembersForCycle` (`members-grant.ts:91-137`).
- Pix: assinatura só no cartão, exceto a anual (12 meses), que vira pagamento à vista (`checkout.ts:441-455`). O token do cartão é de uso único e nunca guardado.
- Admin de pagamentos só estorna e cancela (`admin.routes.ts:285,293`).

### C3. Funil (`packages/funnel`)

- **Mini checkout:** `src/server/member-commerce.ts` (ações `:61-71`; `recover` `:151-161`; `restart` `:212-241`; substituição depois de assinatura cancelada ou vencida `:242-271`; `quoteMemberOffer` `:299-324` recusa assinatura).
- **Trava por conta + produto:** `member-commerce-store.ts:86-94` (lock no Postgres) e `:237-305`; usada em `member-commerce-charge.ts:32-61`, liberação em `member-commerce-claim.ts:12-46`. **Por produto: não impede dois planos de produtos diferentes.**
- **Página que resolve código:** `src/pages/cupom/[codigo].ts` (regex, resolve, 302, cookie `funil_origem` em `lib/lead-origin.ts:16,35`). Também `pages/bolsa/[codigo].astro` e `pages/i/`. Cookie do lead `funil_lead` (`lib/lead-session.ts:5`).
- **Rate limit:** `middleware.ts:17-29,86-102`, lista em `lib/rate-limit-paths.ts:11-21` (`/cupom` não está).
- **Onde caberia `/codigo`:** `src/pages/codigo/[codigo].astro`, entrando em `rate-limit-paths.ts`; compra pelo mini checkout com origem nova em `CommerceOriginSchema` (`packages/core/src/commerce/index.ts:67-80`), o que obriga a mexer em `commerceOriginKey` e `store.recover` no funil e `originConfig` no member-shell.
- Checkout exige CPF (`lib/checkout-schema.ts:65,95`).
- Testes: `tests/integration/member-commerce.test.ts`, fakes em `tests/fakes/fake-gateway.ts` e `fake-db.ts`.

### C4. Member-shell e área dos pais

- **BFF da compra:** `packages/member-shell/src/routes/commerce.ts` — `siblingOffers` (`:56-62`, só a irmã do `altOffer`), `originConfig` (`:109-183`), `otherPlan` (`:189-207`), `eligibility` (`:208-236`), troca de plano (`:407-413`), resposta "você já tem" (`:419-429`).
- **Elegibilidade:** `src/lib/commerce-eligibility.ts:33-49`, também por produto.
- **Textos:** `src/components/commerce/commerce-copy.ts` — `planName`/`planShortName` (`:27-39`) escrevem "Plano a cada null meses" numa oferta avulsa; `pixAllowed` (`:42`); `annualSavingsCents` só compara mensal com anual (`:84-90`); `isCommunityProduct` decide pelo SKU (`:100-107`).
- Componentes: `purchase-form.tsx`, `commerce-panel.tsx`, `commerce-card.tsx`, `pending-purchases.tsx`.
- **Área dos pais** (`packages/community-kids/src/app/pais/`): moldura em `layout.tsx` e `_components/parent-shell.tsx`; Início em `page.tsx` e `parents-client.tsx`; Família em `familia/`; filho em `crianca/[id]/`; Cursos em `cursos/`; Oficinas em `oficinas/`; Ajuda em `ajuda/`; Conta em `conta/page.tsx` e `account-client.tsx`.
- **Histórico e cancelamento:** `_components/purchase-history.tsx` (`PurchaseHistory` `:50`, `ParentSubscriptions` `:145`, DELETE em `:153-154`, cancela no fim do período).

### C5. Hub (`packages/hub`)

- **Quem vê:** `domain/access/access-config.ts` (public, course_gated, community_gated, role_gated); o canal só restringe (AND com o espaço). O slug do espaço é globalmente único (`schema.ts:94`).
- **Resolução de acesso:** `application/access/access-resolution.service.ts` (por conta, `:152,258-262`); slugs fixos do Mural em `:44-54` e `:87-126`; exceção das oficinas (`liveMural`) em `:80-94`.
- **Paredes do mural:** variável `SHOWCASE_WALL_SLUGS` em `infrastructure/config/env.ts:103-105,125-131`; `composition-root.ts:183`.
- **Destino da publicação:** `application/showcase/showcase.service.ts:483-513`. Para Kids não confere se a criança tem acesso ao espaço (só o adulto confere, `:507-511`). `assertNotVisitorOnly` (`:438-462`) deixa passar quem tem `hasMasterKids`: **o acesso da escola (chave-mestra Kids) já publicaria no Mural dos Criadores.**
- **Slugs fixos fora do hub:** `packages/member-shell/src/routes/hub.ts:71`; `routes/studio.ts:326` (`CREATOR_SHOWCASE_SLUGS`, de `packages/core/src/creations/community-access.ts:1-4`); Kids: `src/app/(app)/mural-dos-criadores/page.tsx:76`, `src/components/kids/nav.ts:96-97`, `src/proxy.ts:27-28`.
- **Um post por projeto:** `threads.showcase_source_key` (`hub/CLAUDE.md:168-186`); a chave não inclui o mural e o índice único é global (`showcase.service.ts:351-364`). Publicar em outro mural devolve o post existente como atualização (`:372-385`). Com "publicar como jogo novo", o post antigo perde a chave e continua no ar (`thread.repository.ts:182-193`). Falta "trocar de mural".
- **Moderação:** `moderation.routes.ts`; no gateway, ler é para staff ou acima e escrever só para admin ou acima (`gateway.config.ts:4831-4847`). Não há moderador por espaço. Espaço Kids nasce com pré-moderação; post de vitrine nasce visível. Denúncias em `application/moderation/report.service.ts`.
- **Para ter mural por instituição:** trocar a lista da variável por marca no espaço; conferir `canInteractChannel` também na publicação Kids; BFF e páginas recebem o slug em vez do fixo; chave `community_gated` por instituição e segmento (ou acesso pelo vínculo); tirar a passagem livre do `hasMasterKids` no Mural dos Criadores.

### C6. Fiscal

Nota só para CPF: em `packages/fiscal/src/application/handle-payment-webhook/handle-payment-webhook.service.ts` (`:26`, `:148-158`), documento diferente de 11 dígitos agenda a nota e a marca FAILED na hora. A emissão manual pelo Admin também exige CPF (`dps-builder.ts:64-66`). O checkout do funil exige CPF. O payments aceita CNPJ no Pix (`devedor`).

### C7. Testes

Fakes: `packages/catalog/tests/fakes/in-memory.ts`, `packages/payments/tests/fakes/*`, `packages/hub/tests/fakes/in-memory.ts`, `packages/funnel/tests/fakes/*`. Componentes (happy-dom): `packages/member-shell/tests/commerce-*.test.ts(x)` e a fixture `tests/fixtures/commerce-card.fixture.tsx`. Kids: `tests/parents-area.test.tsx`, `parent-courses.test.tsx` e `profile-allowance.test.ts` (trava `COMUNIDADE_MAX_PROFILES` contra o seed). E2E Playwright em `packages/community-kids/e2e*`.

---

## D. Arquitetura e conferências

### D1. Por que o serviço novo `institutions`

1. Todo serviço migra e roda com a mesma `DATABASE_URL`, então a aplicação é dona das tabelas, e no local e no CI ela é superusuário. Dono e superusuário ignoram a política de linha. Só um schema à parte permite usar um papel sem posse, com permissão apenas em `institutions.*`.
2. O `members` passa de 175 migrations e os repositórios usam `db` direto: um repositório esquecido furaria o isolamento em silêncio, e cada migration nova arrisca os cursos gravados.
3. Custo do serviço: um JSON em `.railway/services`, um Dockerfile e cerca de 8 variáveis; o CI descobre o pacote sozinho.

### D2. Conferências

- **(a) Isolamento no banco é viável**, mas `FORCE ROW LEVEL SECURITY` sozinho não basta (superusuário ignora). Saída: a migration cria um papel `NOLOGIN` sem posse; um ajudante abre a transação com `SET LOCAL ROLE` e `set_config('app.institution_id', id, true)`. Precedente de `set_config` por transação: `packages/members/src/infrastructure/persistence/drizzle/pinta-causal-leases.ts:27`. Não há precedente de RLS no repositório. Não confirmado: o papel do banco no Railway e o suporte do drizzle-kit a `pgPolicy` (conferir na documentação). Antes de publicar o lote 9: `select rolsuper, rolbypassrls from pg_roles where rolname = current_user` na staging.
- **(b)** Não existe rota interna para criar perfil (ver A1).
- **(c)** A sessão lê as claims do cookie de cada app (`member-shell/src/server/session.ts:96-121`). Quem trabalha em duas escolas escolhe depois de entrar, e a escolha é validada contra a claim.
- **(d)** Arquipélago: só `ARQUIPELAGO_MODO`, públicos e lista (`packages/arquipelago-api/src/domain/acesso.ts:22-34`; porta de membros em `src/domain/membros.port.ts`). Ranking: qualquer matrícula ativa (ver B3). A trava exclui `source_id like 'institution:%'` e os `offerSlug` do plano pelo código. `MotivoDeBloqueio` é contrato do jogo compilado (`arquipelago-contracts`).
- **(e)** Ver B4: três entradas de IA.
- **(f)** A sincronização copia a seção com spread (ver B2).
- **(g)** Publicar em outro mural (ver C5).
- **(h)** `grant-manual` com `all_kids_courses`: o serviço aceita, nenhuma rota entre serviços chega lá. Saída: rota interna nova no members, com token próprio (precedente `MEMBERS_PROFILE_ADMISSION_TOKEN`). Os lembretes não alcançam `institution:`.
- **(i)** União dos perfis exige: perfil extra que soma (campo novo no `fulfillment`); liberação da instituição contribuindo zero; resposta trazendo os perfis com vaga; no auth, criação pela importação fora do teto, e `createWithinLimit` sem contar perfis nascidos da instituição.

---

## E. Peças a reaproveitar

- **auth:** `EnsureBuyerService`, `CreatePasswordTokenService` (convite com prazo de 14 dias), `StudyAccessService.redeem/enter`, `createStudyCode`, `normalizeStudyCode`, `takeAttempt`/`attemptsExhausted`, o recálculo em `refresh.service.ts:111-116`, `canImpersonate`, auditoria pela borda (`audit:{}` → `POST /auth/internal/audit`), `ReadAuditLogService`.
- **borda:** `normalizePolicyPath`, `KIDS_IDENTITY_HEADERS`, o módulo condicional `arquipelagoGateway`, `@sistemazero/core/identity`.
- **apps:** `createShell`/`createMemberProxy`; `forwardUpstream` no admin.
- **members:** `GrantManualEntitlementService` (`all_kids_courses` com `expiresAt` e `sourceId`), `expireLapsed`, aviso ao hub; `live_enrollments` + `virtualLiveSeat`, `DrizzleLiveBenefitsRepository.maxProfiles` e `hasMural`; `AccessCheckService` e `creativeToolAccessRef` (`packages/core/src/creations/tool-access.ts:2`); o padrão do `teacherNotes`; evidências que congelam a definição; `GetChildrenStatsService` e `weekBoundsUtc`; `profile_preferences`/`ProfilePreferencesService` (como modelo, não como casa da chave dos pais); `studio-ai/usage` (`reserve`) e `canGenerate`; `TeacherThreadsService` e `TeacherBroadcastsService`; `league.ts` (`resolveTier`) e `getRanking` com coorte filtrável.
- **arquipelago-api:** a sessão de tempo (concessão + eventos por dia) e o limite da família.
- **compra:** `altOffer`, `siblingOffers`/`otherPlan`; `maxProfiles` no `getEntitlements`; combo semeado por `CATALOG_SEED_*`; `firstChargeAmountInCents` e `updateSubscriptionAmount`; `CancelSubscriptionService` e `ParentSubscriptions`; `withProductLock` e `canReleaseProductClaim` (generalizar para grupo de planos); `commerceEligibility`; a página `cupom/[codigo].ts` e o cookie `funil_origem`; `quoteMemberOffer`.
- **hub:** `community_gated`, o teaser bloqueado, `ShowcaseService` com `showcase_source_key`.

## F. Armadilhas

- **Migrations:** o carimbo `when` é relógio; migration abaixo da maior já aplicada é **pulada em silêncio** (incidente em `packages/members/CLAUDE.md:1459-1471`). Gerar na hora e conferir o `_journal.json`. `ALTER TYPE … ADD VALUE` não pode na mesma transação, e o lote de migrations roda numa transação só: use texto com CHECK. CHECK novo valida as linhas existentes. No `auth`, sem `CREATE INDEX` em tabela existente.
- **Enum de origem intocado:** não acrescentar valor a `entitlement_source_kind`; a procedência vai no `sourceId`.
- **Enum de papel intocado:** os papéis de instituição moram no vínculo.
- **Campo desconhecido some em silêncio:** o `normalize` do Elysia descarta campo não declarado. Declarar o campo novo em todos os DTOs.
- **Borda:** `roles` não é validado (erro de digitação passa calado). Variável em `PROD_REQUIRED_SECRETS` derruba a produção se faltar. O cabeçalho novo precisa entrar em `IDENTITY_HEADERS` para ser removido da entrada. `ensure-buyer` não tem `allowedConsumers`.
- **Política Kids:** lista de permissão; segmento `admin` ou `internal` sempre negado à família.
- **Token da criança:** sem e-mail nem nome. Claim nova precisa passar por `toClaims` e pelo resolver da borda.
- **Aparelho:** `study_devices` exige a conta da família. O limite por IP derruba um laboratório inteiro.
- **Contratos compartilhados:** mudar o `core` publica de novo todos os serviços; uma origem nova exige os `switch` dos consumidores.
- **Matrículas congeladas:** quem já assina não ganha chave nova sozinho; mudar um combo depois da venda não se propaga. O degrau sai do `offerSlug` e do `sourceId`, nunca do `fulfillment` do componente.
- **Ofertas:** oferta ativa precisa entregar alguma coisa; preço maior que zero; cobrança de assinatura mínima de R$ 3. Produto sem oferta principal marcada responde 503 na página do funil. Oferta avulsa no seletor de plano quebra `planName` e o cálculo de economia.
- **Efí:** cancelar corta na hora; não existe início agendado. Na troca, abrir a nova (com `firstChargeAmountInCents`) e só então encerrar a antiga. `POST /members/webhooks/subscription canceled` tira o acesso na hora (ninguém chama hoje).
- **Hub:** cache de acesso de 30 s; canal só restringe; nunca gravar a chave de visitante no acesso; pré-moderação Kids.
- **RLS:** a variável volta como `''`, não nula, depois do primeiro uso (`nullif(..., '')::uuid`); `ALTER DEFAULT PRIVILEGES`, senão tabela nova nega em runtime; nenhuma chamada HTTP dentro da transação.
- **Identidade:** em sessão de perfil, os dados são do perfil (`userId`) e o acesso é da conta (`resolveAccountId`); a área dos pais usa `resolveUserId`. Escritas recusam `x-auth-impersonator-id` (oficinas, Zappy, Pensa).
- **Gamificação:** tolerante a falha (`AwardGamificationService`); tarefa ou plano não pode gerar XP em dobro (ledger idempotente por fonte). Advisory locks com chaves fixas e ordem conta → perfil → gamificação → política. A equipe fica fora do ranking (`privileged`).
- **Telas e textos:** "Minhas compras" não muda de nome sem nova versão dos Termos. Vocabulário Kids e "Jornada" como nome próprio.
- **happy-dom:** dentro de `waitFor`, não passar elemento do DOM para um `expect` que pode falhar (compare com `null` e afirme o booleano); registrar o happy-dom antes de importar o `react-dom` (`admin/CLAUDE.md:302`); o `MutationObserver` morre na primeira coleta de lixo (`community-kids/CLAUDE.md:2644`); `canvas` e `createImageBitmap` não funcionam (conferir em navegador).
- **CSS:** classes no `globals.css` vão em `@layer components`; cada lib precisa do `@source` no CSS do app.
- **Testes:** passam sem `.env`; `tests/db` é opt-in e pulado não prova o SQL; CI em Bun 1.3.11.
- **Cursos gravados:** Cadê, Chave e Ilha do Farol não podem quebrar; campo novo de manifesto sempre opcional.

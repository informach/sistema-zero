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
> denúncias + fila de aprovação + ocultar/apagar/fixar/trancar + silenciar/banir + **anexos UGC**
> + **webhooks de concessão/revogação**) — **49 testes** (9 arquivos de integração, incl.
> `attachments`, `webhooks`, `hardening`). Migration `0000_luxuriant_krista_starr` (schema `hub` +
> 11 tabelas).
> **Anexos UGC + webhooks (06/2026): MONTADOS e testados.** O `server.ts` monta `attachmentsRoutes`
> (`POST /hub/attachments` registra o metadado `pending_upload`; `GET /hub/attachments/:id/resolve`
> autoriza e devolve o `storageRef` ao BFF) e `webhooksRoutes` (`POST /hub/webhooks/grant`, HMAC
> sobre o corpo BRUTO + dedupe por `x-delivery-id` → invalida o micro-cache de acesso do usuário).
> O presign/upload/serve direto browser↔R2 vive no BFF (`@sistemazero/member-shell` →
> community/community-kids). **PENDENTES:** a **UI admin de moderação** (a fila e as ações já
> existem na API) e o **deploy no Railway**. Os front-ends `/comunidade` (community + kids) já
> consomem tudo via gateway.

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

9. **Vitrine "Mural dos Criadores" (06/2026):** posts de PROJETO auto-publicados pela criança ao
   concluir a última aula de uma cadeia do Estúdio. São THREADS com `is_showcase=true`,
   `author_display_name` (snapshot do PRIMEIRO NOME — a vitrine EXIBE o autor, ao contrário do
   fórum que redige terceiros), `cover_image_url` (capa pública) e `showcase_idempotency_key`
   (UNIQUE = hash perfil:curso:cadeia; NULLs distintos → posts normais não colidem). Rota INTERNA
   `POST /hub/internal/showcase-thread` (`ShowcaseService` + `showcase.routes`): chamada pelo BFF em
   nome da criança (exige `x-internal-token`; `authorId` vem dos `X-Auth-User-*`), é criação de
   SISTEMA → **ignora `postingPolicy: 'staff_only'`** do canal do Mural. O CORPO só diz QUAL projeto
   (`lessonId`/`blockId`) e a capa; ver/comentar/reagir no Mural exige o produto. Nasce `visible`
   (decisão: aparece na hora; admin oculta/edita-corpo/exclui pela moderação). Idempotente:
   re-publicar devolve o existente (`deduped`). O Mural = 1 space kids `course_gated` + 1 canal
   `staff_only` (criança não posta livre, só comenta moderado + reage). ⚠️ **Defesa em profundidade
   — a rota é alcançável por QUALQUER conta ativa na borda (o BFF publica sem role → o
   `x-internal-token` NÃO é fronteira de confiança aqui; full review 18/06), então o CORPO não é
   confiável:** o `ShowcaseService` (1) **re-valida a ELEGIBILIDADE no members** via
   `getShowcaseEligibility` (S2S `GET /members/internal/showcase-eligibility`, fail-closed) — só
   publica quem REALMENTE concluiu o projeto. ⚠️ **`privileged` HONRADO (07/2026 — reversão):** o
   `ShowcaseService` REPASSA `actor.privileged` (`ShowcaseEligibilityArgs.privileged` → query
   `?privileged=true`) e o members honra — **EQUIPE (superadmin/admin/staff) PUBLICA no Mural p/
   TESTAR o fluxo inteiro** (chave-mestra virtual; consistente com a rota de aluno `showcase-payload`
   que já honrava `isPrivilegedActor` e com o passe-livre de produto). O papel vem do GATEWAY (aluno
   comum é sempre `privileged=false`; a rota S2S é inalcançável por quem forjaria o param), então NÃO
   é um furo. Antes: `privileged:false` fixo (equipe não ia ao Mural) → 403 → `eligible:false`; a
   trava impedia o admin de testar. O adapter ainda mapeia **403/404 → `eligible:false`** (resposta
   GRACIOSA: `PostingNotAllowedError`→403 limpo, NUNCA 500 "Erro interno") e mantém 401/5xx/timeout
   como throw fail-closed. Aluno comum publica de verdade só com conta REAL + matrícula + entrega;
   (2) usa título/resumo/audiência/curso/cadeia
   AUTORITATIVOS de lá (o corpo não dita conteúdo); (3) tira o `authorDisplayName` do header confiável
   **`x-auth-profile-name`** (claim `pfl.name` do gateway), nunca do corpo; (4) DERIVA a idempotência
   (`autor:curso:cadeia`); e EXIGE `space.audience === 'kids'` E canal `postingPolicy === 'staff_only'`
   (senão `PostingNotAllowedError`→403 — barra injeção cross-vitrine e em canal de postagem livre).
   `coverImageUrl` é **https-only** no DTO (parede infantil). NÃO afrouxar esses guards.
   **Variação KID-DRIVEN — "Compartilhar" do Estúdio (06/2026):** rota irmã
   `POST /hub/internal/showcase-thread-studio` (`ShowcaseThreadStudioBody` + `ShowcaseService.createFromStudio`)
   onde a CRIANÇA escreve a **descrição** (rascunho da IA, editado → vira o `body`) e o projeto ganha um
   **link público de jogar** (coluna `threads.play_id`, UUID do artefato → o card mostra "Jogar" →
   `/jogar/<play_id>`). REUSA TODAS as guardas do `create` (elegibilidade S2S fail-closed, destino kids +
   parede `staff_only` + allowlist, autor do header `x-auth-profile-name`) — NÃO afrouxar. Duas divergências
   DELIBERADAS: o `body` é a descrição da criança (não o `summary` do admin), mas o **TÍTULO continua
   AUTORITATIVO do members** (defesa em profundidade — a parede é curada); e a idempotência inclui o
   `clientIdempotencyKey` (duplo-clique/retry dedup-a; **republicar depois = post NOVO**, pois o snapshot
   publicado é IMUTÁVEL e INDEPENDENTE do projeto que a criança continua editando no editor). Rota NOVA em
   `showcase.routes.ts` (mesma guarda de `x-internal-token`, mesmo `showcaseService`); gateway
   `hub-showcase-create-studio`.
   **Variação STANDALONE — Estúdio Completo (produto vendável, SEM aula, 06/2026):** rota
   `POST /hub/internal/showcase-thread-studio-standalone` (`ShowcaseThreadStudioStandaloneBody` +
   `ShowcaseService.createStandaloneShowcase`) para o "Compartilhar" do estúdio-produto da comunidade
   kids, onde NÃO há `lessonId`/`blockId` nem payload autoritativo do members. Logo `title` E
   `description` vêm da CRIANÇA (sanitizados/limitados — sem admin para ditar o título). A
   ELEGIBILIDADE deixa de ser "concluiu a aula" e vira **"a CONTA possui o produto do Estúdio"**:
   `members.checkAccess(accountId, ['estudio-completo'], ['estudio-completo'])` (fail-closed) exige
   `granted` OU `communities` OU `hasMasterKids` — o ref fixo `STUDIO_STANDALONE_ACCESS_REF` casa com o
   slug do produto no catálogo. ⚠️ **`actor.privileged` (equipe) faz BYPASS da posse (07/2026):**
   `owns=ownsClub=true` sem chamar o members — admin/staff publica (e testa o desafio) sem comprar o
   produto, espelhando o passe-livre da elegibilidade por aula e da rota `/members/access`. Demais
   guardas IDÊNTICAS (destino kids + parede `staff_only` + allowlist,
   autor do header de perfil, capa https-only). Idempotência = `autor:studio-standalone:clientKey`
   (sem curso/cadeia; republicar = post novo). Gateway `hub-showcase-create-studio-standalone` (segmento
   literal distinto de `showcase-thread-studio` — sem colisão de prefixo).
12. **Plays + carreira + Desafio do mês (Fase 5, 07/2026):**
   - **Contador de jogadas:** `threads.plays_count` (vaidade, best-effort). O incremento é
     FUNDIDO no resolve do link público: `GET /hub/internal/studio-play/:playId?count=1` vira
     `UPDATE ... SET plays_count = plays_count + 1 WHERE play_id AND is_showcase AND
     status='visible' RETURNING id` (1 round-trip; o RETURNING responde o "visível?").
     **NÃO bump-a `version`** (jogar não é edição — um play concorrente não pode 409-ar a
     moderação). O DEDUPE por `ip:playId` (TTL 30min) é do BFF (member-shell) — o hub não
     conhece o IP real. Sem `count` → SELECT puro (revalidações não inflam).
   - **Gamificação do standalone + marcos de plays (retenção pós-cursos, 07/2026):** o
     `createStandaloneShowcase` dispara `members.notifyStandaloneShowcase({userId, accountId,
     audience:'kids', playId})` (fire-and-forget best-effort, `POST /members/webhooks/
     showcase-standalone` via `postSignedWebhook` — marco `studio_published` + XP diário de
     publicar no members; notifica mesmo no `deduped`). E o RETURNING do plays_count agora devolve
     também `playsCount` novo + `authorId`/`authorAccountId` (snapshots): quando o hit CRUZA
     exatamente **10 ou 100**, o `isPlayable` dispara `members.notifyPlaysMilestone(...)`
     (`POST /members/webhooks/plays-milestone` → badges plays-10/plays-100 + troféu; crossing 1×
     garantido pelo UPDATE atômico). Rota S2S nova **`POST /hub/internal/play-check`**
     (`internal.routes.ts`, HMAC — members→hub): `{playId}` → `{visible, authorId}` — validação
     anti-farm do marco de REMIX do members (SELECT puro, validar não é jogar; `authorId` NUNCA sai
     na rota pública do /jogar, que segue projetando só visible+1º nome).
   - **Carreira:** `GET /hub/my-showcase-stats` (rota de ALUNO, JWT no gateway) →
     `{published, plays}` agregado NO banco (`showcaseStatsByAuthor`, usa o
     `threads_author_status_idx`) — "seus jogos já foram jogados N vezes" do kids.
   - **Limpeza de R2 na moderação (07/2026):** ocultar/apagar um post do Mural já revoga o
     `/jogar` (o resolve exige `is_showcase AND status='visible'`), mas os artefatos R2 do jogo
     ficavam órfãos. Agora, ao **APAGAR** (delete TERMINAL; `hide` é reversível e NÃO limpa) uma
     thread `is_showcase` com `play_id`, o `ModerationService.deleteThread` dispara
     `StudioArtifactGateway.cleanupShowcaseArtifacts({playId, coverUrl})` — adapter HTTP S2S
     `createStudioArtifactHttpGateway` (`infrastructure/gateways/studio-artifact-http.gateway.ts`,
     espelha o `postSignedWebhook`: HMAC canônico + retry, **best-effort, NUNCA lança**, fire-and-
     forget) → `POST {KIDS_BFF_BASE_URL}/api/studio/cleanup`. O R2 é do BFF do kids (member-shell),
     que apaga o snapshot jogável (privado) + a capa (pública). Sem `KIDS_BFF_BASE_URL` →
     `noopStudioArtifactGateway`. Port em `domain/ports/studio-artifact-gateway.port.ts`.
   - **Desafio do MÊS (game jam):** `threads.challenge_key` (`m:YYYY-MM`). No
     `createStandaloneShowcase`, a tag do corpo é VALIDADA: formato + mês CORRENTE
     recomputado em SP (`currentChallengeKey` local, mesma régua do members) + posse de
     `estudio-completo` E `clube-dos-criadores` (as DUAS refs na MESMA chamada
     `members.checkAccess`). Reprovada → o post é gravado **SEM a tag (drop SILENCIOSO)** —
     a publicação da criança NUNCA falha por causa do desafio. Thread com a tag →
     `members.notifyChallengeEntry` (fire-and-forget best-effort, webhook direto
     `POST /members/webhooks/challenge` HMAC + retry — helper `postSignedWebhook`
     compartilhado com o notify do showcase); o members deduplica por mês. Filtro
     `?challenge=m:YYYY-MM` no `GET /hub/channels/:id/threads` (prateleira do Mural, índice
     parcial). `ThreadView` expõe `playsCount` + `challengeKey`.
   - **Report dos pais (Lote E):** rota S2S **`POST /hub/internal/showcase-by-authors`**
     (`interfaces/http/routes/internal.routes.ts`, HMAC canônico `GATEWAY_HMAC_SECRET` no hook
     `transform` — mesmo padrão dos webhooks de entrada; consumida SÓ members→hub via
     `HUB_BASE_URL`): body `{authorIds ≤50, from, to}` (janela ≤45 dias) → threads de vitrine
     VISÍVEIS desses autores no período (`listShowcaseByAuthors` no repo) com
     `{authorId, title, playId, publishedAt}` — alimenta os "jogos da semana" do e-mail/tela dos
     pais. ⚠️ **NUNCA expor no gateway**: a rota devolve playIds de QUALQUER autor — na borda
     vazaria jogos entre famílias; o portão de família é do members (só manda os profileIds da
     conta autenticada).
   - **Perfil público kids (07/2026):** rota IRMÃ **`POST /hub/internal/showcase-by-author`**
     (mesmo hook HMAC, NUNCA no gateway): body `{authorId, limit?≤50 (default 24)}` → TODOS os
     posts de vitrine VISÍVEIS de UM autor, mais recentes primeiro, **com a CAPA**
     (`{title, playId, coverImageUrl, createdAt}`; `listShowcaseByAuthor` no repo — a variante do
     report OMITE a capa e tem janela ≤45 dias, esta NÃO tem janela). Alimenta a seção "Jogos
     publicados no Mural" do perfil público (`/crianca/[id]`). O members só monta a seção num
     perfil PÚBLICO (opt-in dos pais); os jogos já são públicos no `/jogar`.
13. **Snapshot de autor + nomes clicáveis (06/2026):** todo tópico/comentário guarda no CREATE um
   snapshot do **primeiro nome** (`author_display_name`) e da **flag pública** (`author_public`) do
   autor — alimenta os **nomes clicáveis** do Mural e do fórum kids (clube). A fonte é SEMPRE
   confiável (headers do gateway), nunca o corpo: `resolveDisplayName` tira o nome de
   `x-auth-profile-name` (claim `pfl.name` — nome da CRIANÇA em sessão de perfil) com fallback em
   `x-auth-user-name`, e fica só o 1º token (default `'Criador'`); `resolveProfilePublic` lê
   `x-auth-profile-public === 'true'` (claim `pfl.pub` — opt-in dos pais), default `false`
   (segurança infantil). Ambos viram `Actor.displayName`/`Actor.profilePublic` (em `auth.ts`),
   gravados pelo `ThreadService` em `authorDisplayName`/`authorPublic` na criação de thread E de
   comment. As views (`thread-views.ts`) e os tipos de domínio (`thread.ts`) expõem
   `authorDisplayName`/`authorPublic`; **o hub só transporta o snapshot — quem decide se o nome
   vira LINK p/ o perfil público é o BFF** (expõe o link só quando `authorPublic === true`). É
   SNAPSHOT no create: renomear/trocar a privacidade depois NÃO reescreve posts antigos (histórico
   imutável, como `authorId`).

14. **Full review do Clube dos Criadores (07/2026, EM PRODUÇÃO):** lote de contrato que promove o
   Clube a fórum kids de 1ª classe — recompensa, cross-link com o Mural e notificações de resposta.
   - **Snapshot da CONTA no autor (`author_account_id`):** todo tópico/comentário grava no CREATE —
     além de `authorId`/`authorDisplayName` — o `authorAccountId` (`Actor.accountId`), a **chave de
     coorte** da gamificação. Nullable (legado/vitrine). É o dono ORIGINAL do conteúdo, necessário
     porque a recompensa do Clube é dada na APROVAÇÃO (o ator ali é o moderador, não a criança).
     Domain `Thread`/`Comment` + `CreateThreadInput`/`CreateCommentInput` ganharam `authorAccountId`;
     `ThreadService.createThread`/`createComment` passam `actor.accountId`.
   - **Cross-link Mural↔Clube — `playId` no `createThread` ("Mostrar meu jogo no Clube"):**
     `CreateThreadInput.playId?` + DTO `CreateThreadBody.playId: t.Optional(UUID|Null)`. A criança
     referencia um `/jogar/<id>` REAL; o `ThreadService.createThread` **VALIDA** via
     `hasVisibleShowcasePlayId(playId)` (recusa `PostingNotAllowedError`→403 se não for post de
     vitrine VISÍVEL) e grava em `threads.play_id`. ⚠️ A **fronteira de segurança é o HUB** — a
     autoria no app é só filtro de UX; NÃO afrouxar a validação.
   - **Notificações "novas respostas" — `GET /hub/my-threads` (rota de ALUNO, JWT + `x-internal-token`):**
     `ThreadService.listMyThreads(actor)` → `{items:[{id,title,slug,channelId,commentCount,
     lastActivityAt,playId}]}`, SÓ do PRÓPRIO autor via `ThreadRepository.listByAuthor(authorId,
     limit)` (usa `threads_author_status_idx`; NUNCA vaza autor de terceiro). O literal
     `/hub/my-threads` (2 segmentos) não colide com `/hub/threads/:id`. Gateway `hub-my-threads`.
     Alimenta o sino "novas respostas nas suas conversas" (o app diffa `commentCount` contra um
     baseline local).
   - **Recompensa na APROVAÇÃO (webhook hub→members):** XP/badge do members disparados no
     `approveThread`/`approveComment` SÓ p/ kids — ver Acesso & integrações.

10. **Teaser "visível mas bloqueado" (06/2026):** `spaces.teaser_when_locked`. Quando ligado, um
   servidor que o aluno NÃO acessa aparece na listagem/detalhe com `locked:true` (só nome/ícone/
   descrição) em vez de sumir — `AccessResolutionService.resolveSpaceVisibility` ANOTA em vez de
   filtrar; `listSpaces`/`getSpace` mostram o teaser. O CONTEÚDO segue gated: `canAccessSpace`/
   `canAccessChannel`/`listChannels` NÃO mudam (403 em `/channels` quando locked — backstop à prova
   de vazamento). Default `false` = comportamento clássico (some sem acesso) → zero regressão adulta.
8. **Estados de conteúdo** (`content_status`): `pending` → `visible` (aprovar) / `rejected` (recusar);
   `visible` → `hidden` ou `rejected` (recusa do Mural auto-publicado + recado ao aluno);
   qualquer estado NÃO-deleted → `deleted` (apaga, auditado). As transições
   são condicionais/atômicas no repositório; ação repetida ou incompatível →
   `INVALID_MODERATION_STATE` (409), sem reabrir `rejected`/`deleted`. `pin`/`unpin` e
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
| POST | `/hub/channels/:id/threads` | cria tópico `{title, body, playId?}` (pré-moderação; `playId` = cross-link Mural↔Clube, valida vitrine visível) | 60/min · 64KB |
| GET | `/hub/threads/:id` | detalhe do tópico | 300/min |
| PATCH | `/hub/threads/:id` | edita tópico (autor ou staff) `{body}` | 60/min · 64KB |
| GET | `/hub/threads/:id/comments` | comentários (cursor cronológico) | 300/min |
| POST | `/hub/threads/:id/comments` | comenta `{body, replyToId?}` | 60/min · 64KB |
| PATCH | `/hub/comments/:id` | edita comentário (autor) | 60/min · 64KB |
| POST/DELETE | `/hub/threads/:id/reactions[/:emoji]` | adiciona/remove reação | 120/min |
| POST/DELETE | `/hub/comments/:id/reactions[/:emoji]` | idem comentário | 120/min |
| POST | `/hub/channels/:id/seen` | marca canal como visto (badge) | 120/min |
| POST | `/hub/threads/:id/report` · `/hub/comments/:id/report` | denúncia `{reason}` | 120/min |
| GET | `/hub/my-threads` | minhas conversas (SÓ do próprio autor) → `{items:[{id,title,slug,channelId,commentCount,lastActivityAt,playId}]}` p/ o sino "novas respostas" | 300/min |

**Admin** (`/hub/admin/*` — JWT + RBAC: LEITURA staff+, ESCRITA admin+; `x-internal-token`).
Estrutura (`admin.routes.ts`): `GET/POST /hub/admin/spaces`, `POST /hub/admin/spaces/reorder`,
`GET/PATCH/DELETE /hub/admin/spaces/:id`, `POST /hub/admin/spaces/:id/channels`,
`POST /hub/admin/spaces/:id/channels/reorder`, `PATCH/DELETE /hub/admin/channels/:id`. Moderação
(`moderation.routes.ts`): `GET /hub/admin/pending`, `POST /hub/admin/threads/:id/{approve,reject,
hide,delete,pin,unpin,lock,unlock}` e `…/comments/:id/{approve,reject,hide,delete}`,
`GET /hub/admin/reports` + `POST /hub/admin/reports/:id/resolve` `{action}`,
`GET /hub/admin/attachments/:id/resolve` (anexo privado para investigação, inclusive alvo oculto),
`POST /hub/admin/{mutes,bans}` + `POST /hub/admin/{mutes,bans}/remove`, `GET /hub/admin/mutes-bans`.
> ⚠️ Mute/ban são `/mutes` e `/bans` (não `/mute`/`/unmute`); remoção é `POST …/remove`, não DELETE.

**Exclusão de usuário (purga, 06/2026):** `DELETE /hub/admin/users/:id/data[?profileIds=<csv>]`
(`PurgeUserDataService` + `DrizzleUserDataPurgeRepository`) — parte da exclusão de usuário pelo
painel: apaga o ESTADO DE INTERAÇÃO do usuário (reações, `read_state`, `mutes_bans`) por
`user_id IN (conta, ...perfis)` numa transação. Conteúdo autorado (threads/comments) é PRESERVADO
(histórico imutável; `author_id` é snapshot). Idempotente; sucesso → **204**. Gateway:
`hub-admin-user-purge` (DELETE, `roles:['superadmin']` — rota EXPLÍCITA vence o wildcard
`hub-admin-write` por especificidade, fixando superadmin-only).

**Anexos + webhook (MONTADOS — `server.ts` usa `attachmentsRoutes` e `webhooksRoutes`):**
`POST /hub/attachments` (registra o metadado `pending_upload`; JWT + `x-internal-token`),
`GET /hub/attachments/:id/resolve` (autoriza pelo acesso ao conteúdo-pai e devolve o `storageRef`
ao BFF — NUNCA ao browser), `GET /hub/admin/attachments/:id/resolve` (staff+, política
EXCLUSIVA da moderação: continua lendo anexos de conteúdo oculto/rejeitado sem abrir esse acesso
ao aluno) e `POST /hub/webhooks/grant` (HMAC sobre o corpo BRUTO + dedupe por
`x-delivery-id` → `access.invalidate(userId)`). O arquivo em si não passa pelo hub: presign/upload/
download direto browser↔R2 são mintados pelo BFF (member-shell).

## Modelo (schema `hub`, Postgres compartilhado `sistemazero` :5433)

11 tabelas, `pgSchema('hub')`, migration `0000`. Enums: `audience`, `space_status`, `visibility`,
`posting_policy`, `content_status`, `reaction_target`, `report_target`, `report_status`,
`moderation_kind`, `mute_ban_kind`, `attachment_kind`, `attachment_status`.

- **`spaces`** — servidor (`slug` único, `audience`, `accessConfig` jsonb, `requiresApproval`,
  `sortOrder`, `status active|archived`, `version`).
- **`channels`** — canal (FK→space cascade, `slug` único no space, `accessConfig` **nullable=herda**,
  `postingPolicy members|staff_only`, `requiresApproval` **nullable=herda**, `version`).
- **`threads`** — tópico (FK→channel, `authorId`, `title`, `slug` único no canal, `body` Markdown,
  `isPinned`, `isLocked`, `status`, `commentCount`, `lastActivityAt`, `version`). Autor (snapshot p/
  nomes clicáveis): `author_display_name` (1º nome), **`author_public`** (bool, default `false`) e
  **`author_account_id`** (conta do responsável no create — chave de coorte da recompensa do Clube;
  nullable p/ legado/vitrine). Vitrine: `is_showcase`, `cover_image_url`, `showcase_idempotency_key` (UNIQUE) e
  **`play_id`** (UUID do artefato jogável — só na vitrine do Estúdio; alimenta o "Jogar" público). Índices:
  `(channel,status,lastActivity)` p/ listagem, `(author,status)` p/ "meus pendentes".
- **`comments`** — comentário (FK→thread, `authorId`, `body`, `status`, `replyToId`, `version`) +
  snapshot de autor `author_display_name` + `author_public` (bool, default `false`) +
  **`author_account_id`** (nullable — coorte da recompensa do Clube) p/ nome clicável e recompensa.
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
timeout `MEMBERS_REQUEST_TIMEOUT_MS` (5s default) e **fail-closed** (erro → sem acesso).
⚠️ **Sessão de perfil (PR3):** o `userId` enviado ao access-check é o **`Actor.accountId`**
(`x-auth-account-id ?? x-auth-user-id` — a matrícula é da CONTA do responsável), NÃO o
`Actor.userId` (que é o PERFIL de criança em sessão de perfil — usado só para AUTORIA de
tópicos/comentários/reações). `resolveActor` preenche os dois; o course-gated usa `accountId`. Resultado em
**micro-cache** por `(userId, spaceId/courseRefs)` com TTL `accessCacheTtlMs` (30s prod / 0 fora);
`invalidateUser()` existe p/ o futuro webhook de grant/revoke.

⚠️ **Notifica o members ao PUBLICAR no Mural (nível do aluno, 06/2026):** após criar a thread de
vitrine (`ShowcaseService.create`/`createFromStudio` — NÃO o standalone, que não tem curso), o hub
chama `members.notifyShowcasePublished({userId, accountId, courseId, audience})` →
`POST {MEMBERS_BASE_URL}/members/webhooks/showcase` assinado com **HMAC** (`GATEWAY_HMAC_SECRET`,
canônico `<MÉTODO>.<path>.<corpo>` + `x-delivery-id`) — o members grava o marco `course_showcased`
que, junto de `course_complete`, faz o aluno subir de nível (rank Noob→God). **Best-effort + FIRE-AND-
FORGET**: o `ShowcaseService` chama com `void` (NÃO `await`) — a thread já está salva e o nível é
consistência eventual, então não pendura a resposta de "Publicar" se o members estiver lento (o adapter
tem retries internos + timeout e ENGOLE erro, logando `members.showcase_notify_*`; NUNCA lança). O
members é idempotente por user+curso (notifica mesmo no `deduped`, recuperando uma 1ª falha). Sem
`hmacSecret` (não setado) = no-op silencioso. Usa as envs JÁ existentes `MEMBERS_BASE_URL` +
`GATEWAY_HMAC_SECRET` (nenhuma env nova).

⚠️ **Recompensa do Clube na APROVAÇÃO (webhook hub→members, 07/2026):** porta
`MembersGateway.notifyClubContribution({userId, accountId, audience, kind: 'thread'|'comment',
contentId})` (impl em `members-http.gateway.ts`, `CLUBE_WEBHOOK_PATH = /members/webhooks/clube`, via
o `postSignedWebhook` JÁ existente — HMAC canônico, best-effort, **NUNCA lança**). Disparada no
`ModerationService.approveThread`/`approveComment` **SÓ** para audiência `kids` e conteúdo com
`authorAccountId` (não-vitrine), **fire-and-forget** (`void`). Por que na APROVAÇÃO e não no create: o
conteúdo kids nasce `pending` e só "conta" quando um staff libera; o ator da aprovação é o MODERADOR,
então a recompensa vai para o `authorAccountId` snapshot do post (NÃO para o moderador). XP/badge são
do MEMBERS (thread **+5 XP**, comment **+3 XP**, badge `clube-primeiro-post`). O `ModerationService`
passou a receber `communityRead` + `members` **opcionais** (ausentes = no-op — testes que não
exercitam a recompensa); o `composition-root` os injeta. Reusa `MEMBERS_BASE_URL` +
`GATEWAY_HMAC_SECRET` (nenhuma env nova).
⚠️ **Comentário no MURAL ≠ Clube (reforma das missões 07/2026):** o `rewardOnApprove` agora RAMIFICA
pelo tópico-pai — comentário aprovado num post de VITRINE (`thread.isShowcase`) dispara
`MembersGateway.notifyMuralComment({userId, accountId, audience, commentId})` (`MURAL_COMMENT_WEBHOOK_PATH
= /members/webhooks/mural-comment`, mesmo `postSignedWebhook`) → marco `mural_comment` (missão universal
"comentar no Mural"); comentário no fórum do Clube (ou tópico) segue no `notifyClubContribution`. O
`resolveCommentAuthor` passou a devolver o `isShowcase` REAL do tópico-pai (era `false` fixo → tudo virava
`clube_comment`). Tópico de vitrine NÃO recompensa (a publicação já rende `course_showcased`).

⚠️ **Motivo da moderação → RECADO ao aluno (canal de retorno, 07/2026):** ao ESCONDER/RECUSAR um jogo
do Mural COM um motivo, o `ModerationService.hideThread`/`rejectThread` (param novo `reason?` +
`moderatorName?`) dispara `MembersGateway.notifyMuralModerationMessage({userId, accountId, audience,
contextRef, reason, moderatorName, title})` (`MURAL_MESSAGE_WEBHOOK_PATH = /members/webhooks/mural-message`,
mesmo `postSignedWebhook`) → mensagem `teacher` numa conversa `mural_publication` no members (ver
members §Conversas com o professor). O `maybeNotifyModerationReason` gate: **só post de VITRINE
(`isShowcase`) kids** (o post de vitrine NÃO guarda `authorAccountId` → a conversa é keyada pelo
`authorId`/perfil; `accountId` vai como snapshot, pode ser null); `contextRef = thread.id` (id do
tópico no hub, **texto**); `moderatorName` = `resolveDisplayName(headers)` (1º nome do staff, do
gateway). SEM `reason` = moderação silenciosa (comportamento antigo). **Best-effort, fire-and-forget,
NUNCA lança.** O `reason` é lido do corpo SEM schema (`reasonFromBody`) nas rotas `POST /hub/admin/
threads/:id/{hide,reject}` — POST sem corpo continua válido (não quebra chamadores existentes). O
members deduplica por id determinístico da entrega. Reusa `MEMBERS_BASE_URL` + `GATEWAY_HMAC_SECRET`
(nenhuma env nova).

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
  objeto no R2 é coletado pelo BFF, dono do bucket) + **`KIDS_BFF_BASE_URL`** (opcional; ex.:
  `http://community-kids.railway.internal:3008`) + `KIDS_BFF_REQUEST_TIMEOUT_MS` (4s) — liga a
  **limpeza de R2 na moderação** (ver abaixo); ausente = no-op. Assina com o `GATEWAY_HMAC_SECRET`
  já existente (sem env de segredo nova).

Segredos que precisam **bater entre serviços** (ver `.env.example` quando criado):
`HUB_INTERNAL_TOKEN` (gateway) = `INTERNAL_API_TOKEN` (hub); `MEMBERS_INTERNAL_TOKEN` (hub) =
`INTERNAL_API_TOKEN` (members); `GATEWAY_HMAC_SECRET` (gateway = hub, p/ os webhooks de grant).

## Deploy

`Dockerfile` (oven/bun, context = raiz do repo) + `railway.json` (`healthcheckPath: /readyz`,
`preDeployCommand: db:migrate`, watchPatterns hub+core). `drizzle.config.ts` usa
`schemaFilter: ['hub']` + journal próprio `hub_migrations` (NÃO compartilhe `__drizzle_migrations`).
⚠️ **Migrations (06/2026):** `0002` (`community_gated`) existia mas NÃO estava no `meta/_journal.json` —
um fresh DB pulava o enum. Consertado: `0002` virou `ADD VALUE IF NOT EXISTS` (re-rodar é no-op) +
`0002`/`0003` journaled. `0003_add_play_id` (`ADD COLUMN IF NOT EXISTS play_id`).
`0004_add_author_display_public` (`ADD COLUMN IF NOT EXISTS` de `comments.author_display_name` +
`comments.author_public` + `threads.author_public` — snapshot de autor p/ nomes clicáveis; o
`threads.author_display_name` já vinha da `0001`). **`0005_plays_challenge` (Fase 5, 07/2026 —
escrita à MÃO, journaled — APLICADA (local+prod, PR #68, 10/07/2026)):** `threads.plays_count` int NOT NULL DEFAULT 0 +
`threads.challenge_key` text + índice PARCIAL `threads_play_id_idx (play_id) WHERE play_id IS NOT
NULL` (conserta o seq scan pré-existente do resolve do /jogar) + índice parcial
`threads_channel_challenge_idx (channel_id, challenge_key)`. ⚠️ O `db:generate` re-emite as linhas de `play_id`
(0003) e `community_gated` (0002) por DRIFT do snapshot — REMOVA-as do SQL gerado (já aplicadas).
**`0006_clube_author_account` (full review do Clube, 07/2026 — escrita à MÃO, journaled, APLICADA):**
`ALTER TABLE hub.threads ADD COLUMN IF NOT EXISTS author_account_id text` + o mesmo em `hub.comments`
(snapshot da CONTA do responsável no create — chave de coorte da recompensa do Clube na aprovação;
nullable p/ legado/vitrine).
**`0007_studio_meta` (gate de nível do remix, 24/07/2026 — escrita à MÃO, journaled, NÃO aplicada):**
`ALTER TABLE hub.threads ADD COLUMN IF NOT EXISTS studio_meta jsonb` — metadado do PROJETO nos posts
de vitrine do Estúdio (`{pro, extensions[]}`, snapshot no publish pelas rotas `showcase-thread-studio`
e `-standalone`; DTO `StudioMetaBody`, saneado no `ShowcaseService`, exposto em `ThreadView.studioMeta`).
⚠️ **COSMÉTICO por contrato** (alimenta o selo "remix a partir do nível X" no card do Mural do kids):
o corpo da rota é alcançável na borda, então o metadado pode ser forjado — o gate REAL do remix é a
checagem no CLIQUE sobre o snapshot jogável (kids) + a trava de abertura do próprio Estúdio. NUNCA
usar `studio_meta` como fronteira de segurança.
**`0008_moderation_reporter_snapshot` (contexto da moderação, 08/2026 — journaled):**
`reports.reporter_account_id` + `reports.reporter_display_name` (nullable para legado). A listagem
agora carrega o alvo denunciado e o contexto por SQL em lote; `tests/db/moderation-repository.test.ts`
executa as migrations e os caminhos `listPending`/`listReports` num PostgreSQL real.
**`0009_clean_deathstrike` (cerca de exclusão de conta, 19/08/2026 — journaled):** `CREATE TABLE IF NOT
EXISTS hub.account_deletion_fences`. ⚠️⚠️ **O `db:generate` re-emitiu nela, SEM `IF NOT EXISTS`, o drift
INTEIRO das 0005–0008** (7 colunas + 2 índices já aplicados em staging e prod — provado no banco de
prod em 19/08) — e o preDeploy teria abortado no 1º `ADD COLUMN`, deixando o hub sem subir. Foi
reescrita à mão com `IF NOT EXISTS` em tudo (no-op em banco vivo, cria em banco novo), e o snapshot
0009 cura a linhagem. **Regra, de novo e com mais força:** depois de `db:generate`, LEIA o SQL e
compare com o banco de prod ANTES de commitar — o teste de DB pega num banco que já tem as colunas
(`column already exists`), mas só se for rodado.
`db:migrate` aplica tudo de forma idempotente (gateado pelo `when` do journal). Ao adicionar migration
nova, CONFIRA o journal antes de gerar.
Boot: `loadEnv` (fail-fast) → `createApplication` → `start` (listen `::`), com retenção do
`processed_webhooks` num ciclo de 6h sob **advisory xact-lock `51020304050607081`** (único no banco
compartilhado — members=`30792297…`, payments=`8103081227979411315`; nunca reusar a chave). `/readyz`
só promove a réplica quando o `select 1` responde.

**Seed dos servidores kids (`scripts/seed-community-spaces.ts`, `bun run db:seed-community`, 06/2026):**
cria IDEMPOTENTEmente o **Clube dos Criadores** (canal `geral` members) e o **Mural dos Criadores**
(canal `parede` staff_only) com os SLUGS FIXOS que o community-kids consome — sem eles, clicar no menu
dá 404 `SPACE_NOT_FOUND`. **Acesso (06/2026): cada servidor é um PRODUTO INDEPENDENTE** —
`community_gated` na SUA própria chave (= o slug) + `teaserWhenLocked`; canais herdam (`accessConfig:
null`). **Clube e Mural são SEPARADOS:** o **Clube** (`clube-dos-criadores`) é o fórum vendável; o
**Mural** (`mural-dos-criadores`) é a vitrine, independente, dada de bônus no desafio do 1º jogo. A chave
de cada servidor = o slug do produto de COMUNIDADE no catálogo. O ACESSO é decidido SÓ por este "Quem
vê" (o community-kids NÃO tem 2º gate de produto na página — só mostra a tela de bloqueio quando o hub
devolve o teaser). **NÃO há mais gate por curso** (o antigo `course_gated` slug=courseRef
saiu). O seed **RECONCILIA servidores existentes**: re-rodar atualiza o `accessConfig` do modelo antigo
(course_gated) p/ o novo, por servidor (idempotente — só escreve se mudou; esses 2 slugs são infra dona
do seed). `SEED_PUBLIC=true` deixa públicos p/ smoke test. Postgres é privado → rodar via `railway ssh`
no serviço hub. Re-rodar é seguro.
**Canal "Recados da equipe" (staff_only, full review do Clube, 07/2026):** `SpaceSeed.channel` virou
`channels[]` (idempotente por `(spaceId, slug)`, `sortOrder` = índice); o **Clube** ganhou o canal
`recados-da-equipe` (`postingPolicy: staff_only`) além do `geral`, e o Mural segue com `parede`. SEM
migração. **Rodado em local/staging/produção 04/07.** ⚠️ **No container o WORKDIR é a RAIZ do monorepo
(`/app`)**, então `bun run db:seed-community` falha — rode
`bun packages/hub/scripts/seed-community-spaces.ts` via `railway ssh -s hub`.

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
7. **Anexos + webhooks: MONTADOS e testados.** `server.ts` usa `attachmentsRoutes`
   (`/hub/attachments*`) e `webhooksRoutes` (`/hub/webhooks/grant`); suítes `attachments`/`webhooks`.
   O `storageRef` (`r2ugc:<key>`) NUNCA vai ao browser — só o BFF (member-shell) o resolve para
   mintar o presign. Falta a UI admin de moderação e o deploy no Railway.
8. **Snapshot de autor (`authorDisplayName`/`authorPublic`) é no CREATE, de header confiável.** O nome
   sai de `resolveDisplayName` (`x-auth-profile-name` → `x-auth-user-name`, só 1º token) e a flag de
   `resolveProfilePublic` (`x-auth-profile-public === 'true'`) — NUNCA do corpo. Gravado uma vez em
   thread/comment; não reescreve posts antigos. O hub só TRANSPORTA `authorPublic`; o link p/ o perfil
   público é decisão do BFF (só quando `true`) — não vire o snapshot em "fonte do link" no hub.
9. **⚠️ Datas + `db.execute` cru + Bun/postgres.js (bug 500 do `/hub/admin/pending`, 07/2026):** dois
   perigos OPOSTOS com `Date` no postgres.js.
   (a) **LEITURA:** `db.execute(sql\`…\`)` NÃO passa pelo mapeamento de tipo do drizzle → o postgres.js
   devolve `timestamptz` como **STRING**, não `Date`. O `listPending` (`moderation.repository.ts`)
   montava `PendingItem.createdAt = r.created_at` (string) e o mapper `toPendingItemView` chamava
   `.toISOString()` → **500** (só com fila ≥1; fila vazia não entra no `.map`, por isso passou
   despercebido até o 1º pendente real). Fix: coagir `r.created_at instanceof Date ? … : new Date(…)`
   no repo. Qualquer `db.execute` cru que devolva timestamp PRECISA coagir.
   (b) **ESCRITA (param):** bindar um `Date` como parâmetro (`where col < ${date}`) estourava só no
   runtime do CONTAINER de prod ("argument must be of type string … Received an instance of Date") →
   `retention.cleanup.failed` a cada 6h (a poda de `processed_webhooks` NUNCA rodava). NÃO reproduz
   local. Fix: passar `date.toISOString()` (texto ISO vs `timestamptz` é comparado direto). Regra
   geral: em `db.execute`/`sql` cru, coaja `Date`→ISO na escrita e string→`Date` na leitura.

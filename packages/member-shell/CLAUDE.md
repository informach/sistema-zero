# CLAUDE.md — @sistemazero/member-shell

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, jose, Zod,
> sharp, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender
> padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes.

Núcleo COMPARTILHADO dos apps de área do aluno (**community** = adulto e **community-kids** =
infanto-juvenil). Extraído do `@sistemazero/community` em 06/2026 (regra do usuário: código
reutilizável NUNCA é cópia por app). Consumido como **TS source** via `exports` map (modelo do
`@sistemazero/core`); os apps precisam de `transpilePackages: ['@sistemazero/member-shell']` e
`@source "../../../member-shell/src"` no globals.css (Tailwind v4 só gera classes que o scanner vê).
⚠️ O bloco `studio` (studio-block) puxa o **`@sistemazero/studio`**: os apps consumidores também
precisam de `transpilePackages: ['@sistemazero/studio']` + `@source "../../../studio/src"` +
`frame-src 'self' blob:` na CSP (Monaco/Blockly/preview; terminal OFF dispensa COOP/COEP). O handler
de entrega é `shell.routes.studioSubmit` (`POST /api/members/lessons/:lessonId/blocks/:blockId/studio-submission`).
**Projeto contínuo (carryover):** quando o bloco tem `chain` (nome da cadeia), o `studio-block`
semeia o editor na ordem **rascunho LOCAL → carryover → initialProject** — o rascunho local SEMPRE
vence (não re-hidrata o WIP); o carryover (`shell.routes.studioCarryover`, `GET …/studio-carryover`)
traz a última entrega do aluno na aula contínua anterior, é best-effort (falha de rede → cai no
initialProject) e roda SÓ na 1ª abertura sem rascunho local. Ao semear do carryover o `id` do
projeto é trocado p/ a chave do bloco atual (`sz-lesson-studio:<blockId>`).

## O que vive aqui vs no app

| Aqui (shell) | No app |
|---|---|
| BFF: sessão/gateway/refresh/clients/mídia/downloads (marca d'água) | `server/shell.ts` (1 chamada `createShell`) + shims |
| Route handlers (`createShellRoutes`) — a LÓGICA inteira de `/api/*` | `route.ts` de 1-3 linhas (`export const { POST } = shell.routes.x`) |
| `createMemberProxy` (anti-CSRF + gate + rotação pré-render) | `proxy.ts` com config do app + `matcher` LITERAL |
| Libs puras (csrf, download-mime, act, format, markdown, types, api, cn…) | — |
| Componentes de DOMÍNIO (vimeo-player, lesson-blocks, quiz-block, ebook 3D, **studio/studio-block** — editor @sistemazero/studio embarcado, dynamic ssr:false, rascunho LOCAL IndexedDB chaveado por bloco, "Enviar para o professor" + "Expandir" fullscreen —, anexos, progress-bar, impersonation-banner, user-avatar) — 100% em tokens CSS, vestem o tema do app | Componentes de IDENTIDADE (topnav, user-menu, cards, auth-shell) + globals.css/tokens |
| Helpers de cookie (`sessionCookieNames`/`prefixedCookieName`/`expireCookieOptions`) | CONSTANTES `sz_member_*`/`sz_kids_*` (compile-time POR APP — cookies não escopam por porta em dev) |
| `scripts/boot-check.mjs` (fail-fast REAL de prod — os Dockerfiles dos apps copiam DAQUI) | `instrumentation.ts` (fail-fast de dev, autocontido) |

**Comunidade/fórum (hub, 06/2026):** o shell expõe o **cliente do hub** (`createHubClient` em
`server/clients.ts`, sempre com `?audience=<a do app>`) e os **route handlers `/api/hub/*`**
(`createHubRoutes` em `routes/hub.ts`, montados no `createShellRoutes` e espalhados no `index.ts` como
`routes.hub*`) — leitura de spaces/canais/tópicos/comentários + criar/editar tópico e comentário +
reações/seen/report, repassados ao **`@sistemazero/hub`** via gateway. A LÓGICA (validação Zod de
título/corpo/emoji/motivo) vive aqui; o `route.ts` de cada app vira 1-3 linhas. **Privacidade do
aluno (NÃO regredir):** o BFF **redige o `authorId` de TERCEIROS** nas views de tópico/comentário
(`okRedacted` → `lib/hub-redact`, puro/testado em `tests/hub-redact.test.ts`) — só o id do PRÓPRIO
viewer chega ao browser (por isso `HubThreadView/HubCommentView.authorId` é `string | null`); os
apps comparam o id apenas p/ rotular "Você"/"Colega", ninguém EXIBE o id. Por isso
`createHubRoutes` recebe `{ hub, members, media, session }` (o `session` resolve o viewer p/ a
redação; `members` é p/ a vitrine — ver abaixo). Os
helpers PUROS de anexo (`lib/hub-attachments`: allowlist de MIME, limites, `sanitizeFilename`,
`extForMime`, `isInlineKind`) têm cobertura em `tests/hub-attachments.test.ts`.

**Vitrine "Mural dos Criadores" (06/2026):** `hubShowcase` (`POST /api/hub/showcase`, multipart
`lessonId`/`blockId`/`file?`): no clique "Publicar no Mural" o BFF (1) confere a elegibilidade no
members (`members.getShowcasePayload` — UX 409 antecipado), (2) sobe o print do jogo (quando veio
`file`) re-encodado no R2 **público** (`r2PutObject` → URL) ou deixa `null`, e (3) chama
`hub.createShowcaseThread({ spaceSlug, lessonId, blockId, coverImageUrl })`. ⚠️ **O BFF NÃO envia mais
título/resumo/nome-do-autor/idempotência** — a rota do hub é alcançável por qualquer conta ativa na
borda, então confiar no corpo era um furo (full review 18/06): o HUB re-valida a elegibilidade no
members (S2S), usa o título/resumo AUTORITATIVOS de lá, tira o nome do autor do header confiável
`x-auth-profile-name` (claim `pfl.name`, injetado pelo gateway) e DERIVA a idempotência. **Privacidade:** o
`redactAuthors` zera o `authorId` de terceiros mas PRESERVA o `authorDisplayName` (só a vitrine tem
esse campo) — a parede mostra "por {nome}", os comentários seguem "Você"/"Colega". `HubSpaceView.locked`
(teaser "visível mas bloqueado") flui sem redação.

**Gamificação (06/2026):** tipos em `lib/types.ts` (`GamificationDelta`/`GamificationMeView`/
`LessonCompleteResult`/`BadgeSlug` — mirror das views do members; `QuizAttemptResultView.gamification?`),
client `members.getGamification()` + variante **`getGamificationReadonly()`** (Server Components —
mesmo padrão do `getMeReadonly`: sem refresh/escrita de cookie, 401 → widget some; ambos mandam
SEMPRE `?audience=<a do app>` — **a gamificação inteira é segregada por vitrine**, XP/streak/
badges/ranking kids e adult não se misturam; `{withRanking}` soma `?ranking=true`) e handler
passthrough `shell.routes.gamificationMe` (`GET /api/members/gamification/me`). `markLessonComplete`/
`submitQuizAttempt` agora são TIPADOS (a resposta carrega o delta `gamification` — aditivo; o
community adulto ignora, a vitrine v1 é o kids).

**Perfis estilo Netflix (PR5, kids):** o shell expõe o **client de perfis**
(`createProfilesClient` em `server/clients.ts` → `/auth/profiles*` no auth) e os **route
handlers** `profilesList`/`profileCreate`/`profileUpdate`/`profileArchive`/`profileSelect`/
`profileExit`/`profileAvatar` (em `createShellRoutes`). `select`/`exit` EMITEM tokens novos
e o handler TROCA os cookies (igual ao exchange de impersonação): `select` = entrar/trocar de
perfil (1 clique, sem PIN); `exit` = voltar à área dos pais (gateado pela senha do responsável
no auth). **`exit` REVOGA o refresh da sessão de perfil deixada** (full review F3): captura o
refresh ATUAL antes de trocar os cookies e chama `gateway.logoutRequest` (best-effort) — a
família NOVA da conta não é tocada (família distinta), mas o token de perfil órfão não fica vivo. A claim **`pfl`** do JWT é lida por `parseProfileClaim` (`lib/act.ts`, pura/testada) →
`SessionUser.activeProfile` (`{accountId, name}`). O **proxy** ganhou `requireProfileSelectPath`
(opcional, só o kids usa): conta logada SEM `pfl` na área de aprender → redireciona p/ a grade
(ex.: `/perfis`); a própria rota é isenta. O avatar do perfil (`profileAvatar`) reusa a pipeline
do `/me` (sharp→WebP→R2 por `profileId`) — fica FORA do matcher do proxy (multipart).

## Invariantes (NÃO quebrar)

1. **Parametrização é por FACTORY, nunca por config em escopo de módulo**: o Turbopack separa
   proxy/RSC/handlers em bundles com cópias próprias dos módulos — cada app chama
   `createShell({ cookieBase, audience, serviceName })` no SEU `server/shell.ts` (re-executado por
   bundle com a MESMA config estática). O estado compartilhado REAL (single-flight do refresh,
   gate da marca d'água, JWKS) vive em **`globalThis` via `Symbol.for` DENTRO dos módulos daqui**
   — nunca em closure de factory.
2. **`createShell` NÃO pode tocar o `getEnv()` (zod) em module scope** — roda no import do
   wrapper de cada app e o `next build` (page data collection) explode com env de dev sob
   `NODE_ENV=production`. Cookie names usam `process.env.NODE_ENV` direto; o zod valida no
   primeiro USO real.
3. A única variação entre os apps no BFF é: nomes de cookie (`cookieBase`), vitrine do members
   (`audience: 'adult' | 'kids'` — SÓ listagens) e prefixos protegidos do proxy. Todo o resto lê
   `process.env` (por serviço no Railway) — NÃO adicione parametrização especulativa.
4. Segurança load-bearing herdada do community (ver `packages/community/CLAUDE.md` p/ o histórico
   completo): cookies `__Host-` em prod (remoção via `expireCookieOptions` — `delete()` pelado não
   desloga), single-flight do refresh (reuse-detection do auth revoga a família), anti-CSRF
   same-origin via Sec-Fetch-Site, guard de mídia ESTRITO (exp NÃO autoriza), gate de concorrência
   da marca d'água (OOM), arquivos >20MB = 302 pré-assinado (downloads-zumbi), storageRef NUNCA ao
   browser. **Fix aqui = fix nos dois apps; mudança aqui RODA NOS DOIS — rode as suítes dos dois.**
5. Réplica ÚNICA por app (single-flight/gate em `globalThis` são por processo).
6. **`vimeo-player`: o SDK é o DONO do iframe** (`new Player(divHost, { id })`). NUNCA voltar ao
   padrão "iframe no JSX + `new Player(iframe)`": `destroy()` REMOVE o iframe do DOM real sem o
   React saber — com o double-invoke do StrictMode (e re-runs do effect) o ref vira um iframe
   ÓRFÃO e o vídeo some na navegação client-side, só voltando com F5 (bug real, corrigido
   11/06/2026 — afetava os dois apps).
7. **Exports map: subpaths de componente levam EXTENSÃO** (`"./components/ebook/*":
   "./src/components/ebook/*.tsx"`) — padrão sem extensão resolve no Turbopack mas NÃO no `tsc`
   (o typecheck do consumidor quebra com "Cannot find module").

## Comandos

`bun run typecheck` · `bun test` (10 suítes — as movidas do community) · `bun run check[:fix]`.
Os railway.json do community (e do kids) têm `/packages/member-shell/**` nos watchPatterns e o
ci.yml mapeia `packages/member-shell/*` → deploy dos apps consumidores — mudou aqui, redeploya lá.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` AQUI **e nos apps consumidores** (community; kids quando existir) + `check` limpos.
- [ ] `bun run build:community` passa (e `build:kids` quando existir).
- [ ] Mudou contrato (factory/handler/componente)? Atualizou este CLAUDE.md e o(s) do(s) app(s).

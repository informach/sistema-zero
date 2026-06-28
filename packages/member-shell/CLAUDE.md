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
**Ordem de seed do editor (06/2026):** o `studio-block` semeia em **(1) rascunho LOCAL → (2) ENVIO no
banco → (3) carryover → (4) initialProject**. O rascunho local (por PERFIL, IndexedDB) SEMPRE vence (é o
WIP mais fresco neste navegador — não re-hidrata por cima dele). Sem rascunho local: (2) o ENVIO do aluno
NESTE bloco — "save na nuvem" — retoma o trabalho num navegador NOVO (`shell.routes.studioSubmissionGet`,
`GET …/studio-submission`, client `members.getOwnStudioSubmission`; só busca se `studioState.submitted`);
(3) o carryover (`studioCarryover`, `GET …/studio-carryover`) traz a entrega da aula contínua anterior
(quando o bloco tem `chain`); (4) o template do admin. Os GET (2)/(3) são best-effort/lazy (falha de rede
não trava — cai no próximo) e só rodam sem rascunho local. ⚠️ DB-first foi rejeitado de propósito: re-abrir
após enviar perderia os blocos feitos PÓS-envio (re-introduziria o "perder trabalho" recém-corrigido). Ao semear do carryover o `id` do
projeto é trocado p/ a chave do bloco — **`lessonStudioProjectId(blockId, viewerId)`** (`lib/studio-project-id`).
**Por PERFIL (`viewerId` = id da sessão):** irmãos no MESMO navegador NÃO misturam o rascunho — cada perfil
kids tem o seu (no adulto = id da conta). O `viewerId` chega pelo `LessonPlayerContext` (`viewerId`, setado
pela página da aula dos dois apps a partir de `session.id`); ausente → formato legado sem o segmento.
⚠️ **NÃO use `:` nem char fora de `/^[A-Za-z0-9_-]+$/` no id**: o Studio REJEITA o id do `initialProject`
(`sanitizeProjectForHost` → `boundProjectIdFromBody`) e o troca por um ULID ALEATÓRIO → o autosave grava
sob o ULID e o `load(<este id>)` nunca acha o rascunho (a criança PERDIA tudo no refresh — bug do
`sz-lesson-studio:` colado, corrigido). `blockId`+`viewerId` são UUIDs (charset seguro). Travado por
`tests/studio-project-id.test.ts`. ⚠️ Mudar o formato da chave ORFANA os rascunhos antigos (sem usuário
real em prod, ok).

## O que vive aqui vs no app

| Aqui (shell) | No app |
|---|---|
| BFF: sessão/gateway/refresh/clients/mídia/downloads (marca d'água) | `server/shell.ts` (1 chamada `createShell`) + shims |
| Route handlers (`createShellRoutes`) — a LÓGICA inteira de `/api/*` | `route.ts` de 1-3 linhas (`export const { POST } = shell.routes.x`) |
| `createMemberProxy` (anti-CSRF + gate + rotação pré-render) | `proxy.ts` com config do app + `matcher` LITERAL |
| Libs puras (csrf, download-mime, act, format, markdown, types, api, cn…) | — |
| Componentes de DOMÍNIO (vimeo-player, lesson-blocks, quiz-block, ebook 3D, **studio/studio-block** — editor @sistemazero/studio embarcado, dynamic ssr:false, rascunho LOCAL IndexedDB chaveado por bloco, "Enviar para o professor" (com confirmação) + "Expandir" (tela cheia por **overlay CSS** `fixed inset-0 z-50` no card, **NÃO** a Fullscreen API nativa — ela restringe a pintura à subárvore do elemento e some com os menus/diálogos PORTALADOS no body, ex.: o três-pontinhos do editor "não fazia nada"; o overlay cobre a navegação z-40 e o botão "Reduzir"/Esc mora no cabeçalho DENTRO dele; trava o scroll
do body enquanto expandido via `useBodyScrollLock` do ui — REFCONTADO com o `Dialog`, senão a barra de
rolagem fantasma da página atrás voltava ao fechar o "Enviar?") —, anexos, progress-bar, impersonation-banner, user-avatar) — 100% em tokens CSS, vestem o tema do app | Componentes de IDENTIDADE (topnav, user-menu, cards, auth-shell) + globals.css/tokens |
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

**Markdown de UGC (full review 19/06 — NÃO regredir):** o corpo de tópico/comentário é conteúdo NÃO
confiável de criança p/ criança. Renderize com **`renderUgcMarkdown`** (`lib/markdown`: modo restrito
— SEM `<img>` externo, que seria pixel-rastreador vazando o IP de quem LÊ, e links só como TEXTO) e o
WRITE strippa imagem na origem (`stripImageMarkdown`, aplicado em create/edit de tópico e comentário).
`renderMarkdown` cru (com `![](…)` e `<a>`) é SÓ p/ conteúdo do ADMIN (rich_text/quiz). Os path ids
do hub/perfil (thread/comment/canal/profileId) são validados como UUID na borda (`idFrom`/`UUID_RE`,
espelhando o `hubShowcase`). Cobertura em `tests/markdown.test.tsx`.

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

**"Compartilhar" do Estúdio + link público jogável (06/2026):** `createStudioRoutes` (`routes/studio.ts`,
montado no `createShell` como `routes.studio*`) expõe três rotas consumidas pelo botão "Compartilhar" do
`@sistemazero/studio`:
- **`POST /api/studio/describe`** — rascunho da descrição via **OpenRouter no SERVIDOR**
  (`server/openrouter.ts`, chave `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` no `lib/env.ts`, OPCIONAIS).
  Recebe SÓ os 3 arquivos canônicos (clampados, NÃO o projeto com assets); prompt com cláusula de segurança
  infantil; saída sanitizada + truncada (280). **FAIL-SOFT**: sem chave/timeout/não-2xx → `{description:'',
  fallback:true}` (a criança escreve). Rate-limit in-process por sessão (`globalThis`, réplica única).
- **`POST /api/studio/publish`** (multipart, FORA do matcher do proxy — guard próprio `requireUploadSession`):
  print → R2 **PÚBLICO** (`r2PutObject`, WebP); projeto inteiro (JSON auto-suficiente, assets data URLs)
  passa por parse + `sanitizePlayableProject` ANTES de persistir (contrato mínimo: `files` canônicos
  obrigatórios; `extraFiles`/`assets`/`installedExtensions` sempre arrays seguros; limites de tamanho
  rechecados após normalização; JSON inválido → 400, excedente → 413) →
  R2 **PRIVADO** `studio/play/<uuid>.json` (`r2PutObjectPrivate`); chama
  `hub.createShowcaseThreadStudio` (gateway → hub); devolve `{ muralUrl, playUrl }`.
- **`GET /api/studio/play/:id`** — **PÚBLICA (sem login)**: stream do projeto do R2 privado
  (`r2GetObjectPrivate`), MESMA ORIGEM (sem CORS), `Cache-Control immutable`, 404 no miss. É o que a página
  `/jogar/:id` do community-kids consome (renderiza o `StudioProjectPlayer` — só o jogo, sem o nome da
  criança).
- **`POST /api/studio/publish-standalone`** (multipart, FORA do matcher — coberto pelo prefixo
  `api/studio/publish` no negative-lookahead) — o "Compartilhar" do **Estúdio Completo** (produto vendável
  da vitrine kids, SEM aula). Mesma mecânica do `publish` (sessão estrita, `sanitizePlayableProject`,
  capa→R2 público, jogável→R2 privado) MENOS o acoplamento de aula: SEM `lessonId/blockId` e SEM
  `getShowcasePayload`; `title` + `description` vêm da criança. Chama `hub.createShowcaseThreadStudioStandalone`
  — o HUB re-valida a POSSE do produto (S2S `members.checkAccess`). Exposto como `routes.studioPublishStandalone`.

**Estúdio Completo como produto (06/2026):** além do publish acima, o BFF ganhou o gate de acesso —
`members.checkStudioAccessReadonly()` (`GET /members/access?refs=estudio-completo`, RSC sem refresh →
`ProductAccessView { access }`) que o community-kids consome em `/estudio` para decidir entre o editor e o
recado de bloqueado; e o client `hub.createShowcaseThreadStudioStandalone`. A ref do produto é a const
exportada `STUDIO_ACCESS_REF` (`server/clients.ts`, = `estudio-completo`) — TEM que casar com o
`STUDIO_STANDALONE_ACCESS_REF` do hub e o slug do produto no catálogo.

**Certificado de conclusão (06/2026):** `createCertificateRoutes` (`routes/certificate.ts`, montado no
`createShell` como `routes.certificate*`) + o renderizador de PDF `server/certificate-pdf.ts`. O bloco de
aula `kind:'certificate'` (em QUALQUER aula — libera quando as ANTERIORES estão concluídas; ver o members)
é renderizado pelo `CertificateBlockView`
(`components/certificate-block.tsx`, wired no `lesson-blocks.tsx`): lê o estado via
`GET /api/members/lessons/:lessonId/blocks/:blockId/certificate` (passthrough → `members.getCertificateState`,
`{eligible, issued, serial?, issuedAt?}`); emitir/baixar é um **POST** na MESMA rota
(`certificateIssue` → `members.issueCertificate`, idempotente) que devolve o **PDF em STREAM** (mesma origem,
sem CORS — o navegador baixa o blob; impersonação = 403 read-only). **Layout por IMAGEM BASE (26/06):** com
`config.baseImageUrl` (fundo A4 paisagem por curso — logo/título/decoração já desenhados) o renderizador
(`drawOverlayLayout`) desenha o fundo + o conteúdo DINÂMICO por cima no miolo central (abertura `introLine` →
NOME do aluno → `coursePhrase` → `bodyText` parágrafo → data automática → `signatures[]` → QR no canto sup. dir.).
**Assinatura:** a IMAGEM (rabisco) fica ACIMA da linha e o `name` SEMPRE abaixo (rótulo); 1 assinatura
centraliza, 2 ladeiam o robô (frações `sigCentersX` no `OVERLAY`). A página tem a PROPORÇÃO da imagem (sem
distorcer); as posições são FRAÇÕES nomeadas na const `OVERLAY` (ajuste fino se a arte de um curso bater no
texto). ⚠️ **`fetchImage` tem guarda SSRF `isSafeRemoteUrl`** (a config de autoria é buscada SERVER-SIDE) —
rejeita localhost/`.internal`/IP privado/link-local (169.254 metadados de nuvem); a base/assinaturas TÊM que
ser URLs PÚBLICAS (o `ImageUploader` do admin sobe WebP no R2 público — passa; WebP→PNG via sharp). Sem
`baseImageUrl` (ou imagem irbuscável) → `drawBrandedLayout` (moldura/título/nome/curso, compat/fallback). O PDF é montado com **`@cantoo/pdf-lib`**
(fontes built-in, sem browser headless) + **QR** (`qrcode`, dep nova) apontando p/ `${APP_PUBLIC_URL}/validar/:id`
e **cacheado no R2 PRIVADO** `certificates/<id>.pdf` (re-download não regenera). A página **PÚBLICA**
`/validar/:id` (sem login) busca a validação por `members.validateCertificate(id)` — um **`publicGet`** (sem
Bearer; o gateway injeta o `x-internal-token` na rota `public`) — e o shim `routes.certificateValidate`
(`GET /api/certificates/:id/validate`, FORA do matcher do proxy) também expõe o JSON. **Env nova:
`APP_PUBLIC_URL`** (origem pública absoluta p/ o QR; ausente → QR só com o caminho, degradado — setar em prod).
Tipos em `lib/types.ts` (`CertificateBlock`/`CertificateConfig`/`CertificateIssueView`/`CertificateStateView`/
`CertificateValidationView`). O members é o portão (elegibilidade + registro imutável); o BFF só monta/serve o PDF.
⚠️ **`CertificateBlockView` tem a prop `tone: 'default' | 'kids'`** (full review 27/06): o kids passa
`tone="kids"` (copy sem jargão/travessão); o estado de carga é `role="status"` e a virada de estado vai
numa região `aria-live="polite"` (a11y — o leitor anuncia bloqueado→elegível→emitido).

**Trava sequencial das aulas (estilo Duolingo, 06/2026):** `LessonOutlineView.locked` (em
`lib/types.ts`, mirror do members) = aula ainda bloqueada porque uma aula publicada anterior não
foi concluída (curso com `sequential_lock` ON; equipe interna e aula já concluída vêm `false`). Só
estrutural — os DOIS apps (community + community-kids) leem o flag e renderizam o nó/linha travado
não-clicável + gate de `nextHref`; abrir aula travada por URL → **423 `LESSON_LOCKED`** do members,
que cada app trata com uma página "aula bloqueada". O gate confiável é o members (`GetLessonService`).

`HubThreadView` ganhou **`playId`** (sobrevive ao `redactAuthors` — só estrutural; teste em
`tests/hub-redact.test.ts`). O **`StudioBlockView`** tem a prop `enableShare?`: ligada, constrói o
`StudioShareAdapter` (descreve via `/api/studio/describe`, publica multipart via `/api/studio/publish`) e o
passa ao `<StudioLesson share>` — o botão "Compartilhar" aparece na Topbar do editor. ⚠️ **O kids liga SÓ
no bloco da ÚLTIMA aula do projeto** (`enableShare={Boolean(content.showcase?.enabled)}` no
`kids-lesson-blocks`): publicar é fim-de-projeto, então nas aulas intermediárias o botão fica OFF (a criança
não solta o jogo antes de terminar). Isso **substituiu o antigo "Publicar no Mural" da `LessonCelebration`**
(`PublishToMural` REMOVIDO — mesma ação, e o Compartilhar ainda dá descrição editável + link público de
jogar; `LessonCompleteResult.showcase` segue vindo do members mas o kids não o consome mais). A
elegibilidade real é do backend (publish 409 `SHOWCASE_NOT_ELIGIBLE` quando o bloco não é de vitrine). O
post publicado é um **snapshot IMUTÁVEL e INDEPENDENTE** do rascunho que a criança continua editando.
Quando o publish dá certo, o adapter chama `onPublished` → a prop **`onShared`** do `StudioBlockView`
entrega os links ao kids, que abre a celebração do Zappy (`MuralCelebration`); o `ShareDialog` fecha sem
mostrar a própria tela de sucesso (no Estúdio Completo, sem `onShared`, a telinha padrão do dialog vale).
**Economia de IA:** o adapter ainda passa `presetTitle`/`presetDescription` do `content.showcase.title/
summary` (admin) — com resumo, o `ShareDialog` abre preenchido e NÃO chama a IA (a criança edita se
quiser); em branco (ou no Estúdio Completo, que não passa) → a IA gera o rascunho.

**Gamificação (06/2026):** tipos em `lib/types.ts` (`GamificationDelta`/`GamificationMeView`/
`LessonCompleteResult`/`BadgeSlug` — mirror das views do members; `QuizAttemptResultView.gamification?`),
client `members.getGamification()` + variante **`getGamificationReadonly()`** (Server Components —
mesmo padrão do `getMeReadonly`: sem refresh/escrita de cookie, 401 → widget some; ambos mandam
SEMPRE `?audience=<a do app>` — **a gamificação inteira é segregada por vitrine**, XP/streak/
badges/ranking kids e adult não se misturam; `{withRanking}` soma `?ranking=true`) e handler
passthrough `shell.routes.gamificationMe` (`GET /api/members/gamification/me`). `markLessonComplete`/
`submitQuizAttempt` agora são TIPADOS (a resposta carrega o delta `gamification` — aditivo; o
community adulto ignora, a vitrine v1 é o kids). `GamificationMeView.streak` ganhou
`freezesAvailable?`/`onVacation?`/`vacationUntil?` e `coins?:{balance}` (todos OPCIONAIS p/ tolerar
members antigo). **Passe livre da EQUIPE (06/2026):** o contrato ganhou a flag `unlimited`/
`balanceUnlimited` (em `coins`, `AvatarStateView`/`RoomEditorView`, `AvatarPurchaseResult`/
`RoomBuyResult`/`StreakFreezeResult`) — quando o ator é equipe (superadmin/admin/staff), o members
reporta moedas VIRTUAIS ilimitadas (saldo real 0) e a UI kids mostra ∞; as compras voltam grátis
(`unlimited:true`). Só estrutural — o gate é do members (`docs/gamificacao.md` §4).

**Expansão Zappy + avatar/quarto/missões/ligas (06/2026 — 6 fases):** o shell virou o BFF de TODA a
gamificação kids. Tipos novos em `lib/types.ts` (mirror das views do members): `MissionView`/
`MissionsMeView`/`MissionClaimResult`, `StreakFreezeResult`/`VacationResult`, `LeagueEntryView`/
`LeagueMeView`, `AvatarConfigInput`/`AvatarPartView`/`AvatarStateView`/`AvatarPurchaseResult`/
`AvatarEquipResult`, `RoomPlacedItem`/`RoomStateView`/`RoomItemView`/`RoomThemeView`/`RoomEditorView`/
`RoomBuyResult`, `PublicProfileIdentity`/`PublicProfileGameView`/`PublicProfileDTO`. Todos seguem o
padrão "view larga/forward-compat" (campos opcionais, `layer`/`category` como `string`) p/ tolerar
catálogo novo no members sem rebuild do shell.

Clients (`server/clients.ts`, sempre `?audience=<a do app>`) + variantes **`*Readonly()`** (RSC,
memoizadas por request via `React.cache()` — dedup layout×página, sem refresh de cookie):
- **Missões:** `getMissions()`/`getMissionsReadonly()` (`GET /members/gamification/missions/me`) +
  `claimMission(slug)` (`POST …/missions/:slug/claim` — idempotente; o members revalida a conclusão).
- **Proteção de sequência:** `buyStreakFreeze()` (`POST …/streak-freeze/buy` — compra com moedas;
  sem saldo → 402) + `setVacation(from,to)` (`POST …/vacation` — janela de férias; `null/null` limpa).
- **Liga semanal:** `getLeagueReadonly()` (`GET …/league/me` — board SEM PII, só `position`/`weeklyXp`/
  `isMe`).
- **Avatar 3D (configurador por categorias):** `getAvatar()`/`getAvatarReadonly()` (`GET /members/avatar`
  — `AvatarStateView` ganhou `equipped` como `slots` cat→`{asset,color?}` + `palettes`/`hideGroups`/
  `removable`/`photoUrl`) + `buyAvatarPart(id)` (`POST …/parts/:id/buy`, idempotente, 402 sem saldo) +
  `equipAvatar(config)` (`PUT /members/avatar` — `AvatarConfigInput.slots`; o members é ESTRITO: peça
  grátis OU possuída + cor ∈ paleta) + **`setAvatarPhoto(url)`** (`PUT /members/avatar/photo`). O handler
  **`avatarSnapshot`** (`POST /api/members/avatar/snapshot`, multipart, FORA do matcher — `requireUploadSession`
  PERMITE sessão de perfil, ≠ do `/me/avatar`) sobe o PNG do canvas 3D → `optimizeAndStoreAvatar(file, profileId,
  'avatar3d')` (namespace próprio p/ não colidir com a foto de perfil) → `members.setAvatarPhoto(url)` →
  `removeStaleAvatars(.., 'avatar3d')`. `optimizeAndStoreAvatar`/`removeStaleAvatars` ganharam o param
  `namespace` (default `avatars`). Zod `AvatarConfigSchema` = `slots` `{asset,color?}` (só forma; posse/
  categoria/paleta é portão do members). `PublicProfileGameView.avatar` virou `slots` + ganhou `avatarPhotoUrl`.
- **Quarto virtual:** `getRoom()`/`getRoomReadonly()` (`GET /members/room` — `RoomEditorView` agora
  com `floors`/`lightings` além de `items`/`themes`) + `saveRoom(state)` (`PUT /members/room` —
  last-write-wins, o members canonicaliza contra o inventário/paleta) + `buyRoomItem(id)`
  (`POST /members/room/items/:id/buy` — item/tema/piso/luz pago, idempotente, 402/404/400). ⚠️ O
  `RoomStateSchema` (Zod) e os tipos (`RoomPlacedItem.rot`, `RoomStateView.wallColors/floor/lighting`)
  foram alargados p/ os campos novos do quarto 3D — `rot` é UNIÃO de literais 0|1|2|3 (não `z.number`)
  p/ casar o tipo. O renderer 3D vive no community-kids (visual); aqui é só o BFF.
- **Perfil público de OUTRA criança:** `getPublicProfileIdentity(profileId)` (auth S2S → nome + flag
  `publicProfileEnabled`, nunca PII) + `getPublicProfile(profileId)` (members → xp/ranking/conquistas/
  avatar/quarto SEM identidade). O BFF junta os dois no `PublicProfileDTO` p/ a página `/crianca/[id]`;
  o perfil público VIVO é o portão (404 se os pais desligarem) — não confiar em snapshot velho.

Handlers (`createShellRoutes`, espalhados no `index.ts` como `routes.*`): `gamificationMe`,
`missionsGet`/`missionClaim`, `streakFreezeBuy`/`vacationSet` (Zod `VacationSchema`), `avatarGet`/
`avatarBuy`/`avatarEquip` (Zod `AvatarConfigSchema` — só forma; posse/categoria/paleta é portão do
members) + **`avatarSnapshot`** (multipart, FORA do matcher — sobe o PNG p/ o R2 e chama `setAvatarPhoto`),
`roomGet`/`roomSave`/`roomBuy` (Zod `RoomStateSchema`), e `childrenStats` (área dos pais: junta
identidade dos perfis do auth com os stats por perfil do members; gateado por
`requireParentGateAccountOnly` no shim do KIDS). Toda escrita passa por `requireWritableSession`
(impersonação read-only); ids de path validados como UUID na borda.

**Privacidade — `authorProfileId` (perfil público, 06/2026):** o `redactAuthors` (`lib/hub-redact`)
continua zerando o `authorId` cru de TERCEIROS, MAS quando o autor é PÚBLICO (`authorPublic` —
opt-in dos pais, snapshot no hub) expõe um **`authorProfileId`** (o id do perfil) como ALVO do link
p/ `/crianca/[id]`, preservando o `authorDisplayName`. Perfil não público → sem `authorProfileId`
(o fórum cai em "Colega"; o Mural mostra o nome sem link). É só estrutural e sobrevive à redação;
o portão VIVO é o próprio perfil público (404 se desligarem depois). Cobertura em
`tests/hub-redact.test.ts`.

> **Fonte da verdade da gamificação** (valores exatos de XP/moedas/marcos, catálogos de avatar/quarto/
> missões, regras de streak/freeze/férias/ligas, modelo de dados e gotchas): **`../../docs/gamificacao.md`**.
> Os tipos/clients/handlers daqui são só o mirror do BFF — qualquer mudança de contrato começa no members
> e se reflete nesse doc.

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
   browser. ⚠️ **CORS do 302:** o **livro 3D do e-book** (`ebookDownload`) e o download de anexo por
   `fetch` SEGUEM o 302 até o R2 — leitura CROSS-ORIGIN que exige a regra CORS `community-direct-download`
   no bucket PRIVADO com a ORIGEM do app na allowlist (ebook >20MB cai no 302; ≤20MB faz stream inline,
   sem CORS — por isso PDF pequeno "baixa", mas o livro 3D não renderiza). Origem nova (app/host) →
   `packages/admin/scripts/r2-cors-private.ts` (`--apply`, `--bucket=` p/ prod). Foi o que quebrou o
   community-kids em 25/06 (origem do kids faltava na regra, que só tinha o community adulto). **+ full review 19/06 (lente infantil):** UGC do hub renderizado restrito + strip de
   imagem no write (pixel-rastreador entre crianças); scrub de PII no Sentry (UUID do perfil/e-mail);
   `profileAvatar` AUTORIZA o dono ANTES de gravar no R2 (criança só troca a própria foto; UUID
   validado); `watermarkImage` com `limitInputPixels` (anti OOM); `getMeReadonly`/`getGamificationReadonly`
   memoizados por request via `React.cache()` (dedup layout×página). **+ full review 20/06:**
   `meAvatar.POST` recusa sessão de PERFIL (403 `ACCOUNT_SESSION_REQUIRED`) ANTES da escrita no R2
   — a foto do `/me` é da CONTA; sem isto a criança deixava objeto R2 órfão (espelha o
   authorize-before-write do `profileAvatar`); `watermarkCacheKey` virou `sha256(srcKey)` (INJETIVO
   — a substituição lossy podia colidir e servir o PDF errado ao MESMO aluno) e `watermarkImage`
   ganhou teto de pixels TOTAIS p/ animados (não só por frame). **Fix aqui = fix nos dois apps;
   mudança aqui RODA NOS DOIS — rode as suítes dos dois.**
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

`bun run typecheck` · `bun test` (15 suítes) · `bun run check[:fix]`.
Os railway.json do community (e do kids) têm `/packages/member-shell/**` nos watchPatterns e o
ci.yml mapeia `packages/member-shell/*` → deploy dos apps consumidores — mudou aqui, redeploya lá.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` AQUI **e nos apps consumidores** (community; kids quando existir) + `check` limpos.
- [ ] `bun run build:community` passa (e `build:kids` quando existir).
- [ ] Mudou contrato (factory/handler/componente)? Atualizou este CLAUDE.md e o(s) do(s) app(s).

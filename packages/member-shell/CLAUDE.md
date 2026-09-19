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

⭐ **Aviso "você está enviando o projeto INICIAL" (08/2026 — anti-sobrescrita):** o caso do
incidente é o editor semeado do TEMPLATE (passo 4 da ordem acima, num soluço de rede do passo 2)
+ "Reenviar" = template por cima do jogo entregue (upsert último-vence). O `studio-block` calcula
`templateWarning` **ao ABRIR o confirm** (no onClick do botão Enviar — o projeto vivo só existe no
`handleRef`): `submitted && isInitialTemplateProject(handleRef.getProject(), content.initialProject)`
→ parágrafo `text-destructive` no Dialog apontando o "Sincronizar com o enviado". NÃO bloqueia
(reenviar o template pode ser recomeço intencional). A régua é PURA em
**`lib/studio-template.ts`** (`isInitialTemplateProject`, testada em `tests/studio-template.test.ts`):
compara byte a byte os 3 arquivos canônicos (ausente = `''`); **`kind:'pro'` em qualquer lado →
false** (no Pro os 3 são `''` — falso positivo garantido); contagem de `assets` diferente → false;
entrada torta → false (aviso errado ensina a ignorar avisos). O members guarda a versão
sobrescrita (migração 0066) e o professor restaura pelo admin — este aviso é a 1ª linha de defesa.

⭐ **`navigator.storage.persist()` (08/2026 — rascunho não é mais despejável):**
**`lib/persistent-storage.ts`** (`requestPersistentStorage` — best-effort, guard de módulo
1×/sessão, try/catch + `.catch()` no promise, nunca lança; a concessão é POR ORIGEM;
⚠️ o Firefox mostra PROMPT ao usuário — decisão de produto: aceito; +
`resetPersistentStorageForTests`; teste em `tests/persistent-storage.test.ts`). Chamada no início
do effect de carga dos TRÊS editores com IndexedDB de criança: `studio-block.tsx`,
`pinta-block.tsx` e o `studio-full-client.tsx` do community-kids (via
`@sistemazero/member-shell/lib/persistent-storage` — o exports map `./lib/*` cobre). Sem isso o
Safari apaga TODO storage de origem não visitada por ~7 dias, e qualquer navegador despeja sob
pressão de disco — o rascunho da criança sumia sem culpado.

## Ajuda e objetivos de seção — 11/09/2026

`section-help` aceita `requestId` UUID: o player mantém a chave ao repetir o mesmo pedido após falha
de rede e usa o `threadId` retornado em Ver conversa. `TeacherLessonLink` permite retornar ao hash
`#section=<id>`; o player só abre seção acessível. `helpContext` da mensagem guarda revisão e pendências.
`useTeacherUnread` revalida por navegação, foco/visibilidade, eventos de leitura/resposta e a cada 30s
em primeiro plano. Compartilhado pelos sinos do Kids e Adultos.
`SectionProjectCheck` mostra cada objetivo e só atualiza progresso após resposta persistida.
Não confundir estrutura verificada no servidor com execução comprovada do jogo.

## O que vive aqui vs no app

| Aqui (shell) | No app |
|---|---|
| BFF: sessão/gateway/refresh/clients/mídia/downloads (marca d'água) | `server/shell.ts` (1 chamada `createShell`) + shims |
| Route handlers (`createShellRoutes`) — a LÓGICA inteira de `/api/*` | `route.ts` de 1-3 linhas (`export const { POST } = shell.routes.x`) |
| `createMemberProxy` (anti-CSRF + gate + rotação pré-render) | `proxy.ts` com config do app + `matcher` LITERAL |
| Libs puras (csrf, download-mime, act, format, markdown, types, api, cn…) | — |
| Componentes de DOMÍNIO (vimeo-player, lesson-blocks, quiz-block, ebook 3D, **studio/studio-block** — editor @sistemazero/studio embarcado, dynamic ssr:false, rascunho LOCAL IndexedDB chaveado por bloco, "Enviar para o professor" (com confirmação + campo OPCIONAL de **recado ao professor** no modal → corpo `message`, ≤1000, trim; o client `submitStudioProject` e o handler `studioSubmit` repassam) + "Expandir" (tela cheia por **overlay CSS** `fixed inset-0 z-50` no card, **NÃO** a Fullscreen API nativa — ela restringe a pintura à subárvore do elemento e some com os menus/diálogos PORTALADOS no body, ex.: o três-pontinhos do editor "não fazia nada"; o overlay cobre a navegação z-40 e o botão "Reduzir"/Esc mora no cabeçalho DENTRO dele; trava o scroll
do body enquanto expandido via `useBodyScrollLock` do ui — REFCONTADO com o `Dialog`, senão a barra de
rolagem fantasma da página atrás voltava ao fechar o "Enviar?"; ⚠️ o estado `expanded` PERSISTE por
projeto num Map de MÓDULO (`expandedByProject`, restaurado no lazy `useState` + espelhado por effect):
o "Enviar para o professor" dispara `router.refresh()` que RE-MONTA o `StudioBlockView` (a aula
re-renderiza com `submitted:true`) e um `useState` comum voltava a `false` → a criança caía da tela
cheia ao enviar; só "Reduzir"/Esc saem dela agora, F5 limpa o Map) —, anexos, progress-bar, impersonation-banner, user-avatar) — 100% em tokens CSS, vestem o tema do app | Componentes de IDENTIDADE (topnav, user-menu, cards, auth-shell) + globals.css/tokens |
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
`createHubRoutes` recebe `{ hub, members, media, session, audience }` (o `session` resolve o viewer
p/ a redação; `members` é p/ a vitrine + avatares em lote; **`audience` liga o modo Clube KIDS** —
ver "Full review do Clube dos Criadores" abaixo). Os
helpers PUROS de anexo (`lib/hub-attachments`: allowlist de MIME, limites, `sanitizeFilename`,
`extForMime`, `isInlineKind`) têm cobertura em `tests/hub-attachments.test.ts`.

**Portal de atendimento (08/2026):** `createHelpdeskRoutes` em `routes/helpdesk.ts` é o BFF
compartilhado de `/api/helpdesk/portal/tickets` (lista, criação, detalhe e mensagens). Ele valida
na borda com Zod, faz a chamada somente pelo gateway e bloqueia mutações em impersonação
somente-leitura. Na criação ele injeta `portal` = `audience` do app (`adult`|`kids`, config
COMPILADA — o cliente não escolhe; o Zod `.strict()` recusa `portal` no corpo): é o que decide
o link do aviso de resposta por e-mail (`/ajuda` vs `/responsavel/ajuda`). A UI reutilizável
`components/customer-helpdesk-portal.tsx` fala apenas com esse BFF e renderiza texto das
mensagens como texto, nunca HTML; a resposta da equipe chega NO portal e não há polling, então o
detalhe tem "Atualizar" (recarrega a conversa sem apagar o rascunho). O aviso por e-mail é eventual:
a resposta e o job entram juntos no Helpdesk, e um worker com retry faz a entrega via messaging.
Os contratos do portal vêm de `@sistemazero/helpdesk-contracts`, sem unions espelhados aqui.
A posse do chamado continua sendo
autoritativa no Helpdesk, por `requesterAccountId` e e-mail normalizado legado. O community expõe
os handlers diretamente; o community-kids DEVE envolver cada handler com
`requireParentGateAccountOnly`, pois um perfil infantil herda o e-mail da conta e não pode tocar
dados de atendimento.

**Full review do Clube dos Criadores (07/2026 — EM PRODUÇÃO):** o Clube KIDS passou a mostrar
ROSTO+NOME de todos os autores de tópico/comentário (o fórum ADULTO fica INTACTO). Mudanças de
contrato (todas testadas + em prod):
- **`redactAuthors` ganhou `revealNames` (3º arg, default `false`):** LIGADA (só o BFF KIDS passa
  `true`) preserva o `authorDisplayName` (1º nome) de TODOS os autores — decisão de produto: o
  avatar é um boneco 3D que a criança MONTA (não a foto real) e o 1º nome sozinho não é sensível,
  então o Clube mostra rosto+nome de todos. O LINK ao perfil público (`authorProfileId`) segue
  GATED no opt-in dos pais (inalterado). DESLIGADA (default) = comportamento antigo do fórum
  adulto (nome só quando público, senão "Colega"). Dois helpers PUROS novos em `lib/hub-redact.ts`:
  **`collectAuthorIds(body)`** (coleta os `authorId` CRUS de página/item ANTES da redação, que os
  zera) e **`attachAuthorAvatars(body, avatars)`** (anexa `authorAvatarUrl`/`authorLevel` pelo
  `authorId` cru, ANTES do redact — estruturais, sobrevivem ao `...item` da redação; autor sem
  avatar no mapa = item intacto/boneco padrão). Cobertura ampliada em `tests/hub-redact.test.ts`.
- **`createHubRoutes` agora recebe `audience` (`MembersAudience`)** além de `{ hub, members, media,
  session }`. Novo helper interno **`okRedactedWithAvatars(r, vid)`**: só na vitrine KIDS
  (`audience === 'kids'`) coleta os authorId, busca `members.listAvatarsByProfileIds(ids)` em LOTE
  (sem N+1), `attachAuthorAvatars` e redige com `revealNames=true`; **best-effort** — falha/ausência
  do members segue sem avatar e NUNCA quebra a carga do fórum (cai na redação normal). No app adulto
  = `okRedacted` puro. Os 3 GETs de leitura (threads do canal, thread, comentários) usam o novo
  helper; os writes (editar tópico/comentário, criar comentário) seguem no `okRedacted` cru.
- **Client novo `members.listAvatarsByProfileIds(ids)`** (`GET /members/avatars?ids=<csv>&audience`)
  → `AvatarsBatchView`. Tipos novos em `lib/types.ts`: **`ProfileAvatarView {photoUrl, level}`** e
  **`AvatarsBatchView {avatars: Record<profileId, ProfileAvatarView>}`**. `HubThreadView`/
  `HubCommentView` ganharam `authorAvatarUrl?`/`authorLevel?` (estruturais, só KIDS, NUNCA PII —
  sobrevivem à redação; ausentes no adulto).
- **Cross-link + notificações:** `hub.createThread` aceita **`playId?`** (Zod `CreateThread.playId`
  `nullish` em `routes/hub.ts`, repassado ao hub; o corpo segue por `stripImageMarkdown`) — é o
  "Mostrar meu jogo no Clube" (o hub valida que o `/jogar` é de vitrine visível de verdade). Novo
  client **`hub.listMyThreads()`** (`GET /hub/my-threads`) + handler **`hubMyThreads`**
  (`GET /api/hub/my-threads` — SEM redação, são só os tópicos DELE) + tipo `HubMyThreadView`.
  Alimenta o sino "novas respostas nas suas conversas" (o app diffa o `commentCount` contra um
  baseline local) e o picker "Mostrar meu jogo" do kids.
- **Badge mirror:** `BadgeSlug` (`lib/types.ts`) ganhou **`'clube-primeiro-post'`** (1ª conversa
  aprovada no Clube — ledger `clube_thread`). ⚠️ Espelha o members — **manter em LOCKSTEP** com o
  `BADGE_SLUGS` do members e o `BADGE_INFO` do community-kids, senão a badge SOME (a UI ignora slug
  desconhecido).

**Markdown de UGC (full review 19/06 — NÃO regredir):** o corpo de tópico/comentário é conteúdo NÃO
confiável de criança p/ criança. Renderize com **`renderUgcMarkdown`** (`lib/markdown`: modo restrito
— SEM `<img>` externo, que seria pixel-rastreador vazando o IP de quem LÊ, e links só como TEXTO) e o
WRITE strippa imagem na origem (`stripImageMarkdown`, aplicado em create/edit de tópico e comentário).
`renderMarkdown` cru (com `![](…)` e `<a>`) é SÓ p/ conteúdo do ADMIN (rich_text/quiz). Imagens
aceitam o sufixo OPCIONAL `{width=NN align=left|center|right}` (autoria do admin — largura % +
alinhamento em bloco; validado por `imageStyleFromAttrs`, valor inválido é ignorado). O `pattern`
inline e o `stripImageMarkdown` consomem o sufixo (senão sobraria como texto). O editor do admin
(`resizable-image.tsx`) EMITE esse sufixo — contrato compartilhado, mexeu num mexa no outro. Os path ids
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
  capa: o campo `cover` (print OU upload da criança) → R2 **PÚBLICO** (`r2PutObject`, WebP); OU, quando vem
  `useDefaultCover=1` (a criança escolheu "usar a capa do curso"), `coverImageUrl = payload.defaultCoverUrl`
  (URL AUTORITATIVA do `getShowcasePayload` do members — NÃO confia no cliente). Projeto inteiro (JSON auto-suficiente, assets data URLs)
  passa por parse + `sanitizePlayableProject` ANTES de persistir (contrato mínimo: `files` canônicos
  obrigatórios; `extraFiles`/`assets`/`installedExtensions` sempre arrays seguros; limites de tamanho
  rechecados após normalização; JSON inválido → 400, excedente → 413) →
  R2 **PRIVADO** `studio/play/<uuid>.json` (`r2PutObjectPrivate`); chama
  `hub.createShowcaseThreadStudio` (gateway → hub); devolve `{ muralUrl, playUrl }`.
- **`GET /api/studio/play/:id`** — **PÚBLICA (sem login)**: stream do projeto do R2 privado
  (`r2GetObjectPrivate`), MESMA ORIGEM (sem CORS), `Cache-Control: private, no-store` (privacidade
  infantil — o jogo é UGC de criança e NÃO deve ser cacheado em intermediários; o snapshot é imutável,
  mas o custo de re-ler o R2 é aceito de propósito), `X-Content-Type-Options: nosniff`, 404 no miss. É o
  que a página `/jogar/:id` do community-kids consome (renderiza o `StudioProjectPlayer` — só o jogo, sem
  o nome da criança).
- **`POST /api/studio/publish-standalone`** (multipart, FORA do matcher — coberto pelo prefixo
  `api/studio/publish` no negative-lookahead) — o "Compartilhar" do **Estúdio Completo** (produto vendável
  da vitrine kids, SEM aula). Mesma mecânica do `publish` (sessão estrita, `sanitizePlayableProject`,
  capa→R2 público, jogável→R2 privado) MENOS o acoplamento de aula: SEM `lessonId/blockId` e SEM
  `getShowcasePayload`; `title` + `description` vêm da criança. Chama `hub.createShowcaseThreadStudioStandalone`
  — o HUB re-valida a POSSE do produto (S2S `members.checkAccess`). Exposto como `routes.studioPublishStandalone`.
- **`POST /api/studio/cleanup`** (S2S do HUB, rede interna, **HMAC** — FORA do matcher do proxy, `api/studio/cleanup`
  no negative-lookahead) — limpeza de R2 na MODERAÇÃO: ao APAGAR (delete terminal, ≠ hide reversível) um post
  do Mural, o hub avisa `{playId, coverUrl}` e o BFF apaga o snapshot jogável (`studio/play/<id>.json`, R2
  privado — `r2DeleteObjectPrivate`) + a capa (`studio/cover/...`, R2 público — `r2DeleteObjects`, key derivada da
  URL, SÓ sob `studio/cover/`). Verifica o HMAC com **`GATEWAY_HMAC_SECRET`** (env NOVA, opcional; ausente →
  no-op, não apaga nada; assinatura inválida → 401; senão 204). Helpers PUROS (verify + cover-key) em
  **`lib/studio-cleanup.ts`** (fora do route.ts p/ serem testáveis — `tests/studio-cleanup.test.ts`; o member-shell
  NÃO depende do `@sistemazero/core`, então o HMAC é reimplementado com `node:crypto`, EM SINCRONIA com
  `core/security/hmac.ts`). Exposto como `routes.studioCleanup` (shim no kids `app/api/studio/cleanup/route.ts`).

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

**Pensa (planejador de jogos — 08/2026):** o shell expõe o BFF de `@sistemazero/pensa` e espelha
os contratos do members em `lib/types.ts` e `server/clients.ts`. `createPensaRoutes` valida e repassa
projetos, ciclos, cinco artefatos, tarefas, handoff e progresso. Escritas respeitam o modo
explícito da impersonação (`readonly` bloqueia; `write` preserva as validações normais). `GET
/tasks/:id/handoff` preserva o plano e informa a capability; `PATCH
/tasks/:id/progress` valida IDs e transições.

`createPensaAiRoutes` mantém o chat SSE da etapa Z e gera somente `idea`, `game_design`,
`visual_direction`, `task_plan` e `plan_review`. `planner-contract.ts` usa Zod 4, filtra
`SERVER_BLOCK_CATALOG` e `SERVER_MECHANIC_DOCUMENTS` pelo `StudioTier`, recebe apenas IDs da IA e
resolve rótulo, categoria, subcategoria, área e extensão no servidor. ⚠️ Campo sem valor nos
schemas que vão ao provider é `.nullable()`, NUNCA `.optional()`, e o `jsonSchemaFor` troca
`oneOf`→`anyOf`: o modo estrito do `response_format` exige `required` com todas as chaves e não
aceita `oneOf` (400 real do `pensa_task_plan_v1`, 08/2026); o teste de deriva em
`tests/pensa-ai.test.ts` trava os quatro schemas e `resolveTaskPlan` normaliza `null`→ausente
antes do members (o DTO de lá usa `t.Optional`, que não aceita null). Sem stream o corpo só chega
no FIM da geração: `completePensaJson` aceita `bodyTimeoutMs` (task_plan 180s, visual_direction
90s — 30s derrubava o plano real, "pendurou o corpo" 08/2026), timeout de corpo NÃO re-tenta
(`PensaLlmError.retryable=false`) e **ABORTA o socket do fetch** ao estourar (senão a conexão
seguia pendurada); a rota loga o erro técnico e devolve frase gentil à criança.
**O `pensaGenerateArtifact.POST` responde `text/event-stream` (08/2026):** o PRÉ-VOO
(sessão/impersonação/carreira/validação/projeto/quota) segue JSON com os envelopes de sempre;
dali em diante o stream manda `: ok` imediato (TTFB antes do LLM), `: ping` a cada 15s e um único
evento terminal — `done` com o corpo antigo (`{artifact}`) ou `error` `{status, code, message?}`.
Sem isso a borda (Railway; Cloudflare em prod ~100s) derrubava com **502** o POST mudo de minutos
do task_plan (o banner mostrava o fallback "Não deu certo agora."). ⚠️ Desconexão do cliente NÃO
aborta a geração (≠ chat): o resultado persiste no members e um F5 o mostra — abortar no meio
podia deixar `pensaReplaceTasks` aplicado sem o artefato salvo. A geração rejeita referência
inventada, drift, dependência futura e Bíblia Visual sem exatamente um Cartão de Criação por asset —
mas **arte 2D citada em `visualAssetIds` de tarefa do Estúdio é NORMALIZADA, não reprovada**
(`stripPintaArtFromStudioTasks`, 08/2026): o modelo insiste em citar o fundo/sprite que o jogo USA
(3 gerações seguidas reprovadas no QA) e a referência é redundante — a cobertura 1:1 segue garantida
pela tarefa Pinta; id desconhecido continua reprovando. JSON quebrado do modelo (SyntaxError após o
nudge) também vira frase gentil, não o erro cru do parser.
A etapa O repete a auditoria contra o catálogo atual. O chat chama o OpenRouter no BFF; ownership e
persistência passam pelo members. Contrato: [`../../docs/pensa-planner.md`](../../docs/pensa-planner.md).

**Pinta (editor de assets de jogos, 07/2026):** diferente do Pensa, o Pinta NÃO tem backend — os
desenhos vivem no IndexedDB do navegador (por perfil) e a ponte "Usar no Estúdio" grava direto na
biblioteca pessoal do `@sistemazero/studio` (client-side). O shell só carrega o GATE da página:
**`PINTA_ACCESS_REF = 'pinta'`** + `checkPintaAccessReadonly()` (`server/clients.ts`), que pede
**DUAS refs numa ida** (`refs: 'pinta,estudio-completo'`) — a segunda alimenta o `studioOwned` do
adapter do Pinta (só muda a copy do sucesso da ponte). Sem rotas `/api/pinta` — logo o gate da
PÁGINA é o único, e ele é `meetsFreeCreationLevel` (`coder`/Construtor(a)) desde 14/08.

**Bloco "Em breve" (`coming_soon`, 08/2026):** `ComingSoonBlock {kind, message?}` em `lib/types.ts`
(+ o union `LessonBlockContent` ganhou também o `CertificateBlock`, que faltava) e o `case` no
`BlockRenderer` do `components/lesson-blocks.tsx` — **obrigatório**: sem ele o `default: return null`
some com o bloco e a aula fica VAZIA, o pior resultado possível (numa aula "em breve" ele é o ÚNICO
bloco que o members serve). O componente é sóbrio (público adulto); o kids tem o seu, com Zappy. O
recado padrão é a const exportada `COMING_SOON_DEFAULT_MESSAGE` (usada quando o autor não escreveu o
dele). **O portão é o members** (esconde os outros blocos + anexos e recusa a conclusão com 409
`LESSON_COMING_SOON`) — aqui é só apresentação. O `complete()` dos DOIS players trata o código novo e
desabilita o botão por `blockedByComingSoon`.

**Trava sequencial das aulas (estilo Duolingo, 06/2026):** `LessonOutlineView.locked` (em
`lib/types.ts`, mirror do members) = aula ainda bloqueada porque uma aula publicada anterior não
foi concluída (curso com `sequential_lock` ON; equipe interna e aula já concluída vêm `false`). Só
estrutural — os DOIS apps (community + community-kids) leem o flag e renderizam o nó/linha travado
não-clicável + gate de `nextHref`; abrir aula travada por URL → **423 `LESSON_LOCKED`** do members,
que cada app trata com uma página "aula bloqueada". O gate confiável é o members (`GetLessonService`).

`HubThreadView` ganhou **`playId`** (sobrevive ao `redactAuthors` — só estrutural; teste em
`tests/hub-redact.test.ts`) e, na Fase 5 (07/2026), **`playsCount?`** (contador de jogadas do link
público) e **`challengeKey?`** (tag do Desafio do mês) — ambos estruturais, sobrevivem à redação.
No Clube (07/2026) ganhou também **`authorAvatarUrl?`/`authorLevel?`** (rosto+aura, só KIDS,
estruturais/NUNCA PII — ver "Full review do Clube dos Criadores"); idem `HubCommentView`.
**Gate de nível do remix (24/07/2026):** ganhou **`studioMeta?`** (`{pro, extensions[]}` — snapshot
das ferramentas do projeto, gravado no publish; estrutural, sobrevive à redação) e os DOIS publish
(`studioPublish`/`studioPublishStandalone` em `routes/studio.ts`) passaram a DERIVAR o metadado do
projeto JÁ saneado (`kind === 'pro'` + ids de `installedExtensions`) e enviá-lo ao hub
(`createShowcaseThreadStudio[Standalone].studioMeta`). É COSMÉTICO (selo "remix a partir do nível X"
no card do Mural do kids) — o gate real é a checagem no clique. Helpers PUROS novos em
`lib/studio-tier.ts`: `StudioRemixRequirement`/`StudioRemixCapability`, `studioRemixCovered(cap, req)`,
`studioTierCoversRemix(tier, req)` (= freeStudio + covered), `minCareerLevelForRemix(req)` (1º nível
da carreira com Estúdio livre que cobre extensões+pro — alimenta o selo; extensão desconhecida →
`null`, fail-closed cosmético) e `remixRequirementFromSnapshot(snapshot)` (extrai kind+extensões do
snapshot jogável cru — a checagem AUTORITATIVA do clique no kids). Testes em `tests/studio-tier.test.ts`.

⚠️ **`initialExtensions` é SEMPRE `[]` (08/08).** Nenhuma extensão vem instalada
no projeto novo do Estúdio Completo: a criança abre o painel de Extensões e
instala o que quiser entre as de `allowedExtensions` (o que a carreira liberou).
Os blocos seguem filtrados pelo `level`, então instalar não adianta a paleta de
um degrau acima. ⚠️ O Jogo 2D vinha instalado e isso MASCARAVA um defeito: a
paleta do Construtor parecia completa ao criar o projeto e perdia as áreas
⚡/🔁 ao reabrir. A curadoria de áreas do studio hoje deriva do NÍVEL e não do que
está instalado, então o campo deixou de influenciar a paleta.

**Fase 5 (07/2026) — plays/carreira/desafio/arte no shell:**
- **Contador de jogadas:** o `studioPlay.GET` (público) deduplica por **`ip:playId`** (TTL 30min,
  in-process `globalThis`/`Symbol.for`, teto anti-OOM 50k entradas) e só o 1º hit da janela chama o
  hub com `resolveStudioPlay(id, countHit=true)` → `?count=1` (o hub funde o UPDATE no resolve).
  Contador de VAIDADE: best-effort é suficiente; F5/refetch não infla.
- **Carreira:** `hub.myShowcaseStatsReadonly()` (RSC, sem refresh) → `{published, plays}` — a home
  e o /perfil do kids exibem "seus jogos já foram jogados N vezes".
- **Desafio do mês:** `members.getChallengeReadonly()` (React.cache) → `ChallengeMeView`
  (tema global + `entered`); `members.checkChallengeAccessReadonly()` pede as DUAS refs
  (`CLUB_ACCESS_REF='clube-dos-criadores'` + `STUDIO_ACCESS_REF`) numa ida — o kids só liga
  card/checkbox com ambas true (o gate REAL é o do hub). O `studioPublishStandalone` aceita o campo
  `challengeKey` no multipart (formato validado FROUXO na borda; posse+mês são do hub, com drop
  silencioso da tag) e o repassa ao `hub.createShowcaseThreadStudioStandalone`. O shim
  `GET /api/hub/channels/:id/threads` encaminha `?challenge=m:YYYY-MM` (prateleira do Mural).
  **Filtros do Mural (11/09/2026):** o mesmo shim encaminha `?sort=recent|plays` (tipo
  `HubThreadSort`; a ordem padrão é a AUSÊNCIA do parâmetro). Valor fora da lista cai na padrão
  em vez de virar o 400 do hub: um filtro não pode derrubar a página. Teste em
  `tests/hub-thread-sort.test.ts`.
- **Cartões Pensa→Pinta/Estúdio:** `planner-contract.ts` exige `assetId` em cada arte 2D e
  `visualAssetIds` para modelo, mundo e material. O plano continua completo sem entitlement; o
  handoff informa o bloqueio. O Pinta exige asset vinculado e, quando configurado, envio ao
  Estúdio. O Estúdio usa somente blocos, manuais e extensões liberados pelo tier.
- **Report dos pais (Lote E):** o handler `childrenStats` repassa os campos novos da view do
  members — `submissionsCount`, `week.submissionsSubmitted` (Estúdio + Pinta, apresentados como
  **entregas**) e `games` (jogos do Mural na semana; `null` = hub
  fora, degrada) — mirrors `ChildWeekStatsView`/`ChildWeekGameView` em `lib/types.ts`
  (`ChildStatsView.week?/games?`; `ChildDashboardView` estende). Os aliases
  `projectsCount`/`projectsSubmitted` permanecem como fallback de rollout para members antigo.
  E o handler novo
  **`parentReportPrefs`** (GET/PUT, clients `getParentReportPrefs`/`setParentReportPrefs` →
  `/members/parents/report-prefs`) é o opt-out do e-mail semanal (`ParentReportPrefsView
  {disabled}`, Zod `ParentReportPrefsBody`) — o shim do KIDS gateia os DOIS métodos com
  `requireParentGateAccountOnly` (tela exclusiva dos pais, como children-stats/payments-my). O **`StudioBlockView`** tem a prop `enableShare?`: ligada, constrói o
`StudioShareAdapter` (descreve via `/api/studio/describe`, publica multipart via `/api/studio/publish`) e o
passa ao `<StudioLesson share>` — o botão "Compartilhar" aparece na Topbar do editor. ⚠️ **A CAPA (data URL
do print/upload) vira Blob via `dataUrlBase64ToBlob` (`lib/data-url.ts`, `atob`), NUNCA `fetch('data:…')`**:
a CSP dos apps (`connect-src 'self' https:`) bloqueia `fetch` de `data:` → "Failed to fetch" no publish
(bug 28/06; vale tb no Estúdio Completo `studio-full-client.tsx`). ⚠️ **Só HABILITA
após a ENTREGA ao professor**: o `StudioBlockView` passa `shareDisabledReason` ao `<StudioLesson>`
(`share && !submitted ? '…envie ao professor primeiro' : undefined`) — o botão aparece desabilitado com
dica até o aluno enviar o projeto, e habilita quando `submitted` vira true. Casa com o backend, que barra
publicar sem entrega (`SHOWCASE_NOT_ELIGIBLE`) — antes dava a tela vermelha ao tentar publicar cedo. ⚠️ **O kids liga SÓ
no bloco da ÚLTIMA aula do projeto** (`enableShare={Boolean(content.showcase?.enabled)}` no
`kids-lesson-blocks`): publicar é fim-de-projeto, então nas aulas intermediárias o botão fica OFF (a criança
não solta o jogo antes de terminar). Isso **substituiu o antigo "Publicar no Mural" da `LessonCelebration`**
(`PublishToMural` REMOVIDO — mesma ação, e o Compartilhar ainda dá descrição editável + link público de
jogar; `LessonCompleteResult.showcase` segue vindo do members mas o kids não o consome mais). A
elegibilidade real é do backend (publish 409 `SHOWCASE_NOT_ELIGIBLE` quando o bloco não é de vitrine). O
post publicado é um **snapshot IMUTÁVEL e INDEPENDENTE** do rascunho que a criança continua editando.
**Sincronizar com o enviado (28/06):** o `StudioBlockView` passa **`onCloudSync`** ao `<StudioLesson>` (item
⋯ → "Sincronizar com o enviado", só na aula) → abre um Dialog de confirmação (substitui o editor) → no OK,
`apiGet` da entrega (`…/studio-submission` GET) e `handleRef.current.replaceProject({...project, id: projectId})`
(re-chaveia p/ a chave LOCAL → o autosave grava por cima do rascunho defasado); sem entrega → aviso gentil.
Resolve o caso "terminei em outro PC e aqui puxa o rascunho local antigo".
Quando o publish dá certo, o adapter chama `onPublished` → a prop **`onShared`** do `StudioBlockView`
entrega os links ao kids, que abre a celebração do Zappy (`MuralCelebration`); o `ShareDialog` fecha sem
mostrar a própria tela de sucesso (no Estúdio Completo, sem `onShared`, a telinha padrão do dialog vale).
**Economia de IA:** o adapter ainda passa `presetTitle`/`presetDescription` do `content.showcase.title/
summary` (admin) — com resumo, o `ShareDialog` abre preenchido e NÃO chama a IA (a criança edita se
quiser); em branco (ou no Estúdio Completo, que não passa) → a IA gera o rascunho.

**Carreira do aluno + degrau do curso (06/2026; reforma 2D/3D 07/2026):** `lib/types.ts` tem
`StudentLevelSlug` (**8 slugs**: `noob`→`coder`→`hacker`→`explorer`→`elite`→`architect`→
`champion`→`god`) + `StudentLevelView` (com `remaining` por DEGRAU — `StudentLevelRemaining`, 6
chaves `iniciante-2d`…`avancado-3d` + `any`, mirror do members) — `GamificationMeView.level?` e
`PublicProfileGameView.level?` (OPCIONAIS). E `CourseLevelSlug` + **`CourseTrack`** (`2d`|`3d`) em
`CatalogCourseView`/`MyCourseView`/`CourseDetailView` (`level?`/`track?`).
`CareerCourseLockView.reason` = `future-tier` | `foundation-first` | **`tier-reward`** (24/07 —
bônus `careerSlot=null` é RECOMPENSA da etapa; regra no core/members, apresentação no kids).
**`CourseMilestonesView {completed, showcased}`** (15/08) em `CatalogCourseView.milestones?` e
`MyCourseView.milestones?` — os dois marcos do ledger SEM cruzar (opcionais, tolerando members
antigo; vitrine adulta vem zerada). Passthrough puro: o kids monta com eles o selo do card
("Publique no Mural" × pronta) e o contador da trilha. ⚠️ **Não é o `progress`**: aquele regride
quando a autora publica uma aula nova, o marco não. **`lib/course-tier.ts`**
é o helper compartilhado dos apps de aluno (`COURSE_TIERS`/`COURSE_TIER_LABELS`/`courseTierOf` —
track ausente → `2d`; o admin NÃO importa daqui, duplicação intencional); o filtro `nivel` do
`use-catalog-filters` usa os degraus de `COURSE_TIERS` (7 desde 14/08, com o `primeiros-passos-2d` na frente; só o KIDS usa a divisão — o filtro `nivel` do adulto não tem UI hoje). **`lib/studio-tier.ts`**: `resolveStudioTier` mapeia os 8
ranks → degrau de blocos do Estúdio Completo (cada nível libera somente ferramentas já aprendidas;
**Ponte abre no `champion`/Gênio** e o Pro abre somente no `god`/Lenda + equipe; desconhecido→noob;
remodelo 26/07 — Mestre/Arquiteto ficaram só-Blocos). `resolveStudioTier` também devolve a allowlist
acumulada de extensões (o kit `game-3d-advanced` entra já no `architect`/Arquiteto, reclassificado p/
`intermediario-3d` no studio) e bloqueia projetos antigos ou importados que dependam de uma extensão futura. A matriz completa e o runtime remoto das aulas
estão em `docs/carreira-do-criador.md`. Tudo
passthrough (os clients não mapeiam) — a APRESENTAÇÃO (aura/insígnia/chip) vive no community-kids;
aqui é só o tipo.

**Paleta do Estúdio pelo CURRÍCULO (08/2026):** `resolveStudioTier(levelSlug, role, unlocks?)` ganhou
um 3º argumento — os blocos que a criança conquistou nos cursos (+ extensões derivadas). Quando NÃO
vazio ele MANDA na paleta (`allowBlocks` já é soberano sobre o `level` dentro do editor);
⚠️ **fail-open deliberado**: vazio/ausente cai no perfil do NÍVEL, senão o dia do deploy (com nenhum
curso etiquetado) a criança abriria o Estúdio com a caixa VAZIA. ⚠️ A **EQUIPE ignora o currículo**
(passe livre p/ conferir o Estúdio inteiro). Client novo `getStudioUnlocksReadonly()` (`GET
/members/studio/unlocks`) + tipo `StudioUnlocksView`. ⚠️ A derivação bloco→extensão e bloco→gaveta
vive em **`server/studio-unlocks.ts`** (`extensionsForBlocks`/`drawersForBlocks`), NÃO no
`lib/studio-tier.ts`: ela importa o `SERVER_BLOCK_CATALOG` inteiro e o studio-tier é consumido por
componentes de CLIENTE (checagem de remix no Mural) — arrastar o catálogo p/ o bundle do navegador
seria caro. Quem resolve é a página (Server Component), que passa o resultado pronto.

⚠️⚠️ **A gaveta é chaveada pelo `palettePath` INTEIRO, NUNCA pela folha (14/08).** `StudioDrawer`/
`StudioDrawerSnapshot` são `{key, family, label, …}`: `key` = caminho inteiro (identidade), `family`
= `palettePath[0]` (a categoria de topo que a criança lê na paleta) e `label` = o resto. Medido no
catálogo real (1467 blocos): **12 nomes de folha se repetem em famílias diferentes**, cobrindo 176
blocos — `🔊 Som` existe em QUATRO (Jogo 2D, 2D Avançado, Jogo 3D, 3D Avançado), `🎨 Aparência` e
`🔤 Texto` em três. Com `at(-1)` as quatro viravam UMA gaveta com a contagem somada, e a criança que
abrisse o Jogo 3D veria a gaveta do Jogo 2D "crescer" em vez de ganhar uma caixa nova. O caminho
inteiro também preserva o segmento do meio dos kits (`Jogo 2D Avançado › 🧙 Kit RPG › 💬 NPCs`).
`groupDrawersByFamily` é o agrupamento que o perfil do kids consome. ⚠️ `extensionsForBlocks` NÃO
mudou: ele usa `entry.extension` (prefixo do tipo), ortogonal ao `palettePath`. Regressão travada em
`tests/studio-unlocks.test.ts` com um par REAL de blocos homônimos.

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
  ⚠️ **Reforma 07/2026:** `MissionsMeView` ganhou `monthly: MissionView[]` (cadência MENSAL) e
  `MissionView.cadence` virou `'daily'|'weekly'|'monthly'` — mirror do members. Passthrough puro (o
  BFF não mapeia); a cadência/gating/marcos vivem no members (ver o CLAUDE.md de lá §Missões). Só
  ESTRUTURAL aqui, sem lógica nova.
- **Proteção de sequência:** `buyStreakFreeze()` (`POST …/streak-freeze/buy` — compra com moedas;
  sem saldo → 402) + `setVacation(from,to)` (`POST …/vacation` — janela de férias; `null/null` limpa).
- **Liga semanal:** `getLeagueReadonly()` (`GET …/league/me`). **Board ENRIQUECIDO na vitrine kids
  (07/2026):** `LeagueEntryView` ganhou `photoUrl?`/`levelSlug?`/`firstName?`/`profileId?` (mirror do
  members) — o members hidrata rosto+nível+1º nome de cada colega; `profileId` só p/ perfil PÚBLICO
  (opt-in) → link p/ `/crianca/[id]` (mesma decisão do Clube/Mural). Passthrough puro (sem lógica no BFF).
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
  p/ casar o tipo. **Superfícies (24/07):** `RoomPlacedItem`/`RoomStateSchema` ganharam
  `on?` (itemId do pai) + `slot?` — só FORMA; pai/nicho/posse é portão do members
  (`canonicalizeRoomState`). O renderer 3D vive no community-kids (visual); aqui é só o BFF.
- **Perfil público de OUTRA criança:** `getPublicProfileIdentity(profileId)` (auth S2S → nome + flag
  `publicProfileEnabled`, nunca PII) + `getPublicProfile(profileId)` (members → xp/ranking/conquistas/
  avatar/quarto SEM identidade). O BFF junta os dois no `PublicProfileDTO` p/ a página `/crianca/[id]`;
  o perfil público VIVO é o portão (404 se os pais desligarem) — não confiar em snapshot velho.

Handlers (`createShellRoutes`, espalhados no `index.ts` como `routes.*`): `gamificationMe`,
`missionsGet`/`missionClaim`, `streakFreezeBuy`/`vacationSet` (Zod `VacationSchema`), `avatarGet`/
`avatarBuy`/`avatarEquip` (Zod `AvatarConfigSchema` — só forma; posse/categoria/paleta é portão do
members) + **`avatarSnapshot`** (multipart, FORA do matcher — sobe o PNG p/ o R2 e chama `setAvatarPhoto`),
`roomGet`/`roomSave`/`roomBuy` (Zod `RoomStateSchema`), **`studioActivityDay`** (`POST /api/studio/activity`
— beacon SEM corpo de "criou no Estúdio hoje"; client `members.recordStudioActivityDay()` → `POST
/members/gamification/activity`; o members dá 10 XP/dia que MOVE o streak, gated por posse do Estúdio,
1×/dia — âncora de quem já terminou os cursos e só cria) e `childrenStats` (área dos pais: junta
identidade dos perfis do auth com os stats por perfil do members; gateado por
`requireParentGateAccountOnly` no shim do KIDS). Toda escrita passa por `requireWritableSession`
(`readonly` bloqueia; `write` libera o fluxo normal); ids de path validados como UUID na borda.

**Privacidade — `authorProfileId` (perfil público, 06/2026):** o `redactAuthors` (`lib/hub-redact`)
continua zerando o `authorId` cru de TERCEIROS, MAS quando o autor é PÚBLICO (`authorPublic` —
opt-in dos pais, snapshot no hub) expõe um **`authorProfileId`** (o id do perfil) como ALVO do link
p/ `/crianca/[id]`, preservando o `authorDisplayName`. Perfil não público → sem `authorProfileId`
(o fórum cai em "Colega"; o Mural mostra o nome sem link). É só estrutural e sobrevive à redação;
o portão VIVO é o próprio perfil público (404 se desligarem depois). Cobertura em
`tests/hub-redact.test.ts`. **No Clube kids (07/2026) o 3º arg `revealNames` preserva o 1º nome de
TODOS os autores (não só dos públicos) e o BFF anexa rosto+aura em lote — ver "Full review do Clube
dos Criadores".**

> **Fonte da verdade da gamificação** (valores exatos de XP/moedas/marcos, catálogos de avatar/quarto/
> missões, regras de streak/freeze/férias/ligas, modelo de dados e gotchas): **`../../docs/gamificacao.md`**.
> Os tipos/clients/handlers daqui são só o mirror do BFF — qualquer mudança de contrato começa no members
> e se reflete nesse doc.

**Minhas assinaturas (07/2026):** client payments ganhou `listMySubscriptions()`
(`GET /payments/my/subscriptions`) + `cancelMySubscription(id)` (`DELETE …/:id` — o acesso segue
até o fim do ciclo pago + carência); handlers `paymentsMySubscriptions` (GET) e
`paymentsMySubscriptionCancel` (DELETE, `requireWritableSession` + UUID na borda). Tipos
`MySubscriptionView` + `SUBSCRIPTION_STATUS_LABELS` + helper `nextChargeDate(sub)` (próxima
cobrança DERIVADA: última cobrança ?? criação + intervalo; null fora de ACTIVE) em `lib/types.ts`.
O community monta a seção em `/compras`; o kids gateia os DOIS shims com
`requireParentGateAccountOnly` (área dos pais).

**Embaixador da Bolsa (auto-cadastro do responsável, 09/2026):** client members ganhou
`getAmbassadorEnrollment()` (`GET /referrals/me/ambassador`) + `enrollAmbassador()` (POST) —
rotas JWT "me" do referrals via gateway (o gateway injeta a identidade; o serviço faz
get-or-create/LINK pela conta). Handler `ambassadorMe` (`routes.ambassadorMe.GET/POST`; o POST
passa por `requireWritableSession`). Tipo `AmbassadorEnrollmentView` em `lib/types.ts`
(`{enrolled, ambassador?: {code, status, pageUrl, shareUrl, pixKeySet}, stats?, bonus?: {counts +
amountCents — o VALOR do bônus vigente, a copy do app nunca o hardcoda}, created?, emailPending?,
linkEmailSent?}` — URLs ABSOLUTAS, o app não conhece a base do funil; `created` só no POST: true =
o e-mail do link saiu. ⚠️ **`emailPending`**: o e-mail já é de um embaixador e a plataforma não
verifica e-mail, então o referrals NÃO vincula — o magic-link vai para a caixa do dono e a resposta
vem SEM links; o app precisa ter estado próprio p/ isso, senão vira "não cadastrado" mudo).
O kids embrulha o shim com `requireParentGateAccountOnly` (tela exclusiva dos pais); o community
adulto não monta a UI hoje.

**Quota de IA por conta (07/2026):** `server/ai-quota.ts` — `consumeAiQuota(members, feature)`
(features `pensa-chat`/`pensa-synthesis`/`studio-describe`) consome ANTES do OpenRouter via
`POST /members/ai-usage/consume` (client `members.aiUsageConsume`); **FAIL-OPEN** (members
fora/5xx → allowed com log — o 10/min in-process fica como anti-burst; o teto in-process de
150/dia do Pensa SAIU, substituído pela quota durável). Recusa: chat SSE → **429 JSON**
`{code:'AI_QUOTA_EXCEEDED', scope}` no pré-voo; generate idem (só nos tipos COM LLM);
`studio/describe` → **200** `{description:'', fallback:true, quotaExceeded:true, scope}`
(fail-soft, a criança escreve). Copy gentil em `aiQuotaMessage(scope)`; o Pensa propaga o `scope`
duck-typed até o `friendlyErrorMessage` (pacote pensa) e o ShareDialog do Studio cai no modo
manual com hint.

**Perfis estilo Netflix (PR5, kids):** o shell expõe o **client de perfis**
(`createProfilesClient` em `server/clients.ts` → `/auth/profiles*` no auth) e os **route
handlers** `profilesList`/`profileCreate`/`profileUpdate`/`profileArchive`/`profileSelect`/
`profileExit` (em `createShellRoutes`; o `CreateProfileBody` Zod aceita
`publicProfileEnabled?` desde 08/2026 — o pai decide o perfil público JÁ na criação, tutorial
de 1º acesso do kids; o auth aplica no create, parent-only por construção; ⚠️ o `profileAvatar` — upload de FOTO de perfil — foi
REMOVIDO 24/07: a imagem da criança vem só do snapshot do avatar 3D via `avatarSnapshot` +
allowlist `AVATAR_PHOTO_URL_PREFIXES` no members). `select`/`exit` EMITEM tokens novos
e o handler TROCA os cookies (igual ao exchange de impersonação): `select` = entrar/trocar de
perfil (1 clique, sem PIN); `exit` = voltar à área dos pais (gateado pela senha do responsável
no auth). **`exit` REVOGA o refresh da sessão de perfil deixada** (full review F3): captura o
refresh ATUAL antes de trocar os cookies e chama `gateway.logoutRequest`; a revogação da família
anterior precisa confirmar antes de instalar a nova sessão. A família NOVA da conta não é tocada
(família distinta), mas nenhum sucessor concorrente da família antiga fica vivo. Mudança de modo
usa só um access novo; `refresh.ts` resolve primeiro a cadeia de sucessores e serializa
refresh/mode/logout pelo token CANÔNICO (entrada pendente atrás do lock nunca é aguardada, para não
criar deadlock). `select`/`exit` usam `gatewayFetchWithRefreshProof`: o corpo leva esse mesmo refresh
canônico; se o access expirou, libera o lock, rotaciona e remonta a chamada com o sucessor. O Auth
propaga o deadline absoluto da família de suporte para que a troca de perfil não renove as 2h.
O logout só limpa os cookies após o auth confirmar a
revogação da família; indisponibilidade responde 503 e mantém o banner/sessão visíveis para retry.
A claim **`pfl`** do JWT é lida por `parseProfileClaim` (`lib/act.ts`, pura/testada) →
`SessionUser.activeProfile` (`{accountId, name}`). O **proxy** ganhou `requireProfileSelectPath`
(opcional, só o kids usa): conta logada SEM `pfl` na área de aprender → redireciona p/ a grade
(ex.: `/perfis`); a própria rota é isenta.

**Recados (conversas com o professor — canal de retorno, 07/2026):** o shell é o BFF do
"Recados" do aluno (o kids renderiza em `/recados`). Client members (`server/clients.ts`,
`?audience`): `listTeacherThreads`/`listTeacherThreadsReadonly` (caixa), `getTeacherThreadsUnread`/
`getTeacherThreadsUnreadReadonly` (badge do sino — resposta `{count}`), `getTeacherThread(id)`,
`postTeacherMessage(id, body)` (resposta do aluno — corpo `{body}`), `markTeacherThreadRead(id)`.
Handlers em `createShellRoutes` → `routes.teacherThreads{List,Unread}`/`teacherThread{Get,Reply,Read}`
(`/api/members/teacher-threads*`): GET livres (impersonação PODE ler), `Reply`/`Read` gateados por
`requireWritableSession` (modo `readonly` da impersonação) + id validado UUID + Zod `TeacherReplyBody` (≤1000).
Tipos mirror em `lib/types.ts` (`TeacherThread{,Summary}View`/`TeacherMessageView`/
`TeacherThreadContext`/`TeacherMessageRole`). O aluno só RESPONDE (não inicia); o texto renderiza
PLAIN (React escapa — sem markdown de UGC). Contrato do members: ver `../members/CLAUDE.md`
§Conversas com o professor.

## "Guardado na sua conta" — BFF das criações (18/08/2026)

**Versão do documento (06/09/2026):** reserva aceita `formatVersion` opcional,
inteiro 1..65535 sem coerção; ausência continua compatível com clientes legados.
DELETE também encaminha `maxFormatVersion` opcional (inteiro 1..65535, sem coerção,
ausência significa cliente legado 1). Recusa de versão não agenda limpeza R2.
Encaminhar ao members sem confundir com `baseRevision`. `CREATION_CLIENT_OUTDATED`
409 e `details.requiredVersion` atravessam o BFF, sem assinar PUT. Resumo pode trazer
`formatVersion`; tipo opcional permite transição com servidores antigos. Backend
com migration 0075 e guard completo deve preceder escritores de formatos novos.
O ticket também confirma `formatVersion` (07/09): conferir igualdade com a pedida
ANTES de qualquer `presignPut` e encaminhar a confirmação ao cliente. Ausência no
upstream confirma só 1; null/texto/divergência retorna 503 `UPSTREAM_INCOMPATIBLE`.
Não ecoar a versão pedida como se tivesse sido aceita por um Members antigo.

⚠️ A `Tool` da rota (`z.enum(['studio', 'pinta', 'molda'])`) e o `CreationToolView` de
`lib/types.ts` são ESPELHOS de `CREATION_TOOLS` do members (`molda` = a oficina 3D, 04/09/2026):
ferramenta nova entra nos dois, senão o BFF responde 400 antes de o members ser consultado
(`community-kids/tests/molda-conformance.test.ts` trava o lockstep). O resto da rota é genérico
por `:tool`.

`src/routes/creations.ts` (`shell.routes.creationsList/UploadUrl/Commit/DownloadUrl/Delete`), molde
de `routes/hub.ts` (anexos): o members guarda o ÍNDICE (`/members/creations/*`) e AQUI só se assina
o R2 UGC privado — `creationsUploadUrl` chama `members.reserveCreationUpload` (posse + quota +
revisão) e devolve `r2PresignPutUgc` da chave `creations/<perfil>/<tool>/<item>/<rev>.json.gz` com
**Content-Length e Content-Type (`application/gzip`) ASSINADOS** (TTL 600 s); `creationsCommit`
manda `{revision, uploadedParts?}` (bytes/meta são os da reserva), apaga DEPOIS da resposta
(`after()` do Next; `deferCleanup`) e best-effort tudo o que a revisão soltou (`releasedStorageKeys`
do members — manifesto anterior + partes não referenciadas — em LOTE por `r2DeleteObjectsUgc`;
`previousStorageKey` como fallback) e responde só `{item}`; `creationsDownloadUrl` assina o GET da
revisão corrente (TTL 300 s) e um GET por PARTE (`parts: [{hash, bytes, url}]`, TTL 600 s).
**Partes (19/08/2026):** a reserva aceita `parts: [{hash, bytes?}]` (≤128, hash `[a-f0-9]{64}`),
pré-confere o total declarado (> 40 MB → 409 de quota sem ir ao members) e assina um PUT por parte
FALTANTE que o members devolve (`parts: [{hash, bytes, uploadUrl}]`, Content-Length da parte);
antes do commit com `uploadedParts`, HEAD best-effort no R2 (`r2HeadObjectUgc`, 8 em paralelo, na
chave `creationPartStorageKey(perfil, tool, item, hash, revisão do commit)` de
`@sistemazero/core/creations` — a MESMA função do members): 404 definitivo → 409
`CREATION_PART_MISSING {details.hashes}` SEM chamar o members; erro de HEAD ≠ 404 segue. Partes
declaradas mas members SEM `parts` na resposta (members anterior ao protocolo, janela de
deploy/rollback — o DTO dele descarta campos desconhecidos) → 503 `UPSTREAM_INCOMPATIBLE`
(retentável), nunca um ticket sem as faltantes. `r2DeleteObjectsUgc`: lote de até 1000; se o
`DeleteObjects` falhar (checksum SDK×R2) ou recusar chaves, apaga as que faltaram uma a uma
(`DeleteObject`) e avisa uma vez (`createR2UgcObjectStore` recebe o cliente de produção ou o
cliente falso do teste em `tests/r2-delete-objects.test.ts`). O apagar é agendado por `deps.defer` (default `after()` do Next
com fallback; `tests/creations-routes-after.test.ts` prova "responde, depois apaga"). 409 do members apaga SÓ o manifesto recusado (as partes podem estar em outra reserva em
voo). A lixeira apaga em lote `storageKeys` (manifesto + partes). Nome (120) e kind (40) são
CORTADOS (por caractere, não por UTF-16: emoji na borda não vira meio par), não recusados (o
Estúdio aceita 200; um 400 deixava o jogo sem subir para sempre) e a miniatura acima de 12 k é
descartada; `bytes` acima de 40 MB responde 409 `CREATION_QUOTA_EXCEEDED` "grande demais" (a MESMA
resposta do members — um 400 genérico virava "vou tentar de novo" para uma condição permanente);
`baseRevision` (revisão-base do aparelho) passa direto para o members (409 `CREATION_STALE_BASE`
quando outro aparelho subiu antes). `creationsDelete` apaga do R2 o blob que a lixeira soltou
(`storageKey` do members) e responde só `{deleted}`. Um 200 SEM corpo do members vira 502 (o
cliente lia `{ok:true}` como ticket → `fetch(undefined)`). Sessão de suporte em `readonly` bloqueia
as escritas; `write` segue os mesmos gates normais. `x-sz-viewer` SEM sessão de perfil não é mismatch (só sessão de OUTRO perfil). **`x-sz-viewer`**: o cliente manda o perfil que enfileirou
a chamada; se a sessão já é de OUTRO perfil (irmão que entrou no meio de um upload em voo), TODAS
as rotas respondem 409 `VIEWER_MISMATCH` — nem o jogo do A entra no índice do B, nem a lista do B
desce para o IndexedDB do A. Clients em `server/clients.ts` (`listCreations`,
`reserveCreationUpload` (com `parts`), `commitCreationUpload` (com `uploadedParts`),
`getCreationDownload`, `deleteCreation`); views em `lib/types.ts` (`Creation*View`,
`CreationPartTicketView`, `CreationCommitResultView.releasedStorageKeys`,
`CreationDeleteResultView.storageKeys`). O blob nunca toca o Next nem o gateway. Testes:
`tests/creations-routes.test.ts` (R2 falso com `head`/`deleteObjects`). Design:
`docs/plans/2026-08-18-guardar-na-conta-design.md`.

**Limpeza na exclusão de conta (19/08/2026):** `routes/creation-cleanup.ts` expõe o worker
`POST /api/internal/creation-cleanups`, autenticado por bearer comparado em tempo constante
(`CREATION_CLEANUP_CRON_SECRET`). Ele reivindica até 25 jobs no Members via gateway HMAC, apaga
cada prefixo do R2 UGC relendo a primeira página até confirmar vazio e confirma/falha o job. A
rota fica fora do proxy de sessão/anti-CSRF e deve ser acionada pelo scheduler a cada 5 min; a
fila só libera o job após o TTL do PUT + margem. Produção do kids falha no boot sem o segredo.

## Bloco de aula do PINTA (`pinta`, 15/08/2026)

O irmão do bloco `studio`, para DESENHO. `PintaBlockView`
(`components/pinta/pinta-block.tsx`, wired no `lesson-blocks.tsx`) monta o
`<PintaLesson>` de `@sistemazero/pinta/lesson` (import dinâmico no effect — IndexedDB/canvas
não existem no SSR), com "Enviar para o professor" (recado opcional), **"Baixar o desenho"**
(`.pinta.json` de UM asset — o mesmo envelope que a galeria do Pinta restaura, então a criança
importa lá sem ponte nova), Expandir e o selo "o professor já viu".

- ⭐ **O rascunho É o armazenamento injetado.** Diferente do Estúdio (store local próprio +
  seed por prop), aqui o `<PintaLesson>` recebe `createPintaPersistence({namespace})` — um banco
  PRÓPRIO por **bloco + perfil** (`aula-<blockId>-<viewerId>`) — e a regra "o que já está
  guardado vence o desenho inicial" mora dentro do pacote. Por isso o rascunho não aparece na
  ordem de seed daqui: só decidimos qual desenho oferecer como INICIAL quando o armazenamento
  está vazio, e aí a ordem é **entrega → cadeia → desenho do professor**, cada passo lazy e
  best-effort (falha de rede cai no próximo). A regra é PURA (`lib/pinta-seed.ts`
  `resolvePintaSeed`, testada em `tests/pinta-seed.test.ts`) — o componente só liga os fios;
  três ramos dentro de um `useEffect` é o tipo de coisa que regride sem ninguém ver.
- **Cadeia entre aulas (`content.chain`):** com o bloco em cadeia e sem entrega NESTA aula, o
  editor abre com o desenho que a criança entregou na aula anterior —
  `GET …/pinta-carryover` (handler `pintaCarryover`, client
  `members.getPintaCarryover`). ⚠️ A ENTREGA vence a cadeia: se ela já enviou aqui, retomar do
  desenho anterior apagaria o trabalho desta aula. ⚠️ Quem garante que o desenho carregado ENCAIXA
  no bloco é a AUTORIA (o members recusa cadeia com tipos misturados, 409
  `PINTA_CHAIN_TYPE_MISMATCH`) — aqui não há conversão nem checagem de tipo.
- ⚠️ **Sem o namespace próprio o desenho da aula cairia na galeria PESSOAL da criança**, e o
  `setPintaStorageNamespace` global viraria variável compartilhada entre a página do Pinta e a
  aula.
- ⚠️ **`handle.save()` ANTES de `getAsset()`** no envio: o autosave do Pinta é debounced e sem
  isso o professor receberia a versão de um segundo atrás, sem os últimos traços.
- ⚠️ O efeito de carga roda **uma vez por bloco** (`biome-ignore` explícito): re-executar com o
  desenho inicial/estado da entrega nas deps re-hidrataria por cima do que a criança desenha.
- Handlers `pintaSubmit`/`pintaSubmissionGet` (`POST|GET
  /api/members/lessons/:lessonId/blocks/:blockId/pinta-submission`); clients
  `members.submitPintaAsset`/`getOwnPintaSubmission`. Tipos `PintaBlock`/`PintaStateView`
  (= `StudioStateView`)/`PintaSubmissionResultView`/`OwnPintaSubmissionView`; `LessonBlockView`
  ganhou **`pintaState`** em campo próprio (os dois blocos coexistem numa aula).
- ⚠️ **O community ADULTO também compila o pacote**: o renderizador de blocos é compartilhado,
  então o app dele precisa de `transpilePackages: ['@sistemazero/pinta']` + o par
  `@import`/`@source` no globals.css (sem o `@import` os tokens `--color-pin-*` não existem e o
  editor sai sem cor). Idem o admin. Os `railway.json` dos TRÊS e o `ci.yml` listam
  `packages/pinta/**` como gatilho.

## GIF animado no anexo do hub (22/08/2026)

O Pinta passou a exportar a animação da criança em GIF, e o pedido dela foi poder **postar isso no
Clube dos Criadores** — como anexo de uma publicação, igual a qualquer imagem. O anexo de imagem do
hub barrava `image/gif` de propósito: o upload re-encoda tudo para WebP, e WebP a partir de um GIF
fica só com o PRIMEIRO quadro — a animação sumiria em silêncio, com toast de sucesso.

⚠️⚠️ **O MURAL NÃO ENTRA NISTO, e o código reflete a separação.** O Mural é a vitrine dos JOGOS
publicados pelo Estúdio (`hubShowcase` + os dois `studioPublish`), e a capa de lá é uma imagem
PARADA: os três caminhos continuam validando por `UGC_IMAGE_INPUT_MIME`, que segue **sem** gif. O
GIF entrou só no `hubUploadImage`, que é o anexo de POST — Clube, comentários, fórum adulto.

⭐ **A saída não foi afrouxar o re-encode, foi dar um ramo próprio.** `optimizeAnimatedGif`
(`server/image-optimizer.ts`) roda o sharp em modo `animated` e emite `.gif()`: os quadros
sobrevivem E o arquivo que vai ao R2 continua sendo o que o sharp EMITIU, nunca os bytes de quem
enviou. O `hubUploadImage` escolhe o ramo pelo MIME; o resto da rota não mudou.

- **`UGC_IMAGE_INPUT_MIME` continua SEM gif**, e isso é contrato: quem usa esse conjunto para
  decidir "posso aceitar esta imagem parada?" (a capa de jogo do `routes/studio.ts`) segue
  recusando GIF de propósito. Quem quer os dois usa **`isUgcImageInput`**; o animado tem conjunto
  próprio (`UGC_ANIMATED_IMAGE_MIME`).
- ⚠️ **`limitInputPixels` limita UM quadro** (largura × `pageHeight`), não o total: muitos quadros
  pequenos somariam um decode enorme na réplica ÚNICA. Daí o teto de quadros (`MAX_GIF_FRAMES`
  300) E o teto do produto total — os mesmos que a marca d'água já tinha.
- ⚠️ **Sem `.rotate()` no ramo animado**: EXIF não existe em GIF, e o auto-rotate giraria a TIRA
  inteira de quadros como se fosse uma imagem só.
- O resto da cadeia já estava pronto: `UGC_MIME_BY_KIND.image` já listava `image/gif` (exibição),
  `classifyMime` já o classificava como `image`, o `attachment-list` usa `<img>` cru (não
  `next/image`, que congelaria) e o `watermarkImage` já sabia carimbar animado quadro a quadro.
  Faltava só a ENTRADA — e o `HUB_UPLOAD_ACCEPT`, senão a criança nem consegue escolher o arquivo.
- ⚠️ Vale para os DOIS apps (o member-shell é compartilhado): a comunidade adulta também passou a
  aceitar GIF no anexo.
- ⭐ **A escolha do otimizador é `optimizeUgcImage(bytes, mime)`, não um `if` no handler.** Ela é a
  regra que a feature inteira existe para garantir, e solta dentro do `hubUploadImage` (que precisa
  de sessão, R2 e do hub para rodar) ficava sem teste nenhum: apagar o ramo não quebraria upload
  nenhum, o arquivo subiria certinho e só não animaria. ⚠️ Mockar o módulo do R2 para testar o
  handler foi REJEITADO — o registry de mocks do bun é GLOBAL na suíte e três testes importam
  `server/r2` de verdade; seria a armadilha de "CI vermelho, local verde por ORDEM DE ARQUIVOS".
- ⭐ **`UnsupportedImageError`**: as recusas do GIF (ilegível, não é GIF, quadros demais, grande
  demais) são TIPADAS e viram **400 com recado** no handler. Sem isso caíam no `mediaErrorResponse`
  → 500, mensagem interna escondida em produção ("Falha na operação de mídia.") e um alerta no
  Sentry para algo que a criança resolve trocando o arquivo.
- Teste (`tests/image-optimizer-gif.test.ts`): o GIF é montado pelo **codificador REAL do Pinta**
  (import relativo — ele é interno ao pacote), então as duas pontas ficam casadas: o arquivo que a
  criança BAIXA é o que ela ANEXA. Junto vai o anti-vácuo que **prova que o caminho WebP mataria a
  animação** (`pages: 1`) — é a razão de o ramo existir, escrita como teste em vez de comentário.

## Livro 3D e anexos com marca d'água: cache por aluno + fila com prazo (incidente 07/09/2026)

Sintoma em produção: "Preparando seu e-book…" para sempre e depois **524 do Cloudflare** em
TODOS os cursos; staging (mesmo código) funcionava. Não era o PDF (10 MB) nem o R2 (HEAD/GET em
~200 ms de dentro do container): era o caminho **inline** (≤20 MB, o do livro 3D) re-marcando o
PDF a CADA abertura (6–15 s de pdf-lib) atrás do `watermarkGate()` (concorrência 1) **sem prazo
e sem enxergar o cliente ir embora** — só o caminho >20 MB cacheava. Cada recarga da criança
enfileirava OUTRO trabalho e o antigo seguia na fila: a fila passou dos 100 s do Cloudflare e,
dali em diante, toda abertura só a alimentava (estado metaestável; um `railway redeploy` limpou
na hora, mas voltaria). O que mudou, e é contrato:

- **`watermarkedPdfInline()`** (`server/private-delivery.ts`) é a entrega do PDF ≤20 MB nos DOIS
  handlers (`ebookDownload` e o anexo PDF): HEAD no cache por (arquivo, **versão**, aluno) →
  hit serve o stream do R2 **sem gate nem pdf-lib**; miss marca UMA vez dentro do gate e grava em
  `watermarked/<sha256(key)>/<etag>/<user>.pdf`. Falha ao gravar o cache NÃO falha a entrega,
  pois os bytes já estão marcados; falha de marcação **bloqueia** o download com 503, sem servir
  o original. As portas são injetáveis
  (`InlineWatermarkIo`) e o contrato está em `tests/private-delivery-inline.test.ts`.
- ⚠️ **A versão (ETag da origem) ENTRA na key do cache** (`watermarkCacheKey(src, user, etag)`;
  `R2PrivateHead.etag`). O admin substitui um material **sob a mesma key** (foi o caderno do
  Corridino): sem a versão, o aluno seguiria recebendo a marca da versão antiga — o caminho
  >20 MB (`presignWatermarkedPdf`) tinha esse bug latente e passou a receber `srcEtag` também.
  Sem ETag (legado) cai na forma antiga da key.
- **`ConcurrencyGate.run(fn, { signal, waitTimeoutMs })`**: quem espera sai da fila quando a
  request é abortada (`req.signal`, aba fechada/recarga) e desiste após
  `WATERMARK_WAIT_TIMEOUT_MS` (30 s) com `WatermarkQueueBusyError`. ⚠️ `wakeNext` pula esperador
  morto — sem isso o wake-up morria com ele e a vaga ficava presa com a fila cheia (teste
  "esperador morto não prende a vaga"). Concorrência segue 1 (pico de RAM é o mesmo; a vazão
  veio do cache).
- **`mediaErrorResponse`**: `WatermarkQueueBusyError` → **503 `WATERMARK_BUSY` + `Retry-After`**
  (`WATERMARK_RETRY_AFTER_SECONDS`, sem Sentry: é carga, não defeito); `WatermarkQueueAbortedError`
  → 503 mudo. O cliente do livro 3D (`use-pdf-pages.ts`) respeita o `Retry-After`
  (`lib/retry-after.ts`, teto 20 s) e tenta UMA vez mais; se seguir cheio, mostra o recado do
  servidor em vez de "Falha ao baixar o e-book (524)".
- ⚠️ Prefixo `watermarked/` tem lifecycle no bucket: cache expira sozinho e re-gerar é barato.
  Trocar o PDF gera etag novo → cache novo; o antigo morre pelo lifecycle.
- **Proteção obrigatória (19/09):** livro 3D e anexos PDF/imagem privados nunca entregam o original
  quando a marca falha ou o arquivo passa do teto. PDF/imagem externos não passam pela marca e
  são recusados como anexos protegidos; links comuns seguem externos. A falha usa
  `WATERMARK_UNAVAILABLE` (503) para que a autora corrija o arquivo ou o aluno tente novamente.

## A cor do perfil: espelho em cookie, hidratado pelo proxy (17/09/2026)

O `next-themes` saiu dos dois apps de aluno. A preferência de cor é do PERFIL e vive no banco
(`profile_preferences.palette`); o que a torna instantânea e sem flash é um ESPELHO em cookie.

- **`lib/palette-cookie.ts`** (puro): `paletteCookieName` (`__Host-` em prod, régua dos cookies de
  sessão), `encodePaletteCookie`/`decodePaletteCookie` e `paletteValueOf`. ⚠️⚠️ O valor é
  `"<dono>.<cor>"` — **o dono faz parte do valor**. Irmãos dividem o mesmo jar de cookies, e sem o
  dono o perfil que entrasse depois herdaria a cor do anterior até a primeira ida ao servidor. Era
  exatamente essa janela que o `sz:kids:tema-dono` do cliente tentava fechar; com o dono no cookie,
  quem fecha é o SERVIDOR, antes do primeiro byte de HTML.
- **`server/palette.ts`**: `fetchPaletteOnce`, com single-flight em `globalThis` via `Symbol.for`
  (nunca escopo de módulo — o Turbopack dá cópias por bundle, e a rajada de prefetch RSC chega
  junta). ⚠️ 4xx vira `'unavailable'`, NÃO `null`: tratar recusa de sessão como "sem cor" gravaria
  um espelho mentiroso de seis horas.
- **`server/proxy.ts`** ganhou `paletteCookie`: quando o dono do cookie não bate com o `sub` do
  token, ele busca e reescreve o cookie da REQUEST e da RESPONSE (o mesmo movimento da rotação de
  sessão) — o render do mesmo ciclo já lê o valor certo. Gateway fora grava cookie de 60s e se
  auto-cura na navegação seguinte, sem redirect e sem bloquear.
- **`routes/profile-preferences.ts`** fala `/members/preferences` com `{palette}` (zod derivado de
  `PALETTES`) e **grava o cookie em todo 2xx** — inclusive no GET, que é o auto-conserto de um
  espelho atrasado. Layout não pode gravar cookie; route handler pode. ⚠️ A rota legada
  `/members/preferences/kids` foi REMOVIDA do members e do gateway em 17/09/2026, uma release
  depois dos apps; **ordem de deploy: members → gateway → apps**. Cobertura em
  `tests/profile-preferences-route.test.ts` (sessão, viewer, catálogo, espelho só em 2xx).
- **`components/palette-picker.tsx`**: as caixinhas de cor. Radios NATIVOS (setas, Home/End e
  `aria-checked` de graça), nome acessível = rótulo em português, marca de seleção não-cromática,
  alvo ≥44px. ⭐ ZERO hexadecimal no componente: cada caixinha leva `data-sz-palette` e lê
  `--sz-action` de dentro de si — custom property herda e o seletor de atributo pinta a subárvore,
  então a amostra é a cor real da folha gerada. Recebe o valor inicial do SERVIDOR (pintura no
  primeiro quadro, sem esperar rede), pinta otimista, agrupa cliques (o teto do gateway é 60/min e
  é circuito de segurança) e, em falha, volta para a última cor CONFIRMADA — nunca para a cor da
  casa. ⭐ **Uma leitura ao montar, e só aqui:** o espelho vale seis horas e é POR APARELHO, então
  quem trocou a cor no celular via a caixinha antiga marcada no computador — justo na tela que diz
  qual é a sua cor. O GET reconcilia a tela E, no BFF, regrava o cookie do aparelho. ⚠️⚠️ Um
  clique VENCE a resposta, e em DOIS níveis: o guarda `mexeu` protege a TELA, e **escolher ABORTA a
  conferência em voo** — porque a resposta do GET também grava o espelho, e uma leitura lenta que
  saiu ANTES do clique carrega o valor de antes dele: chegando depois do PUT, ela carimbaria a cor
  velha por seis horas, e o proxy, vendo dono e cookie casados, nunca mais perguntaria. Abortada, a
  resposta não é recebida e o `Set-Cookie` dela não vale (é para isso que o `apiGet` aceita
  `signal`). ⚠️ E o efeito NÃO tem marca de "já rodei": no StrictMode do desenvolvimento ela
  sobrevive à remontagem e a segunda montagem desistiria com a resposta da primeira já descartada —
  a conferência ficava morta no `bun dev`.
- **Logout apaga o espelho** (`clearSessionCookies`, que por isso recebe o nome do cookie da cor),
  e o proxy o expira junto quando o refresh é recusado. Ele é do DONO da sessão; fora da área
  logada quem o lê é o layout, sem sessão para conferir contra — deixá-lo vivo deixava a tela de
  login de um aparelho de família vestida com a cor de quem acabou de sair.
- ⚠️ Mora AQUI e não no `@sistemazero/ui`: aquele pacote não tem dep de framework nem CSS próprio
  de componente, e este fala com o BFF e carrega o contrato do `x-sz-viewer`.

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
   `profileAvatar` AUTORIZAVA o dono ANTES de gravar no R2 (handler REMOVIDO em 24/07 — a foto
   do perfil agora vem SÓ do snapshot do avatar 3D; o padrão authorize-before-write segue valendo
   p/ `meAvatar`/`avatarSnapshot`); `watermarkImage` com `limitInputPixels` (anti OOM); `getMeReadonly`/`getGamificationReadonly`
   memoizados por request via `React.cache()` (dedup layout×página). **+ full review 20/06:**
   `meAvatar.POST` recusa sessão de PERFIL (403 `ACCOUNT_SESSION_REQUIRED`) ANTES da escrita no R2
   — a foto do `/me` é da CONTA; sem isto a criança deixava objeto R2 órfão (espelha o
   authorize-before-write do antigo `profileAvatar`, removido 24/07); `watermarkCacheKey` virou `sha256(srcKey)` (INJETIVO
   — a substituição lossy podia colidir e servir o PDF errado ao MESMO aluno) e `watermarkImage`
   ganhou teto de pixels TOTAIS p/ animados (não só por frame). **Fix aqui = fix nos dois apps;
   mudança aqui RODA NOS DOIS — rode as suítes dos dois.**
5. Réplica ÚNICA por app (single-flight/gate em `globalThis` são por processo).
5b. **`onVideoEnded` (07/2026):** o `LessonPlayerContextValue` tem o callback opcional
   `onVideoEnded` (vídeo TERMINOU de verdade, evento `ended` do SDK — distinto do
   `onVideoReachedThreshold` a ~90%). Fio: `VimeoPlayer.onEnded` → `VimeoLessonVideo`
   (lesson-blocks) → contexto. O kids usa p/ abrir a CELEBRAÇÃO completa no fim do vídeo
   quando a aula foi auto-concluída a 90% (antes: só toast, a criança "perdia a festa");
   o adulto não passa o callback (zero mudança).
6. **`vimeo-player`: o SDK é o DONO do iframe** (`new Player(divHost, { id })`). NUNCA voltar ao
   padrão "iframe no JSX + `new Player(iframe)`": `destroy()` REMOVE o iframe do DOM real sem o
   React saber — com o double-invoke do StrictMode (e re-runs do effect) o ref vira um iframe
   ÓRFÃO e o vídeo some na navegação client-side, só voltando com F5 (bug real, corrigido
   11/06/2026 — afetava os dois apps).
7. **Exports map: subpaths de componente levam EXTENSÃO** (`"./components/ebook/*":
   "./src/components/ebook/*.tsx"`) — padrão sem extensão resolve no Turbopack mas NÃO no `tsc`
   (o typecheck do consumidor quebra com "Cannot find module").
8. **Ganchos de tema da aula (`LessonSections`) são SÓ classe, sem regra aqui.** Cada app veste a
   aula pelo CSS DELE a partir destes nomes — o kids no `globals.css` dele e, desde `994f2eac`
   (a paleta do Pen), a comunidade ADULTA também, sob o escopo `.sz-aula-adulto`. Ou seja: hoje
   renomear um gancho quebra o desenho dos DOIS apps, não só o do kids. Os nomes:
   `sz-lesson-sections` (raiz, só com a flag `kids`), `sz-lesson-toolbar` (⚠️ desde 13/09/2026 ele
   só RENDERIZA sem a flag `kids`: no kids a barra "O que falta para concluir / Índice da aula"
   saiu inteira. ⚠️ Desde 18/09/2026 o ÍNDICE também saiu dela no adulto — ele mora no cabeçalho da
   seção nos dois apps —, então lá sobra só "O que falta para concluir"; regra do kids para este
   gancho segue sendo regra morta), `sz-lesson-section-head`
   (o `<header>` do cabeçalho da aula. ⚠️ Desde 18/09/2026 ele é UM cabeçalho só, nos dois apps:
   "nome da aula · nome da seção" à esquerda e o índice à direita, SEMPRE na mesma linha. O nome da
   aula vem da prop `lessonTitle` — o player que a passa deixa de renderizar o `<h1>` dele, e o
   cabeçalho VIRA o `<h1>` da página; sem ela (ensaio e prévia do admin) segue `<h2>`. ⚠️⚠️ Ele é o
   ALVO DO FOCO ao trocar de seção (`focus()` + `scrollIntoView`), então é o que leva o leitor de
   tela ao conteúdo novo e o que faz a página subir: CSS que mire a tag precisa de `:is(h1, h2)`,
   senão vira regra morta na página real),
   `sz-lesson-block` (cada bloco), **`sz-lesson-scene`** (a raiz da atividade de cena —
   demonstração e experimentação. ⚠️ Desde 13/09/2026 o BLOCO não desenha cartão próprio: quem
   desenha é o app, e é por este gancho que ele sabe qual bloco é uma cena. ⚠️ Desde 18/09/2026 o
   CONSOLE tem a moldura dele por dentro (borda de 1px e fundo de cartão, `sz-scene-console`) — é
   ele que faz da instrução, do mundo e dos controles uma peça só. O kids já dá cartão a
   TODO bloco; o adulto e o ensaio do admin têm regra própria, e sem ela a cena fica solta na
   página. A cena também tem TETO de largura, `max-w-scene` = `--container-scene` (**680px**
   desde 14/09/2026; nasceu 560 e a dona achou que tinha encolhido demais), que vem
   de `src/styles/scene.css` junto com a paleta `--color-scene-*` — folha que cada app precisa
   `@import`ar, senão as utilitárias `fill-scene-*` não são geradas e o desenho sai preto),
   **`sz-lesson-activity`** (o irmão do anterior: a raiz da pergunta curta e da experiência em
   HTML — sem ele o app não alcançaria esses dois pelo CSS),
   **`sz-lesson-chip`** + `data-chip` (14/09/2026 — o selo de TIPO dos blocos interativos:
   `experimentation`|`demonstration`|`question`|`html`, com ícone e rótulo em verbo — Experimente,
   Observe, Responda, Brinque. Aqui ele é só uma linha em versalete; no kids vira a MESMA pílula
   colorida dos outros blocos. ⚠️ Bloco `interactive` NUNCA passa pelo `renderBlocks` do app — o
   `LessonSections` o manda direto ao `InteractiveLessonBlock` —, então este gancho é o ÚNICO
   caminho para o chip deles; mexeu nele, mexa no `BlockChip` do kids),
   **`sz-lesson-materials`** e a família dele (19/09/2026 — `-title`, `-list`, mais
   `sz-lesson-material` + `data-material` por item, `-action`, `-icon`, `-copy`, `-label`, `-meta`,
   `-cta`,
   `-note`, `-figure`, `-video`, `-text`. O bloco de materiais complementares é UM componente
   para os dois apps, e ele não tem cor nenhuma por dentro: o kids o veste com o relevo e a
   bolinha da marca, o adulto com a linha sóbria. Travado em `tests/materials-block.test.tsx`),
   `sz-lesson-requirement` +
   `data-done` (a linha "Atividade concluída/obrigatória"), `sz-lesson-nav` e os três botões
   dele (`sz-lesson-nav-prev|help|next`), e a DIVISÓRIA do lado a lado:
   **`sz-lesson-split-handle`** (a área de arrasto) + **`sz-lesson-split-grip`** (o fio dentro
   dela). Renomear um deles quebra o desenho em silêncio
   (nenhum teste de lá mira a classe, salvo o do handle); mudar a ESTRUTURA (ex.: o bloco deixar
   de ser irmão logo depois do cabeçalho) também — os dois apps juntam cabeçalho e bloco num
   cartão só pelo seletor de irmão (`.sz-lesson-section-head + .sz-lesson-block`).

## Materiais complementares: o bloco que matou os "materiais de apoio" (19/09/2026)

Relato dela: *"Eu gostaria que os materiais de apoio aparecessem ali na mesma hierarquia dos outros
blocos, dependendo da ordem em que eu colocar… Eu não quero que tenha uma área especial para ele.
Eu quero que ele apareça visualmente no ponto que eu fizer na seção da aula."* E, sobre o que
existia: *"não tem que manter compatibilidade… sem gambiarra e sem puxadinho."*

O que existia eram DUAS coisas, e nenhuma obedecia à ordem dela:
- **`supportBlockIds`** — um LUGAR fora das seções, num `<details>` fechado em posição fixa no pé
  de TODA seção. E o Subir/Descer de lá **não tinha efeito nenhum** para o aluno: o botão
  reescrevia `supportBlockIds`, mas o player listava por `lesson.blocks`, que é a ordem de CRIAÇÃO.
- **O card "Materiais da aula"** — os anexos, pregados no pé da página inteira.

Hoje é um bloco (`kind: 'materials'`, `components/materials-block.tsx`), com uma lista ORDENADA de
itens: `file`, `image`, `text`, `link` e `video`. Os dois caminhos antigos saíram inteiros —
`supportBlockIds` não existe mais em lugar nenhum da pilha, e o `lesson-attachments.tsx` foi
APAGADO (o fork do kids junto).

- ⭐ **O posicionamento saiu de graça, e vale saber por quê:** não existe campo de "duas colunas"
  na seção — a divisão é DERIVADA (`lib/lesson-split.ts`: esquerda = conteúdo, direita =
  ferramenta). Um bloco que não é Estúdio, Pinta nem cena já cai sozinho na coluna da esquerda, na
  ordem de `section.blockIds`. Travado em `tests/lesson-split.test.ts`.
- ⚠️⚠️ **O item de ARQUIVO aponta para um anexo da aula pelo id, e NUNCA carrega a URL.** O anexo
  já tem a entrega privada inteira por trás (R2 privado, `storageRef` que não chega ao navegador,
  marca d'água por aluno com cache por ETag, 302 acima de 20 MB) e o `content` de um bloco viaja
  CRU para o aluno: um `r2priv:<key>` aí vazaria a chave do bucket E passaria por fora da marca
  d'água, de uma vez só. Quem preenche rótulo, tipo e tamanho é o `toLessonDetailView` do members,
  lendo o anexo; item cujo anexo foi apagado SOME em vez de virar linha morta.
- ⚠️ **Sem vaivém na autoria, apesar disso:** o formulário do item tem o `FileUploader` dentro e o
  editor cria a linha de anexo por baixo (`addMaterialAttachment`, molde do que o e-book já fazia).
  O "subir numa aba e voltar aqui para escolher" era justamente o passo a mais que este bloco
  existe para tirar.
- ⚠️ **O card do pé SUMIU, e por isso o admin avisa:** um arquivo que ela sobe e não coloca em
  bloco nenhum é um arquivo que o aluno não vê. A lista de Anexos marca esse caso em vermelho.
- ⚠️ **Vídeo só vira iframe nos hosts que a CSP dos dois apps já libera** (`lib/video-embed.ts`:
  `player.vimeo.com` e `www.youtube-nocookie.com`). A régua é uma ALLOWLIST comparada por
  IGUALDADE — `includes('vimeo.com')` casaria `vimeo.com.rastreador.net`, e o que está em jogo é
  abrir um iframe de terceiro numa página de criança. O que sai no `src` é sempre uma URL que a
  função MONTOU a partir de um id validado, nunca a de entrada. Outro provedor vira LINK: iframe
  bloqueado pela CSP não avisa nada, e um retângulo branco é pior que um link honesto.
- **O desenho é UM só para os dois apps**, sem cor por dentro: os ganchos `sz-lesson-materials*`
  (invariante 8) são o contrato, e cada app veste no `globals.css` dele.
- **Download é um comando legível, não só um ícone:** a linha inteira continua sendo o botão, mas
  agora exibe “Baixar” à direita; durante o pedido mostra “Preparando…” e só exibe “Baixado”
  quando o navegador recebeu o arquivo. O fallback que abre outra aba não recebe esse selo:
  não há confirmação do download fora da página. A prévia do admin continua desabilitada.
- **Ele NUNCA trava a conclusão** (`isCompletionGatingBlock`): complementar é, por definição, o que
  está fora do percurso obrigatório. Isso substituiu a checagem "atividade obrigatória no apoio"
  do members, que deixou de existir junto com o lugar.
- ⚠️ **Todo bloco pertence a UMA seção agora**, e `validateLessonSections` ficou mais simples do
  que era. No core, o `case 'block'` põe o bloco novo na seção pedida ou, na falta dela, no fim da
  ÚLTIMA: um bloco órfão faria a gravação recusar a AULA INTEIRA, e a autora descobriria só na hora
  de publicar.
- **Migrations em DUAS subidas** (`0090` e `0091`) — o porquê está no cabeçalho de cada uma e no
  CLAUDE.md do members.

#### Full review do próprio lote (19/09/2026) — 7 achados

Correção de review é código novo e merece review, e esta rodada pagou de novo. Dois dos sete só
apareceram porque eu abri o navegador e MEDI, em vez de argumentar.

1. ⚠️⚠️ **`var(--interactive)` não existe no app adulto.** Eu escrevi o par sem sufixo no
   `globals.css` de lá; os tokens são `--interactive-text`/`--interactive-text-hover` (o componente
   antigo usava a utilitária `text-interactive`, que resolve para eles). O CSS não avisa: a cor
   caía calada no `foreground` e o link não parecia link. Medido depois do conserto:
   `rgb(27, 92, 243)` contra `rgb(15, 26, 51)` do texto.
2. ⚠️⚠️ **MEDIDO num celular de 390px: "abre em outra aba" (120px) ficava MAIOR que o nome do
   link (108px).** O aviso comia mais da linha que a coisa avisada. Hoje ele é `sr-only` no link e
   no vídeo — o ícone de link externo já diz isso a quem enxerga — e o nome passou a 240px. Nas
   linhas de ARQUIVO a meta continua à vista, porque "JSON · 12 KB" custa 70px e é informação que
   a criança usa para decidir se espera o download.
3. ⚠️⚠️ **O arquivo que ela sobe e não coloca em bloco nenhum ficava invisível sem aviso.** O card
   "Materiais da aula" do pé não existe mais, então um anexo fora de um bloco é um arquivo íntegro
   no R2 e ausente da tela. O aviso está em DOIS lugares de propósito: na lista de Anexos (por
   linha, em vermelho) e em `lessonEditorialWarnings`, que é o painel por onde ela publica — pela
   aba de Anexos ela pode nunca passar.
4. ⚠️ **"2 materialis".** O plural de "material" cai no `-l`. Pego pelo teste que eu escrevi
   justamente para o rótulo da lista do percurso.
5. ⚠️ **No ensaio de autoria do admin o download era um clique mudo:** aquela prévia monta o bloco
   FORA da aula, sem contexto de player, então não há rota de anexo para chamar. Hoje o botão
   nasce desligado e DIZ "baixa na aula" — e o arquivo continua à vista, que é o que ela precisa
   conferir. No mesmo caso, o `label` do item vinha VAZIO (quem o preenche é o servidor): o
   `lesson-structure-editor` passou a espelhar a resolução, lendo os anexos do rascunho.
6. **Narrowing morto** em `lesson-published-diff.ts` (`typeof origem === 'string'`, de quando a
   origem podia ser a string "Materiais de apoio") e o Set dos anexos refeito a cada bloco no
   `inspect` do members.
7. **A a11y da lista sem título:** um leitor de tela anunciava "lista de 3 itens" sem dizer de
   quê. Hoje a `<ul>` ganha `aria-label` **só** quando não há `<h3>` — nomear nos dois casos faria
   o nome ser dito duas vezes seguidas.

⚠️ **O que foi MEDIDO e está de pé:** zero vazamento horizontal em 680, 390 e 314px de coluna (as
três larguras reais da aula), linha de 60px no kids e 44px no adulto (o alvo de toque), UM iframe
só — o do Vimeo — e o Drive virando link. A conferência é `community-kids/tmp/confere-materiais.tsx`
(descartável): ela monta o bloco nas formas que a autora consegue criar, com o CSS dos DOIS apps, e
escreve `tmp/materiais-kids.html` e `tmp/materiais-adulto.html`.

⚠️ **Consequência conhecida do backfill, e é a razão de a autora mover as coisas depois:** um bloco
que estava no apoio era alcançável de QUALQUER seção; no fim da última seção, ele só fica acessível
quando o aluno chega lá (`accessibleBlockIds` segue a seção). O que NÃO muda: a conclusão da aula,
que já contava esses blocos antes (o `toLessonDetailView` sempre os entregou).

## Cenas de aula: experimentação e demonstração

As 45 cenas manipuláveis das aulas (`activity.type` `experimentation` e `demonstration`). O MOTOR (estado,
ações, metas, relógio de quadro fixo, frases, elenco, protocolo com o members) mora em
`@sistemazero/core/learning/scene`, com o CLAUDE.md dele; aqui mora o que a criança vê e toca. A régua desta
casa vale em tudo abaixo: **toque, teclado e leitor de tela levam ao MESMO lugar.**

⭐⭐ Player e servidor rodam o MESMO motor, e a funcionalidade nasce na PRIMEIRA versão (decisão da dona,
17/09/2026): o segmento não leva carimbo de versão e o player não tem caminho para "servidor de outra versão".
O que ele tem é o `servidorRecusou` (`scene-activity.tsx`): 400/422 numa gravação de cena não é falha de rede —
tentar de novo não resolve, então a cena para, a conclusão sai da tela e a saída é "Abrir de novo" com "Esta
atividade mudou.". Ordem de deploy e manifestos a importar:
[`docs/aulas-interativas/raio-x-implantacao.md`](../../docs/aulas-interativas/raio-x-implantacao.md).
Conferência visual das 45 com os componentes de produção: `bun run galeria:cenas` no community-kids.

### Mapa dos arquivos (`src/components/`)

| Arquivo | O que faz |
|---|---|
| `scene-activity.tsx` | O player (`SceneActivityView`): sessão, gravação, palpite, pergunta, rodapé e relógio. Não escreve palco nem peça de bancada. |
| `scene-prediction.tsx` | O palpite antes de mexer: as três peças do PENDENTE (`PalpiteContexto`, `PalpitePergunta`, `PalpiteOpcoes`, que o console monta) e a linha congelada depois da escolha. |
| `scene-console.tsx` | ⭐⭐ O CONSOLE: `SceneConsole`, `ConsoleFala`, `ConsoleMundo` e `ConsolePrancha`. Só moldura. |
| `scene-hud.tsx` | ⭐⭐ O PLACAR do jogo dentro do palco: `PlacarDoJogo`, `VidaDoJogo` e `CoracaoDoJogo`. |
| `scene-conclusion.tsx` | "Você descobriu!", a pergunta "Agora explique" e a faixa da revisita. |
| `scene-demo-controls.tsx` | A demonstração guiada e a `MontagemTravada`. |
| `scene-sandbox.tsx` | "Agora é sua vez". |
| `scene-frame.tsx` | A faixa de estado (`SceneReadoutBand`, com a `placa` do começo e o `valoresEscondidos` do palpite) e os botões do mundo (`botoesDoMundo`), iguais no player e na vez. |
| `use-scene-clock.ts` | `useSceneClock`, `limiarDoRelogio`, `relogioDaCena`, `estadoVistoDaCena`, `tempoDeLeitura`. |
| `use-scene-voice.ts` | `useSceneVoice`: a voz do ZAPPY (fila de MP3) e, faltando áudio, a do navegador. |
| `zappy-fala-context.tsx` | `ZappyFalaProvider`/`useZappyFala`: quem tem botão "Ouvir" na tela rege a BOCA do mascote. |
| `scene-lugar-reservado.tsx` | `LugarReservado`: o espaço acima da bancada que não encolhe. |
| `scene-bench.tsx` | O vocabulário da bancada: `Medida`, `Chave`, `Escolha`. |
| `exploration-stage.tsx` | `SceneButton` e o despacho do palco (`ExplorationStage`). |
| `scene-lesson-controls.tsx` | O despacho da bancada (`LessonSceneControls`) e as bancadas de `coordinates`, `stage-size`, `draw-loop` e `screen-reader`. |
| `exploration-pieces.tsx` | Fios e peças (`ExplorationPieces`): `world`, `lives` e a bancada do Corre Dino. |
| `experience-connection.tsx` | O fio (`ExperienceConnection`). |
| `scene-canvas.tsx` | O palco único (`SceneCanvas`, `Texto`, `usePalco`). |
| `scene-figures.tsx` | A porta única de figura (`ActorFigure`) e o de-para elenco → arte (`FIGURA_DA_ARTE`). |
| `scene-arte.tsx` | ⭐⭐ A ARTE DO JOGO no palco: `ArteSvg` (uma figura), `FundoDoCenario` (o mundo) e o relógio `RelogioDaArteProvider`/`useRelogioDaArte`. |
| `scene-3d.tsx` | A régua do 3D. |
| `scene-*-stages.tsx`, `scene-*-controls.tsx`, `experience-scene.tsx` | Palcos e bancadas por família (tabela "Cena → palco e bancada"). |
| `lib/scene-controller.ts` | `SceneController`: sessão local, segmentos e rascunho no IndexedDB. |
| `styles/scene.css` | A paleta `--color-scene-*`, o teto `max-w-scene`, o mundo espaço e as peças do console (`sz-scene-console*`, `sz-scene-prancha`, `sz-scene-placa`, `sz-scene-hud-*`, `sz-scene-placar-rotulo`) — cada app `@import`a. |

### O CONSOLE: a experiência inteira numa peça só (18/09/2026)

⭐⭐ Relato dela, depois que as figuras passaram a ser as do Jogo 2D: *"a aparência geral da experiência, e
isso conta instrução do Zappy, cena e controles da cena, tem que parecer que são uma única unidade e fazem
parte de um jogo, para instigar a criança a realmente querer fazer"*. Antes disto o bloco eram QUATRO
retângulos em volta de um desenho de jogo — o cartão do bloco, o balão do Zappy, a moldura da faixa e as
caixas da bancada —, com raios que nem conversavam (20 / 16 / 12).

Hoje é um bloco só (`scene-console.tsx`), nesta ordem:

```
┌─ console ─────────────────────────────────┐
│  [placa]   x 300   y 150        ●●○       │  ← a faixa, no molde do drawScore do jogo
│  🐲 a fala do Zappy, largura cheia        │  ← e a PISTA logo abaixo dela
│ ┌──────────── o mundo ──────────────────┐ │
│ └───────────────────────────────────────┘ │
│  a frase da situação                      │
│ ╭─ prancha ────────────────────────────╮  │
│ │ [gesto]  [medida]  [chave]           │  │
│ ╰──────────────────────────────────────╯  │
└───────────────────────────────────────────┘
   Desfazer · Recomeçar · Uma pista   Conferir   ← o rodapé fica FORA do console
```

⚠️⚠️ **O MATERIAL continua sendo o do APLICATIVO.** Ela viu três propostas na maquete e escolheu o
meio-termo ("Proposta B"): a ARRUMAÇÃO é nova, mas o cromo segue vestindo o tema do perfil (cartão, borda,
cor de ação), e não o deck escuro do jogo. Isso PRESERVA a regra "mundo é o jogo, cromo é o tema" — o que
mudou foi só onde cada peça mora. Quem veste o jogo é o que está DENTRO do palco, mais o placar.

- ⚠️ **O Zappy ganhou faixa PRÓPRIA, e não um balão por cima do mundo.** Ela viu as duas na maquete: o
  balão sobre o cenário tapava a régua do topo e a marca do `0, 0` — justamente o que a cena do endereço
  ensina. Pôr o balão sobre o desenho ainda exigiria cada um dos 45 palcos reservar essa faixa.
- ⭐⭐ **A PISTA mora colada na fala do Zappy**, e não no pé do bloco. Relato dela na maquete: *"não
  consegui ver onde apareceu a pista"*. Ela nascia depois do rodapé, longe da instrução que a criança
  acabou de ler e fora do console; quem pede ajuda é justamente quem vai reler a instrução.
- **A conclusão** ("Você descobriu! Agora explique") entrou no console, abaixo do mundo, na
  `.sz-scene-console-conversa` — é o mesmo lugar em que o palpite pergunta. ⚠️ A margem no TOPO dela é
  load-bearing: sem ela o cartão encostava no mundo, e ela reparou na maquete.
- **A comparação guardada** ficou FORA do console: ela é um segundo mundo, e dois mundos dentro da mesma
  moldura leem como uma coisa só. O RODAPÉ também: as ferramentas e o "Conferir" são o que a criança
  faz COM a cena, e dentro da moldura viravam mais uma faixa.
- **A "Agora é sua vez" usa o MESMO console** (`scene-sandbox.tsx`), com a fala do Zappy chegando
  pela prop `fala`: ela é a experimentação continuando, então não pode ter outra cara.
- ⚠️ As três ferramentas do rodapé passaram de `tom="discreta"` (fantasma) para **`tom="ferramenta"`**
  (contorno). Relato dela: *"quando eu olho parece que são três textos, e quando passo o mouse também nada
  muda"* — o kids mantém o fantasma PLANO de propósito, e o contorno já ganha o relevo e o levantar do app.

**O PALPITE mora no MESMO console**, e a cena fica NO MEIO dos dois balões: contexto → mundo → pergunta →
opções. Juntar os dois balões faria a criança responder antes de olhar — foi o primeiro desenho da maquete,
e ela reparou na hora (*"no palpite não eram dois balões: um para o contexto e, depois embaixo da cena, a
pergunta"*). Quatro mudanças de comportamento saíram daí, e as quatro são load-bearing:

- ⭐ **A prancha fica À VISTA e FECHADA**, em vez de sumir (*"o palpite também tem ali o balão de fala do
  Zappy, a cena do jogo e alguns controles desativados"*): a criança vê o que vai poder mexer, e o bloco não
  muda de altura quando ela responde. ⚠️⚠️ `ConsolePrancha fechada` é a CORTINA, e por isso é **`inert` +
  desfoque** — não o `fechado` de um controle solto (aquele continua no Tab e continua dizendo por que não
  responde). Os dois motivos são antigos: o gesto não pode chegar ao motor antes do palpite, e **os motivos
  dos controles fechados SOPRAM a resposta** (a nota de uma chave que diz "abre depois que 3 cactos
  passarem" é a previsão inteira). O `inert` tira a prancha do Tab e do leitor; o desfoque apaga o texto
  miúdo e deixa as FORMAS à vista. A trava do MOTOR não depende de nenhum dos dois: `dispatch` e
  `action.current` recusam enquanto o palpite está pendente.
- ⚠️⚠️ **A faixa aparece com os VALORES escondidos** (`valoresEscondidos`, um "?" por valor): os rótulos
  dizem o que a cena mede — que é o que a criança vai olhar mudar —, e o valor responderia a pergunta antes
  dela (na `layers` a ordem dos desenhos É a previsão). Antes a faixa simplesmente não existia ali.
- **A PLACA "Seu palpite"** (`.sz-scene-placa--palpite`, no começo da faixa) é o que diz em que momento da
  atividade ela está. Ela existia como legenda do cartão de palpite que o console substituiu e se perdeu no
  caminho — achado do review deste lote. Na demonstração a placa diz "Antes de assistir".
- **Sem medidor de descobertas no palpite**: a contagem começa no primeiro gesto, e ali não houve nenhum.
- ⚠️ Na cena com controle na PRÉVIA (só a `screen-reader`) há dois "Ouvir a tela" na tela: o da prévia, que
  é o único ALCANÇÁVEL e o que apresenta o recurso a quem não enxerga, e o da prancha, dentro da cortina.

#### A conferência contra a MAQUETE (18/09/2026) — 7 diferenças

⭐⭐ Ela olhou a tela e disse: *"essa imagem é como você fez a maquete e me disse que ia ficar
assim; essa aqui é como realmente ficou. Está bem diferente, não foi isso que eu aprovei"*. Estava
certa. O `.tsx` da maquete eu já tinha apagado, mas o HTML dela sobreviveu em
`community-kids/tmp/maquete-console.html`, e foi ele que serviu de gabarito. As diferenças, todas
consertadas:

1. ⚠️⚠️ **A MOLDURA.** A maquete é `border: 4px` com `box-shadow: 0 6px 0` (o degrau do 3D do
   Brilliant, na cor da linha do tema) e raio 16; saiu `border: 1px` e sombra nenhuma. É o que faz
   o bloco parecer um console em vez de mais um retângulo, e foi a diferença nº 1 da tela dela.
2. ⚠️⚠️ **A PLACA sumiu fora do palpite.** Na maquete ela mostra o NOME da cena sempre, e vira
   "Seu palpite" na hora de arriscar. Eu a tinha deixado só no palpite, argumentando que o título
   já estava no bloco — mas quando a seção já disse o nome o `<h3>` vira `sr-only`, e aí a placa é
   a ÚNICA vez que o nome aparece.
3. ⚠️⚠️ **A PEÇA da bancada tinha o dobro da altura.** A maquete é uma linha
   (`rótulo · − ▬▬ + · valor`, 62px); a `Medida` de sempre são duas, com `p-4` (90px). Hoje é uma
   linha onde o rótulo cabe — ver o comentário da `Medida` em `scene-bench.tsx` — e o padding da
   maquete nos dois casos, o que encolhe a prancha nas 45.
4. ⚠️⚠️ **Um CARTÃO ARREDONDADO dentro da cena** (a queixa dela, textual: *"na maquete é reta"*):
   o `ScenePredictionPreview` traz uma moldura própria, e no palpite ela virava um segundo cartão
   dentro do console. A regra que zera a moldura do mundo passou a alcançá-lo.
5. ⚠️ **A ordem na conclusão.** A maquete é mundo → conversa → situação → prancha; tinha saído com
   a situação antes da conversa. E o palpite CONGELADO ("Seu palpite: X · Trocar") ficava solto
   ACIMA do console, quebrando a unidade logo na primeira linha.
6. ⚠️ **O desfoque da cortina do palpite não existe na maquete** — eu o tinha somado para as notas
   não soprarem a resposta. A maquete manda, e o risco fica anotado no `ConsolePrancha`.
7. ⚠️⚠️ **`grid gap-3 sm:grid-cols-2` em dez bancadas.** A maquete usa `auto-fit` com piso de
   17rem; o `sm:` olha a JANELA, e num celular (ou na aula dividida ao meio) ele ligava as duas
   colunas com 151px cada. MEDIDO no navegador: seis cenas passavam da moldura com rolagem lateral
   (`stage-size`, `hitbox`, `entity-state`, `camera-3d`, `pick-ray`, `world`). Virou
   `.sz-scene-pecas`. Depois da troca: zero vazamento a partir de 358px de coluna útil.

⚠️ **O que NÃO é diferença, e foi medido:** o balão do Zappy do produto já tem a borda de 2px na
cor da unidade e o bico, como o da maquete — e o MASCOTE só aparece no kids, que é quem injeta o
`renderInstruction` com ele. No ensaio de autoria do admin e na comunidade adulta o balão sempre
saiu sem Zappy e com a borda cinza, desde antes deste trabalho.

⚠️ A conferência das 45 é `community-kids/tmp/confere-console.tsx` (descartável): ela monta o BLOCO
inteiro de cada cena, confere placa, ordem, moldura e padding, e escreve `tmp/console-45.html` para
abrir no navegador.

#### Full review do próprio lote (18/09/2026) — 8 achados

Correção de review é código novo e merece review, e esta rodada pagou. Três dos oito são perdas
silenciosas do refator (o console substituiu peças que ninguém remontou); os outros cinco são
defeitos que o desenho novo criou.

1. ⚠️⚠️ **A placa "Seu palpite" tinha sumido** — ver acima. Era a legenda do cartão que o console
   substituiu; o CSS dela já existia e ninguém a usava.
2. ⚠️⚠️ **A faixa aparecia no palpite com os valores VIVOS**, respondendo a pergunta. Virou o `?`.
3. ⚠️ **O medidor de descobertas aparecia no palpite** dizendo "0 de 3" antes do primeiro gesto.
4. ⚠️⚠️ **A "Agora é sua vez" ficou com a fala FORA do console.** Ela é a experimentação
   continuando, e era a última sobra do desenho antigo: o balão do Zappy solto acima da moldura. O
   player passa o balão pela prop `fala` do `SceneSandbox`, que o põe na `ConsoleFala`.
5. ⚠️⚠️ **O `.sz-scene-console-conversa` era renderizado SEMPRE.** Vazio, as margens de cima e de
   baixo colapsavam num vão morto de 12px entre a frase da situação e a prancha, em toda cena e o
   tempo todo. Hoje a caixa só existe com conclusão dentro.
6. ⚠️⚠️ **O MOLDE da faixa media com "?".** O `LugarReservado` reserva a altura do pior caso, e
   medir com "?" (que cabe sempre numa linha) faria a faixa CRESCER no instante em que a criança
   responde e os números voltam — exatamente o pulo que ele existe para impedir. Hoje `lista()`
   recebe `escondidos` e o molde passa `false`. ⚠️ Medir com o valor real é seguro porque o molde
   é `aria-hidden`, invisível e sai na mesma passada de layout: ele nunca chega à tela nem ao SSR.
7. ⚠️ **A caixa da pista e a frase da situação encostavam nas bordas do console** (a pista também
   no mundo logo abaixo): as duas são filhas diretas da moldura e não tinham respiro. A pista
   ganhou `mx-3.5 mb-2.5`; a situação, uma regra por `[data-lugar-reservado='situacao']`.
8. ⚠️ **`D_DO_CORACAO` lia `arvore()[0]`**, que é o `<defs>` quando o pincel registra um degradê.
   Hoje procura pelo `tag` e lança se não achar — roda uma vez, na carga do módulo.

⚠️ **O que foi MEDIDO e está de pé:** os rótulos do placar em 600, 524, 390 e 314px de palco (o
piso de 12px na tela faz a letra crescer até 23 unidades no menor) não encostam no selo do canto
nem saem do enquadramento; o `inert` não é emitido quando `fechada` é falso; e os avisos sobre o
palco são `absolute` DENTRO do mundo, então o `overflow: hidden` do console não os corta.

### O placar é o do Jogo 2D (`scene-hud.tsx` + `@sistemazero/studio/arte`)

⭐⭐ Relato dela no mesmo dia: *"quando tiver placar dentro da cena, ou em algum outro elemento, a gente tem
que seguir o mesmo design lá da extensão Jogo 2D"*. Estava certa — a cena tinha inventado DUAS linguagens de
placar que não existem em jogo nenhum: o `Cartao` das cenas de número (um retângulo 176×92 com `rx=16` e
borda de 2px) e o HUD solto da `lives` (número 30 à direita, com corações desenhados à mão num terceiro
path). Havia ainda um QUARTO coração, o da ficha do `enemy-type`.

- O jogo escreve o placar com `drawScore` (`game-2d/runtime/arcadeKitsHud.ts`): `label + ' ' + valor`, numa
  linha só, `bold` na fonte da interface, **sem caixa e sem sombra**, à esquerda. As vidas são
  `drawSpriteHealth`: corações vetoriais, lado 22 e vão 6.
- **`PlacarDoJogo` tem duas FORMAS.** `linha` é o `drawScore` literal, e vai onde a cena desenha a TELA DO
  JOGO por dentro (o "Pontos: 3" da `variable`): ali o que a criança precisa reconhecer é o HUD do jogo
  dela. `empilhado` é a adaptação para os CONTADORES da cena (o placar da `score`, os cactos da `restart`, a
  base da `acceleration`, o placar da `lives`), que ela lê de relance enquanto mexe na bancada: mesma forma
  — sem caixa, número gordo, tinta do par —, só que o rótulo sai menor e em versalete acima do número, na
  régua da faixa de estado. Num jogo o HUD tem a tela inteira; aqui ele divide 600 × 310 com a pista.
- ⚠️⚠️ **A versalete é do CSS (`.sz-scene-placar-rotulo`), nunca um `.toUpperCase()` no JSX**: o texto do
  palco é vestido pelo elenco e varrido por teste (o "o elenco veste a cena INTEIRA" do kids lê o texto
  visível), e um "DINO" em caixa alta no DOM escaparia da varredura.
- ⚠️⚠️ **O coração vem de `@sistemazero/studio/arte`** (`caminhoDoCoracao`, portado verbatim do runtime e
  travado por paridade em `arte/__tests__/paridade.test.ts`): um `0.3` virado `0.31` na covinha reprova dois
  casos. Ele é calculado UMA vez numa caixa 1 × 1 (`D_DO_CORACAO`) e usado como `<path transform>` — a
  `contact` desenha dez por quadro, e um `PincelSvg` por coração a cada render seria caro sem mudar um pixel.
  `CoracaoDoJogo` ancora na PONTA DE BAIXO (é assim que os palcos o penduram); `VidaDoJogo` ancora no canto
  de cima, como o `drawSpriteHealth`, e é quem desenha a FILA.
- ⚠️ A vida PERDIDA é o mesmo desenho em CONTORNO, no vermelho da vida (era um cinza inventado na
  `enemy-type`): o lugar dela continua à vista, e é o que permite contar quantas faltam.
- ⚠️ No jogo o HUD é branco porque o fundo é escuro; na cena o céu é claro, então a TINTA vem dos tokens da
  cena (e o halo de 3px do `scene.css` faz o resto).
- ⚠️ Com o console, as varreduras que montam as 45 cenas passaram a montar também a bancada do palpite, e
  três delas encostaram nos 5 s de fábrica do bun. Ganharam prazo PRÓPRIO (30 s): é tempo, não regra.

### O player (`scene-activity.tsx`)

**O percurso da experimentação tem sete estados, sempre na mesma ordem e cada um no seu lugar:** (1) palpite
com o palco coberto; (2) palpite congelado numa linha encostada no palco; (3) "✓ Descoberta N de M" logo
abaixo do palco, na hora do gesto; (4) palpite retomado quando a meta que o responde cai; (5) "✓ Você
descobriu!" + "Agora explique", com o foco na pergunta; (6) certo ou errado com ícone, cor e palavra, e a
regra da cena só depois de responder; (7) "✓ Guardado". Dar a cada tempo o seu lugar é o que impede a tela de
contar a atividade em relógios que não conversam (o palco no presente, um cartão no passado).

- ⚠️⚠️ **Cumprir o objetivo não encerra a cena.** Nada que trava olha `result.passed`: nem o `fieldset` (um
  `<fieldset disabled>` desliga todo `<button>` de dentro, e a cena concluída abria morta ao reabrir a aula),
  nem o guarda do `action.current` (os botões ficariam clicáveis e mudos), nem os gestos diretos no desenho.
  Trava só `!ready || conflict` (gravação abrindo ou aberta em outro lugar) e o palpite pendente; o
  `demoMode` separa os dois tipos de bloco.
- ⚠️⚠️ **A conclusão é um LATCH (`conclusao`), não um espelho de `result.passed`.** Em `layers` e
  `jump-sound` a montagem precisa ficar ASSENTADA, e mexer depois de concluir faz `passed` voltar a falso. O
  latch manda na renderização (a pergunta não some) e no ENVIO (`descobriu = conclusao || result.passed`).
  O servidor também nunca rebaixa um `passed:true`.
- **A frase de sucesso é uma só, vestida** (`fraseDeSucesso` = `sceneSuccess(cena, cast, sceneTargets(activity))`,
  que dá à missão restrita a frase dela): o efeito da conclusão nunca escreve o `result.feedback` cru.
- **As metas exibidas são as que ESTA atividade cobra** (`sceneTargets(activity)` em `sceneGoals` e
  `evaluateExperimentation`): sem isso uma missão de uma meta mostraria as três do modelo e a barra não fecharia.
- ⚠️⚠️ **Concluir NÃO para o relógio**: nas cenas em que o mundo anda sozinho a última meta cai no primeiro
  quadro do que a criança devia olhar (o anel da `group-loop`, os tiros da `cooldown`). O que para o ▶ está em
  "O relógio".

**O palpite (`scene-prediction.tsx`).** `content.prediction` chega resolvido pelo core (do modelo da cena ou do
professor).
- ⚠️ Não é o `checkpoint`: não vale nota, não entra na sessão da cena e sobe em `answers.prediction` junto da
  tentativa, para o relatório do professor. "Não era isso." é âmbar e sem punição.
- ⚠️⚠️ **Opções são BOTÕES** (`aria-current` na escolhida, `aria-disabled`), nunca rádios: num grupo de
  rádios a SETA escolhia, congelava o palpite e mandava uma tentativa por seta. A pergunta mora no `legend`.
- ⚠️⚠️ **O palpite pendente trava a cena pelo ponto único dos gestos**: `dispatch` e `action.current`
  recusam. O que a criança vê no lugar do palco vivo é o RETRATO (`ScenePredictionPreview`), que não recebe
  gesto nenhum; a bancada fica sob a cortina (`ConsolePrancha fechada`: `inert` + desfoque, porque os motivos
  dos controles fechados sopram a resposta); a faixa mostra "?" no lugar de cada valor
  (`valoresEscondidos`); e o rodapé inteiro — **Desfazer, Recomeçar, Uma pista e Conferir** — não existe ali,
  como não existem o principal da demonstração guiada e o "Ver acontecer" da inline. **"Ouvir" fica aberto**
  (fora de todo `fieldset`: quem ainda não lê não pode ficar sem saída diante de uma pergunta escrita), e o
  "Ligar som" da demonstração também.
  Substituído (16/09/2026): "o palpite trava o PALCO, nunca o rodapé" → fecha também as ferramentas do
  rodapé, porque "Recomeçar" antes do palpite contava como gesto e apagava o "trocar".
  Substituído (18/09/2026, o console): o véu "Primeiro, seu palpite ↑" sobre o palco vivo e o "?" só na
  `layers` → o retrato no lugar do palco e o "?" em TODA cena (ver "O CONSOLE").
- **Guardado no `localStorage`** (`sz:scene-prediction:<scope>`, scope = perfil, aula, bloco e revisão) com a
  IMPRESSÃO da pergunta (enunciado e opções): pergunta diferente descarta o palpite, porque o deploy troca a
  previsão do modelo sem mudar o `scope`.
- Congela no primeiro gesto: o "trocar" (44px) só existe sem gesto, sem ação além de pistas e sem meta caída
  (`trocavel`). É revelado quando a meta `revealOn` cai (sem ela, na conclusão). Não tranca a REVISITA.
- ⚠️⚠️ **O retomado tem dois tempos:** a frase "Você achou: X. Olhe…" (`fraseDoPalpite`) aparece junto do
  aviso da descoberta e some no gesto seguinte (`palpiteNaHora`); lá em cima fica a linha no PASSADO ("Seu
  palpite: X. Acertou!" / "Não era isso."), verdadeira com o palco em qualquer estado. Na revisita sem palpite
  guardado, nada.

**Conferir, pista e missão restrita.**
- **"Conferir"** (contorno: enquanto a cena espera um gesto, o azul cheio é o do gesto) responde com o `pedido`
  da meta que falta ("Ainda não. Tente: …"), **nunca com o `label`**, que é a conclusão. Meta sem `pedido` cai
  na pista de nível 1; metas feitas com o arranjo desfeito (`layers`, `jump-sound`) respondem o gesto que o
  avaliador devolve. A resposta é CONGELADA no clique e sai no gesto seguinte: calculada ao vivo numa região
  viva, ela dizia "Ainda não." e a regra no render do gesto que concluía.
- Depois de concluir ele dá lugar a **"Continuar ↓"** (`tom="gesto"`), que leva o foco à pergunta e só aparece
  com ela fora da janela (`IntersectionObserver`). Na revisita, nenhum dos dois. Há UM "Recomeçar".
  Substituído (16/09/2026): "Já descobri" + "Ver de novo" → "Conferir"/"Continuar ↓", porque a cena se avalia
  sozinha (o botão nunca concluía nada) e "Ver de novo" deixava "você concluiu" sobre um palco vazio.
- **Um azul cheio por vez:** o gesto da cena (`gestoEmDestaque` do `botoesDoMundo`) apaga quando o "Continuar"
  acende.
- **"Uma pista"** entra ABAIXO da instrução, que nunca some (quem pede ajuda é quem vai relê-la), com o degrau à
  vista ("Pista 1 de 3"). O degrau volta do servidor (`saved.hintsUsed`); o botão desliga no último degrau e
  SOME ao concluir (o clique mudo contava pista para o professor). Pedir pista não é gesto: não apaga o aviso
  da descoberta nem congela o palpite. A caixa não é região viva; a pista é anunciada no clique. ⚠️ A ação tem
  três degraus (`SCENE_LIMITS.hint`) e o editor aceita dez pistas: a tela mostra todas, a evidência satura em
  três.
- ⚠️ **Missão restrita sem pistas do professor** (`setup.goals` diferente das metas de fábrica, lidas por
  `sceneSetupGoals`, que ignora meta que saiu do catálogo): a escada é UM degrau, tirado da meta que falta
  ("Tente: …"), porque a escada do modelo mandava mexer no eixo que a aula não cobra. Só o player encolhe: o
  members confere `hintsUsed` contra os três do modelo.
- Rodapé: ferramentas à esquerda, o caminho para a frente à direita (`ml-auto`). ⚠️ Os NOMES acessíveis das
  ferramentas são o contrato dos testes; abaixo de 480px elas ficam só com o ícone (`min-w-11`).

**Conclusão e revisita (`scene-conclusion.tsx`).**
- **Revisita = o resultado guardado CONGELADO no primeiro render** (`guardado`: `saved.result`, ou
  `rehearsal.results` no ensaio do admin): concluir agora não vira revisita no meio do gesto. Na revisita o
  palpite não tranca, a pergunta não aparece e não há Conferir; a faixa "✓ Você já descobriu isto." fala DELA,
  nunca do palco (é verdade com o palco vazio, pela metade ou montado), com "Ver a explicação" fechado (a regra
  e, quando `verifiedBy === 'server'`, o `feedback` guardado).
- **Ao concluir**, na primeira vez e só depois de GESTO: "✓ Você descobriu!", foco na pergunta (sem pergunta,
  na faixa), anúncio e gravação na hora. A pergunta fica no `legend` focável, com anel de respiro
  (`data-anel-com-respiro`).
- ⚠️⚠️ **A regra da cena só aparece DEPOIS de responder** (sem pergunta, na hora): nascendo junto da pergunta,
  ela era a resposta com quase as mesmas palavras.
- ⚠️⚠️ **Opções da pergunta são botões** (`aria-current`, `aria-disabled`; o `disabled` tirava o foco de quem
  acabou de acertar) e **ignoram o TOQUE (`detail > 0`) nos primeiros `TEMPO_PARA_LER_A_PERGUNTA_MS`**: o toque
  em série no gesto que conclui caía numa opção. O teclado responde na hora. A tela só rola se a pergunta está
  fora da janela (`block: 'nearest'`).
- **Certo** mostra o `feedback` do servidor (a explicação do professor) e a regra; **errado** é âmbar com a
  palavra do servidor (o gabarito não sai de lá); `PERGUNTA_MUDOU` oferece "Abrir de novo". Resposta enviada
  com a cena DESFEITA vira a caixa neutra "Para conferir, deixe a cena como estava quando você descobriu."
  (`aguardaCena`), nunca âmbar. ⚠️ Toda região viva (esta, a do Conferir, a de anúncios) existe SEMPRE, com o
  texto por dentro: montada junto do conteúdo, não é anunciada.

**Gravação.**
- Batida de 1 s, mais `online`, `pagehide`, aba escondida e desmontagem; concluir grava na hora. Segmentos em
  `…/learning-progress` e tentativa em `…/learning-attempts`, sempre com `x-sz-viewer`. A sessão da cena
  sobe em `sceneCheckpoint`, a resposta da pergunta em `checkpoint`, o palpite em `prediction`. Rascunho local
  por `scope` e aba (`sz:experience-tab:<scope>`).
- ⚠️⚠️ **Reenvio só com algo novo:** a assinatura é escolha, descobertas e montagem assentada (na
  demonstração, cada volta até o fim). Com a montagem desfeita só uma RESPOSTA nova sobe; remontar reenvia
  sozinho. Sem isso subia uma tentativa por segundo enquanto a criança lia a pergunta.
- ⚠️⚠️ **O carimbo do envio é gravado DEPOIS da resposta:** carimbado antes do `await`, uma falha de rede o
  deixava igual à assinatura para sempre e nada mais saía. O POST é idempotente pelo `attemptId`.
- ⚠️ **`attemptId` novo a cada resposta nova e quando o servidor recusa:** o members reavalia pelo checkpoint
  dele, e com o id fixo `findAttempt` devolveria a tentativa reprovada para sempre. Repetir um pedido perdido
  nunca cria tentativa.
- ⚠️ **O `flush` recebe a escolha da pergunta por PARÂMETRO:** reatribuído a cada render, o que o clique
  alcança é o do render anterior, com a resposta vazia.
- O rodapé só fala de gravação: "✓ Guardado" / "Guardando…" depois de concluir; "Ainda não ficou guardado."
  quando o servidor recusa (na demonstração, "Veja de novo até o fim." + "Tentar de novo"); 409 = "Esta
  atividade mudou ou está aberta em outro lugar." + "Abrir de novo" (depois de um deploy o 409 é quase sempre
  revisão nova do bloco ou regra nova); falha de rede = uma frase + "Tentar salvar". Cópia local que falha e
  rascunho recusado ("Continuamos de onde você parou.", sem tom de erro) não assustam. Na vez, nada.
- ⚠️⚠️ **Gravação RECUSADA não é recusa da criança** (`servidorRecusou`): 400/422 no envio param a cena, tiram
  da tela a conclusão que o servidor não aceitou e mostram "Esta atividade mudou." + "Abrir de novo" (sem
  "versão" no texto). Sem isso o 400 prometia "a gente guarda quando voltar" para sempre. A ordem de deploy
  (members antes de kids) está no raio-x.
- ⚠️⚠️ **Sem ensaio em volta, o avaliador de VERDADE** (`evaluateLearning(previewContent, …)`): a prévia sem
  provedor aprovava qualquer resposta, e o professor nunca lia a explicação que escreveu.

**Voz, som e anúncios.**
- ⭐⭐ **A voz do ZAPPY vem primeiro (17/09/2026).** `activity.vozes` é o dicionário `texto falado → MP3`,
  gerado na AUTORIA pelo botão do admin (guia operacional: `docs/voz-do-zappy.md`). O player monta a
  `falaDoOuvir` de sempre e pergunta ao core `filaDeVoz(falaDoOuvir, activity.vozes)`: ⚠⚠ TUDO OU NADA —
  faltando o áudio de QUALQUER trecho (a pista que o motor monta na hora, a legenda "Parte N"), a fala
  inteira sai na voz do navegador. Misturar as duas numa leitura — o Zappy dizendo a instrução e a voz do
  sistema emendando a pergunta que TRANCA o palco — seria pior que qualquer uma sozinha. O botão aparece
  com `vozDoZappy || voz.temVoz`: com dicionário, a cena fala num aparelho sem voz de sistema nenhuma.
  ⚠⚠ O hook toca a fila num ÚNICO `<audio>` reaproveitado (no iOS o destravamento pelo gesto vale para o
  ELEMENTO; um `new Audio()` por trecho calaria a fala no meio, só no iPhone), e um erro de áudio cai para
  a síntese do que falta em vez de deixar a criança no escuro.
- ⭐⭐ **A BOCA do mascote anda com o áudio (17/09/2026).** O `.riv` do balão (`fala.riv`, no kids)
  monta PARADO e só anima enquanto sai som. O estado nasce aqui e chega ao mascote — que é asset do
  KIDS e entra por SLOT — pelo contexto `zappy-fala-context` (`{podeFalar, falando}`): o provider
  embrulha o `{mascot}` no `dialogue-block.tsx` e o `player.renderInstruction(...)` no
  `scene-activity.tsx`, e o que conta é a POSIÇÃO na árvore, não onde o elemento foi criado. ⚠️ Na
  cena, `podeFalar` sai da MESMA expressão que decide o botão (`podeOuvir`), nunca de uma cópia —
  um Zappy parado esperando um botão que não existe seria o pior dos dois mundos. ⚠️ Os outros seis
  call sites do `renderInstruction` (pista, feedback, entrega por galeria, ação de plataforma,
  prévia) NÃO provêem o contexto: sem áudio para acompanhar, o mascote anima como sempre animou.
  O contrato ponta a ponta é cobrado no kids (`tests/zappy-fala.test.tsx`), que é onde o mascote existe.
- **"🔊 Ouvir"** (`useSceneVoice`, `speechSynthesis` em pt-BR) aparece sem `instructionAudioUrl` e só com
  `temVoz` (a API existe E há voz em português, ou a lista ainda está vazia; recalculado no `voiceschanged`). O
  hook devolve `{ temVoz, falando, falar, parar }`. Ele lê o que PEDE resposta agora (instrução, pergunta do
  palpite com as opções, pergunta final, retorno, pista), fala DENTRO do gesto (o Safari do iOS só aceita o
  `speak()` na ativação; o pedido de foco das mídias vai sem `await`), uma fala por frase (o Chrome corta fala
  longa) e só cancela a fila se for o dono. ⚠️ Com vozes e nenhuma pt, cala: sotaque inglês lendo português é
  pior que nada. Substituído (16/09/2026): `disponivel` → `temVoz`, porque com vozes sem português a tela dizia
  "Voz: ligada" e nada falava.
- **Som só onde `sceneEmitsSound(cena)`** (régua de legalidade do core; hoje só a `jump-sound`). Na
  experimentação dela o som é a chave "Som" da bancada (`SomDaBancada`: uma `Chave` com `aria-pressed`, dentro
  do `fieldset` e da cortina do palpite), acima da peça, porque a cena é SOBRE som. Na demonstração e na vez é
  o botão "Ligar som"/"Silenciar" das ferramentas, sem `aria-pressed` (o rótulo já diz a próxima ação), fora de
  `fieldset`. Substituído (16/09/2026): "Ligar som" em toda cena, sempre no rodapé e sem `aria-pressed` → a
  régua acima, porque nas outras 44 era um botão mudo e na `jump-sound` nascia desligado num canto enquanto a
  instrução mandava contar os sons.
- **Anúncios:** região `aria-live` da moldura com uma `key` por anúncio; dois no mesmo gesto saem numa fala só
  (`queueMicrotask`). ⚠️ Foco, anúncio e "✓ Descoberta" só depois de GESTO (ref `gesto`; soltar o tempo conta):
  num F5 o checkpoint volta concluído e ninguém fez nada agora.
- **A frase da situação** (`sceneSituation` do core; cena nova precisa de um caso lá, senão volta o genérico)
  é o narrador do mundo: `role="status"`, e com o relógio andando `aria-live="off"` (seriam vinte frases por
  segundo); a final é dita uma vez quando ele para. As legendas da demonstração passam pela caixa da instrução
  (`aria-live`), não pela região de anúncios.
- **Um Zappy e um título por tela** (`lesson-section-context.tsx`): com o título já dito no cabeçalho da seção o
  `<h3>` vira `sr-only` (`tituloJaDito`), e com um balão de fala na seção a instrução vira parágrafo com a MESMA
  forma do balão (`temDialogo`). ⚠️ É contexto e não prop (o `renderBlocks` de cada app fica no meio); os
  editores do painel da direita recebem o contexto vazio.

### Demonstração e "Agora é sua vez"

- **Guiada** (`SceneDemoControls`): UM botão principal cujo rótulo diz o que o clique faz agora ("Ver a parte N",
  "Continuar a parte N", "Pausar", "Ver tudo de novo"), "🐢 Mais devagar" (`aria-pressed`) e "Parte ● ○ ○"
  (`role="img"`). ⚠️ Não há "Um passo" na demonstração: 0,2 s mudos num respiro de 0,45 s ensinavam que o
  botão estava quebrado.
- ⚠️⚠️ **A legenda da parte entra DEPOIS de ela tocar**, porque descreve o resultado. Antes, a parte 1 mostra a
  instrução do professor e as outras um convite com o NOME do botão. O anel de destaque só enquanto a parte TOCA.
- `highlight: 'tools'` mostra a bancada REAL numa área `inert` e plana (`MontagemTravada`, com
  `ExplorationPieces travada`), ou nada onde a cena não tem controle; `highlight: 'compare'` mostra a comparação
  guardada só onde `sceneShowsComparison`.
- **Inline** (`presentation: 'inline'`): um botão só ("Ver acontecer", "Pausar", "Continuar", "Ver de novo"),
  nunca `disabled` enquanto toca (tirava o foco); o ▶ emenda as partes e segura cada legenda por
  `tempoDeLeitura` (0,35 s por palavra, entre 2,5 e 5 s); o fim é um ✓ pequeno ("Você viu tudo." para o leitor).
- ⚠️⚠️ **Menos movimento TOCA a demonstração em passos de 0,2 s** (guiada e inline), em vez de aplicar a parte
  de uma vez: na `frames` a legenda "trocando devagar, dá para ver que são dois" ficava sobre um quadro parado.
- **O fim da guiada** é "✓ Você viu tudo!" + **"Agora é sua vez"** (`scene-sandbox.tsx`): a bancada da
  experimentação a partir do estado final, em MEMÓRIA. ⚠️⚠️ Sem controlador, sem batida, sem avaliador e sem
  medidor: a demonstração já foi registrada e a sessão guardada é a do ROTEIRO (o members rejoga os comandos
  dela); um comando de experimentação ali seria recusado e travaria a gravação. Tudo aberto (não há meta a
  esperar). Usa o MESMO `botoesDoMundo`, `LessonSceneControls`, `ExplorationPieces`, `useSceneClock` e as
  mesmas réguas de parar e soltar o ▶ do player. A instrução vira "Sua vez! …", o foco vai à `section` "Sua
  vez", há som onde a cena faz som, e "Ver tudo de novo" recomeça a demonstração com o foco no principal.
- ⚠️ **As `lives` do Desafio** (o roteiro atira: `pontoPorAcerto`): a vez abre numa partida NOVA (a
  demonstração termina sem vidas), com os fios do roteiro, o botão de tiro e sem o fio do ponto por tempo nem
  ▶/passo (`semRelogio`).

### O relógio (`use-scene-clock.ts`)

- `useSceneClock` soma os quadros do `requestAnimationFrame` até o limiar e chama `onTick(segundos)` (num ref:
  nas dependências, reiniciaria o laço a cada render), que devolve `false` para PARAR. Aba escondida não conta
  tempo; teto de 0,1 s por quadro; "🐢 Mais devagar" anda pela metade.
- ⚠️⚠️ **O limiar é UM só** (`limiarDoRelogio`: 0,04 s, ou 0,2 s com menos movimento), no player e na vez. Quem
  sabe o ritmo é o motor (`SCENE_FRAME_RATE`, com a sobra guardada no estado), então o tamanho da fatia não muda
  o mundo. Não volte a escolher limiar por cena. Única exceção, em `relogioDaCena`: a `frames` com menos
  movimento usa a fatia de UM quadro da prévia (`framesPreviewSlice`), mandada `exato`.
- ⚠️⚠️ **Na `frames` a Prévia É o relógio:** `botoesDoMundo` não oferece ▶, passo nem "Mais devagar"; a chave
  "Prévia" liga o relógio do player (`onRunning`) e diz "tocando" só com ele andando (`tocando`).
  `estadoVistoDaCena` mostra a prévia parada quando o relógio para por fora (aba, F5, vídeo, Recomeçar): faixa,
  palco, frase e bancada leem esse estado, e os comandos vão ao motor de verdade. ⚠️ Não mande `play off`
  nessas horas: derrubaria `paused-one` sem a criança ter parado nada.
- **O botão de passo** manda `sceneStepSeconds(cena)` com o nome de `sceneStepLabel(cena)`: "Avançar 1 quadro"
  onde o quadro é o assunto, "Um passo" (quadros inteiros de ~0,2 s) nas outras. ⚠️ Teste que procura o botão ou
  conta cliques usa o nome e o passo DA CENA.
- **Quem tem relógio e salto é a régua de legalidade do core** (`isSceneAction` com `advance` e `jump`), nunca
  uma lista aqui: a lista à mão deu à `stage-size` um "Um passo" que não fazia nada.
- **O ▶ para** pelo botão; por `sceneClockShouldStop(cena, antes, depois)` do core (o salto que pousa nas três
  cenas de salto, o Dino sem gravidade que passa do alto, a batida da `circle-collision`); com a aba escondida;
  quando outra mídia da aula toma o foco (`registerLessonMedia`); no conflito de gravação; no fim de uma parte
  da demonstração. ⚠️ Concluir NÃO para.
- **O que um gesto faz com o ▶** (soltar, parar ou nada) é `sceneGestureRunsClock(cena, ação, depois)` do core:
  o pulo solta, também com menos movimento (sem isso a Aula 3 deixava o Dino parado no chão); o `connect` segue
  a `sceneConnectRunsClock` (ligar um fio com o Dino no ar solta; desligar a gravidade com ele acima do topo para); o
  `start` que começa a partida da `restart` e da `score` solta. A bancada ainda solta com `onRunning(true)` o gesto
  que só se vê com o tempo passando (segurar a tecla, ligar o laço, fazer nascer, mexer no encosto, atirar,
  "Tocar na tela", "Próxima tela"). Player e vez usam só as duas réguas do core. Substituído (16/09/2026): as
  condições copiadas no player e na vez → `sceneClockShouldStop` e `sceneGestureRunsClock`, porque a cópia da vez
  não parava o ▶ com o Dino no chão.
- ⚠️⚠️ **Menos movimento não é relógio parado:** o laço anda em passos de 0,2 s e a cena continua acontecendo.
- ⭐ **Quadro em andamento:** nas cenas de quadro longo (`sceneLongFrame` do core) a faixa ganha, enquanto o ▶
  roda, uma barra de 4px na borda de baixo com a sobra do motor (`clock.carry`; `data-quadro-em-andamento`),
  porque a primeira mudança vinha mais de um segundo depois do clique. ⚠️ `aria-hidden`, sem transição e
  absoluta (não empurra o palco); o gesto a zera.

### A moldura: faixa, botões do mundo e lugar reservado

- **A faixa de estado** (`SceneReadoutBand`, `scene-frame.tsx`: os valores de `sceneReadout` do core numa `<dl>`)
  é a tira de CIMA da mesma moldura do palco (`colada`; o player tira a borda do `sz-scene-frame` de dentro).
  Ela liga o número que a criança digita no bloco do Estúdio ao desenho que muda. ⚠️⚠️ **Ela NÃO é
  `aria-hidden`:** é conteúdo estático lido pelo leitor, e quem ANUNCIA a mudança é o `role="status"` da frase
  embaixo do palco. Substituído (16/09/2026): faixa `aria-hidden` → faixa lida, porque escondida tirava de quem
  não enxerga os números que a cena existe para mostrar. 14px, separador por CSS (`after:content`), valores nas
  cores do par (`scene-a`, `scene-b-ink`, `scene-alert`, `scene-leaf`). Desde o console ela é a tira de cima
  dele e tem dois hóspedes: a `placa` do começo (hoje só o "Seu palpite") e o `valoresEscondidos`, que troca
  cada valor por "?" no momento do palpite (ver "O CONSOLE").
- **O medidor de descobertas mora NA LINHA da faixa**, perto de onde o dedo está: `role="meter"` com o nome "N de
  M descobertas", o texto "Descobertas N de M" à vista e `aria-hidden` (o medidor já diz), bolinhas sem `title`
  (o tooltip mostrava o rótulo da meta, que é a conclusão). ⚠️ No palpite ele não existe: a contagem começa
  no primeiro gesto.
- ⭐ **`botoesDoMundo` devolve uma LISTA** e a caixa pergunta `.length > 0`: um booleano à parte esconderia um
  botão acrescentado e esquecido nele, sem erro nem teste vermelho. Rótulos: "↑ Pular"; na `jump-sound`, onde o
  jeito é o assunto, "✋ Tocar para pular" e "⌨ Apertar Espaço" (o Espaço pula no `keydown` e a marca do botão
  impede o segundo pulo no `keyup`); o ▶ com nome "Soltar o tempo"/"Parar o tempo" e a palavra "Tempo" à vista
  (`aria-hidden`), `min-w-11`.
- ⭐⭐ **Nada acima da bancada entra ou sai do fluxo no meio do gesto** (`LugarReservado`): a altura só CRESCE
  (a maior já vista nesta largura; mudou a largura, recomeça) e o `molde` reserva o que ainda vai aparecer
  (desenhado invisível, medido e TIRADO na mesma passada de layout). Envolve a linha do palpite, a frase da
  situação e os avisos embaixo do palco (o selo "Descoberta N de M" e o "Você achou…"), que nascem quando o palco
  abre. ⚠️⚠️ O molde não fica no DOM: o "Você achou…" é a resposta do palpite, e escondido por CSS a busca por
  texto o acharia. ⚠️ O `ResizeObserver` olha o `div` de dentro e a altura mínima vai no de fora (sem laço).
  Custo aceito: um espaço vazio do tamanho do próximo aviso. Contrato `data-lugar-reservado`
  (`community-kids/tests/lesson-scene-moldura.test.tsx`).

### A comparação guardada

`SCENE_COMPARISONS` (core `catalog.ts`, hoje só `hitbox`) com `sceneShowsComparison(cena)` é a lista ÚNICA: o
"Guardar este jeito" (`tom="discreta"`) e o destaque `compare` da demonstração no player, e a opção "Comparação" do
destaque de etapa no admin. A comparação abre logo abaixo dos botões ("Compare: o que você guardou × agora",
`ExperienceComparison`). ⚠️ O `isSceneScript` aceita `compare` em qualquer cena (roteiro antigo abre); na cena sem
comparação o destaque não desenha nada. Substituído (16/09/2026): a lista do laboratório repetida no player → a
lista do core, porque as cópias já tinham divergido. Não confundir com o modo `comparacao` do palco, que mostra dois
lugares do MESMO mundo.

### A bancada

**O vocabulário é um só** (`scene-bench.tsx`), e é ele que mantém toque, teclado e leitor no mesmo lugar (as
cópias escritas à mão eram onde a régua se perdia):
- **`Medida`**: deslizante, valor à vista e botões −/+ de 44px. O botão DIZ o quanto anda quando anda mais que o
  deslizante ("Aumentar x em 20"). `texto` (string ou função do valor) vira `aria-valuetext` e o valor à vista:
  sem ele o leitor anuncia "altura da câmera, 2". `digitavel` troca o valor à vista por um campo que confirma no
  Enter ou ao sair, arredonda no passo e prende na faixa (digitar "480" mandaria 4 e 48). ⚠️⚠️ **O valor só vai
  ao motor quando o GESTO termina, em toda cena e sem exceção**: no `pointerup`, `pointercancel`,
  `lostpointercapture`, `keyup` ou `blur`; e na hora quando o `change` chega sem dedo nem tecla apertados (o
  ajuste do VoiceOver no iOS não dispara `keyup` nem `pointerup`, e cada ajuste já é um gesto inteiro). Arrastar
  passava por valores que derrubavam metas e revelavam o palpite ("um pouco maior" na `onion-skin`, "de frente"
  na `camera-3d`), e cada valor do caminho era um passo do Desfazer. Enquanto o gesto dura, o valor à vista
  acompanha; os −/+ mandam na hora. Substituído (16/09/2026): a prop `soltar` por chamada (e a constante
  `SOLTAR` do motor) → regra do componente, porque seis medidas tinham ficado sem ela.
- **`Chave`**: liga/desliga com o ESTADO no rótulo ("Reciclar quem saiu: ligado"), nunca a ação do clique, com
  `aria-pressed` e sem caixa própria. `seletor` é para dois VALORES ("O Dino anda: a cada quadro / a cada
  segundo"): sem `aria-pressed`, que diria "não pressionado" para um valor tão vivo quanto o outro.
- **`Escolha`**: vários valores num `fieldset`, o que vale com `aria-current` (sem `aria-pressed`, pelo mesmo
  motivo), `min-w-11` por opção, `fechado` por opção + `nota`.
- **O GESTO** (a ação que move a cena) não mora lá: é um `SceneButton tom="gesto"`.
- Contrato em `tests/scene-identity.test.ts`: nenhuma bancada escreve deslizante à mão, as peças moram num lugar
  só, e o PLAYER não escreve peça de bancada.

**`SceneButton` é o `Button` do app** (`exploration-stage.tsx`): o kids dá o relevo 3D a todo botão por um seletor
que casa `button[data-slot="button"]` com a classe da variante, e o `<button>` cru de antes era o único controle
chapado da tela. ⚠️⚠️ O tom entra por `tom` (`ferramenta` contorno, `discreta` fantasma, `ligado` secundário,
`gesto` primário), **nunca por `!bg-*` no `className`**: o `cn` é tailwind-merge, apagaria a classe da variante e
com ela o relevo. `min-h-11` é requisito do público.

**Fechado não é escondido.** O controle que só faz sentido depois de uma descoberta fica na tela, sem responder,
com o motivo escrito:
- ⚠️⚠️ **Fechado é `fechado` (`SceneButton`) ou `disabled` + `nota` (`Medida`, `Chave`, `Escolha`), nunca o
  `disabled` nativo**, que tirava o controle do Tab e calava o motivo. Fechado põe `aria-disabled`, não liga
  `onClick`/`onPointer*`, perde o relevo (tom discreto, borda tracejada) e leva a nota no `aria-describedby`; a
  `Medida` fechada ignora o `onChange`. O fio fechado tem as duas pontas assim.
- ⚠️ **A nota diz o GESTO que abre, nunca o resultado** ("Abre depois que você fizer o Dino pular e esperar", e
  não "subir sem gravidade"): o resultado é a resposta da previsão.
- ⚠️ **Uma chave nunca fica fechada LIGADA**: um caso do professor que a liga precisa poder desligá-la. Exceção
  consciente: a condição da `acceleration`, ligada no mundo de fábrica e fechada até as metas `base-limit` e
  `variation-limit` que a atividade COBRA.
- **Uma variável por vez** é régua de várias cenas (a área da `hitbox` depois da batida, largura e altura da
  `stage-size` depois da borda, o fogo 2 da `onion-skin` fora do quadro 2, o lado da `velocity` numa missão só
  vertical). Na demonstração e na vez (`more`) tudo abre.
- **Toda porta do motor tem controle na bancada**: sem ele a meta travava para sempre (os testes do core chamam
  `connect` direto, caminho que a criança não tem). Contrato derivado de `scenePorts` nas 45, que também reprova
  controle fechado fora do Tab: `describe('toda porta da cena tem controle na BANCADA')` em
  `community-kids/tests/lesson-scene-design.test.tsx`.

**A peça que muda de caixa** (`PecaQueMudaDeCaixa`, `scene-dino-controls.tsx`) é o gesto do Estúdio de MOVER um
bloco para outro evento: `jump-sound` ("♪ Tocar som"), `spawn` ("Criar cacto", com o intervalo dentro do relógio e
fechado fora dele), `game-state` (o "Se jogando" aninhado no relógio), `controls` ("▷ Começar") e `score` ("＋ Somar
ponto"). À vista desde a abertura.
- Toque sem arrasto ESCOLHE a peça (`aria-pressed`) e acende as caixas livres; o arrasto (`LIMIAR_DO_ARRASTE` de
  10px, captura do ponteiro, fantasma em portal) solta onde o dedo parou, a caixa de DENTRO primeiro; cada caixa
  sem a peça tem "Colocar aqui" (o caminho do teclado). Escape cancela; o foco segue a peça até a caixa nova.
- ⚠️ O nome acessível COMEÇA pelo texto à vista ("Colocar aqui" + ": <peça> em <caixa>" em `sr-only`, WCAG 2.5.3) e
  o símbolo do começo fica fora da fala (`separarSimbolo`).
- ⚠️⚠️ **O arrasto com MOUSE devolvia a peça**: o `click` depois do `pointerup` caía no nó que o React reaproveitou
  para o "Colocar aqui" da origem. Duas travas: `key` distintas (`peca`/`colocar`) e o `onClickCapture` do grupo
  que engole o clique logo depois de um arrasto. O happy-dom não dispara esse `click`; o teste do kids o dispara à
  mão.
- `travada` (na `MontagemTravada`) troca a ajuda por "Toque em Agora é sua vez para mexer.". Caixas são
  `role="group"` com `data-caixa`.
- Substituído (16/09/2026): o fio e a `ConditionPiece` (com `usePieceDrag`) nessas cinco cenas → a peça, porque
  eram três metáforas para o mesmo gesto e o fio nascia escondido até a primeira meta.

**O fio** (`ExperienceConnection`) ficou na `gravity` ("Gravidade → Dino") e nas `lives` (os dois fios juntos,
nenhum atrás de descoberta). Puxar até o destino, ou tocar a origem e depois o destino; a ajuda (14px, no
`aria-describedby` das duas pontas) diz os NOMES ("Puxe o fio até X. Ou toque em Y e depois em X.", "Ligado: Y →
X"). `motivo` fecha as duas pontas e vira a ajuda; o fio que fecha (depois de "Recomeçar") desmarca a origem
escolhida; o destino tem `disabled:` visível (o `fieldset` do palpite o desliga).

**A ordem de desenhar** (`layers`) é uma pilha vertical numerada, 1º em cima, como a do Estúdio, com "Descer"/"Subir"
em cada peça ("Descer Dino para o 2º lugar") e arrasto vertical; o foco segue a peça.

**Começar pelo palco leva o foco à bancada**: `focarNaBancadaDepoisDeComecar` procura, na mesma `section`, o
controle com `data-foco-depois-de-comecar` (`restart`, `score`, `game-state`, `controls`).

**Segurar** (`scene-nucleo-controls.tsx`): na `hold-vs-press` a tecla é UMA ("A tecla: solta/segurada",
`aria-pressed`). Dedo e mouse seguram no `pointerdown` e soltam no `pointerup`; o teclado segura no `keydown` de
Espaço ou Enter (sem repetição) e solta no `keyup`, e o `click` que o navegador gera junto é descartado; o `click`
sem tecla nem ponteiro (leitor de tela) ALTERNA. ⚠️⚠️ Pelo leitor, segurar NÃO solta o ▶ (a segunda ativação é o
toque rápido) e perder o foco só solta a tecla segurada pelo dedo ou pelo teclado (o NVDA leva o foco junto). A
tecla e o "Andar" da `camera` são `SEGURAVEL` (sem seleção nem menu do toque longo). Substituído (16/09/2026): dois
botões e o `e.detail === 0` que alternava → a tecla única, porque a cena ensinava duas teclas onde o jogo tem uma.

**O elenco veste a bancada** (`castText` em todo rótulo, e no helper dos fios da `ExplorationPieces`): a criança lê
a faixa e o controle na MESMA tela.

### O palco

**Um palco só** (`SceneCanvas`, `scene-canvas.tsx`): a moldura (`sz-scene-frame`), o `<svg role="img">` com
`<title>`/`<desc>` por `aria-labelledby`, o rodapé e o `overlay` (controles HTML por cima do desenho, irmãos do
`<svg>`). `interativo` faz do desenho `role="group"` quando ele recebe gesto direto; ⚠️ o caminho de teclado
continua sendo a bancada. `ExplorationStage` só DESPACHA para o palco de cada cena e é exaustivo: cena nova sem palco
é erro de tipo. Substituído (16/09/2026): o palco compartilhado (com o selo `STAGE_LABEL`) → um palco por família,
porque ele desenhava a mesma pista para cenas que precisavam ver coisas diferentes.
- ⚠️⚠️ **O enquadramento é por família, e é deliberado:** `SCENE_VIEW` (560 × 300) é o padrão e cena nova herda;
  o Corre Dino é 600 × 310, e o laboratório, as vidas, os lados da `world` e o `tilemap` têm o seu. As coordenadas
  dos desenhos estão nessas unidades: unificar é redesenhar. Quem foge do comum PASSA `view` (`scene-identity`
  cobra).
- ⚠️ **Lista de cenas como `string[]` guarda código morto em silêncio**: cena que sai de um ramo sai por guarda de
  TIPO (`ehLaboratorio`), nunca por `includes`. Foi assim que ~120 linhas mortas apareceram.

**Cromo é do APP, mundo é do JOGO.**
- ⭐⭐⭐ **Reforma de 18/09/2026 — o mundo do palco é a ARTE DO JOGO 2D.** Ela olhou uma cena ao lado do
  jogo que a criança monta e disse que a cena parecia outra coisa: o Dino era UM `<path>` de silhueta
  chapada, o cacto um contorno, e o céu um retângulo de cor. Hoje o palco chama o MESMO código de
  desenho do runtime da extensão (`@sistemazero/studio/arte`), com um pincel que grava SVG — o Dino com
  barriga, espinhos, olho e perninhas, o cacto com braços e florzinha, a floresta com sol, nuvens e
  morros. Quem desenha figura é o `ArteSvg`; quem desenha mundo é o `FundoDoCenario`.
- ⚠️⚠️ **O que esta reforma REVOGOU:** "a TERRA continua desenhada por cada palco do jeito de sempre…
  o pedido é que ele continue igual" (o fundo do Corre Dino agora vem da arte, como o do espaço) e as
  cores de figura por token (`scene-rock`, `scene-flame`… não pintam mais nada: as cores são as do jogo).
- O CROMO (moldura, faixa, bancada, frase, rodapé, conclusão) veste o app (`card`, `border`, `foreground`,
  `primary`): no kids é o Pen, no adulto o tema dele. Dentro do palco manda o JOGO.
- ⚠️⚠️ **O par sobrevive no cromo** (`scene-a` azul, `scene-b-ink` âmbar, `scene-alert`): diz QUAL medida é qual,
  no palco, na faixa e no controle.
- A regra tem uma direção (`scene-identity`): o cromo não veste a cena. O contrário não se cobra, porque palcos
  carregam cromo legítimo (a alça por cima do SVG, o campo da `screen-reader`).
- **A cena segue o tema:** céu, chão, grade e linha derivam do `--primary` por `color-mix` ⚠️ `in oklab`, nunca
  `oklch`. O par e o encosto não trocam de matiz. Contraste medido em `tests/scene-contrast.test.ts` (o par contra
  o cartão dos dois apps, lido do `globals.css` de cada um; o espaço com os `--primary` que leem a folha).

**O texto do palco.**
- ⚠️⚠️ **O rodapé só DÁ NOME ao que está desenhado, ou não existe.** Se ele explica, é da `success`, não do
  desenho. O desenho também não repete a faixa nem escreve por cima da cena.
- ⚠️⚠️ **A `<desc>` diz o estado, nunca a conta pronta**, com palavras DIFERENTES da frase embaixo do palco (senão o
  leitor ouve duas vezes e a busca dos testes acha dois elementos).
- ⚠️ **Rótulo de controle não carrega a resposta:** `coordinates` é "x"/"y"; o sentido do eixo do 3D só aparece
  DEPOIS da descoberta ("y (altura)", "z (negativo é o fundo)").
- **Número que a criança ainda não viu fica `?`** (as distâncias da `group-loop` antes de medir, a régua do
  fantasma sem o fantasma). Plural por `quantos`, decimal por `decimal`, negativo por `numero`, também dentro do
  desenho.
- Com a conta fora da faixa, da frase e do rodapé, o DESENHO é a fonte: o cubo da `camera-3d` tem lados opostos da
  mesma cor e o topo na terceira (`fill-scene-leaf`), conferido nas 24 posições contra `facesAVista`
  (`tests/scene-camera-3d.test.tsx`).

**A letra no celular.** Os palcos são SVG escalados para a coluna (~0,87 no computador, ~0,52 num celular de
390px), e um `fontSize` de 10 a 15 virava 5 a 8px justo onde mora a descoberta.
- ⚠️⚠️ **Todo texto de palco é `<Texto tamanho={N}>`, nunca `<text fontSize>`**: passa por `palco.letra(N)`, com
  piso `PISO_DA_LETRA` (12px NA TELA). `tests/scene-identity.test.ts` reprova `<text` e `fontSize=` nos palcos;
  `tests/scene-letra-celular.test.tsx` calcula a menor letra de cada `<svg>` das 45 cenas a 314 e a 524px.
- ⭐⭐ **O `SceneCanvas` MEDE a moldura** (`useLarguraMedida`: `ResizeObserver` + medida síncrona no
  `useLayoutEffect`) e entrega um `Palco` `{largura, escala, view, letra, estreito, larguraDoTexto}` pela função
  `children={(palco) => …}` (`desenho: (palco) => …` na comparação) ou por `usePalco()`. Antes de medir vale
  `LarguraConhecidaDaCena` (galeria, testes, um palco que parte a própria área e a declara em `data-parte-da-cena`)
  e, sem ela, `LARGURA_NOMINAL_DA_CENA` (a coluna de 600px: sem medida a cena sai como sempre).
- ⚠️⚠️ **O que muda no estreito é decidido por `palco.estreito`** (escala abaixo de `ESCALA_ESTREITA` no
  enquadramento de fábrica: todo palco num celular, nenhum na coluna do computador), nunca pela estimativa
  `larguraDoTexto`, que é folgada (serve para CABER) e mudava o desenho do computador.
- **Para o texto maior caber, nesta ordem:** menos rótulos; levar para fora do desenho com `legenda` (HTML logo
  abaixo do `<svg>`, dentro da moldura); recortar com `viewEstreito` (`{x?, y?, w, h}`; as coordenadas não mudam)
  ou com `viewEmpilhado` num lado da comparação. ⚠️⚠️ A legenda que cresce RESERVA a altura final (`min-h-*`):
  HTML não empurra a bancada no meio do gesto.
- ⚠️⚠️ **Lado a lado pela largura MEDIDA, nunca pelo `sm:`** (que olha a JANELA): a comparação só fica lado a lado
  quando nenhum lado fica estreito (`ladosCabemLadoALado`), a `screen-reader` só abre duas colunas a partir de
  500px de palco, a `ExperienceComparison` empilha abaixo da escala estreita e `empilhar` força um embaixo do outro
  (os dois lados deitados da `pick-ray`). Substituído (16/09/2026): "lado a lado só a partir de `sm`" → a largura
  medida, porque num computador com a cena numa coluna estreita os dois lados caíam para metade.
- ⚠️ **Sem `container-type` nem `@container`**: contenção na aula já prendeu o "Expandir" do Estúdio e, no Chromium,
  colapsou a grade da bancada para largura zero no primeiro gesto que trocou um rótulo (por isso as três `Medida`s
  do motor ficam no máximo duas lado a lado, `TresMedidas`).
- O que encosta ou corta só se mede com layout, no navegador. Contratos: `data-largura-do-palco` na moldura,
  `data-largura-do-desenho` e `data-escala-do-desenho` em cada `<svg>` (⚠️ não `data-escala`, que a `axis-z` usa
  no cubo).

**O modo `comparacao`**: dois desenhos nomeados na mesma moldura, com os títulos nas cores do par e a divisória na
régua da CENA (`scene-rule`; a linha do Pen sumiria no papel). Usam: `world` (bastidores | tela do jogo),
`cleanup` e `pick-ray` (o que você vê | de lado). ⚠️⚠️ **Quando usar:** os dois estados COEXISTEM no mundo → lado a
lado; a criança ALTERNA entre dois estados (`layers`, `fill-stroke`) → um estado só, porque o gesto é a descoberta e
mostrar os dois tira o experimento. A maioria das cenas de contraste já compara dentro do próprio desenho
(`hold-vs-press`, `delta-time`, `pixel-vector`, `sheet-vs-sprite`, `tilemap`).

**O elenco e as figuras** (`scene-figures.tsx`).
- ⭐⭐ **O elenco troca o DESENHO, não só os nomes**: `ActorFigure({ figure, x, y, ghost, escala, escuro, t })`
  com `figure = actorFigure(cast, papel)` do core é a ÚNICA porta. ⚠️ O `t` é o relógio da CENA, nunca
  `Date.now()`: parado, o desenho é sempre o mesmo quadro (é o que mantém o `renderToStaticMarkup` dos
  testes estável e o palco quieto enquanto a criança lê a pergunta); andando, o Dino corre e a chama pulsa.
- ⭐⭐ **O relógio da arte é CONTEXTO, e quem MEXE a cena é quem o provê** (`RelogioDaArte` em
  `scene-arte.tsx`, no molde do `zappy-fala-context`): o player (`scene-activity.tsx`) e a vez
  (`scene-sandbox.tsx`) somam `elapsed * 1000` dentro do `onTick` e embrulham o `ExplorationStage` no
  `RelogioDaArteProvider`. Sem provider o valor é `0`, ou seja a arte fica PARADA — que é o certo na galeria,
  na prévia do admin e nas 45 varreduras. ⚠️⚠️ O `t` passado à mão VENCE o contexto, e por isso o `ActorFigure`
  **não tem default** para ele: com `t = 0` no parâmetro o contexto nunca chegava e a animação inteira ficava
  desligada com a suíte verde (achado do full review). O contrato é cobrado em `tests/scene-arte.test.tsx`, que
  lê a FONTE dos dois donos: o provider em volta do palco **e** o `setTempoDaArte` no tique — um provider
  esquecido que entrega zero para sempre passa em qualquer teste de comportamento.
- ⭐⭐ **O FUNDO é o `FundoDoCenario`, e ele é a camada de BAIXO.** As marcas que a cena ENSINA (a grade e
  as réguas da `coordinates`, os pontinhos da pista, a régua de altura do laboratório, o alvo tracejado da
  `stage-size`) continuam desenhadas POR CIMA, pelo palco. Onde o fundo cheio competiria com a marca, o
  palco pede `detalhe="calmo"` (menos nuvens, sem cintilar, sem janela acesa) e passa `semDetalhe` com as
  zonas onde ele escreve número — uma estrelinha colada num placar vira ponto final. ⚠️ O fundo é
  RECORTADO na própria área: os morros são mais largos que a tela de propósito, e num palco que desenha a
  tela do jogo dentro de um quadro menor eles vazavam para fora da moldura.
- ⚠️ `data-fundo` leva hoje o CENÁRIO (`corre-dino`, `nave`, `gorilas`, `meu-jeito`), não mais `"espaco"`:
  TODO cenário tem mundo desenhado, e o que a varredura cobra é que seja o mundo CERTO. O Dino, o cacto e a árvore não são exportados: um
  palco que chamasse o Dino direto mentiria para uma turma de nave. Toda figura leva `data-figure` e usa o
  enquadramento do Dino (`(x, y)` = o chão sob ela, ~60 × 60 subindo; a floresta é uma árvore de 138). O corpo do
  Dino e da nave é `currentColor` (quem pinta é o palco). `ArvoreDoMundo` é paisagem, sem `data-figure`;
  `CENARIO_UNICO` põe UMA figura de cenário na `layers` que não é floresta. Substituído (16/09/2026): "o elenco troca
  os NOMES, nunca o desenho" → troca o desenho, porque a criança do Desafio lia "nave" sobre um dinossauro na grama.
- **O CENÁRIO:** o palco passa `mundo={sceneCenario(cast, cena, activity.cenario)}` (o core lê o `cenario`
  DECLARADO no manifesto e, sem ele, deriva dos papéis de `SCENE_ROLES` daquela cena) e o `SceneCanvas` põe
  `data-mundo` na MOLDURA, mais `sz-scene-espaco` quando **`cenarioEscuro(mundo)`**; `styles/scene.css` redeclara
  a paleta inteira ali (CSS comum, fora do `@theme`: o Tailwind só emite variável que alguma utilitária usa).
  ⚠️⚠️ A régua do cromo escuro é `cenarioEscuro`, **nunca `!cenarioTemChao`**: os gorilas têm chão E céu
  noturno, então as duas perguntas se separaram quando o registro passou de dois mundos para quatro cenários.
  ⚠️ Só o palco que desenha um PAPEL passa `mundo`; os abstratos (espelho, lupa, mapa de letras, 3D, ateliê)
  ficam no papel de sempre.
- **A linha do chão só fica onde ela MEDE alguma coisa** (hoje o laboratório e a `jump-sound`, os únicos que
  passam `chao` ao `FundoDoCenario`); nos outros as figuras flutuam por `pisoDoMundo(mundo, chao)`, que sobe
  `FLUTUA_NO_ESPACO` no cenário sem chão e devolve o MESMO número onde há chão (o Corre Dino não muda um pixel).
  ⚠️ A pergunta é `cenarioTemChao(mundo)`, não "é o espaço". ⚠️ Tudo que se apoia no chão sobe junto, senão a
  cena desmonta. Substituído (18/09/2026): o `FundoEspaco`, que desenhava só o céu estrelado — hoje TODO
  cenário tem mundo desenhado, e quem o desenha é o `FundoDoCenario`.
- ⚠️⚠️ **As cores das figuras são as do JOGO, não tokens da cena.** Os tokens de figura (`scene-rock`,
  `scene-flame*`, `scene-fin`, `scene-window`…) seguem em `scene.css` para o que o PALCO desenha em volta
  (pista, pedra de apoio, janela de prédio) e não pintam mais nenhuma figura de elenco. O céu nunca é sorteado
  ao vivo: `sorteioComSemente` torna cada estrela, nuvem e morro função de `(semente, área, deslocamento)`,
  então o mesmo palco sai igual no servidor e a cada gesto (`Math.random` piscaria o céu). As estrelas somem
  atrás de placar (`semDetalhe`); `.sz-scene-espaco svg .text-primary` clareia o personagem só DENTRO do
  desenho.
- ⭐⭐ **O halo do texto vale em TODA cena** (`.sz-scene-frame svg text`: `paint-order: stroke fill`, 3px na cor
  do papel). Nasceu no espaço para apagar a estrelinha que caía como ponto final em "restam.", e subiu para
  todos os palcos quando o mundo virou a arte do jogo: o Corre Dino era um retângulo de cor derivada do tema,
  com contraste garantido por construção, e hoje é céu degradê com sol, nuvem e morro. ⚠️ 3px, medido: o halo
  também engorda a letra sobre fundo CHAPADO (a faixa da `entity-state`, a pílula da `hitbox`) e com 4 ou 5px
  virava uma borda escura visível; o detalhe a dois ou três pixels da letra ele não alcança, e onde isso cai
  num placar quem resolve é o `semDetalhe`. Medido em `tests/scene-contrast.test.ts`, que pinta o fundo de cada
  cenário com um pincel que soma ÁREA por cor e cobra 4,5:1 entre a tinta e o halo — com o anti-vácuo que
  prova que sem halo o par reprova.
- **O elenco no texto:** o `SceneCanvas` aplica `castText` no título e na descrição; texto DENTRO do desenho
  precisa de `castText` à mão. Título e instrução são do PROFESSOR e não se vestem. ⚠️ Texto novo precisa
  sobreviver à troca: a régua só flexiona o que está colado ao nome ("o Dino continua guardado" viraria "a nave
  continua guardado"). ⚠️⚠️ A varredura `describe('o elenco veste a cena INTEIRA…')` de
  `community-kids/tests/lesson-scene-design.test.tsx` passa pelas 45 cenas (nunca por lista curada) e olha o texto
  visível, os `aria-label` e o `<title>`/`<desc>`. "dinossauro" não é termo do elenco (a régua casa "Dino").
  Figuras por cena: `tests/scene-figures.test.tsx`, que compara a descoberta pelo elenco com `SCENE_ROLES`.

**O 3D é DESENHADO em SVG, não renderizado** (`scene-3d.tsx`): uma biblioteca 3D no player custaria o peso dela em
toda cena. É geometria de verdade, a mesma régua nos quatro palcos (`projetorPerspectiva`, `girar` e
`naTelaSemPerspectiva`, `cuboComPerspectiva` e `cuboGirado` com as faces viradas para quem olha, `caminhoDe`,
`TomDaFace`, `SombraNoChao`, `COR_DO_EIXO`), nas convenções do Jogo 3D do Estúdio: y para CIMA, z negativo é o
FUNDO, eixos x vermelho, y verde e z azul. Substituído (16/09/2026): a projeção isométrica à mão de cada palco → a
régua com perspectiva, porque cada palco inventava a própria ilusão e as quatro mentiam do mesmo jeito.
- ⚠️ Nenhum controle do 3D é arrasto livre: "a câmera decide o que se vê" pede voltas contáveis, que o teclado
  alcança.
- ⚠️⚠️ A ordem de desenho é a da PROFUNDIDADE: na `axis-z`, com o cubo no fundo os eixos passam na frente dele; na
  `pick-ray` a reta para na primeira caixa (`PICK_BOXES` vêm do motor), a vista de lado mostra só as caixas que a
  linha cruza e nada da reta depois da parada, e há atalhos de mira para quem não acha o alinhamento no deslizante.
  A sombra fica sempre no chão. Na `mesh` a mancha da pele é um triangulinho (bolinha leria como ponto).

### Cena → palco e bancada

| Cenas | Palco | Bancada |
|---|---|---|
| `coordinates`, `stage-size`, `draw-loop`, `screen-reader` | `scene-stages.tsx` | `LessonSceneControls` |
| `world` | `scene-world-stage.tsx` | `ExplorationPieces` |
| `gravity`, `impulse`, `hitbox` | `experience-scene.tsx` (`ExperienceScene`, o laboratório) | `DinoSceneControls`; a `hitbox` em `DinoNumbersControls` |
| `layers`, `jump-sound`, `spawn`, `cleanup`, `game-state`, `controls` | `scene-dino-stages.tsx` | `DinoSceneControls` (`scene-dino-controls.tsx`) |
| `restart`, `score`, `random`, `acceleration` | `scene-dino-numbers-stages.tsx` | `DinoNumbersControls` (`scene-dino-numbers-controls.tsx`); a peça da `score` em `DinoSceneControls` |
| `lives` | `scene-art-stages.tsx` | `DinoNumbersControls` + os dois fios da `ExplorationPieces` |
| `velocity`, `variable` | `scene-core-stages.tsx` | `CoreSceneControls` (`scene-core-controls.tsx`) |
| `hold-vs-press`, `group-loop`, `enemy-type`, `camera`, `contact`, `cooldown`, `aim`, `diagonal` | `scene-nucleo-stages.tsx` | `NucleoSceneControls` (`scene-nucleo-controls.tsx`) |
| `tilemap` | `scene-nucleo-stages.tsx` | sem bancada: as letras do texto são os controles |
| `pool`, `entity-state`, `delta-time`, `circle-collision` | `scene-motor-stages.tsx` | `MotorSceneControls` (`scene-motor-controls.tsx`) |
| `axis-z`, `camera-3d`, `mesh`, `pick-ray` | `scene-3d-stages.tsx` | `MotorSceneControls` |
| `frames`, `onion-skin`, `symmetry`, `pixel-vector`, `sheet-vs-sprite`, `fill-stroke`, `shading` | `scene-atelie-stages.tsx` | `AtelieSceneControls` (`scene-atelie-controls.tsx`) |

`LessonSceneControls` monta todas as bancadas (cada uma devolve `null` fora das suas cenas) e `ExplorationPieces`
monta fios e peças (a `DinoSceneControls` vai por ela, para o player, a vez e a `MontagemTravada` a alcançarem igual).
Recebem gesto DIRETO no desenho (na demonstração o despacho ou o `fieldset` do palco o desliga): o laboratório,
`jump-sound`, `game-state`, `controls`, `restart`, `score`, `screen-reader`, `symmetry`, `aim` e `tilemap`.
Testes por família em `tests/` (`scene-dino-numbers`, `scene-nucleo`, `consertos-onda-b-nucleo`, `scene-motor-3d`,
`scene-atelie`, `consertos-onda-a`) e, no kids, `lesson-scene-design`, `lesson-experimentation`,
`lesson-scene-nucleo` e `lesson-scene-motor-3d`.

**Armadilhas por cena** (o motor de cada uma está no CLAUDE.md do core):
- `coordinates`: escala e máximo das `Medida`s vêm da tela DO CASO (`state.place`), com passo 40 na tela de 800 e
  20 na de 480; o endereço é a marca no CANTO DE CIMA da caixa do sprite e o "0, 0" fica na margem.
- `stage-size`: escala FIXA sobre 800 × 480 (diminuir os números não pode crescer o desenho); a borda vem PRIMEIRO e
  largura e altura (`digitavel`) ficam fechadas até ela; o alvo tracejado de 480 × 270 só com a borda à vista, e o
  quanto falta mora na frase. Sem atalho "Usar 480 por 270": fazia pela criança a ligação número × formato.
- `screen-reader`: FALA quando `description.listens` sobe (nunca na montagem, no desfazer nem ao reabrir); a chave
  "Voz" só existe com `temVoz`, e sem voz o painel avisa que a leitura fica escrita; o campo da descrição nasce
  fechado (`readOnly` + `aria-disabled`, motivo no `placeholder`, a primeira tecla vira aviso falado) até a tela
  vazia ser ouvida.
- `world`: criar e desenhar são dois controles independentes, lado a lado desde a abertura; depois de criar o botão
  FICA focável ("✓ O Dino foi criado", `fechado`), senão o foco caía no `body`.
- `draw-loop`: a `Escolha` "Desenhar o Dino: Só no começo / A cada quadro" (os dois valores são vivos) + a chave
  "Limpar a tela antes"; o palco desenha `state.render.drawn` e fica vazio quando limpa sem desenhar.
- `layers` e `jump-sound`: a meta exige a montagem ASSENTADA (ver o latch, a assinatura do envio e `aguardaCena`).
- `gravity`: o ▶ para quando o Dino sem gravidade passa do alto, e ligar a gravidade com ele no ar solta de novo (o
  pedido da cena é "ligue e espere").
- `restart`: fora do JOGANDO e fora da demonstração o palco inteiro é o botão "Tocar na tela do jogo"; o da bancada
  fica fechado JOGANDO, com a nota.
- `frames`: a Prévia é o relógio (ver "O relógio"); "Quadro na prévia" fecha com a prévia tocando, e no motor a
  troca de quadro na mão só conta como descoberta com a prévia PARADA (tocando, quem trocou foi o relógio).
- `onion-skin`: o fantasma é o contorno tracejado do fogo 1 POR CIMA do fogo 2 (o fogo 2 é sempre maior e cobria um
  fantasma desenhado embaixo); as pontas "fogo 1"/"fogo 2" só com o fantasma.
- `symmetry`: duas `Chave`s ("Espelho lado a lado"; "Espelho de cima e de baixo", fechada até `two-sides`). ⚠️⚠️ A
  grade só é papel de desenho com casa de DEDO (`useCasaDeDedo`, `CASA_PARA_O_DEDO` medido no navegador): aí o dedo
  arrasta e pinta (`touch-action: none`); menor, o toque não pinta e a página rola. Mouse e caneta pintam sempre;
  sem medida (happy-dom), não.
- `pixel-vector`: as duas pedras numa lupa só (`rasterizarPedra` é a curva da de vetor rasterizada); a grade fina POR
  CIMA a partir de `LUPA.grade` e os pontos da Caneta a partir de `LUPA.pontos` (core `atelie.ts`).
- `sheet-vs-sprite`: a folha nunca muda de tamanho; um `<svg>` aninhado ESTICA o recorte no quadrado do jogo.
- ⚠️ Os sete do ateliê não desenham papel do elenco: a nave é o desenho da criança no Pinta.
- `aim`: ⚠️⚠️ a alça do alvo é HTML no `overlay` (`data-alca-do-alvo`, 52px, `touch-action: none`), numa caixa com a
  proporção do desenho: o Chromium só respeita `touch-action` na caixa CSS, e no `<g>` do SVG o dedo era cancelado no
  primeiro movimento. Um toque parado (até 4px) não leva o alvo.
- `tilemap`: ⚠️⚠️ a caixa da rolagem é `w-0 min-w-full`: o palco mora num `<fieldset>` do player, que cresce até o
  conteúdo mais largo, e a cena passava da moldura no celular, cortada e sem rolagem. As letras são
  `grid`/`row`/`gridcell` com setas, Home/End e uma só no Tab.
- `group-loop`: a geometria cabe no quadro com o vaivém inteiro (`tests/scene-nucleo.test.tsx` varre 60 s).
- `velocity`: numa missão que só cobra subir e descer (`goals`), "velocidade para o lado" fecha com "Hoje só para
  cima e para baixo."
- `mesh`: `Escolha` "A pele" (`MESH_SKIN_LABELS`: inteira, transparente, sem pele), porque "Ver os pontos: nada,
  metade, tudo" respondia a previsão.
- `pool`: "Reciclar quem saiu" fechada até 3 cactos passarem (ligada antes, confirmava o palpite ingênuo);
  `delta-time`: a nota "Trocar recomeça a corrida." vem ANTES do gesto.
- `random` e `acceleration`: sem ▶ (o relógio delas é o gesto); o sorteio é do navegador (`Math.random()` viaja no
  gesto e o servidor refaz o mesmo mundo).

### Onde a cena mora na aula (`lesson-sections.tsx`, `lib/lesson-split.ts`)

- **A cena vai para a coluna da DIREITA** junto do Estúdio e do Pinta (`ehCenaDeSecao` olha a ATIVIDADE: pergunta
  curta e experiência em HTML também são `interactive` e ficam à esquerda, de ler e responder). A leitura é
  tolerante (`sceneActivityForReading`): cena que cita meta que saiu do catálogo continua sendo cena.
- ⚠️⚠️ **Dividir exige conteúdo dos DOIS lados** (`podeDividir`): a seção cujo único bloco é a cena ocupa a largura
  toda. A visibilidade do painel da direita é `toolIds.length > 0`, nunca `podeDividir` (não dividir não pode virar
  sumiço). As abas "Ver exemplo"/"Criar" só com EDITOR (`temEditor`).
- ⚠️ **Empilhado, a bancada cai para o FIM da seção**: trocar a cena de painel pela largura a remontaria na abertura
  de toda aula larga (a medição começa em zero). Os templates já pedem a cena como último bloco.
- ⚠️⚠️ **O editor fica montado entre seções; a cena, não** (`editores` é da AULA, `cenasAtivas` da SEÇÃO): cada cena
  tem controlador, rascunho no IndexedDB e batida de 1 s, e mantê-las vivas custaria isso pela aula inteira.
- ⚠️ **O bloco não desenha cartão**: quem desenha é o app, pelo gancho `sz-lesson-scene` (invariante 8), com o teto
  `max-w-scene`.
- ⚠️⚠️ **A PRÉVIA de autoria monta o bloco pela PROJEÇÃO PÚBLICA** (`publicInteractiveBlock`), com o rascunho em
  `previewContent` (que liga o avaliador local): a previsão e a pergunta chegam pelos resolvedores do core, e
  desenhando o rascunho a prévia não as mostrava e ficava intransponível. Pelo mesmo motivo os testes de render
  montam por `publicInteractiveBlock` (`community-kids/tests/lesson-scene-design.test.tsx`), e não pelo rascunho.
- ⭐ O bloco de ENTREGA por galeria colocado numa seção sumia (o painel filtrava por kind e a lista da ferramenta
  descartava a galeria): a classificação é por PAPEL (`community-kids/tests/lesson-sections.test.tsx`).
- Os números da divisória (pisos, limiar, padrão) e o `autoSaveId` versionado estão na seção seguinte.

## A divisória e a barra do topo da aula (09/2026)

⚠️⚠️ **A divisória tinha 24 x ZERO pixels e ninguém via.** O `PanelGroup` é `items-start` e o
handle não tinha altura PRÓPRIA (o traço dentro dele é `absolute inset-y-0`), então ele media o
conteúdo no eixo cruzado e dava zero — medido no navegador: `24x0` antes, `24x900` com
**`self-stretch`**. A lib acha a zona de arrasto por `getBoundingClientRect()` + `hitAreaMargins`,
então o que sobrava era uma tira no ALTO da coluna, invisível. Era por isso que a dona dizia que
"não tem mais o resize". Quem mexer nas classes do handle precisa preservar o `self-stretch`.
- O handle leva `aria-label` (a lib põe `aria-controls`/`aria-valuenow`, mas nenhum NOME) e
  `tabIndex={arrastavel ? 0 : -1}` (desabilitada, a lib mantém 0 e sobraria um foco morto).
- ⚠️ **`autoSaveId` é VERSIONADO** (`sz:lesson-split:v4:<viewer>`): a lib guarda o layout por
  (autoSaveId, ids dos Panel) e o guardado VENCE o `defaultSize` — e ele é gravado na MONTAGEM,
  sem ninguém arrastar. Mudou o padrão dos painéis? SUBA a versão, senão o valor novo é letra
  morta para quem já abriu uma aula. Os painéis nascem **50/50** desde a `v4` (13/09/2026; eram
  30/70, e a seção com vídeo abria com o vídeo espremido).
- **`onSectionChange?: ({index, total}) => void`** (opcional) avisa a posição no percurso na
  montagem e a cada troca de seção. É como o kids desenha a barra do topo, que mora FORA do
  `LessonSections`. ⚠️ O callback vive num REF: com ele nas deps do efeito, uma função inline do
  consumidor viraria laço de render. O adulto e a prévia do admin não passam a prop.

⭐⭐ **O que a divisória deixa a criança fazer é `lib/lesson-split.ts` (puro, testado), e o número
que importa é o CURSO DE ARRASTO** — não os pisos. Com a régua anterior (piso de **640px** para a
ferramenta) o teto do vídeo era `coluna − 640`: numa coluna de 1108px ele andava **104px**, e a
dona relatou "tento aumentar a área do vídeo e não consigo… só escondendo os menus, e bem
limitado". Os números de hoje:
- `CONTENT_MIN_WIDTH_PX` **320** e `TOOL_MIN_WIDTH_PX` **380** são os pisos do ARRASTO.
  ⚠️ Os 380 NÃO são requisito do editor: o `@sistemazero/studio` vira abas por dentro abaixo de
  1024px de largura PRÓPRIA (`STUDIO_NARROW_MAX_PX`), ou seja ele **já abria em abas** com os 640.
  O número era editorial. Quem quer o editor grande usa o "Expandir".
- ⚠️⚠️ `SPLIT_COMFORT_WIDTH_PX` **1080** é o limiar que LIGA o lado a lado, e é DELIBERADAMENTE
  maior que a soma dos pisos (744). Enquanto o limiar era a própria soma, uma coluna de 1010px
  mostrava a alça com curso ~zero — o que lê como "às vezes funciona, às vezes não". Abaixo do
  conforto a aula empilha e oferece "Ver exemplo"/"Criar", que é a resposta honesta.
- ⚠️ `SPLIT_DEFAULT_SIZE` **50** mora na régua, e não no componente, porque ele e os pisos são um
  PAR: padrão fora de `[piso, 100 − piso do outro]` é clampado pela lib em silêncio e a aula nasce
  num layout que ninguém escolheu. O antigo 30 já era isso — em 1080px ele ficava ABAIXO do piso do
  conteúdo (30,9%), ou seja o "30/70" era mentira ali.
- O teste (`tests/lesson-split.test.ts`) cobra o CURSO nas três colunas reais do kids (1108, 1260,
  1376) e **reprova com os números antigos** — é o que impede o piso de voltar a subir sem ninguém
  medir o que a criança sente. Ele também trava que o adulto (coluna presa em 792px pelo
  `max-w-6xl` do layout dele) segue empilhado: baixar os pisos não podia ligá-lo por acidente.
- ⚠️⚠️ **O teste deriva os pixels do RESULTADO da régua, nunca das constantes.** A 1ª versão dele
  recalculava o curso a partir de `CONTENT_MIN_WIDTH_PX`/`TOOL_MIN_WIDTH_PX` e passaria inteira com
  a `resolveLessonSplit` devolvendo lixo — testava aritmética, não a função. Pelo mesmo motivo o
  piso de leitura é cobrado como **literal** (300px): comparar com a constante é tautológico, e
  zerá-la mantinha os 35 casos verdes. Validado por mutação: piso 640, padrão 30, piso do conteúdo
  0, fórmula sobre a coluna em vez da sobra, e limiar igual à soma dos pisos — as cinco reprovam.
- Contas de bolso do kids: coluna = `viewport − 660` (menu + lista de aulas abertos), `− 332` (sem
  a lista), `− 392` (sem o menu), `− 64` (sem os dois).

**Ranking geral (full review 06/09/2026):** o BFF valida `limit`, encaminha `cursor` sem
interpretá-lo e espelha `nextCursor` no contrato compartilhado. A primeira página server-side não
envia cursor; as seguintes usam o token opaco do members. O offset permanece apenas no ranking
administrativo.

## Comandos

`bun run typecheck` · `bun test` · `bun run check[:fix]`.
⚠️ A suíte precisa da env de teste (JWT/OpenRouter/gateway/HMAC) e o preload vive no
**`bunfig.toml`** (`[test] preload = ["./tests/setup-env.ts"]`), não só no script — antes só o
`bun run test` funcionava e o `bun test` cru quebrava 10 testes com "Env inválida" / "OpenRouter não
configurado", que lê como suíte podre em vez de comando errado. Os dois comandos valem agora.
Os railway.json do community (e do kids) têm `/packages/member-shell/**` nos watchPatterns e o
ci.yml mapeia `packages/member-shell/*` → deploy dos apps consumidores — mudou aqui, redeploya lá.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` AQUI **e nos apps consumidores** (community; kids quando existir) + `check` limpos.
- [ ] `bun run build:community` passa (e `build:kids` quando existir).
- [ ] Mudou contrato (factory/handler/componente)? Atualizou este CLAUDE.md e o(s) do(s) app(s).

## Zappy do Studio (08/2026)

- `createShell` publica os handlers BFF `/api/studio/zappy` (histórico/exclusão),
  `/messages` e `/feedback`; o adapter de UI vive em `lib/studio-zappy-adapter.ts`.
- Cada pergunta revalida sessão, posse do Estúdio, carreira/modo/extensões e cursos liberados;
  impersonação não conversa. Reserva idempotente precede a resposta determinística; somente chamadas
  reais ao modelo consomem o crédito `studio-zappy`.
- **Rollout por MÉRITO (08/2026 — substituiu o piloto fechado):** `ZAPPY_ENABLED=true` +
  carreira **≥ `hacker`** (Inventor(a), o 3º degrau). A equipe ignora o interruptor e o nível
  para QA. Não existe allowlist de contas nem degrau configurável: a barra vive em
  **`AI_APPS_MIN_LEVEL`**, compartilhada com o Pensa — os dois CHAMAM a IA, e o custo por uso é o
  motivo de adiar. ⚠️ **O Pinta NÃO usa mais essa barra** (14/08): desenhar não custa por uso,
  então ele abre junto com o Estúdio livre em `FREE_CREATION_MIN_LEVEL` (`coder`/Construtor(a)),
  via `meetsFreeCreationLevel`. `isStudioZappyAllowed` decide quando
  o rank já foi carregado; `isStudioZappyAllowedForRequest` consulta o members nos handlers.
  Slug ausente/desconhecido reprova (fail-closed via `careerLevelAtLeast` do core). A rota da
  pergunta reutiliza a gamificação que já precisa para montar o tier, sem uma segunda consulta.
  O mesmo gate server-side decide se o host injeta a UI. O nome real não vai ao
  OpenRouter e o contexto do projeto não é persistido.
- Catálogo, manuais, código e base didática são ranqueados por relevância e o prompt total fica em
  até 48 kB. Referências de aula incluem `courseSlug` autoritativo para o host montar a navegação.
- A resposta do modelo passa por `invalidStudioZappyAnswerReason` (zappy-ai), que loga o MOTIVO do
  descarte (`[studio-zappy] resposta do modelo reprovada` — antes era mudo e indiagnosticável em
  staging). O prompt amarra TODO bloco citado no texto a um item de `blockReferences` (validado
  contra o catálogo) e proíbe citar bloco inexistente ("esse bloco ainda não existe" é a saída
  educada); `unknownBlockNamesInText` loga `[studio-zappy] bloco citado no texto fora do catálogo`
  (telemetria, não reprova) — caso real: o Zappy sugeriu "Adicionar sprite ao grupo", que não
  existe no Jogo 2D (08/2026). No modo Blocos, crase inline citando nome de bloco/categoria é DESEMBRULHADA antes da
  checagem de código — a regra do prompt pede a trilha categoria/subcategoria em texto corrido, e
  nome citado não é código (a etapa validada já removia as crases do texto exibido); cerca de
  código e código real seguem reprovados, e PII/URL/referências fora do catálogo (anti prompt
  injection) ficam intactas. Foi o bug do "Não consegui validar essa explicação" em toda resposta
  (08/2026).

### Lote "Zappy mais inteligente" (08/2026) — entender a pergunta, os exemplos e o projeto

Diagnóstico MEDIDO (rodando o montador de prompt real, não por leitura): a busca era substring
crua sem fronteira de palavra — "como faço **ele** pular?" punha `sz_html_image` em 1º ("ele" ⊂
"elemento") — e o bônus de +10.000 para bloco já presente no projeto expulsava das vagas
justamente o bloco NOVO que resolveria a dúvida. Some a isso: zero memória de conversa, um regex
que sequestrava perguntas legítimas para o Pinta, e uma validação que descartava a resposta
INTEIRA por uma referência ruim. Daí a "resposta genérica" que a usuária relatou.

- **`server/zappy-search.ts` (NOVO, PURO — a peça central):** `tokenizeSearchable` normaliza (NFD,
  minúsculas) e quebra também em `_ : -` (`sz_g2d_jump_on_ground` → `jump`, `ground`);
  `scoreTokens(termGroups, tokens)` casa por token exato **ou prefixo comum ≥ 4 chars** (cobre
  pular/pulando, mata "ele"⊂"elemento"); `KID_SYNONYM_GROUPS` (24 grupos à mão: pular/salto/jump,
  colisão/encostar/bater, vida/hp/morrer, ponto/placar/score, atirar/tiro/bala, fase/nível/cena…)
  expande cada termo; stop-words no linguajar de criança (quero, preciso, ele, ela, isso, agora…).
  ⚠️ `jogo`/`bloco` NÃO são stop-words — o peso de categoria é que caiu.
- **`rankCatalog` reescrito** (`zappy-ai.ts`): `textScore = 120·label + 80·type + 40·tooltip +
  15·categoria`; `score = (selecionado ? 100_000 : 0) + textScore·100 + (presente no projeto ?
  250 : 0) + (core ? 1 : 0)`. O bônus de presença caiu 10.000 → **250** (abaixo de 1 acerto de
  rótulo): o Zappy volta a ENSINAR bloco novo, e sem match textual a presença ainda ordena (bom
  para "meu jogo não funciona"). O mesmo `scoreTokens` alimenta manuais e blocos.
- **Memória de conversa (3 pares, ZERO roundtrip extra):** o `reserveQuestion` do members já
  gravava a pergunta — passou a devolver `recentMessages` no MESMO SELECT. O `projectData` ganha
  `conversaRecente` (280 chars/turno, PII já redigida na gravação) e o prompt avisa que a pergunta
  pode ser continuação ("ele", "esse bloco", "e agora?").
- **Não sequestrar:** o ramo `asksForAssetCreation` do `deterministicZappyReply` foi REMOVIDO —
  "como criar um sprite?" ia para o Pinta sem nunca chegar ao modelo. Só pedido EXPLÍCITO da
  ferramenta redireciona (`abra/usar o/no pinta`). Escadas Pensa/jogo-inteiro/off-topic ficam.
- **Não descartar:** `invalidStudioZappyAnswerReason` monta o `byType` do catálogo permitido
  COMPLETO (era o TRUNCADO — referência boa reprovava); `block-reference`/`lesson-reference`
  saíram do descarte-total e agora são **filtradas** (a explicação sobrevive); `code-in-blocks`
  não reprova mais por `class`/`return` em texto corrido nem por UMA tag sem atributo (`<img>`
  citado explicando o bloco de imagem). Sobraram 3 motivos de reprovação.
- **Retry com motivo** (`answerPreparedStudioZappy`): 1ª chamada `maxTokens 2000`/`maxAttempts 2`;
  reprovou E o relógio permite (<~50s do início) → UMA chamada de reparo com o motivo em PT
  (`REJECTION_HINTS`); reprovou de novo → fallback gentil com **`outcome:'rejected'`** e
  `response.rejection = <motivo>` (jsonb, SEM migration). Teto duro de 3 chamadas por pergunta.
- **Receitas internas dos exemplos, por NÍVEL** (`relevantExampleRecipes`): o Zappy consulta o
  índice server-safe `@sistemazero/studio/server-examples` (148 exemplos) filtrado por
  `requires ⊆ tier.allowedExtensions` **+ regra dos ≥80% de blocos permitidos**. ⚠️ **A injeção é
  ANÔNIMA por decisão de produto (a usuária foi explícita): a criança NÃO sabe que os exemplos
  existem e NÃO pode saber.** O payload nem leva `name`/`key` (o modelo não vaza o que não vê) —
  só `{mecanicas, comoFunciona, blocos}` — e o prompt proíbe as palavras "exemplo", "jogo pronto",
  "galeria" e "receita". Serve para o Zappy SABER montar a mecânica e descrever o passo a passo
  como conhecimento próprio. Nada muda na galeria/`showExamples` (segue admin-only).
- **Entender o projeto aberto** (`server/zappy-project-outline.ts`, NOVO/puro): `buildProjectOutline`
  monta a árvore por id/parentId com recuo de 2 espaços e rótulos do `SERVER_BLOCK_CATALOG`
  COMPLETO. ⚠️ Tipo desconhecido **NÃO é ecoado** (vira `blocosDesconhecidos: N`) — o `context.blocks`
  vem do cliente e ecoar texto arbitrário reabriria prompt injection. Bloco acima do tier aparece
  com `(nível futuro)`: existe no projeto, mas o prompt proíbe recomendá-lo. O `projectData` troca
  `blocks` cru por `{esboco, blocosRelevantes}` e o `contextAllowedByCatalog` parou de filtrar o
  projeto DELA (a redação por tier vale só para o que é RECOMENDADO).
- **Orçamento de 48KB é contrato** (testes são o freio): ordem de encolhimento `catalog>24 →
  receitas 2→1 → manuais>3 → catalog>8 → receitas 1→0 → manuais>0` — manuais deixaram de morrer
  primeiro (sobreviviam ~1,4KB de 35KB).
- **`suggestions` na resposta:** `array(string 1..60).max(3)` no `RawAnswer` e no JSON schema
  (⚠️ modo estrito: **em `required`**, vazio ok — foi bug real no Pensa), cada uma passando por
  `redactZappyPii` + `isUnsafeZappyText` na validação. Viram chips que PREENCHEM o campo no
  `ZappyPanel` (padrão que a usuária aprovou no Pensa — não enviam sozinhos).
- **Modelo: `OPENROUTER_ZAPPY_MODEL=openai/gpt-4.1-mini`** (staging + prod, 06/08). O gpt-4.1 puro
  durou 20 minutos: preço real do OpenRouter é **$2/M entrada + $8/M saída = 13× o gpt-4o-mini**, e
  este lote engordou o prompt DE PROPÓSITO (receitas + esboço + memória, teto 48KB) — pior caso
  ~$0,042/pergunta, ~$21/mês por conta que estourasse a quota. O **4.1-mini ($0,40/$1,60) é 5×
  mais barato que o 4.1 e uma geração à frente do 4o-mini**, então não volta a ser o modelo que
  dava resposta vaga: ~$0,008/pergunta. ⚠️ O **Pensa fica no `gpt-4.1`** (JSON grande do
  `task_plan`, poucas chamadas por ciclo). Cascata: `ZAPPY_MODEL → PENSA_MODEL → MODEL`, todas
  `.optional()` — **o lote não exigiu env nova**. Só o community-kids tem OpenRouter configurado;
  o community adulto não roda Zappy.
- **Quota não é alavanca de custo** (medido 06/08, antes de mexer): equipe JÁ é ilimitada
  (`privileged` → `unlimited:true` no members) e o teto `AI_LIMIT_DAILY`/`MONTHLY` é **global por
  CONTA**, somando Pensa + Zappy + descrição do Mural — baixá-lo corta o Pensa junto (1 ciclo ≈
  25-30 interações). Além disso teto não reduz custo MÉDIO, só a cauda. Se um dia cortar, corte o
  MENSAL, nunca o diário. Medir primeiro no `/admin/ia` (breakdown por feature e por conta).
- **Segurança infantil intacta:** URL, cerca de código, anti-grooming, PII na pergunta e quota
  seguem fail-closed. As flexibilizações são cirúrgicas: tag única sem atributo, `class`/`return`
  em texto, e `ANSWER_PHONE_RE` (telefone com DDD) usado SÓ no lado da RESPOSTA — a redação da
  PERGUNTA mantém o regex largo.

## Jornada do criador — 07/09/2026

Ver `../../docs/plans/creator-journey-rollout.md` para ordem de implantação e rollback.
`server/pensa-capabilities.ts` usa os blocos conquistados e a disponibilidade das ferramentas
na geração/auditoria, conservando o fallback legado de currículo vazio. Molda é destino de
cartões 3D (model/texture/sky); IDs do inventário visual e da criação persistida são distintos.
Os contratos e schemas do BFF reconhecem `molda`/`molda_asset`.
A auditoria exige explicitamente a disponibilidade atual de Molda, Pinta e Estúdio;
não basta o catálogo de blocos continuar compatível com um plano antigo.

`hub.myShowcaseDeliveryReadonly(courseId)` consulta entrega por ator, sem aceitar ID de outro
perfil. Campos aditivos do detalhe do curso: id, milestones e showcaseLessonId.

`createLearningRoutes` atende Kids e Adult, exige perfil ativo e recusa impersonação somente leitura, campos extras e dono enviado no corpo. `x-sz-viewer` deve corresponder à sessão; não concede acesso. `LessonSections` preserva o editor entre seções; `LessonVideo` centraliza Vimeo e retomada. Atividades HTML usam iframe com origem opaca e protocolo validado por instância; checkpoints essenciais são avaliados no members.

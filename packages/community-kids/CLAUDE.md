# CLAUDE.md — @sistemazero/community-kids

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.). Para **pesquisa/exploração**, use o **MCP do Octocode**.

Plataforma de cursos **KIDS/infanto-juvenil (8–13 anos)** do Sistema Zero — segundo app de área
do aluno, irmão do [`@sistemazero/community`](../community/CLAUDE.md). Next.js 16 + React 19 +
Tailwind v4, porta **3008**. Visual "estilo Duolingo" (redesign 06/2026) com a **PALETA DA MARCA**
(mesma do comunidade-sistema-zero: light = cyan `oklch(0.52 0.14 200)` sobre off-white; dark =
lime neon `#C4F042` sobre `#0D1117`; acentos SÓ cyan/lime/vermelho — sem hues novos), radius 1rem,
fontes **Baloo 2** (display) + **Nunito** (corpo) + Geist Mono (código), CTA "botão 3D" (sombra
dura + afunda no clique), microinterações `kid-pop`/`kid-wiggle`/`kid-float` com
`prefers-reduced-motion` global. **Layout próprio (≠ community)**: sidebar fixa no desktop + top
bar/tab bar no mobile (`app-sidebar.tsx`/`mobile-nav.tsx`), home com mascote + card-herói
"Continuar" (`continue-hero.tsx`), **trilha serpenteante** no detalhe do curso
(`course-trail.tsx` + `trail-layout.ts` puro/testado: módulo = unidade temática
cyan→lime→gradiente via `unit-theme.ts`, aula = nó circular; trilha LIVRE — estado é só visual,
todos os nós clicáveis; sem ícone por tipo: a outline não expõe blocos) e **celebração** ao
concluir aula (`lesson-celebration.tsx`: mascote + confete CSS puro + barra antes→depois; o
`complete()` não-silent abre o overlay em vez de navegar; auto-complete a ~90% segue só com
toast). **Mascote-faísca** = estrela da logo com rosto (`mascot.tsx`, expressions
happy/celebrating/thinking/sleeping; `useId` p/ o gradiente). **Página de aula kids (2ª rodada
06/2026)**: header de "lição" (voltar em círculo + progresso + chip AULA N DE M), sidebar =
mini-trilha numerada por unidade, e FORKS DE APRESENTAÇÃO dos renderers do member-shell —
`kids-lesson-blocks.tsx` (chips de atividade Assista/Escute/Brinque/Leia o livro/**Crie** + molduras;
o bloco **`studio`** (chip "Crie") REUSA o `StudioBlockView` do member-shell — editor embarcado,
rascunho local, "Enviar para o professor" + gate de conclusão `STUDIO_GATE_NOT_SUBMITTED` (sem envio)
ou `STUDIO_GATE_NOT_PASSED` (atividade enviada, mas abaixo da nota mínima); o `lesson-player-client`
distingue os dois no toast/botão. Exige `@sistemazero/studio` em transpilePackages + `@source`
+ `frame-src blob:`;
⚠️ invariantes de segurança COPIADOS do shell: URL canônica de vídeo, sandbox SEM
allow-same-origin, markdown controlado — mexeu na segurança de bloco, replique nos DOIS
renderers), `kids-lesson-attachments.tsx` (mesma mecânica de download) e **`kids-quiz.tsx`
estilo Duolingo** (intro c/ mascote → UMA pergunta por vez c/ segmentos de progresso e cartas
de resposta → correção verde/vermelho no FINAL — o gabarito só chega na resposta do submit,
grading é server-side; cooldown/passingScore preservados; ⚠️ enunciado/opções/explicação são
MARKDOWN — `renderMarkdown` (bloco) no enunciado/explicação e `renderInline` nas opções e no
recap, pois o `<button>` só aceita conteúdo inline; imagens limitadas por `[&_img]:max-h-*`).
**Gamificação REAL implementada
(11/06/2026)** — ver §"Gamificação estilo Duolingo" abaixo; nada fake, estado no members.

## A regra de ouro: quase tudo vem do member-shell

TODO o BFF (sessão/gateway/refresh/mídia/marca d'água/clients), a LÓGICA dos route handlers, o
proxy e os componentes de DOMÍNIO (player Vimeo, blocos, quiz, ebook 3D, anexos, progress-bar,
banner de impersonação, user-avatar) vêm do **[`@sistemazero/member-shell`](../member-shell/CLAUDE.md)**
— ver o CLAUDE.md de lá ANTES de mexer em qualquer comportamento de BFF/segurança (fix lá roda nos
DOIS apps). Este app define apenas:

- `src/server/shell.ts` → `createShell({ cookieBase: 'sz_kids', audience: 'kids', serviceName })`.
  **`audience: 'kids'`** = vitrine do members (listagens SÓ de cursos kids; curso kids fica FORA
  da chave-mestra adulta — acesso por matrícula específica, concedida pelo admin).
- `src/lib/cookies.ts` → **`sz_kids_*`** (≠ `sz_member_*`; compile-time DE PROPÓSITO — cookies não
  escopam por porta em dev, dá p/ logar nos dois apps lado a lado). `tests/cookies.test.ts` trava.
- `src/proxy.ts` → config + matcher literal. Prefixos protegidos: `/cursos`, `/perfil` (SEM
  `/compras` — não existe aqui).
- `src/app/globals.css` → tokens kids com os MESMOS NOMES do community (os componentes do
  ui/member-shell "vestem" o tema sozinhos) + `@source` do ui E do member-shell (obrigatório) +
  redefinições das classes consumidas pelos compartilhados (`lesson-prose` MAIOR, `.sz-progress`
  mais alta, `.sz-display` em Baloo 2, `sz-overlay/modal`, `scrollbar-subtle`).
- `src/components/kids/*` → identidade (sidebar/tab bar, user-menu, logo, mascote, cards,
  trilha, celebração, catálogo, auth-shell).
- Route handlers = 1-3 linhas sobre `shell.routes.*` (idênticos ao community, MENOS payments).

## Perfis estilo Netflix (PR5) — quem vai aprender hoje?

O RESPONSÁVEL faz login (sessão da CONTA) e a borda manda escolher um **perfil de criança**
antes de entrar na área de aprender. `src/proxy.ts` seta `requireProfileSelectPath: '/perfis'`
(conta sem a claim `pfl` → redireciona p/ a grade) e `/perfis` entra nos `protectedPrefixes`
(isenta do gate, é a rota de seleção). A **grade** (`app/perfis/page.tsx` — FORA do grupo
`(app)`, sem a sidebar kids — + `perfis-client.tsx`): rostinhos clicáveis (selecionar = 1
clique → `/api/profiles/:id/select` → reload da home), **Área dos pais** (numa sessão de perfil
pede a SENHA do responsável → `/api/profile-session/exit`; numa sessão da conta gerencia direto:
criar/editar/arquivar + **foto** via `/api/profiles/:id/avatar`, multipart, FORA do matcher + a
**troca de senha da CONTA** — `ParentPasswordChange` → `/api/auth/me/password`, só na sessão da
conta, pois senha é da CONTA, não do perfil). ⚠️ **Full review 19/06: TODA mutação da CONTA exige o
portão** — `PATCH /api/auth/me` (nome/telefone) e `POST /api/me/avatar` (foto da conta) agora são
`requireParentGate` (antes eram shims pelados → uma criança numa sessão de conta desfigurava a
identidade do responsável); a troca de senha **FECHA o portão no sucesso** (`withParentClearedOnPasswordChange`);
`/api/parents/verify` ganhou cooldown por conta (5 erros → 60s). O limite de perfis é do plano (criar acima → 409 no
toast). Toda a lógica do BFF vive no **member-shell** (`shell.routes.profile*` + `shell.profiles`);
os `route.ts` são shims de 1-3 linhas. `getSession().activeProfile` indica a sessão de perfil ativa.
A página **"Meu perfil"** (`app/(app)/perfil`, sempre em sessão de perfil) edita o PRÓPRIO perfil
(nome ≥ 3 / foto / telefone) via `/api/profiles/:id` — NUNCA a conta (full review F1: o auth recusa
`/auth/me` de escrita em sessão de perfil).

## Clube dos Criadores + Mural dos Criadores (hub/fórum + vitrine)

**Renome (06/2026):** a antiga "Turma" (`/comunidade`) virou **Clube dos Criadores**
(`/clube-dos-criadores`, modo fórum) e ganhou um irmão **Mural dos Criadores**
(`/mural-dos-criadores`, modo `wall` = vitrine). Ambos são SERVIDORES do hub `course_gated`
(produto à parte) com `teaserWhenLocked` ON → aparecem no menu (`nav.ts`: itens "Clube" e "Mural")
mesmo sem acesso, e a UI mostra `KidsLockedSpace` (recado gentil, sem conteúdo) quando
`space.locked`. A rota antiga `/comunidade` foi REMOVIDA sem redirect (não há usuário real em prod
ainda — decisão do usuário). O componente único `components/kids/kids-space-view-client.tsx` (movido
de `app/(app)/comunidade`)
recebe `slug` + `mode`: no `wall` esconde o composer/sidebar e renderiza CARDS de projeto (capa +
título + resumo + "por {authorDisplayName}"); a criança só comenta (moderado) e reage. **Vitrine
(Mural):** os posts são auto-publicados ao concluir a última aula de um projeto — a
`LessonCelebration` ganha o botão "Publicar no Mural" (`PublishToMural`) que captura o print do jogo
no cliente (`@sistemazero/studio` `captureCoverFromProject` lendo o rascunho local
`sz-lesson-studio:<blockId>`) e faz `POST /api/hub/showcase` (multipart, FORA do matcher do proxy —
guard próprio via `requireUploadSession`); `lesson-player-client` propaga o `showcase` da resposta do
complete. **Compartilhar do Estúdio + link público jogável (06/2026):** o `StudioBlockView` da aula é
renderizado com `enableShare` (kids-only) → o editor ganha o botão **"Compartilhar"** na Topbar (publica no
Mural com **descrição gerada por IA** que a criança edita + um **link público de jogar**; o post é um
SNAPSHOT imutável e independente do rascunho que ela continua editando, e o member-shell normaliza o
JSON jogável antes de persistir no R2 privado). O card do Mural
(`kids-space-view-client.tsx` `ShowcaseCard`/`ThreadDetail`) ganhou, quando há `thread.playId`, os botões
**"Jogar"** (abre `/jogar/<playId>` em nova aba) + **"Copiar link"** (`navigator.share` com fallback
clipboard) — a raiz do card deixou de ser `<button>` (âncora não aninha em button). A **página PÚBLICA**
`app/jogar/[id]/page.tsx` (FORA do grupo `(app)`, sem login, igual a `/perfis`) renderiza o
`StudioProjectPlayer` (subpath `@sistemazero/studio/player`, `ssr:false`) buscando o projeto em
`/api/studio/play/:id` — mostra SÓ o jogo + título, NUNCA o nome da criança, e tolera snapshots
legados/incompletos sem derrubar a página pública. As rotas `/api/studio/{describe,
publish,play/[id]}` são shims sobre `shell.routes.studio*`; o `proxy.ts` exclui `api/studio/publish`
(multipart) e `api/studio/play` (stream público) do matcher (`api/studio/describe` FICA no matcher — ganha
o anti-CSRF same-origin). **Data de nascimento (controle de idade):** os pais informam no `ProfileForm` da Área dos
pais (`app/perfis`) — `<input type=date>`; só a CONTA edita (o auth recusa em sessão de perfil).

## Estúdio Completo (produto vendável — 06/2026)

O **estúdio completo** (`@sistemazero/studio`) virou um PRODUTO vendável, ao lado do Mural/Clube:
item **"Estúdio"** no `nav.ts` (perto de Mural/Quarto) → rota `/estudio` (`protectedPrefixes`). O
gate é resolvido no SERVIDOR: `app/(app)/estudio/page.tsx` chama
`checkStudioAccessReadonly()` (`GET /members/access?refs=estudio-completo`, acesso pela CONTA) com
**3 estados** (full review 3ª passada): members RESPONDEU 200 e não tem o produto → `KidsLockedStudio`
(recado gentil, mascote `thinking`, "peça a um responsável"; sem link de venda — kids não tem funil);
COM acesso → `StudioFullClient` (o editor pesado nem carrega p/ quem não comprou); **status ≠ 200
(gateway/token soluçou) → `KidsStudioUnavailable` ("tente de novo" + `router.refresh()`)** — não mostrar
"ainda não liberado" a quem JÁ comprou num erro transitório (mentiria que não tem acesso).
**Passe livre da EQUIPE (06/2026):** superadmin/admin/staff acessam o Estúdio Completo SEM comprar —
a rota `GET /members/access` curto-circuita `estudio-completo` p/ `true` quando `isPrivilegedActor`
(o `role` da CONTA sobrevive na sessão de perfil). É o que conserta "o admin tá sem acesso ao
estúdio". `studio-full-client.tsx` (`'use client'`, import dinâmico do package no
effect — Monaco/Blockly/IndexedDB não rodam no SSR) hospeda a navegação **lista ⇄ editor** (estado
local; o package não tem router) com `<ProjectList>` + `<StudioEditor persistence="local">` — recursos
CLÁSSICOS (NÃO passa `features`: o `StudioEditor` já vem com terminal/IA/profissional OFF → sem
COOP/COEP, sem conflito com os vídeos das aulas). O botão **"Compartilhar"** usa um `share` adapter
próprio → `/api/studio/describe` + **`/api/studio/publish-standalone`** (shim sobre
`shell.routes.studioPublishStandalone`; o hub re-valida a posse do produto). ⚠️ **Persistência LOCAL
por NAVEGADOR (v1):** projetos no IndexedDB do aparelho — perfis irmãos no MESMO navegador compartilham
a lista (acesso é por CONTA; isolamento por perfil = follow-up). **LARGURA TOTAL:** o `MainContainer`
(`components/kids/main-container.tsx`, usado no `(app)/layout`) tira o `max-w-5xl` na rota `/estudio` (IDE
quer todo o espaço); demais páginas seguem com `max-w-5xl`. **SEGUE o tema da comunidade:** o
`studio-full-client` lê `useTheme().resolvedTheme` (next-themes) e passa `theme` ao `<StudioEditor>` E ao
`<ProjectList>` — assim o Estúdio não tem toggle próprio nem destoa do app (sem `theme`, o Studio mostraria
o toggle e poderia ficar em tema diferente da comunidade). ⚠️ a **CSP** (`next.config.ts`) inclui
**`script-src … data:`**: o preview injeta o script.js do aluno como `<script src="data:…">` num iframe
`srcdoc`, que HERDA a CSP do pai (só RESTRINGE) — sem `data:` o preview do estúdio/bloco não executa. `api/studio/publish-standalone` fica FORA do
matcher do proxy (multipart) — coberto pelo prefixo `api/studio/publish` no negative-lookahead.

### Hub/fórum (compartilhado)

Porta kids do fórum compartilhado (`@sistemazero/hub` via member-shell). A LÓGICA do
BFF (clients do hub, **redação do `authorId` de terceiros**, validação Zod de
título/corpo/emoji/motivo) vive no **member-shell** (`createHubRoutes`); os `route.ts`
em `src/app/api/hub/*` são shims de 3 linhas e `/clube-dos-criadores` +
`/mural-dos-criadores` entram nos `protectedPrefixes` do `proxy.ts`. A UI é PRÓPRIA
(tom kids): `app/(app)/clube-dos-criadores/page.tsx` e
`app/(app)/mural-dos-criadores/page.tsx` → `kids-space-view-client.tsx`
(canais, tópicos, respostas, reações OTIMISTAS com allowlist de emojis, "Avisar
professor" por modal — sem `window.prompt` —, anexos via `AttachmentUploader`/
`AttachmentList` do shell, paginação por cursor: query **`cursor`** p/ tópicos e
**`after`** p/ respostas — casam com os route handlers). **Privacidade (NÃO
regredir):** o BFF redige o `authorId` de terceiros; a UI só rotula "Você"/"Colega"
comparando com o `viewerId` da sessão (ninguém EXIBE id). Corpo de tópico/resposta =
**`renderUgcMarkdown`** (modo RESTRITO — full review 19/06: SEM `<img>` externo, que seria
pixel-rastreador entre crianças, e links só como TEXTO; o write do hub ainda strippa `![](…)` na
origem). Imagem legítima segue pelo anexo re-encodado. ⚠️ Em corpo de ALUNO use `renderUgcMarkdown`,
NUNCA `renderMarkdown` direto (este é p/ conteúdo do admin: rich_text/quiz, com imagem liberada). Item "Turma"
no `nav.ts` (sidebar + tab bar). ⚠️ **Corpo é OBRIGATÓRIO** no envio (schema do hub
`body.min(1)`): o botão "Responder" exige `replyBody.trim()` — não habilitar só com
anexo (o servidor recusaria).

## Diferenças deliberadas vs o community (decisões da v1, 06/2026)

1. **Compras só na ÁREA DOS PAIS** (não no menu da criança): NÃO há página `/compras` nem item
   de menu, mas o RESPONSÁVEL vê o histórico numa sub-tela de `/perfis` (modo gestão, atrás do
   portão de senha) — shim `app/api/payments/my` gateado por **`requireParentGateAccountOnly`**
   (estrito: a sessão de perfil herda o e-mail do responsável → a criança é RECUSADA, 403) sobre
   `shell.routes.paymentsMy`; UI `PurchasesView` no `perfis-client` (Fase 3b, 06/2026). Antes
   o kids não tinha NADA de compras; agora tem, mas escopado ao responsável.
2. **Classificação do curso INCLUÍDA (decisão do usuário, 06/2026)**: porta kids do fluxo de 5
   modais do community (`course-rating-flow.tsx` próprio, copy em tom kids + mascote; rota shim
   `/api/members/courses/[slug]/rating` compartilhada). Compartilhar usa SÓ `salesPageUrl` do
   curso (kids segue SEM `FUNNEL_URL`).
3. **Telefone agora é DO PERFIL** (decisão do usuário, 06/2026 — antes o perfil kids não tinha
   telefone): a criança edita nome/foto/**telefone** (`whatsapp` do perfil) na página "Meu
   perfil" via `/api/profiles/:id`. O telefone do RESPONSÁVEL segue na compra (não se mistura).
4. **SEM `FUNNEL_URL`** (kids não tem funil na v1): curso bloqueado no catálogo sem
   `salesPageUrl` fica não-clicável — comportamento herdado.
5. **SEM `public/sw.js`** (kill-switch era cicatriz do domínio do community).
6. `/impersonar` EXISTE (suporte): o admin gera o handoff com `?platform=kids` no auth → a URL
   devolvida é a deste app. Gamificação é a fase 2 (ver seção própria) — NÃO improvisar
   contadores fake no meio-tempo.
7. **Branding (06/2026)**: logo = wordmark OFICIAL (`public/logo_dark|white.svg`, copiados do
   community) + selo "kids" composto em HTML (`kids-logo.tsx` — SVG via `<img>` não carrega
   webfont, por isso o selo vive no DOM); `public/logo_kids_*.svg` são o fallback ESTÁTICO de
   marca (letras desenhadas em paths, nunca `<text>`). Favicons herdados do community DE
   PROPÓSITO (decisão: mesmo favicon).

## Gamificação estilo Duolingo (Fase 2 + expansão Zappy/avatar — 6 fases)

> **Fonte da verdade do contrato/regras/idempotência:** o [CLAUDE.md do members](../members/CLAUDE.md)
> (§Gamificação) e a doc transversal **[`../../docs/gamificacao.md`](../../docs/gamificacao.md)**
> (visão das 6 fases ponta a ponta). Aqui fica só a APRESENTAÇÃO kids.

Streak diário + XP + badges + baús (núcleo, IMPLEMENTADO 11/06/2026), **estado 100% no members**.
Decisões do usuário: **SEM corações/vidas**; XP = aula 10 · quiz aprovado 20+bônus por nota (cap
+10) · baú de unidade 25. Streak em **America/Sao_Paulo** (dia vira ~03:00Z), SEMPRE no backend;
conta qualquer atividade que rende XP (MARCOS de `amount 0` destravam badge mas NÃO movem streak).

A **expansão (6 fases)** transformou a §"ligas/lojinha = fora" em recursos reais: moeda **Zappy**
(carteira/sink cosmético), **avatar** customizável, **quarto** virtual, **missões** diárias/semanais,
**proteção de sequência** (férias + protetores/freezes), **liga** semanal e **perfil público** +
nomes clicáveis no Mural + **badges de maestria** (Estúdio, poupador). Tudo segregado POR VITRINE
(kids ≠ adult) e o members continua sendo o portão único.

**Fluxo de dados:** o delta vem NA RESPOSTA das ações (complete/quiz →
`gamification: {xpAwarded, totalXp, streak, badgesUnlocked[], unitCompleted}` — `streak.extended`
acende o fogo, marcos de streak rendem moeda; `null` = award falhou, fail-open — a UI degrada para o
comportamento antigo) + `GET /members/gamification/me` p/ widgets. Server Components usam
**`getGamificationReadonly()`** (best-effort, mesmo padrão do avatar: 401 → widget some); rota BFF
`/api/members/gamification/me` = 1 linha sobre `shell.routes.gamificationMe`. Rota nova no gateway:
`members-gamification-me`.

**Onde a UI vive (tudo com tokens da marca + `prefers-reduced-motion`):**
- `badges.ts` — APRESENTAÇÃO das badges (`BADGE_INFO` título/copy/ícone por `BadgeSlug`); o
  catálogo/detecção é do members. Slug desconhecido → `badgeInfo()` devolve null e a UI ignora
  (forward-compat).
- `lesson-celebration.tsx` — overlay ganhou `gamification` (chip +XP, fogo do streak com
  destaque quando `extended`, "abriu o baú da unidade", badges); `xpAwarded: 0`/`null` →
  overlay antigo. O `lesson-player-client` agora LÊ a resposta do complete (estado
  `celebration = {progress, gamification}`); auto-complete a ~90% vira toast `+N XP`.
- `kids-quiz.tsx` — tela de aprovado mostra chip +XP e badges destravadas (vêm na resposta do
  submit).
- `course-trail.tsx` + `trail-layout.ts` — nó de BAÚ no fim de cada unidade (`TrailUnit.chest`,
  derivado client-side: todas as aulas do módulo `completed`; o índice global do serpenteado
  avança TAMBÉM no baú — offsets consecutivos seguem diferindo de 1, travado em teste).
  Fechado = tracejado neutro; aberto = tema da unidade (`kids-node--chest-{open,closed}` no
  globals). Não-clicável. ⚠️ o label "+25 XP" do baú aberto espelha o XP_VALUES do members.
- `streak-widget.tsx` — sidebar (cheio) + `MobileTopbar` (compact): fogo aceso (vermelho
  `--sz-hot`) quando `activeToday` + XP total. O layout busca via `Promise.all` com o avatar.
  **Equipe (passe livre):** quando `coins.unlimited` (members marca p/ superadmin/admin/staff), o
  HUD de moedas mostra **∞** no lugar do número — aqui, no `configurator.tsx` (avatar) e no
  `room-builder.tsx` (quarto), que também leem `balanceUnlimited`. Compras da equipe voltam grátis
  (`unlimited:true`). Ver `docs/gamificacao.md` §4.
- `streak-card.tsx` — card da home (só com cursos liberados E gamificação disponível).
- `badge-showcase.tsx` — vitrine do perfil: catálogo completo, bloqueada = tracejada+cadeado,
  desbloqueada = cor da marca + data. Inclui as **badges de MAESTRIA** da expansão
  (`studio-first`/`-master-3`/`-master-10` do Estúdio; `coins-saver-300`/`-1000` de poupador de
  Zappy) — copy/ícone em `badges.ts`, detecção no members.
- **Avatar 3D — `components/kids/avatar3d/*` (rota `/meu-avatar`, tela cheia IMERSIVA fora do
  grupo `(app)`):** configurador de personagem 3D (substituiu o DiceBear). `configurator-client.tsx`
  (`dynamic ssr:false` — three/fiber/drei só no cliente, espelha o `studio-full-client`) → `configurator.tsx`
  (estado + loja por categoria + 2 modos: **Personalizar** ⇄ **Cabine de fotos**) + `avatar-scene.tsx`
  (`<Canvas>` R3F) + `avatar-rig.tsx` + `asset-part.tsx` + `camera-manager.tsx` + `thumb-canvas.tsx`.
  **Experiência fiel ao WawaSensei (simplificada p/ a arquitetura DELE — 06/2026):** a câmera é drei
  **`CameraControls`** (`camera-manager.tsx`) com **posição FIXA determinística** (constantes `CAM_POS`/
  `CAM_TARGET`) — **NÃO mede mais o bounding box** (medir dependia do timing de carga → enquadrava diferente
  em refresh frio vs. navegação quente, "às vezes colando no painel"; agora os pés ficam em y=0 pelo
  auto-stand e a moldura fixa enquadra IGUAL sempre). **CORPO INTEIRO nos DOIS modos** — a Cabine de fotos
  **NÃO aproxima** (o WawaSensei também não: o zoom por-categoria dele só roda em CUSTOMIZE), só fica um tico
  mais LONGE (`CAM_POS_PHOTO`) pra a criança VER a pose. Reenquadra em `[mode, ready]` (recentraliza de
  frente ao trocar de modo; trocar peça/cor NÃO mexe a câmera). **Layout: a `<Canvas>` ocupa só a faixa
  `flex-1` ENTRE a barra de cima e o painel de baixo** (não mais `absolute inset-0`) → "centrado na cena" =
  "centrado na área visível, descontando a configuração" — robusto a qualquer tela/modo, em refresh OU
  navegação. O personagem fica em pé UMA vez (pés no pódio; NÃO re-fica-em-pé a cada troca). A **Cabine de
  fotos** dá poses (`Poses.glb`: Idle/Chill/Cool/Punch/Ninja/King/Busy) + órbita LIVRE pra posicionar antes
  da foto. **Captura (`SnapshotBridge`) = câmera própria** p/ caber no quadrado central: "Salvar" força
  RETRATO de rosto (imagem do avatar sempre boa); "Tirar foto" usa o CORPO INTEIRO respeitando a ÓRBITA da
  criança, afastado o bastante p/ cabeça+pés caberem no quadrado (cálculo por altura×proporção da tela). A grade mostra **MINIATURAS = PNG estático**
  (`thumb-canvas.tsx` `<AvatarThumb>`): **(1)** primeiro o **PNG PRÉ-GERADO e commitado** em
  `public/avatar3d/thumbs/<id>.png` → `<img>`, **ZERO WebGL** (igual ao WawaSensei). Gera com
  **`bun run gen:avatar-thumbs`** (`scripts/gen-avatar-thumbs.ts`: sobe `Bun.serve` com uma página geradora
  + os GLBs, ABRE no SEU navegador real — WebGL confiável, sem headless frágil —, renderiza cada peça com o
  MESMO `skinnedMesh`+esqueleto e faz POST do PNG, que o script grava no disco; commite os PNGs). **(2)**
  faltando o PNG, FALLBACK: renderiza ao vivo 1× num `<Canvas>` (esqueleto **CLONADO** + material
  **CLONADO/recolorido**, senão a cor vazaria pro avatar; drei **`<Bounds>`** enquadra), **captura** e troca
  pra `<img>` (cache de sessão `thumbCache`). "nenhum" = ✕. ⚠️ um renderer OFFSCREEN próprio saía EM BRANCO
  em 3 tentativas → por isso PNG estático + fallback que reusa o render que FUNCIONA. Trocar peça NÃO pisca: **`<Suspense>` POR peça** no `avatar-rig` + animação de
  "cabine" (encolhe/gira/flutua + feixe) dirigida por um `loading` com **duração mínima** (50ms/~800ms sobre
  `useProgress`, como o `Experience.jsx`) — só troca de ASSET gira (cor muta material in-place, instantâneo).
  `randomize` ("Surpreenda-me") sorteia peça grátis/possuída + cor. ⚠️ **Personagem GLB REAL (Quaternius CC0, via pack do WawaSensei):**
  1 esqueleto compartilhado (`base/Armature.glb`, ossos `mixamorig:*`) + 1 GLB skinned por peça equipada
  (`useGLTF` → `<skinnedMesh skeleton={compartilhado}>`); material `Color_*` recebe a cor da peça, `Skin_*`
  usa o material de pele compartilhado (cor do slot `head`); oclusão `hat→hair`; poses opcionais do
  `base/Poses.glb`. **GLB SIMPLES (sem Draco/KTX2/meshopt → sem WASM, CSP-safe)** — a `<Canvas>` precisa de
  `preserveDrawingBuffer` (snapshot) e os assets vivem em **`public/avatar3d/{parts,base}/`** (~13MB,
  same-origin, `connect-src 'self'`; ids 1:1 com o catálogo). ⚠️ É a 1ª carga de GLB sob a CSP — QA no
  navegador deve confirmar **zero `.wasm`** + montagem/skinning. Ao
  **Salvar**: `PUT /api/members/avatar` (config 3D) + captura o canvas (`preserveDrawingBuffer` + `gl.render`
  forçado → `toBlob` 512²) e sobe via **`POST /api/members/avatar/snapshot`** (multipart, FORA do matcher
  do proxy — shim sobre `shell.routes.avatarSnapshot`, R2 namespace `avatar3d`). A **FOTO** (snapshot) é o
  avatar em TODO lugar: `kids-avatar.tsx` virou só um `<img src={photoUrl}>` (zero WebGL fora do configurador
  — avatares aparecem em listas/rankings) + personagem padrão SVG inline quando sem foto. O `photoUrl` flui
  de `getAvatarReadonly().photoUrl` (chrome/perfil/quarto) e `PublicProfileDTO.avatarPhotoUrl` (perfil
  público). Catálogo espelhado por id (`lib/avatar3d-catalog.ts`, PURO): members = existência/preço/posse/
  paleta, kids = apresentação (travado pela conformância do members). **Pack minerado por COMPLETO (22/06):**
  14 categorias — inclui **`faceDecor` (Pintura de Rosto)**: removível, SEM paleta (cor embutida, igual a
  hat/accessory), `face-01..07` (pintura) + `face-08` (máscara). Auditoria por md5 pegou 9 GLBs duplicados
  (`eyes-09..12`/`eyebrow-07..10`/`hair-09`) e re-apontou p/ a arte distinta; só PumpkinHead (sazonal) e o
  corpo-base nu ficaram de fora. **Toda peça/categoria nova → re-rode `bun run gen:avatar-thumbs`.**
  **Sem item no `nav.ts`** — acessado
  pelo CLIQUE no avatar em `/perfil` (`profile-client` → `router.push('/meu-avatar')`); `/meu-avatar`
  em `protectedPrefixes` + `api/members/avatar/snapshot` no negative-lookahead do matcher.
- **Quarto virtual 3D (06/2026) — `room/room-canvas.tsx` (wrapper `dynamic ssr:false`) +
  `room/room-canvas-3d.tsx` (`<Canvas>` react-three-fiber) + `room/room-builder.tsx`** (rota
  `/quarto`): sink cosmético das Zappy. Cena ISOMÉTRICA low-poly construída EM CÓDIGO
  (`furniture-models.tsx`/`prims.tsx`, sem GLTF) — paredes PINTÁVEIS (`walls.tsx`), pisos
  (`floor.tsx`, CanvasTexture), iluminação/clima dia/noite/neon/festa (`room-lights.tsx`), móveis
  que GIRAM e pet 3D (`pet-3d.tsx`). Câmera ortográfica FIXA; `frameloop` demand → always só com
  pet/festa, gateado por `useReducedMotion`; drag por raycast no plano y=0 (robusto a oclusão);
  `coords.ts` é PURO/testado (`tests/room-coords.test.ts`). `three`/RTF/drei já vinham (livro 3D).
  `GET/PUT /api/members/room` + `POST /api/members/room/items/:id/buy`. O **members é o único portão**
  (`canonicalizeRoomState` na leitura E na escrita); o `room-catalog.ts` do kids é só apresentação
  (item: labelPt/emoji + w/h; pisos `ROOM_FLOOR_INFO`; clima `LIGHTING_PRESETS`; paleta de paredes
  GRÁTIS `ROOM_WALL_PALETTE`; presets de tema `THEME_PRESETS`; `resolveRoomAppearance` mistura
  tema+overrides) e **DEVE casar por id** com o members (conformância). Item posicionável NOVO precisa
  de um `case` em `furniture-models.tsx` (senão cai na caixa neutra). Estado novo (JSONB, sem migração):
  `placedItems[].rot`, `wallColors`, `floor`, `lighting`. Câmera com **órbita REDUZIDA** (drei
  OrbitControls travado num cone, sem pan/zoom, **desligada enquanto arrasta uma peça**) + **pet com
  COLISÃO** (grade `occupied` derivada dos `placedItems` → o bichinho desvia de móveis/paredes, não
  atravessa). Cama é de SOLTEIRO (2×3). **Itens de PAREDE (`mount:'wall'` no catálogo — janela/quadro/
  relógio/estrela/prateleira/pôster/espelho) SOBEM na parede** (não no chão): `PlacedItem` ganhou `wall`
  + reinterpreta `x`=horizontal/`y`=altura; renderizados como painéis FLAT via `wallToWorld`, arrastados
  por raycast nos planos das paredes; não giram. **Colisão "nada por cima de nada"**: o drag só solta em
  célula livre (`isFree`), `addItem` acha o 1º vão (`freeFloorSpot`/`freeWallSpot`) e o `canonicalizeRoomState`
  descarta sobreposição (sets de células chão/por-parede); helpers puros `rectsOverlap`/`wallToWorld`/
  `worldToWallCell` em `coords.ts` (testados). Catálogo expandido (mesa/escrivaninha/tv/beliche/pufe/globo/
  guitarra/bola + os de parede). ⚠️ arcades no quarto foram DESCARTADOS.
- **Missões diárias/semanais — `missions-panel.tsx`** (na home): painel estilo Duolingo com as
  missões do dia ("Hoje") e da semana ("Esta semana"); busca `GET
  /api/members/gamification/missions/me` e resgata `POST /api/members/gamification/missions/:slug/claim`
  (idempotente; **o servidor REVALIDA a conclusão** — o cliente nunca decide). Prêmio = XP + Zappy
  (com teto diário); claim NÃO move streak. Degrada em silêncio se a gamificação estiver indisponível.
- **Proteção de sequência — `streak-protection.tsx`** (no perfil): mostra/gerencia **férias**
  (janela que não exige presença) e **protetores/freezes** (1 grátis por mês + compráveis com Zappy,
  teto 5) — a sequência só QUEBRA quando NEM férias NEM freezes cobrem o gap.
- **Liga semanal — `league-board.tsx`** (no perfil): ranking da coorte da semana (sobe/desce de
  divisão), a versão real do antigo backlog "ligas".
- **Perfil = "Meu perfil" da CRIANÇA (full review F1, 06/2026):** a página edita o PRÓPRIO
  PERFIL (não a conta). 1 card de identidade — foto CLICÁVEL (único caminho de troca, via
  `/api/profiles/:id/avatar`), nome + telefone do perfil + **colocação no ranking kids**
  (`getGamificationReadonly({withRanking: true})` → `ranking.position/totalStudents`; rankings
  adult/kids separados) — e botão "Editar perfil" abrindo um Dialog com nome (≥ 3) + telefone,
  que PATCHa `/api/profiles/:id`. O perfil ativo é resolvido de `listReadonly()` por `id ==
  session.id`. **E-mail e SENHA da conta saíram daqui** (são da CONTA): a troca de senha vive na
  **Área dos pais** (`/perfis`, sessão da conta → `ParentPasswordChange`). A página também HOSPEDA o
  `badge-showcase`, a `streak-protection` (férias/protetores) e o `league-board` (liga da semana).
- **Perfil PÚBLICO — `public-profile-view.tsx`** (rota `/crianca/[profileId]`): vitrine pública de
  uma criança (avatar + apelido + badges + projetos do Mural), SEM dados sensíveis. Os **nomes do
  autor no Mural viraram clicáveis** (`kids-space-view-client.tsx`: "por {authorDisplayName}" → link
  p/ `/crianca/<profileId>`), respeitando a redação de `authorId` de terceiros (o link usa o
  identificador público do perfil, não o id interno).

**Backlog da gamificação:** revisão de aula estende streak? · vitrine de gamificação no community
adulto (campos já chegam — decisão de produto). *(Ligas, lojinha/Zappy, avatar, quarto, missões e
proteção de sequência saíram do backlog — entregues na expansão de 6 fases.)*

## Full review (segurança + desempenho — lente infantil) — 19/06/2026

Auditoria focada em segurança/desempenho de uma comunidade com área de membros para crianças
9–13. TODOS os achados corrigidos (a maioria no member-shell compartilhado → roda nos DOIS apps;
verde no typecheck/test/check dos três pacotes). Mudanças de COMPORTAMENTO/contrato:

- **UGC sem pixel-rastreador (HIGH):** corpo de tópico/comentário do hub renderiza por
  `renderUgcMarkdown` (sem `<img>` externo nem link clicável) + strip de imagem no write
  (`stripImageMarkdown`). Ver "### Hub/fórum".
- **Nada de PII de criança a terceiro:** o Sentry redige `path` (UUID do perfil → `:id`, sem query)
  e mensagem/stack — `redactPii`/`scrubPath` (member-shell).
- **Portão dos pais cobre TODA mutação da conta** (auth/me, me/avatar, me/password — que fecha o
  portão no sucesso —, payments/my + children-stats estritos, verify com cooldown). Ver "Perfis…".
- **`profileAvatar` autoriza ANTES de gravar no R2** (criança só troca a própria foto; UUID validado).
- **Borda:** UUID validado em todos os path ids de perfil/hub; headers **COOP/CORP** nos dois apps;
  `watermarkImage` com `limitInputPixels` (anti OOM da réplica única).
- **Desempenho:** `React.cache()` deduplica `getMeReadonly`/`getGamificationReadonly` por request; o
  **layout transmite o `loading.tsx` via `<Suspense>`** (chrome de avatar/gamificação carrega atrás,
  mantendo `withRanking` — o menu do avatar usa o ranking no lugar do e-mail); busca do catálogo com
  **debounce** (`use-catalog-filters` — estado local instantâneo, URL espelhada com atraso);
  `ReactionBar`/`CommentRow` memoizados; `<img>` de aula com `aspect-ratio` (sem CLS); "Avisar
  professor" com alvo de toque ≥44px + ícone.
- **Produto (não-bug, decisão pendente):** perfis irmãos NÃO têm PIN (1 clique troca de perfil);
  PIN numérico segue como futuro.

## Full review (correções) — 20/06/2026

2ª auditoria multi-agente (segurança/correção/perf/a11y, lente infantil) — todos os achados
acionáveis corrigidos; verde no typecheck/test/check dos 4 pacotes + `build:kids`.

- **Error boundaries (antes não existia nenhum):** `app/global-error.tsx` (raiz, `<html>`/`<body>`
  próprios + estilos inline — não recebe globals.css), `app/(app)/error.tsx` e
  `app/jogar/[id]/error.tsx` — todos `'use client'`, tom kids (mascote + Baloo + `reset()`). O
  caminho crítico era a PÚBLICA `/jogar/[id]`: o `<Player>` renderiza fora do try/catch da carga.
  Member-shell não exporta arquivos de rota → cada app precisa dos seus (o community também).
  **Telemetria (3ª passada):** as boundaries só faziam `console.error` — o `onRequestError` da
  instrumentation só vê erros de SERVIDOR, então um crash de render no CLIENTE escapava do Sentry.
  Agora chamam `reportClientError` (`lib/report-error.ts`) → beacon `POST /api/client-error`
  (`fetch` `keepalive`, sobrevive ao `reset()`) que espelha p/ o Sentry via `captureServerException`
  (MESMA redação de PII). A rota fica DENTRO do matcher (anti-CSRF same-origin), sem gate de sessão
  (vale p/ a anônima `/jogar` e p/ o `global-error`), com teto GLOBAL in-process (60/min, réplica
  única) e responde 204 sempre. No-op sem `SENTRY_DSN` — armado p/ quando o projeto Sentry do kids ligar.
- **`prefers-reduced-motion` (fotossensibilidade):** o bloco do `globals.css` ganhou
  `animation-iteration-count: 1 !important` (+ `scroll-behavior:auto`) — animações INFINITAS
  (pulse/twinkle/flicker/float/bob) paravam de fato em vez de cintilar a ~0ms.
- **Portão dos pais = cookie ASSINADO:** `server/parent-gate.ts` grava `accountId.HMAC` (segredo
  aleatório por processo em `globalThis`/`Symbol.for`, mesmo padrão de estado compartilhado do
  member-shell) e verifica a assinatura (timing-safe) — o accountId não é segredo, então o valor
  pelado seria forjável. TTL 15 min preservado.
- **`/api/me/avatar` recusa sessão de perfil** (foto da conta é account-only): fix no
  **member-shell** (`meAvatar.POST` → 403 `ACCOUNT_SESSION_REQUIRED` ANTES da escrita no R2;
  antes a criança deixava objeto R2 órfão) — **roda nos dois apps**.
- **Missões via SSR:** a home busca `getMissionsReadonly()` no `Promise.all` e passa
  `initial` ao `MissionsPanel` (era `useEffect` pós-hidratação = waterfall). A home também pede
  `getGamificationReadonly({ withRanking: true })` p/ casar a chave do `React.cache` com o
  layout (1 ida ao gateway, não 2).
- **a11y/UX:** seta de promoção da liga usa `--success-foreground` (era invisível no dark);
  botões do editor de avatar `size-11` (≥44px); itens do quarto em modo edição viraram `<button>`
  focável (setas movem, Enter seleciona → "Tirar" alcançável por teclado); `not-found.tsx` em tom
  kids; capas do catálogo `loading="lazy"`; compras (quarto/avatar) desabilitam os outros botões
  travados durante uma compra (sem dead-click); `streak-protection` ganhou `catch` + toast.
- **`/jogar/[id]` não-indexável:** `robots:{index:false}` no metadata + `app/robots.ts`. ⚠️ **3ª
  passada:** o `robots.ts` era `Disallow: /` puro, que ESCONDE o `noindex` per-page do `/jogar` (o
  Google não lê um `noindex` de uma URL que não pode buscar → a URL linkada de fora podia ser
  indexada "às cegas"). Virou `Allow: /jogar/` + `Disallow: /`: o bot busca `/jogar` e honra o
  `noindex`; o resto (login-gated) segue barrado.
- **Anti-drift dos catálogos:** preço do protetor centralizado em `lib/gamification-prices.ts`
  (`STREAK_FREEZE_PRICE`); a conformidade kids×members de quarto/avatar/preço é TRAVADA por
  `packages/members/tests/unit/catalog-conformance.test.ts` (kids não depende de members → o teste
  vive no members, que alcança o kids por caminho relativo). Drift → CI vermelho.
- **member-shell (roda nos dois apps):** `watermarkCacheKey` agora usa `sha256(srcKey)` (injetivo —
  a substituição lossy podia colidir e servir o arquivo errado ao MESMO aluno) e `watermarkImage`
  ganhou teto de pixels TOTAIS p/ animados (não só por frame).
- **Não alterados (decisão consciente):** o portão lê `getSession()` (tolera token expirado, mas a
  assinatura é válida e a mutação é re-autorizada upstream — trocar p/ estrito quebraria o
  refresh-on-401); capa do Mural é best-effort (lê rascunho local — só cosmético); nome no perfil
  PÚBLICO é opt-in dos pais (nota de produto: incentivar apelido, não é bug).

## Full review (avatar 3D — correções) — 21/06/2026

3ª auditoria, focada no avatar-3D recém-feito (`components/kids/avatar3d/*`) + varredura fresca de
segurança e React/perf/a11y no resto do pacote. A **varredura de segurança não achou nada
acionável** (as invariantes das revisões 19/06 e 20/06 seguem de pé). Todos os achados de robustez
corrigidos; verde no `typecheck:kids` + `test:kids` (20) + `check` + `build:kids`. Mudanças:

- **1 peça com falha não derruba mais o configurador (robustez):** o `<Suspense fallback={null}>`
  POR peça isola o *carregamento*, mas o `useGLTF` joga um *erro* de carga PRA FORA do Suspense — e
  `/meu-avatar` fica fora do grupo `(app)` (sem `error.tsx` próprio), então um único GLB de
  acessório falhando subia pro `global-error` e matava a tela inteira (perdendo a edição em
  andamento). Agora cada peça também vai num **`PieceErrorBoundary`** (`avatar-rig.tsx`) que some
  com a peça quebrada; `resetKey={asset}` zera o erro ao trocar de peça (nova tentativa).
- **`prefers-reduced-motion` no 3D do avatar (fotossensibilidade):** o configurador ignorava o gate
  de movimento que o **quarto** já respeita (o CSS não alcança o `useFrame`). Agora o `avatar-rig`
  e o `TeleporterBeam` (`avatar-scene`) consomem o **`useReducedMotion()`** (de `room/`) e
  **assentam direto** (sem o giro da "cabine" ~630°/s, sem encolher/flutuar, sem feixe) quando o
  sistema pede menos movimento. O pipeline ficar-em-pé → enquadrar → capturar segue intacto.
- **Recuperação de contexto WebGL (tablets/celular):** novo helper **`lib/webgl-recovery.ts`**
  (`recoverWebGLContext` em `onCreated`: `preventDefault` no `webglcontextlost` + `invalidate` no
  `restored`) ligado nas DUAS `<Canvas>` (avatar e **quarto**) — sem ele a cena ficava PRETA pra
  sempre ao voltar de segundo plano/pressão de memória. (As miniaturas viraram um `<Canvas>` por item
  em `thumb-canvas.tsx` — o renderer offscreen `avatar-thumbs` foi REMOVIDO por sair em branco.)
- **Miniaturas = `<Canvas>` por item (`thumb-canvas.tsx`):** substituíram o renderer offscreen
  (`avatar-thumbs`, REMOVIDO — saía em branco). `ItemTile` rende `<AvatarThumb>` (id com
  apresentação) e cai no **rótulo de texto** (`labelPt`) só p/ id desconhecido.
- **Rollback de reação POR ITEM (hub):** `kids-space-view-client.tsx` desfazia o array inteiro de
  comentários ao falhar uma reação — toques sobrepostos num 2º comentário sumiam junto. Agora o
  rollback restaura SÓ o item pelo `id`.
- **a11y do menu do usuário:** `user-menu.tsx` ganhou **Escape p/ fechar** + `aria-haspopup="menu"`
  (e os listeners só ligam com o menu aberto).

## Comandos

`bun run dev` (:3008) · `build`/`start` · `typecheck` · `bun test` · `check[:fix]` ·
**`gen:avatar-thumbs`** (pré-gera os PNGs das miniaturas do avatar → `public/avatar3d/thumbs/`, abre no
navegador; rode 1× e commite). Da raiz: `dev:kids`, **`build:kids` (package-local — gotcha do `--filter`
quebrar o React)**, `typecheck:kids`, `test:kids`. Mexeu no member-shell? Rode as suítes/builds DOS DOIS apps.

## Env / Deploy (Railway) — EM PRODUÇÃO desde 12/06/2026

Serviço `community-kids` (id `fc8a1b29-ac14-4dc9-a7b3-03d497b8bf4f`) NO AR nos dois ambientes:
**staging** `https://community-kids-staging.up.railway.app` (deploy automático via job
`deploy-staging` do ci.yml — kids está no mapa `SVC_ID` e nos cases member-shell/ui) e
**produção** `https://community-kids-production.up.railway.app` (deploy manual, como os demais).
`KIDS_COMMUNITY_URL` SETADA no auth dos dois ambientes. Matriz de env = a do community (ver o
CLAUDE.md de lá): `GATEWAY_URL`, `JWT_JWKS_URL` (prod EXIGE; HS256 RECUSADO),
`JWT_ISSUER/AUDIENCE`, `R2_*` (staging `testes`/`testes-privado`; prod
`comunidade-sistema-zero`/`-privado` — MESMOS buckets, avatar compartilhado por usuário),
`SENTRY_DSN` opcional, **`OPENROUTER_API_KEY` + `OPENROUTER_MODEL`** (opcionais — descrição IA do
"Compartilhar"; ausentes → fallback, a criança escreve). **SEM FUNNEL_URL.** Porta 3008; réplica ÚNICA (globalThis no shell);
healthcheck `/api/healthz`.

**Pendências de infra (não bloqueiam):** domínio definitivo `kids.sistemazero.com.br`
(dashboard + CNAME Cloudflare; depois apontar o `KIDS_COMMUNITY_URL` de prod p/ ele) e projeto
Sentry `sistema-zero-community-kids` + DSN no host.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` + `check` + `bun run build:kids` limpos.
- [ ] Mexeu no member-shell? Suítes/build do community TAMBÉM.
- [ ] Nenhum `server/*`/`env` importado por Client Component.
- [ ] Mudou contrato? Atualizou este CLAUDE.md (e o do member-shell se a mudança foi lá).

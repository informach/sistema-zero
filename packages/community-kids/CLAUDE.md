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
bar/tab bar no mobile (`app-sidebar.tsx`/`mobile-nav.tsx`). **Nav (lote UX 07/2026):** a sidebar
segue com os 9 `NAV_ITEMS`; a TAB BAR mobile usa **`MOBILE_NAV_ITEMS` (5 abas)** — Início, Cursos,
**Criar**, Mural, Perfil (9 alvos eram minúsculos p/ mãos pequenas). "Criar" → **`/criar`**
(`(app)/criar/page.tsx`, em `protectedPrefixes`): hub de cards do trio criativo (Pensa→Pinta→
Estúdio, na ordem da jornada) + Quarto + Clube; a aba acende nessas rotas (`NavItem.match` aceita
`string | string[]`). **Home (lote UX 07/2026):** o StreakCard MORREU — virou
**`creator-career-card.tsx`** ("Carreira de Criador": aura + insígnia do rank + `nextLevelHint` +
fogo/XP secundários; placeholder gentil quando a gamificação está fora; a home soma
`getAvatarReadonly()` ao Promise.all p/ a foto da aura). **Festa no fim do vídeo:** a
auto-conclusão a 90% ARMA a celebração (`deferredCelebrationRef` no lesson-player-client) e o
overlay completo abre no **`onVideoEnded`** (fio novo do member-shell); manual segue igual.
**Cartão do jogo com QR** (`game-card-dialog.tsx`; dep `qrcode` client-side, canvas puro
CSP-safe): botão QrCode no `PlayLinkActions` dos cards do Mural → cartão imprimível (capa +
título + QR do `/jogar/<id>`; imprimir usa `body[data-print='game-card']` + regra `@media print`
no globals.css). **`/estudio` com paleta calma:** `studio-full-client` passa
`level="intermediario"` + `allowLevelReveal` ao `StudioEditor` (aceita curadoria desde 07/2026).
Home com mascote + card-herói "Continuar" (`continue-hero.tsx`), **trilha serpenteante** no detalhe do curso
(`course-trail.tsx` + `trail-layout.ts` puro/testado: módulo = unidade temática
cyan→lime→gradiente via `unit-theme.ts`, aula = nó circular; com a **trava sequencial** do curso
(`sequential_lock`, estilo Duolingo) as aulas posteriores vêm `locked` do members → nó com
CADEADO, NÃO clicável (estado `'locked'` em `trail-layout`); a mini-trilha lateral e a página da
aula seguem a mesma regra, e abrir uma aula travada por URL cai no **423** → `KidsLockedLesson`
(recado com mascote); equipe interna ignora a trava. Sem ícone por tipo: a outline não expõe
blocos) e **celebração** ao
concluir aula (`lesson-celebration.tsx`: mascote + confete CSS puro + barra antes→depois; o
`complete()` não-silent abre o overlay em vez de navegar; auto-complete a ~90% segue só com
toast). **Mascote Zappy** = o robô oficial da marca (`mascot.tsx`, um sprite WebP transparente
1:1 por expressão em `public/zappy/`, expressions happy/celebrating/thinking/sleeping; `<img>`
server-safe — a className controla o tamanho e herda `kid-float`/`kid-wiggle`/`animate-pulse`). A
**moeda Zappy** (`zappy-coin.tsx` → `<ZappyCoin>`, WebP em `public/zappy/coin.webp`) substituiu o
ícone genérico `Coins` do lucide nos 6 pontos de saldo/recompensa (streak-widget, missions-panel,
lesson-celebration, room-builder, configurator). **Página de aula kids (2ª rodada
06/2026)**: header de "lição" (voltar em círculo + progresso + chip AULA N DE M), sidebar =
mini-trilha numerada por unidade, e FORKS DE APRESENTAÇÃO dos renderers do member-shell —
`kids-lesson-blocks.tsx` (chips de atividade Assista/Escute/Brinque/Leia o livro/**Crie**/**Conquiste** +
molduras; o bloco **`certificate`** (chip "Conquiste", em qualquer aula) REUSA o `CertificateBlockView`
do member-shell — bloqueado até concluir todas as aulas ANTERIORES (aulas depois não contam), depois
"Emitir" → baixa o PDF (montado sobre a imagem base do curso, ver member-shell); a validação
por QR abre a página PÚBLICA **`/validar/[id]`** (FORA do grupo `(app)`, sem login, `noindex`, igual a
`/jogar` — busca a validação no servidor pelo client público do members). Shims `/api/members/lessons/[lessonId]/
blocks/[blockId]/certificate` (GET estado + POST emitir/baixar) e `/api/certificates/[id]/validate` (público,
no negative-lookahead do matcher do proxy); env `APP_PUBLIC_URL` p/ o QR. O members é o portão (ver
`../members/CLAUDE.md`); PDF/QR/R2 vivem no member-shell.
o bloco **`studio`** (chip "Crie") REUSA o `StudioBlockView` do member-shell — editor embarcado
(altura padrão GENEROSA: `lg:h-[82vh]`, piso 44rem — mais espaço pra programar; mudança no member-shell,
vale tb no adulto),
rascunho local, "Enviar para o professor" (o modal de confirmação tem um campo OPCIONAL de recado ao professor — compartilhado do member-shell, vale tb no adulto) + gate de conclusão `STUDIO_GATE_NOT_SUBMITTED` (sem envio)
ou `STUDIO_GATE_NOT_PASSED` (atividade enviada, mas abaixo da nota mínima); o `lesson-player-client`
distingue os dois no toast/botão. **MODO CRIAÇÃO GUIADA (28/06):** quando a aula tem um bloco de VÍDEO
**e** um de ESTÚDIO (`lessonSupportsGuided`), um botão "Modo criação guiada" aparece sob o título →
abre o `GuidedCreationMode` (export do `kids-lesson-blocks`): overlay `fixed inset-0` com o vídeo à
esquerda e o estúdio à direita (lado a lado no desktop; empilha no mobile) + botão "Voltar ao modo
normal". **Split ARRASTÁVEL no desktop (07/2026):** `react-resizable-panels` (dep própria do kids —
mesma lib/handle `.sz-resize-handle--vertical` de dentro do Estúdio), `autoSaveId
"kids-guided-creation"` persiste a posição; vídeo `minSize 20`, estúdio `minSize 35` (Blockly
inusável estreito). Gate por `useIsDesktop` (matchMedia 1024px, estado inicial lido direto — o modo
só monta pós-clique, sem SSR/mismatch); <1024px segue o empilhado. Cruzar o limiar remonta o
StudioBlockKids (re-semeia do rascunho, custo aceito); os DOIS layouts nunca montam juntos.
O estúdio recebe `fillHeight` (prop nova do `StudioBlockView` → o editor preenche a coluna). É
um OU outro (guiada vs layout normal) — renderizar os dois montaria o MESMO bloco de estúdio 2× (mesma
chave de rascunho no IndexedDB → conflito); alternar remonta e re-semeia do rascunho local (sem perda).
Renderizado DENTRO do `LessonPlayerProvider` (precisa do contexto do player). Exige `@sistemazero/studio` em transpilePackages + `@source`
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
`/api/parents/verify` ganhou cooldown por conta (5 erros → 60s). ⚠️ **Botão "Sair" na grade (07/2026):**
`perfis-client.tsx` tem um `logout()` (POST `/api/auth/logout` + `window.location.replace('/login')`)
SEMPRE visível na barra de ações — sem ele, quem entra (ex.: por CÓDIGO) e não sabe a senha da área
dos pais ficava PRESO na grade (não dá p/ criar perfil nem sair). Casa com a trava do login por código
(o auth recusa OTP de conta sem senha definida → `login-form` mostra "crie sua senha em Esqueci minha
senha"). O limite de perfis é do plano (criar acima → 409 no
toast). Toda a lógica do BFF vive no **member-shell** (`shell.routes.profile*` + `shell.profiles`);
os `route.ts` são shims de 1-3 linhas. `getSession().activeProfile` indica a sessão de perfil ativa.
A página **"Meu perfil"** (`app/(app)/perfil`, sempre em sessão de perfil) edita o PRÓPRIO perfil
(nome ≥ 3 / foto / telefone) via `/api/profiles/:id` — NUNCA a conta (full review F1: o auth recusa
`/auth/me` de escrita em sessão de perfil).

## Clube dos Criadores + Mural dos Criadores (hub/fórum + vitrine)

**Renome (06/2026):** a antiga "Turma" (`/comunidade`) virou **Clube dos Criadores**
(`/clube-dos-criadores`, modo fórum) e ganhou um irmão **Mural dos Criadores**
(`/mural-dos-criadores`, modo `wall` = vitrine). Ambos são SERVIDORES do hub `community_gated`
em PRODUTOS SEPARADOS (cada um na SUA chave = slug; NÃO mais por curso): Clube = `clube-dos-criadores`
(fórum vendável), Mural = `mural-dos-criadores` (vitrine independente, bônus do desafio do 1º jogo)
com `teaserWhenLocked` ON → aparecem no menu (`nav.ts`: itens "Clube" e "Mural")
mesmo sem acesso, e a UI mostra `KidsLockedSpace` (recado gentil, sem conteúdo) quando
`space.locked`. A rota antiga `/comunidade` foi REMOVIDA sem redirect (não há usuário real em prod
ainda — decisão do usuário).
**⚠️ Acesso ao Clube/Mural = UM portão só, o "Quem vê" do hub (06/2026):** NÃO há gate de produto na
página (era um 2º portão que contradizia o "Quem vê" — removido p/ não confundir). A `page.tsx` só
renderiza o `KidsSpaceViewClient`; o HUB decide o acesso pelo `accessConfig` ("Quem vê" no admin:
público / por curso / **por comunidade** / por cargo). Sem acesso, o hub devolve o servidor BLOQUEADO
(teaser) e a página passa um **`lockedView`** custom — `KidsLockedClube`/`KidsLockedMural` ("ainda não
liberado", espelham o `KidsLockedStudio`); senão cai no genérico `KidsLockedSpace`. ⚠️ **O cliente trata
403 `ACCESS_DENIED` como bloqueado** (`forbidden` → `lockedView`), NÃO como erro: um servidor SEM teaser
(`teaserWhenLocked` false — padrão de quem cria pelo admin) faz o hub 403ar em vez de devolver o teaser
`locked`, e sem isso a criança via um toast "sem acesso" + "espaço não encontrado" (bug 28/06: Clube
criado pelo admin sem teaser). Servidores kids são itens FIXOS do menu → não há existência a esconder.
(O seed do hub também reconcilia `teaser_when_locked=true` nesses 2 slugs.) ⚠️ O Estúdio é DIFERENTE:
NÃO é servidor do hub, então lá o gate é na página mesmo
(`checkStudioAccessReadonly`). **Setup do operador (vender como produto):** no admin, "Quem vê = Por
comunidade" + a chave do produto (Clube → `clube-dos-criadores`; Mural → `mural-dos-criadores`,
independente, bônus do desafio do 1º jogo) — a MESMA chave do produto de comunidade no catálogo.
O componente único `components/kids/kids-space-view-client.tsx` (movido
de `app/(app)/comunidade`)
recebe `slug` + `mode`: no `wall` esconde o composer/sidebar e renderiza CARDS de projeto (capa +
título + resumo + "por {authorDisplayName}"); a criança só comenta (moderado) e reage. **Vitrine
(Mural) — publicação por "Compartilhar" (06/2026):** UM único caminho — o botão **"Compartilhar"** na
Topbar do `StudioBlockView`, ligado SÓ no bloco da ÚLTIMA aula do projeto
(`enableShare={Boolean(content.showcase?.enabled)}` em `kids-lesson-blocks` — a vitrine marcada pelo admin;
o members manda o `content.showcase` inteiro ao aluno, então o flag já chega). Nas aulas intermediárias o
botão NÃO aparece (a criança não publica antes de terminar). Publica via `/api/studio/{describe,publish}`
com **descrição gerada por IA** que a criança edita + um **link público de jogar**; o post é um SNAPSHOT
imutável e independente do rascunho, e o member-shell normaliza o JSON jogável antes de persistir no R2
privado. ⚠️ O antigo **"Publicar no Mural" da `LessonCelebration` (`PublishToMural`) foi REMOVIDO** (fazia
a MESMA coisa, sem descrição editável nem play link); `lesson-player-client`/`lesson-celebration` não
consomem mais o `showcase` da resposta do complete (o members ainda devolve, inócuo). **Ao publicar com
sucesso, o `onShared` do `StudioBlockView` abre a `MuralCelebration`** (`mural-celebration.tsx` — overlay
do Zappy + confete + o **link público de "Jogar"** como herói, no lugar da tela de sucesso sóbria do
editor); o `StudioBlockKids` (em `kids-lesson-blocks`) guarda o estado e a dispara. O confete virou
`kids-confetti.tsx` (`<KidsConfetti>`, compartilhado com a celebração de aula) e **toca um som de
comemoração ao surgir** (`public/sounds/celebracao.mp3`, vol 0.6, 1× no mount — dentro da janela de
autoplay pós-clique; bloqueado/sem arquivo → silencioso; `sound={false}` desliga). O card do Mural
(`kids-space-view-client.tsx` `ShowcaseCard`/`ThreadDetail`) ganhou, quando há `thread.playId`, os botões
**"Jogar"** (abre `/jogar/<playId>` em nova aba) + **"Copiar link"** (`navigator.share` com fallback
clipboard) — a raiz do card deixou de ser `<button>` (âncora não aninha em button). A **página PÚBLICA**
`app/jogar/[id]/page.tsx` (FORA do grupo `(app)`, sem login, igual a `/perfis`) renderiza o
`StudioProjectPlayer` (subpath `@sistemazero/studio/player`, `ssr:false`) buscando o projeto em
`/api/studio/play/:id` — mostra SÓ o jogo + título, NUNCA o nome da criança, e tolera snapshots
legados/incompletos sem derrubar a página pública. As rotas `/api/studio/{describe,
publish,play/[id],cleanup}` são shims sobre `shell.routes.studio*`; o `proxy.ts` exclui `api/studio/publish`
(multipart), `api/studio/play` (stream público) e **`api/studio/cleanup`** (S2S do hub, HMAC — limpeza de
R2 na moderação: apagar post do Mural → apaga snapshot jogável + capa) do matcher (`api/studio/describe`
FICA no matcher — ganha o anti-CSRF same-origin). **Data de nascimento (controle de idade):** os pais informam no `ProfileForm` da Área dos
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
`shell.routes.studioPublishStandalone`; o hub re-valida a posse do produto). **Persistência LOCAL por
NAVEGADOR + PERFIL (06/2026):** projetos no IndexedDB do aparelho, **isolados por PERFIL** — a `EstudioPage`
passa `session.id` (perfil ativo) como `viewerId` ao `StudioFullClient`, que chama
`setStudioStorageNamespace(viewerId)` ANTES da `ProjectList` → cada criança tem seu DB
`sistema-zero-studio-<perfil>` (irmãos no mesmo navegador NÃO compartilham mais a lista; acesso segue pela
CONTA). A LIÇÃO usa o store padrão (`StudioBlockView` reseta o namespace p/ `''`; lá o isolamento é pelo id
do projeto por perfil). ⚠️ **O Estúdio Completo vai virar produto do ADULTO também** (não só kids): o
mecanismo já é app-agnóstico (`setStudioStorageNamespace(session.id)` — perfil no kids, CONTA no adulto);
quando o adulto ganhar a rota, o `StudioFullClient` deve ir p/ o member-shell (reuso, não cópia) e a página
do adulto passa `session.id` igual. **LARGURA TOTAL:** o `MainContainer`
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

### Full review do Clube dos Criadores (07/2026, EM PRODUÇÃO)

O Clube virou fórum kids de 1ª classe — aconchegante, com ROSTO, recompensa, professores e
notificações. **Rosto + áurea do nível + 1º NOME de TODO autor:** o `kids-space-view-client.tsx`
renderiza um `AuthorBadge` = `AvatarWithAura` (foto do boneco 3D + aura do nível, igual ao resto do
app) + nome nas linhas de tópico, comentários e cards do Mural; `displayAuthor`/`authorText`
mostram o 1º nome p/ TODOS ("Colega" só como fallback SEM nome), e o link `/crianca/[id]` segue SÓ
p/ autor público (opt-in dos pais). Os dados (`authorAvatarUrl`/`authorLevel`) vêm do BFF em LOTE
(member-shell `GET /members/avatars`, revelado só na vitrine kids via `revealNames` do
`redactAuthors`). ⚠️ **Decisão registrada:** a URL do avatar embute o profileId no R2 → mostrar
avatar de não-públicos EXPÕE esse id na string (o `authorId` cru segue redigido) — aceito.

**Aconchego:** cabeçalho acolhedor (mascote Zappy) só no modo fórum; **canais com emoji/cor** via
novo `channel-presentation.ts` (mapa PURO slug→{emoji,colorVar,emptyState}, padrão de
`badges.ts`/`room-catalog.ts`; troca o ícone `Hash`); **estados vazios ilustrados** por canal;
**reações ampliadas** (`QUICK_EMOJIS` 5→8, dentro da allowlist do hub) com "pop" no toque;
**locked screen** (`kids-locked-clube.tsx`) com prévia do que tem dentro. **Combinados do Clube —
`clube-combinados.tsx`** (`ClubeCombinados`): modal que ABRE na 1ª visita (gated por `localStorage
'sz:kids:clube:onboarded:<viewerId>'`, padrão do `level-up-watcher`) + botão "Combinados" sempre no
cabeçalho (regras gentis, `useModalA11y`/Dialog); **chips de sugestão** no composer
(`SUGGESTION_STARTERS`) pré-preenchem o título.

**Canal "Recados da equipe" (`staff_only`):** professores postam recados/avisos, a criança só LÊ e
reage; o `channel-presentation` dá 📣 + empty state próprio e o sidebar mostra o cadeado (seed do
hub, rodado local/staging/prod 04/07). **Cross-link Mural↔Clube — `GamePicker`** no composer
("Mostrar meu jogo"): lista os jogos da própria criança (fetch `/api/hub/my-threads`, `playId !=
null`) e seta `playId` no `createThread`; o `ThreadDetail` passou a mostrar o card
`PlayLinkActions` ("Jogar") TAMBÉM no Clube (guard relaxado de `isWall && playId` → `playId`); shim
novo `app/api/hub/my-threads/route.ts`. **Sino "novas respostas" — `clube-activity-bell.tsx`**
(`ClubeActivityBell`): busca `/api/hub/my-threads`, diffa `commentCount` contra um baseline em
`localStorage 'sz:kids:clube:seen:<viewerId>'` e mostra pontinho + lista; marcar como visto
atualiza o baseline (fica no cabeçalho do Clube).

**Recompensa por participar:** badge nova **`clube-primeiro-post`** ("Voz da turma", ícone
`MessagesSquare`) em `badges.ts` `BADGE_INFO` — 1ª conversa APROVADA (ledger `clube_thread` do
members). ⚠️ Espelha o members `BADGE_SLUGS` + member-shell `BadgeSlug` (lockstep, travado por
`tests/badge-conformance.test.ts`). O members também dá XP (thread +5, comment +3) na aprovação e
as missões `daily-clube`/`weekly-clube-3`. **Prominência no mobile:** `app/(app)/criar/page.tsx` —
o Clube saiu do rodapé "E também" e virou **card-herói no TOPO** (acima do trio Pensa→Pinta→
Estúdio), com `MessagesSquare` + copy calorosa.

## Recados do professor (canal de retorno — 07/2026)

O aluno sempre falou com o professor (entrega do Estúdio, Mural, "avisar professor") mas nada
voltava. **Recados** é o canal de VOLTA: o professor responde a atividade travada / avisa que
resolveu / dá o motivo de esconder um jogo no Mural, e o aluno LÊ e RESPONDE. Item **"Recados"**
(`Mail`) na sidebar (`nav.ts`) → rota **`/recados`** (`protectedPrefixes`): página lista as
conversas (`listTeacherThreadsReadonly` no server, "NOVO" no não-lido) e `/recados/[threadId]`
abre a conversa (`recado-thread-client.tsx`: carrega + marca lida + bolhas professor/"Você" +
caixa de resposta, tudo client via `apiGet`/`apiSend`). **Sino `recados-bell.tsx`** na
`MobileTopbar` (a tab bar de 5 não cabe mais um item): busca `/api/members/teacher-threads/
unread-count` (**server-backed por watermark**, NÃO baseline localStorage como o do Clube) e mostra
o pontinho + atalho p/ `/recados`. Shims em `app/api/members/teacher-threads/*` (1 linha sobre
`shell.routes.teacherThreads*`). Texto do aluno é PLAIN (React escapa). Toda a LÓGICA/segurança é do
member-shell (ver o CLAUDE.md de lá) + members (portão/posse); aqui é só apresentação.

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
   curso (kids segue SEM `FUNNEL_URL`). ⚠️ **Identidade no agradecimento = a CRIANÇA, nunca o
   responsável (28/06):** `RatingViewer` é `{name, age, avatarUrl}` montado na `page.tsx` do
   perfil ATIVO (`listProfilesReadonly` → o perfil `id == session.id`): **nome do PERFIL** +
   **idade** (`computeAgeFromBirthDate(birthDate)` do member-shell; sem nascimento → só o nome) +
   foto do perfil. NUNCA e-mail nem `session.firstName/lastName` (= conta do responsável). O
   watermark do player (`viewerWatermark`, antigo `viewerEmail`) virou `Perfil <id8>` (rótulo do
   perfil, sem PII do responsável) — não mais o e-mail; o download de PDF/ebook segue marcando com o
   e-mail da CONTA server-side (rastreabilidade anti-pirataria, fora da tela).
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

## Pensa (planejamento guiado — produto vendável, 07/2026)

O **Pensa** (`@sistemazero/pensa`) é o app da metodologia ZERO onde a criança PLANEJA o jogo
antes de construir no Estúdio: projeto → ciclos "Versão N" → etapas **Z** (Zerar a Bagunça,
chat com o Zappy pelas 5 perguntas) / **E** (Enxergar o Jogo) / **R** (Rodar as Missões) /
**O** (O Grande Lançamento). Item "Pensa" no `nav.ts` (Lightbulb, entre Mural e Pinta — o trio
criativo Pensa→Pinta→Estúdio anda JUNTO no menu) → rota
`/pensa` (`protectedPrefixes`), gate de produto em 3 ESTADOS espelhando o `/estudio`:
`app/(app)/pensa/page.tsx` chama `checkPensaAccessReadonly()` (`GET /members/access?refs=pensa`;
ref = `PENSA_ACCESS_REF` do member-shell) → 200 sem produto = `KidsLockedPensa`; status ≠ 200 =
`KidsPensaUnavailable` (retry); com acesso = `pensa-client.tsx` (`'use client'`, import dinâmico
do pacote no effect, tema do next-themes, **`mascotImages` = os sprites `/zappy/*.webp`** — a
carinha do Zappy dentro do Pensa). Diferente do Estúdio (IndexedDB), a persistência é
BACKEND (members, tabelas `pensa_*`) — o client injeta um **transport** que prefixa `/api/pensa`
(shims de 1–3 linhas sobre `shell.routes.pensa*`; o chat SSE `/api/pensa/chat` tem
`force-dynamic`). Erros do transport são duck-typed `{status, code}` (a classe não atravessa o
dynamic import). `MainContainer` dá largura total a `/pensa` (kanban/Modo Missão). Requisitos de
build: `transpilePackages` + `@import` do `pensa.css` + `@source "../../../pensa/src"` no
globals.css (MESMO gotcha das utilitárias `sz-*` do Estúdio — sem isso as `pz-*` são no-op).
`api/pensa/*` fica DENTRO do matcher do proxy (JSON pequeno; a resposta SSE não é bufferizada
pelo middleware). Deploy: `packages/pensa/**` nos watchPatterns do railway.json + case no ci.yml.

## Pinta (editor de assets de jogos — produto vendável, 07/2026)

O **Pinta** (`@sistemazero/pinta`) é o ateliê onde a criança DESENHA os assets dos jogos: pixel
art (personagens com ANIMAÇÕES + prévia rodando, cenários), peças/mapas e desenho livre —
terceiro irmão do fluxo criativo (**Pensa planeja → Pinta desenha → Estúdio constrói**). Item
"Pinta" no `nav.ts` (Palette, imediatamente antes de Estúdio) → rota `/pinta`
(`protectedPrefixes`), gate de produto em 3 ESTADOS espelhando o `/estudio`:
`app/(app)/pinta/page.tsx` chama `checkPintaAccessReadonly()` (refs `pinta,estudio-completo` numa
ida — a 2ª vira `studioOwned`, copy da ponte) → 200 sem produto = `KidsLockedPinta`; status ≠ 200
= `KidsPintaUnavailable` (retry); com acesso = `pinta-client.tsx` (`'use client'`, import
dinâmico no effect, tema do next-themes). **Sem backend próprio**: a galeria vive no IndexedDB
POR PERFIL (`setPintaStorageNamespace(viewerId)` ANTES de montar — mesmo contrato do /estudio) e
a ponte **"Usar no Estúdio"** grava na biblioteca pessoal do Studio
(`@sistemazero/studio/personal-assets` → `savePersonalAsset`, upsert por id) — o desenho aparece
em "Meus desenhos" no painel de Imagens do `/estudio` do MESMO perfil. `MainContainer` dá largura
total a `/pinta`. Requisitos de build: `transpilePackages` + `@import` do `pinta.css` +
`@source "../../../pinta/src"` no globals.css (MESMO gotcha das utilitárias `sz-*`/`pz-*` — sem
isso as `pin-*` são no-op e os modais saem washed-out). Deploy: `packages/pinta/**` (e
`packages/studio/**`) nos watchPatterns do railway.json + case `packages/pinta/*` no ci.yml.
Produto no catálogo: sku/slug/chave **`pinta`** (seed idempotente, R$97 placeholder).

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
  (forward-compat). Inclui a de PARTICIPAÇÃO **`clube-primeiro-post`** ("Voz da turma", `MessagesSquare`
  — 1ª conversa aprovada no Clube; ver §Full review do Clube dos Criadores).
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
- **Nível do aluno (rank, 06/2026; rótulos kid-friendly 07/2026: Faísca→Construtor(a)→Inventor(a)→Mestre dos Jogos→Lenda — slugs internos noob…god NÃO mudam)** — `lib/level-info.ts` (`LEVEL_INFO` rótulo/cor/ícone +
  `levelInfo()`/`nextLevelHint()`; cor = CSS var `--level-<slug>` em `globals.css` `:root`+`.dark`),
  `components/kids/avatar-with-aura.tsx` (`AvatarWithAura` — anel/brilho na cor do nível ao redor do
  `KidsAvatar`, estático p/ reduced-motion) e `level-badge.tsx` (`LevelBadge` — insígnia ícone+nome).
  Usados no **perfil** (`profile-client.tsx`: aura no avatar + insígnia + linha "faltam X projetos…"
  via `nextLevelHint`), no **menu** (`user-menu.tsx`: aura no avatar do header + insígnia no dropdown)
  e no **perfil público** (`public-profile-view.tsx`: aura + insígnia). O nível vem de
  `gamification.level` / `PublicProfileDTO.level` (members deriva). A **dificuldade do CURSO** (≠ do
  nível do aluno) é o `course-level-chip.tsx` (`CourseLevelChip`) sobre a capa nos cards
  (`course-card.tsx`/`catalog-course-card.tsx`). **COMEMORAÇÃO de SUBIDA de nível:**
  `level-up-celebration.tsx` (overlay Zappy + confete + som + insígnia GRANDE na cor do nível,
  `useModalA11y`, auto-fecha em 7s) disparada pelo `level-up-watcher.tsx` (cliente) — compara o
  `level.slug` do servidor com o ÚLTIMO visto em `localStorage` (`sz:kids:level:<profileId>`) e
  comemora UMA vez quando SOBE, seja por publicar no Mural OU por concluir um curso já publicado
  (não amarrado a uma ação). NÃO comemora na 1ª carga (sem valor salvo) nem em queda. Montado no
  `(app)/layout.tsx` via `LevelUpChrome` (server, só sessão de PERFIL, gamificação deduplicada
  `{withRanking:true}`). ⚠️ Para refletir NA HORA após publicar, o `StudioBlockKids` chama
  `router.refresh()` ao fechar a `MuralCelebration` → o layout re-busca o nível → o watcher acende
  (sequência "no Mural!" → "subiu de nível!"). O marco `course_showcased` no members é gravado
  SÍNCRONO no fluxo do publish (hub aguarda o webhook), então o refresh já vê o nível novo.
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
  da foto (girar é só pra ADMIRAR — a foto sai de frente). **Captura (`SnapshotBridge`) = câmera própria**
  (`position.set`+`lookAt` explícitos, igual nos dois p/ ser confiável) p/ caber no quadrado central:
  "Salvar" força RETRATO de rosto (imagem do avatar sempre boa); "Tirar foto" usa o CORPO INTEIRO de FRENTE,
  afastado o bastante p/ cabeça+pés caberem no quadrado (distância por altura×proporção da tela). ⚠️ tentar
  "respeitar a órbita" via `getWorldDirection`/`quaternion.copy` saiu **vazio/sem cabeça** — NÃO refazer. A grade mostra **MINIATURAS = PNG estático**
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
  `base/Poses.glb`. **GLB SIMPLES (sem Draco/KTX2/meshopt → sem WASM, CSP-safe)** — ⚠️ **TODA chamada `useGLTF`/
`useGLTF.preload` PASSA `(url, false, false)`** (sem Draco, sem Meshopt): o drei v10 LIGA o
decoder Meshopt por padrão e ele **instancia WebAssembly ao ser configurado** → a CSP do kids
(`script-src` SEM `wasm-unsafe-eval`, decisão de segurança infantil) bloqueava com um
`CompileError` no console (regressão silenciosa — o avatar carregava, mas o erro assustava). O cache
do drei é por URL, então preload e load PRECISAM concordar nos args (avatar-rig/asset-part/thumb-canvas).
A `<Canvas>` precisa de
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
- **Missões diárias/semanais/mensais — `missions-panel.tsx`** (na home): painel estilo Duolingo com
  TRÊS seções — "Hoje", "Esta semana" e **"Este mês"** (reforma 07/2026); busca `GET
  /api/members/gamification/missions/me` (`{daily, weekly, monthly}`) e resgata `POST /api/members/
  gamification/missions/:slug/claim` (idempotente; **o servidor REVALIDA a conclusão** — o cliente nunca
  decide). Prêmio = XP + Zappy (com teto diário); claim NÃO move streak. Degrada em silêncio se a
  gamificação estiver indisponível. **Cadências recalibradas (~1 aula/dia)** + novas fontes: `missionLabel`
  mapeia os goalTypes novos (enviar ao professor `studio_submitted`, publicar jogo `course_showcased`,
  classificar curso `course_rated`, decorar quarto `room_item_buy`, personalizar avatar `avatar_part_buy`,
  comentar no Mural `mural_comment`, **lançar jogo standalone `studio_published` e remixar
  `studio_remix` — retenção pós-cursos 07/2026, gated por estudio-completo**) além de
  aula/quiz/baú/clube. Missões de **Clube e Estúdio são GATED** no
  members (só aparecem p/ quem tem o produto; quem TEM o Estúdio ganha 1 missão dele GARANTIDA no set
  semanal e no mensal). Badges novas `plays-10`/`plays-100` ("um jogo seu foi jogado 10×/100×" —
  universais; a de 100 concede o troféu `trofeu-estrela-do-mural` no quarto) em `badges.ts` +
  `lib/room-catalog.ts` + case em `furniture-models.tsx`. A APRESENTAÇÃO só reflete o que o backend
  manda (a lógica de cadência/gating/marcos vive no members — ver o CLAUDE.md de lá §Missões).
- **Proteção de sequência — `streak-protection.tsx`** (no perfil): mostra/gerencia **férias**
  (janela que não exige presença) e **protetores/freezes** (1 grátis por mês + compráveis com Zappy,
  teto 5) — a sequência só QUEBRA quando NEM férias NEM freezes cobrem o gap.
- **Liga semanal — `league-board.tsx`** (no perfil): ranking da coorte da semana (sobe/desce de
  divisão), a versão real do antigo backlog "ligas". **Rosto+nível+1º nome dos colegas (07/2026):**
  cada linha usa o `AvatarWithAura` (foto do avatar 3D + aura do nível) + o 1º nome do colega
  (ausente → "Colega"); "Você" se destaca. Nome vira `<Link>` p/ `/crianca/[id]` SÓ p/ perfil
  público (opt-in dos pais) — espelha o Clube/Mural. Os dados (`photoUrl`/`levelSlug`/`firstName`/
  `profileId`) vêm ENRIQUECIDOS do members (`GetLeagueService` hidrata em lote; ver members). Chave
  da lista = índice (posição empata no competition ranking; `biome-ignore noArrayIndexKey`).
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

## Fase 5 — Carreira/Projeto transversal/Troféus/Plays/Remix/Desafio (07/2026, não commitado)

> ⚠️ **Restrição central**: Pensa/Pinta/Estúdio/Clube/Mural são produtos VENDIDOS À PARTE — nada
> da jornada/gamificação nuclear DEPENDE deles; integrações cross-app só aparecem com a POSSE
> dos dois lados (`GET /members/access?refs=csv`). Ver memória `produtos-vendidos-a-parte.md`.

- **Troféus no quarto (A):** aba "🏆 Troféus" no `room-builder` (ganho = posicionável; não-ganho =
  cadeado + dica `TROPHY_HINT` de `lib/room-catalog.ts`, sem preço — tier `trophy` não é comprável);
  6 modelos low-poly em `furniture-models.tsx` (+ material `gold`). Badge nova `first-showcase` em
  `badges.ts`; a `lesson-celebration` mostra "🏆 Um troféu novo apareceu no seu quarto!" quando a
  badge destravada está em `TROPHY_BADGE_SLUGS`. Conformance kids×members cobre os itens.
- **Carreira (B):** `career-timeline.tsx` no `/perfil` — escada universal Faísca→Lenda (rung atual +
  `nextLevelHint`) + FEITOS como cartões (universais primeiro; badges `studio-*`/`pensa-*` agrupadas
  em "Bônus dos apps criativos"; troféu → link "veja no seu quarto") + linha de jogos/jogadas. O
  `CreatorCareerCard` (home) ganhou "seus jogos já foram jogados N vezes" + "Ver minha carreira"
  (dados de `shell.hub.myShowcaseStatsReadonly()`, best-effort).
- **Plays (B):** cards/detalhe do Mural mostram "🎮 N jogadas" (`thread.playsCount`; contado no
  resolve público do /jogar com dedupe ip:playId no BFF).
- **Remix (B):** página do Mural checa `checkStudioAccessReadonly` → `canRemix` no
  `KidsSpaceViewClient`; botão "Fazer a minha versão" no `PlayLinkActions` (só com posse do
  Estúdio) → fetch `/api/studio/play/:id` → `setStudioStorageNamespace(viewerId)` →
  `importProjectSnapshot(snapshot, {name: 'Remix de <título>'})` → toast + push `/estudio`.
  **Gamificado (retenção pós-cursos 07/2026):** após importar, dispara best-effort
  `POST /api/studio/remix {playId}` (shim novo sobre `shell.routes.studioRemix`, DENTRO do matcher
  do proxy — JSON pequeno, ganha o anti-CSRF) → marco da missão `weekly-remix`/`monthly-remix-3` no
  members (que valida posse + playId real no hub + recusa self-remix; o toast não espera).
- **Projeto transversal Pensa↔Pinta (C):** a página `/pensa` também checa
  `checkPintaAccessReadonly` (best-effort) → `pintaOwned` no `PensaClient`, que SÓ então liga o
  `onOpenPinta` — o intent da missão de arte vai por `sessionStorage sz:pinta:intent`
  (`components/kids/pinta-intent.ts`: chave + reader/clear compartilhados) e o `pinta-client` o lê
  1x no mount (lazy useState + clear em efeito) → `adapter.initialIntent` (o Pinta abre o "Criar
  novo" pré-configurado; asset nasce com `projectRef` e a galeria agrupa por jogo).
- **Desafio do MÊS (D — game jam, decisão da usuária: MENSAL e só Clube+Estúdio):** card
  `challenge-card.tsx` na home SÓ com as duas refs (`checkChallengeAccessReadonly`, 1 ida; tema de
  `getChallengeReadonly` — determinístico global, `m:YYYY-MM` SP); o `/estudio` passa
  `challenge={key,title}` ao `StudioFullClient` → checkbox "Participar do Desafio" no Compartilhar
  (o publish leva `challengeKey`; gate REAL no hub com drop silencioso); o Mural ganha a PRATELEIRA
  "🏆 Desafio do mês" no topo (posts com `challengeKey` do mês — visível a quem vê o Mural; a
  posse só é exigida p/ PARTICIPAR). Participar = marco `challenge_entry` (XP 50 + badge
  `challenge-first`) via webhook hub→members.
- **Report dos pais (E):** o card de cada filho na Área dos pais (`perfis-client.tsx`
  `ChildStatsCard`) ganhou o bloco **"Esta semana"** (`ChildWeekBlock`: destaques em uma linha
  a partir de `child.week` + jogos publicados no Mural em `child.games`, cada um com botão
  "Cartão" reusando o `GameCardDialog` QR; `games` nulo = hub fora, só os números) e o
  `ChildrenDashboard` ganhou o **`WeeklyReportToggle`** (checkbox "Receber o resumo da semana
  por e-mail" → `GET|PUT /api/parents/report-prefs`, shim NOVO gateado por
  `requireParentGateAccountOnly` nos DOIS métodos — mesma régua do children-stats). O e-mail em
  si é do members (job de sexta 17h SP; ver o CLAUDE.md de lá).
- **PENDENTE da Fase 5:** QA em browser + aplicar migrations members 0029–0035 e hub 0005 +
  re-rodar `templates:seed` do messaging (template `weekly-report`) + envs novas do members
  (`AUTH_BASE_URL`/`AUTH_INTERNAL_TOKEN`/`GATEWAY_URL`/`MEMBERS_HMAC_SECRET`/
  `KIDS_COMMUNITY_URL`) e do gateway (`MEMBERS_HMAC_SECRET`).

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

## Full review (correções) — 23/06/2026

4ª auditoria multi-agente (segurança/correção/perf/a11y, lente infantil), focada no que mudou
desde 21/06 (avatar 3D +32 peças, **Estúdio em largura total**, Área dos pais `?manage=1`, tokens
do Estúdio no Tailwind). **Segurança: NADA acionável** — proxy/matcher, portão dos pais (incl.
`?manage=1`, que NÃO burla a senha: `startManaging` depende do `parentVerified` calculado no
SERVIDOR pelo cookie assinado), redação de PII, R2 e CSP/CSRF seguem de pé. Achados de
a11y/correção/perf corrigidos; verde no typecheck (kids/community/admin/ui) + test:kids (24) +
test:community (5) + biome + **build dos 3 apps**.

**Compartilhados `@sistemazero/ui` (rodam TAMBÉM no community e admin — rebuildados verdes):**
- **`Dialog` ganhou gestão de foco** (a11y): foca o card ao abrir (anuncia o `aria-label`),
  PRENDE o Tab dentro e DEVOLVE o foco ao gatilho ao fechar; pilha de diálogos + lock de scroll
  refcontado (só o diálogo do TOPO trata Esc/Tab). Antes teclado/leitor ficava preso atrás do modal.
- **`Field` (label.tsx) associa a mensagem ao controle**: erro vira `role="alert"` + `id` ligado por
  `aria-describedby` no input (e `aria-invalid`). Antes o leitor dizia "inválido" sem o motivo. Vale
  p/ login/esqueci/redefinir/perfil/senha dos 3 apps.
- **`PasswordInput`: olho de revelar alcançável por teclado** (tirado `tabIndex={-1}`, +`aria-pressed`).

**Kids:**
- **Quarto 3D — MOVER PEÇA POR TECLADO (regressão do 20/06 reposta):** o redesenho 3D tinha perdido o
  caminho de teclado (só arrasto por raycast). Agora há uma LISTA de peças (`role="group"`, chips
  `aria-pressed`) p/ selecionar, e setas movem / R gira / Delete tira / Esc desseleciona (mesmos
  limites+colisão do arraste; `isFreeAt` puro; handler num ref → 1 listener estável).
- **Quarto: toast "adicionado" não mente mais** — `addItem` decide a colocação ANTES do setState
  (via `draftRef`/`updateDraft`); cheio/sem vão → toast de aviso em vez de "✨ no quarto" + peça
  fantasma (`freeFloorSpot`/`freeWallSpot` agora devolvem `null`).
- **Quarto: drag sem churn** — `moveTo` num ref; o efeito de pointer listeners (`room-canvas-3d.tsx`)
  ficou estável (era re-assinado a cada frame do arraste; fechava a janela rara de órbita travada).
- **Avatar: configurador SEGUE o tema da comunidade** (`useTheme` do next-themes, igual ao Estúdio)
  — era `prefers-color-scheme` do SO.
- **Avatar: giro da "cabine" mais suave** (~230°/s; era ~630°/s) — gatilho vestibular no PADRÃO (quase
  nenhuma criança tem `prefers-reduced-motion` no SO); o caminho reduzido segue assentando sem girar.
  `useReducedMotion` inicia já lendo o `matchMedia` (sem 1º quadro animado; consumidores são `ssr:false`).
- **Avatar: estados de seleção a11y** — abas/poses/cores com `aria-pressed`; swatch com cue NÃO-cor
  (check) + rótulo "Cor N" (era o hex cru lido pelo leitor).
- **Perfis: remover perfil usa `Dialog`** (não `window.confirm`); `parentVerified` rastreado em estado
  local (não re-pede a senha ao reabrir a Área dos pais sem reload).
- **Quiz: anúncios** — resultado aprovado/reprovado/cooldown em `role="status" aria-live` e erro em
  `role="alert"` (leitor de tela ouvia silêncio ao terminar).
- **Contraste/toque:** botões "Resgatar"/"Tirar" usam o token novo **`--sz-hot-fg`** (branco no claro,
  navy no dark — o hot é claro demais no dark p/ texto branco); Girar/Tirar ≥44px.
- **Canvas 3D com alternativa textual** (`role="img"`+`aria-label`): quarto no modo `view` (perfil
  público) e cena do avatar.
- **Perf:** `Cache-Control` p/ `/avatar3d/*` (~28MB; TTL de 1 dia — ids NÃO são hashados, então sem
  `immutable` p/ não prender uma correção de arte por um ano); perfil PÚBLICO monta o quarto 3D só ao
  entrar na viewport (**`LazyRoomCanvas`** + **`staticView`** → sem loop contínuo do pet de um colega).
- **Não alterados (decisão consciente):** comprar peça travada (avatar/quarto) segue em 1 toque sem
  confirmação (padrão deliberado da usuária — não é bug; só faltava aviso de preço no SR, fora deste lote).

## Full review (correções) — 27/06/2026

5ª auditoria multi-agente (segurança/correção/perf/a11y, lente infantil), focada no delta desde
23/06: **bloco certificado**, **Compartilhar do Estúdio + celebração no Mural**, **markdown no
quiz**, **trava sequencial** e os shims compartilhados do **member-shell** (certificate-pdf/gateway/
media/r2/private-delivery). **Segurança: NADA acionável** (as 6 invariantes seguem de pé; SSRF do
certificado com guarda DNS-rebinding + `embeddedIpv4`, `bufferFromStream` com teto, trava 423
server-enforced). **Correção/perf: sem CRITICAL/HIGH.** Achados corrigidos; verde no typecheck
(ui/member-shell/kids/community/admin) + test (member-shell 124 / kids 26 / community 5) + biome +
**build:kids E build:community**.

**Compartilhados `@sistemazero/ui` (rodam TAMBÉM no community e admin):**
- **Novo hook `useModalA11y` (`@sistemazero/ui/use-modal-a11y`)**: extrai a gestão de foco do
  `Dialog` (foca o card ao abrir, PRENDE o Tab, Esc fecha, devolve o foco ao gatilho, pilha
  refcontada + lock de scroll). O `Dialog` agora consome o hook (comportamento idêntico) e overlays
  "bespoke" (celebrações do kids) reusam a MESMA mecânica sem o chrome do Dialog. ⚠️ subpath é
  `.tsx` (wildcard `./*` → `*.tsx`, igual ao `scroll-lock`).

**Kids:**
- **Celebrações viraram modais DE VERDADE (HIGH a11y):** `mural-celebration.tsx` e
  `lesson-celebration.tsx` eram `role="dialog"` feitos à mão SEM foco-preso/Esc/restore/scroll-lock
  (regressão do fix do `Dialog` de 23/06 reintroduzida na camada de celebração — foco ficava atrás
  do backdrop, leitor não anunciava). Agora ambas usam `useModalA11y` (card = `role="dialog"
  aria-modal aria-label tabIndex=-1` + `ref`; overlay = backdrop que fecha no clique). A
  `MuralCelebration` também ganhou feedback no "Copiar link" (antes catch vazio = dead-click): aviso
  visível na falha + `aria-live` no sucesso.
- **Quiz `radiogroup` com teclado (MEDIUM a11y):** `kids-quiz.tsx` ganhou foco-roving (a opção
  marcada é o único tab-stop) + setas/Home/End que movem foco E seleção (padrão ARIA radiogroup;
  antes cada opção era um tab-stop e as setas não faziam nada). + **markdown do enunciado/opções
  memoizado por pergunta** (`useMemo` por `activeQuestion` — selecionar resposta não re-parseia mais).
- **Certificado em tom kids (MEDIUM copy/a11y):** `CertificateBlockView` (member-shell) ganhou a
  prop **`tone: 'default' | 'kids'`** — o kids passa `tone="kids"` em `kids-lesson-blocks` (copy sem
  "emissão"/jargão/travessão: "Pegar meu certificado" etc.). O estado de carga virou `role="status"`
  e a virada bloqueado→elegível→emitido vai numa região `aria-live="polite"` (leitor anuncia; antes
  só o erro tinha `role="alert"`). É código do SHELL — roda nos dois apps (rodei as duas suítes).
- **"Continuar" lock-aware (LOW):** `cursos/[slug]/page.tsx` `nextLesson()` pula aulas TRAVADAS
  (1ª não concluída E desbloqueada → 1ª desbloqueada → 1ª), defensivo p/ o herói nunca apontar p/ um
  cadeado.
- **`%` de missão sem estouro (LOW):** `missions-panel.tsx` clampa `Math.min(100, …)` + guarda
  `target > 0` (evita >100% / NaN).
- **Não alterados (decisão consciente):** verificações de segurança da revisão acharam tudo de pé;
  copy do certificado revogado fica neutra; som da celebração já respeita reduced-motion/autoplay.

## Full review (correções) — 28/06/2026

6ª auditoria (segurança/correção/perf/a11y, lente infantil), focada no delta desde 27/06:
**refator dos modais da Área dos pais** (`ParentPasswordChange`/`ParentGate` → `Dialog`
compartilhado, com `form={formId}` ligando o submit do rodapé ao `<form>` do corpo). **Segurança:
NADA acionável** — proxy/matcher, portão dos pais (cookie HMAC + cooldown por conta), redação de
PII no Mural/hub (`renderUgcMarkdown`, `authorId` de terceiros redigido, `viewerId` nunca exibido),
R2/CSP/CSRF e os shims (todos 5–11 linhas, salvo `client-error`/`parents/verify`, exceções
documentadas) seguem de pé. **Sem CRITICAL/HIGH/MEDIUM confirmado.** O refator do `Dialog` foi
VERIFICADO correto (submit por `form=`, ids distintos, `onClose` travado em `!saving`/`!busy`,
foco/trap/restore via `useModalA11y` — ganho a11y vs. o overlay pelado antigo, sem Esc/backdrop).
Verde: typecheck + test (26) + biome + `build:kids`. Achados LOW corrigidos:

- **Férias com período inválido (LOW):** `streak-protection.tsx` habilitava "Ativar férias" com
  `from > to` (servidor recusava com toast genérico). Agora `invalidRange` (compara `YYYY-MM-DD`
  como texto) desabilita o botão + hint `role="alert"` ("a data de início precisa vir antes…").
- **Corrida de troca de canal (LOW):** `kids-space-view-client.tsx` — `loadThreads` setava o estado
  sem guarda; clicar canal A→B podia renderizar as threads de A sob a seleção de B (se A resolvesse
  por último). Agora o efeito passa `isCurrent` (flag `alive` na cleanup, espelha o efeito de carga
  do espaço) e o `setThreads`/toast só rodam se o canal ainda é o atual.
- **Timer órfão na celebração do Mural (LOW):** `mural-celebration.tsx` — o `setTimeout` do "Link
  copiado!" não era limpo ao fechar antes de 2s; agora vive num `ref` limpo no unmount (consistência
  com o resto; React 18+ não avisa mais, mas evita o timer pendente).
- **Não alterados (decisão consciente / latente):** `asset-part.tsx` muta o material `Color_*` do
  GLB cacheado in-place — BENIGNO no estado atual (miniaturas são PNG estático → só 1 consumidor vivo
  do GLB por vez; o fallback ao vivo CLONA antes de recolorir); vira risco só se duas peças com o
  MESMO URL+cor diferente renderizarem juntas. Mantido como está; clonar como o `thumb-canvas` é
  endurecimento opcional, não correção. Sem-PIN entre irmãos e nome no perfil
  público (opt-in) seguem decisões de produto. ⚠️ **Compra em 1 toque MUDOU (07/2026, lote UX kids)**:
  avatar e quarto agora têm **confirmação LEVE em 2 toques** — 1º toque numa peça/item travado VESTE de
  prévia (avatar; o `hasLocked` já bloqueava o Salvar) ou arma a confirmação (quarto), mostra barra com
  preço + "Deixar para depois" (desfaz a prévia) e o chip do item vira "Comprar? N"; o 2º toque no MESMO
  item compra. A confirmação só desarma no SUCESSO (falha por saldo mantém a barra p/ desistir).
  `configurator.tsx` (`pendingBuy`/`cancelPendingBuy`) e `room-builder.tsx` (`confirmBuyId`/
  `resolvePendingBuy` + `PriceChip`). No MESMO lote UX: cooldown do quiz 5min→90s (members) com copy de
  "hora de revisar"; ranks renomeados (ver Nível do aluno); StreakCard/MissionsPanel ganham placeholder
  gentil quando a gamificação está fora (não somem mais); copy do catálogo/vazios em tom kids.

## Full review (correções) — 28/06/2026 (2ª passada — refator do gate Clube/Mural)

7ª auditoria, focada no delta que trocou o gate de produto da PÁGINA pelo **portão único do hub**
("Quem vê"): Clube/Mural agora só renderizam o `KidsSpaceViewClient` (sem
`checkClube/MuralAccessReadonly`), que distingue BLOQUEADO (teaser → `lockedView`) de INDISPONÍVEL
(`ACCESS_UNAVAILABLE`/503 → tela de retry). **Segurança: NADA acionável** — o hub é a fronteira de
conteúdo e a aplica SERVER-SIDE (`/channels` → 403 quando locked; members fora → 503; provado em
`hub/tests/integration/access-read.test.ts`), e o `ApiError` carrega `status`/`code` do envelope. As
refs antigas (`checkClube/MuralAccessReadonly`) sumiram do repo inteiro — zero dead code. Verde:
typecheck + test (26) + biome + build:kids. Achado corrigido:

- **Botão "Tentar de novo" virou clique-morto (MEDIUM):** a decisão "indisponível" saiu da página
  (server) p/ o estado do `KidsSpaceViewClient` (client), mas `KidsAccessUnavailable` seguia só com
  `router.refresh()` — que PRESERVA o estado do client e NÃO re-dispara o efeito de carga (deps
  `[slug, mode]`), deixando `unavailable` grudado. Uma criança COM acesso, num soluço transitório do
  hub/members, ficava presa (só reload duro recuperava). Agora `KidsAccessUnavailable` aceita `onRetry`
  e o client passa um retry REAL (`reloadNonce` no deps do efeito → volta ao skeleton e refaz o fetch);
  o prop `unavailableView?: ReactNode` virou `unavailableTitle?: string` (a tela interativa nasce no
  client p/ receber o callback — função não cruza a fronteira server→client).
- **Verificados de pé (não-bug):** contraste do `CourseLevelChip` (cor só no pontinho, texto em
  `text-foreground` = AA garantido) e a grade responsiva do `catalog-filter-bar` (mobile 2-col, sm+
  flex-wrap) — corretos, sem regressão.

## Full review (gamificação — Fase 5) — 03/07/2026

8ª auditoria, focada na gamificação (delta Fase 5 + conformância kids × members). Gating cross-app
(Desafio exige Clube+Estúdio; Remix exige Estúdio; Pensa↔Pinta exige Pinta) e degradação best-effort
auditados e **de pé**. Achados corrigidos; verde no typecheck+test+check (members/member-shell/kids)
+ `build:kids` E `build:community`.

- **Badge `challenge-first` INVISÍVEL (ALTO):** o members concede a badge do Desafio do mês
  (XP 50, ledger `challenge_entry`) mas o union `BadgeSlug` do **member-shell** estava 1 slug atrás
  (21 vs 22 do members) → `BADGE_INFO` (kids) omitia a entrada e COMPILAVA (o `Record<BadgeSlug,…>`
  é sobre o union defasado); `badgeInfo()` caía em `null` e a badge sumia de TODA superfície
  (showcase/carreira/celebração). Fix: `+'challenge-first'` no union (`member-shell/src/lib/types.ts`)
  + entrada em `BADGE_INFO` (`badges.ts`, ícone `Swords`). **Guard novo:**
  `packages/community-kids/tests/badge-conformance.test.ts` assere `BADGE_SLUGS` (members, módulo
  PURO por caminho relativo) == chaves de `BADGE_INFO` (kids) — o teste vive no KIDS (não no members)
  porque `BADGE_INFO` importa lucide + o alias `@/lib/types`, que o `tsc` do members não resolve.
- **Prateleira "Desafio do mês" incompleta (MÉDIO):** o shim já repassava `?challenge=m:YYYY-MM` ao
  hub (que devolve SÓ os posts do mês), mas o `KidsSpaceViewClient` nunca enviava — a prateleira era
  filtro client-side da página carregada (entradas fora da 1ª página só em "Carregar mais"). Agora um
  fetch DEDICADO (`challengeThreads`, disparado na troca de canal, best-effort com fallback ao filtro)
  monta a prateleira com TODAS as entradas; a grade "others" segue excluindo os posts do desafio.
- **Copy das badges do Estúdio (BAIXO):** `studio-first/-master-3/-master-10` diziam "projetos
  criados", mas o critério real é `studio_passed` (atividades com NOTA) — alinhado à dica do troféu.
- **Literais soltos (BAIXO):** `course-trail.tsx` tirou o "+25 XP" hardcoded do baú ("Baú aberto!");
  `kids-quiz.tsx` trocou o fallback `?? 100` da nota mínima por `null` (nunca há caminho real sem valor).

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

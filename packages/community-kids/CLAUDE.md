# CLAUDE.md — @sistemazero/community-kids

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.). Para **pesquisa/exploração**, use o **MCP do Octocode**.

Plataforma de cursos **KIDS/infanto-juvenil (8–13 anos)** do Sistema Zero — segundo app de área
do aluno, irmão do [`@sistemazero/community`](../community/CLAUDE.md). Next.js 16 + React 19 +
Tailwind v4, porta **3008**. Visual "estilo Duolingo" (redesign 06/2026) com a **PALETA DO TEMA
KIDS** (re-tema 07/2026, a mesma do funil kids — ver `design-tema-kids.md` no fluxo-criativo):
light = AZUL `oklch(0.52 0.15 252)` primário sobre azul-céu + LARANJA CTA (gradiente 3D
`--sz-gradient` com pontas escurecidas p/ texto claro AA) + acentos rosa/verde/amarelo; dark =
navy `#0C1E3E` com laranja claro `oklch(0.8 0.15 70)` primário e azul claro de apoio. ⚠️ Os
tokens `--brand-lime`/`--brand-cyan`/`--kids-lime`/`--kids-cyan` mantêm os NOMES históricos com
VALORES novos (lime→laranja, cyan→azul) — **trocar valor é ok, RENOMEAR é proibido** (ui e
member-shell consomem os nomes; idem `--primary`, `.brand-gradient-text`, `.sz-progress`,
`button.bg-primary…`). Radius 1rem,
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
`getAvatarReadonly()` ao Promise.all p/ a foto da aura). **"Meus cursos" = SÓ LIBERADOS (24/07):**
o grid da home filtra `careerLock?.locked !== true` (superfície de AÇÃO — travados vivem no Mapa
da Carreira) com ordenação ação-primeiro (em andamento → não começados → concluídos) + link "Ver
o mapa da carreira" no título; empty-state defensivo aponta o mapa quando tudo está travado. O
`course-card.tsx` PERDEU os estados de cadeado (foundation/reward/future — só a trilha/catálogo
renderizam trava agora). **Festa no fim do vídeo:** a
auto-conclusão a 90% ARMA a celebração (`deferredCelebrationRef` no lesson-player-client) e o
overlay completo abre no **`onVideoEnded`** (fio novo do member-shell); manual segue igual.
**Cartão do jogo com QR** (`game-card-dialog.tsx`; dep `qrcode` client-side, canvas puro
CSP-safe): botão QrCode no `PlayLinkActions` dos cards do Mural → cartão imprimível (capa +
título + QR do `/jogar/<id>`; imprimir usa `body[data-print='game-card']` + regra `@media print`
no globals.css). **`/estudio` gated pelo RANK:** `studio-full-client` passa
`level`/`allowedModes` derivados da carreira via `resolveStudioTier` (member-shell) ao
`StudioEditor` — o nível decide o MODO do editor; os BLOCOS vêm do currículo (ver a seção
abaixo).
Home com mascote + card-herói "Continuar" (`continue-hero.tsx`), **trilha serpenteante** no detalhe do curso
(`course-trail.tsx` + `trail-layout.ts` puro/testado: módulo = unidade temática
cyan→lime→rosa→verde→gradiente via `unit-theme.ts` (nomes históricos; hoje azul→laranja→rosa→
verde→laranja-gradiente), aula = nó circular; com a **trava sequencial** do curso
(`sequential_lock`, estilo Duolingo) as aulas posteriores vêm `locked` do members → nó com
CADEADO, NÃO clicável (estado `'locked'` em `trail-layout`); a mini-trilha lateral e a página da
aula seguem a mesma regra, e abrir uma aula travada por URL cai no **423** → `KidsLockedLesson`
(recado com mascote); equipe interna ignora a trava. Sem ícone por tipo: a outline não expõe
blocos).

⭐ **Módulo sem aula PUBLICADA não vira unidade (22/08/2026).** O `getMyCourse` do members filtra
as AULAS por `isPublished`, mas o módulo em si continua vindo no outline — então um módulo que a
autora ainda está montando desenhava um banner sozinho, com "0/0 aulas", um baú impossível e nada
embaixo. A régua é **`visibleModules(course)`** (`trail-layout.ts`), usada pela trilha do curso E
pela mini-trilha lateral da página da aula. Numeração ("Unidade N"), tema e o serpenteado saem do
índice do que APARECE, senão um módulo vazio no meio pularia um número na cara da criança. ⚠️ O
filtro é DAQUI, não do members: o backend segue contando e travando pelo outline inteiro, e o
percentual do curso não muda (módulo vazio não tem aula para somar). ⚠️ A comunidade ADULTA
continua como estava — o pedido foi para o kids.

⚠️ **Curso com NENHUMA aula publicada precisa de recado, não de vazio** (achado do full review):
antes os banners dos módulos preenchiam a página; escondendo-os, sobrava capa + barra de progresso
+ um vão mudo, que lê como página quebrada. O `CourseTrail` devolve um recado com o Zappy dormindo
quando `buildTrail` vem vazio.

E **celebração** ao
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
normal". A intenção de permanecer nesse modo fica em memória por `viewerId` + aula
(`guided-creation-session.ts`): o `router.refresh()` disparado ao enviar a atividade para o professor
pode remontar o player, mas NÃO fecha a criação guiada; somente "Voltar ao modo normal" a encerra
(um reload completo da página começa no modo normal). **Split ARRASTÁVEL no desktop (07/2026):**
`react-resizable-panels` (dep própria do kids —
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

## ⚠️ Classe de componente no `globals.css` vai em `@layer components`

CSS **sem camada vence QUALQUER camada** — inclusive `@layer utilities`, onde moram as
utilitárias do Tailwind. Enquanto `.sz-btn-gradient` ficou solta no arquivo, ela ganhava de
tudo: `sz-btn-gradient h-11 px-6 text-base` renderizava **40px / 18px / 14px**, ou seja, as três
utilitárias eram LETRA MORTA em ~20 CTAs (e os botões ficavam abaixo do alvo de toque de 44px que
o app segue nos demais controles). Não era specificity: as duas são `(0,1,0)` — era a camada.

Agora ela vive em **`@layer components`** e o default virou **44px** (call site sem `h-*` já nasce
acessível). **Regra para este arquivo:** classe que existe para ser ajustada no call site (tamanho,
espaçamento, tipografia) pertence a `@layer components`; deixá-la solta transforma todo `className`
do consumidor em mentira silenciosa. ⚠️ O mesmo defeito segue no `.sz-btn-gradient` do
**community adulto** (`packages/community/src/app/globals.css`) — lá só 1 dos 4 usos passa altura,
então o estrago é pequeno, mas a armadilha é a mesma.

## A trilha da Faísca é um degrau de verdade (14/08)

O curso-base saiu do Iniciante 2D e virou o degrau **`primeiros-passos-2d`** (1 posição + bônus).
Antes a divisão Faísca × Construtor(a) era só APRESENTAÇÃO — o `LEVEL_STUDY` fatiava o mesmo degrau
por `careerSlot` —, e por isso a Faísca **não podia ter curso bônus**: todo bônus do Iniciante 2D
caía na trilha do Construtor(a). Agora **cada nível é dono de um degrau inteiro**, o que apagou três
remendos de uma vez:
- `coursesForLevel` perdeu o desvio "sem curso-base marcado, mostra o degrau inteiro" (ele existia
  para a Faísca não ficar vazia com o catálogo não etiquetado);
- `trilhaHrefForCourse` (`lib/course-return.ts`) perdeu o desempate por `careerSlot` + nível do
  aluno e virou `degrau → dono`;
- a página do curso parou de buscar a gamificação só para esse desempate.

⭐ **Efeito colateral bom:** com 1 posição só, o degrau da Faísca fica CHEIO com o curso que já
existe — então a regra "não diga quanto falta enquanto o degrau não tem todos os cursos" para de
silenciar ali, e a criança volta a ler *"Falta 1 curso para você virar Construtor(a)"*, que é verdade.

## Vocabulário do ALUNO × vocabulário da EQUIPE (08/2026)

O aluno nunca lê a linguagem com que a gente MONTA o curso. Três termos são internos e não podem
aparecer na área da criança: **"curso-base"**, **"etapa"** e os nomes de degrau (**"Iniciante 2D"**,
"Avançado 3D"…). Para a criança, trilha se chama pelo POSTO dela: **"Trilha Faísca"**, **"Trilha
Construtor(a)"**. `courseTierOf`/`COURSE_TIER_LABELS` seguem vivos como LÓGICA (horizonte, trava,
admin) — o que saiu foi a exibição. O `course-level-chip.tsx` (selo "Iniciante 2D" na capa do card)
foi APAGADO por isso.

⚠️ **Nunca dizer quanto falta para o próximo posto enquanto o degrau não tem todos os cursos
publicados** (1 em Primeiros Passos e 8 em todos os demais). Com o
degrau pela metade, "faltam 2 para virar Inventor(a)" é mentira: a criança fecha os 2 e não sobe.
`careerProgress` devolve `hint: null` nesse caso e as telas silenciam; quando o degrau enche, o
`remaining` do members vira verdade e a frase volta sozinha. O retorno por curso nesse meio-tempo é
a GAVETA nova no Estúdio. As bolinhas do nó ficam, mas falam do que EXISTE ("1 de 3 aventuras
prontas"), nunca do que falta para subir — e desde 15/08 elas contam a TRILHA INTEIRA, bônus
incluído (ver "O contador do medalhão" abaixo).

⚠️ **O POSTO não anuncia mais kit de blocos.** Desde a reforma do currículo (08/2026) quem entrega
ferramenta é o CURSO; o posto entrega MODO (livre → Ponte → Pro) e PRODUTO (Estúdio+Pinta no
Construtor(a), Pensa+Zappy no Inventor(a), Molda no Explorador(a) de Mundos desde 05/09). Por isso
dois postos do meio (Mestre, Arquiteto(a)) anunciam só "um posto novo no mapa" — porque é o que
eles dão de verdade.
`CAREER_REWARD_INFO` (`lib/career-rewards.ts`) é a copy e `tests/career-rewards-conformance.test.ts`
trava as promessas contra o core E contra as constantes dos portões (inclusive proibindo nome de kit).

⚠️ **Copy sem travessão (—)**: é marca de texto de IA e a voz da casa é humana. Travado por
`tests/copy-sem-travessao.test.ts`, que lê o `src/`, descarta comentários (esses são nossos) e falha
com arquivo:linha se sobrar travessão em texto visível, `aria-label` ou `<title>`. O teste também
assere que LEU arquivos — guarda que não lê nada aprova tudo, em silêncio. O irmão
**`tests/copy-vocabulario.test.ts`** faz o mesmo com o JARGÃO ("curso-base", "etapa", "Iniciante 2D"),
que já tinha voltado duas vezes por componente novo; os dois dividem a máquina de estados em
`tests/helpers/copy-scan.ts`.

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

**⭐ Tutorial guiado dos PAIS (08/2026):** os primeiros passos confundiam (com ZERO perfis a grade
renderizava VAZIA e o "+" só existe atrás da senha). O guia **segue o ESTADO real**, não um roteiro:
cérebro PURO em `src/lib/guide.ts` (`resolveParentGuideStep` — `welcome-area`→`plus`→`form`→
`conclude-created`→`tile`; gestão de perfil antigo usa `conclude` com texto neutro) + apresentação em
`components/kids/parent-guide.tsx` (`GuideWelcomeDialog` = Dialog+Zappy com passos derivados da
família e do allowance, auto-abre na configuração do primeiro perfil
1×/conta **neste navegador/dispositivo**; famílias existentes iniciam por "Como funciona?";
`GuideBalloon` = balão responsivo no contêiner do alvo e preso à viewport em mobile — sobrevive
aos early returns do perfis-client, zero medição de coordenada;
`GuideTargetItem` mantém a largura-base do tile em 7rem para o balão não reorganizar a grade;
⚠️ **a seta é CSS puro e mira no CENTRO do balão, então o balão precisa estar centrado no alvo:
use `align-self` (`self-center`), NUNCA `mx-auto`** — o balão (22rem) é mais largo que a coluna do
alvo (7-9rem) e, com margem auto no eixo cruzado maior que a linha, o flexbox zera a margem
inline-start e ancora o balão à ESQUERDA (seta caía 104-120px fora do botão, medido no navegador
06/08). Alvo que NÃO fica centrado sob o balão usa `align="start"` (balão encostado à esquerda +
seta em `left-24`), o caso do "Começar" do card-herói na home;
`GuideReopenButton` "Como funciona?" reabre). Regras:
conta SEM perfil inicia o guia pelo estado real; **"Pular tutorial" encerra qualquer passo** e
"Entendi" encerra o arremate (flags versionadas sob `sz:kids:onboarding:v2:*`; o modal só vira
visto após fechar/concluir, portanto as memórias são locais ao navegador); **NUNCA aparece em sessão de
perfil** (`guideKey=null` na page). `src/lib/profile-allowance.ts` separa `limited`, `unlimited`,
`none` e `unavailable`: `maxProfiles: 0` é **sem matrícula** (estado próprio + CTA da Comunidade dos
Criadores), enquanto status não-200 é **falha de consulta** (retry). Nenhum dos dois libera o "+";
status não-200 ao listar os próprios perfis também renderiza `ProfilesUnavailable` — jamais vira
`[]`, porque isso abriria o onboarding e poderia induzir perfil duplicado.
Junto no lote: o **opt-in de perfil público entrou na CRIAÇÃO** (antes só na edição — o auth/shell
aceitam `publicProfileEnabled` no create desde 08/2026) e o nome valida **≥3 letras no client**
(o auth já exigia; "Bê" caía em toast genérico).
**Fase 2 — guia da CRIANÇA (08/2026):** na HOME, `components/kids/child-guide.tsx` (client) entre a
saudação e o ContinueHero — boas-vindas do Zappy 1×/perfil **neste navegador/dispositivo** (flags
versionadas `sz:kids:onboarding:v2:child:*`,
copy criança, SEM "pular") + passo `avatar` (sem foto do avatar 3D → convite com CTA "Criar meu
avatar" direto a `/meu-avatar?returnTo=%2F` + "Agora não", que grava apenas em `sessionStorage` e
volta numa nova sessão) + passo `start` (nenhuma aula aberta/concluída E
`pickContinueCourse` ≠ null → balão arrow-down apontando o "Começar" do herói + "Entendi").
Resolver puro `resolveChildGuideStep` em `lib/guide.ts` (avatar PRIMEIRO — ordem da usuária; os
passos somem SOZINHOS quando a coisa acontece: montou avatar/abriu aula). O modal usa
`childWelcomeSteps`: as AÇÕES que ainda faltam (não promete "primeira aula" para quem já estudou
nem aponta "Começar" sem curso liberado) **seguidas da explicação FIXA do app** (aulas, XP/foguinho,
Estúdio, Mural, carreira).
⚠️ **A explicação fixa é o conserto de 14/08:** antes só existiam os passos condicionais, então quem
já tinha avatar e já tinha estudado abria "Como funciona?", lia UMA linha sobre XP e o "Vamos lá"
fechava sem nada acontecer — o botão prometia o que o app não tinha. Duas regras nasceram daí:
(a) `hasActionableWelcomeStep(steps)` decide o **auto-abrir** (a explicação sozinha NUNCA abre a
modal na cara de quem já sabe tudo) e (b) decide o **rótulo do CTA** (`GuideWelcomeDialog` ganhou
`continueLabel`): "Vamos lá! 🚀" só quando há balão a revelar, senão "Entendi!". A numeração
1️⃣2️⃣3️⃣ SAIU (com 5 a 7 itens ela acabava e virava ⭐ no meio da lista); cada passo tem emoji
temático. Sinais 100% derivados
do que a home JÁ busca (`avatarPhotoUrl`, `courses[].progress`) — zero fetch novo; falha ao buscar
avatar vira estado `null` (desconhecido) e não dispara convite falso. O
`GuideWelcomeDialog` virou GENÉRICO (`title`/`description`/`steps`/`onSkip?`; os pais injetam
passos dinâmicos) e o `GuideBalloon` ganhou `actions?`. Crianças e pais reabrem o guia por "Como
funciona?"; `/api/onboarding/events` registra eventos agregáveis sem ids/PII. ⚠️ Deliberado: SEM balão no mapa
`/cursos` (o medalhão "Você está aqui" já se autoguia) e SEM guiar a produtos vendidos à parte.
Regressões puras e de componentes reais (modal, copy/clique do Concluir, largura dos targets e os
estados sem matrícula/indisponível) ficam em `tests/guide.test.ts`,
`tests/profile-allowance.test.ts`, `tests/guide-components.test.tsx`,
`tests/profile-entry-states.test.tsx` e `tests/onboarding-integration.test.tsx`.

O RESPONSÁVEL faz login (sessão da CONTA) e a borda manda escolher um **perfil de criança**
antes de entrar na área de aprender. `src/proxy.ts` seta `requireProfileSelectPath: '/perfis'`
(conta sem a claim `pfl` → redireciona p/ a grade) e `/perfis` entra nos `protectedPrefixes`
(isenta do gate, é a rota de seleção). A **grade** (`app/perfis/page.tsx` — FORA do grupo
`(app)`, sem a sidebar kids — + `perfis-client.tsx`): rostinhos clicáveis (selecionar = 1
clique → `/api/profiles/:id/select` → reload da home), **Área dos pais** (numa sessão de perfil
pede a SENHA do responsável → `/api/profile-session/exit`; numa sessão da conta gerencia direto:
criar/editar/arquivar (⚠️ **SEM foto desde 24/07**: a cara da criança vem EXCLUSIVAMENTE do
snapshot do avatar 3D — o upload `/api/profiles/:id/avatar` foi REMOVIDO do kids e do shell; a
grade `/perfis` e os cards dos filhos pintam o rostinho via `listAvatarsByProfileIdsReadonly` em
lote, fallback = inicial do nome) + a
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
A Área dos Pais também mostra o card **Atendimento**, que leva a `/responsavel/ajuda` (FORA do
layout e da navegação infantil). Essa página exige sessão da CONTA e `isParentVerifiedFor` no RSC;
os três BFFs `/api/helpdesk/portal/*` repetem a proteção com
`requireParentGateAccountOnly`. Nunca adicione esse destino ao `NAV_ITEMS`, aos
`MOBILE_NAV_ITEMS` ou aos `protectedPrefixes`: estes últimos exigem perfil selecionado e são a área
da criança. Um perfil que adivinhar a URL é redirecionado pela página e recebe 403 do BFF antes de
qualquer chamada ao gateway.
A página **"Meu perfil"** (`app/(app)/perfil`, sempre em sessão de perfil) edita o PRÓPRIO perfil
(nome ≥ 3 / telefone; a IMAGEM vem só do avatar 3D desde 24/07) via `/api/profiles/:id` — NUNCA a conta (full review F1: o auth recusa
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
liberado", wrappers do `KidsLockedProduct` com CTA — ver `## Telas de produto bloqueado`); senão cai
no genérico `KidsLockedSpace`. ⚠️ **O cliente trata
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
legados/incompletos sem derrubar a página pública. Em dispositivos touch, o botão de tela cheia do
`MobileGamepad` solicita fullscreen no console inteiro (moldura + iframe + controles), nunca somente
no iframe; no desktop sem gamepad, o fullscreen continua sendo apenas o palco do jogo. As rotas
`/api/studio/{describe,
publish,play/[id],cleanup}` são shims sobre `shell.routes.studio*`; o `proxy.ts` exclui `api/studio/publish`
(multipart), `api/studio/play` (stream público) e **`api/studio/cleanup`** (S2S do hub, HMAC — limpeza de
R2 na moderação: apagar post do Mural → apaga snapshot jogável + capa) do matcher (`api/studio/describe`
FICA no matcher — ganha o anti-CSRF same-origin). **Data de nascimento (controle de idade):** os pais informam no `ProfileForm` da Área dos
pais (`app/perfis`) — `<input type=date>`; só a CONTA edita (o auth recusa em sessão de perfil).
O `max` e o cálculo usam o **dia civil de São Paulo** (`@sistemazero/core/time`), igual ao Auth,
sem adiantar a data na virada UTC. Novo perfil exige menos de 18 anos (`PROFILE_AGE_RESTRICTED`); quem completa 18 depois preserva
o perfil. O campo explica a regra e direciona adultos ao Instagram `@criecomhelenaejulio`.

## "Guardado na sua conta" — Estúdio Completo e Pinta na nuvem (18/08/2026)

Os dois editores livres guardavam só no IndexedDB (o host pede `requestPersistentStorage()`, mas o
Safari despeja depois de uma semana). Agora cada jogo/desenho SOBE sozinho depois do autosave e
DESCE sozinho onde falta — decisão da Helena: automático, por item. Design completo em
`docs/plans/2026-08-18-guardar-na-conta-design.md`.

- **Cliente + fila:** `src/lib/creations-cloud.ts` (`createCreationsCloud({tool, viewerId, idleMs})`):
  reserva no BFF → PUT do gzip DIRETO no R2 (URL assinada) → commit `{revision}`; fila que sobe só
  o SNAPSHOT MAIS RECENTE por item; falha de REDE (`navigator.onLine` false ou TypeError de fetch —
  um TypeError qualquer NÃO é rede) = `offline` + backoff, e o `online` acorda a fila na hora; 5xx,
  409 de revisão no commit e PUT falhado no R2 (`STORAGE_PUT_FAILED`, URL vencida) = 3 tentativas
  (reserva nova = URL nova) e o item sai; 4xx = `error` com recado de criança (`CLOUD_MESSAGES`),
  sem loop (enquanto há tentativa o selo segue "guardando"; erro só ao desistir); **429 da
  borda** é TEMPORÁRIO: espera o `retry-after` (ou 15 s; teto 5 min; a espera NÃO é acordável
  por `flush`/`online`/`pagehide` — cada acordar gastava uma tentativa) e tenta de novo (×3), e
  com > 10 pendentes a fila anda no compasso de 250 ms (~240/min, abaixo dos 300/min por rota) —
  a primeira sincronia de uma galeria grande não perde itens; `anySignal` compõe sinais com
  fallback (Safari < 17.4 sem `AbortSignal.any` deixava a descida muda); **revisão-base:** cada
  reserva leva `baseRevision` (a revisão da nuvem que este
  aparelho conhece, das marcas; 0 = nunca viu) e um 409 `CREATION_STALE_BASE` (outro aparelho subiu
  antes) tira o item da fila e chama `onStale` do adaptador — que guarda a versão da NUVEM como
  cópia ("(de outro aparelho)" no Estúdio, `-copia` no Pinta), avança a marca para a revisão dela e
  sobe de novo o item daqui (o aberto no editor continua sendo o item; nada se perde);
  `onUploaded` só depois do commit confirmado — e NÃO roda se um `enqueueRemove` do mesmo item
  chegou com o upload em voo (a lápide manda) —, `onRemoved` idem; apagar não espera o debounce e
  um upload enfileirado depois não empurra o DELETE (`dueAt` mais cedo vence); commit/DELETE com
  `keepalive` (a reserva também); o selo só é avisado quando algo VISÍVEL muda (10 autosaves
  seguidos = 1 "guardando"); `pagehide`/`visibilitychange` disparam o pendente; ao desmontar o host faz
  `flush({timeoutMs: 5000})` e só então `dispose()` (o PRO sai com 3 s de teto, e sem espera se já
  está `offline` — a criança não fica presa num upload de MB nem no backoff; o que ficar sobe na
  próxima carga). Toda chamada leva `x-sz-viewer` (o BFF recusa se a sessão trocou de perfil).
  Sem `CompressionStream` = `unsupported` (tudo no-op). Shims em `app/api/creations/**` (dentro do
  matcher do proxy: JSON pequeno). Estúdio sobe com 10 s de folga, Pinta 2 s. Os produtores dos
  dois adaptadores devolvem `null` (zero HTTP) quando a marca confirmada JÁ é o `updatedAt` local.
- **Partes (19/08/2026, só Estúdio):** o produtor pode devolver `parts: CloudPart[]`
  (`{hash, text()}`; `hash` = `sha256Hex(canonicalJson(asset))`). `upload` declara os hashes SEM
  bytes na 1ª reserva (o caso comum — só o programa mudou — termina aí, zero gzip de assets); 409
  `CREATION_PARTS_NEED_BYTES {details.hashes}` → comprime SÓ as pedidas (`text()` é lido só aí) e
  reserva de novo (≤ 3 voltas); PUT das partes faltantes (4 em paralelo) e DEPOIS o manifesto;
  commit `{revision, uploadedParts}` (omitido sem parte nova: o corpo do Pinta não muda). `download`
  devolve `parts` + `fetchPart(hash)` (baixa, descomprime e CONFERE o hash: `CREATION_PART_CORRUPT`
  recusa; hash fora da revisão: `CREATION_PART_MISSING`). 409 `CREATION_PART_MISSING`/
  `CREATION_PARTS_NEED_BYTES` na fila são retentáveis (×3, reserva nova). Ticket SEM `parts`
  com partes declaradas (serviço antigo) → `CLOUD_PARTS_UNSUPPORTED` (503, retentável) — nunca o
  manifesto sozinho. `hashSupported()` (sem `crypto.subtle` → item inteiro). Helpers exportados:
  `canonicalJson` (chaves ordenadas em profundidade, `undefined` fora), `sha256Hex`,
  `hashSupported`, `anySignal`.
- **Reconciliador:** `src/lib/creations-sync.ts` (regras: só na nuvem baixa; só local sobe; com os
  dois lados presentes, a MARCA confirmada — não a ordem dos relógios dos aparelhos — decide quem
  mudou; se ambos mudaram, faz CÓPIA local só depois de baixar e validar; teto de 6 s na 1ª carga).
  `SyncedMarks` em `localStorage` `sz:creations-synced:<tool>:<perfil>` (`updatedAt`; a REVISÃO
  da nuvem em `<chave>:revisoes` — é a `baseRevision` da próxima reserva; avançam SÓ no commit
  confirmado ou na descida gravada — nunca ao enfileirar; storage degradado lê o gravado por baixo
  da memória; em MEMÓRIA com escrita coalescida (100 ms; `flush()` MESCLA com o que está no
  storage antes de gravar — duas abas do mesmo perfil não se apagam; registro compartilhado por
  chave na página: duas instâncias convergem; `resetStoredSyncedMarksForTests`) — antes relia e
  reparseava o `localStorage` inteiro a cada acessor). Guardas da descida (v3 de 19/08):
  `isBusy(itemId)` (item ABERTO num editor: nem cópia nem gravação; `skipped`) e
  `localUpdatedAt(itemId)` (relê o disco na hora de gravar: edição feita no meio não é
  sobrescrita); nos dois casos a marca não avança e, se a criança editar, a subida cai em base
  vencida → cópia. O que não coube no orçamento da 1ª carga
  (`deferred`) volta em passes seguidos (2 s de folga, até 5; abortável) em vez de esperar o F5 e LÁPIDES em `<chave>:apagados` (`{at, sent, revision}`: apagado aqui não volta da
  nuvem só por estar lá — "ninguém editou depois" é por REVISÃO, não por relógio; DELETE não
  enviado é reenviado; volta só se alguém editou depois). A reconciliação é single-flight por
  instância (StrictMode/remontagem não geram duas cópias com o mesmo nome); descidas recusadas
  saem no console (`[criacoes-nuvem]`). A lista da nuvem também traz lápides remotas: item local
  intacto é apagado; edição concorrente vira cópia com id novo antes da exclusão.
- **Pinta:** `src/lib/pinta-cloud-persistence.ts` embrulha `createPintaPersistence({namespace})`
  (exportado pelo pacote) e é passado em `<PintaApp persistence>` no `pinta-client.tsx` — a galeria
  e o editor usam o MESMO `PintaPersistence`, então tudo sobe (autosave, criar, renomear, importar,
  trazer foto). **Local primeiro (19/08):** `listAllAssets()` devolve o LOCAL na hora e dispara a
  reconciliação single-flight em segundo plano, avisando por `subscribe` (`sync-start` →
  `changed` (debounced) → `sync-end`); a galeria do pacote relê a cada `changed`, mostra "Buscando
  na sua conta…" enquanto `syncing`, e o `?desenho=` de outro aparelho espera o `sync-end` antes de
  dizer "sumiu". Só o que mudou desde a marca é reenfileirado (não mais `[saved, ...linked]`).
  A reconciliação roda UMA vez por carga (`RECONCILE_MIN_INTERVAL_MS` 60 s): a galeria relê o
  local a cada `changed`/`sync-end` chamando `listAllAssets()` de novo — sem o intervalo, o fim
  de uma reconciliação abria a seguinte em LAÇO. `isAssetOpen` (= `isPintaAssetOpen` do pacote):
  a descida NÃO grava por baixo de um desenho aberto no editor — e `subscribeAssetOpenState`
  (= `subscribePintaAssetOpenState`) faz a reconciliação voltar NA HORA ao fechar um desenho que
  ficou pulado (gatilho pontual, fora do intervalo mínimo); o wrapper tem `dispose()` (o host
  chama ao trocar de perfil). `resolveStale` com a versão da nuvem IGUAL à daqui (outra aba) só
  avança a marca, sem `-copia`. Descidas gravam DIRETO no local (id preservado; peças antes dos mapas; nome já usado
  por OUTRO desenho ganha sufixo `-2`; sem teto de quantidade local). Cópia de conflito =
  `<nome>-copia` com id novo (sempre ≤ 48 chars).
  **Biblioteca "Minhas paletas" (25/08; full review no MESMO dia):** viaja como UM item
  ESPECIAL do MESMO canal — identidade exata `tool=pinta` + itemId fixo `sz-pinta-palettes` +
  kind `palette-library` (fonte única em `@sistemazero/core/creations`; o wrapper e o members
  re-exportam esse contrato, e `tests/palette-library-conformance.test.ts` trava o lockstep + o
  itemId dentro da regex da borda). Salvar local (`savePaletteLibrary` embrulhado) devolve o
  merge autoritativo e enfileira a subida; a reconciliação
  FILTRA o summary especial da lista de ASSETS antes do `reconcileCreations` (senão o sanitize
  o descartaria como "desenho corrompido"), desce e FUNDE (`mergePaletteLibraries` do pacote:
  paletas por id+updatedAt E **LÁPIDES** por id+removedAt — a lápide é o que faz uma EXCLUSÃO
  valer no outro aparelho em vez de a cópia local dele ressuscitar, o achado ALTO do review),
  re-subindo o merge SÓ quando o CONTEÚDO difere do remoto
  (**`paletteLibraryContentKey`** — canônica: insensível à ordem dos arrays E das chaves;
  comparar cru fazia dois aparelhos com ordens diferentes subirem um por cima do outro para
  SEMPRE); antes de gravar, relê e re-funde se a UI salvou no meio; `onStale` idem.
  O `creationsUsageByUsers` e a quota do members excluem só a identidade exata (a biblioteca não
  conta como "+1 desenho" no admin; kind/itemId parciais não ganham a isenção).
- **Estúdio:** `src/lib/studio-cloud.ts` liga `setStudioCloudMirror` (todo `persistProject`/rename/
  assets/delete do pacote acorda o espelho) e faz `pullMissing()` em SEGUNDO PLANO no
  `studio-full-client.tsx` (19/08: a lista aparece já com o que há neste aparelho e os jogos de
  outro computador entram card a card pelo `PROJECT_CHANGED_EVENT` do pacote; antes esperava a
  descida inteira — até ~10 s de "Carregando…"; abrir um jogo durante a descida → o restauro dele
  é recusado pela guarda de aberto e a subida seguinte cai em `onStale`; `syncing` no selo =
  "buscando na sua conta…"). O produtor relê o `Project` por `loadProjectSnapshotForCloud` (nome
  cortado em 120) e, COM assets, monta o MANIFESTO + partes (`buildStudioCloudSnapshot`:
  `{format:'sz-studio-parts', version:1, program:<Project com assets:[]>, assets:[hashes na
  ordem]}`; um asset por vez no hash — pico de memória de UM JSON canônico); sem assets ou sem
  `crypto.subtle`, o `Project` inteiro. A descida resolve primeiro (`resolveCloudProject`:
  manifesto → reaproveita por hash o que o MESMO projeto já tem aqui via
  `loadProjectAssetsSnapshotForCloud` (só a partição de assets) e baixa o resto (3 em paralelo,
  hash conferido); parte fora da revisão → recusa, nada gravado; blob antigo passa direto) e é
  CONFERIDA sem gravar por `validateCloudProjectSnapshot(raw, {expectedId})` no `fetch` (id,
  tetos, saneamento ESTRITO — bloco/programa que esta versão não reconhece RECUSA, em vez de
  gravar um jogo esvaziado) e só então grava por `restoreProjectFromCloud` (datas preservadas,
  SUBSTITUINDO blocos/capa antigos, SEM acordar o espelho). A descida usa a lista LEVE
  (`listProjectSummariesLightForCloud`), pula projeto ABERTO (`isProjectOpenAnywhere`: nem
  cópia nem restauro — antes a cópia de conflito ficava órfã a cada passe) e relê o `updatedAt`
  antes de gravar (`loadProjectSummaryForCloud`); ao VOLTAR à lista o host refaz `pullMissing()`
  (single-flight) para o que ficou de fora entrar. `sync.restoreProject(id)` baixa, restaura e
  avança a marca ("Recriar projeto neste aparelho" usa ele — sem a marca, a primeira edição
  virava cópia "(de outro aparelho)"); `sync.downloadProject(id)` só baixa resolvido. Cópia de conflito =
  `importProjectSnapshot(project, {name: "<nome> (deste computador)"})`; base vencida na subida =
  cópia "(de outro aparelho)". "Recriar projeto neste aparelho" (Pensa) tenta a NUVEM antes de criar
  um vazio com o id determinístico. A rota PRO (`studio-pro-client.tsx`, modo Código) também liga o
  espelho (só `attach`; selo no canto INFERIOR — no topo cobria os botões da Topbar). O par
  `{cloud, detach}` vive num estado só (o cleanup de uma fila nunca desliga o espelho da seguinte).
- **Molda (04/09/2026):** `src/lib/molda-cloud-persistence.ts` é o terceiro adaptador (tool
  `molda`), molde do Pinta sem o item especial; os nomes únicos/`-copia` dos dois wrappers vêm de
  `src/lib/creation-names.ts` (`uniqueCreationName`/`conflictCopyName`, teto por pacote). Ver a
  seção "Molda" abaixo.
- **Selo:** `components/kids/cloud-save-badge.tsx`: guardando · guardado · sem internet · não
  consegui (recados de `CLOUD_MESSAGES`, nunca a mensagem crua do servidor). `idle`/`unsupported`
  não mostram nada. Uma região viva (`sr-only`, sempre presente) anuncia só offline/erro. No Pinta e no Molda é irmão do app; no Estúdio é uma CAMADA absoluta por cima da lista e
  do editor PRO (a moldura é bloco e os filhos são `h-full` — no fluxo empurraria a lista).
- Só com PERFIL (`viewerId`): sem sessão de perfil não há dono na nuvem e os apps abrem só-local.
  Miniaturas dos cards NÃO viajam (capa vazia no outro aparelho até abrir o jogo).
- **Medição (19/08):** `src/lib/perf.ts` (`perfSpan`/`perfSpanAsync`/`perfMark`; liga com
  `localStorage['sz:perf']='1'` ou `?szperf=1`; `[sz:perf]` no console + User Timing): spans
  `kids:cloud:produce|gzip|gzip-parts|reserve|put|commit`, `kids:pinta:reconcile`,
  `kids:studio:pull|hash|parts`. `tests/creations-cloud.perf.test.ts` registra tempo sem assertar.
- Testes: `tests/creations-cloud.test.ts` (inclui partes), `tests/creations-sync.test.ts`,
  `tests/pinta-cloud-persistence.test.ts`, `tests/studio-cloud.test.ts` (inclui manifesto/descida
  em partes/`downloadProject`). **Pende QA em staging** (CORS PUT `application/gzip` no bucket UGC;
  roteiro no doc do plano — inclui o de partes).

## `/jogar`: o palco segue o JOGO, e gira no celular em pé (20/08/2026)

Relato dela: no celular, com os controles escondidos, "ficou com muita área livre e pouca área de
jogo". Medido num aparelho de 393x660: o palco ficava em 369x221 (31% da tela) com ~355px de fundo
vazio. ⚠️ **O teto sem girar é GEOMETRIA, não espaçamento** — o palco é deitado e o celular em pé é
estreito, então a largura manda: zerar toda a margem renderia só ~13% de área. Girar 90° rende 2,4x.

- **`lib/stage-fit.ts`** (puro) — `sanitizeStageAspect` (a proporção vem do jogo da criança: é DADO,
  então exige finitos, positivos e dentro de 0,2..5) e **`shouldRotateStage`**, que decide por
  GEOMETRIA e não por "é celular": compara o palco que cabe em pé com o que cabe deitado e gira com
  ganho ≥ 1,25x, só com ponteiro grosso. É o que faz a regra se acertar sozinha sem lista de
  aparelhos — jogo EM PÉ num celular em pé não gira (girar o encolheria), desktop nunca gira.
- **`components/kids/public-stage.tsx`** é o dono ÚNICO do layout nos quatro estados (console em pé,
  console deitado, palco nu, palco nu girado); o `mobile-gamepad.tsx` ficou só com os widgets de
  controle. ⭐ **Uma árvore SÓ, com a moldura condicional em volta de um `{children}` de posição
  estável**: com um ramo de JSX por estado o React remonta o `<iframe>` e **o jogo REINICIA** — era o
  que já acontecia ao esconder os controles e ao virar o celular com eles ligados.
- **A proporção vem do IFRAME** (`sz:stage`, ver o CLAUDE.md do studio): o palco era 5:3 cravado, e
  um jogo em pé (320x480) encaixotado nele saía com ~147px de largura — o pior caso de "pouca área
  de jogo" que existia aqui. O host começa em 5:3 e ajusta quando a resposta chega.
- O tamanho do palco é CALCULADO da caixa que sobrou, no lugar das fórmulas com altura de cabeçalho
  cravada (`100dvh - 8rem`, `- 152px`), que erravam sempre que o cabeçalho mudava de altura.
- ⚠️⚠️ **Mede por `clientWidth`/`clientHeight`, NUNCA por `getBoundingClientRect`**: o retângulo é o
  da caixa já TRANSFORMADA, então dentro do palco girado ele volta com os lados trocados. Medido:
  368x839 em vez de 839x368, o que fazia o palco girado sair MENOR que o de pé.
- ⚠️⚠️ **O centramento do palco girado é ABSOLUTO** (`top/left 50%` + `translate(-50%,-50%)`), e não
  `place-items: center`: o Chromium recua para `start` quando o item é MAIOR que a área de
  alinhamento — e aqui ele é sempre maior, porque os lados estão trocados. Medido: o jogo ficava em
  x 213..581 numa tela de 412, ou seja, METADE fora da tela. ⚠️ Área grande não é prova de nada: o
  e2e passou com o defeito até ganhar a asserção de que a caixa cabe INTEIRA na viewport.
- A **tela cheia** passou a existir também sem console (no cabeçalho): quem esconde os controles é
  justamente quem mais quer área de jogo, e perdia o botão junto com a barra. O alvo continua sendo
  o CORPO do console quando ele existe (pedir na raiz deixaria o console num fundo preto).
- **O mesmo botãozinho VOLTA** (`use-fullscreen.ts`, consumido pela barra do console e pelo
  cabeçalho): em tela cheia ele vira "Sair da tela cheia" com o ícone de recolher. ⭐ Sair não exige
  gesto do usuário (só entrar exige), então funciona sempre — inclusive quando quem tomou a tela foi
  o jogo.
  - ⚠️⚠️ **O estado vem do NAVEGADOR, nunca de "eu cliquei".** A criança sai por Esc, pelo gesto do
    sistema ou pelo voltar do Android, e nesses caminhos ninguém avisa o botão: guardado no clique,
    ele passa a dizer "Sair" com a tela já normal e o toque seguinte não faz nada. Travado pelo
    teste que dispara `fullscreenchange` sem passar pelo botão.
  - ⚠️ A pergunta é "tem ALGUÉM em tela cheia?", e não "é o MEU elemento": com o jogo segurando a
    tela quem está lá é o `<iframe>`.
  - ⚠️ A `key` dos botões da barra é o ID, e não o rótulo: os que TROCAM de rótulo (tela cheia, som)
    eram remontados a cada toque e quem clicou pelo teclado perdia o foco no ato.
  - ⚠️ O hook LÊ o documento ao montar, além de ouvir o evento: a barra pode montar com a tela já
    cheia (a criança entra pelo cabeçalho, sem console, e depois mostra os controles) e nasceria
    oferecendo "Tela cheia" de novo.
  - **Sem `aria-pressed`, de propósito:** aqui o RÓTULO já descreve a próxima ação, e somar o estado
    faz o leitor anunciar as duas coisas. É diferente do botão de controles e do `FocusModeToggle`,
    que usam `aria-pressed` com rótulo que muda junto — não uniformizar sem pensar.
  - ⚠️ **Em tela cheia só os botões do CONSOLE são alcançáveis**: o cabeçalho fica fora do elemento
    que foi para a camada de topo (medido). É o esperado, e o que torna aceitável é justamente este
    lote: a saída mora na barra, dentro do alvo. Esconder os controles em tela cheia exige sair
    antes — dois toques, e não um.
- ⚠️ O toque atravessa o giro sem conta nenhuma: o `__szInput` mede com `getBoundingClientRect` do
  canvas DENTRO do iframe, onde a rotação de fora não existe. Medido em Chrome: o centro da tela cai
  em (400, 236) de um palco 800x480, e os quatro lados mapeiam como rotação exata.
- Sentido: `rotate(90deg)`, ou seja, a criança vira o celular no ANTI-horário (o topo do aparelho
  aponta para a esquerda) — e o cabeçalho, que gira junto, aparece no alto. Com o giro automático do
  sistema destravado o aparelho já entra em paisagem e a rotação nossa sai de cena: ela existe para
  o caso comum do giro TRAVADO.
- Testes: `tests/stage-fit.test.ts` (a régua pura, com a metade que precisa FALHAR em cada caso),
  `tests/public-player.test.tsx` (iframe não recriado, giro, proporção, fonte da mensagem) e
  `e2e/public-player-mobile.spec.ts` (geometria real em Pixel 7).

### Console estilo Super Nintendo, com os controles DERIVADOS do jogo (21/08/2026)

O pad mandava **6 teclas** (as 4 setas, espaço e Enter) — o depara certo de quando o Jogo 2D só
tinha isso. Hoje são QUATRO vocabulários de entrada: tecla livre no núcleo, 11 teclas no dropdown do
Jogo 2D (**incluindo A/D/W/S e F, que o pad não mandava**), 9 ações semânticas, 10 no Avançado e
`event.code` cru no 3D. A criança escolhia "tecla A", funcionava no computador e o jogo ficava morto
no celular.

⭐ **A descoberta que barateou tudo: tecla sintética já aciona TODAS as camadas de ação.** O Jogo 2D
converte tecla em ação (`z`/`Space`→pular, `x`/`Shift`→correr, `Enter`→começar, `Escape`→pausar) e o
Avançado faz o mesmo. Então um canal só — a tecla com `key` E `code` corretos — cobre as seis
extensões, e não foi preciso protocolo novo de entrada.

- **`@sistemazero/studio/controls`** (`describeProjectControls`) diz, a partir do PROJETO, o que cada
  botão manda. Vale já no primeiro quadro, sem piscar. Ver o CLAUDE.md do studio.
- ⚠️ **Conservador de propósito:** A (espaço) e B (Enter) e o direcional valem SEMPRE, com o que o
  pad já mandava. Jogo que o Estúdio não entenda continua exatamente jogável — o que se ganha é X, Y
  e a tira, que não existiam.
- **`console-controls.tsx`** (era `mobile-gamepad.tsx`): cruz, diamante A/B/X/Y, tira SELECT/START e
  a barra do pé, nos tokens `--snes-*` do globals.css (forma do videogame, cores da casa; as quatro
  casas preservam o SENTIDO das cores originais). A face carrega a **letra**; o significado
  ("Pular", "Soltar fogo") vai no `aria-label`, e casa que o jogo não usa fica apagada, inerte e
  fora do Tab.
- ⭐ **A cruz virou UMA superfície de toque e ganhou DIAGONAL.** Com um botão por braço, cada um
  capturando o ponteiro, o dedo nunca alcançava dois braços nem rolava de um para o outro — e andar
  em 4 direções, voo livre e nado normalizam movimento diagonal desde sempre, sem ninguém conseguir
  usar. Régua pura em `directionsAtPoint`.
- ⚠️ **Em pé a tira vai numa linha PRÓPRIA:** cruz + tira + diamante dá mais que a largura de um
  celular, e o console saía com a cruz e o A cortados nas beiradas (medido em 412px).
- ⚠️⚠️ **A seta gravada no braço tem token PRÓPRIO (`--snes-cross-ink`), e ele TROCA entre os
  temas.** Ela contrasta com a CRUZ, não com o corpo do console: usando `--snes-ink` (a tinta de
  texto, escura no tema claro porque o corpo é claro) a seta ficava escura sobre um braço escuro e
  sumia — medido em ~1,2:1. A cruz é escura no claro e CLARA no escuro, então a tinta é branca num e
  navy no outro; um valor só para os dois traz o defeito de volta. Travado por
  `tests/console-controls.test.tsx`.
- ⭐ **No desktop o teclado passou a chegar ao jogo sem clicar nele.** O foco nasce na página de
  fora: a criança abria o link, apertava a seta e não acontecia NADA. Medido: 0 teclas antes do
  clique, 1 depois. O foco é dado quando o jogo RESPONDE, não ao montar (até lá o `<Player>` ainda
  troca de elemento).
- **Tela cheia:** pelo botão do console vai o CORPO do console, com jogo e controles juntos (medido:
  a cruz fica dentro do elemento em tela cheia). ⚠️⚠️ Quando é o JOGO que pede (o bloco "Tela
  cheia"), quem vai é o `<iframe>` e o console fica de fora — e **promover o pedido é impossível**:
  o gesto foi dentro do iframe, então a página de fora não tem ativação e o navegador recusa com
  `Permissions check failed` (medido). O que dá, e é o que fazemos, é pedir ao jogo que desenhe o
  pad DELE enquanto estiver com a tela.
- Testes: `tests/console-controls.test.tsx` (a diagonal, o rolar do dedo, o alias de letra, a casa
  apagada) + `e2e/public-player-mobile.spec.ts` (teclado sem clique, diagonal com o dedo, `KeyF`,
  pad único, tela cheia do jogo).

#### Full review do console (21/08/2026) — 5 correções

Rodada sobre o próprio lote, medindo em vez de argumentar. Duas das cinco são regressões que a
cruz-de-uma-superfície trouxe junto com a diagonal.

1. ⭐⭐ **Um SEGUNDO dedo na cruz soltava a direção do primeiro.** Com quatro botões, cada braço tinha
   captura própria e dois dedos conviviam; com uma superfície só, o `pointerdown` do segundo dedo
   reassumia o gesto e o `pointerup` DELE mandava o `keyup` — a criança parava de andar com o dedo
   ainda apertado (medido: `["keyup ArrowLeft"]` com o polegar da outra mão raspando no console).
   A cruz passou a atender **um ponteiro por vez, e o primeiro manda**. Regressão em teste, provada
   que morde.
2. ⭐ **Num celular de 320px a cruz e o diamante ENCOSTAVAM** (medido: um termina e o outro começa no
   mesmo pixel, e o diamante passava da margem do corpo). Os dois encolheram um pouco e a linha
   ganhou `gap` — em `space-between` o gap é PISO, então eles não podem mais se tocar. Hoje sobram
   12px no pior caso.
3. **A largura reservada no console DEITADO era número mágico** (`+ 380px`, da época do pad antigo).
   Virou `DECK_RESERVE_PX`, derivado do tamanho real dos controles, para não envelhecer de novo.
4. **A mensagem do pad interno corria com o "Ao iniciar" do jogo:** ela saía num tempo fixo e podia
   chegar ANTES de o `enableClassicControls` do jogo rodar — e aí voltavam dois direcionais. Agora
   ela é reforçada UMA vez na primeira resposta de palco, que é a prova de que o começo do jogo já
   rodou (é ele que cria o canvas). ⚠️ O e2e disso cobra o ESTADO final, não a contagem de avisos:
   cravar o array exato quebrou por um `off` a mais.
5. **Detalhes:** o foco só é tomado se ninguém estiver com ele (quem chegou de Tab não é puxado para
   o jogo no meio da navegação), e o `<title>` que eu tinha posto no SVG da seta saiu — mostrava
   tooltip em INGLÊS numa interface em português, e a regra do biome que eu achei que o exigia está
   desligada.

⚠️ **Conferido e NÃO é defeito:** num celular de 320px nada é cortado (cruz, tira e palco cabem);
`describeProjectControls` devolve objeto novo a cada chamada, então não há estado compartilhado entre
jogos; e a rede do `script.js` não cobre `__szInput.key('x')` do núcleo de propósito — `.key(` é
genérico demais para regex, e o caminho da IR já cobre jogo feito em blocos.

### Full review do lote acima (21/08/2026) — 4 correções

Rodada sobre o próprio lote, medindo no navegador em vez de argumentar. Três das quatro só
apareceram porque a medição foi feita em estados que os testes do lote não visitavam.

1. ⭐⭐ **O `alignItems: 'stretch'` que desamarrou a medição GRUDOU o direcional no alto.** Ele
   entrou para tirar a altura da área do palco de dentro do próprio palco (senão medir para calcular
   vira laço), mas item com altura PRÓPRIA sob `stretch` assenta no início do eixo. Medido no
   console deitado: o direcional ficava **60px acima** do centro do jogo. A linha voltou a
   `center` e quem estica é SÓ a área do palco, por `alignSelf`. Regressão em e2e (reprova em 60,5px).
2. ⭐ **O modo "preencher" no console EM PÉ era um ponto fixo auto-referente**: a altura saía de
   `area.h`, que é medida daquela mesma caixa, que é dimensionada pela altura. Não colapsava só
   porque herdava o valor do primeiro quadro, ainda em 5:3 — ou seja, o valor certo por acidente de
   ordem. Ali não existe altura a preencher (a linha cresce com o conteúdo), então a altura passou a
   sair SEMPRE da proporção. ⚠️ **O e2e desse caso NÃO reproduz o defeito** (passa com e sem o
   conserto, pelo mesmo acidente); ele guarda o resultado, e o conserto é estrutural.
3. ⭐⭐ **A janela de perguntas fechava em 10s, e o canvas do Jogo 2D Avançado só nasce quando a
   criança aperta "Começar".** Uma criança parada na tela de título por mais que isso ficava com a
   proporção padrão para sempre — justo no kit Profissional. Agora é rajada curta (6s) e depois
   insistência LENTA (2s), que para assim que o formato é conhecido e não corre com a aba escondida.
   ⚠️ "Não tenho palco" NÃO encerra a pergunta: é a resposta legítima de uma página só de HTML e
   CSS **e** a que o jogo dá enquanto a tela de título não virou canvas.
4. **O formato saía do canvas TOCADO** (ver o CLAUDE.md do studio): encostar num mini-mapa mudaria o
   tamanho do palco no meio do jogo. Passou a ser o MAIOR canvas.

⚠️ **A lição de teste da rodada, pela segunda vez neste lote:** o primeiro e2e da tela de título
passava em **455ms** — sem canvas o palco preenche a caixa, que num celular em pé já é mais alta que
larga, então "mais alta que larga" era verdade desde o começo. Cobrar a PROPORÇÃO do jogo (e afirmar
que ela ainda NÃO vale antes) fez o teste levar 8,7s, que é o tempo de esperar de verdade.

### Remediação do review final (21/08/2026)

- Trocar o id do player remonta a instância do recurso: autor, projeto, iframe, aspecto e overrides
  nunca vazam do jogo anterior enquanto a nova busca resolve.
- Face A/B/X/Y e tira SELECT/START implementam o ciclo de tecla segurada também por Enter/Espaço,
  com `keyup` em blur, troca de binding e unmount.
- Os botões invisíveis do direcional também soltam somente a própria direção em `blur`; perder foco
  antes do `keyup` não deixa a seta presa e não desfaz outra tecla ainda segurada numa diagonal.
- O protocolo `sz:pad-interno` carrega `mode: 'auto'|'always'|'off'`; nunca reduz `always` a `auto`.
- `describeProjectControls` preserva esse modo exato e mapeia a tecla explícita `z` para a face A.

## Estúdio Completo (produto vendável — 06/2026)

O **estúdio completo** (`@sistemazero/studio`) virou um PRODUTO vendável, ao lado do Mural/Clube:
item **"Estúdio"** no `nav.ts` (perto de Mural/Quarto) → rota `/estudio` (`protectedPrefixes`). O
gate é resolvido no SERVIDOR: `app/(app)/estudio/page.tsx` chama
`checkStudioAccessReadonly()` (`GET /members/access?refs=estudio-completo`, acesso pela CONTA) com
**3 estados** (full review 3ª passada): members RESPONDEU 200 e não tem o produto → `KidsLockedStudio`
(recado gentil, mascote `thinking`, prévia + **CTA de assinar a Comunidade dos Criadores** — ver
`## Telas de produto bloqueado` abaixo);
COM acesso → `StudioFullClient` (o editor pesado nem carrega p/ quem não comprou); **status ≠ 200
(gateway/token soluçou) → `KidsStudioUnavailable` ("tente de novo" + `router.refresh()`)** — não mostrar
"ainda não liberado" a quem JÁ comprou num erro transitório (mentiria que não tem acesso).
**Passe livre da EQUIPE (06/2026):** superadmin/admin/staff acessam o Estúdio Completo SEM comprar —
a rota `GET /members/access` curto-circuita `estudio-completo` p/ `true` quando `isPrivilegedActor`
(o `role` da CONTA sobrevive na sessão de perfil). É o que conserta "o admin tá sem acesso ao
estúdio". `studio-full-client.tsx` (`'use client'`, import dinâmico do package no
effect — Monaco/Blockly/IndexedDB não rodam no SSR) hospeda a navegação **lista ⇄ editor** (estado
local; o package não tem router) com `<ProjectList>` + `<StudioEditor persistence="local">` — recursos
controlados por `resolveStudioTier(levelSlug, role, unlocks?)`. O produto comprado não basta: Faísca usa
apenas as aulas; **Construtor(a) abre o Estúdio livre e o Pinta**; **Inventor(a) abre o Pensa e o Zappy**
(são os que CHAMAM IA, e o custo por uso é o motivo de adiar); a **Ponte abre no Gênio** (saiu do Mestre
em 26/07) e o Pro e "Promover para Pro" abrem somente na Lenda/equipe. As duas barras vivem em
`AI_APPS_MIN_LEVEL` e `FREE_CREATION_MIN_LEVEL` (member-shell `lib/studio-tier.ts`) — eram uma só até
14/08, e por isso o Pinta ficava preso junto com a IA. Os BLOCOS não dependem mais do rank. Projeto importado com
extensão futura é preservado, mas não abre antes da conquista. A matriz exata está em
`docs/carreira-do-criador.md`. O modo Pro livre usa WebContainer local na rota dedicada; atividades Pro
de aula usam `proRuntime` remoto via `/api/studio/pro-runtime/build`, com autorização do curso e template
autoral, sem exigir COOP/COEP no player. O botão **"Compartilhar"** usa um `share` adapter
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
quer todo o espaço); demais páginas seguem com `max-w-5xl`.
⚠️⚠️ **ALTURA TRAVADA também no DESKTOP (26/08/2026):** o ramo embarcado do `MainContainer` usava
`md:h-auto md:flex-1` apostando que "a sidebar `h-screen` já trava a linha" — **medido FALSO**
quando o conteúdo DÁ altura (a galeria do Pinta com muitos desenhos): o `<main>` crescia com o
conteúdo (2204px no esqueleto real), a JANELA rolava e o rolável interno do app nunca rolava — o
sticky da barra de seleção do Pinta ficava fora da tela. Agora `md:h-dvh md:flex-none` (mesmo
remédio do mobile); com o banner de impersonação a página rola a altura do banner (como no
mobile, onde o banner TAMBÉM não é descontado — a top bar, essa sim, é). De quebra o travamento
consertou dois defeitos pré-existentes: a ProjectList do Estúdio com muitos projetos também dava
altura à página (o `overflow-auto` interno dela nunca engatava), e o puxador do modo foco
(`absolute top-1/2`) centrava no MEIO do main crescido — fora da tela.
⚠️⚠️ **Par obrigatório do travamento: `md:min-h-[36rem]` (full review 26/08)** = o piso
`min-h-[34rem]` dos frames (`embedded-app-loading.tsx`) + 2rem de `md:py-4`. Sem ele, janela
desktop mais BAIXA que ~560px (snap de meia tela, zoom 175-200% — quem mais usa zoom é quem
menos pode perder o controle) fazia o piso do frame estourar contra o `overflow-hidden` e o PÉ
do app — a barra de seleção — ficava CLIPADO sem caminho de rolagem (medido: 2px visíveis a
500px; com o min-height, a página rola só o déficit de 76px e a barra volta inteira). Contrato
travado por `tests/main-container.test.tsx` (regime das rotas embarcadas + ramo normal fora do
regime + o par main↔frames); mexeu no piso de um lado, mexa no outro (o comentário do
`studio-full-client` aponta o par). **SEGUE o tema da comunidade:** o
`studio-full-client` lê `useTheme().resolvedTheme` (next-themes) e passa `theme` ao `<StudioEditor>` E ao
`<ProjectList>` — assim o Estúdio não tem toggle próprio nem destoa do app (sem `theme`, o Studio mostraria
o toggle e poderia ficar em tema diferente da comunidade). ⚠️ a **CSP** (`next.config.ts`) inclui
**`script-src … data:`**: o preview injeta o script.js do aluno como `<script src="data:…">` num iframe
`srcdoc`, que HERDA a CSP do pai (só RESTRINGE) — sem `data:` o preview do estúdio/bloco não executa.
⚠️ **`media-src … data:` pelo MESMO motivo (08/2026)**: o SOM que a criança envia é embutido como
`data:audio/…` e tocado tanto pelo `<audio>` da PRÉVIA (nesta página) quanto pelo `new Audio()` do
jogo (no `srcdoc`, que herda). A diretiva nasceu sem `data:` e ninguém a atualizou quando o som
entrou → o som carregava e **não tocava**, com falha SILENCIOSA (só o console mostrava `Refused to
load media from 'data:audio/…'`; a UI não dava sinal). Travado por `tests/csp-media-data.test.ts`,
que chama o `headers()` REAL e confere todas as diretivas emitidas (a normal e a da rota Pro) —
`bun test` não enforça CSP, então esta é a única rede possível. `api/studio/publish-standalone` fica FORA do
matcher do proxy (multipart) — coberto pelo prefixo `api/studio/publish` no negative-lookahead.
**CRIAR segura o foguinho (07/2026):** o `studio-full-client` passa `onChange` ao `<StudioEditor>` que,
na 1ª edição REAL da sessão (`ctx.reason === 'autosave'`, guardado por ref — NÃO em abrir/flush), dispara
best-effort `POST /api/studio/activity` (shim `shell.routes.studioActivityDay`, DENTRO do matcher, JSON
sem corpo) → o members dá **10 XP/dia** que MOVE o streak (gated por posse do Estúdio, dedupe 1×/dia). No
sucesso, `router.refresh()` acende o foguinho/XP/ranking na hora. É a âncora de quem já terminou os cursos
e só cria (sem publicar). Ver members §Missões "Retenção pós-cursos" (migration `0045`).

## Ferramentas do Estúdio vêm dos CURSOS (currículo, 08/2026)

A paleta do Estúdio livre deixou de ser fixa por NÍVEL: cada curso declara os blocos que libera e a
criança tem a UNIÃO dos que **concluiu E publicou no Mural**. O nível segue decidindo o MODO
(livre/Ponte/Pro). No kids isso aparece em três lugares:
- **`/estudio`**: a página soma `getStudioUnlocksReadonly()` ao `Promise.all` e passa
  `{blocks, extensions: extensionsForBlocks(blocks)}` ao `resolveStudioTier`. Best-effort — falhar
  NÃO esvazia a caixa (o tier cai no perfil do nível).
- **`/mural-dos-criadores`**: o mesmo, p/ o remix perguntar "o que você conquistou cobre este jogo?"
  em vez de "seu nível cobre?".
- **`/perfil` → `my-tools.tsx` (`MyTools`)**: "Minhas ferramentas", as GAVETAS conquistadas
  (`drawersForBlocks` — 🎮 Sprites, 💥 Colisões, 🚀 Kit espaço…). Gaveta é o que torna a recompensa
  legível p/ criança; lista de ids não é. Sem nenhuma, a seção some.
  ⭐⭐ **AGRUPADO POR FAMÍLIA (14/08)**, e não é só arrumação: (a) a fileira única de pílulas crescia
  sem teto (16 gavetas com UMA extensão; passa de 40 com três) e (b) **nome de gaveta se REPETE
  entre extensões** — no catálogo real 12 folhas colidem, cobrindo 176 blocos, e `🔊 Som` existe em
  QUATRO famílias. Sem o topo do caminho as homônimas ficavam lado a lado, indistinguíveis. Uma
  `<details>`/`<summary>` por família (a mais cheia já aberta), emoji em `lib/studio-family.ts` com
  **fallback para o nome puro** — família desconhecida aparece, nunca some. ⚠️ O `<details>` é
  NATIVO de propósito: dá teclado e leitor sem JS, então a seção continua Server Component. Medido
  no navegador: `<summary>` com 44px de alvo de toque; ir de 2 para 5 famílias custa 168px.
- **Comemoração no MOMENTO em que ganha** — `celebration-watcher.tsx` (ex-`level-up-watcher`, export
  `CelebrationWatcher`) montado no layout pelo `CelebrationChrome`. ⚠️ **Watcher ÚNICO de propósito:**
  nível e ferramenta chegam no MESMO refresh (o curso que fecha um degrau faz as duas), e dois
  watchers independentes abririam dois overlays sem saber um do outro — em cima da `MuralCelebration`
  viraria fila de TRÊS. A decisão da usuária foi FUNDIR: subiu de nível → `LevelUpCelebration` com o
  ganho embutido (prop `tools`); só ganhou gaveta → `tools-celebration.tsx` (o caso comum, 7 de cada 8
  cursos). Detecção PURA em `lib/tools-gain.ts` (`diffDrawerSnapshots`/`toolsGainHeadline`), comemorando
  gaveta NOVA **e** gaveta que CRESCEU (sem a 2ª, curso que só aprofunda passaria em silêncio).
  ⚠️ Duas chaves de localStorage por PERFIL — `sz:kids:level:<id>` (a de sempre) e `sz:kids:tools:<id>`
  (`{version:2, revision, blockIds}` — **ids de bloco, NUNCA nomes de gaveta**) — **gravadas mesmo sem
  comemorar**, senão a diferença se repete a cada
  navegação e a festa vira loop; 1ª carga registra e NÃO comemora (nada de festa retroativa); queda de
  contagem é ignorada. ⭐ Guardar ID e não NOME foi o que deixou a re-chaveagem das gavetas pelo caminho
  inteiro (14/08) passar **sem migração**: uma gaveta que se PARTE em duas leva ids que já estão no
  snapshot, então as duas saem com `added === 0` e ninguém ganha festa por mudança de agrupamento.
  ⭐⭐ **ALTURA DA MODAL É CONTRATO (14/08).** Ela estourava a tela porque enumerava as gavetas DUAS
  vezes: o título montava uma frase com TODOS os nomes (em `text-2xl`, Baloo 2) e os chips repetiam os
  mesmos nomes, nenhum dos dois com limite. Agora o título **CONTA** (só nomeia quando há UMA), os chips
  param em `MAX_CHIPS` (4) com um "+N", e a família entra numa linha à parte quando o ganho é todo dela
  (`toolsGainFamily`; com mistura a linha SOME em vez de eleger uma e mentir). Medido no navegador:
  ganho de 7+3 dá 444px num celular de 667px, com o "Continuar" visível sem rolar.
  ⚠️⚠️ **NENHUMA das duas fecha sozinha.** As duas tinham `setTimeout(onClose, 7000)` e a usuária não
  conseguia terminar de ler; a de NÍVEL era a pior, porque acumula o texto do posto E o da ferramenta.
  Agora seguem as irmãs (`mural-celebration`/`lesson-celebration`), que nunca tiveram timer: sai por
  botão, Esc ou toque fora. Não reintroduzir. ⚠️ O payload é barato porque as GAVETAS são derivadas no SERVIDOR
  (`drawersForBlocks` no `CelebrationChrome`, dentro do `<Suspense>` que transmite): ~25 nomes curtos
  atravessam, não a lista de blocos. ⚠️ Confete SEM som no overlay da gaveta (vem logo depois da
  `MuralCelebration`, que já tocou; o som fica onde é raro). Sem o produto Estúdio → `drawers: []`
  (não se comemora ferramenta que a criança não pode abrir; a conquista fica guardada).
  Testes: `tests/tools-gain.test.ts` + `tests/celebration-watcher.test.tsx` (a regra da fusão).

## Ranking/foguinho ao vivo (sem deslogar) — 07/2026

As ações que rendem XP re-sincronizam o chrome (foguinho/XP/ranking/nível) na hora: aula/quiz/publicar/
rating/estúdio-submit JÁ chamavam `router.refresh()` (`lesson-player-client`/contexto). Dois complementos:
- **Resgate de missão** (`missions-panel.tsx`): o `claim()` rende XP → agora chama `router.refresh()` após
  a marca otimista local (antes só atualizava estado local → ranking ficava velho até navegar/deslogar).
- **Voltar pra tela** (`focus-refresh.tsx`, `FocusRefresh`): componente cliente montado em `/perfil` e na
  home que `router.refresh()` no `visibilitychange`→visível / `focus` (THROTTLE ~30s). Cobre o placar
  mudando por XP de OUTRAS crianças enquanto a tela fica parada — o número do ranking é calculado ao vivo
  no servidor (members `getRanking`), só faltava re-buscar. Sem polling contínuo (custo do cálculo caro).

## Telas de produto bloqueado (Estúdio/Clube/Pensa/Pinta/Mural + CTA da Comunidade) — 07/2026

As 5 telas de "Ainda não liberado" dos produtos vendáveis (`kids-locked-{studio,clube,pensa,pinta,
mural}.tsx`) são **wrappers finos** do componente compartilhado
**`kids-locked-product.tsx`** (`KidsLockedProduct`, Server Component): mascote `thinking` + título +
pílula "Ainda não liberado" + prévia (`preview`) + o **bloco da Comunidade dos Criadores** com um
**CTA** para a oferta de assinatura. Cada wrapper só passa `title`/`intro`/`preview`; a API dos
exports (`KidsLockedStudio`/`KidsLockedClube`/…, sem props) não mudou. **A promessa é REAL:** a
assinatura "Comunidade dos Criadores" é um combo do catálogo que concede Clube + Mural + Estúdio +
Pensa + Pinta (+ cursos) — confirmado em `packages/catalog/scripts/seed.ts`, então o CTA vale para as
5. ⚠️ A **URL da oferta** é uma CONSTANTE nomeada no componente
(`https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta`, `target="_blank"`), NÃO uma env
(kids segue sem `FUNNEL_URL` de env). ⚠️ **NÃO usar `KidsLockedProduct` na tela genérica
`KidsLockedSpace`** (coringa de qualquer espaço do hub, que pode ser gateado por curso/cargo e não só
pela assinatura — o CTA prometeria errado); a genérica fica sem CTA. As telas transientes
`kids-*-unavailable.tsx` ("tente de novo") e a trava de aula `kids-locked-lesson.tsx` são gates
diferentes (não-produto) e seguem sem CTA.

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

## Modo foco: esconder o menu lateral (aula + apps de criação, 08/2026)

`focus-mode.tsx` (`FocusModeProvider`/`useFocusMode`/`SidebarFallback`) guarda DUAS preferências
independentes por PERFIL no localStorage — esconder o MENU esquerdo (`sz:kids:hide-nav:<perfil>`) e
esconder a LISTA DE AULAS à direita (`sz:kids:hide-outline:<perfil>`) —; a sidebar
(`app-sidebar.tsx`) e o esqueleto do Suspense já reagem a `navCollapsed` (`w-0` + `opacity-0`,
transição de 300ms com `motion-reduce`). O provider mora no layout `(app)`, que NÃO remonta entre
navegações, então o estado atravessa a navegação.

- **Onde vale** (`navAvailable`): página de aula **OU app de criação embarcado**
  (`isEmbeddedAppPath` — Estúdio/Pensa/Pinta, sub-rotas inclusas), sempre a partir de 768px (abaixo
  disso a sidebar nem existe). `outlineAvailable` segue EXCLUSIVO da aula. A preferência persistida
  nunca some a barra em `/cursos`, `/perfil` etc. — quem decide é o `available`.
- ⚠️ **A preferência do menu é UMA SÓ**, não uma por tela: esconder no Estúdio mantém escondido na
  aula e vice-versa. "Esconder o menu" é gosto da criança, não configuração de página.
- **Duas roupas do MESMO botão** (`focus-mode-toggle.tsx`, prop `variant`): `header` (padrão) é o
  círculo do cabeçalho da aula; **`edge`** é o PUXADOR colado na borda esquerda, para as três telas
  de criação, que não têm cabeçalho nenhum onde pendurar o círculo. Mesmo rótulo, mesmo ícone,
  mesmo `aria-pressed`.
- ⚠️ **O puxador mora na CALHA do `MainContainer`** (`md:pl-9` contra `md:pr-4`), nunca flutuando
  sobre o app: no Estúdio a borda esquerda é a **caixa de blocos do Blockly**, e um puxador por cima
  cobriria uma categoria. Ele é IRMÃO do frame do app — a cerca `isolation: isolate` da raiz do
  Estúdio prende os z-index de dentro dele (a toolbox é 70), então `z-30` basta; o que é portalado
  p/ o `document.body` (menus da Topbar, dropdowns do Blockly) segue passando por cima, que é o certo.
- **Um mount point só** (dentro do `MainContainer`) cobre Estúdio, Pensa, Pinta e `/estudio/pro` —
  os três clients (`studio-full-client`/`pensa-client`/`pinta-client`) não sabem que ele existe.
- ⚠️ `useMinWidth` e as preferências começam `false` TAMBÉM no cliente, de propósito (ver o
  comentário longo no `focus-mode.tsx`): ler `matchMedia`/localStorage no inicializador dava React
  #418 em toda página de aula, porque o botão faz `if (!available) return null`.

**Full review do lote (08/2026) — 2 correções:**
- ⭐ **O anel de foco do puxador é INSET** (`focus-visible:shadow-[inset_…_var(--ring),…]` +
  `outline-none`). Ele encosta EXATAMENTE na borda de recorte do `<main>` (que é `overflow-hidden`,
  e `tab.x === main.x` — medido), então qualquer indicador desenhado PARA FORA perde o lado
  esquerdo: quem navega por teclado veria meio anel. A sombra dura (`2px 2px`) cresce p/ a direita e
  p/ baixo, por isso sobrevive ao recorte. Regressão em `tests/focus-mode.test.tsx`.
- **O `title` SAIU dos DOIS variantes** (vale também no cabeçalho da aula): com `aria-label`
  presente o `title` não vira NOME e sim DESCRIÇÃO — o leitor dizia "Esconder menu, botão, Esconder
  menu". É a MESMA regra já documentada no `KidsBackButton`, que o `FocusModeToggle` violava desde
  que nasceu; e no público tablet o tooltip nem aparece.
- Verificados e NÃO alterados (decisão consciente): `aria-pressed` + rótulo que muda junto (trocar
  p/ `aria-expanded` + `aria-controls` mexeria na semântica das duas telas, sem ganho claro); o
  puxador ser o 1º foco dentro do `#main-content` depois do "Pular para o conteúdo" (é controle do
  host, faz sentido vir antes do app); `motion-reduce` (a regra global do `globals.css` já zera
  transições).
- Testes: `tests/focus-mode.test.tsx` (onde é oferecido + persistência por perfil + as duas
  correções acima) e `tests/embedded-app-path.test.ts`.

## Voltar: UM componente só (`back-button.tsx`, 08/2026)

Havia **seis** "voltar" diferentes no kids (círculo com relevo na aula, círculo chapado nos Recados,
círculo flutuante no avatar 3D, link de texto na trilha e no espaço do hub, botão fantasma nas
compras) — cada tela inventou o seu e o app parecia costurado de retalhos. Agora todos são
**`KidsBackButton`** (`components/kids/back-button.tsx`): o botão 3D da marca (mesmo relevo do CTA e
do `FocusModeToggle`), `size-11` (alvo de toque de mão pequena), `aria-label`/`title` SEMPRE.
- `href` → `<Link>` (rota); `onClick` → `<button>` (volta de estado local, ex.: lista ⇄ detalhe do
  Clube/Mural, "Minhas compras" na área dos pais).
- `variant='overlay'` é a ÚNICA variação legítima: no avatar 3D o botão flutua sobre a cena WebGL,
  onde a sombra dura some no fundo e ele precisa do véu translúcido.
- **Regra do `showLabel`** (para não voltar ao "cada um de um jeito"): LIGADO quando o botão está
  sozinho numa linha de cabeçalho (a criança lê para onde vai — trilha, curso, espaço, compras);
  DESLIGADO quando divide a linha com outros controles (aula, avatar). O botão é idêntico nos dois.
- Deliberadamente FORA: os CTAs redondos de tela vazia/celebração (`kids-locked-lesson`, trilha
  bloqueada, `lesson-celebration`, `not-found`, `esqueci-senha`) — são ação centralizada, não setinha
  de cabeçalho; padronizar junto deixaria dois botões concorrendo na tela. Também fora o "Voltar ao
  modo normal" do `kids-lesson-blocks` (criação guiada): fecha um overlay, não navega.
- ⚠️ `variant='overlay'` NÃO aceita `showLabel` (o tipo proíbe): o véu translúcido que dá
  legibilidade vive no CÍRCULO, então o texto cairia direto sobre a cena WebGL.
- ⚠️ Os skeletons acompanham o `size-11` (o da aula reservava `size-10` e o header pulava ao carregar).
- ⚠️ **SEM `title`, nunca**: um `title` igual ao nome acessível vira DESCRIÇÃO pela accname spec (o
  leitor diria "Voltar aos recados, link, Voltar aos recados") e no público tablet/celular tooltip
  nem aparece — custo sem benefício. O `rounded-full` fica no elemento FOCÁVEL (não no círculo
  interno), senão o anel de foco sai retangular em volta de um botão redondo.
- Props são união DISCRIMINADA (`href` XOR `onClick`) — sem isso `<KidsBackButton label="…" />`
  compilava e rendia um botão sem handler, um controle morto com cara de clicável.
Teste de contrato: `tests/back-button.test.tsx`.

⚠️ **"Trilha" tem dois donos agora.** A trilha do CURSO é a serpentina de aulas (`course-trail`); a
trilha do NÍVEL é `/cursos/trilha/[level]`. Como a página do curso ganhou uma setinha para a
segunda, tudo que volta para a página do curso passou a dizer **"curso"** (o `aria-label` da aula, a
`lesson-celebration` e o `kids-locked-lesson`) — senão a mesma palavra levaria a dois lugares em
telas seguidas.

**A setinha da página do curso lembra de onde você veio.** A página é alcançável por 6 caminhos e
não tinha saída nenhuma. A origem viaja em **`?de=`** (allowlist, mesma régua do
`resolveAvatarReturnPath` — `?de=` vem da URL, então valor desconhecido cai no default em silêncio),
emitida SÓ pelas duas saídas da home (`course-card.tsx` e o `courseHref` do `continue-hero.tsx`).
Sem ela — link direto, favorito, volta da aula, card da trilha — o destino é a **trilha DONA do
curso**, resolvida por `lib/course-return.ts` (`trilhaHrefForCourse`/`resolveCourseBack`, puros).
Desde 14/08 cada degrau tem um único dono: Primeiros Passos → Faísca, Iniciante 2D → Construtor(a)
e assim por diante. `lenda` → trilha da Lenda; curso sem `level` válido → mapa (`/cursos`), nunca uma
tela sem saída. A página não precisa mais buscar gamificação para desempatar a volta. Testes:
`tests/course-return.test.ts`.

## Bloco "Em breve" na aula (`coming_soon`, 08/2026)

Quando a autora cria a aula mas ainda não terminou de montá-la, a criança abria, via blocos pela
metade e **concluía a aula** sem ter visto o que importa (e conclusão nunca regride). O bloco "Em
breve" resolve: enquanto ele existir, o members serve à criança **só o recado** (os demais blocos e
os ANEXOS não saem do servidor) e recusa a conclusão com **409 `LESSON_COMING_SOON`**. A EQUIPE vê a
aula inteira, inclusive no "Ver como aluno" do admin. Apagar o bloco devolve tudo ao normal.
⚠️ Com a trava sequencial (padrão `true`) a aula em produção **prende todas as seguintes** — a frase
sob o botão travado avisa isso quando é o caso (`nextLessonLocked`), senão a criança lê os cadeados
como "eu fiz algo errado"; o aviso do editor no admin diz o mesmo à autora. Pelo mesmo motivo a copy
dos cadeados virou **DESCRITIVA** ("abre quando a anterior for concluída") em vez de imperativa
("conclua a aula anterior"): quando a anterior é a "em breve", a ordem é impossível de cumprir —
`kids-locked-lesson`, o `nodeAria` do `course-trail` e o item travado da mini-trilha.
**Follow-up conhecido:** a trilha ainda não distingue "travada porque falta concluir" de "travada
porque a anterior está em produção". Distinguir exige um `comingSoon` no `LessonOutlineView` (o
`findOutline` do members não olha blocos hoje).
O portão é o **members** (ver o CLAUDE.md de lá, Conceito 6); aqui é apresentação:
- `lib/lesson-block-content.ts` — `isComingSoonBlock` + `case` no `parseLessonBlock` (⚠️ sem ele o
  parser devolve `null` e o bloco **não aparece**, deixando a aula em branco).
- `kids-lesson-blocks.tsx` — chip **"Em breve"** (`Hammer`, `kids-unit-grad`) + moldura tracejada +
  Zappy `thinking` + copy de criança; `message` do admin sobrescreve o padrão.
- `lesson-player-client.tsx` — `blockedByComingSoon` entra no `completeBlocked` (o botão já nasce
  desabilitado, com a frase embaixo) e o `catch` do `complete()` trata o código novo.
Decisão da usuária: a aula "em breve" **conta no progresso e trava as seguintes** (comportamento
natural da trava sequencial — zero código a mais). Ela NÃO é marcada na trilha antes do clique
(exigiria um flag novo até o `LessonOutlineView`, e o `findOutline` não olha blocos) — a criança abre
e encontra o recado, que é justamente a mensagem que a autora quer dar.

## Diferenças deliberadas vs o community (decisões da v1, 06/2026)

1. **Compras só na ÁREA DOS PAIS** (não no menu da criança): NÃO há página `/compras` nem item
   de menu, mas o RESPONSÁVEL vê o histórico numa sub-tela de `/perfis` (modo gestão, atrás do
   portão de senha) — shim `app/api/payments/my` gateado por **`requireParentGateAccountOnly`**
   (estrito: a sessão de perfil herda o e-mail do responsável → a criança é RECUSADA, 403) sobre
   `shell.routes.paymentsMy`; UI `PurchasesView` no `perfis-client` (Fase 3b, 06/2026). Antes
   o kids não tinha NADA de compras; agora tem, mas escopado ao responsável.
   **Assinaturas (07/2026):** a MESMA sub-tela ganhou a seção `ParentSubscriptions` (status,
   R$X/mês|ano, próxima cobrança derivada, cancelar com confirmação "acesso até o fim do período
   já pago") — shims `app/api/payments/my/subscriptions[/​[id]]` gateados por
   `requireParentGateAccountOnly` sobre `shell.routes.paymentsMySubscription*`.
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
4. **SEM `FUNNEL_URL` de env** (curso bloqueado no catálogo sem `salesPageUrl` fica não-clicável —
   comportamento herdado). ⚠️ **Atualização 07/2026:** o funil kids EXISTE (assinatura "Comunidade
   dos Criadores", em produção) — as 5 telas de PRODUTO bloqueado agora levam um CTA para a oferta
   (ver `## Telas de produto bloqueado`). A URL é uma CONSTANTE no componente, não uma env; kids
   segue sem `FUNNEL_URL` de env.
5. **SEM `public/sw.js`** (kill-switch era cicatriz do domínio do community).
6. `/impersonar` EXISTE (suporte): o admin gera o handoff com `?platform=kids` no auth → a URL
   devolvida é a deste app. O banner persiste também em `/perfis`, usa o nome do perfil ativo e
   fica vermelho no modo explícito `write`; ao sair/trocar de perfil a nova sessão volta a
   `readonly`. Gamificação é a fase 2 (ver seção própria) — NÃO improvisar
   contadores fake no meio-tempo.
7. **Branding (06/2026)**: logo = wordmark OFICIAL (`public/logo_dark|white.svg`, copiados do
   community) + selo "kids" composto em HTML (`kids-logo.tsx` — SVG via `<img>` não carrega
   webfont, por isso o selo vive no DOM); `public/logo_kids_*.svg` são o fallback ESTÁTICO de
   marca (letras desenhadas em paths, nunca `<text>`). Favicons herdados do community DE
   PROPÓSITO (decisão: mesmo favicon).

## Pensa (planejador de jogos — 08/2026)

O **Pensa** (`@sistemazero/pensa`) planeja; Pinta e Estúdio executam. O método ZERO usa **Z**
(ideia e regras), **E** (loop, cenas, telas e Bíblia Visual), **R** (Cartões de Criação ordenados)
e **O** (auditoria e aprovação). Item "Pensa" no `nav.ts` → rota
`/pensa` (`protectedPrefixes`), gate em 4 ESTADOS (indisponível, sem produto, comprado mas abaixo
de Inventor(a), liberado):
`app/(app)/pensa/page.tsx` chama `checkPensaAccessReadonly()` (`GET /members/access?refs=pensa`;
ref = `PENSA_ACCESS_REF` do member-shell) → 200 sem produto = `KidsLockedPensa`; status ≠ 200 =
`KidsPensaUnavailable` (retry); produto + carreira ≥ `hacker` = `pensa-client.tsx` (`'use client'`, import dinâmico
do pacote no effect, tema do next-themes e sprites do Zappy). A persistência do plano é
BACKEND (members, tabelas `pensa_*`) — o client injeta um **transport** que prefixa `/api/pensa`
(shims de 1–3 linhas sobre `shell.routes.pensa*`; o chat SSE `/api/pensa/chat` E o
`…/artifacts/generate` têm `force-dynamic` — a geração responde SSE desde 08/2026, ver
member-shell). Erros do transport são duck-typed `{status, code}` (a classe não atravessa o
dynamic import). ⚠️ O `request()` do transport **sniffa `content-type: text/event-stream`**:
resposta SSE é lida pelo helper `readSse` (compartilhado com o `streamChat`) e o evento terminal
vira o resolve (`done` = corpo JSON de sempre) ou o MESMO erro duck-typed (`error`); stream que
acaba sem terminal rejeita "A conexão caiu no meio.". Sniff por content-type (não por path)
tolera skew de deploy. É o que matou o 502 do "Criar plano de tarefas" (borda derrubava o POST
mudo de minutos). `PensaHostAdapter.onOpenTask` navega para `/pinta?tarefa=<id>` ou
`/estudio?tarefa=<id>`; nenhuma tela do Estúdio monta dentro do Pensa. `MainContainer` dá largura
total a `/pensa`. Requisitos de
build: `transpilePackages` + `@import` do `pensa.css` + `@source "../../../pensa/src"` no
globals.css (MESMO gotcha das utilitárias `sz-*` do Estúdio — sem isso as `pz-*` são no-op).
`api/pensa/*` fica DENTRO do matcher do proxy (JSON pequeno; a resposta SSE não é bufferizada
pelo middleware). Deploy: `packages/pensa/**` nos watchPatterns do railway.json + case no ci.yml.
O host remove chaves locais do fluxo anterior e mantém apenas os deep links de tarefa. Contrato:
[`../../docs/pensa-planner.md`](../../docs/pensa-planner.md).

## Pinta (editor de assets de jogos — produto vendável, 07/2026)

O **Pinta** (`@sistemazero/pinta`) é o ateliê onde a criança DESENHA os assets dos jogos: pixel
art (personagens com ANIMAÇÕES + prévia rodando, cenários), peças/mapas e desenho livre —
terceiro irmão do fluxo criativo (**Pensa planeja → Pinta desenha → Estúdio constrói**). Item
"Pinta" no `nav.ts` (Palette, imediatamente antes de Estúdio) → rota `/pinta`
(`protectedPrefixes`), gate em 4 ESTADOS (indisponível, sem produto, comprado mas abaixo de
Inventor(a), liberado):
`app/(app)/pinta/page.tsx` chama `checkPintaAccessReadonly()` (refs `pinta,estudio-completo` numa
ida — a 2ª vira `studioOwned`, copy da ponte) → 200 sem produto = `KidsLockedPinta`; status ≠ 200
= `KidsPintaUnavailable` (retry); produto + carreira ≥ `hacker` = `pinta-client.tsx` (`'use client'`, import
dinâmico no effect, tema do next-themes). **Sem backend próprio**: a galeria vive no IndexedDB
POR PERFIL (`setPintaStorageNamespace(viewerId)` ANTES de montar — mesmo contrato do /estudio) e
a ponte **"Usar no Estúdio"** grava na biblioteca pessoal do Studio
(`@sistemazero/studio/personal-assets` → `savePersonalAsset`, upsert por id) — o desenho aparece
em "Meus desenhos" no painel de Imagens do `/estudio` do MESMO perfil.
**Mão DUPLA (08/2026):** o Estúdio ganhou um botão "Editar" nos desenhos vindos daqui →
`studio-full-client` passa `onEditDrawing` = `window.open('/pinta?desenho=<id>', '_blank',
'noopener,noreferrer')`; o `pinta-client` lê `?desenho=` (query, porque `noopener` corta o
`sessionStorage` usado pelo intent do Pensa), repassa como `initialAssetId` e LIMPA a URL
(`router.replace('/pinta')`) p/ um F5 não reabrir. Salvar no Pinta chama o `resyncToStudio` do
adapter, que **só atualiza o que JÁ foi enviado** (guarda `getPersonalAsset(id)` — sem ela todo
rascunho cairia na biblioteca sozinho); o Estúdio então reconcilia os JOGOS (todos, inclusive
fechados) no foco da aba, em silêncio. Ver `packages/studio/CLAUDE.md` §"Editar o desenho".
**"Trazer do Pinta" — fluxo PULL (08/2026):** a página `/estudio` agora chama
`checkPintaAccessReadonly()` (as MESMAS refs `pinta,estudio-completo` numa ida; o gate segue sendo
`estudio-completo`) e passa `pintaOwned` ao `StudioFullClient`, que monta o adapter
**`pintaLibrary`** SÓ com a posse (produtos vendidos à parte): `list()` = import dinâmico do
subpath **`@sistemazero/pinta/studio-library`** (⚠️ NUNCA a raiz — puxaria o app do Pinta pro
bundle) + `setPintaStorageNamespace(viewerId)` + `listGalleryForStudio()`; `import(id)` =
`exportAssetForStudio(id)` → **`savePersonalAsset` ANTES de devolver** (preserva a mão-dupla e o
botão editar) → devolve o asset com o NOME salvo (upsert pode sufixar). No Estúdio, o botão
"🎨 Trazer do Pinta" abre a modal com a galeria INTEIRA + busca e a seção "Meus desenhos" some.
No Pinta, o foguete "Usar no Estúdio" passou a aparecer SÓ em desenho de jogo do Pensa
(`projectRef`) — desenho avulso chega ao Estúdio puxando de lá. `MainContainer` dá largura
total a `/pinta`. **Bloco de aula do Pinta (15/08/2026):** a criança também desenha DENTRO da
aula — `case 'pinta'` no `parseLessonBlock` (⚠️ sem ele o bloco SOME e a aula fica em branco) +
chip **"Desenhe"** (`Palette`, `kids-unit-grad`) no `kids-lesson-blocks`, envolvendo o
`PintaBlockView` do member-shell; shims `…/blocks/[blockId]/pinta-submission` e
`…/pinta-carryover`; o `lesson-player-client` trata o `PINTA_GATE_NOT_SUBMITTED` no toast (a
entrega TRAVA a conclusão, como o Estúdio). A aula NÃO usa a galeria pessoal (banco próprio por
bloco+perfil) — a ponte para o Pinta completo é "Baixar o desenho" + importar. Requisitos de build: `transpilePackages` + `@import` do `pinta.css` +
`@source "../../../pinta/src"` no globals.css (MESMO gotcha das utilitárias `sz-*`/`pz-*` — sem
isso as `pin-*` são no-op e os modais saem washed-out). Deploy: `packages/pinta/**` (e
`packages/studio/**`) nos watchPatterns do railway.json + case `packages/pinta/*` no ci.yml.
Produto no catálogo: sku/slug/chave **`pinta`** (seed idempotente, R$97 placeholder).

## Molda (oficina 3D — produto vendável, 09/2026)

O **Molda** (`@sistemazero/molda`) é a oficina 3D: a criança monta MODELOS low poly (peças cubo/
rampa/cilindro/bola numa grade, pele pintada direto no modelo), TEXTURAS de superfície e CÉUS 360°
(`.hdr`) para os jogos 3D do Estúdio — quarto irmão do fluxo criativo (**Pensa planeja → Pinta
desenha → Molda modela → Estúdio constrói**). Item "Molda" no `nav.ts` (`Box`, entre Pinta e
Estúdio; o `/criar` ganhou o card 3 e o Estúdio virou o 4) → rota `/molda` (`protectedPrefixes`,
`EMBEDDED_APP_PREFIXES`), gate em 4 ESTADOS: `app/(app)/molda/page.tsx` chama
`checkMoldaAccessReadonly()` (refs `molda,estudio-completo` numa ida — a 2ª vira `studioOwned`,
atalho e dica do "Trazer do Molda") → 200 sem produto = `KidsLockedMolda`; status ≠ 200 =
`KidsMoldaUnavailable` (retry); produto + carreira ≥ **`THREE_D_CREATION_MIN_LEVEL`**
(`explorer`, o Explorador(a) de Mundos desde 05/09 — antes `hacker`: ⚠️ a oficina abre no posto
que ganha o kit Jogo 3D, consumidor do modelo; `meetsThreeDCreationLevel` no member-shell) = `molda-client.tsx` (`'use client'`, import
dinâmico no effect, tema do next-themes, `setMoldaStorageNamespace(viewerId)` ANTES de montar,
deep link `?criacao=`). **Sem backend próprio** (galeria no IndexedDB POR PERFIL), mas COM a nuvem
desde 04/09: **"Guardado na sua conta" com a tool `molda`** — `src/lib/molda-cloud-persistence.ts`
embrulha `createMoldaPersistence({namespace})` (molde do wrapper do Pinta, sem biblioteca de
paletas; superfície `loadAll/load/save/saveMany/remove/removeMany/subscribe`; marcas
`sz:creations-synced:molda:<perfil>`; a miniatura viaja SÓ no modelo e só até 12 000 chars; o
registro de "aberta no editor" do pacote avisa SEM id, então o wrapper confere `isMoldaAssetOpen`
nas puladas; os `changed` do próprio IndexedDB atravessam o embrulho) e o `molda-client` liga
`createCreationsCloud({ tool: 'molda', viewerId, idleMs: 5_000 })` + `CloudSaveBadge` +
`flush({timeoutMs: 5000})` no cleanup. ⚠️ O members precisa da migration `0072` (`creation_tool`
+ `molda`) ANTES do deploy do kids — sem ela a reserva falha e a fila retenta. Os espelhos do
union (members domínio/schema/DTO/cache/contagem, core, member-shell, kids) são travados por
`tests/molda-conformance.test.ts` (lê por texto + o `CREATION_TOOLS` puro do members).
**"Trazer do Molda" no Estúdio (lote 7, 04/09):** a página `/estudio` passou a pedir
`checkCreativeToolsAccessReadonly()` (refs `estudio-completo,pinta,molda` numa ida) e o
`studio-full-client` monta o adapter `moldaLibrary` SÓ com `moldaOwned` (import dinâmico do subpath
`@sistemazero/molda/studio-library`, NUNCA a raiz; `setMoldaStorageNamespace(viewerId)` em cada
método; `import(id)` = `exportAssetForStudio` → `savePersonalAsset({kind, originalFileName,
origin: 'molda'})` ANTES de devolver, com o nome salvo). No Estúdio o botão "🧊 Trazer do Molda"
traz modelo/textura/céu, e o kit Jogo 3D ganhou "Criar o objeto … com o modelo" e "Usar o céu
360°" (ver `packages/studio/CLAUDE.md`). A
recompensa do Explorador(a) de Mundos anuncia "Molda, a sua oficina 3D" e a do Inventor(a) voltou a
"Pensa + Zappy" (`career-rewards.ts`; o `career-rewards-conformance` trava a promessa em
`THREE_D_CREATION_MIN_LEVEL`). Requisitos de build: `transpilePackages` + `@import`
do `molda.css` + `@source "../../../molda/src"` no globals.css (MESMO gotcha das `sz-*`/`pz-*`/
`pin-*`: sem isso as `mld-*` são no-op). Deploy: `packages/molda/**` nos watchPatterns do
railway.json + case `packages/molda/*` no ci.yml. Produto no catálogo: sku/slug/chave **`molda`**
(seed idempotente, R$97 placeholder; o seed também reconcilia o componente num combo existente).
Assinantes anteriores entram pelo comando do members `entitlements:rollout-molda`: dry-run por
padrão e escrita somente com `--apply`.

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
- **Carreira do aluno (rank, 06/2026; ESCADA DE 8 na reforma 2D/3D 17/07/2026: Faísca→Construtor(a)→Inventor(a)→Explorador(a) de Mundos→Mestre dos Jogos→Arquiteto(a) de Mundos→Gênio da Criação→Lenda — slugs internos noob/coder/hacker/explorer/elite/architect/champion/god)** — `lib/level-info.ts` (`LEVEL_INFO` rótulo/cor/ícone +
  `levelInfo()`/`nextLevelHint()`; cor = CSS var `--level-<slug>` em `globals.css` `:root`+`.dark`),
  `components/kids/avatar-with-aura.tsx` (`AvatarWithAura` — anel/brilho na cor do nível ao redor do
  `KidsAvatar`, estático p/ reduced-motion) e `level-badge.tsx` (`LevelBadge` — insígnia ícone+nome).
  Usados no **perfil** (`profile-client.tsx`: aura no avatar + insígnia + linha "faltam X projetos…"
  via `nextLevelHint`), no **menu** (`user-menu.tsx`: aura no avatar do header + insígnia no dropdown)
  e no **perfil público** (`public-profile-view.tsx`: aura + insígnia). O nível vem de
  `gamification.level` / `PublicProfileDTO.level` (members deriva).
  ⚠️ O antigo `CourseLevelChip` (rótulo do DEGRAU do curso sobre a capa) e o filtro por degrau do
  catálogo **NÃO existem mais**: nome de degrau é vocabulário de quem MONTA o curso, e hoje um
  teste-guarda proíbe exibi-lo (`tests/copy-vocabulario.test.ts`). O `courseTierOf`/
  `COURSE_TIER_LABELS` seguem vivos como LÓGICA (horizonte, trava, admin).

  ⭐⭐ **SELO DE ESTADO no card (15/08/2026)** — `lib/course-badge.ts` (régua PURA) +
  `components/kids/course-badge-chip.tsx` (pintura), no slot `absolute top-2 left-2` que o
  `CourseLevelChip` deixou livre. É a **outra metade do contador do medalhão**: sem ele a criança lê
  "8 de 9", entra na trilha e encontra nove cards idênticos, sem saber qual falta nem por quê.
  | curso | pronta quando | selo pendente |
  |---|---|---|
  | de POSIÇÃO (`careerSlot`) | concluiu **e** publicou no Mural | "Publique no Mural" (chip SÓLIDO) |
  | BÔNUS (`careerSlot` nulo) | só concluiu | nenhum |
  - ⚠️⚠️ **Bônus NUNCA pede o Mural** — é o anti-vácuo travado em `tests/course-badge.test.tsx`.
  - **Card da HOME** (`course-card.tsx`) mostra só o pendente (`only="publicar"`): "pronta" ali é
    redundante com a barra em 100% e o CTA "Revisar curso". ⭐ E o `only` acabou sendo LOAD-BEARING,
    não só cosmético: o marco é congelado e a barra é ao vivo, então um curso que ganhou aula nova
    exibiria "Pronta!" ao lado de uma barra em 90% e de um CTA "Continuar". O card do catálogo não
    tem barra, então lá o "Pronta!" não contradiz nada. Não uniformize os dois cards.
  - ⚠️ **O selo EXPÕE curso de posição mal configurado** (sem bloco de Estúdio com vitrine): a
    criança não tem como publicar, então "Publique no Mural" fica para sempre e o contador nunca
    fecha. É a armadilha que o admin já sinaliza com ⚠️ "Sem vitrine" na listagem — o selo só a
    torna visível para quem sofre com ela. Curso-base nessa situação é bug de autoria, não do selo.
  - ⚠️ O chip fica **DEPOIS** do véu de bloqueado no DOM: o selo conta o que a criança já fez e não
    pode sair borrado se o acesso vencer depois.
  - ⚠️ **NÃO é clicável** (v1): os dois cards já são um `<Link>` inteiro e âncora não aninha em
    âncora — virar atalho para publicar exigiria refazer a raiz do card.
  - ⚠️ Sem `milestones` (members antigo, vitrine adulta) não há selo. Silêncio > selo errado.

  **Trava da carreira nos cards (24/07):** os dois cards tratam o `careerLock.reason` —
  `foundation-first` (CTA que NOMEIA o curso-base), **`tier-reward`** (🎁 "Recompensa: complete a
  etapa X" — bônus `careerSlot=null` virou recompensa, abre quando a etapa completa) e
  `future-tier` ("Em breve na sua carreira"); deep-link em curso travado cai no 423 →
  `KidsLockedCourse` com copy por motivo (`careerLockReason`, testado em
  `tests/career-lock-reason.test.ts`).
  **MAPA DA CARREIRA em /cursos (24/07; FITA + medalhões grandes):** a
  página de cursos é o MAPA — os 8 níveis ligados por uma **FITA curva CONTÍNUA** (SVG) que
  serpenteia entre eles; a parte conquistada acende no **degradê das cores dos níveis**
  (`--level-<slug>`) e a parte à frente fica apagada com cadeado (≠ a antiga linha reta tracejada,
  que lia como "timeline genérica"). Geometria PURA em `lib/career-path.ts` (centros dos nós + `d`
  da fita completa/percorrida + paradas do degradê, num espaço de viewBox NORMALIZADO; o `<svg>`
  usa `preserveAspectRatio=none` + `vector-effect: non-scaling-stroke` e os nós ficam em `top/left %`
  → fita e medalhões alinham em qualquer largura; vars `--career-node`/`--career-row` no globals).
  Regras PURAS em `lib/career-map.ts` (`LEVEL_TIER` espelha o learningTier do core, `LEVEL_STUDY`,
  `coursesForLevel`, `careerNodeState`, `trilhaLocked`; testes `career-map`/`career-path`/
  `career-conformance`). Nó = **MEDALHÃO GRANDE** (`--career-node`) com a ilustração Dedé/Debinha em
  **`public/carreira/<slug>.webp`** (**as 8 COMMITADAS 24/07**; fallback `onError` → ícone do
  LEVEL_INFO; pipeline = `fluxo-criativo/scripts/preparar-poses-carreira.py` — lê
  `~/Downloads/<slug>.png` do ChatGPT, recorta o chroma `#00B140` e escreve os WebP aqui; trata os
  casos especiais do 1º lote: fundo em DEGRADÊ no `god` [corte por cor de fundo POR LINHA] e brilhos
  VERDES pintados pela IA em `god`/`elite`/`noob` [hue girado p/ o acento do nível]); nível não
  atingido = `grayscale` + cadeado e NÃO navega (wiggle + toast); liberado → **rota
  `/cursos/trilha/[level]`** (por SLUG DO NÍVEL, não por degrau; o segmento estático `trilha` NÃO
  colide com `/cursos/[slug]`). **Cada trilha mostra o degrau inteiro do seu posto**, bônus incluso:
  Faísca → Primeiros Passos, Construtor(a) → Iniciante 2D e assim por diante. O `LEVEL_STUDY` do kids é ESPELHO da escada do core
  (`CREATOR_CAREER_LEVELS`), travado por `tests/career-conformance.test.ts`. Deep-link em trilha
  bloqueada → recado gentil (`trilhaLocked` por nível, escape p/ EQUIPE: algum curso liberado →
  nunca mura). Gamificação fora → grade clássica.
  ⭐ **HORIZONTE DO CATÁLOGO (08/2026) — `lib/career-horizon.ts` (puro) + `tests/career-horizon.test.ts`:**
  a carreira exige 49 cursos (1 + 8×6, em 7 degraus) e o catálogo real tem punhados, então o mapa dizia
  "faltam 7 cursos" de cursos que ninguém gravou e mostrava 6 medalhões com CADEADO — que para
  criança significa "você não fez o suficiente". Agora o mapa desenha **só até onde o catálogo
  consegue levar** (`careerHorizon` = último nível cujos `requiredSlots` estão todos publicados) e
  fecha com o **nó "E tem muito mais pela frente"** (`career-horizon-node.tsx`: arte da Lenda,
  martelinho no lugar do cadeado; tocar balança o nó e mostra um toast dizendo que essa parte está
  em construção). O contador do nó conta **só o que existe**; nada pronto a fazer → "Você está em
  dia!" + atalho p/ `/estudio` (só com posse — produto à parte).

  ⭐⭐ **O CONTADOR DO MEDALHÃO conta a TRILHA INTEIRA (15/08/2026)** — `tierCompletion` /
  `tierCompletionByLevel` / `nodeShowsCheck` em `lib/career-map.ts`. O problema: quando a usuária
  publica um curso num degrau que a criança JÁ PASSOU, ela nunca fica sabendo — subiu de posto, o
  medalhão está com ✓, e a aventura nova morre sem público. Três mudanças, todas de APRESENTAÇÃO:
  - **Denominador = `coursesForLevel`**, a mesma função que a página da trilha usa: TODOS os cursos
    publicados do degrau, **bônus incluído**. Antes só as posições com `careerSlot`, e era isso que
    escondia o bônus. Reuso, não regra nova — o contador passou a bater com o que ela vê ao clicar.
  - ⭐⭐ **Numerador de RÉGUA MISTA** (`courseIsDone`, em `lib/course-badge.ts`): posição
    **obrigatória** só conta pronta quando concluída **e publicada no Mural**; curso **bônus** conta
    com a conclusão. É a régua de cada um — o bônus não vale para nível nenhum, então cobrar Mural
    dele seria inventar exigência. Com régua única, o contador dizia "8 de 8 prontas" enquanto a
    frase do posto pedia publicar: contradição na mesma tela.
    ⭐ **Desde 15/08 os dois marcos vêm DENTRO de cada curso** (`CatalogCourseView.milestones`, do
    ledger do members) e a conta é POR CURSO. A 1ª versão derivava as obrigatórias de
    `level.remaining[tier]`, o que obrigava a tratar degrau futuro à parte (o `remaining` é medido
    contra o PRÓXIMO posto e vinha 0 sem a criança ter feito nada), a limitar o resultado ao total,
    e a depender de cada posto ser dono de um degrau inteiro. **Nada disso é mais necessário** —
    e a página deixou de buscar o `listMyCourses` só para contar.
    ⚠️ Selo do card e contador leem o MESMO campo, logo não podem divergir. Curso re-etiquetado
    depois de qualificado conta no degrau em que está AGORA (é o que a criança vê na trilha),
    enquanto a carreira segue o retrato congelado do marco — divergência aceita e rara.
  - **O contador aparece nos postos JÁ VENCIDOS** (antes só no atual) e o **✓ regride** enquanto
    faltar curso ali (`nodeShowsCheck`). Sem as duas, mudar o denominador não resolveria nada: o
    degrau passado não tinha contador algum para virar "8 de 9".

  ⚠️⚠️ **A régua da CARREIRA não mudou, e não pode mudar.** Subir de posto continua exigindo as
  posições OBRIGATÓRIAS com os dois marcos (concluir + publicar no Mural), no members/core. São duas
  contas separadas de propósito: `careerProgress` (career-horizon.ts) alimenta a frase "Faltam N para
  virar X" e ficou INTOCADO; `tierCompletion` alimenta bolinhas, contador e ✓. Mexer no primeiro
  quebraria a frase, porque ele calcula `remaining = min(missing, ready − done)`.

  ⚠️ **O `/perfil` NÃO mudou** (decisão da usuária, 15/08): aquela escada é a CARREIRA — os postos
  conquistados —, não o conteúdo do degrau. O ✓ de lá segue posicional.

  ⚠️ **Dois defeitos achados no full review do próprio lote, os dois de "o que fazer quando a fonte
  falha ou quando as duas contas discordam":**
  1. O card **"Você está em dia!"** é regido pelo `careerProgress` (só obrigatórias). Com um bônus
     novo por fazer, o medalhão dizia "8 de 9" e o card logo abaixo afirmava "você já fez tudo que
     está pronto por aqui" — a mentira que este contador existe para matar. Agora ele exige TAMBÉM
     a trilha completa (`trilhaComplete`). Regressão em `tests/career-map-counter.test.tsx`.
  2. **Progresso DESCONHECIDO ≠ nada feito.** `listMyCourses` falhando fazia `done = 0` em todo
     degrau: um veterano perderia TODOS os ✓ e veria "0 de 8" na carreira inteira por um soluço de
     rede. Era a mesma régua do `catálogo null ≠ vazio`. ⭐ **O caso deixou de existir** quando os
     marcos passaram a vir no próprio catálogo (15/08): ou ele carregou, e o contador é confiável,
     ou a página já falhou antes. `completionByLevel` segue OPCIONAL só para o ✓ ter um caminho
     posicional em estado torto.

  3. **Bolinhas sem teto.** `ProgressDots` renderiza uma por curso, e o total deixou de ser
     limitado a 8 quando o bônus entrou. A legenda é `w-44` (176 px) e a fileira é flex SEM wrap,
     a 12 px por bolinha: 15 cursos estouram a caixa e vazam por cima da fita. Teto explícito
     (`MAX_PROGRESS_DOTS = 12`); acima dele as bolinhas somem e fica o número, que é exato.
     Antes isso era impossível por construção — o defeito nasceu ao remover essa garantia.

  ⚠️ **O lado duro da régua mista, e é intencional:** quem concluiu os 8 e não publicou nenhum lê
  "0 de 8 aventuras prontas", agora também em degrau já vencido. É a carreira sendo fiel — e é
  justamente o que o SELO do card tornou legível: ao entrar na trilha, os oito cards dizem o motivo. ⚠️ **Nenhum espelho novo do core:** `requiredSlots[nível_i] = ∪ LEVEL_STUDY[j].slots
  p/ j < i`, então `LEVEL_TIER`+`LEVEL_STUDY` bastam e a garantia do `career-conformance` é herdada.
  ⚠️ **Catálogo `null` (a busca FALHOU) ≠ catálogo vazio:** `null` não restringe nada (cai na visão
  definitiva), senão um soluço de rede tiraria postos conquistados da tela; vazio é informação real
  e encolhe. **A visão provisória se dissolve SOZINHA:** catálogo completo → horizonte `god` → os 8
  medalhões de sempre e o nó de fechamento some (travado no teste "catálogo COMPLETO"). Consomem o
  horizonte: `/cursos`, `/cursos/trilha/[level]`, `/perfil` (`career-timeline`, que colapsa os postos
  além do horizonte em UMA linha) e a home (`creator-career-card`). ⚠️ A frase "falta N curso…" tem
  UMA fonte só — `nextLevelHintWithin` no `career-horizon.ts`; o antigo `nextLevelHint` do
  `level-info.ts` foi REMOVIDO (era a mesma frase sem o limite do catálogo, e duplicata de frase já
  drifou 2× neste arquivo). ⚠️ O `<ol>` do mapa leva `mb-10`: a legenda do ÚLTIMO nó é absoluta e cai
  ~42px ABAIXO da caixa, e sem a margem o bloco "em dia" entra por cima dela (medido, 10px).
  ⚠️ O catálogo com filtros MORREU no kids: `course-catalog-client.tsx`/`catalog-filter-bar.tsx`/
  `lib/use-catalog-filters.ts` REMOVIDOS (o hook segue no member-shell p/ o community adulto). **COMEMORAÇÃO de SUBIDA de nível:**
  `level-up-celebration.tsx` (overlay Zappy + confete + som + insígnia GRANDE na cor do nível,
  `useModalA11y`, SEM auto-close desde 14/08) disparada pelo `level-up-watcher.tsx` (cliente) — compara o
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
  **Superfícies (24/07):** mesa/escrivaninha/estante/`estante-trofeus` têm NICHOS (`surface` no
  catálogo; a estante de troféus, 6 nichos, vem DE GRAÇA com o 1º troféu — award do members) e os
  itens pequenos são `stackable` (troféus de chão + ursinho/globo/bola/vela). Filhos usam
  `PlacedItem.on`+`slot` e renderizam DENTRO do grupo do pai (`furniture-piece.tsx` prop `stacked`,
  offsets em `SURFACE_SLOTS` do `lib/room-catalog.ts`, escala `SURFACE_CHILD_SCALE`; herdam
  posição/rotação — mover o pai carrega os filhos). v1 SEM drag: fluxo por BOTÃO no room-builder
  ("Em cima…" lista superfícies com vaga / "Descer" devolve ao chão; tirar uma superfície derruba
  os filhos pro tray com aviso); tocar num filho no 3D SELECIONA (não arrasta). Filho não ocupa
  célula (guards em `placement.ts`/`occupied`/`isFree`); o members valida tudo de novo no save
  (2ª passada do canonicalize). Conformância trava `surface`/`stackable`/nº de slots.
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
  PERFIL (não a conta). 1 card de identidade — avatar CLICÁVEL (leva ao configurador
  `/meu-avatar`, ÚNICO caminho de troca da imagem desde 24/07), nome + telefone do perfil +
  **colocação no ranking kids**
  (`getGamificationReadonly({withRanking: true})` → `ranking.position/totalStudents`; rankings
  adult/kids separados) — e botão "Editar perfil" abrindo um Dialog com nome (≥ 3) + telefone,
  que PATCHa `/api/profiles/:id`. O perfil ativo é resolvido de `listReadonly()` por `id ==
  session.id`. **E-mail e SENHA da conta saíram daqui** (são da CONTA): a troca de senha vive na
  **Área dos pais** (`/perfis`, sessão da conta → `ParentPasswordChange`). A página também HOSPEDA o
  `badge-showcase`, a `streak-protection` (férias/protetores) e o `league-board` (liga da semana).
- **Perfil PÚBLICO — `public-profile-view.tsx`** (rota `/crianca/[profileId]`): vitrine pública de
  uma criança (avatar + apelido + badges + quarto + **Jogos publicados no Mural**), SEM dados
  sensíveis. **Seção "Jogos publicados no Mural" (07/2026):** grid de cards com capa + título (via
  `PublicProfileDTO.games`, que vem do members → `hub.listShowcaseByAuthor`, best-effort; ausente/
  vazio → seção some), cada um linkando `/jogar/<playId>` em nova aba (jogo legado sem playId =
  card não-clicável). Os jogos já são públicos no `/jogar` e a seção só renderiza dentro de um
  perfil que passou pelo gate `publicProfileEnabled` — sem vazamento novo. Os **nomes do
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
- **Remix (B):** página do Mural checa `checkStudioAccessReadonly` **+ o RANK**
  (`getGamificationReadonly({withRanking:true})` → `resolveStudioTier`; 24/07) → prop
  **`remixTier`** (`{pro, allowedExtensions}` | null) no `KidsSpaceViewClient`; botão "Fazer a
  minha versão" no `PlayLinkActions` só com posse do Estúdio **E `tier.freeStudio`** (Faísca não
  vê o botão — importaria projeto que nem consegue abrir; rank indisponível também esconde,
  salvo equipe = Lenda) → fetch `/api/studio/play/:id` → **checagem de FERRAMENTAS**
  (`remixRequirementFromSnapshot` × `studioRemixCovered` do member-shell — jogo Pro sem ser
  Lenda ou extensão fora da allowlist do degrau → `toast.info` gentil nomeando o nível via
  `minCareerLevelForRemix`+`levelInfo`, SEM importar) → `setStudioStorageNamespace(viewerId)` →
  `importProjectSnapshot(snapshot, {name: 'Remix de <título>'})` → toast + push `/estudio`.
  **Selo no card:** `thread.studioMeta` ({pro, extensions[]}, snapshot no publish — hub migr
  `0007`) fora do degrau → botão vira cadeado tracejado "Fazer a minha versão · no nível X"
  (`remixLockFor` no client → prop `remixLock` de ShowcaseCard/ThreadDetail/PlayLinkActions;
  clique continua vivo e mostra o recado). Post ANTIGO sem meta → botão normal, a checagem do
  clique segura. Jogo só com blocos avançados do NÚCLEO (sem extensão) abre e roda — a paleta
  curada é a pedagogia (aceito na v1).
  **Gamificado (retenção pós-cursos 07/2026):** após importar, dispara best-effort
  `POST /api/studio/remix {playId}` (shim novo sobre `shell.routes.studioRemix`, DENTRO do matcher
  do proxy — JSON pequeno, ganha o anti-CSRF) → marco da missão `weekly-remix`/`monthly-remix-3` no
  members (que valida posse + playId real no hub + recusa self-remix; o toast não espera).
- **Handoff Pensa→Pinta/Estúdio:** a página `/pensa` checa as duas capabilities best-effort e
  mantém o plano visível mesmo sem posse. O client abre `?tarefa=<id>`; cada ferramenta busca
  `/api/pensa/tasks/:id/handoff`, restaura seu painel e sincroniza
  `/api/pensa/tasks/:id/progress`. Não use `sessionStorage` para contexto de tarefa.
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
  total de `studio_submissions` aparece como **"entregas"** (`submissionsCount`/
  `submissionsSubmitted`, com fallback nos aliases antigos), porque agora inclui desenhos do
  Pinta além de projetos do Estúdio. O
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
- **`profileAvatar` autorizava ANTES de gravar no R2** (⚠️ handler REMOVIDO em 24/07 — a foto do
  perfil vem SÓ do snapshot do avatar 3D; o padrão authorize-before-write segue no `avatarSnapshot`).
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
- **Portão dos pais = cookie ASSINADO e temporal:** `server/parent-gate.ts` grava um token
  `v1.<payload-base64url>.<HMAC-SHA256>` com `accountId`, emissão e expiração, e valida assinatura,
  conta, TTL máximo de 15 min e relógio no servidor. Em produção, `PARENT_GATE_HMAC_SECRET` é
  obrigatório e precisa ser o mesmo em todas as réplicas; só desenvolvimento pode gerar um segredo
  efêmero por processo. O accountId não é segredo, então nunca deve ser aceito sem assinatura.
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

## Zappy do Studio (08/2026)

- O tutor é injetado somente em `StudioFullClient` e `StudioProClient`; players de aula e o
  Pensa não recebem `tutor`, portanto não exibem o botão. A capability `zappyEnabled` é derivada
  no Server Component pelo mesmo gate do BFF, então alunos abaixo de Inventor(a) não veem a UI.
- Configuração: `ZAPPY_ENABLED` é o interruptor de emergência e `OPENROUTER_ZAPPY_MODEL` é
  opcional. Não há allowlist de contas; a equipe mantém bypass de QA.
- Chips de aula só existem em respostas com `courseSlug` autoritativo e abrem
  `/cursos/:slug/aulas/:lessonId` em nova aba com `noopener,noreferrer`.
- **Chips de sugestão (08/2026):** a resposta traz até 3 continuações prováveis (`suggestions`) que
  viram chips sob a ÚLTIMA mensagem — clicar **PREENCHE o campo** e foca (não envia sozinho; é o
  padrão que a usuária aprovou no Pensa, e mantém cooldown/quota intactos). Sem conversa, o estado
  vazio mostra 3 perguntas fixas por modo. Cada sugestão passa pela mesma redação de PII/segurança
  da resposta antes de chegar aqui.
- **Modelo:** `OPENROUTER_ZAPPY_MODEL=openai/gpt-4.1-mini` (staging + prod, 06/08 — o 4.1 puro
  custa 13× o 4o-mini e o prompt deste lote é maior de propósito; o 4.1-mini é 5× mais barato que
  o 4.1 sem voltar ao modelo vago). O **Pensa fica no `gpt-4.1`**. Este é o ÚNICO app com
  OpenRouter configurado — o community adulto não tem chave e não roda Zappy. Detalhes de preço,
  cascata de fallback e por que a quota não é alavanca de custo: member-shell §Zappy.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

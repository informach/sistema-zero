# CLAUDE.md — @sistemazero/pensa

> Consulte o Context7 antes de alterar bibliotecas ou frameworks.

O Pensa é o planejador de jogos para crianças de 8 a 13 anos. Ele organiza a criação; não monta o Estúdio, executa tarefas, publica jogos ou mantém kanban e checklist.

## Método ZERO

- **Z — Zerar a Bagunça:** ideia, objetivo, controles, vitória, derrota e escolha 2D/3D. Produz `idea`.
- **E — Enxergar o Jogo:** loop, cenas, telas e Bíblia Visual. Produz `game_design` e `visual_direction`.
- **R — Roteirizar a Criação:** Cartões de Criação pequenos, ordenados e destinados ao Pinta ou ao Estúdio. Produz `task_plan`.
- **O — Organizar a Criação:** auditoria da ordem, dependências, guias e catálogo oficial. Produz `plan_review`.
- **done — Meu plano:** mostra ordem, dependências, estado resumido e próxima tarefa. A execução ocorre na ferramenta de destino.

Cada versão do jogo tem um ciclo próprio. Uma versão nova pode ser planejada depois de O, sem depender da execução da anterior.

## Contrato público

`<PensaApp adapter={PensaHostAdapter}>` é o único componente público. O adapter contém:

- `transport.request` para `/api/pensa/*`;
- `transport.streamChat` para o chat SSE da etapa Z;
- `capabilities.pintaOwned` e `capabilities.studioOwned` (disponibilidade clássica); `capabilities.studioProAvailable?` separa o acesso Pro da paleta de blocos. O host Kids informa ambos; hosts antigos mantêm o fallback para `studioOwned`;
- `onOpenTask({ taskId, destination, studioProjectId? })`: missões clássicas usam a rota da oficina com `?tarefa=`; um jogo Pro confirmado leva `studioProjectId` e usa navegação completa para `/estudio/pro/<id>?tarefa=<id>`;
- `onOpenGame?({ projectId, studioAuthoring? })` abre o jogo do plano sem iniciar missão. `studioAuthoring: code` usa navegação completa para a rota Pro, preservando o isolamento do navegador;
- tema e imagens opcionais do mascote.

O adapter não cria projetos do Estúdio, não sincroniza snapshots e não renderiza editores. O pacote não conhece router, IndexedDB ou `LessonActivity`.

**Chrome do HOST nos cabeçalhos (07/09/2026):** o botão de esconder o menu lateral da comunidade
entrou nos DOIS cabeçalhos (home e detalhe do plano). Ele é a receita COMPARTILHADA
`.sz-tool-btn-menu` de **`@sistemazero/ui/tool-chrome.css`** (44px, borda 2px, fundo de painel,
sombra dura; "menu escondido" = borda e tinta suaves do acento via `[aria-pressed="true"]`), a
MESMA do Pinta e do Estúdio (o círculo de 46px `.pensa-round-btn` da primeira versão SAIU no lote
do mesmo dia: ela reclamou que os três tinham saído diferentes). ⚠️ Foi uma **ABA colada na linha
da sidebar** até 11/09/2026; desde as telas-modelo é o QUADRADO de cantos de 12px dentro do
conteúdo (40px no mouse, 44px no toque), e o `--sz-tool-inset` saiu dos dois cabeçalhos. O
"voltar" do detalhe usa o quadrado `.sz-tool-icon-btn` (`ArrowLeftIcon` inline; até 11/09/2026 era
o `.sz-tool-btn.sz-tool-btn--icon`, que saiu da folha na limpeza do lote) para não destoar do menu
ao lado. ⚠️ Nenhuma regra SEM camada pode alcançar esses botões (a antiga
`.pensa-project-header > button` morreu, e o `:focus-visible` global tem `:not(.sz-tool-*)`),
senão ela vence a receita em `@layer components`. O contrato é `PensaHostChrome` (`core/types.ts`,
só `menu: {hidden, label, onToggle} | null` — o Pensa persiste no servidor, então não há selo de
nuvem) e chega pelo **`PensaHostChromeProvider`** (exportado no index, com `usePensaHostChrome`),
que o kids renderiza em volta do `<PensaApp>`; sem Provider (os testes, o playground sem
`?host=1`) nada aparece. Desde 11/09/2026 o contrato também traz `back` ("Voltar para Criar"):
a home desenha o `HostBackLink` (o quadrado `.sz-tool-back`, `<a href>`: clique simples chama
`onNavigate`, com Ctrl/Cmd/Shift/Alt fica com o navegador) logo DEPOIS do menu, e o detalhe o
ignora (lá o "voltar" leva à home). Na home os dois moram no `.sz-tool-header__nav` dentro do
`.pensa-home-lead` (âncora do teste do host), antes do h1; no detalhe o menu vem antes do
"voltar" e o bloco do título é `.pensa-project-title` (por classe, não por `nth-child`).
Os cabeçalhos rolam com o conteúdo, como nas galerias do Pinta/Molda. Testes:
`components/PensaApp.hostChrome.test.tsx`, `styles/tokens.test.ts`.

## A home das telas-modelo (11/09/2026)

A home "Meus projetos" segue a imagem-modelo dela (plano `o-design-da-plataforma-composed-gray.md`,
lote 7, passo 7), no MESMO desenho das galerias do Estúdio e do Pinta: três FAIXAS de borda a borda
(`.pensa-home.sz-tool-bands`, receitas de `@sistemazero/ui/tool-chrome.css`) que rolam juntas dentro
do `.pensa-planner`.
- **creme** (`<header>`): [menu][voltar] + o selo amarelo **"Pensa · sua oficina de planos"**
  (`.pensa-home-chip`, lâmpada) em cima do h1 `.sz-tool-title` "Meus projetos" e do subtítulo;
  à direita a pílula primária **"+ Novo plano"** (nome exato mantido para os testes). O campo de
  criar sob demanda mora nesta faixa, 28px abaixo, como pílula branca; "Criar meu plano" e
  "Cancelar" viraram pílulas. No celular (`@container 560`) o [menu][voltar] fica numa linha só
  dele (ao lado deles o selo quebrava em duas linhas).
- **céu** (região "Meus planos", h2 `.pensa-sr-only`): a grade `.pensa-project-grid` em **3
  colunas, 2 no `@container 820` e 1 no `560`** (o `auto-fill` de 240px saiu), com o **cartão do
  plano** (`PlanCard`, um `<article>`): alvo + nome (h3 `.pensa-project-card__name` com
  `.sz-tool-card-title`, 22px), selos "Versão N" e "Plano aprovado" (menta) ou "Etapa X" (âmbar do
  aviso, a tinta que passa no contraste), a **trilha Z-E-R-O** em ladrilhos (`.pensa-zero-track`:
  vencida = azul cheio, atual = fio azul, futura = apagada; o nome de cada etapa em `sr-only`), a
  linha do andamento com a bandeirinha ("Etapa atual: …" azul / "Todas as 4 etapas concluídas"
  verde), "Editado há…" (`core/relativeTime.ts`, `Intl.RelativeTimeFormat` pt-BR: "agora" e "ontem"
  como palavra, o resto em número; nada de "anteontem"/"semana passada") e o **"Continuar"** em
  pílula primária; o nome acessível é "Continuar o plano <nome>" (os testes acham o plano por ele).
  ⭐⭐ **O cartão NÃO é clicável (19/09/2026, decisão dela).** O "Continuar" tinha um `::after` de
  `inset: -1px` que esticava a área clicável até a borda do cartão, e o `<article>` declarava
  `cursor: pointer` para o ponteiro não alternar dentro dela. Ela relatou o contrário do que o
  código dizia — *"estou clicando no card e não está acontecendo nada; só quando clico em
  continuar que abre o plano"* — e pediu a mãozinha só nos botões de ação. Saíram os três de uma
  vez: a camada, o `cursor` do cartão e o `position`/`z-index` da lixeira (que existiam só para
  ela escapar da camada). Hoje quem abre é o botão e quem apaga é a lixeira.
  ⚠️⚠️ **Isto REVOGA as duas correções anteriores do "cursor tremendo"** (o `inset: -1px` de 17/09
  e o `cursor` no ancestral de 18/09), e o conserto novo mata a classe por um caminho mais forte:
  sem camada esticada não existem duas fronteiras arredondadas para o ponteiro atravessar, então a
  alternância seta↔mãozinha deixa de ter CAUSA em vez de ser compensada. Quem voltar a esticar a
  área clicável reabre as três coisas juntas.
  ⭐ **Medido no playground (:5201) antes e depois**, com `elementFromPoint` + `getComputedStyle`:
  hoje o corpo do cartão responde `.pensa-project-card` com `cursor: auto` em todos os pontos
  (centro, nome, as quatro bordas) e clicar no meio não abre nada; reinjetando a folha de ontem
  (a camada mais o cursor), o MESMO ponto responde o botão, `pointer`, e o clique ABRE o plano.
  Ou seja: a camada estava VIVA no código, e o que ela via era um chunk velho ou um ambiente
  atrás. O `PensaApp.home.test.tsx` passou a travar o comportamento (clicar no `<article>` não
  navega), que até aqui não tinha rede nenhuma.
  ⚠️ O "Continuar" continua SEM andar no hover e no aperto, agora por outro motivo: ele vive nas
  faixas, onde a receita sobe a peça 1px, e 1px numa borda longa é o que faz o ponteiro parado
  nela entrar e sair do hover (a mesma razão do cartão "Novo plano", no `tool-chrome.css`).
  O **cartão "Novo plano"**
  (`.sz-tool-card--new`) FECHA a grade: abre o mesmo campo lá em cima e o foco volta a QUEM abriu
  (`openerRef`); com o campo já aberto só leva o foco até ele. Rodapé "Mostrando N planos". Sem
  planos: o convite `.pensa-empty` em cartão branco e o campo já aberto (sem o cartão "Novo plano").
- **lilás**: "Cada Cartão de Criação vai para o lugar certo" (`.sz-tool-section-title`) + as três
  oficinas (Estúdio, Pinta, Molda) em cartões INFORMATIVOS com o ladrilho da assinatura
  (`.sz-tool-tile--estudio|pinta|molda`), sem link nem o selo "N cartões" da imagem (a lista não
  traz a contagem).
- ⚠️⚠️ **As regras de ELEMENTO do `pensa.css` não têm camada e venciam as receitas**: `font:
  inherit` (apagava o peso das pílulas), `button { min-height: 44px }` (o quadrado do menu saía
  40x44), a regra dos títulos (tirava o 800 do `.sz-tool-title`) e o anel de foco. Todas agora
  deixam de fora `:where(:not([class*="sz-tool-"]))`, sem somar especificidade; o `tokens.test.ts`
  trava que nenhuma regra de botão/título/foco nova apareça sem a exclusão. Os títulos PRÓPRIOS do
  Pensa seguem em 700; os das telas-modelo vêm da receita em 800 (o `headingFont.test.ts` foi
  reescrito para isso). Ícones de traço inline em `components/icons.tsx` (o pacote não depende do
  `lucide-react`).
- **Playground** (`packages/pensa/playground`, `bun run dev` = Vite em **:5201**, entrada
  `pensa-playground` no `.claude/launch.json`): monta o `<PensaApp>` com um SERVIDOR EM MEMÓRIA
  (o "Runo" aprovado com cartões para as três oficinas e o "Guardiões da Lua" na etapa R; criar
  funciona e o chat do Zappy responde em pedaços); `?host=1` liga o menu e a seta, `?theme=dark` o
  escuro e `?vazio=1` o primeiro uso. O que ele não simula responde com erro legível. As folhas
  entram na ordem do host (theme-kids, tool-chrome, pensa.css; o teste de ordem do `@sistemazero/ui`
  lê o arquivo) e não há Tailwind (o Pensa não usa). Deps de dev: `vite` e `@vitejs/plugin-react`.
- Medido no playground a 1172px (= 1440 com o menu de 268): faixa creme de 189px (a imagem tem
  ~200), cartões de 327x267 (332x273), quadrados de 40px; escuro, 375px e o vazio conferidos.
- Testes: `components/PensaApp.home.test.tsx` (as faixas, o cartão do plano, o "Continuar", o
  cartão "Novo plano" e o foco, o vazio), `core/relativeTime.test.ts`,
  `components/PensaApp.hostChrome.test.tsx` (a seta), `styles/tokens.test.ts` e
  `styles/headingFont.test.ts`.

## Renomear o plano (26/09/2026)

Pedido dela: editar o nome do projeto. O servidor já aceitava `PATCH /projects/:id {name}`
(2..120, trim) nas cinco camadas; só faltava a tela. Só o DONO renomeia (quem entra em equipe
não vê o lápis, ver "Equipe").

- **Onde:** no cabeçalho do detalhe (`ProjectHeader` → `ProjectNameTitle`), o lápis
  (`PencilIcon`, inline como os outros) ao lado do `<h1>`, no quadrado compartilhado
  `.sz-tool-icon-btn` (`aria-label` "Renomear o plano <nome>"). Molde do `ProjectNameField` do
  Estúdio: clicar troca o título pelo campo "Nome do plano" com o texto selecionado; Enter ou
  sair do campo grava, Esc desiste (`cancelledRef` segura o `blur` tardio), e o foco volta ao
  lápis (`returnFocusRef`). Nome com menos de 2 letras ou igual ao atual só fecha, sem chamada.
  ⚠️ O lápis é IRMÃO do h1, nunca filho: dentro dele entraria no nome acessível do título e os
  `getByRole('heading', { name })` dos testes quebrariam.
- **Otimista:** `renameProject` troca o `detail.name` na hora, manda o PATCH fora do `run` (não
  trava o `busy` global) e, em erro, devolve o nome anterior com o `<Alert>` da faixa creme.
  ⚠️ O lápis NÃO some nem trava enquanto grava: é para onde o foco volta, e um botão escondido
  ou desabilitado não recebe foco (a primeira versão escondia e o foco se perdia).
- **CSS:** `.pensa-project-title__row` (flex, gap 8) e `.pensa-planner .pensa-title-input`
  (a receita do título das telas-modelo: família de exibição em 800, 44px, teto de 32rem para
  não engolir os créditos e a pílula). Nenhuma regra de elemento nova; nenhum `cursor`.
  ⚠️ A cor cai em `var(--sz-tool-ink, var(--pz-ink))`: a primeira versão caía em `--pz-text`,
  um token que NUNCA existiu (full review de 26/09/2026); o `tokens.test.ts` trava o nome.
- Playground: `PATCH /projects/:id` simulado. Testes: `components/PensaApp.rename.test.tsx`.

## Equipe do plano (26/09/2026)

Pedido dela: planejar em parceria. Um plano pode ser dividido com outro perfil pelo **código do
projeto** (decisões dela: convite por código, e os dois precisam ter o Pensa). Quem entra vê e
mexe em TUDO do plano; só o dono renomeia, apaga, gera o código e tira gente. As regras (tetos,
erros, quem é dono) são do members; o contrato está em `docs/pensa-planner.md` §Equipe. Aqui:

- **Tipos** (`core/types.ts`): `PensaProjectRole`, `role?`/`team?` nas views de lista
  (`{memberCount, ownerFirstName}`) e detalhe (`{memberCount, shareEnabled}`),
  `PensaTeamPersonView`, `PensaProjectMembersView` (o `shareCode` vem CRU, só para o dono) e
  `PensaShareView`. ⚠️ `role`/`team` são OPCIONAIS de propósito: members antigo = plano só meu
  (lápis, lixeira, sem chip). As palavras moram em `core/teamCopy.ts` (`TEAM_COPY`,
  `displayShareCode` = `ZAP-XXXXXX`, `personName` = 1º nome ou "Colega").
- **Home:** o chip `.pensa-chip.is-team` no cartão ("Em equipe · N" no meu plano com gente; "De
  <dono>" no plano em que entrei, que NÃO tem lixeira: apagar é do dono) e o **"Entrar com um
  código"** (`sz-tool-pill--outline`, `aria-controls="pensa-join"`) ao lado do "+ Novo plano".
  O formulário `#pensa-join` é a mesma `.pensa-create` da faixa creme; abrir um fecha o outro;
  o código vai como a criança digitou (quem normaliza é o members); o erro do servidor fica ao
  lado do campo (`role="alert"`, a frase dele); Esc/Cancelar devolvem o foco ao botão; entrar
  abre o plano (`POST /projects/join` → `loadProject`). O Esc mora no **`<form>`** (do código E
  do criar): vale com o foco nos botões, não só no campo. No primeiro uso (0 planos) cancelar o
  código REABRE o criar, senão o vazio "Dê um nome ao jogo…" ficava sem campo à vista.
- **Detalhe:** o **"Equipe · N"** (`.pensa-team-button`, `aria-haspopup="dialog"`) nas ações do
  `ProjectHeader` abre a **`TeamDialog`** (`components/TeamDialog.tsx`), irmã das faixas como a
  janela de apagar. ⚠️ O nome acessível é **"Equipe, N na equipe"**: o "Equipe · N" visível fica
  em `aria-hidden` (o leitor falaria "ponto médio") e o nome vem inteiro de um `.pensa-sr-only`;
  os testes acham o botão por `/^Equipe, \d+ na equipe$/`. Dono: o código
  (`<output class="pensa-team-code" aria-labelledby={h3}>` + "Copiar" com
  `navigator.clipboard`; sem clipboard o recado é honesto e o código fica selecionado, nunca
  `window.prompt`; "Gerar outro código" e "Desligar o código"), a lista (rosto ou inicial, 1º
  nome, "você"/"dono do plano") com **"Tirar" em dois passos NA LINHA** ("Tirar mesmo"/"Deixar")
  e "N de 5 lugares". Dois colegas com o mesmo 1º nome: o `aria-label` do "Tirar" leva a posição
  ("Tirar João (2º da lista) da equipe"). Membro: "Este plano é de X. Vocês mexem no mesmo plano."
  ("vocês", não "vocês dois": pode ter mais gente), a lista e **"Sair da equipe"** em dois passos
  (→ `DELETE …/members/me` → a home, que nasce com o FOCO no h1 "Meus projetos" (`tabIndex=-1`,
  bandeira `homeFocusRef` consumida ao montar): o "Equipe" e a janela já se foram). Erro fica na
  janela (`role="alert"`). `canRename` é `detail.role !== 'member'`.
  ⭐ **O foco dos dois passos** é um efeito sobre `pending`: armar foca o "Tirar mesmo"/"Sair
  mesmo"; desarmar ("Deixar"/"Ficar") devolve ao "Tirar" da linha/"Sair da equipe" (botões
  NOVOS: refs por `profileId`); tirou alguém = a linha sumiu, o foco pousa no
  `.pensa-team__seats` (`tabIndex=-1`). Sem isso Enter no "Tirar" jogava o foco no `body`.
  ⭐ **`load` tem token de pedido** (`loadSeq`) e abrir faz `setView(null)`: a resposta atrasada
  de uma abertura anterior (ou de uma janela já fechada) não repõe a lista velha.
  ⭐⭐ **`onTeamChanged` espelha `memberCount`/`shareEnabled` E chama `syncDetail`**: o members
  grava o `updatedAt` do projeto ao gerar/desligar o código e ao tirar alguém, então o app puxa
  `GET /projects/:id` SÓ para o `detail` (sem `loading`, sem recarregar a etapa: o
  `StageWorkspace` não desmonta e o rascunho fica). Sem isso o compasso acusava a própria
  criança em até 30 s.
- ⭐ **`useDialogFocus`** (`components/dialogFocus.ts`) saiu do `ConfirmDialog` e serve às DUAS
  janelas: foco no card ao abrir, Tab preso, Esc fecha (nunca gravando), foco de volta a quem
  abriu (`returnFocusTo`, lido no fechamento). Duas janelas com dois focos era como uma ia
  apodrecer.
- **"Alguém da equipe mexeu no plano."** (`.pensa-changed-banner`, `role="status"`, o cartão
  branco do aviso de "revendo"): com `memberCount > 0` um compasso (`teamPollMs`, 30 s; a prop
  existe para o teste injetar um curto e `0` desliga) pergunta `GET /projects/:id` com a aba
  visível e sem ação em voo, e compara o `updatedAt`. Mudou = a faixa com **"Atualizar"**
  (`refresh()`), em vez de recarregar por cima do que a criança escreve. ⚠️ Toda ação própria
  termina em `refresh` (o chat inclusive), o renomear copia o `updatedAt` da resposta e a janela
  da equipe passa pelo `syncDetail`, senão o compasso acusaria a própria criança.
  ⭐ **"Atualizar" pergunta antes com coisa sem guardar**: `refresh` = `loadProject` →
  `loading` → o `StageWorkspace` inteiro DESMONTA (rascunho do chat, cartão em edição, tarefa em
  edição). O `useUnsavedChanges` (agora UM só, em `components/unsavedChanges.ts`; o `TaskPlan`
  usa o mesmo) registra a posse no **`DirtyContext`** do `PensaApp` além do `beforeunload`, o
  rascunho do chat da etapa Z também conta, e o botão confere `isDirty()`: sujo abre o
  `ConfirmDialog` "Atualizar o plano?" / "Você tem coisa sem guardar. Atualizar mesmo?"
  ("Atualizar" / "Continuar aqui", foco de volta ao botão da faixa); limpo recarrega direto.
- **CSS:** seção "EQUIPE DO PLANO" no fim do `pensa.css`, por classe; o único `cursor` é o do
  "Tirar"/"Deixar" (`.pensa-planner .pensa-team-member__remove`, com o `.pensa-planner` na frente
  pelo motivo da lixeira). Os chips `.is-team`/`.is-you` levam o acento a **8%** (era 12%: tinta
  do acento em 12px/700 ficava em ≈4,5:1, no limite; 8% é o do `.pensa-map-node`) e a inicial
  `.pensa-team-member__initial` a 10%; o "você" não tem `margin-left` (o `gap` do nome separa).
  O `tokens.test.ts` trava os três.
- **Playground:** `?equipe=1` põe a Bia no "Runo" (meu, com código ligado) e me põe no
  "Guardiões da Lua" (dela); join/share/members/tirar/sair simulados (share e tirar gravam o
  `updatedAt` do plano, `touchPlan`, como o members: é o que o `syncDetail` puxa), e 40 s
  depois de abrir a Bia "mexe" no Runo para a faixa aparecer.
- ⚠️ Estúdio, Pinta e Molda seguem por perfil (a copy da janela diz: cada um constrói no seu);
  a conversa Z não tem trava (último-vence).
- Testes: `components/PensaApp.team.test.tsx` (janela do dono e do membro, código, copiar,
  tirar, sair, Esc/foco, erro, o compasso; full review 26/09: o foco dos dois passos, nomes
  repetidos, a corrida ao reabrir (`defer`/`release` no harness), mexer na equipe sem acusar a
  criança e sem remontar a etapa, "Atualizar" sujo/limpo, aba escondida e `busy`),
  `components/PensaApp.join.test.tsx` (chips, lixeira por papel, o formulário do código, Esc nos
  botões, o primeiro uso) e `components/PensaApp.create.test.tsx` (Esc nos botões do criar).

## Apagar um plano (14/09/2026)

A criança apaga o plano pelo próprio cartão, e some **de vez** — decisão dela: sem lixeira, com
uma janela que pergunta antes. O `DELETE /projects/:id` nasceu nesta leva em TODAS as camadas
(members → gateway → BFF → shim do kids), espelhando o `DELETE /tasks/:taskId` que já existia; no
banco, um só DELETE leva ciclos, conversas, artefatos e cartões pelas FKs em cascata. O XP e as
medalhas FICAM (o ledger guarda snapshot sem FK): ela fez o trabalho.

- **A lixeira** (`.pensa-project-card__remove`, `TrashIcon`) fica no rodapé do cartão, à esquerda
  do "Continuar", com o nome do plano no `aria-label` ("Apagar o plano X" — "Apagar" repetido na
  grade não diria qual).
- ⚠️ Ela **teve** `position: relative` + `z-index: 1` entre 14 e 19/09/2026, e a razão morreu
  junto com a camada do "Continuar": enquanto um `::after` cobria o cartão inteiro, a lixeira
  aparecia e NUNCA recebia o clique (quem recebia era a camada invisível, e a criança abria o
  plano ao tentar apagá-lo). Sem a camada ela é um botão como outro qualquer. Quem voltar a
  esticar a área clicável do cartão tem de devolver as duas declarações. Ela também não anda no
  hover — hoje pelo motivo dos irmãos, o relevo das faixas.
- ⚠️ A regra leva **`.pensa-planner` na frente**, como os três CTAs: a regra de ELEMENTO deste
  arquivo (`.pensa-planner button:where(…)`, 0-1-1) dá 44px de altura a todo botão e venceria a
  classe sozinha — a lixeira saía 40x44. Os 44px do TOQUE seguem garantidos pelo `--sz-tool-hit`.
- **`ConfirmDialog`** (`components/ConfirmDialog.tsx`) é a janela da casa, no molde do Molda (que
  veio do Pinta): `role="dialog"` + `aria-modal`, foco no card ao abrir, Tab preso, Esc fecha
  (nunca durante a gravação) e o foco volta a **quem abriu** — `returnFocusTo` é lido no
  FECHAMENTO, nunca `document.activeElement` na abertura (clicar num botão nem sempre o foca, e
  em teste nunca). Quando o alvo some junto com o cartão, quem abriu vira o "+ Novo plano".
  Erro NÃO fecha a janela: ela fica com o recado (`role="alert"`) para tentar de novo.
- ⚠️ Apagar **não** chama `loadProjects()`: ele acende o "Preparando seu mapa de criação…", que
  desmonta a lista (e a janela) no meio do gesto. O servidor já confirmou — tirar o cartão da
  lista basta.
- A janela é irmã das faixas, **fora** do `.sz-tool-bands`: lá dentro as pílulas ganhariam o
  relevo 3D das galerias, que é desenho de grade, não de diálogo. Ela cobre a TELA inteira, como
  as do Pinta e do Molda. ⚠️ **Medido, não deduzido:** o `container-type: inline-size` do
  `.pensa-planner` NÃO ancora este `fixed` nele (o Chrome dá `contain: none`; o container de
  tamanho inline não liga o containment de layout). Com a página rolada 900px o planner sai da
  tela e o escurecido continua colado na janela — nada de diálogo nascendo fora da vista se um
  dia o host deixar o planner crescer. Contraste medido: "Apagar" 4,66:1 e o corpo 5,39:1 nos
  dois temas.
- O `window.confirm` do "Apagar cartão" (`TaskPlan.tsx`) virou a mesma janela. Sobraram os dois
  de "Descartar as mudanças deste cartão?", que são outro fluxo.
- ⭐ **A copy diz o que NÃO some.** "Tudo que você criou nele" fazia a criança entender que o
  jogo do Estúdio e os desenhos do Pinta iam junto — e eles ficam: o vínculo com o Estúdio é um
  projeto LOCAL de id `pensa-<id>` (`community-kids/src/lib/pensa-studio-link.ts`) que continua
  na galeria dela. A frase agora separa as duas coisas, senão ela não apaga por medo (ou apaga
  achando que limpou tudo). Sobram no navegador uma chave de localStorage e o projeto local
  órfãos, inertes: o Pensa não conhece o IndexedDB do host, e o Estúdio é vendido à parte.
- ⭐ **Apagar o ÚLTIMO plano abre o campo de criar**, como no primeiro acesso: o `creating` só
  olhava a lista na primeira renderização, então o vazio aparecia com o convite "dê um nome ao
  jogo" e nenhum campo à vista.
- Testes: `PensaApp.home.test.tsx` (a lixeira por plano, a janela, o cancelar, o erro, o foco).
  ⚠️ Os testes que achavam o cartão por "botão com o nome do plano" agora dizem qual: com a
  lixeira existem DOIS ("Continuar o plano X" e "Apagar o plano X").

## A tela do plano das telas-modelo (11/09/2026)

O detalhe de um plano segue a segunda imagem-modelo dela (lote 7, passo 8), nas faixas
(`.pensa-plan.sz-tool-bands`):
- **creme** (`.pensa-plan-top`): o `ProjectHeader` no `.sz-tool-header` das galerias ([menu][voltar]
  com o "voltar" no quadrado `.sz-tool-icon-btn`, nome "Voltar aos meus planos"; "VERSÃO N" em
  `.sz-tool-kicker` e o nome no h1 `.sz-tool-title`; à direita os créditos e a pílula do andamento
  `.sz-tool-status`, menta com `--ok` quando aprovado); o **mapa ZERO** em quatro cartões brancos
  (vencida = visto no ladrilho verde e botão de rever, atual = fio azul, revista = fio e halo; a
  descrição quebra em até duas linhas); e o **aviso de "revendo"** (`PeekBanner`, que saiu de
  dentro do `StagePeek`) como o cartão branco que fecha a faixa, com o MESMO `role="status"`, o
  mesmo texto e o mesmo nome do botão ("Voltar para o meu plano" / "Voltar para a etapa atual"),
  agora em pílula de contorno azul.
- **céu**: a etapa (`StageTitle`: o ladrilho AZUL chapado com a letra, sem o degradê 3D, e o h2
  `.sz-tool-section-title`), a conversa em cartão branco (a fala da criança no azul da marca, a do
  Zappy no cinza, "VOCÊ"/"ZAPPY" em sobretítulo), o artefato em cartão branco com o `dl` em
  cartõezinhos cinza de duas colunas; ou o "Meu plano" (o `.pensa-approved` virou cartão branco com
  o visto no ladrilho menta). Os cartões da etapa e das tarefas perderam a borda de 2px (o fio só
  aparece no escuro e na próxima tarefa, verde); os botões de ação (`.pensa-generate`,
  `.pensa-primary-action`, `.pensa-new-version`) viraram a pílula chapada azul, e os de tarefa e
  artefato, pílulas. ⚠️ Esses três levam `.pensa-planner` na frente: o `font: inherit` dos botões
  (0,1,1) vencia o peso deles, e o rótulo saía no peso do corpo (defeito antigo).
- **lilás** (só com as quatro etapas vencidas, `ApprovedBand`): "Plano aprovado! Agora é só
  construir.", quantos cartões foram para cada oficina (`Estúdio · N`, `Pinta · N`, `Molda · N`,
  contados de `tasks[].destination`; oficina sem cartão não aparece; "cartões" em `sr-only`) e o
  **"Ver os Cartões de Criação"**, que fecha o peek e, depois que o "Meu plano" volta, rola até a
  lista (`scrollIntoView`, `auto` com `prefers-reduced-motion`) e leva o FOCO até ela (a âncora
  `.pensa-cards-anchor`, `tabIndex={-1}`, fora da ordem do Tab). O pedido é um contador de estado
  (`cardsRequest`) e o efeito roda depois da renderização que remonta a lista.
- A regra de largura contida do detalhe (`width: calc(100% - 48px)`) saiu, como a da home: o
  respiro vem do `.sz-tool-band__inner`. O `.pensa-alert` perdeu a largura própria.
- Testes: `components/PensaApp.plan.test.tsx` (as faixas, o cabeçalho, o aviso na faixa creme, a
  contagem por oficina e o foco na lista) e os de peek do `PensaApp.test.tsx`, que seguem iguais.

## Cartão de Criação

Uma tarefa carrega destino, categoria, estimativa, posição global, dependências, guia e progresso. Os IDs de passos e critérios permanecem estáveis entre Pensa, Pinta e Estúdio.

- Contexto Pinta: `assetId` da Bíblia Visual, tipo de arte, estilo, preset, paleta, aparência, animações, estados, uso e exigência de envio ao Estúdio.
- Contexto Estúdio: dimensão, `visualAssetIds`, IDs e metadados oficiais de blocos, manuais e extensões.
- Progresso: `planned | in_progress | completed`, itens marcados, `outputRef` e datas.

O Pensa só reflete o progresso. O servidor calcula `nextTaskId` quando todas as dependências anteriores estão concluídas. Ferramenta não possuída bloqueia o botão de envio, mas preserva o plano.

## Sugestões do chat (etapa Z)

Toda resposta do Zappy termina com a linha `SUGESTÕES: a | b | c` (contrato do prompt no
member-shell). Ela NUNCA renderiza crua: `core/suggestions.ts` (`splitSuggestions`,
tolerante a caixa/acento, só a linha FINAL) separa corpo e sugestões, e
`stripStreamingSuggestions` esconde até o prefixo parcial durante o streaming. As sugestões da
ÚLTIMA resposta viram chips (`.pensa-suggestion-chips`, fieldset com legend invisível) que
PREENCHEM o campo e focam o textarea — decisão da usuária: a criança revisa e envia (trocar para
envio direto = chamar `sendText(s)` no clique). Os chips somem com stream em andamento.

## Rever etapa concluída (peek)

Nós CONCLUÍDOS do `CreationMap` são botões (`aria-pressed`; re-clicar fecha) que abrem o
`StagePeek`: leitura da etapa vencida via `GET /cycles/:id/stages/:stage` (o members serve
qualquer etapa), com banner "Você está revendo…" + voltar (o nó da etapa ATUAL também vira botão
de voltar enquanto o peek está aberto). Sem edição no peek: `ReadOnlyArtifact` embrulha o
`ArtifactPreview` (o `ArtifactEditor` NÃO serve — save/validate miram a etapa atual do ciclo);
etapa R usa `TaskPlan editable={false}` e o "Abrir no Pinta/Estúdio" PERMANECE (tarefas são do
ciclo). `loadProject`/refresh fecham o peek; corrida guardada por `peekRef`. Compartilhados:
`ChatTranscript` (Z vivo + peek), `screenNamesFrom`, `ReviewFindings`.

## Regras de edição

Antes da aprovação em O, artefatos e tarefas planejadas podem ser editados. Depois da aprovação, editar uma tarefa planejada reabre O e invalida a revisão. Editar uma tarefa iniciada ou concluída cria uma nova revisão e arquiva a anterior.

## Arquitetura e estilo

O componente usa estado React por instância e navegação interna lista ⇄ plano. O CSS vive em `src/styles/pensa.css`, sem regras globais. Preserve os temas claro/escuro, alvos de 44 px, navegação por teclado, foco visível e `prefers-reduced-motion`.

O host transpila o TS source e importa `@sistemazero/pensa/styles.css`. Não reintroduza chooser de ambiente, kanban, checklist, lançamento executável, `renderStudio`, `createStudioProject`, `syncStudioSnapshot` ou chaves locais de retomada/checks/intents.

**O Pensa é uma SEÇÃO da comunidade kids, não um app à parte (08/2026).** Os tokens `--pz-*` já
apontam para os primitivos `--sz-kids-*`; o que faltava era o resto da moldura:

- `.pensa-planner` tem fundo **CHAPADO** (`var(--pz-bg)`). O `radial-gradient` que existia era a
  textura de um app próprio e denunciava a emenda com a página, mesmo com a cor certa.
- A home segue o **padrão do Pinta** ("Meus desenhos", 08/2026): o herói de landing SAIU de vez
  (kicker "PLANEJADOR DE JOGOS", h1 de duas linhas e Zappy grande absoluto) e entrou o
  `.pensa-home-header` — h1 **"Meus projetos"** (1.875rem) + subtítulo do método ZERO à esquerda,
  Zappy PEQUENO decorativo à direita (64px; 48px no `@container 560`). O teste do PensaApp trava o
  título e a ausência do kicker.
- **Largura TOTAL** como a galeria do Pinta: `width: calc(100% - 32px)` (sem o teto de 1160px) na
  regra compartilhada — vale para home E detalhe (`.pensa-workspace`/`.pensa-project-header`/
  `.pensa-map`/`.pensa-alert`).
- ⭐ **Pinta, Pensa e Estúdio têm UM estilo visual só (08/2026).** O Estúdio já se declarava
  espelho do Pinta (`.sz-home-panel` "espelho do `.pin-panel`"); o Pensa é que destoava. A receita
  ÚNICA de card/painel, agora nos três:

  ```css
  border: 2px solid <aresta>;
  border-radius: 1rem;                    /* era 1.5rem no Pensa */
  box-shadow: 0 3px 0 color-mix(in oklch, <aresta> 45%, transparent);  /* era 0 4px 0 do acento a 10% */
  padding: 16px;                          /* `p-4`; era 16px 18px / 17px 18px */
  ```

  A **aresta é uma variável** (`--pz-card-edge`, cópia do `--pin-panel-border`) para a sombra
  seguir a borda no hover — o hover é só `translateY(-2px) scale(1.02)`, como `.pin-pop`/
  `.sz-home-pop`. Peso de fonte: **700** em todo o arquivo (era 800 em 29 lugares; `.pin-display`
  e `.sz-ui-display` são 700). Vazio: `p-6` = 24px, 2px dashed, raio 1rem.
- ⭐ **Tipografia dos títulos: família + peso + tracking no ELEMENTO, e num lugar só**
  (`.pensa-planner h1..h4`). O Preflight do Tailwind zera `font-weight` E deixa a família cair na
  herdada (Nunito, do corpo do host), e o host kids não define nada para heading.
  ⚠️ **"É heading" não é o mesmo que "é título".** O que de fato escapou foi o nome do plano no
  card — um `<strong>`, fora do seletor de headings, saindo na fonte do corpo. O par no Estúdio
  tinha o mesmo defeito (`font-semibold` em Nunito em vez de `sz-ui-display`). Os dois casos estão
  travados em `src/styles/headingFont.test.ts` (a folha externa não é computada em jsdom, então o
  teste lê o CSS).
- ⭐ **Tamanhos de fonte ANCORADOS na escala** (`0.75rem` = 12px, `0.875rem` = 14px). O arquivo
  tinha 41 valores fora da escala, com um bolo entre **9,9px e 13,8px** — abaixo do texto normal
  da Comunidade Kids, que é `text-sm`/**14px** (medido: 164 usos de `text-sm` contra 22 de
  `text-base` nos componentes do kids; o Pinta na mesma proporção). Para um produto infantil o
  piso é 12px e o texto de corpo é 14px; nada de valores intermediários "quase iguais" que somados
  fazem o app inteiro ler menor que os irmãos ao lado.
- (⚠️ HISTÓRICO: a home de 11/09/2026 está na seção "A home das telas-modelo"; a grade de 240px,
  o cabeçalho de 1.875rem e a faixa de criar abaixo do cabeçalho mudaram.) Arranjo da home, pareado com `ProjectList.tsx`/`GalleryScreen.tsx`: `.pensa-create` **sem
  painel** (faixa solta; embrulhá-lo dava a ele o peso dos planos já criados), campo de ~440px ao
  lado do botão, 44px de respiro do subtítulo até a label; `.pensa-section-heading` h2 em
  **1.125rem** (`text-lg`) com `margin: 40px 0 24px` (`mb-6`); grade
  `repeat(auto-fill, minmax(225px, 1fr))` + `gap: 16px` — **o mesmo piso do `PROJECT_GRID_CLASS`
  do Estúdio**, de propósito: com a mesma receita nos dois, os cards saem do mesmo tamanho sem
  número mágico para sincronizar (medido: 1280→5 · 1366→5 · 1440→5 · 1600→6 · 1920→7 colunas).
  ⚠️ `auto-fill`, NÃO `auto-fit`: com `auto-fit` as faixas vazias colapsam e dois planos numa tela
  larga viram dois cards de ~600px. Os inputs do grupo compartilhado têm borda **2px** (vale
  também no detalhe — receita de tema).
- **Respiro lateral = 24px** (`width: calc(100% - 48px)`), que é o `sm:p-6` da galeria do Pinta e o
  `px-6` da `ProjectList`; 16px no `@container 560` (`p-4`). Com os 16/10px de antes o conteúdo do
  Pensa encostava na borda visivelmente mais que o dos irmãos.
- O host não embrulha mais o app num card (`pensa-client.tsx`).
- ⭐⭐ **07/09/2026, cabeçalho compacto ("o cabeçalho ocupa espaço demais"):** o que mudou das
  decisões acima, por pedido dela: (a) o **Zappy pequeno SAIU do cabeçalho** (segue no vazio, no
  chat e no aprovado); (b) `.pensa-create` deixou de ser faixa sempre visível e virou linha 2 SOB
  DEMANDA: o **"+ Novo plano"** (`.sz-tool-btn-3d` naquela época; desde 11/09/2026 a pílula chapada
  `.sz-tool-pill--primary`, à direita do título, `aria-expanded` +
  `aria-controls="pensa-create"`) abre o campo "Nome do novo jogo" logo abaixo (com foco), Esc/
  "Cancelar" fecham e devolvem o foco ao botão, criar navega, erro mantém o campo com o nome; a
  home nasce com ele ABERTO só no primeiro uso (0 planos); (c) `.pensa-section-heading` ("Meus
  planos" 1.125rem + contador, `margin: 40px 0 24px`) MORREU: o h2 virou `.pensa-sr-only` e o
  contador foi para o rodapé `.pensa-home-footer` "Mostrando N planos" (par do "Mostrando N de M"
  do Estúdio); (d) `.pensa-home` passou a `padding: 16px 0 32px` e `.pensa-home-header` a
  `margin-bottom: 28px` (o layout da linha vem da `.sz-tool-header` compartilhada; o header leva
  as duas classes; `.pensa-create` tem `margin-bottom: 48px`: o ritmo 28/48 da galeria do MOLDA,
  que ela aprovou); (e) `.pensa-project-header` a `padding: 16px 0 12px`. Ganho: 324px → ~118px
  até a grade. Os tokens `--pz-*` passaram a ler os `--sz-tool-*` de `@sistemazero/ui/tool-chrome.css`
  (cadeia `var(--sz-tool-x, fallback)`), e `color-mix` virou `in oklab` no arquivo inteiro (o
  `in oklch` dava um rosa sutil em `.is-current`/`.is-viewing`/chips). Testes:
  `components/PensaApp.create.test.tsx`, `styles/tokens.test.ts`.
⚠️ Mexer na largura interna (`width: calc(100% - 32px)`) desloca os `@container (max-width: 820px|560px)`
— re-verifique os dois pontos de quebra em 1366 e 1920.

## Pensa v2: a jornada (14/10/2026)

O `<PensaApp>` monta SEMPRE o **`JourneyApp`** (`components/JourneyApp.tsx`). ⚠️ Não existe
`PENSA_V2_ENABLED` nem `journeyEnabled`: decisão dela (14/10/2026) — nenhuma criança usou o Pensa em
produção, então o v2 substitui o Pensa todo, sem piloto. O `LegacyPensaApp` segue exportado só para
os planos anteriores e para os testes dele (que o importam pelo nome). O fluxo:
ideia livre → proposta curta → missões no Estúdio/Pinta/Molda → teste → próxima versão, com o
estado vindo de `/v2/projects/*` (contrato em `@sistemazero/core/pensa`). O plano clássico e as
equipes continuam no `LegacyPensaApp` (aberto por "Meus planos anteriores e equipes", com a barra
`.pensa-legacy-bar` e o "Voltar aos meus jogos"). Implementação e rollout:
`docs/plans/2026-10-14-pensa-v2-entrega.md`.

**Direção de arte (14/10/2026, mesmo dia, pedido dela):** a primeira versão do Codex era uma coluna
de 820px com cabeçalho próprio ("Pensa" no meio, borda de 1px) e cartões de fio — destoava das
galerias. Hoje a tela é a pilha de faixas das telas-modelo (`.sz-tool-bands`), em `styles/journey.css`:
- **creme**: o `.sz-tool-header` com [menu][voltar] (quadrado `.sz-tool-icon-btn` "Voltar aos meus
  jogos"; na home, a `HostBackLink` do host), o selo amarelo "Pensa · sua oficina de jogos" na home,
  o h1 `.sz-tool-title`, a pílula `.sz-tool-status` só em estado especial (pausado, arquivado, Zappy
  pensando, versão pronta), o **mapa Z·E·R·O** (`.pensa-journey-zero`: vencida = visto no ladrilho
  verde, atual = fio azul + a ação do momento, próxima = "Depois"; `aria-current="step"`) e, na home,
  o cartão **"Continuar de onde parou"**.
- **céu**: o cartão do MOMENTO (`.pensa-journey-card`): proposta (o que veio da criança em pílulas
  com o visto; o que o Zappy sugeriu recolhido), missão (ladrilho da oficina `.sz-tool-tile--*`,
  "N de M" e a régua `.pensa-journey-dots-path`), teste, espera (texto por tipo de operação: ajuda
  NÃO é "organizando sua ideia"; na preparação o começo escolhido fica à vista), falha, pausa e
  encerrado (Zappy `celebrating`); a conversa em balões; e o campo de contar com a pergunta do Zappy
  como RÓTULO em balão.
- **lilás**: no jogo, "Meu caminho" em sanfonas brancas (caminho com o ladrilho da oficina por
  missão, ideias para depois, referências, "Guardar e cuidar" com uma frase por ação); na home, a
  grade "Meus jogos" (trilha Z-E-R-O de cada jogo) ou, sem jogo, "Como o Pensa ajuda" (o método em
  quatro cartões). Embaixo, sempre (fora dos arquivados), o **"Entrar com um código"**, que desde a
  equipe no v2 entra DIRETO no jogo v2 (ver "Pensa v2 em equipe"; até 14/10/2026 ele abria o
  `LegacyPensaApp` via `onLegacy()`).
- **Atalhos que só PREENCHEM o campo** (o gesto que ela aprovou nos chips do plano clássico): ao
  travar, "Não sei por onde começar"/"Aconteceu uma coisa diferente"/"Não achei o bloco certo"; numa
  versão nova, as ideias guardadas. Nada é enviado sozinho. O `placeholder` muda com o pedido.
- ⚠️ Nenhuma regra mira `button`/`h1..h3` pelo ELEMENTO: botão é sempre uma receita (`.sz-tool-pill`,
  `.sz-tool-chip`, `.sz-tool-icon-btn`). A regra de elemento do `pensa.css` (`font: inherit`) apagaria
  o peso dos botões de voz do host, e por isso `journey.css` devolve tamanho e peso a eles.
- ⚠️ `.pensa-journey-stack` usa `grid-template-columns: minmax(0, 1fr)`: com a trilha `auto` a grade
  de jogos media pelo conteúdo e a faixa vazava para o lado no celular (medido a 390px).
- ⚠️ No claro, creme e céu têm a MESMA cor; as margens entre as duas faixas foram reduzidas.
- Medido no playground: 320/390/768/1172px sem rolagem lateral e sem texto abaixo de 12px.
- **Playground**: `?v2=1` liga a jornada com o servidor em memória `playground/journey.ts` (máquina
  de estados REAL do core; 4 jogos de partida; a preparação termina no 2º `work`, ~5s), o Zappy do
  host e imitações dos botões de voz. `?v2=1&vazio=1` = primeira visita.
- Testes: `components/JourneyApp.test.tsx` (fluxos do Codex + mapa, missão, atalhos de ajuda, ideias
  guardadas, foco ao apagar).

## Pensa v2 em equipe (14/10/2026)

Pedido dela: planejar juntos e dividir funções (uma no Estúdio, outra nas artes do Pinta/Molda).
Especificação: `docs/plans/2026-10-14-pensa-v2-equipe.md` (este pacote é a seção 4). As REGRAS
moram no core (`effectivePensaRoles`, `canWorkOnPensaMission`, `pensaMissionWorkers`,
`nextPensaMissionFor`); o pacote não as reescreve. Duas funções: **quem programa** (o Estúdio, UMA
pessoa, a dona por padrão; o jogo mora no Estúdio dela) e **quem faz as artes** (Pinta e Molda,
zero ou mais; sem ninguém, quem programa também desenha).

- **Servidor anterior à equipe** (view sem `team`/`role`): tudo como antes, a dona faz tudo e não
  há "Equipe". `teamMode` = `team.memberCount > 0`; sozinha, a dona segue com o texto de sempre
  ("Sua próxima missão") e sem compasso.
- **"Equipe · N"** no `.sz-tool-header__actions` do jogo (N = quem entrou; a dona vê com 0, quem
  entrou sempre; some no arquivado). O nome acessível é "Equipe, N na equipe" (o "·" fica em
  `aria-hidden`, como no plano clássico). Abre a **`JourneyTeamDialog`**
  (`components/JourneyTeamDialog.tsx`), molde da `TeamDialog`: `useDialogFocus`, token de pedido,
  o código da dona (criar, copiar sem `window.prompt`, gerar outro, desligar), as pessoas com
  "Tirar"/"Sair da equipe" em DOIS passos na linha (o foco dos dois passos é o mesmo efeito), erro
  em `role="alert"` que não fecha. Rotas: `/v2/projects/:id/team|share|members/:id|roles`.
  - **Funções**: só a dona edita. Rádio "Quem programa (Estúdio)" e caixas "Quem faz as artes
    (Pinta e Molda)" (pílulas de 44px com o rótulo envolvendo o campo); "Guardar as funções" →
    `PUT …/roles {code, art}` → a resposta é a VIEW, que vai para o `setView` (a tela muda na
    hora: "Quem testa… é Leo"). Com `codeLocked` o `disabled` vai em CADA rádio (o do fieldset não
    muda o `.disabled` do campo) e a frase do servidor fica no lugar da dica; um 409 relê a equipe
    sem perder as caixas marcadas. Quem entrou lê um `<dl>` e "Só quem criou o plano escolhe as
    funções.". Sozinha, a dona lê "Quando alguém entrar, você escolhe…".
  - ⚠️ **As caixas mostram `editableArt(roles)`** (`core/journeyTeam.ts`): o papel efetivo sem
    artistas é `[quem programa]`, e a janela o mostra como "ninguém marcado". Senão trocar quem
    programa transformava a pessoa anterior em artista sem querer.
  - Tirar quem programa avisa "O jogo está no Estúdio de X. Se X sair, o jogo fica com X."; quem
    programa e sai lê "O jogo está no seu Estúdio. Se você sair, o jogo fica com você.". Mexer na
    equipe espelha `memberCount`/`shareEnabled` no cabeçalho e relê o jogo (as funções voltam para
    a dona quando quem programava sai). Sair → a lista, com o FOCO no h1 (`focusTitle` +
    `titleRef`, `tabIndex=-1`); entrar por código faz o mesmo no título do jogo.
- **"Entrar com um código"** (`JourneyJoin`, no fim do `JourneyApp.tsx`): abre o campo no quadro
  tracejado (`aria-expanded`/`aria-controls`), `POST /v2/projects/join {code}` → `{projectId}` →
  `open(projectId)` (código de plano clássico também entra: sem v2, o 404 do `open` cai no
  `LegacyPensaApp`). Erro ao lado do campo (`role="alert"`, ligado por `aria-describedby`), Esc no
  FORMULÁRIO e "Cancelar" devolvem o foco ao botão. "Meus planos anteriores" segue para o clássico.
- **Lista**: chip `.pensa-chip.is-team` "Em equipe · N" (meu) ou "De <dona>" (entrei). A lista v2
  não tem lixeira; dentro do jogo, quem entrou não vê arquivar nem apagar.
- **Missões**: com equipe, a próxima missão é a MINHA (`nextPensaMissionFor` sobre
  `teamMissionProgress(tasks)`: `evidenceCurrent: true`, a régua que a jornada já usa); o cartão diz
  "Sua missão · N de M". Sem missão minha, o cartão **`.pensa-journey-waiting`**: "Missão de Bia ·
  1 de 3", "Esperando a arte de Bia" / "a programação de Leo" / "as artes da equipe" (duas ou mais
  artistas e a missão livre), a missão da frente, e "Ver o caminho" (abre a sanfona, rola e foca o
  `summary`) e "Guardar uma ideia". "Meu caminho" diz quem faz cada uma (`missionPeople`: quem
  concluiu, senão quem começou, senão quem tem a função): "Pinta · Bia · feita", "Estúdio · você ·
  agora". "Rever" só na missão que eu posso fazer e que não foi feita por outra pessoa (a arte da
  colega mora na conta dela).
  ⚠️⚠️ **"de Bia", nunca "da Bia"/"do Leo"** (desvio deliberado da spec, que escreve com artigo):
  a tela não sabe se é menina ou menino, e o artigo errado é pior que nenhum. Sem nome, as frases
  dizem "alguém da equipe" (o "Colega" do `personName` é rótulo de lista). Nomes vêm de
  `GET …/team` (best-effort, relido quando muda quem está ou as funções).
- **Quem pode o quê** (`canProgram` = `roles.code === viewer`; `isOwner` = `role !== 'member'`):
  testar (o cartão do teste inteiro, "Voltar para ajustar"), guardar a
  versão pronta, "Escolher o próximo pedaço"/"Testar mudanças", "Adaptar meu caminho", "Encerrar
  por enquanto" e restaurar são de quem programa; no lugar, `.pensa-journey-team-note` "Quem testa e
  guarda as versões é Leo.". Arquivar, "Continuar este jogo" do arquivado e apagar são da dona (a
  frase de apagar, em equipe, diz que some para toda a equipe e onde cada parte continua). Pausar,
  retomar, conversar, aceitar a proposta e guardar ideias são de todas.
- **O compasso** (`teamPollMs`, 20 s; a prop existe para o teste, `0` desliga): com `teamMode`, aba
  visível, nada em voo (`busyRef`) e sem preparação andando (aí o `work` de 5 s já relê), chama o
  MESMO `load` (jogo + etapa). O campo de texto mora no rascunho (`draft`, fora da view): reler
  nunca o apaga. Sem faixa de "alguém mexeu": a view nova entra por cima (o `setView` só recusa
  revisão MENOR).
- **CSS** (seção "EQUIPE NO v2" do `journey.css`): só classes (nenhuma regra de elemento nova: `dt`,
  `dd`, `strong` e o ícone ganharam classe), nenhum `cursor`, `color-mix(in oklab)`.
- **Playground** `?v2=1&equipe=1` (`playground/journey.ts`, `createJourneyServer(task, empty,
  withTeam)`): o "ninho" é meu com a Bia nas artes (código ZAP-AAAAAB; 25 s depois a Bia COMEÇA o
  ovo no Molda, para o compasso mostrar), "A torre da Bia" é dela com eu nas artes (a espera
  "Esperando a programação de Bia"), e ZAP-CCCCCC entra no "O castelo do Leo". O servidor aplica
  as réguas (403 de quem programa e da dona, 409 da trava, 404 fora da equipe). Sem `equipe=1` ele
  é o servidor ANTERIOR à equipe. Medido a 390 e 1172 px (claro e escuro): sem rolagem lateral,
  sem texto abaixo de 12 px, alvos ≥ 40 px no mouse.
- Testes: `components/JourneyApp.team.test.tsx` (o "Equipe" e o servidor antigo; a janela da dona,
  as Funções, a trava e o 409, a leitura de quem entrou, tirar quem programa, sair com o foco no
  título, Esc; entrar com código e o erro; os chips; "Sua missão", o caminho com nomes, as três
  esperas; quem pode o quê; o compasso e a aba escondida).

## Full review do v2 (15/10/2026)

Pedido dela: "melhorar e não regredir". O v2 tinha perdido coisas boas do plano clássico, e o
review achou defeitos de funcionamento. O que mudou, e que não pode voltar:

- **A coluna fica no MEIO** (`.pensa-journey .sz-tool-band__inner`: teto `--pz-journey-max` + o
  respiro das faixas, `margin-inline: auto`). Presa à esquerda, num monitor largo sobrava um vão
  vazio à direita. As faixas seguem de borda a borda.
- **Home:** com jogos, o campo do jogo NOVO fica atrás do **"+ Novo jogo"** (`aria-expanded`,
  `aria-controls="pensa-new-game"`, "Cancelar" e Esc devolvem o foco ao botão); aberto sempre,
  parecia o lugar de mexer no jogo de cima. No primeiro jogo ele nasce aberto. O cartão do jogo é
  o do plano clássico (`.pensa-project-grid`/`.pensa-project-card` no `GameCard`): versão, etapa ou
  "Pausado", equipe, trilha Z·E·R·O, "Editado há…", a **lixeira** (só de quem criou, com o
  `ConfirmDialog`, foco de volta ao h1) e "Continuar". O nome acessível do botão continua "Abrir o
  jogo <nome>".
- **Rever uma etapa** (o "peek" do clássico): no `ZeroMap` a etapa feita é botão
  (`aria-pressed`, "Feito. Ver de novo"); revendo, a atual vira "Voltar para agora". O
  `StageReview` troca os cartões do momento (e esconde o campo): Z = a ideia contada (`intent`),
  E = a proposta (o que veio da criança, o que o Zappy sugeriu, como testar), R = as missões com o
  que cada uma faz, O = os testes guardados. Aviso `role="status"`, foco no título da revisão.
- **"Meu caminho" fica à vista** (era uma sanfona "Ver meu caminho" dentro da seção de mesmo nome):
  o h2 com "Missões feitas: N de M" e a lista num cartão branco. O "Ver o caminho" do cartão de
  espera rola até ela e foca o h2.
- **O cartão "O que ajudou a montar este caminho" SAIU** (decisão dela: é coisa interna). As
  referências continuam na proposta, fora da tela.
- **Renomear** com o lápis (`GameNameTitle`, molde do `ProjectNameTitle` do clássico): só a dona,
  com o jogo ativo; otimista e desfeito se o servidor recusar. `PATCH /v2/projects/:id {name}`.
- **A oficina precisa estar liberada:** "Continuar no X" fica desligado com a frase do porquê
  (`toolOwned`, pelas `capabilities` do adapter) e o "Rever" some. Antes abria uma tela trancada.
- **Ideias guardadas:** a lixeira de cada ideia (`remove_idea`), e guardar vale em qualquer momento
  (pausado, versão pronta). Depois de guardar, o campo volta a ser a conversa (`planning`); antes
  ficava preso em "guardar ideia" e o Zappy nunca respondia.
- **O teste tem volta:** "Voltar para as missões" (antes de testar, com missão faltando) ou "Voltar
  para ajustar" (depois de um teste), e "Travei nesta parte". Em equipe, quem faz as artes continua
  vendo a SUA missão enquanto quem programa testa.
- **Arquivado** só oferece apagar (dona); o cartão de encerrado e os cuidados que sempre falhariam
  saíram. Pausar não aparece numa versão pronta, e no core retomar um jogo pausado E encerrado só
  tira a pausa (antes desfazia a conclusão).
- **"Adaptar meu caminho…"** pede confirmação na linha ("Sim, adaptar meu caminho"/"Deixar como
  está"): refaz as próximas missões, e em equipe as de todos.
- **Texto da criança não se perde:** o relato do teste mora no rascunho da aba (como o campo), os
  chips de ideia somam ao texto em vez de trocar, e o primeiro envio leva o texto para o rascunho
  do jogo recém-criado (se o envio falhar, "Atualizar" o traz de volta). Ctrl/Cmd+Enter envia.
- **Recados:** rede caída vira frase ("Não consegui falar com o Pensa agora…"), o conflito genérico
  diz o que houve ("Alguém da equipe mexeu no jogo. Já mostrei como ele está agora…"), o recado
  rola para a vista, e um 404 de jogo v2 (apagado, ou a criança saiu da equipe) volta à lista com
  "Esse jogo não está mais aqui…" em vez de cair no planejador clássico (só cai lá se o id for de um
  plano clássico). Depois de uma ação que desmonta o botão, o foco vai ao título do cartão novo.
- **Travessão:** a régua mora no BFF (`member-shell/src/lib/kid-text.ts`, `semTravessao`), aplicada
  em toda saída do modelo; aqui, nenhum texto fixo usa travessão.
- Testes: `components/JourneyApp.review.test.tsx`. ⚠️ Consultas por papel (`getByRole`) ficam MUITO
  lentas nesta árvore no happy-dom (dezenas de segundos sob carga): em teste novo, prefira rótulo e
  texto.

## "Abrir meu jogo" abre o JOGO, não uma missão (15/10/2026)

Relato dela: "Abrir meu jogo", na hora de testar, levava ao Estúdio com "a tarefa mudou em outro
lugar, recarreguei o guia do Pensa para você". A criança podia testar antes de terminar as missões
(o antigo "Já quero experimentar", que saiu em 15/10/2026), e o botão abria a ÚLTIMA missão do Estúdio, que ainda dependia das
anteriores: o Estúdio tentava começá-la e o servidor recusava (409 de missão anterior pendente).

- `PensaHostAdapter.onOpenGame?({ projectId })` (opcional): o botão chama ele quando o host sabe
  abrir o jogo do plano direto (o kids manda para `/estudio?projeto=pensa-<id>`, que só retoma o
  que existe e nunca mexe em missão). Sem ele, cai na missão do Estúdio mais adiantada que JÁ
  começou (`gameTask`), nunca na que ainda espera.
- Testes: `JourneyApp.team.test.tsx`, describe "Abrir meu jogo" na hora de testar.
- **Full review (15/10/2026):** com `onOpenGame` o botão vale mesmo numa versão sem missão do
  Estúdio; sem ele, o reserva (`gameTask`) nunca é uma missão que ainda depende de outra (sem
  nenhuma que possa abrir, o botão some). E o botão só aparece com o Estúdio liberado
  (`toolOwned('studio')`), como os outros atalhos: sem ele, a criança caía numa tela trancada.

## O que veio do sandbox: perguntas com respostas, ideias e usos (15/10/2026)

Pedido dela, depois da análise do repositório `code-with-antonio/sandbox` (o `ask_player`, as
sugestões da home e o "jogo é julgado nos primeiros dez segundos"). A criança continua contando a
ideia do jeito dela; o Zappy só pergunta o que muda a primeira missão, e quando pergunta, oferece
respostas para tocar. O contrato da pergunta mora no core (`PENSA_QUESTION_TOPICS`,
`PensaQuestionChoices`, `pensaQuestionsLeft`); as regras do modelo, no member-shell.

- **A pergunta com respostas** (`pendingQuestion` no `JourneyApp`): a última mensagem do Zappy com
  `choices`, com a conversa no planejamento e nada rodando. O rótulo do campo vira o assunto
  ("Sobre: o que você faz no jogo", `QUESTION_TOPIC`) e a pergunta; embaixo, as respostas em
  cartões (`.pensa-journey-answer`, o nome e o que muda no jogo) e, na linha de baixo, "Tanto faz,
  escolhe você" (`ANY_ANSWER`, o prompt sabe ler) e "Contar do meu jeito" (limpa a resposta pronta
  e foca o campo). ⚠️ **Tocar só PREENCHE o campo** (o gesto dos chips que ela aprovou; o sandbox
  envia direto e aqui não): uma resposta troca a outra, e o que a criança escreveu do jeito dela
  fica, com a resposta embaixo. A escolhida tem `aria-pressed`. O placeholder vira "Ou conte do seu
  jeito.". Na conversa, o assunto aparece só nas perguntas já respondidas (a da vez está no campo).
- **Ideias para começar** (`IDEA_STARTERS`, o `suggestions.ts` do sandbox): seis botões na home
  do jogo novo, só com o campo vazio. O texto é a ideia INTEIRA na voz da criança (o que ela faz, o
  que acontece e como termina), para o Zappy ir direto à proposta sem perguntar; só o começo do
  Jogo 2D, e nada de 2D ou 3D no texto (quem decide é o que ela tem liberado).
- **O selo de usos do Zappy voltou** (`AiCreditsBadge`, o do plano clássico, que o v2 tinha
  perdido): `GET /v2/credits` (sempre 200; `null` = "não sei" e o selo some), relido ao abrir e
  quando o Zappy termina. Acabou: o campo mostra o `AiCreditsNotice` e o "Enviar" fica desligado
  ANTES de ela escrever (guardar ideia não gasta e segue valendo).
- **A espera diz a etapa de verdade** (`waitingSteps`, como o sandbox mostra cada passo):
  planejamento = "Entendendo a sua ideia" (`propose`) → "Conferindo com os seus blocos e montando
  o começo" (`review`); preparação = "Você escolheu o começo" ✓ → "Escrevendo o passo a passo de
  cada missão". A ajuda mantém os pontinhos.
- **As ideias para depois ajudam a próxima versão**: os chips do campo dizem "Ou comece por uma
  ideia para depois" (o Zappy agora guarda até 2 caprichos dele em `later`, que entram no backlog)
  e somem enquanto uma pergunta espera resposta.
- ⚠️ **Conserto do lote anterior:** o primeiro envio da home copia o texto para o rascunho do jogo
  novo; depois do sucesso esse rascunho agora é apagado também, senão a ideia voltava para o campo
  do jogo (medido no playground; o teste espera a recarga do rascunho e falha sem o conserto).
- **Playground:** ideia curta (menos de 40 letras) recebe UMA pergunta com respostas e o nome
  provisório "O voo do dragão"; a espera passa por `review`; `/v2/credits` responde 13 ideias.
- Testes: `components/JourneyApp.questions.test.tsx`.

### Full review do lote acima (15/10/2026)

- ⚠️⚠️ **Responder ao Zappy não gasta uso novo, e a tela não pode barrar.** Quando o Zappy
  pergunta, a operação fica `waiting` e a reserva dela continua contando no saldo; a resposta
  RETOMA o mesmo pedido (a régua do `start` no members). Com a última ideia do dia, a tela dizia
  "acabou" e desligava o "Enviar" justo na resposta que o servidor aceitaria. `reusesHold` (a mesma
  conta do members: planejamento por planejamento ou na proposta, ajuda por ajuda) tira o bloqueio
  e diz "Responder ao Zappy não gasta uma ideia nova."; o `send()` aplica a mesma regra (o
  Ctrl/Cmd+Enter também chega lá).
- ⚠️⚠️ **A pergunta feita na proposta volta ao reabrir.** `questionWaiting` (a última mensagem é
  pergunta do Zappy e nada roda) abre o campo sozinho, sem depender de `talking`; antes a pergunta
  do "Quero mudar uma coisa" sumia ao sair e voltar, e "Vamos construir esse começo" era recusado
  pelo servidor (o aceite exige a operação no passo `choice`) num laço de "A tarefa mudou". Com
  pergunta esperando, o aceite fica desligado com "Responda a pergunta do Zappy antes de escolher
  esse começo."
- **A resposta pronta é a ÚLTIMA linha do campo** (`chosenAnswer`): tocar outra a troca, o texto
  da criança acima fica, "Contar do meu jeito" tira só ela e o `aria-pressed` compara com ela.
  Antes as respostas se somavam a cada toque. Tocar não leva o foco ao campo (no tablet o teclado
  cobria as respostas e o "Enviar"); só o "Contar do meu jeito" leva.
- **O selo de usos relê** depois de toda ação (`creditsTick` no `finally` do `run`), ao entrar num
  jogo e ao voltar para a aba (`visibilitychange`); antes só quando o Zappy terminava, e um
  "acabou" ficava preso até recarregar a página.
- ⚠️ As etapas da espera usam `.pensa-journey-progress`: com o nome `.pensa-journey-steps` elas
  sobrescreviam a lista numerada de "Hora de testar" e da revisão da etapa E. A etapa de agora tem
  um ponto dentro, além da cor (com menos movimento ela não pisca).
- "ou fale" só aparece quando o host passa `renderVoiceInput` (os pais ligam a fala por criança).

## Etapa R: um caminho só (15/10/2026)

Relato dela: o cartão da missão tinha três botões ("Continuar no Estúdio", "Travei nesta parte",
"Já quero experimentar") e a criança ficava na dúvida; "Já quero experimentar" mandava o comando
`observe`, que pulava para a etapa O sem missão feita, e o "Abrir meu jogo" de lá ia ao Estúdio
atrás de um jogo que ainda não existia. Decisão dela (opção A de três): um caminho só.

- O botão principal diz o que FAZ (`missionCta`): "Começar a missão no Estúdio" para a missão
  planejada, "Continuar a missão no …" para a começada. "Travei nesta parte" ficou como botão
  discreto (`sz-tool-pill--quiet`).
- O que fazer está escrito: enquanto nenhuma missão foi concluída, uma lista de três passos
  (`aria-label="Como fazer a missão"`: tocar no botão, seguir o Guia do Pensa, apertar ▶ Reproduzir
  e "Experimentei e funcionou", ou só o "Experimentei" fora do Estúdio); depois, uma linha só.
  Com a oficina da missão trancada, só o aviso de por quê: os passos mandariam tocar num botão
  desligado.
- ⚠️ **Não existe mais botão que leve à etapa O.** Ela começa quando a criança CONTA o resultado do
  teste, e a tela de teste só aparece com as missões dela feitas. O BFF parou de aceitar `observe`
  pelo `command` (a rota `/test` observa e registra junto).
- O rascunho do campo não se perde mais se a criança digita no instante em que o jogo abre: a
  leitura do rascunho guardado não sobrescreve o que já foi digitado para o mesmo projeto (era a
  causa de um teste instável de troca de perfil).
- Testes: `JourneyApp.test.tsx` ("etapa R: um caminho só…" e "missão começada diz Continuar…").

## Desenhar a arte é uma oferta (15/10/2026)

Pergunta dela: "em que momento as missões do Pinta e do Molda são definidas?" (o teste dela só
teve Estúdio). Decisão dela (opção C de três): o Zappy OFERECE desenhar, e a missão de arte só
entra se a criança aceitar.

- O planejador começa com figuras prontas do Estúdio e só cria missão do Pinta ou do Molda quando
  a criança pediu para desenhar ou modelar (regra do `JOURNEY_SYSTEM`, no member-shell).
- O cartão do começo (`JourneyApp`, `artOffer`) mostra a oferta com o ladrilho do Pinta, ou do
  Molda num jogo 3D. Aparece só na versão 1, com todas as missões do Estúdio e nenhuma usando arte
  dela (`asset`), nenhuma missão de arte já feita no ciclo, a oficina no `capabilities` da
  proposta, um uso do Zappy disponível, o campo fora do "guardar ideia" e o Zappy sem pergunta
  esperando. Os textos moram em `ART_OFFERS`: `self` ("Quer desenhar o seu personagem?") e
  `team`, para quem só programa numa equipe ("Quer o personagem desenhado no Pinta?", pedindo a
  quem cuida das artes).
- Aceitar é o gesto das respostas prontas: o pedido vai para a ÚLTIMA linha do campo, embaixo do
  que ela já escreveu, e nada sai sozinho. O botão fica, com `aria-pressed` (o foco não se perde),
  e tocar de novo tira o pedido; o texto do cartão (`aria-live`) troca para "Agora toque em
  "Enviar para o Zappy"…", e a tela rola até o campo sem focar (no tablet o teclado cobriria o
  envio). O envio é de planejamento e retoma o mesmo pedido do Zappy (não gasta uso novo).
- Estilo: `.pensa-journey-offer` (`journey.css`), no fundo `--pz-surface-2`; o botão quebra a
  linha (a pílula é `nowrap`) para caber num celular de 320px.
- ⚠️ Limite conhecido: o planejamento inteiro de uma versão (perguntas, propostas, mudanças e
  guias) divide o teto de 10 chamadas por operação do members; cada rodada de mudança gasta
  algumas.
- Testes: `JourneyApp.artOffer.test.tsx` e o caso do `JOURNEY_SYSTEM` em
  `member-shell/tests/pensa-journey-worker.test.ts`.

## Verificação

Execute `bun run typecheck`, `bun test src` e `bun run check`. Os testes devem cobrir o mapa ZERO, os cinco artefatos, ordem/dependências, próxima tarefa, entitlement e abertura da ferramenta de destino.

## Destino Molda — 07/09/2026

Cartões também aceitam `destination: molda`. Contexto: `assetId` do inventário visual,
`artKind` model/texture/sky, aparência, uso e paleta. Saída `molda_asset` referencia o ID da
criação real, sem substituir o ID do inventário. O adapter recebe `moldaOwned` opcional;
false/ausente preserva o plano e desabilita o envio. O host resolve posse + jornada.
Pensa continua apenas planejador: não incorpora editor, IndexedDB ou navegação do Molda.

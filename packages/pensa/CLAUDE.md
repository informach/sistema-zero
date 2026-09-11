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
- `capabilities.pintaOwned` e `capabilities.studioOwned`;
- `onOpenTask({ taskId, destination })`, que navega para `/pinta?tarefa=<id>` ou `/estudio?tarefa=<id>`;
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
"voltar" do detalhe usa `.sz-tool-btn.sz-tool-btn--icon` (`ArrowLeftIcon` inline) para não
destoar do menu ao lado. ⚠️ Nenhuma regra SEM camada pode alcançar esses botões (a antiga
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
  pílula primária cujo `::after` estica a área clicável para o cartão INTEIRO; o nome acessível é
  "Continuar o plano <nome>" (os testes acham o plano por ele). O **cartão "Novo plano"**
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
  DEMANDA: o **"+ Novo plano"** (`.sz-tool-btn-3d`, à direita do título, `aria-expanded` +
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

## Verificação

Execute `bun run typecheck`, `bun test src` e `bun run check`. Os testes devem cobrir o mapa ZERO, os cinco artefatos, ordem/dependências, próxima tarefa, entitlement e abertura da ferramenta de destino.

## Destino Molda — 07/09/2026

Cartões também aceitam `destination: molda`. Contexto: `assetId` do inventário visual,
`artKind` model/texture/sky, aparência, uso e paleta. Saída `molda_asset` referencia o ID da
criação real, sem substituir o ID do inventário. O adapter recebe `moldaOwned` opcional;
false/ausente preserva o plano e desabilita o envio. O host resolve posse + carreira.
Pensa continua apenas planejador: não incorpora editor, IndexedDB ou navegação do Molda.

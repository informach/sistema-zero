# @sistemazero/studio

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em qualquer lib/framework, e use Octocode para pesquisa/exploração de código no GitHub.

IDE educacional embarcável (Sistema Zero Studio) — biblioteca INTERNA do monorepo, consumida como TS source (modelo do `@sistemazero/ui`). Migrada do repo standalone `sistema-zero-studio` em 2026-06-10; os 11 sub-packages `@sz/*` viraram pastas de `src/` referenciadas por subpath imports `#core`, `#ir`, `#blockly`, `#monaco`, `#parsers`, `#generators`, `#preview`, `#extensions`, `#official-extensions`, `#ai`, `#ui` (ver `imports` no package.json).

## O que é

Editor com 3 modos — Blocos (Blockly), Código (Monaco) e Ponte (sync bidirecional blocos⇄código via worker de reverse-parse) — + preview sandbox, console, terminal (WebContainer), painel de IA (OpenRouter) e extensões.

**API pública** (`src/index.ts` — TUDO fora dela é interno; Fase 5 somou
**`importProjectSnapshot(raw, {name?})`** — `src/projects/importSnapshot.ts`, importa um snapshot
jogável/`.szproject.json` como projeto NOVO no namespace atual via `importProjectFromJSON` do
projectStore, com `name` opcional sobrepondo o do snapshot — é o "Fazer a minha versão"/remix do
Mural kids; o host chama `setStudioStorageNamespace(viewerId)` ANTES): DOIS componentes finos sobre um **núcleo comum** (`StudioCore`, interno) — `<StudioEditor>` (editor COMPLETO independente; sem conceito de aula/atividade; desde 07/2026 TAMBÉM aceita as props de curadoria `StudioLearningProps` — o kids abre o `/estudio` com o degrau derivado do RANK via `resolveStudioTier` do member-shell; `level` aceita a escada NOVA de 6 (`iniciante-2d`…`avancado-3d`) E os 3 valores legados (normalizados na fronteira `resolveLearning`); sem `level` segue o default `avancado-3d` [topo], zero regressão) e `<StudioLesson>` (bloco de AULA configurável: curadoria de aprendizado `level`/`allowBlocks`/`allowCategories`/`allowLevelReveal` + defaults restritos terminal/IA/profissional/export/download OFF + prop `activity` fiada p/ a auto-correção). Ambos uncontrolled (`initialProject` + `onChange`/`onSave`/`onError`; `persistence: 'local'|'none'|adapter`; `allowedModes`/`initialMode`; `theme`/`locale`; `limits`; **`share?: StudioShareAdapter`** (liga o botão Compartilhar); `ref` → `StudioHandle`). `<Studio>` (+ `StudioProps`) **@deprecated** = alias do `StudioCore` (compat; migrar p/ Editor/Lesson). Também: `<ProjectList>` (IndexedDB local; aceita `theme?` p/ o host FIXAR claro/escuro e esconder o toggle — espelha o `theme` do Editor/Lesson), `createLocalPersistenceAdapter`, **`setStudioStorageNamespace(ns)`** (namespeia o IndexedDB local por VIEWER — app-agnóstico: o host seta o id do perfil (kids) OU da conta (adulto) ANTES de usar a `ProjectList`/editor; vazio = store histórico `sistema-zero-studio`; é o que isola a lista do Estúdio Completo entre perfis/contas no mesmo navegador — a lição reseta p/ `''`), `createEmptyProject`, `prefetchStudioModes`, os tipos `LessonActivity`/`ActivityCheck`, **`captureCoverFromProject(project)`** (capa PNG da vitrine "Mural dos Criadores" — `src/cover/coverCapture.ts`: roda o projeto num iframe via `buildPreviewDoc` + harness que fotografa e posta ao parent autenticado por `ev.source`. **DUAS passadas:** (1) **canvas** — lê o MAIOR `<canvas>` com `toDataURL` (jogos 2D/3D), pipeline atual; (2) só se a 1ª voltar `null`, **DOM via html2canvas** carregado do esm.sh DENTRO do iframe (`extensionImports.html2canvas` → importmap + origem no `script-src`, igual ao `three` do Jogo 3D) rasterizando o `document.body` — cobre páginas HTML/CSS sem canvas. ⚠️ o iframe NÃO usa mais `visibility:hidden`/off-screen (parava o rAF → "sem foto" nos jogos): fica na viewport com `opacity:0`. Canvas tainted/timeout/falha do html2canvas → `null`, o chamador cai na capa do admin / upload; mesmos invariantes do `runSandboxChecks`, NUNCA `allow-same-origin`/`targetOrigin` no postMessage; happy-dom não roda o iframe → verificar em BROWSER real), **`<StudioProjectPlayer project>`** +
**`renderProjectToPreviewDoc(project)`** (player AUTÔNOMO do jogo — só roda o jogo num iframe sandbox,
autostart, SEM editor — para a página PÚBLICA de jogar do community-kids; subpath LEVE
**`@sistemazero/studio/player`** = só a cadeia de preview, sem Monaco/Blockly), o adapter
**`StudioShareAdapter`** (botão "Compartilhar" — ver seção própria), e o CSS
`@sistemazero/studio/styles.css`. **Como consumir: ver `docs/embedding.md`** (transpilePackages, `@source`, ssr:false, headers do terminal).

**Núcleo + dois componentes** (`src/studio/`): `StudioCore.tsx` é o motor (provider de stores POR INSTÂNCIA + corpo: resolução de config, memoização de chave primitiva `allowedModesKey`/`resolvedModesKey`, sanitize/hydrate, `StudioHandle`, locale latch). A resolução de config (`resolveStudioConfig`/`resolveLearning`/`resolvePreviewSecurity`) fica AQUI; os wrappers só passam props cruas + defaults — duplicar a resolução re-hidrataria por cima das edições do aluno (guardado em `Studio.test.tsx`, que segue testando o `StudioCore` pelo alias). A **atividade com auto-correção** (fase 2) entra por contexto próprio (`src/studio/activity.ts`: tipos `LessonActivity`/`ActivityCheck` — união `structure`/`behavior`/`testcase`/`code` — + `StudioActivityProvider`/`useStudioActivity`, default `null`); o `ActivityPanel` é self-gating → `<StudioEditor>` nunca provê o contexto, então o editor puro não paga pela feature de aula. É **responsivo e montado nos DOIS layouts** (6º review): coluna lateral `w-80` no wide, faixa de topo `w-full max-h-[45%]` no narrow — sem isso o aluno em tela estreita (kids no celular) ficava sem "Verificar" e o gate reprovava em silêncio. O enunciado é markdown (autorado no admin/TipTap) renderizado por `renderLessonMarkdown` (`components/layout/lessonMarkdown.ts`, puro, escape-FIRST + subconjunto seguro). **Runner** (`src/activity/`): `structure.ts` (anda o IR, PURO — espelhado no members p/ recálculo server-side, mesmas fixtures), `harness.ts` (STRING pura injetada no sandbox: roda behavior/testcase/code no `load` e posta `checkResult`), `sandbox.ts` (iframe OCULTO via `buildPreviewDoc`, autentica por `ev.source`), `grade.ts` (nota ponderada), `useActivityRunner` (botão "Verificar" → `checksStore` por instância; `StudioCore` zera o `lastResult` no hydrate/unload p/ não vazar nota entre projetos). `StudioHandle.getActivityResult()` expõe o último resultado p/ o host anexar no envio (correção híbrida). Canal `checkResult` em `src/preview/types.ts`. Só CLÁSSICO (pro/WebContainer fora). ⚠️ **A CSP do preview NÃO libera `'unsafe-eval'`** (só `'unsafe-inline'`): por isso o harness roda o `code` do professor e LÊ globais (`readGlobal`) via `<script>` INLINE injetado (`createElement('script')`+`textContent`) — NUNCA `eval`/`new Function` (bloqueados pela CSP) — e isso também alcança as globais LÉXICAS (`let`/`const` de topo, que NÃO viram `window[...]`). Mexeu no harness? Re-verifique num BROWSER real (o `bun test` não enforça CSP). ⚠️ As definições da atividade VÃO ao aluno (feedback instantâneo) — anti-cola do gate é o `structure` recalculado no servidor.

**Arquitetura de estado**: stores Zustand POR INSTÂNCIA (factories + `StudioStoresContext`); os hooks `useXStore(selector)` caem na store DEFAULT de módulo fora de um `<Studio>` (lista/testes), e as estáticas `useXStore.getState/setState` operam SEMPRE na default (contrato dos testes). `settingsStore` é singleton de propósito (preferência do usuário). Persistência = `PersistenceService` por instância (`src/persistence/service.ts`): qualquer adapter ganha autosave debounced + flush (pagehide/unmount/Salvar); `onChange` SEMPRE no debounce, inclusive com 'none'.

**Paleta**: tokens `--color-sz-*` em `src/styles/studio.css` espelham a paleta oficial do sistema-zero (referência comunidade-sistema-zero) em oklch, dark E light, com identidade dual (accent = brand-lime no dark, cyan no light). Blockly tem temas `sz-dark`/`sz-light` em HEX equivalentes (`src/blockly/theme.ts` — manter em SINCRONIA com o CSS); Monaco segue o tema da instância. Toggle sol/lua na Topbar (some quando o host fixa `theme`). **Revamp visual estilo MakeCode (público kids):** o tema PADRÃO virou CLARO/creme (`#fef9ef`; era dark) — flip em `settingsStore` (init + fallback `?? 'light'`), `studio/theme.tsx` (context default) e `theme.ts`; toggle e host que fixa `theme` seguem. **COR = IDENTIDADE DA CATEGORIA em arco-íris** (`CATEGORY_COLORS`): cada categoria de topo tem 1 cor BEM distinta (Pesquisa cinza · HTML azul-escuro · CSS vermelho · SVG verde · Programação laranja · Canvas roxo · Avançado azul-céu · Jogo 2D rosa · Jogo 3D amarelo) e as SUB-categorias são TONS dela via `categoryShades(base, n)` (`blockly/colorShades.ts`, PURO/sem Blockly, viés-ESCURO — o texto do bloco é BRANCO em TODOS via `.blocklyText`, por isso os tons não podem clarear demais). Mudar a cor base RE-DERIVA os tons; cada `blocks/*.ts` e as extensões game-2d/3d aplicam `categoryShades` + um loop `COLOUR_BY_TYPE`. Fonte redonda `Baloo 2`/`Nunito` (`--font-family-sans` + `FONT_STYLE`, sem `@font-face`). Toolbox = chips arredondados coloridos (só CSS no `studio.css`, faixa colorida por categoria). ⚠️ renderer custom foi TENTADO e REVERTIDO (dobrar o raio distorcia as "bocas" em C dos blocos com statement-input) — usa `zelos` puro; QA de bloco DEVE incluir blocos com statement-input. Logo oficial: `BrandLogo` (`src/ui-internal/BrandLogo.tsx`) = só o SÍMBOLO (160×160), para a Topbar compacta; `BrandWordmark` (`src/ui-internal/BrandWordmark.tsx`) = logo COMPLETO (símbolo + wordmark "Sistema Zero" do logoszs.svg, viewBox 1500×160), usado no header da ProjectList. O wordmark usa `fill="currentColor"` para recolorir conforme o tema (branco no escuro, escuro no claro); o símbolo mantém o gradiente lime→cyan e a moldura branca. Gradientes com id via `useId()` (multi-instância). Ambos extraídos do logoszs.svg oficial.

## Modos: básico × profissional (regra D2)

`src/core/modes.ts`: `modesForKind(kind)` decide a barra de modos pelo TIPO de projeto — **básico**
(`kind` ausente/`'classic'`) = **Blocos + Ponte** (editam só os 3 arquivos canônicos via UI);
**profissional** (`kind: 'pro'`) = **Código** (Monaco sobre a ÁRVORE Vite inteira). `normalizeClassicMode`
migra o legado `'code'` (quando o básico tinha Código standalone, pré-D2) para `'bridge'`. A Topbar
interseca `modesForKind(kind)` com o `allowedModes` do host. O preview profissional
(`src/modes/pro/ProPreview.tsx`) NÃO é srcdoc: aponta para o **dev-server do Vite rodando DENTRO do
WebContainer** (mount → `npm install` → `npm run dev` → `server-ready` → iframe; exceções cross-origin
chegam por `preview-message` ao Console). Na fase ready há a **barra** (nome do projeto — o `<title>`
vivo não é legível, iframe cross-origin — + "⟳ Atualizar" que REMONTA o iframe via key + "⏻ Reiniciar"
= attempt++, mata o dev e re-roda install morno+dev). O **console.log do app chega ao Console da IDE**
via `proConsoleBridge.ts`: script STRING PURA injetado em toda página pelo `setPreviewScript` do
WebContainer (embrulha console.*, postMessage com targetOrigin do HOST — nunca `'*'`); o ProPreview
valida ORIGEM (a do dev-server corrente) + forma (`isProConsoleMessage`) antes do logsStore. O sync host→container é um `FsDiff` (`src/modes/pro/fsDiff.ts`
+ `useWebContainerSync.ts`): diff puro entre dois snapshots planos que calcula writes/removes/**mkdirs/
rmdirs** e o **conflito arquivo↔diretório** (`removeFirstPaths`, removido RECURSIVAMENTE ANTES de
mkdir/write — senão a colisão trava o sync). Ordem fixa: removeFirst → mkdir → write → remove → rmdir.

## Layout responsivo (wide × narrow)

O Studio é embarcado em LARGURA VARIÁVEL (community/kids/member-shell), então a medida que decide o
layout é a largura do PRÓPRIO root, via `ResizeObserver` (`src/studio/layoutContext.tsx` →
`useStudioWidth`/`useStudioLayout`), NÃO o viewport. Limiares em `src/components/layout/layoutBreakpoints.ts`:
`STUDIO_NARROW_MAX_PX` (1024) e `STUDIO_COMPACT_MAX_PX` (440).

- **wide** (≥1024): split vertical `[ModeArea] / [BottomPanel]`; cada modo desenha seu split horizontal
  `[editores | preview]` (BlocksMode/BridgeMode/CodeMode/ProCodeMode).
- **narrow** (<1024): o `Shell` troca para o `NarrowLayout`; cada modo, lendo `useStudioLayout().isNarrow`,
  renderiza um `NarrowPanels` (`src/components/layout/NarrowPanels.tsx`) — UMA tira de abas plana:
  editores do modo (Blocos/Código) → Pré-visualização → Console/Terminal/IA. O explorador de arquivos
  (modos Código) vira GAVETA sobreposta (botão "Arquivos"). O `TabStrip` mantém TODOS os painéis montados
  (só alterna `hidden`), igual ao wide — preserva xterm/Monaco/Blockly/iframe ao trocar de aba. ⚠️ **EXCEÇÃO
  do preview:** a aba **Pré-visualização** é `keepLiveIds` no `TabStrip` — quando INATIVA fica RENDERIZADA
  (composta, na viewport) mascarada por `absolute inset-0 opacity-0 pointer-events-none` + `inert`, NÃO
  `display:none`. Motivo: o navegador PAUSA o `requestAnimationFrame` de um iframe não renderizado, então um
  erro de runtime DENTRO do loop de jogo só apareceria no Console depois de abrir a aba do preview (bug do
  "console só atualiza depois de ver a pré-visualização"). Mantendo o preview vivo, o loop roda em background
  e os erros chegam ao Console em tempo real. Mesmo motivo do rAF em `cover/coverCapture.ts` (opacity:0 =
  composto; visibility/display = pausado). ⚠️ verificar em BROWSER real (headless NÃO estrangula o rAF).
- **compact** (<440): só micro-ajustes de identidade na Topbar (logo vira símbolo, badge vira bolinha).

**Responsividade POR SEÇÃO (não pela página)**: o cabeçalho do Monaco e a barra do Preview compactam
conforme o PRÓPRIO contêiner, NÃO o root — em modo Ponte (3 painéis) ou quando o aluno encolhe o split, o
Monaco/Preview podem estar estreitos mesmo num Studio largo. Cada um mede a própria largura via
`useMeasuredWidth` (`src/hooks/useMeasuredWidth.ts` — ResizeObserver, dispara no arraste do handle):
`MonacoTabs` < 480px → botão "Formatar" vira ícone; `PreviewIframe` < 400px → botões só-ícone + esconde
"Executando/Parado". `useStudioWidth` (root) decide só a ESTRUTURA (Shell wide×narrow, identidade da
Topbar); as seções NÃO herdam `isNarrow` do root.

⚠️ **Monaco precisa de `min-h-0` para ENCOLHER na vertical**: a raiz do `MonacoTabs` (`flex h-full
flex-col`) e o contêiner do `<Editor>` (`flex-1`) levam `min-h-0`. Em coluna flex, `flex-1` tem
`min-height:auto` e se recusa a encolher abaixo da altura do conteúdo — sem o `min-h-0` o editor TRANSBORDA
e CORTA o código de baixo quando o painel encolhe (ex.: ao subir o console inferior). Com ele, o
`automaticLayout:true` do Monaco relayout-a sozinho (não trocar por `editor.layout()` manual — ver comentário
no arquivo). Blocos (ResizeObserver→`svgResize`) e preview (iframe) não dependiam disso.

⚠️ **GATE de medição (regra 12)**: o `Shell` NÃO monta nenhum dos dois layouts enquanto `layout.width === 0`
(estado inicial = wide). Sem o gate, a 1ª pintura cairia no wide e o frame seguinte (já medido) trocaria
para narrow, REMONTANDO Blockly/Monaco — o que abria a corrida `Blockly.updateToolbox` ("Existing toolbox
has no categories. Can't change mode."). A medição é síncrona (`useLayoutEffect` antes do paint), então o
estado não-medido nunca chega à tela. Cruzar o limiar wide↔narrow EM USO ainda remonta (custo raro, aceito).

**Mostrar/esconder painéis** (espelho do `showPreview`): `showConsole`/`showTerminal`/`showAI` no `uiStore`,
togglados no menu "⋯" → Exibição da Topbar, **cada um no contexto em que aparece** (Console em todo modo;
Terminal/IA só em `mode === 'code'`). `useVisibleBottomTabs` (`src/components/layout/bottomTabs.tsx`) é o
ponto único que cruza features×contexto×preferência — consumido pelo `BottomPanel` (wide), `NarrowPanels`
(abas) e `Shell` (decide se a barra inferior existe). No wide, esconder tudo COLAPSA a barra inferior.

## Persistência do programa do aluno (guardar/ler que PERSISTE)

O programa que o aluno cria (jogo/app) pode **guardar e ler estado entre execuções** — não só o CÓDIGO
do projeto. Duas peças:
- **`src/preview/storageBridge.ts`** — shim de `localStorage`/`sessionStorage` injetado como `<script>`
  no `<head>` do iframe (origem opaca = `SecurityError` nativo ao tocar em storage). É **string pura**
  (entra num `<script>`): sem imports, sem refs externas. `localStorage` ("permanente") é semeado com o
  snapshot no boot e cada mutação é espelhada ao parent via `postMessage` **com `targetOrigin`** (nunca
  `'*'` — não vaza o snapshot); `sessionStorage` é efêmero em memória (não vai ao parent, zera a cada
  run). Snapshot via `JSON.parse` (não literal) — evita o gotcha de `__proto__`.
- **`src/state/gameStorage.ts`** — o parent persiste o snapshot POR PROJETO no IndexedDB
  (`sz:game-storage:<projectId>`), clampado por quota; `writeGameStorage` apaga o registro se vazio
  (best-effort: quota cheia / sem IndexedDB = no-op, nunca quebra o preview).

**`src/state/persistence.ts`** virou **3 partições** por projeto no IndexedDB — `sz:project-meta:<id>` /
`sz:project-files:<id>` / `sz:project-state:<id>` (legado `sz:project:<id>` em doc único). Escritas por
id são **serializadas FIFO** (`runSerializedWrite(id, task)`) — autosave não intercala com rename
(leitura+escrita não-atômica). **Cerca de exclusão** (`fenceGameStorageDelete`/`isGameStorageDeleted`,
janela de graça ~60s + poda lazy): um flush de game-storage OU um autosave em voo que chegue DEPOIS do
delete é descartado — **não ressuscita registro órfão**. O mesmo mutex cobre projeto e game-storage; o
`settingsStore` agora CEGA a ausência de IndexedDB (modo privado/contexto restrito) — cai p/ defaults em
memória com `loaded:true` em vez de lançar.

## Segurança do preview (defesa em camadas — 4º full review)

Três guardas ortogonais ao sandbox do iframe, todas testadas (`src/preview/__tests__/`):
- **`csp.ts`** — CSP interna do srcdoc: libera subrecursos PASSIVOS de `https:` (img/font/media/css/
  frame), mas `script-src` NÃO inclui `https:` (sem `<script src=remoto>` — anti supply-chain),
  `connect-src 'none'` por default (sem fetch/XHR/WS a menos que o professor libere origens) e
  `worker-src 'none'`. Trade-off aceito: img/media/font/frame de `https:` = GET passivo de mão única
  (sem resposta legível, sem cookies) — NÃO alterar.
- **`loopGuard.ts`** — instrumenta `for/while/do-while/for-of/for-in` (parse Babel + walk AST; clássico
  1º, cai p/ módulo com errorRecovery) injetando `__szLoopTick()`, que estoura um **orçamento contínuo**
  (`budgetMs`, default 4000) reiniciado a cada macrotask. `performance.now()` é capturado/bindado no
  BOOT (o aluno não congela o relógio) e `window.__szLoopTick` é **travado** (`writable:false,
  configurable:false`) — não dá p/ neutralizar.
- **`permissionGuard.ts`** — enforcement em runtime das permissões de extensão (camada dupla com a CSP).
  Baseline sempre liberada (canvas/teclado/mouse/áudio/storage); **rede bloqueada por default** —
  `fetch`/XHR/WebSocket/EventSource lançam, a menos que a extensão declare `network` (1st-party
  auditado) OU o professor libere `fetchAllowedOrigins` (allowlist por origem esquema+host+porta;
  protocolo não-http(s) barrado ANTES de comparar origem). Injetado ANTES dos bootstrap de extensões.

## Exportar & Virar profissional

- **Exportar (deploy)** (`src/export/`, Topbar → menu ⋯ → `ExportDialog`): `exportProject(project, opts)`
  monta um **ZIP pronto p/ deploy** (`fflate`, carregado sob demanda) com `onProgress`. Clássico →
  `public/` minificado + index.html de produção + Dockerfile/railway.json; profissional → árvore Vite real
  + templates de deploy (`deployTemplates.ts`). **Minificadores são injetáveis** (`defaultMinifiers()` =
  terser/csso reais; testes usam `identityMinifiers` no-op). Nome saneado (`sanitize.ts`); avisos não-fatais
  (extra quebrado, lib 3D via CDN) exibidos APÓS o download. Deps: `terser`/`csso`/`fflate`. Gated por
  `features.export`.
- **Baixar (fonte p/ continuar no VSCode)** (`src/export/sourceExport.ts`, Topbar → botão "Baixar" ao lado
  do Salvar, gated por `features.download` — ON no `<StudioEditor>`, OFF no `<StudioLesson>`):
  `exportProjectSource(project)` / `buildSourceFiles(project)` reusam `buildClassicFileMap` SEM minificar e
  **removem o prefixo `public/`** (as referências do index.html já são relativas) → ZIP de FONTE legível na
  RAIZ (index.html/style.css/script.js + `sz-ext/<id>.js` dos runtimes de extensão + `sz-assets.js` das
  imagens embutidas) + `LEIA-ME.txt`, SEM Dockerfile/railway. Pro → árvore Vite (`buildProFileMap`). Nome
  `<slug>.zip` (sem `-deploy`). Roda e edita; é o "abrir no editor", distinto do "Exportar" (publicar).
- **Exportar/Importar JSON (lista de projetos)** (`ProjectCard.downloadAsJSON` → `*.szproject.json` = o
  `Project` inteiro: files/extras/assets `data:`URL/extensões/ir/blocksState/tree; `importProjectFromJSON`
  no `projectStore`): o import cria um projeto NOVO (ulid novo, `createdAt`/`updatedAt` zerados) e SANEIA
  tudo pelos MESMOS tetos do load — as constantes de cota são **COMPARTILHADAS import↔load↔save↔preview**
  (`projectStore.ts` ~l.135 + `core/project.ts`; subir uma sobe em todos sem re-recorte ao reabrir).
  Devolve **`{ project, warnings }`**: descartes silenciosos (imagem/extra/extensão fora da cota, blocos com
  tipo desconhecido, pro→classic) viram avisos que o `ImportButton` mostra. ⚠️ `blocksState` é
  **tudo-ou-nada** (`sanitizeImportedBlocksState`): um bloco fora de `CORE_BLOCKLY_BLOCK_TYPES` (ou da
  allowlist da extensão) zera TODOS os blocos — todo bloco novo PRECISA entrar no allowlist (guardado pelo
  drift `blockAllowlist.test.ts`).
- **Virar profissional** (`src/state/convertToPro.ts` → `convertClassicToProTree`, ação `convertToPro`
  no `projectStore`): graduação **one-way** do básico (3 arquivos) p/ a árvore Vite — reusa
  `buildClassicFileMap` SEM minificar (é código que o aluno vai editar), index.html na raiz, assets p/
  `public/`, referências relativas → absolutas, config do template vanilla (mas não os src/index do
  template). `ConvertLegacyPrompt.tsx` (no `Shell`) oferece a conversão automaticamente ao abrir um
  básico **legado com `extraFiles`** (Blocos/Ponte não editam extras) — "Transformar" ou "Agora não".

## Topbar: ações (06/2026)

A `Topbar` (`components/layout/Topbar.tsx`) deixa SOLTO só o botão **"Compartilhar"** (quando há
`share`) + o toggle de Preview + o menu **⋯**. **Salvar e Baixar VIVEM no ⋯** (seção "Arquivo", junto
de Exportar/Virar profissional) — decisão de UX do estúdio-produto kids (Topbar enxuta). O badge de
status ("Salvo"/"Não salvo"/"Erro") continua visível na Topbar comunicando o estado. Mudança no
componente COMPARTILHADO → vale p/ `<StudioEditor>` E `<StudioLesson>` (na aula o Baixar já era oculto
por `features.download:false`; o Salvar agora também fica no ⋯).
**Mais 2 itens no ⋯ → Arquivo (28/06):**
- **"Exportar para o Estúdio"** (SEM gate, vale nos DOIS componentes): baixa o projeto ATUAL como
  `.szproject.json` — o MESMO formato que a listagem importa (`downloadProjectAsJSON` em
  `export/download.ts`, reusada também pelo `ProjectCard`). É como a criança leva o projeto da AULA
  para o **Estúdio Completo** (importar lá). i18n `topbar.exportStudio`.
- **"Sincronizar com o enviado"** (OPT-IN, só na aula): aparece quando o host passa
  **`onCloudSync?: () => void`** (`StudioCommonProps`; contexto `studio/cloud-sync.ts` —
  `useStudioCloudSync`; latchado no `StudioCore` como o `share`). O Studio só dispara o callback; o
  HOST (member-shell) puxa a entrega do servidor e troca o projeto via `StudioHandle.replaceProject`.
  i18n `topbar.cloudSync`; ícone `IconRefresh` (novo em `ui-internal/icons.tsx`).

## Compartilhar (publicar no Mural dos Criadores)

Botão **"Compartilhar"** na Topbar (solto, ao lado do ⋯) que publica o projeto no **Mural dos
Criadores** + gera um **link PÚBLICO de jogar**. **Opt-in**: só aparece quando o host passa um
`share?: StudioShareAdapter` (prop em `StudioCommonProps` → vale p/ `<StudioEditor>` E `<StudioLesson>`).
A capacidade é GENÉRICA de propósito — serve ao estúdio de AULA hoje e ao estúdio-produto standalone
no futuro, sem retrabalho. **Desabilitar o botão** (sem escondê-lo): prop **`shareDisabledReason?: string`**
(também em `StudioCommonProps`) — texto presente = botão VISÍVEL porém desabilitado, com o texto como
tooltip; `undefined` = habilitado. ⚠️ Ao contrário do `share` (latchado em `useState`), é VOLÁTIL: vive
no `StudioShareDisabledContext` (NÃO latchado, lido ao vivo no Topbar via `useStudioShareDisabledReason`)
— o host troca conforme o estado. O kids usa p/ só liberar o Compartilhar APÓS a entrega ao professor.

- **Adapter** (`src/studio/share.ts`, contexto INTERNO latchado como o `activity` — só os TIPOS saem no
  index): **`generateDescription?`** ({project,title}) → Promise<string> (rascunho da IA, SERVIDOR — nunca a
  BYOK do aluno; **OPCIONAL** — ausente = SEM IA: o dialog não gera nem mostra o botão; é o caso do Estúdio
  da AULA, onde o admin define o resumo e a criança só ajusta; presente = Estúdio Completo, projeto livre) e
  `publish({project,coverDataUrl,useAdminCover?,title,description}) → Promise<{muralUrl?,playUrl?}>`.
  Toda a rede/R2/hub/IA-de-servidor vive no HOST (community-kids via member-shell); o Studio só ORQUESTRA
  a UX. Campos novos do adapter: **`presetCoverUrl?`** (capa padrão do curso/admin — fallback do print +
  preview) e, no publish, **`useAdminCover?`** (`true` = usar a capa padrão; o HOST re-resolve a URL no
  servidor, não confia no cliente — mutuamente exclusivo com `coverDataUrl`).
- **Dialog** (`src/components/layout/ShareDialog.tsx`, sobre o `Modal` de `#ui`): **UM MODAL SÓ** (redesenho
  06/2026 — enxugou a máquina de passos antiga): texto do que vai acontecer + **aviso de SNAPSHOT** → campo
  **Título** (editável — oculto quando `titleEditable:false`, ex.: aula) → campo **Resumo** (editável; o botão
  "Gerar/Regerar" com IA aparece SÓ quando o adapter tem `generateDescription` — Estúdio Completo) → **Capa**:
  botão **"Gerar capa"** (`variant="primary"`, ação principal) que tenta o `captureCoverFromProject`; se voltar `null` usa a capa do curso (`presetCoverUrl`)
  e, faltando ela, pede **upload** de imagem da criança (`<input type=file>` → dataURL); também há "Usar a capa
  do curso" e "Enviar uma imagem" sempre disponíveis. **Publicar só HABILITA com título + resumo + capa**
  preenchidos (nada em branco). **Preset (economia de IA):** `presetTitle`/`presetDescription` (admin da aula)
  abrem o modal já preenchidos e, com `presetDescription`, NÃO chamam a IA (a criança edita ou clica "Gerar").
  Sem preset (Estúdio Completo) → a IA gera o rascunho na abertura. Se o adapter define **`onPublished`**, a
  tela de sucesso interna é PULADA: o dialog FECHA e entrega os links ao host (kids comemora com o Zappy +
  "Jogar"); sem ele (Estúdio Completo) → tela de sucesso padrão. ⚠️ **Captura (`coverCapture.ts`):** o iframe
  oculto NÃO usa mais `visibility:hidden`/off-screen (parava o `requestAnimationFrame` → "sem foto" nos jogos
  2D); agora fica na viewport com `opacity:0` (composto, rAF roda). Mesmo assim, projeto sem canvas / falha →
  `null` e a UI cai na capa do curso / upload.
- **Player público** (`src/components/preview/StudioProjectPlayer.tsx` + `src/preview/renderProject.ts`):
  `renderProjectToPreviewDoc(project)` é a MESMA receita do `coverCapture`/`PreviewIframe` (extensões →
  permissões → assets → `buildPreviewDoc`), extraída, pura e defensiva para snapshots legados
  (sem `files` ou com `installedExtensions`/`extraFiles`/`assets` ausentes/não-array). O componente renderiza o srcdoc num iframe
  `sandbox="allow-scripts allow-modals"` (NUNCA `allow-same-origin`), autostart. Exportado no index E no
  subpath leve `@sistemazero/studio/player` (sem Monaco/Blockly — importante p/ a página pública não
  carregar o editor inteiro).
- **Desafio do mês (Fase 5, 07/2026):** `StudioShareAdapter.challenge?: { key, title }` — presente
  (o host SÓ passa quando a criança possui Clube+Estúdio), o `ShareDialog` mostra o checkbox
  "🏆 Participar do Desafio do mês: {title}" (opt-in explícito, reseta a cada abertura); marcado, o
  `publish` recebe `challengeKey` (`StudioSharePublishInput.challengeKey?`). O gate REAL
  (posse + mês corrente) é do SERVIDOR (hub), com drop silencioso da tag — a publicação nunca
  falha por causa do desafio. i18n `share.challenge.*`.
- **No playground** (`bun run dev`): o `EditorScreen` passa um `share` de DEMONSTRAÇÃO (IA/publish
  mockados; print real) só p/ ver/testar o fluxo — o botão não existe sem `share`.

## Regras não-negociáveis

1. **Workers cross-bundler**: todo worker nasce de `new Worker(new URL('./caminho-relativo.ts', import.meta.url), { type: 'module' })` com URL **literal inline** — nada de `?worker` (Vite-only), nada de bare specifier dentro de `new URL()` (Vite não resolve), nada de variável/helper no 1º argumento (quebra a análise estática de Vite/Turbopack/webpack). Os workers do Monaco usam os wrappers em `src/monaco/workers/`. Plano B se um bundler de host falhar: extrair a criação p/ factory injetável via prop.
2. **`loader.config({ monaco })` em `src/monaco/workers.ts` é intocável**: sem ele o `@monaco-editor/react` injeta o loader AMD, que colide com o UMD do Blockly ("Can only have one anonymous define").
3. **CSS**: `src/styles/studio.css` é o CSS exportado — SEM `@import "tailwindcss"`, SEM `@source`, SEM `@custom-variant dark` (sobrescreveria a variant dos apps) e SEM regras globais de app (html/body/scrollbar — vivem no `playground/styles.css`). Tema escopado por `[data-sz-theme]` no root do componente, NUNCA no `<html>` do host. Conteúdo PORTALADO p/ document.body precisa de `<StudioThemeScope>` (ver Modal/ProjectCard/Menu). ⚠️ O dropdown da Topbar (`Menu` de `#ui`) é PORTALADO de propósito: inline (`absolute`) ele ficava ATRÁS do `<iframe>` do preview (iframe = stacking context próprio, vence qualquer z-index local).
4. **Sem react-router**: navegação é do host. Páginas/cards recebem callbacks (`onOpenProject`, `onExit`).
5. **Globais residuais de multi-instância**: WebContainer é singleton por aba; o atalho da busca de blocos (`startSearch`) fica com a última instância (PtSearchCategory desregistra antes de registrar — NÃO remover, era crash na 2ª instância). `deleteProject` cancela autosaves em voo em TODAS as instâncias via registro de serviços.
6. **Testes = bun:test** (`bun test src`; e2e Playwright FORA do CI — `bun run e2e` contra o playground). Gotchas que esta suíte já paga:
   - `mock.module` NÃO é isolado por arquivo — capture os exports reais antes e restaure no `afterAll` (ver `BlocksMode.test.tsx`); mocks de idb-keyval ficam sem restore de propósito (IndexedDB não existe no happy-dom).
   - Sem fake timers — debounce do autosave encurta via `setAutosaveDelayForTests` (`src/persistence/service.ts`); relógio via `setSystemTime` (que RESETA se receber epoch 0).
   - DOM via happy-dom no preload (`bunfig.toml` + `test-setup.ts`).
   - Componentes que rendem DENTRO de um `<Studio>` precisam de PROBE (mock do Shell lendo hooks) — as estáticas `getState` leem a store default, não a da instância.
7. **Vite playground** (`bun run dev`): `optimizeDeps.entries`/`include` precisam casar com os imports REAIS (sufixo `.js` nos deep imports do Monaco; paths com forward slash — backslash do Windows não casa no glob e o Vite re-otimiza com full reload no meio da navegação). Headers COOP/COEP do dev server são obrigatórios p/ o Terminal.

8. **Storage do aluno**: o `storageBridge` é STRING PURA (sem imports); `postMessage` SEMPRE com
   `targetOrigin` (nunca `'*'`); snapshot via `JSON.parse`. `writeGameStorage` roda no MESMO mutex de
   `deleteProject` + cerca de exclusão — um write em voo NÃO ressuscita `sz:game-storage:<id>` órfão.
9. **Guardas do preview travadas**: `__szLoopTick` é `writable:false/configurable:false` e captura o
   `performance.now()` no boot; a CSP NÃO libera `script-src https:` nem `connect-src` (só o professor
   abre origens). Mexeu em segurança de preview? Replique o teste em `src/preview/__tests__`.
10. **`convertToPro` é one-way**; os minificadores SÃO injetáveis (`identityMinifiers` nos testes,
    terser/csso em prod). No `FsDiff`, o conflito arquivo↔diretório sai de `removeFirstPaths` e é
    aplicado RECURSIVAMENTE ANTES de mkdir/write.
11. **Gerador respeita `MAX_GENERATOR_DEPTH` (200)**: `assertJSDepth` (iterativo, pilha explícita) roda
    ANTES de compilar; IR patologicamente aninhada → `GeneratorDepthError` (tipado, capturável pelos
    chamadores), nunca estouro de pilha do motor.
12. **Layout só monta após MEDIR a largura**: o `Shell` gateia em `layout.width > 0` antes de escolher
    wide/narrow. Renderizar wide-por-default e trocar para narrow no frame seguinte remonta Blockly/Monaco
    e quebra a injeção do Blockly. NÃO remover o gate. Modo novo no narrow? Desenhe via `NarrowPanels`
    (abas planas), não um split próprio — e respeite `useVisibleBottomTabs` para Console/Terminal/IA.

## Blocos-container (Estrutura / Aparência / Comportamento) — só gera o que está DENTRO

Modelo estilo MakeCode Arcade (`on start`): a geração NÃO olha mais a posição/ordem dos blocos no canvas
— ela coleta o que está DENTRO de 3 blocos-CONTAINER ("frames"). Bloco solto fora deles é **rascunho**
(ignorado pela geração, mas segue salvo no `blocksState`). Defs em `blockly/blocks/frames.ts`:

| Frame | `CHILDREN` check | rota IR | arquivo | cor |
|---|---|---|---|---|
| `sz_frame_structure` (🧱 Estrutura) | `'HTMLNode'` | `ir.html` | index.html | html |
| `sz_frame_appearance` (🎨 Aparência) | `'CSSEntry'` | `ir.css` | style.css | css |
| `sz_frame_behavior` (⚙️ Comportamento) | `'JSStmt'` | `ir.js` (na ORDEM da pilha) | script.js | js |

São CHAPÉUS (sem `previousStatement`/`nextStatement`) → top-level, 1 de cada por projeto. O `check` de cada
boca reusa a conexão que os blocos JÁ expõem, então todo bloco existente encaixa sem mudar definição.
Toolbox: categoria **🗂️ Áreas do projeto** (1ª, logo após Pesquisar).

- **Coleta** (`blockly/buildIR.ts buildIRFromWorkspace`): pega o 1º frame de cada tipo e lê seus filhos
  (`getHtmlChildren`/`getCssEntryChildren`/`getStatementChildren`). Ordem só importa DENTRO do Comportamento
  (cadeia `.next`). `collectFlatFromWorkspace` (modelo ANTIGO, anda TODOS os top-level em ordem de leitura) é
  usado SÓ pela migração.
- **Simetria = baixa complexidade**: `buildIRFromWorkspace` (blocos→IR) e `buildWorkspaceStateFromIR`
  (IR→blocos, `workspaceState.ts`) embrulham/desembrulham nos mesmos 3 frames → blocos→IR→blocos é estável e
  a maioria dos testes de round-trip passa sem mexer. (Por isso a antiga máquina de layout multi-pilha —
  `splitIntoStacks`/`layoutFromBlocksState`/`StacksLayout` — foi REMOVIDA: com 1 frame por categoria não há
  várias pilhas a reposicionar.)
- **Projeto novo** (`core/project.ts createEmptyProject`): nasce com os 3 frames VAZIOS no `blocksState`
  (seed inline; o `BlocksMode` faz short-circuit com IR vazia, por isso semear o blocksState e não a IR).
- **Migração transparente** (`blockly/normalizeFrames.ts`, hook no load effect do `BlocklyPanel`): projeto
  LEGADO (sem frames) é carregado num WS headless → `collectFlatFromWorkspace` → IR plana →
  `buildWorkspaceStateFromIR` (frama) → **preserva a saída byte-a-byte**. Idempotente. ⚠️ As extensões já
  precisam estar registradas (o `reregisterInstalledExtensions` roda antes), senão o load headless dropa o tipo.
- **Rascunho × Ponte**: bloco solto NÃO está na IR; editar CÓDIGO na Ponte reconstrói só os framados →
  **rascunhos somem** (esperado — some só no sync por código, não em edição de blocos nem refresh).
- **Organizar blocos** (`blockly/organize.ts`): o `categoryOf` LOCAL mapeia os frames p/ html|css|js → os 3
  ficam LADO A LADO (Estrutura | Aparência | Comportamento), o frame no topo da coluna e rascunho da mesma
  categoria abaixo dele.
- **Allowlist**: os 3 `sz_frame_*` estão em `CORE_BLOCKLY_BLOCK_TYPES` (senão `sanitizeImportedBlocksState`
  zera todo o estado — ver gotcha do round-trip de import).
- ⚠️ **FASE 2 pendente**: funções/classes/eventos viram blocos-CHAPÉU FORA do Comportamento (referenciados,
  injetados ANTES do passo a passo). Hoje seguem funcionando DENTRO do Comportamento.

## Copiar/colar blocos entre projetos

Menu de contexto: **"Copiar blocos"** (no BLOCO) + **"Colar blocos"** (no canvas) —
`blockly/blockClipboard.ts`, registrados em `setup.ts` junto de Organizar/Imagem. Copiar =
`Blockly.serialization.blocks.save` (bloco + filhos + cadeia ABAIXO, igual ao que se move ao arrastar)
→ `localStorage` `sz:block-clipboard` (durável, cross-tab, SÍNCRONO p/ a precondição do menu). Colar =
`Blockly.serialization.blocks.append` (NÃO limpa o workspace; ids são removidos antes → colar 2× não
colide); o bloco entra SOLTO (rascunho — ver "Rascunho × Ponte") p/ a criança arrastar p/ um frame.
Variáveis viajam no JSON (são `field_input`) — sem remapeamento. Os itens são GLOBAIS (Editor + Lesson),
mas o colar alcança o `projectStore` da instância via `WeakMap` (`registerPasteTarget` +
`PasteTargetHandlers`, ligados no `BlocklyPanel`): auto-ATIVA a extensão de Jogo 2D/3D que falte
(`installExtension` + aviso) e RECUSA tipo desconhecido (`isBlockTypeKnown` do `projectStore` — SEM o
all-or-nothing do `sanitizeImportedBlocksState`). Aviso gentil = toast efêmero no `BlocklyPanel`. Frames
(`sz_frame_*`) não são copiáveis.

## Blocos: categorias + como adicionar um

**Categorias** (montadas em `src/blockly/toolbox.ts buildCoreToolbox`; cores em `theme.ts CATEGORY_COLORS` — cada categoria tem 1 cor de arco-íris distinta e as sub-categorias são TONS dela via `categoryShades`):
**🗂️ Áreas do projeto** (`blocks/frames.ts` — os 3 blocos-container, ver a seção anterior), **HTML** (`blocks/html.ts`), **🖋️ SVG** (`blocks/svg.ts` — categoria PRÓPRIA: subgrupos Estrutura/Formas/Texto + **🎨 Aparência** = o CSS específico de SVG `fill`/`stroke`/`stroke-width`/`stroke-dasharray`/`stroke-linecap`/`text-anchor`, que CONECTAM na coluna de CSS), **CSS** (`blocks/css.ts`), **Canvas** (`blocks/canvas.ts` — inclui o `sz_html_canvas` "criar tela de desenho", movido do HTML), **Avançado** (`blocks/advanced.ts` — rawHTML/CSS/JS) e o guarda-chuva **Programação** que junta JS (`blocks/js.ts` via `JS_GROUPS`), **🌐 Página** + **⚡ Eventos** (`blocks/dom.ts`; `EVENT_LISTENER_TYPES`/`EVENTOS_TYPE_ORDER` no toolbox movem os "Quando…" p/ Eventos), 🔢 Matemática (`math.ts`), 🔣 Valores (`values.ts`), Funções/Classes/Objetos. Cada arquivo exporta `X_BLOCKS` (+ às vezes `X_GROUPS`) e é somado em `blocks/index.ts CORE_BLOCKS`. Texto de bloco 100% PT didático ([[studio-blocos-portugues]]).

**Curadoria por aula** (`#core/levels.ts`): a paleta é filtrada na CONSTRUÇÃO pelo `LearningProfile`
(`level` + `allowCategories` + `allowBlocks`). **Reforma 2D/3D (07/2026):** `BlockLevel` virou a
escada TOTAL de 6 degraus (`iniciante-2d` < `iniciante-3d` < `intermediario-2d` <
`intermediario-3d` < `avancado-2d` < `avancado-3d` — 2D antes do 3D em cada dificuldade, a MESMA
ordem da carreira do aluno; teto = `MAX_BLOCK_LEVEL`). A API pública aceita TAMBÉM os 3 valores
legados (`AnyBlockLevel`) e a fronteira ÚNICA `resolveLearning` normaliza via `normalizeBlockLevel`
(legado: iniciante→ini-2d, intermediario→int-3d, avancado→av-3d — preserva os conjuntos antigos;
lixo→ini-2d fail-closed); consumidores internos leem `config.learning.level` JÁ normalizado.
`minLevel` das extensões: game-2d=ini-2d, game-3d=ini-3d (porta do 3D), game-2d-advanced=int-2d,
world-3d=int-3d, game-3d-advanced=av-3d; sem `minLevel` → `DEFAULT_EXTENSION_MIN_LEVEL` (int-3d)
via helper `extensionMinLevel` (fonte única — nunca `?? '…'` inline). `BLOCK_LEVEL_OPTIONS` é a
fonte dos labels do select do admin. ⚠️ **`allowBlocks` é RESTRITIVO** (06/2026): lista
NÃO-vazia = mostra SÓ esses blocos (+ as 🗂️ Áreas do projeto, que nunca passam pelo filtro), ignorando
nível/categoria; vazia = curadoria por nível. (`isBlockTypeAllowed`/`isCategoryAllowed` ganham o ramo
"tem lista? restringe".) O admin escolhe a lista por um picker alimentado pelo **`BLOCK_CATALOG`**
(export do índice — `blockly/blockCatalog.ts`: id+rótulo+categoria derivados dos `*_BLOCKS`, sem
frames/`hidden`; rótulo = `message0` sem os `%N`, com **`LABEL_OVERRIDES`** p/ os blocos cujo texto vive
nos SOQUETES (senão sobra "de"/"Alterar para" e os pares valor/comando colidem — math função/trig, set-property
texto/cálculo, método em Objetos/Classes); **inclui Jogo 2D/3D** — a restrição também alcança as
EXTENSÕES: `filterToolboxCategory` poda a categoria da extensão p/ só os listados, e `pushSubCustom`
(Funções/Classes — flyout dinâmico) só entra se a aula listou algum bloco dele; ⚠️ bloco de extensão só
APARECE se a extensão estiver INSTALADA no projeto inicial). Catálogo + restrição travados por
`blockly/__tests__/{blockCatalog,toolboxRestrict}.test.ts`. ⚠️ **Poda de vazias:** `buildCoreToolbox`
fecha com `pruneEmptyCategories` (rede de segurança) — categoria/sub-categoria que fica SEM nenhum
bloco visível some (preserva 🔎 Pesquisar e os flyouts dinâmicos `custom`); vale p/ nível E lista.

**Adicionar um bloco = ~9 pontos (round-trip blocos⇄código)** — pular um quebra silenciosamente:
1. `ir/schema.ts` — variante na união TS (`JSStatement`/`JSExpr`/`HTMLNode`/`CSSEntry`) **E** no `z.discriminatedUnion` (senão a validação rejeita o IR salvo/importado).
2. `blocks/<cat>.ts` — `BlockDefinition` + entrada num `*_GROUPS` (senão cai em "Mais"). Campo que REFERENCIA um nome já criado (variável/classe/método/propriedade/sprite/cena/objeto/imagem…)? Use um **seletor** (`field_name_picker`/`field_sprite_picker`/`field_asset_picker`), não `field_input` — e, se o bloco DECLARA um nome novo, registre-o no `*_DECL_BLOCKS` do picker (ver "Padrões já usados").
3. `blockly/buildIR.ts` — case bloco→IR (`f()` campos, `exprInput()` valores, `getStatementChildren()` corpos).
4. `generators/{js,expr,html,css}.ts` — IR→código (+ `collectStatementIdentifiers`/`collectExprIdentifiers` p/ variáveis novas, senão o gerador renomeia errado).
5. `parsers/{js,html,css}.ts` — código→IR (Ponte). Expr usável em `se`/valor precisa entrar em `isSimpleValue` (senão vira rawJS).
6. `blockly/workspaceState.ts` — IR→bloco (`statementToBlock`/`exprToValueBlock`/`htmlNodeToBlock`; **5º arg do `block()` = inputs de VALOR**).
7. `state/projectStore.ts` — type em `CORE_BLOCKLY_BLOCK_TYPES` (drift `blockAllowlist.test.ts`; faltar = `sanitizeImportedBlocksState` zera TODOS os blocos).
8. **`blockly/blockLevels.ts` — DEGRAU do bloco** (curadoria por bloco; reforma 2D/3D 07/2026 = escada TOTAL de 6: `iniciante-2d` < `iniciante-3d` < `intermediario-2d` < `intermediario-3d` < `avancado-2d` < `avancado-3d`, a MESMA ordem da carreira do aluno): default é **iniciante-2d** (facilitador); core/g2d de programação real → `INTERMEDIARIO_2D`; core/g2d expert → `AVANCADO_2D`; engine 3D (`sz_g3d_*` avançado) → `AVANCADO_3D`; senão os pisos por prefixo decidem (g3d→ini-3d, gk→int-2d, w3d→int-3d, g3k/t3d→av-3d). ⚠️ NUNCA pôr bloco 3D nos sets `*_2D` (o split protege a promessa do eixo — travado no teste). Valores LEGADOS (`iniciante`/`intermediario`/`avancado`) seguem aceitos nas props públicas e normalizam via `normalizeBlockLevel` (`core/levels.ts`: legado→`iniciante-2d`/`intermediario-3d`/`avancado-3d`, preservando os conjuntos antigos; lixo→`iniciante-2d` fail-closed). O teste `__tests__/blockLevels.test.ts` cobra que o tipo é real (sem typo); revise o degrau antes de assumir iniciante por omissão.
9. teste de round-trip + `bun run typecheck/test/check`.

**Bloco de EXTENSÃO** (`game-2d`/`game-3d`, prefixo `g2d:`/`g3d:`) vive em `official-extensions/<id>/blocks.ts` (NÃO no CORE); schema/buildIR/generators/parsers/workspaceState valem igual, mas com 3 pontos PRÓPRIOS além dos acima: (a) `state/projectStore.ts` → `EXTENSION_BLOCKLY_BLOCK_TYPES['<id>']` (não o CORE); (b) `ir/schema.ts` → o `type` no Set `G2D_STATEMENT_TYPES`/`G3D_STATEMENT_TYPES` (testado em `official-extensions/*/__tests__`); (c) o `blocks.ts` da extensão → a entrada na subcategoria certa do array `SUBCATS` (que monta o `*ToolboxCategory`), senão o bloco cai no grupo genérico "Mais". O `manifest.ts` traz a `docs` (markdown do aluno; `description` ≤ ~500 chars) + bump de `version`. Checklist de revisão: `docs/EXTENSIONS.md`.

**Padrões já usados** (clone-os):
- **Seletores de NOME (escolher, não digitar)** — em vez de a criança redigitar a grafia de algo que já nomeou noutro bloco, o campo CONSUMIDOR abre um pop-up com a lista do que já foi criado (à la Scratch/MakeCode) + um input de texto de fallback. Três campos, TODOS `extends Blockly.FieldTextInput` (o VALOR continua string → IR/round-trip/serialização/allowlist IDÊNTICOS a `field_input`; só troca o EDITOR — **nunca `FieldDropdown`**, que coage nome desconhecido p/ a 1ª opção e PERDE o nome no round-trip): `field_name_picker` (`blockly/fields/FieldNamePicker.ts`, nomes puros por `kind`), `field_sprite_picker` (com miniatura/swatch), `field_asset_picker` (IMAGENS do projeto, `__szAssets`). **Regra de ouro: só CONSUMIDORES viram picker; o campo que DECLARA o nome segue `field_input`** (a criança nomeia uma vez). `FieldNamePicker` tem 12 `kind`: `variable`/`group`(≡lista)/`class`/`function`/`property`/`method`/`canvas`/`spritesheet`/`tilemap`/`scene3d`/`object3d`/`group3d`.
  - **Trocar um campo p/ picker**: `{type:'field_input', name:'X', text:'…'}` → `{type:'field_name_picker', name:'X', text:'…', kind:'…'}` (ou `field_asset_picker`/`field_sprite_picker`). Nada mais muda (nem setup.ts/IR/parser/allowlist).
  - **Miniatura do sprite NO BLOCO (07/2026):** o `FieldSpritePicker` também desenha a miniatura
    (cor OU imagem do asset) AO LADO do nome dentro do bloco — view custom (`initView`/`render_`/
    `updateSize_` deslocam o texto e alargam `size_`; ⚠️ a cor vai em **`rect.style.fill` INLINE** —
    o CSS que o Blockly injeta pinta rects de campo editável por stylesheet e VENCERIA o atributo
    `fill`) + `resolveSpriteVisual` (puro, cache `WeakMap` por workspace) +
    `attachSpriteThumbWatcher` (refresh coalescido em BLOCK_CHANGE/CREATE/DELETE de DECLARADOR +
    FINISHED_LOADING; registrado no inject do `BlocklyPanel` junto de um subscribe da identidade de
    `project.assets` — renomear/trocar asset no painel Imagens não gera evento Blockly). Sem visual
    (nome local de laço 🔁/desconhecido/asset sumido sem cor) → só texto, como antes; a serialização
    fica INTOCADA (elementos extras no `fieldGroup_` não entram). Pop-up com swatch 36×36
    (`<img> object-fit:contain` p/ imagem). E o **FieldColourSZ** ganhou o CÍRCULO CROMÁTICO:
    `<input type=color>` NATIVO na linha HEX — é a prévia da cor atual E o botão que abre o seletor
    livre do navegador (arrastar preenche o input com o hex ao vivo; confirmar aplica no bloco e
    fecha; digitar hex válido espelha no swatch). Estilos do swatch em `studio.css`
    (`.sz-hex-input-row input[type=color]` — pseudo-elementos não entram em cssText); a GRADE da
    paleta é centrada/espaçada via `[data-sz-theme].blocklyFieldColour …` (vence o CSS do plugin
    por especificidade; o pop-up encolheu de ~240px e o input tem `min-width:88px` p/ o código
    `#rrggbb` COMPLETO ficar sempre visível).
  - **Bloco NOVO que declara um nome de um `kind` existente**: adicione-o ao `*_DECL_BLOCKS` correspondente em `FieldNamePicker.ts` (ex.: `VARIABLE_DECL_BLOCKS`, `SCENE3D_DECL_BLOCKS`, `OBJECT3D_DECL_BLOCKS`), senão o picker reporta "nenhum ainda". Sprite/asset têm o seu (`SPRITE_DECL_BLOCKS` no FieldSpritePicker).
  - **`kind` NOVO**: estenda a união `NameKind` + `NAME_KINDS` + `*_DECL_BLOCKS` + um `collect*` + entrada em `KIND_UI` (ícone/placeholder/empty) + um `case` no `collectGlobals`; então troque os campos consumidores.
  - **Nomes LOCAIS de laço** (o "i" do contar, o "item" do enxame): `LOOP_BINDERS_BY_KIND` + `collectScopedNames(block, binders)` sobem por `getSurroundParent` e só aparecem DENTRO do laço (swatch 🔁 "no laço"). Hoje `variable` e `object3d`.
  - **OOP escopado por CLASSE** (`property`/`method`): `blockly/blocks/classIntrospection.ts` (PURO, extraído do `argsMutator.ts` que o reusa) resolve a classe em contexto pela FORMA do bloco (`resolveContextClass`: campo/tomada `OBJ`→`classOfInstance`; sem `OBJ`→`enclosingClass`) e lista SÓ os membros dela (com herança via campo `SUPER`, guarda de ciclo); sem resolver, cai na lista global. ⚠️ NÃO importe `extendsMutator` de dentro do `classIntrospection` (ciclo via FieldNamePicker) — leia `SUPER` inline.
- **Forward-only** (atalho que não precisa voltar a si na Ponte): os blocos dedicados de CSS (fill/stroke/transform/perspective/grid/var…) e o `sz_js_set_style_text` (cssText) produzem IR GENÉRICA (`CSSRule`/`setStyle`); a Ponte reversa devolve a "Regra"/bloco genérico. Só precisam de block+buildIR+allowlist (IR reusada).
- **Container + filho (sem mutator)** p/ N itens: `sz_css_keyframes_steps`+`sz_css_keyframe_step` (animação multi-passo) e `sz_js_switch`+`sz_js_case` espelham `sz_css_rule`+`sz_css_decl` — um helper junta os filhos no buildIR (`getKeyframeSteps`/`getSwitchCases`); round-trip pelo container.
- **Elementos SVG** = `{type:'element', tag, attrs, children}` no MESMO IR do HTML: o gerador emite qualquer tag, o parser `collectAllAttrs` captura todo atributo; em `workspaceState`, `FIELD_ATTRS`/`ID_FIELD_TAGS` dizem quais atributos viram CAMPO de bloco (o resto round-trippa via `data`). Tags SVG vivem em `HTMLTagSchema` + `SUPPORTED_TAGS`/`CONTAINER_TAGS` (parser).
- **SVG dinâmico**: `createElementNS` (o namespace svg é OBRIGATÓRIO p/ a forma renderizar — `createElement` comum não serve) + `getAttribute`; `setAttribute`/`appendChild`/loop de quadro (`sz_canvas_anim_loop` = requestAnimationFrame no núcleo) já existem.
- **`agora: …`** (`sz_val_date_part` → `new Date().getHours()…`, numérico, p/ relógios); `getFullYear` continua sendo o `now` string (NÃO vira `dateGet`).
- **Tela cheia** (`sz_js_request/exit/toggle_fullscreen` + `sz_val_is_fullscreen` + evento `fullscreenchange`): ⚠️ exige `allow="fullscreen"` no iframe (`components/preview/PreviewIframe.tsx` + `StudioProjectPlayer.tsx`), senão `requestFullscreen()` rejeita em silêncio.
- O CSS criativo (variáveis `--x`/`var()`, grid, 3D `rotateX`/`perspective`, pseudo `:hover`/`::before`) JÁ funciona pela "Regra CSS" + "propriedade: valor" genéricas (o parser preserva seletor/propriedade/valor livres); os blocos dedicados são só atalho de UX.
- **VALOR com CORPO de statements** (ex.: `sz_val_new_promise` → `new Promise((resolve) => {…})`, lote P9): um bloco de VALOR (`output`) com um `input_statement`. Três gotchas: (1) `blockToExprInner` (buildIR de valores) NÃO recebe `seen` — passe `getStatementChildren(block, 'DO', new Set())` (árvore de blocos não cicla); (2) o `generators/expr.ts` é a camada de BAIXO (o `js.ts` importa dele) e NÃO compila statements — o `js.ts` INJETA `compileStatements` via `_setExprStatementCompiler(fn)` no load, e o `compileExpr` do valor lê `rec?.indent` (novo campo de `ExprMapContext`, alimentado pelo `recAt` do `js.ts`) p/ indentar o corpo (o corpo compila SEM source map — os dois compiladores usam tipos de mapContext diferentes); (3) `collectExprIdentifiers` do valor tem que recursar o corpo via `collectStatementIdentifiers`.
- **Matcher de VALOR que precisa de `bodyOfFn`/`asRaw`** (lê `source`): o `toExpr(node, ctx?)` NÃO recebe `source`. O `ParseCtx` ganhou o campo **`source`** (semeado no construtor do ctx) — use `ctx.source` (ex.: `matchNewPromise` chama `bodyOfFn(arg, ctx.source, ctx)` de dentro do `case 'NewExpression'`).
- **Comentário** (HTML `<!-- -->` / CSS `/* */`, lote P9): nós `{type:'comment', text}` em `HTMLNode`/`CSSEntry` + blocos `sz_html_comment`/`sz_css_comment`. O parser guarda só o MIOLO (regex `/^\/\*([\s\S]*)\*\/$/` no CSS; `node.textContent` no HTML) e o gerador reconstrói os delimitadores — byte-exato. Antes viravam `rawHTML`/`rawCSS` "avançado" (teste que fixa isso PRECISA ser atualizado p/ o nó `comment`).
- **⚠️ Colisão de nome de bloco**: ANTES de nomear um bloco novo, `grep` o tipo — o lote P9 quase duplicou `sz_js_on_click` (que JÁ existia = `addEventListener('click')`, target por id-string); o `.onclick = () => {}` virou `sz_js_element_onclick`. Um `case` duplicado no `switch` do buildIR não dá erro de TS (o 1º vence, o 2º vira código morto) — a colisão passa silenciosa.
- **Flag booleana num bloco existente** (ex.: método `async`, lote P9): `field_checkbox` no `message0` (valor `'TRUE'`/`'FALSE'`; buildIR `f(block,'X') === 'TRUE'`, workspaceState `X: v ? 'TRUE' : 'FALSE'`). ⚠️ Se o bloco tem MUTATOR, confira que o mutator só mexe no PRÓPRIO input (o `sz_params_mutator` gerencia só o `PARAMS_INPUT`, então o checkbox do `message0` sobrevive) — um mutator que reconstrói o bloco via `jsonInit` apagaria o campo.

## Biblioteca pessoal "Meus desenhos" (ponte Pinta → Estúdio, 07/2026)

`src/asset-library/personal.ts` (subpath **`@sistemazero/studio/personal-assets`**) — o Studio é o
DONO do formato/limites/normalização; o Pinta só conhece o callback `sendToStudio` do host, e o
host (community-kids `pinta-client.tsx`) liga os dois via o subpath (zero import pinta↔studio).
Store idb-keyval PRÓPRIA `sistema-zero-personal-assets-<ns>` (um DB por PERFIL), registros
`asset:<id>` com **UPSERT por id** (reenviar o mesmo desenho atualiza, não duplica). API:
`listPersonalAssets` / `savePersonalAsset` (**fail-soft `{ok:false}`** — quota/ambiente sem IDB
nunca derruba o editor; valida `isValidAssetDataUrl` + `normalizeAssetName` do `#core`, dedup de
nome por sufixo contra OUTROS ids, `PERSONAL_ASSET_LIMITS = {maxCount:128, maxTotalChars:24M}`) /
`removePersonalAsset` / `set`/`getPersonalAssetsNamespace`. **`setStudioStorageNamespace(ns)`
virou wrapper** que seta os DOIS namespaces (persistência de projetos + biblioteca pessoal) — 
nenhum host muda. O `AssetsPanel` ganhou a seção **"Meus desenhos"** entre "No projeto" e
"Biblioteca": carrega ao ABRIR o painel, **só renderiza com namespace ≠ `''`** (some na aula e no
adulto — deliberado), "Adicionar ao projeto" copia via `addAsset` com `uniqueName`
(`libId: personal:<id>`), "Excluir" é otimista/best-effort; estado vazio orienta "Desenhe no
Pinta…". Testes em `src/asset-library/personal.test.ts` (mock idb FUNCIONAL Map-por-DB).

**Metadados de spritesheet/tileset (Pinta→Estúdio, 07/2026 — seletor por nome):** o `ProjectAsset`
ganhou `sprite?: {frameW,frameH,animations:{name,from,to,fps,loop}[]}` e `tileset?: {tileSize,solid:
number[]}` (os índices `from/to` da animação são os MESMOS que o runtime do Jogo 2D usa — o Pinta
empacota 1 linha/animação). Fonte da verdade do FORMATO = `core/project.ts` (`sanitizeSpriteMeta`/
`sanitizeTilesetMeta`, exportados): metadado inválido é DESCARTADO sem derrubar o asset, tetos
próprios por campo (32 animações / 64 sólidos), NÃO conta na cota de `dataUrl` nem vai ao
`assetManifest` do preview (é só de editor). O metadado viaja Pinta→ponte (`PintaExportedAsset.sprite/
tileset`)→`PersonalAsset`→`ProjectAsset` (`addAsset`/`NewAssetInput` + `AssetsPanel.addFromPersonal`),
todos reusando os sanitizers do `#core`. **Bloco "Animar sprite" (`sz_g2d_animate_sprite`)** ganhou o
campo **`ANIM` (`field_animation_picker`)**: lista as animações da folha pelo NOME (resolve SHEET→bloco
"Carregar folha"→IMAGE→`asset.sprite.animations`) e, ao escolher, PREENCHE os soquetes FROM/TO/FPS (só
shadow `sz_val_number`). ⚠️ É campo de EXIBIÇÃO **não-serializável** — `SERIALIZABLE=false` NÃO basta
(o Blockly 12 serializa campo EDITÁVEL mesmo assim, só avisa); a trava real é `override isSerializable()
→ false`. Assim IR/round-trip/parser/allowlist ficam INTOCADOS (FROM/TO/FPS são a fonte da verdade;
nenhum tipo de bloco novo). **Bloco "Criar mapa de tiles"** trocou o campo `SOLID` p/
**`field_solid_tiles_picker`** (continua string `"0 1 2"` — serialização idêntica a `field_input`; só
grade visual + "Sólidos do Pinta"). O `FieldAssetPicker.applySuggestedSize` também AUTO-PREENCHE FW/FH
(de `sprite`) e TILE (de `tileset`) — garante que os índices batem no runtime. Sem metadado (upload/
projeto antigo) → fallback manual. Ambos os campos registrados em `setup.ts` ANTES dos blocos da
extensão. game-2d bump `0.19.0→0.20.0` (tile picker); o manifest HOJE está em **`0.23.0`** (`src/official-extensions/game-2d/manifest.ts`). Testes: `core/assetMeta.test.ts`, `blockly/fields/__tests__/
FieldAnimationPicker.test.ts` (resolveAnimations/resolveTileset + ANIM não-serializado). **😈 Inimigos (v0.22):** grupos de inimigos por `field_sprite_picker` "inimigo" + comportamentos (perseguir/patrulhar/etc.) em `blocks.ts`. **🎨 Desenho — sprite por código (v0.23):** figura nomeada desenhada em código (`g2d:defineShape` + `paint_*`/Canvas no `runtime.ts`, exemplos em `examples.ts`) vira skin custom do sprite.
**Re-derivação do ANIM (10/07):** como o campo não serializa, o nome exibido é RECALCULADO de
FROM/TO/FPS × `asset.sprite.animations` (`deriveAnimationName`/`refreshAnimationNames` +
`attachAnimationNameWatcher`, espelho do thumb-watcher; registrado no inject do `BlocklyPanel` + no
subscribe de `project.assets` — assets chegam DEPOIS do blocksState). Sem match com lista resolvida e
rótulo apontando um nome DA lista → volta ao placeholder; lista irresolvível → NUNCA mexe. `fillFrames`
passa a escrever também em literal REAL `sz_val_number` (não só shadow) — escolha explícita.

## Reabertura + round-trip: garantias (10/07/2026)

- **Hidratação dos blocos com STATUS** (`blocksHydration` no projectStore: idle/pending/restored/
  empty/failed/discarded, mantido pelo `PersistenceService`). Regra de merge: a partição salva só
  restaura para dentro de canvas VIVO VAZIO (⚠️ o sinal NÃO é `isDirty` — autosave chama `markSaved`
  na janela e a restauração tardia clobraria blocos vivos). **TRANCA anti-perda**: enquanto
  'pending'/'failed', `snapshotForSave` manda autosave/onChange/onSave SEM `blocksState` → o guard do
  `persistProject` pula a partição (reabrir na Ponte não reescreve mais a partição real com o estado
  DERIVADO; timeout 10s destrava a UI e resolução tardia ainda restaura).
- **Sanitizador da partição** une as extensões do META persistido (`loadProjectMetaById`) às do
  chamador — lista defasada não descarta mais um jogo inteiro (tudo-ou-nada continua).
- **BlocksMode tem rede de segurança**: sem IR e sem partição ('empty'/'failed'/'idle'), deriva os
  blocos do CÓDIGO via `parseProjectFiles` SEM sujar (`hydrateProjectState`) — aula só-Blocos nunca
  abre em branco com código existente. Ambos os efeitos de derivação (Blocks/Bridge) esperam o
  'pending'.
- **Paint pós-load**: `schedulePostLoadRepaint` (double-rAF resize+render) + `scrollCenter` quando
  NENHUM top-block intersecta a viewport (layout salvo longe da origem "parecia" canvas vazio) +
  repaint one-shot em `document.fonts.ready` (Blockly media com a fonte de fallback). e2e:
  `e2e/reopen-blocks.spec.ts` (reabrir núcleo/jogo/lista/longe-da-origem SEM alternar de modo).
- **Shadow-ness sobrevive à Ponte**: IR→blocos emite `{shadow}` p/ literais em soquetes com preset
  (fonte: `LEGACY_VALUE_FIELDS`, que também é o mapa de migração — soquete nascido `input_value` pode
  e deve constar; drift `restoreShadowLiterals.test.ts` × `G2D/G3D_SOCKET_SHADOW_TYPES`) e
  `restoreShadowLiterals` CURA estados poluídos no load (via `normalizeBlocksStateToFrames`). Sem
  isso, `fillFrames`/`applySuggestedSize` (só escrevem em shadow) morriam após 1 passada pela Ponte.
- **Parser mais fiel (jogo de classes 100% núcleo)**: composta em alvo membro/this/indexado expande
  p/ `setThisProp`/`memberSet`/`indexSet` + conta (gate de PUREZA — objeto impuro segue raw); `*=`
  `/=` `%=` e `++/--` idem; `-X` não-literal → `0 - X`; param de listener `e => e.key` normaliza p/
  `event` (pilha `eventParamAliases`; inseguro → listener INTEIRO raw); teclado em `window.…`
  normaliza p/ `document` JÁ NO PARSE (o bloco on_key só emite document — fixpoint byte-estável);
  `hoistAnimationLoops` trata o handler de `load` como OPACO (loop fica dentro; consts do load);
  `canvasClear` resolve o elemento pelo CTX (chave divergente emitia `canvas_2.width` quebrado).
- **Blocos novos do núcleo**: `sz_val_new` ("novo objeto da classe %1", args-mutator, IR `newExpr`;
  `const x = new C()` SEGUE sendo `sz_js_new_var`; Date/Image seguem nos fluxos próprios) e
  `sz_val_array_filter` ("filtrar a lista %1 mantendo cada %2 em que %3" — a lista é SOQUETE, aceita
  `this.enemies`; IR `arrayFilter{array: JSExpr}`). Ambos 'avancado' + allowlists (+extraState items
  p/ o sz_val_new).
- **CSS `url(<asset>)` resolve**: no preview via `rewriteCssAssetUrls` (só nome EXATO do manifest;
  CSS persistido intocado) e no export cada asset vira ARQUIVO BINÁRIO `public/<nome>`
  (`convertToPro` PULA binários — árvore pro é só texto; lá seguem via sz-assets.js).
- **Prova viva**: `spaceInvadersFixture.test.ts` — o Space Invaders do tutorial (classes, pool,
  filter, compostas, listeners no construtor, loop no load) parseia com **0 raw**, fixpoint textual E
  de blocos; o exemplo do núcleo **"Invasores do Espaço (na mão)"** (`examples/core.ts`, com
  `CoreExample.assets` — fundo estrelado PNG ~540 bytes gerado, NÃO o de 60KB do tutorial) tem drift
  guardado contra o parser atual. Mudou o parser? O drift manda re-embutir a IR.

## Vocabulário de classes/DOM — lote "Lobstermorph V9" (10/07/2026)

Segundo jogo do Franks Laboratory (com HERANÇA e spritesheets) buildável 100% no núcleo. 6 lacunas
fechadas, **todas em JS** (HTML e CSS já round-tripavam — `<img src id>` vira `sz_html_image`, que
GANHOU campo `ID` visível + `img` em `ID_FIELD_TAGS`; `alt`/`id` vazios NÃO viram atributo, round-trip
fiel). Prova: `lobstermorphFixture.test.ts` (0 raw, fixpoint textual + de blocos). ⚠️ NÃO tem exemplo
embutido: os PNGs do jogo somam ~7,6MB (boss8 = 4MB), muito acima da cota de assets.
- **`super(...)`** → bloco `sz_js_super_ctor` ("chamar o construtor da classe-mãe", args-mutator);
  **`super.metodo(...)`** → `sz_js_super_method`. IR `superCall{args}`/`superMethodCall{method,args}`;
  parser casa `callee.type==='Super'` em `mapExpressionStatement` (ANTES de tryMatchMethodCall). Ambos
  'avancado' + allowlist + `isSupportedItemsExtraState`. Entram sozinhos na categoria Classes
  (staticEntries varre OOP_BLOCKS não-ocultos).
- **`document.getElementById('id')` como VALOR** → bloco `sz_val_get_element` ("o elemento com id %1",
  'intermediario', DOM). IR `getElement{id}`; `matchGetElementById` fiado no `toExpr` (CallExpression,
  ANTES dos outros); `isSimpleValue`=true. Usado p/ pegar `<img>` e desenhar com `drawImage` de 9 args
  (que já round-tripa GENÉRICO — `context` é PARÂMETRO, não ctxVar, então cai em `memberCall`).
- **`requestAnimationFrame(nome)` SOLTO** (laço à mão com timestamp+delta que a fusão do anim_loop não
  pega) → bloco `sz_canvas_request_frame` ("pedir o próximo quadro chamando %1", 'intermediario'). IR
  `requestFrame{fn}`; parser casa ANTES do denylist global (o RAF está no `GLOBAL_CALL_DENYLIST`).
- **`cond ? a=1 : b=2;`** (ternário como STATEMENT) → normaliza p/ `if/senão` (só parser, reusa o nó
  `if`; cada ramo é remapeado como statement). Normalização didática aceita.
- **`this.game.gameOver;`** (statement que só lê um valor e descarta — no-op, bug do autor) → nó
  `exprStatement{value}` + bloco **OCULTO** `sz_js_expr_statement` ("avaliar %1", `hidden:true` — some
  da paleta, só existe p/ o round-trip fiel; a criança não precisa dele). Fallback ÚLTIMO no
  `mapExpressionStatement`, só p/ nós de expressão pura (membro/identificador/this).

## Achatar multi-arquivo — lote "Starter Kit P6" (10/07/2026)

Terceiro jogo do Franks Laboratory (o "JS Game Starter Kit P6") buildável 100% no núcleo. É um projeto
MULTI-ARQUIVO com ES modules (6 `.js` em core/entities/managers/systems) — o editor de BLOCOS trabalha
sobre UM `script.js`, então o contrato é sobre o jogo ACHATADO (classes concatenadas, sem import/export;
comportamento idêntico). 5 lacunas de JS fechadas + normalizações de CSS. Prova:
`starterKitFixture.test.ts` (0 raw, fixpoint textual + de blocos). ⚠️ SEM exemplo embutido (como o V9): o
`player.png` carrega via `new Image()` + caminho relativo cru que NÃO resolve no modelo de asset do
preview (o jogo tem fallback de retângulo, seria vitrine fraca) — o fixture é a prova.
- **Template literal como argumento** (`` `Image loaded: ${name}` ``) → o console.log agora aceita
  QUALQUER valor simples (`isSimpleValue`), não só string/número/variável: bloco
  `sz_js_console_log_value` ("Mostrar no console %1", soquete VALUE). 'iniciante'.
- **Optional chaining de LEITURA** (`obj?.prop`) → bloco `sz_val_member_get_optional` ("propriedade %1
  de %2 (se existir)"). IR `memberGet{optional:true}`; parser casa `OptionalMemberExpression`; gerador
  emite `?.`. 'avancado'.
- **`img.onerror`** (espelho do `img.onload`) → bloco `sz_js_image_onerror` ("se a imagem %1 falhar…").
  IR `imageOnError{target,body}`. 'intermediario'.
- **`requestAnimationFrame((t) => {…})`** com arrow (0 ou 1 param) → bloco `sz_canvas_request_frame_do`
  ("pedir o próximo quadro, com o tempo em %1…"). IR `requestFrameDo{param?,body}`. (Complementa o
  `sz_canvas_request_frame` do V9, que é p/ RAF com função NOMEADA solta; este é o corpo INLINE.)
  'intermediario'.
- **Eventos `contextmenu`/`blur` na janela** → blocos `sz_js_on_context_menu`/`sz_js_on_blur` (espelho
  de `on_resize`). Kinds no schema + `KNOWN_EVENT_KINDS` + `EVENT_LISTENER_TYPES`/ordem no toolbox.
  'iniciante'.
- **Fix de round-trip `x = x - n`**: o bloco "Somar N" (`sz_js_var_increment`, DELTA negativo p/
  `x -= n` / `x = x - n`) relia SEMPRE como `x = x + -n`; agora, DELTA<0 relê `x = x - |n|` (buildIR) —
  a forma canônica do gerador → round-trip de BLOCOS byte-estável (o textual já era).
- **CSS forward-only reordena**: `justify-content: center`/`align-items: center` viram blocos dedicados
  (flex) que podem REORDENAR as declarações dentro da regra (dedicadas antes) — lossless (mesma
  renderização). O fixture prova a igualdade SEMÂNTICA do CSS (mapa seletor→declarações via `cssDeclMap`),
  não byte-a-byte; JS e HTML seguem byte-exatos. `image-rendering` duplicado (pixelated+crisp-edges)
  colapsa p/ pixelated (IR de CSS é `Record`).

## Subsistema assíncrono + UI — lote "Starter Kit P9" (10/07/2026)

Quarto jogo do Franks Laboratory (evolução do P6, mesma base multi-arquivo achatada) — agora com
carregamento ASSÍNCRONO e um menu de UI clicável. A usuária pediu 100% núcleo (via AskUserQuestion,
"tudo em blocos"). Prova: `starterKitP9Fixture.test.ts` (0 raw, fixpoint textual + de blocos; CSS
comparado por `cssDeclMap`). **SEM exemplo embutido** (como V9/P6). Fechou:
- **Async de verdade** (novo paradigma, nível **avancado**, oculto do kids por padrão): método `async`
  (checkbox `ASYNC` no `sz_js_class_method` — o mutator de params só mexe no `PARAMS_INPUT`, o checkbox
  do `message0` sobrevive); `await <valor>` → `sz_js_await` (IR `awaitStmt`); `new Promise((resolve) =>
  {…})` → `sz_val_new_promise` (IR `newPromise{param,body}` — um VALOR com CORPO de statements: o
  `expr.ts` é a camada de baixo e NÃO compila statements, então `js.ts` INJETA `compileStatements` via
  `_setExprStatementCompiler` + `ExprMapContext.indent`; `resolve()` dentro reusa o `callFunction`
  existente); `Promise.all([…])` → `sz_val_promise_all` (IR `promiseAll{list}`, lista = valor);
  `setTimeout(fn, ms)` com função por NOME → `sz_js_set_timeout_call` (o `sz_js_set_timeout` clássico só
  casa a forma arrow). ⭐ `ParseCtx` ganhou `source` p/ o `matchNewPromise` chamar `bodyOfFn` de dentro
  do `toExpr` (que não tinha source).
- **UI clicável** (nível intermediario): `el.onclick = () => {…}` → **`sz_js_element_onclick`** ("ao
  clicar no elemento", TARGET = valor) — ⚠️ NÃO confundir com o `sz_js_on_click` PRÉ-EXISTENTE (esse é
  `addEventListener('click')`, target por id-string); `document.querySelector[All]('sel')` como VALOR →
  **`sz_val_query_select`** (dropdown todos/primeiro) — destrava o `.forEach` nele; `classList.add/remove`
  já round-tripava (getElement-valor + memberCall genérico).
- **Comentários** (nível: HTML intermediario, CSS intermediario): `<!-- -->` → nó HTMLNode `comment` +
  `sz_html_comment`; `/* */` → CSSEntry `comment` + `sz_css_comment` (parser casa `/^\/\*([\s\S]*)\*\/$/`,
  guarda só o miolo, gerador reconstrói os delimitadores — byte-exato p/ qualquer sequência de
  comentários). Antes viravam rawHTML/rawCSS "avançado".

## Jogo 2D — lote v0.22.0 → v0.23.0 (10/07/2026)

Extensão `official-extensions/game-2d` (manifest `version` 0.23.0). Full review + 4 blocos de família nova.
Doc do aluno em `manifest.docs` (⚠️ teto zod **20.000 chars**, hoje ~19.7k — enxugar seção antiga ao
adicionar) + contexto da IA em `ai.ts`. A allowlist é `EXTENSION_BLOCKLY_BLOCK_TYPES['game-2d']` (tudo-ou-nada).

- **Auditoria genérica** (`__tests__/blockAudit.test.ts`): varre TODOS os `gameTwoDBlocks` e valida def→IR,
  IR→blocos→IR, IR→JS→runtime (todo `SZGame2D.helper(` emitido existe no export) e JS→IR (Ponte). Bloco g2d
  novo é coberto automaticamente — rode-a ao mexer na extensão.
- **Animação por estado + flip automático** (🎬 Animação): `sz_g2d_set_state_anim` (6 estados
  `G2D_ANIM_STATES`) + `sz_g2d_auto_animate`. Runtime: `autoAnimate(s)` resolve o estado por prioridade
  (dano>ar>andando>vertical>parado) com **guarda de transição** (`s._animState`, senão `setAnimation` reseta
  `start` e congela) + flip por sinal de vx. `platformer`/`jumpOnGround`/`collideTileMap` passaram a
  PERSISTIR `s.onGround`; `changeHealth(<0)` seta `s.hurtFrames`. `FieldAnimationPicker` reusado (Set
  `ANIM_PICKER_TYPES`). Parser valida o estado contra o enum → rawJS se desconhecido (dropdown coage valor).
- **Tipos de inimigo** (😈 Inimigos): 10 blocos (`define_enemy_type`/`spawn_enemy`/`update_enemy_type`/
  `draw_enemy_type`/`on_enemy_defeated`/`on_enemy_shot_hit`/`hurt_by_enemy`/`enemy_damage`/`enemy_type_param`/
  `enemy_state_anim`). ⭐ o TIPO é um **grupo estendido** `{items, bullets:{items}, config, onDefeat}` → TODOS
  os blocos de grupo funcionam nele (helpers só leem `.items`); kind `enemytype` no FieldNamePicker + em
  `GROUP_DECL_BLOCKS`. 6 comportamentos determinísticos; morte varre `hp<=0`. `_camWrap` só no export de
  `drawEnemyType`; tiros NÃO usam updateGroup (gravidade entortaria).
- **Tilemap fim-a-fim**: contrato `ProjectAsset.tilemap` (auto-contido: grid+solid+folha embutida,
  `core/project.ts`); 3 caminhos → (1) `sz_g2d_create_tilemap_from_asset` (1-clique de um desenho de MAPA do
  Pinta/upload; runtime lê `ASSET_META`), (2) `field_tile_grid` (editor visual de grade no bloco clássico —
  valor continua a MESMA string), (3) upload cru fatiado (`components/assets/tileSlicer.ts` + ação no
  AssetsPanel → grava `asset.tileset`/`asset.tilemap`). Meta viaja na ponte de preview via
  `__SZGAME_ASSET_META` (`assetsBridge`, 5 call sites).
- **Sprite desenhado por código (figura)** (🎨 Desenho, v0.23.0): `defineShape('nome', fn(ctx))` guarda um
  desenho; `createShapeSprite`/`setShape` põem `skin={kind:'custom',shape}`; `drawCustomShape` translada o ctx
  pro canto e roda a fn em coords LOCAIS (ganha giro/flip/piscar do wrapper de graça). Dois caminhos: `paint_*`
  (rect/circle/ellipse/triangle/line — **ctxVar FIXO 'ctx' no buildIR**, sem campo visível) E os blocos de
  Canvas do núcleo dentro da figura. `shape_w/h` = tamanho do sprite atual. ⭐ **gotcha central**: o parser de
  `defineShape` registra o parâmetro `ctx` em `ctx.ctxVars` (hoje só `canvasSetup` populava) — SEM isso os
  blocos de Canvas dentro da figura viram rawJS. Kind `shape` no FieldNamePicker. Exemplo `codeDrawnExample`.
- **Colisão sólida sem tilemap**: `sz_g2d_collide_group` (📦 Muitos) → runtime `collideGroup(sprite, group)` =
  espelho do `collideTileMap` contra o retângulo de cada `group.items` (empurra pelo menor eixo, compara
  CENTROS, zera vx/vy, seta onGround no pouso → parede+chão+deslizar). Casa com a figura: pedra=figura→sprite→
  grupo→collideGroup. Ainda NÃO há colisão sólida contra um sprite ÚNICO (só grupo).
- **Nível dos blocos** (`blockLevels.ts`): kits/inimigos/figura = iniciante (facilitadores); getters
  (`enemy_damage`, `shape_w/h`) e `enemy_type_param` = intermediário. Só o `spawn_bullet` fica em Muitos (é
  projétil genérico, não do Kit espaço — decisão da usuária).

## Comandos

- `bun run dev` — playground Vite (porta 5173; rota `/dual` = 2 instâncias lado a lado)
- `bun run typecheck` / `bun run test` / `bun run check`
- `bun run e2e` — Playwright contra o playground (manual)

## Vitrine de kits + micro-celebração (07/2026)

- **`KitGallery`** (`src/projects/KitGallery.tsx`, interno): vitrine "Que jogo você quer criar?"
  na `ProjectList` — cards dos EXEMPLOS das extensões oficiais (+ clássicos) que criam um projeto
  NOVO já com o jogo em blocos (`createEmptyProject` + IR do exemplo + `buildWorkspaceStateFromIR`
  + `generateProjectFiles` + `persistProject` — SEM tocar o projectStore; o StudioCore re-registra
  os blocos da extensão no load) e o abrem via `onOpenProject`. Lista VAZIA = a vitrine É o
  onboarding (com "Quero começar do zero"); lista cheia = botão "Ver os jogos prontos" colapsável.
  Emojis decorativos por nome de exemplo (`KIT_EMOJI`, fallback 🎮); i18n `kits.*`.
- **ActivityPanel**: micro-celebração ao passar TODAS as checagens — banner `<output>` verde com
  pop finito (`.sz-activity-pop` no studio.css; `prefers-reduced-motion` desliga a animação).

## Backlog

- `<ProjectList>` adapter-based (hoje acoplada ao IndexedDB local).
- Dicionário `en` real (prop `locale` já existe; EN cai em pt-BR).
- `baseUrl` da IA (OpenRouterProvider não suporta).
- CSS pré-compilado como alternativa ao `@source` dos consumers.
- `autoSaveId` do PanelGroup é global ao origin (layout compartilhado entre instâncias/hosts no mesmo domínio).
- Campo `fontSize` (UI) ainda existe no settingsStore mas sem UI (o controle mutava o `<html>` do host e foi removido).

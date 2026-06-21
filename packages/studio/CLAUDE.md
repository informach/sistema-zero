# @sistemazero/studio

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em qualquer lib/framework, e use Octocode para pesquisa/exploração de código no GitHub.

IDE educacional embarcável (Sistema Zero Studio) — biblioteca INTERNA do monorepo, consumida como TS source (modelo do `@sistemazero/ui`). Migrada do repo standalone `sistema-zero-studio` em 2026-06-10; os 11 sub-packages `@sz/*` viraram pastas de `src/` referenciadas por subpath imports `#core`, `#ir`, `#blockly`, `#monaco`, `#parsers`, `#generators`, `#preview`, `#extensions`, `#official-extensions`, `#ai`, `#ui` (ver `imports` no package.json).

## O que é

Editor com 3 modos — Blocos (Blockly), Código (Monaco) e Ponte (sync bidirecional blocos⇄código via worker de reverse-parse) — + preview sandbox, console, terminal (WebContainer), painel de IA (OpenRouter) e extensões.

**API pública** (`src/index.ts` — TUDO fora dela é interno): DOIS componentes finos sobre um **núcleo comum** (`StudioCore`, interno) — `<StudioEditor>` (editor COMPLETO independente; sem conceito de aula) e `<StudioLesson>` (bloco de AULA configurável: curadoria de aprendizado `level`/`allowBlocks`/`allowCategories`/`allowLevelReveal` + defaults restritos terminal/IA/profissional/export/download OFF + prop `activity` fiada p/ a auto-correção). Ambos uncontrolled (`initialProject` + `onChange`/`onSave`/`onError`; `persistence: 'local'|'none'|adapter`; `allowedModes`/`initialMode`; `theme`/`locale`; `limits`; **`share?: StudioShareAdapter`** (liga o botão Compartilhar); `ref` → `StudioHandle`). `<Studio>` (+ `StudioProps`) **@deprecated** = alias do `StudioCore` (compat; migrar p/ Editor/Lesson). Também: `<ProjectList>` (IndexedDB local), `createLocalPersistenceAdapter`, `createEmptyProject`, `prefetchStudioModes`, os tipos `LessonActivity`/`ActivityCheck`, **`captureCoverFromProject(project)`** (capa PNG da vitrine "Mural dos Criadores" — `src/cover/coverCapture.ts`: roda o projeto num iframe OCULTO via `buildPreviewDoc` + harness que lê o MAIOR `<canvas>` com `toDataURL` e posta ao parent autenticado por `ev.source`; SÓ jogos canvas — projeto web/canvas tainted/timeout → `null`, o chamador cai na capa padrão; mesmos invariantes do `runSandboxChecks`, NUNCA `allow-same-origin`/`targetOrigin` no postMessage; happy-dom não roda o iframe → verificar em BROWSER real), **`<StudioProjectPlayer project>`** +
**`renderProjectToPreviewDoc(project)`** (player AUTÔNOMO do jogo — só roda o jogo num iframe sandbox,
autostart, SEM editor — para a página PÚBLICA de jogar do community-kids; subpath LEVE
**`@sistemazero/studio/player`** = só a cadeia de preview, sem Monaco/Blockly), o adapter
**`StudioShareAdapter`** (botão "Compartilhar" — ver seção própria), e o CSS
`@sistemazero/studio/styles.css`. **Como consumir: ver `docs/embedding.md`** (transpilePackages, `@source`, ssr:false, headers do terminal).

**Núcleo + dois componentes** (`src/studio/`): `StudioCore.tsx` é o motor (provider de stores POR INSTÂNCIA + corpo: resolução de config, memoização de chave primitiva `allowedModesKey`/`resolvedModesKey`, sanitize/hydrate, `StudioHandle`, locale latch). A resolução de config (`resolveStudioConfig`/`resolveLearning`/`resolvePreviewSecurity`) fica AQUI; os wrappers só passam props cruas + defaults — duplicar a resolução re-hidrataria por cima das edições do aluno (guardado em `Studio.test.tsx`, que segue testando o `StudioCore` pelo alias). A **atividade com auto-correção** (fase 2) entra por contexto próprio (`src/studio/activity.ts`: tipos `LessonActivity`/`ActivityCheck` — união `structure`/`behavior`/`testcase`/`code` — + `StudioActivityProvider`/`useStudioActivity`, default `null`); o `ActivityPanel` é self-gating → `<StudioEditor>` nunca provê o contexto, então o editor puro não paga pela feature de aula. É **responsivo e montado nos DOIS layouts** (6º review): coluna lateral `w-80` no wide, faixa de topo `w-full max-h-[45%]` no narrow — sem isso o aluno em tela estreita (kids no celular) ficava sem "Verificar" e o gate reprovava em silêncio. O enunciado é markdown (autorado no admin/TipTap) renderizado por `renderLessonMarkdown` (`components/layout/lessonMarkdown.ts`, puro, escape-FIRST + subconjunto seguro). **Runner** (`src/activity/`): `structure.ts` (anda o IR, PURO — espelhado no members p/ recálculo server-side, mesmas fixtures), `harness.ts` (STRING pura injetada no sandbox: roda behavior/testcase/code no `load` e posta `checkResult`), `sandbox.ts` (iframe OCULTO via `buildPreviewDoc`, autentica por `ev.source`), `grade.ts` (nota ponderada), `useActivityRunner` (botão "Verificar" → `checksStore` por instância; `StudioCore` zera o `lastResult` no hydrate/unload p/ não vazar nota entre projetos). `StudioHandle.getActivityResult()` expõe o último resultado p/ o host anexar no envio (correção híbrida). Canal `checkResult` em `src/preview/types.ts`. Só CLÁSSICO (pro/WebContainer fora). ⚠️ **A CSP do preview NÃO libera `'unsafe-eval'`** (só `'unsafe-inline'`): por isso o harness roda o `code` do professor e LÊ globais (`readGlobal`) via `<script>` INLINE injetado (`createElement('script')`+`textContent`) — NUNCA `eval`/`new Function` (bloqueados pela CSP) — e isso também alcança as globais LÉXICAS (`let`/`const` de topo, que NÃO viram `window[...]`). Mexeu no harness? Re-verifique num BROWSER real (o `bun test` não enforça CSP). ⚠️ As definições da atividade VÃO ao aluno (feedback instantâneo) — anti-cola do gate é o `structure` recalculado no servidor.

**Arquitetura de estado**: stores Zustand POR INSTÂNCIA (factories + `StudioStoresContext`); os hooks `useXStore(selector)` caem na store DEFAULT de módulo fora de um `<Studio>` (lista/testes), e as estáticas `useXStore.getState/setState` operam SEMPRE na default (contrato dos testes). `settingsStore` é singleton de propósito (preferência do usuário). Persistência = `PersistenceService` por instância (`src/persistence/service.ts`): qualquer adapter ganha autosave debounced + flush (pagehide/unmount/Salvar); `onChange` SEMPRE no debounce, inclusive com 'none'.

**Paleta**: tokens `--color-sz-*` em `src/styles/studio.css` espelham a paleta oficial do sistema-zero (referência comunidade-sistema-zero) em oklch, dark E light, com identidade dual (accent = brand-lime no dark, cyan no light). Blockly tem temas `sz-dark`/`sz-light` em HEX equivalentes (`src/blockly/theme.ts` — manter em SINCRONIA com o CSS); Monaco segue o tema da instância. Toggle sol/lua na Topbar (some quando o host fixa `theme`). Logo oficial: `BrandLogo` (`src/ui-internal/BrandLogo.tsx`) = só o SÍMBOLO (160×160), para a Topbar compacta; `BrandWordmark` (`src/ui-internal/BrandWordmark.tsx`) = logo COMPLETO (símbolo + wordmark "Sistema Zero" do logoszs.svg, viewBox 1500×160), usado no header da ProjectList. O wordmark usa `fill="currentColor"` para recolorir conforme o tema (branco no escuro, escuro no claro); o símbolo mantém o gradiente lime→cyan e a moldura branca. Gradientes com id via `useId()` (multi-instância). Ambos extraídos do logoszs.svg oficial.

## Modos: básico × profissional (regra D2)

`src/core/modes.ts`: `modesForKind(kind)` decide a barra de modos pelo TIPO de projeto — **básico**
(`kind` ausente/`'classic'`) = **Blocos + Ponte** (editam só os 3 arquivos canônicos via UI);
**profissional** (`kind: 'pro'`) = **Código** (Monaco sobre a ÁRVORE Vite inteira). `normalizeClassicMode`
migra o legado `'code'` (quando o básico tinha Código standalone, pré-D2) para `'bridge'`. A Topbar
interseca `modesForKind(kind)` com o `allowedModes` do host. O preview profissional
(`src/modes/pro/ProPreview.tsx`) NÃO é srcdoc: aponta para o **dev-server do Vite rodando DENTRO do
WebContainer** (mount → `npm install` → `npm run dev` → `server-ready` → iframe; exceções cross-origin
chegam por `preview-message` ao Console). O sync host→container é um `FsDiff` (`src/modes/pro/fsDiff.ts`
+ `useWebContainerSync.ts`): diff puro entre dois snapshots planos que calcula writes/removes/**mkdirs/
rmdirs** e o **conflito arquivo↔diretório** (`removeFirstPaths`, removido RECURSIVAMENTE ANTES de
mkdir/write — senão a colisão trava o sync). Ordem fixa: removeFirst → mkdir → write → remove → rmdir.

## Layout responsivo (wide × narrow)

O Studio é embarcado em LARGURA VARIÁVEL (community/kids/member-shell), então a medida que decide o
layout é a largura do PRÓPRIO root, via `ResizeObserver` (`src/studio/layoutContext.tsx` →
`useStudioWidth`/`useStudioLayout`), NÃO o viewport. Limiares em `src/components/layout/layoutBreakpoints.ts`:
`STUDIO_NARROW_MAX_PX` (768) e `STUDIO_COMPACT_MAX_PX` (440).

- **wide** (≥768): split vertical `[ModeArea] / [BottomPanel]`; cada modo desenha seu split horizontal
  `[editores | preview]` (BlocksMode/BridgeMode/CodeMode/ProCodeMode).
- **narrow** (<768): o `Shell` troca para o `NarrowLayout`; cada modo, lendo `useStudioLayout().isNarrow`,
  renderiza um `NarrowPanels` (`src/components/layout/NarrowPanels.tsx`) — UMA tira de abas plana:
  editores do modo (Blocos/Código) → Pré-visualização → Console/Terminal/IA. O explorador de arquivos
  (modos Código) vira GAVETA sobreposta (botão "Arquivos"). O `TabStrip` mantém TODOS os painéis montados
  (só alterna `hidden`), igual ao wide — preserva xterm/Monaco/Blockly/iframe ao trocar de aba.
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

## Compartilhar (publicar no Mural dos Criadores)

Botão **"Compartilhar"** na Topbar (solto, ao lado do ⋯) que publica o projeto no **Mural dos
Criadores** + gera um **link PÚBLICO de jogar**. **Opt-in**: só aparece quando o host passa um
`share?: StudioShareAdapter` (prop em `StudioCommonProps` → vale p/ `<StudioEditor>` E `<StudioLesson>`).
A capacidade é GENÉRICA de propósito — serve ao estúdio de AULA hoje e ao estúdio-produto standalone
no futuro, sem retrabalho.

- **Adapter** (`src/studio/share.ts`, contexto INTERNO latchado como o `activity` — só os TIPOS saem no
  index): `generateDescription({project,title}) → Promise<string>` (rascunho da IA, SERVIDOR — nunca a
  BYOK do aluno) e `publish({project,coverDataUrl,title,description}) → Promise<{muralUrl?,playUrl?}>`.
  Toda a rede/R2/hub/IA-de-servidor vive no HOST (community-kids via member-shell); o Studio só ORQUESTRA
  a UX.
- **Dialog** (`src/components/layout/ShareDialog.tsx`, sobre o `Modal` de `#ui`): máquina de passos
  `confirm → describe → cover → review → publishing → success | error`. Confirma concluído + linguagem
  adequada + **aviso de SNAPSHOT** (o que publica fica congelado no Mural; editar o projeto AQUI depois
  NÃO muda a versão de lá — são cópias separadas; republicar = post NOVO). O print é o
  `captureCoverFromProject` (browser real; `null` = sem foto, publica mesmo assim).
- **Player público** (`src/components/preview/StudioProjectPlayer.tsx` + `src/preview/renderProject.ts`):
  `renderProjectToPreviewDoc(project)` é a MESMA receita do `coverCapture`/`PreviewIframe` (extensões →
  permissões → assets → `buildPreviewDoc`), extraída, pura e defensiva para snapshots legados
  (sem `files` ou com `installedExtensions`/`extraFiles`/`assets` ausentes/não-array). O componente renderiza o srcdoc num iframe
  `sandbox="allow-scripts allow-modals"` (NUNCA `allow-same-origin`), autostart. Exportado no index E no
  subpath leve `@sistemazero/studio/player` (sem Monaco/Blockly — importante p/ a página pública não
  carregar o editor inteiro).
- **No playground** (`bun run dev`): o `EditorScreen` passa um `share` de DEMONSTRAÇÃO (IA/publish
  mockados; print real) só p/ ver/testar o fluxo — o botão não existe sem `share`.

## Regras não-negociáveis

1. **Workers cross-bundler**: todo worker nasce de `new Worker(new URL('./caminho-relativo.ts', import.meta.url), { type: 'module' })` com URL **literal inline** — nada de `?worker` (Vite-only), nada de bare specifier dentro de `new URL()` (Vite não resolve), nada de variável/helper no 1º argumento (quebra a análise estática de Vite/Turbopack/webpack). Os workers do Monaco usam os wrappers em `src/monaco/workers/`. Plano B se um bundler de host falhar: extrair a criação p/ factory injetável via prop.
2. **`loader.config({ monaco })` em `src/monaco/workers.ts` é intocável**: sem ele o `@monaco-editor/react` injeta o loader AMD, que colide com o UMD do Blockly ("Can only have one anonymous define").
3. **CSS**: `src/styles/studio.css` é o CSS exportado — SEM `@import "tailwindcss"`, SEM `@source`, SEM `@custom-variant dark` (sobrescreveria a variant dos apps) e SEM regras globais de app (html/body/scrollbar — vivem no `playground/styles.css`). Tema escopado por `[data-sz-theme]` no root do componente, NUNCA no `<html>` do host. Conteúdo PORTALADO p/ document.body precisa de `<StudioThemeScope>` (ver Modal/ProjectCard).
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

## Blocos: categorias + como adicionar um

**Categorias** (montadas em `src/blockly/toolbox.ts buildCoreToolbox`; cores em `theme.ts CATEGORY_COLORS`):
**HTML** (`blocks/html.ts`), **🖋️ SVG** (`blocks/svg.ts` — categoria PRÓPRIA: subgrupos Estrutura/Formas/Texto + **🎨 Aparência** = o CSS específico de SVG `fill`/`stroke`/`stroke-width`/`stroke-dasharray`/`stroke-linecap`/`text-anchor`, que CONECTAM na coluna de CSS), **CSS** (`blocks/css.ts`), **Canvas** (`blocks/canvas.ts` — inclui o `sz_html_canvas` "criar tela de desenho", movido do HTML), **Avançado** (`blocks/advanced.ts` — rawHTML/CSS/JS) e o guarda-chuva **Programação** que junta JS (`blocks/js.ts` via `JS_GROUPS`), **🌐 Página** + **⚡ Eventos** (`blocks/dom.ts`; `EVENT_LISTENER_TYPES`/`EVENTOS_TYPE_ORDER` no toolbox movem os "Quando…" p/ Eventos), 🔢 Matemática (`math.ts`), 🔣 Valores (`values.ts`), Funções/Classes/Objetos. Cada arquivo exporta `X_BLOCKS` (+ às vezes `X_GROUPS`) e é somado em `blocks/index.ts CORE_BLOCKS`. Texto de bloco 100% PT didático ([[studio-blocos-portugues]]).

**Adicionar um bloco = ~8 pontos (round-trip blocos⇄código)** — pular um quebra silenciosamente:
1. `ir/schema.ts` — variante na união TS (`JSStatement`/`JSExpr`/`HTMLNode`/`CSSEntry`) **E** no `z.discriminatedUnion` (senão a validação rejeita o IR salvo/importado).
2. `blocks/<cat>.ts` — `BlockDefinition` + entrada num `*_GROUPS` (senão cai em "Mais").
3. `blockly/buildIR.ts` — case bloco→IR (`f()` campos, `exprInput()` valores, `getStatementChildren()` corpos).
4. `generators/{js,expr,html,css}.ts` — IR→código (+ `collectStatementIdentifiers`/`collectExprIdentifiers` p/ variáveis novas, senão o gerador renomeia errado).
5. `parsers/{js,html,css}.ts` — código→IR (Ponte). Expr usável em `se`/valor precisa entrar em `isSimpleValue` (senão vira rawJS).
6. `blockly/workspaceState.ts` — IR→bloco (`statementToBlock`/`exprToValueBlock`/`htmlNodeToBlock`; **5º arg do `block()` = inputs de VALOR**).
7. `state/projectStore.ts` — type em `CORE_BLOCKLY_BLOCK_TYPES` (drift `blockAllowlist.test.ts`; faltar = `sanitizeImportedBlocksState` zera TODOS os blocos).
8. teste de round-trip + `bun run typecheck/test/check`.

**Padrões já usados** (clone-os):
- **Forward-only** (atalho que não precisa voltar a si na Ponte): os blocos dedicados de CSS (fill/stroke/transform/perspective/grid/var…) e o `sz_js_set_style_text` (cssText) produzem IR GENÉRICA (`CSSRule`/`setStyle`); a Ponte reversa devolve a "Regra"/bloco genérico. Só precisam de block+buildIR+allowlist (IR reusada).
- **Container + filho (sem mutator)** p/ N itens: `sz_css_keyframes_steps`+`sz_css_keyframe_step` (animação multi-passo) e `sz_js_switch`+`sz_js_case` espelham `sz_css_rule`+`sz_css_decl` — um helper junta os filhos no buildIR (`getKeyframeSteps`/`getSwitchCases`); round-trip pelo container.
- **Elementos SVG** = `{type:'element', tag, attrs, children}` no MESMO IR do HTML: o gerador emite qualquer tag, o parser `collectAllAttrs` captura todo atributo; em `workspaceState`, `FIELD_ATTRS`/`ID_FIELD_TAGS` dizem quais atributos viram CAMPO de bloco (o resto round-trippa via `data`). Tags SVG vivem em `HTMLTagSchema` + `SUPPORTED_TAGS`/`CONTAINER_TAGS` (parser).
- **SVG dinâmico**: `createElementNS` (o namespace svg é OBRIGATÓRIO p/ a forma renderizar — `createElement` comum não serve) + `getAttribute`; `setAttribute`/`appendChild`/loop de quadro (`sz_canvas_anim_loop` = requestAnimationFrame no núcleo) já existem.
- **`agora: …`** (`sz_val_date_part` → `new Date().getHours()…`, numérico, p/ relógios); `getFullYear` continua sendo o `now` string (NÃO vira `dateGet`).
- **Tela cheia** (`sz_js_request/exit/toggle_fullscreen` + `sz_val_is_fullscreen` + evento `fullscreenchange`): ⚠️ exige `allow="fullscreen"` no iframe (`components/preview/PreviewIframe.tsx` + `StudioProjectPlayer.tsx`), senão `requestFullscreen()` rejeita em silêncio.
- O CSS criativo (variáveis `--x`/`var()`, grid, 3D `rotateX`/`perspective`, pseudo `:hover`/`::before`) JÁ funciona pela "Regra CSS" + "propriedade: valor" genéricas (o parser preserva seletor/propriedade/valor livres); os blocos dedicados são só atalho de UX.

## Comandos

- `bun run dev` — playground Vite (porta 5173; rota `/dual` = 2 instâncias lado a lado)
- `bun run typecheck` / `bun run test` / `bun run check`
- `bun run e2e` — Playwright contra o playground (manual)

## Backlog

- `<ProjectList>` adapter-based (hoje acoplada ao IndexedDB local).
- Dicionário `en` real (prop `locale` já existe; EN cai em pt-BR).
- `baseUrl` da IA (OpenRouterProvider não suporta).
- CSS pré-compilado como alternativa ao `@source` dos consumers.
- `autoSaveId` do PanelGroup é global ao origin (layout compartilhado entre instâncias/hosts no mesmo domínio).
- Campo `fontSize` (UI) ainda existe no settingsStore mas sem UI (o controle mutava o `<html>` do host e foi removido).

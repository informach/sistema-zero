# @sistemazero/studio

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em qualquer lib/framework, e use Octocode para pesquisa/exploração de código no GitHub.

IDE educacional embarcável (Sistema Zero Studio) — biblioteca INTERNA do monorepo, consumida como TS source (modelo do `@sistemazero/ui`). Migrada do repo standalone `sistema-zero-studio` em 2026-06-10; os 11 sub-packages `@sz/*` viraram pastas de `src/` referenciadas por subpath imports `#core`, `#ir`, `#blockly`, `#monaco`, `#parsers`, `#generators`, `#preview`, `#extensions`, `#official-extensions`, `#ai`, `#ui` (ver `imports` no package.json).

## O que é

Editor com 3 modos — Blocos (Blockly), Código (Monaco) e Ponte (sync bidirecional blocos⇄código via worker de reverse-parse) — + preview sandbox, console, terminal (WebContainer), painel de IA (OpenRouter) e extensões.

**Tarefas do Pensa:** `StudioEditorProps` aceita `taskSession?: StudioTaskSession`, independente
de `LessonActivity`. O `TaskGuidePanel` mostra passos, dicas, blocos oficiais e critérios e envia
progresso pelo callback do host. O host de `/estudio?tarefa=<id>` cria ou restaura o projeto
associado e mantém o guia após reload; o Studio não persiste vínculo ou backup no Pensa. Veja
[`../../docs/pensa-planner.md`](../../docs/pensa-planner.md).

**API pública** (`src/index.ts` — TUDO fora dela é interno; Fase 5 somou
**`importProjectSnapshot(raw, {name?})`** — `src/projects/importSnapshot.ts`, importa um snapshot
jogável/`.szproject.json` como projeto NOVO no namespace atual via `importProjectFromJSON` do
projectStore, com `name` opcional sobrepondo o do snapshot — é o "Fazer a minha versão"/remix do
Mural kids; o host chama `setStudioStorageNamespace(viewerId)` ANTES): DOIS componentes finos sobre um **núcleo comum** (`StudioCore`, interno) — `<StudioEditor>` (editor COMPLETO independente; sem conceito de aula/atividade; desde 07/2026 TAMBÉM aceita as props de curadoria `StudioLearningProps` — o kids abre o `/estudio` com o degrau derivado do RANK via `resolveStudioTier` do member-shell; `level` aceita a escada NOVA de 6 (`iniciante-2d`…`avancado-3d`) E os 3 valores legados (normalizados na fronteira `resolveLearning`); sem `level` segue o default `avancado-3d` [topo], zero regressão) e `<StudioLesson>` (bloco de AULA configurável: curadoria de aprendizado `level`/`allowBlocks`/`allowCategories`/`allowLevelReveal` + defaults restritos terminal/IA/profissional/export/download OFF + prop `activity` fiada p/ a auto-correção). Ambos uncontrolled (`initialProject` + `onChange`/`onSave`/`onError`; `persistence: 'local'|'none'|adapter`; `allowedModes`/`initialMode`; `theme`/`locale`; `limits`; **`share?: StudioShareAdapter`** (liga o botão Compartilhar); `ref` → `StudioHandle`). `<Studio>` (+ `StudioProps`) **@deprecated** = alias do `StudioCore` (compat; migrar p/ Editor/Lesson). Também: `<ProjectList>` (IndexedDB local; aceita `theme?` p/ o host FIXAR claro/escuro e esconder o toggle — espelha o `theme` do Editor/Lesson), `createLocalPersistenceAdapter`, **`setStudioStorageNamespace(ns)`** (namespeia o IndexedDB local por VIEWER — app-agnóstico: o host seta o id do perfil (kids) OU da conta (adulto) ANTES de usar a `ProjectList`/editor; vazio = store histórico `sistema-zero-studio`; é o que isola a lista do Estúdio Completo entre perfis/contas no mesmo navegador — a lição reseta p/ `''`), `createEmptyProject`, `prefetchStudioModes`, os tipos `LessonActivity`/`ActivityCheck`, **`captureCoverFromProject(project)`** (capa PNG da vitrine "Mural dos Criadores" — `src/cover/coverCapture.ts`: roda o projeto num iframe via `buildPreviewDoc` + harness que fotografa e posta ao parent autenticado por `ev.source`. **DUAS passadas:** (1) **canvas** — lê o MAIOR `<canvas>` com `toDataURL` (jogos 2D/3D), pipeline atual; (2) só se a 1ª voltar `null`, **DOM via html2canvas** carregado do esm.sh DENTRO do iframe (`extensionImports.html2canvas` → importmap + origem no `script-src`, igual ao `three` do Jogo 3D) rasterizando o `document.body` — cobre páginas HTML/CSS sem canvas. ⚠️ o iframe NÃO usa mais `visibility:hidden`/off-screen (parava o rAF → "sem foto" nos jogos): fica na viewport com `opacity:0`. Canvas tainted/timeout/falha do html2canvas → `null`, o chamador cai na capa do admin / upload; mesmos invariantes do `runSandboxChecks`, NUNCA `allow-same-origin`/`targetOrigin` no postMessage; happy-dom não roda o iframe → verificar em BROWSER real), **`<StudioProjectPlayer project>`** +
**`renderProjectToPreviewDocAsync(project)`** (`renderProjectToPreviewDoc` = alias depreciado; player AUTÔNOMO do jogo — só roda o jogo num iframe sandbox,
autostart, SEM editor — para a página PÚBLICA de jogar do community-kids; subpath LEVE
**`@sistemazero/studio/player`** = só a cadeia de preview, sem Monaco/Blockly), o adapter
**`StudioShareAdapter`** (botão "Compartilhar" — ver seção própria), e o CSS
`@sistemazero/studio/styles.css`. **Como consumir: ver `docs/embedding.md`** (transpilePackages, `@source`, ssr:false, headers do terminal).

**i18n por instância:** `StudioI18nProvider` cria um tradutor puro para cada
`StudioCore`; `locale="en"` usa o dicionário inglês real e duas instâncias na
mesma página não disputam singleton. A store recebe o mesmo tradutor na factory.

**Núcleo + dois componentes** (`src/studio/`): `StudioCore.tsx` é o motor (provider de stores POR INSTÂNCIA + corpo: resolução de config, memoização de chave primitiva `allowedModesKey`/`resolvedModesKey`, sanitize/hydrate, `StudioHandle`, locale latch). A resolução de config (`resolveStudioConfig`/`resolveLearning`/`resolvePreviewSecurity`) fica AQUI; os wrappers só passam props cruas + defaults — duplicar a resolução re-hidrataria por cima das edições do aluno (guardado em `Studio.test.tsx`, que segue testando o `StudioCore` pelo alias). A **atividade com auto-correção** (fase 2) entra por contexto próprio (`src/studio/activity.ts`: tipos `LessonActivity`/`ActivityCheck` — união `structure`/`behavior`/`testcase`/`code` — + `StudioActivityProvider`/`useStudioActivity`, default `null`); o `ActivityPanel` é self-gating → `<StudioEditor>` nunca provê o contexto, então o editor puro não paga pela feature de aula. É **responsivo e montado nos DOIS layouts** (6º review): coluna lateral `w-80` no wide, faixa de topo `w-full max-h-[45%]` no narrow — sem isso o aluno em tela estreita (kids no celular) ficava sem "Verificar" e o gate reprovava em silêncio. O enunciado é markdown (autorado no admin/TipTap) renderizado por `renderLessonMarkdown` (`components/layout/lessonMarkdown.ts`, puro, escape-FIRST + subconjunto seguro). **Runner** (`src/activity/`): `structure.ts` (anda o IR, PURO — espelhado no members p/ recálculo server-side, mesmas fixtures), `harness.ts` (STRING pura injetada no sandbox: roda behavior/testcase/code no `load` e posta `checkResult`), `sandbox.ts` (iframe OCULTO via `buildPreviewDoc`, autentica por `ev.source`), `grade.ts` (nota ponderada), `useActivityRunner` (botão "Verificar" → `checksStore` por instância; `StudioCore` zera o `lastResult` no hydrate/unload p/ não vazar nota entre projetos). `StudioHandle.getActivityResult()` expõe o último resultado p/ o host anexar no envio (correção híbrida). Canal `checkResult` em `src/preview/types.ts`. Só CLÁSSICO (pro/WebContainer fora). ⚠️ **A CSP do preview NÃO libera `'unsafe-eval'`** (só `'unsafe-inline'`): por isso o harness roda o `code` do professor e LÊ globais (`readGlobal`) via `<script>` INLINE injetado (`createElement('script')`+`textContent`) — NUNCA `eval`/`new Function` (bloqueados pela CSP) — e isso também alcança as globais LÉXICAS (`let`/`const` de topo, que NÃO viram `window[...]`). Mexeu no harness? Re-verifique num BROWSER real (o `bun test` não enforça CSP). ⚠️ As definições da atividade VÃO ao aluno (feedback instantâneo) — anti-cola do gate é o `structure` recalculado no servidor.

**Arquitetura de estado**: stores Zustand POR INSTÂNCIA (factories + `StudioStoresContext`); os hooks `useXStore(selector)` caem na store DEFAULT de módulo fora de um `<Studio>` (lista/testes), e as estáticas `useXStore.getState/setState` operam SEMPRE na default (contrato dos testes). `settingsStore` é singleton de propósito (preferência do usuário). Persistência = `PersistenceService` por instância (`src/persistence/service.ts`): qualquer adapter ganha autosave debounced + flush (pagehide/unmount/Salvar); `onChange` SEMPRE no debounce, inclusive com 'none'.

**Paleta**: tokens `--color-sz-*` em `src/styles/studio.css` espelham a paleta oficial do sistema-zero (referência comunidade-sistema-zero) em oklch, dark E light, com identidade dual (accent = brand-lime no dark, cyan no light). Blockly tem temas `sz-dark`/`sz-light` em HEX equivalentes (`src/blockly/theme.ts` — manter em SINCRONIA com o CSS); Monaco segue o tema da instância. Toggle sol/lua na Topbar (some quando o host fixa `theme`). **Revamp visual estilo MakeCode (público kids):** o tema PADRÃO virou CLARO/creme (`#fef9ef`; era dark) — flip em `settingsStore` (init + fallback `?? 'light'`), `studio/theme.tsx` (context default) e `theme.ts`; toggle e host que fixa `theme` seguem. **COR = IDENTIDADE DA CATEGORIA em arco-íris** (`CATEGORY_COLORS`): cada categoria de topo tem 1 cor BEM distinta (Pesquisa cinza · HTML azul-escuro · CSS vermelho · SVG verde · Programação laranja · Canvas roxo · Avançado azul-céu · Jogo 2D rosa · Jogo 3D amarelo) e as SUB-categorias são TONS dela via `categoryShades(base, n)` (`blockly/colorShades.ts`, PURO/sem Blockly, viés-ESCURO — o texto do bloco é BRANCO em TODOS via `.blocklyText`, por isso os tons não podem clarear demais). Mudar a cor base RE-DERIVA os tons; cada `blocks/*.ts` e as extensões game-2d/3d aplicam `categoryShades` + um loop `COLOUR_BY_TYPE`. Fonte redonda `Baloo 2`/`Nunito` (`--font-family-sans` + `FONT_STYLE`, sem `@font-face`) na interface do Studio; os iframes e exports das extensões com HUD usam a Baloo 2 local incorporada por `official-extensions/gameUiFont.ts`, com licença em `official-extensions/fonts/`. Toolbox = chips arredondados coloridos (só CSS no `studio.css`, faixa colorida por categoria). ⚠️ renderer custom foi TENTADO e REVERTIDO (dobrar o raio distorcia as "bocas" em C dos blocos com statement-input) — usa `zelos` puro; QA de bloco DEVE incluir blocos com statement-input. Logo oficial: `BrandLogo` (`src/ui-internal/BrandLogo.tsx`) = o SÍMBOLO 160×160 usado na Topbar compacta, extraído do `logoszs.svg` oficial. O símbolo mantém o gradiente lime→cyan e a moldura branca; os ids dos gradientes vêm de `useId()` para preservar a multi-instância.

## Modos: básico × profissional (regra D2)

`src/core/modes.ts`: `modesForKind(kind)` decide a barra de modos pelo TIPO de projeto — **básico**
(`kind` ausente/`'classic'`) = **Blocos + Ponte** (editam só os 3 arquivos canônicos via UI);
**profissional** (`kind: 'pro'`) = **Código** (Monaco sobre a ÁRVORE Vite inteira). `normalizeClassicMode`
migra o legado `'code'` (quando o básico tinha Código standalone, pré-D2) para `'bridge'`. A Topbar
interseca `modesForKind(kind)` com o `allowedModes` do host. O preview profissional escolhe o runtime
em `src/modes/pro/ProPreview.tsx`: sem `proRuntime`, aponta para o **dev-server do Vite dentro do
WebContainer**; com o adapter, `RemoteProPreview` envia o snapshot ao BFF e renderiza o HTML compilado
em iframe sandbox. Aulas e Admin usam o remoto para não exigir COOP/COEP; o Estúdio Completo usa o
local. No caminho local, mount → `npm install` → `npm run dev` → `server-ready` → iframe e exceções
cross-origin chegam por `preview-message` ao Console. Na fase ready há a **barra** (nome do projeto — o `<title>`
vivo não é legível, iframe cross-origin — + "⟳ Atualizar" que REMONTA o iframe via key + "⏻ Reiniciar"
= attempt++, mata o dev e re-roda install morno+dev). O **console.log do app chega ao Console da IDE**
via `proConsoleBridge.ts`: script STRING PURA injetado em toda página pelo `setPreviewScript` do
WebContainer (embrulha console.*, postMessage com targetOrigin do HOST — nunca `'*'`); o preview local
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
- **`src/state/gameStorage.ts`** — o parent persiste o snapshot POR NAMESPACE + PROJETO no IndexedDB
  (`sz:game-storage:<projectId>` na store capturada do viewer), clampado por quota; `writeGameStorage`
  apaga o registro se vazio (best-effort: quota cheia / sem IndexedDB = no-op, nunca quebra o preview).

**`src/state/persistence.ts`** virou **3 partições** por projeto no IndexedDB — `sz:project-meta:<id>` /
`sz:project-files:<id>` / `sz:project-state:<id>` (legado `sz:project:<id>` em doc único). Escritas por
namespace+id são **serializadas FIFO** (`runSerializedProjectWrite(scope, id, task)`) — autosave não intercala com rename
(leitura+escrita não-atômica). **Cerca de exclusão** (`fenceGameStorageDelete`/`isGameStorageDeleted`,
janela de graça ~60s + poda lazy): um flush de game-storage OU um autosave em voo que chegue DEPOIS do
delete é descartado — **não ressuscita registro órfão**. O mesmo mutex cobre projeto e game-storage; o
`settingsStore` agora CEGA a ausência de IndexedDB (modo privado/contexto restrito) — cai p/ defaults em
memória com `loaded:true` em vez de lançar.

## Segurança do preview (defesa em camadas — 4º full review)

Quatro guardas ortogonais ao sandbox do iframe, todas testadas (`src/preview/__tests__/`):
- **`csp.ts`** — CSP interna do srcdoc: libera subrecursos PASSIVOS de `https:` (img/font/media/css/
  frame), mas `script-src` NÃO inclui `https:` genérico. Scripts gerados são autorizados pelo hash
  SHA-256 exato; ESM oficial entra só pela URL declarada e, no `esm.sh`, pelo prefixo do pacote com
  versão pinada (nunca pela origem inteira),
  `connect-src 'none'` por default (sem fetch/XHR/WS a menos que o professor libere origens) e
  `worker-src 'none'`. Trade-off aceito: img/media/font/frame de `https:` = GET passivo de mão única
  (sem resposta legível, sem cookies) — NÃO alterar.
  ⚠️ `script-src` inclui `data:` quando há scripts autorizados: fora do Chromium, hash não casa com
  script EXTERNO, e todo JS do aluno é externalizado em `data:`. Esses recursos NÃO levam
  `integrity`, pois Firefox recusa SRI em URL não elegível. O `scriptSourceGuard` cobre a injeção
  dinâmica que essa liberação tornaria possível.
- **`scriptSourceGuard.ts`** — fecha `HTMLScriptElement.prototype.src` e
  `setAttribute`/`setAttributeNS` contra scripts `data:`/`blob:` criados em runtime; os scripts
  autorizados nascem no parse do srcdoc e não passam pelos setters.
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
- ⭐ **A capa "toda preta" (08/2026) — quatro fatos que só juntos viram o defeito.** Ela relatou um jogo
  de fundo LARANJA cuja capa saía um retângulo preto. Na ordem:
  1. **O fundo do palco é CSS, não pixel.** `game-2d/runtime/stage.ts` faz `c.style.background = cor` (e
     no `document.body`), e o `clear()` de cada quadro usa **`clearRect`** — nunca um `fillRect` de fundo.
     O gk faz igual, por regra CSS injetada (`game-2d-advanced/runtime/shell.ts`).
  2. **`toDataURL` lê só o drawing buffer** → o PNG sai com o desenho sobre TRANSPARENTE, sem o laranja.
  3. **A miniatura do card é JPEG, que não tem alfa** (`thumbCapture.ts`) → transparente vira **PRETO**.
  4. **A passada 1 corta a passada 2** (`if (canvasUrl) return canvasUrl`): bastava a do canvas "dar certo"
     para o html2canvas — o único que enxerga o CSS — nunca rodar.
  ⚠️ **Funcionava por acidente** até 08/2026: o harness só agendava por `requestAnimationFrame`, que não
  dispara em aba de fundo/página saindo; a passada 1 estourava o timeout e caía na 2. Quando o `2b918afb`
  somou um `setTimeout` como rede, a passada 1 passou a "vencer" e a capa preta apareceu.
  **Hoje o harness COMPÕE o fundo dentro do iframe** (único lugar onde a cor existe): copia para um canvas
  2D próprio, DETECTA quadro em branco (todo alfa 0 → `post(null)`, devolvendo a vez ao html2canvas — é o
  que cobre o 3D cujo buffer WebGL já foi descartado, já que nenhuma extensão passa `preserveDrawingBuffer`)
  e pinta a cor em **`destination-over`** (`getComputedStyle(canvas).backgroundColor` → `body` → branco).
  O `thumbCapture` ainda preenche branco antes do `drawImage`, como rede para qualquer print futuro.
  Provado em `cover/__tests__/` (o harness é string de JS puro: avaliado com `new Function` sobre um
  `document` falso, mesmo padrão dos testes de runtime das extensões). **Nunca havia teste nenhum da
  captura** — só do elo card ⇄ miniatura —, e foi por isso que a regressão passou batida.
- ⭐⭐ **A capa do CARD não é mais tirada na saída: ela vem do preview que já está
  rodando (08/2026).** Relato dela: *"não é toda vez que tira o print, e às vezes aparece a tela
  desatualizada… precisei entrar e sair várias vezes, e quando apareceu foi só a cor de fundo, sem o
  texto do placar"*. A causa é estrutural: fotografar AO SAIR exige que o navegador entregue quadros
  exatamente no instante em que a página está sendo desmontada, e ele estrangula o `requestAnimationFrame`
  justamente ali. Nenhum ajuste de espera conserta isso — o caminho depende de um recurso que o navegador
  está retirando. Peças: **`preview/snapshotBridge.ts`** (string pura injetada no iframe, inerte até o
  editor PEDIR; responde por `postMessage` com `targetOrigin`, autenticando `e.source === window.parent`)
  + **`cover/latestSnapshot.ts`** (última foto boa por projeto, em memória de MÓDULO porque o
  `PreviewIframe` que escreve e o `StudioCore` que lê são desmontados em ordens diferentes; prazo de
  validade de 5 min) + o pedido periódico no `PreviewIframe`.
  - ⭐⭐ **A foto sai em DUAS fases, e é isso que a torna barata.** Medido em Chrome real (palco
    800×480 com 40 sprites e texto, 150 amostras): a foto inteira custa **1,7 ms** na mediana, mas o
    `toDataURL` sozinho chegou a **17,5 ms** no pior caso — mais que um quadro inteiro (16,6 ms). Só
    que a parte que PRECISA acontecer dentro do quadro é a cópia do canvas (`drawImage`), e ela custa
    **0,02 ms** — o mesmo que o jogo gasta desenhando um quadro. Então a fase 1 (copiar) fica no
    `requestAnimationFrame` e a fase 2 (codificar em JPEG) sai para `requestIdleCallback`, **com
    `timeout`** — sem ele, uma página que nunca fica ociosa deixaria a foto pendurada e o `emVoo`
    travado. ⚠️ Adiar as DUAS fases devolveria foto preta em jogo 3D: canvas WebGL sem
    `preserveDrawingBuffer` volta vazio se lido fora da janela do quadro.
  - **Orçamento**: primeira foto 2,5 s depois de o preview subir, depois uma a cada 20 s, **pulando
    quando `document.hidden`** (aba escondida não recebe quadros, então ali a foto seria velha) e com
    **um pedido em voo por vez**. O `emVoo` só é liberado no FIM das duas fases — liberar entre elas
    deixaria uma cópia nova sobrescrever a que ainda espera codificação.
  - ⚠️ **`loadedSrcDoc` fica FORA das dependências do efeito de propósito** (o `useExhaustiveDependencies`
    do biome pede isso, e aqui a razão é performance, não lint): o preview recarrega a cada edição, e
    reiniciar o ciclo a cada recarga dispararia uma foto poucos segundos depois de CADA mudança.
  - ⭐ **Quadro EM BRANCO não vira capa.** O caminho antigo já descartava (varredura de alfa) e o
    novo nasceu sem — então um jogo que ainda não desenhou, ou que quebrou no meio de uma edição,
    sobrescreveria uma capa BOA por um retângulo liso: exatamente o sintoma que originou a peça. A
    varredura custa até 6,4 ms, então mora na fase 2. ⚠️ Ela lê o ALFA, então o fundo entra DEPOIS
    dela e por baixo (`destination-over`) — pintar o fundo antes deixaria tudo opaco e a checagem
    nunca acusaria nada. ⚠️ Canvas contaminado não dá para inspecionar: ali NÃO se descarta (o
    `toDataURL` lança no mesmo caso e o catch resolve).
  - ⭐⭐⭐ **Tela DOM por cima do palco entra na foto — via `<svg><foreignObject>` (08/2026).**
    Relato dela: *"no Jogo 2D, o print pega a tela de início certinho; no Jogo 2D Avançado, fica só
    a cor de fundo"*. A causa é estrutural: as telas do gk são `<div class="szgk-panel">`
    **sobrepostos** ao canvas (`runtime/shell.ts makeScreen`), enquanto o g2d desenha as telas NO
    canvas. Fotografar só o canvas nunca as veria. ⚠️ **Isto NÃO é html2canvas** — aquele CLONA o
    documento num iframe interno e lê o `contentWindow` dele, o que é cross-origin até para si mesmo
    numa sandbox de origem opaca, e por isso nunca funcionou aqui. Serializar e desenhar não usa
    iframe nenhum: **medido em sandbox `allow-scripts` SEM `allow-same-origin` — carrega, desenha,
    NÃO contamina o canvas** (o `getImageData` de volta leu os 1293 px do texto) e exporta JPEG.
    - **Gate O(1)**: `document.elementFromPoint` no CENTRO do palco. Diferente do canvas ⇒ tem algo
      por cima ⇒ rasteriza. Assim o jogo comum (que desenha tudo no canvas) não paga nada.
    - ⚠️⚠️ **O enquadramento tem DOIS jeitos de dar errado, e eu caí nos dois em sequência.** (1)
      Encaixar a rasterização pela proporção da **página** faz a foto sair com zoom — relato dela:
      *"parece que foi feito um zoom e pegou só as palavras"* —, porque o painel do editor tem a
      forma que a criança deixou, não a do palco. (2) Recortar pelas coordenadas do canvas **na
      página** cai no vazio — *"voltou a mostrar só a cor do fundo"* —, porque dentro do
      `foreignObject` o layout de FORA não existe: o body que centraliza o palco não centraliza
      nada ali, e o conteúdo fica no canto. **A resposta é ancorar no CONTÊINER do palco**
      (`canvas.parentElement`): o SVG tem o tamanho dele e o recorte usa coordenadas RELATIVAS a
      ele. Provado em Chrome nos quatro layouts (centralizado em página alta, centralizado em
      página larga, canto superior esquerdo, com padding): foto idêntica nos quatro.
    - ⚠️ Os estilos de LAYOUT do contêiner (`display`/`flex*`/`padding`/`boxSizing`/`overflow`) vão
      para o **wrapper do foreignObject**, não para o clone: só os `childNodes` do clone são
      serializados, então estilo posto no clone é JOGADO FORA. Os `<canvas>` do clone são
      **escondidos**, porque canvas serializado vem SEM os pixels e viraria um retângulo vazio
      tapando o jogo.
    - ⚠️⚠️ **`background` NÃO entra na lista de layout, e `position` também não.** O `#szgk-stage`
      pinta um fundo OPACO (`background: config.bg`): copiá-lo faria a rasterização TAPAR o jogo —
      e as telas de lá são semitransparentes (`rgba(0,0,0,.35)`) justamente para o jogo aparecer
      atrás. E o palco é `position:fixed`, que herdado tiraria o wrapper do lugar.
    - ⚠️⚠️ **Geometria real do gk, que nenhum cenário inventado reproduz:** `#szgk-stage` é
      `position:fixed; inset:0` (a JANELA inteira) com o canvas centralizado, **transbordando**
      quando o jogo é maior que o painel do editor. Janela 500×700 com canvas 800×480 ⇒ origem do
      recorte em **x = −150**, negativo — e isso é correto: a parte do palco fora da janela também
      não existe na tela (`overflow:hidden`), e origem fora do SVG desenha transparente, que em
      `source-over` preserva o jogo já copiado embaixo. Travado em `previewSnapshot.test.ts`.
    - ⚠️ Um recurso externo (imagem de rede) derruba o SVG inteiro: `onerror` + timeout de 1,5 s
      seguem sem a sobreposição em vez de perder a foto.
    - ⭐ Com tela por cima, palco em branco **não** descarta — a tela de início é foto legítima com
      o canvas ainda sem um pixel, que é o estado do gk antes de "começar".
  - ⭐⭐ **A FRONTEIRA DE CONFIANÇA é o `rememberProjectSnapshot`, não o bridge.** O bridge roda no
    mesmo contexto do programa da criança, que pode postar a mensagem à mão — validar lá dentro não
    vale como garantia. Ali se exige `data:image/` e o teto **da gravação**
    (`MAX_PROJECT_THUMB_CHARS`). ⚠️ Os dois tetos já divergiram: a ponte aceitava 400 KB e o
    `writeProjectThumb` recusa acima de 300 KB **em silêncio** — no meio, a foto era guardada,
    escolhida em vez da reserva, e depois descartada sem que ninguém soubesse.
  - ⚠️⚠️ **Crase crua dentro do template literal do runtime = arquivo quebrado.** Aconteceu a 3ª e a
    **4ª** vez no mesmo dia — a 4ª escrevendo o comentário sobre a 3ª —, e as duas chegaram à tela
    da dona pelo HMR. Repetir o aviso não resolveu, então virou rede:
    **`preview/__tests__/bridgeTemplateCrase.test.ts`** monta os DEZ runtimes injetados no preview e
    compila cada um com `new Function`. ⭐ A régua não é contar crases (os arquivos têm vários
    templates legítimos, e um par de crases pode deixar o arquivo parseável mudando o SENTIDO do
    código): é que **o runtime gerado seja JavaScript válido** — o TypeScript não olha dentro da
    string, então sem isto o erro só aparece no navegador da criança.
  - ⚠️⚠️ **O painel do navegador desta sessão fica OCULTO, e ali a viewport do iframe é 0×0**:
    `visibilityState: 'hidden'` ⇒ nenhum elemento tem layout, todo `getBoundingClientRect` volta
    zero e `elementFromPoint` devolve `null`. Consequência prática: **qualquer coisa que dependa de
    layout dependente de VIEWPORT é inverificável aqui** — inclusive esta rasterização inteira, cujo
    gate é `elementFromPoint`. ⭐ E a armadilha é pior que "não dá para testar": um cenário de teste
    com contêiner de tamanho FIXO em px passa, porque não depende da viewport, e dá a impressão de
    ter provado o caso real. Foi exatamente o que aconteceu — a rodada anterior declarou "quatro
    layouts provados" com um contêiner `width:400px`, que nunca exercitou o `position:fixed` do gk.
    Ao medir layout aqui, **use o CSS de produção** e desconfie de zero.
  - O caminho antigo (`captureCoverFromProject` + `downscaleToThumb`) continua como **RESERVA** e não
    é decoração: cobre quem nunca abriu o preview, quem o deixou parado e a foto que envelheceu.
    `resolveThumb` (`cover/thumbCapture.ts`) prefere a do preview e cai nele. ⚠️ Ele também é o único
    caminho do **ShareDialog** ("Gerar capa"), que é síncrono com o clique e precisa de um print sob
    demanda — os dois usos não se confundem.
  - Testes: `cover/__tests__/previewSnapshot.test.ts` (o bridge é string de JS puro, avaliado com
    `new Function` sobre window/document falsos, mesmo padrão dos runtimes de extensão) — inclusive os
    dois testes simétricos que travam o corte entre as fases. ⚠️ **O round-trip real precisa de um
    navegador com o painel VISÍVEL**: com a aba oculta, `document.hidden` é true e o editor
    (corretamente) nem pede a foto, então esse caminho não é verificável aqui.
- ⚠️⚠️ **A 2ª passada (html2canvas) NÃO FUNCIONA — medido 08/2026.** O `import` do esm.sh resolve
  (importmap + `script-src` conferidos no navegador), mas o html2canvas **clona o documento num
  iframe interno** e lê o `contentWindow.document` dele; com o sandbox `allow-scripts` **sem**
  `allow-same-origin` a origem é opaca e isso é cross-origin *até para o próprio documento*:
  `Blocked a frame with origin "null" from accessing a cross-origin frame`. `foreignObjectRendering:
  true` **não** resolve (o clone vem antes nos dois modos), e `allow-same-origin` está fora de
  questão. **Consequência: projeto SEM canvas (HTML/CSS puro) não tem capa hoje** — e o card promete
  uma foto que não vem. ⭐⭐ **A saída apontada aqui — serializar o DOM num `<svg><foreignObject>`,
  que não clona via iframe — foi MEDIDA e FUNCIONA na sandbox de origem opaca (08/2026), e já vive
  em `preview/snapshotBridge.ts` (`rasterizarDOM`).** Hoje ela só é acionada quando existe um canvas
  com algo por cima; ligar o caminho SEM canvas nenhum é reusar aquela função, não pesquisa nova.
  ⭐ O que segura a peça: a
  captura devolvendo `null` **não apaga a capa que já existe** (`captureAndStoreProjectThumb` sai
  antes de gravar), então uma falha nunca destrói uma foto boa.
- **Player público** (`src/components/preview/StudioProjectPlayer.tsx` + `src/preview/renderProject.ts`):
  `renderProjectToPreviewDocAsync(project)` é a MESMA receita do `coverCapture`/`PreviewIframe` (extensões →
  permissões → assets → `buildPreviewDoc`), extraída, pura e defensiva para snapshots legados
  (sem `files` ou com `installedExtensions`/`extraFiles`/`assets` ausentes/não-array), deduplica extensões
  e devolve `Promise<string>` porque os runtimes são lazy. O nome sem `Async` é alias depreciado que
  também devolve Promise. O componente mantém estado `loading|ready|error`, ignora resposta obsoleta e renderiza o srcdoc num iframe
  `sandbox="allow-scripts allow-modals allow-pointer-lock"` (NUNCA `allow-same-origin`), autostart. Exportado no index E no
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
3a. **O Studio HERDA a aparência do host (08/2026).** Fundo, painel, borda e texto dos
   `--color-sz-*` apontam para os primitivos `--sz-kids-*` de `@sistemazero/ui/theme-kids.css`,
   com **fallback = o valor literal de antes**: dentro do community-kids (que importa os
   primitivos) o Estúdio fica azul-céu/navy, igual à página; no **admin** e na **comunidade
   adulta**, que NÃO os importam, nada muda. É o que permite um só CSS servir 4 hosts.
   - **Fonte**: `--font-family-sans` encabeça com `var(--font-nunito, sz-none)` (e a display com
     `--font-baloo`). O `next/font` gera famílias com nome HASHEADO, então os literais `"Baloo 2"`
     nunca resolviam e o Estúdio caía em system-ui dentro do kids. `sz-none` é uma família válida
     que não casa com nada e é PULADA fora do kids, preservando a cascata antiga.
     ⚠️ NÃO usar `var(--font-sans, …)`: é token DEFAULT do Tailwind v4 e nunca cai no fallback.
   - **Blockly** lê a paleta do tema em RUNTIME (`blockly/themeColors.ts`): uma tabela HEX fixa não
     consegue estar certa em dois hosts (canvas creme dentro de app azul). A conversão de cor
     PINTA num canvas 1×1 — `getComputedStyle` devolve `oklch()`/`oklab()` crus, que regex de
     `rgb()` não pega. `defineTheme` cacheia por NOME: cada paleta lida vira um nome derivado.
   - ⚠️ Derivado por `color-mix` é substituído no elemento onde é DECLARADO: os tokens derivados
     são RE-DECLARADOS no bloco `[data-sz-theme="light"]`, senão herdariam a mistura do escuro.
   - O host não embrulha mais o editor num card (`studio-full-client.tsx`).
3b. **A raiz do Studio é uma CERCA de stacking (`isolation: isolate` no style inline do
   `StudioCore`, 24/07/2026)**: o Blockly injeta `.blocklyToolbox { z-index: 70 }` e, sem a
   cerca, a paleta vazava por CIMA dos modais do host (o `Dialog` do `@sistemazero/ui` é overlay
   `z-50` SEM portal — bug visto no ConfirmDialog de trocar o tipo do projeto no admin). Com a
   cerca, os z-index internos só competem entre si e o editor inteiro pinta abaixo de qualquer
   overlay da página. NÃO remover; o que precisa flutuar sobre o host (menus da Topbar,
   `.blocklyWidgetDiv`/`.blocklyDropDownDiv`) é PORTALADO pro `document.body` — fora da cerca,
   não é afetado.
4. **Sem react-router**: navegação é do host. Páginas/cards recebem callbacks (`onOpenProject`, `onExit`).
5. **Globais residuais de multi-instância**: WebContainer é singleton por aba; o atalho da busca de blocos (`startSearch`) fica com a última instância (PtSearchCategory desregistra antes de registrar — NÃO remover, era crash na 2ª instância). `deleteProject` cancela autosaves em voo somente nas instâncias do MESMO namespace via registro de serviços.
6. **Testes = bun:test** (`bun test src`). O CI também executa o subconjunto Playwright do Jogo 2D e Jogo 2D Avançado (`examples-gallery.spec.ts --grep "game-2d(?:-advanced)?:"`); a suíte E2E completa continua manual via `bun run e2e`. Gotchas que esta suíte já paga:
   - `mock.module` NÃO é isolado por arquivo — capture os exports reais antes e restaure no `afterAll` (ver `BlocksMode.test.tsx`); mocks de idb-keyval ficam sem restore de propósito (IndexedDB não existe no happy-dom).
   - Sem fake timers — debounce do autosave encurta via `setAutosaveDelayForTests` (`src/persistence/service.ts`); relógio via `setSystemTime` (que RESETA se receber epoch 0).
   - DOM via happy-dom no preload (`bunfig.toml` + `test-setup.ts`).
   - Componentes que rendem DENTRO de um `<Studio>` precisam de PROBE (mock do Shell lendo hooks) — as estáticas `getState` leem a store default, não a da instância.
7. **Vite playground** (`bun run dev`): `optimizeDeps.entries`/`include` precisam casar com os imports REAIS (sufixo `.js` nos deep imports do Monaco; paths com forward slash — backslash do Windows não casa no glob e o Vite re-otimiza com full reload no meio da navegação). Headers COOP/COEP do dev server são obrigatórios p/ o Terminal.

8. **Storage do aluno**: o `storageBridge` é STRING PURA (sem imports); `postMessage` SEMPRE com
   `targetOrigin` (nunca `'*'`); snapshot via `JSON.parse`. `writeGameStorage` roda no MESMO mutex de
   `deleteProject` + cerca de exclusão — um write em voo NÃO ressuscita `sz:game-storage:<id>` órfão.
9. **Guardas do preview travadas**: `__szLoopTick` e os acessores do `scriptSourceGuard` são
   `configurable:false`; a CSP NÃO libera `script-src https:`, `blob:` nem `connect-src` (só o
   professor abre origens). `script-src data:` é deliberado e necessário ao Firefox. Mexeu em
   segurança de preview? Replique o teste unitário e rode o cenário Playwright no Firefox.
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

## Áreas do projeto — só gera o que está DENTRO

A geração não depende da posição dos blocos no canvas. Ela coleta somente o que a
criança colocou dentro das seis áreas opcionais definidas em
`blockly/blocks/frames.ts`. Bloco solto é **rascunho**: continua salvo e aparece
com aviso visual, mas não executa.

| Área | `CHILDREN` check | rota IR | arquivo |
|---|---|---|---|
| `sz_frame_structure` (🧱 Estrutura) | `HTMLNode` | `ir.html` | index.html |
| `sz_frame_appearance` (🎨 Aparência) | `CSSEntry` | `ir.css` | style.css |
| `sz_frame_molds` (🧩 Meus moldes) | `JSMoldRoot` | `behavior.molds` | script.js |
| `sz_frame_start` (⚙️ Ao iniciar) | `JSStartRoot` | `behavior.start` | script.js |
| `sz_frame_events` (⚡ Quando acontecer) | `JSEventRoot` | `behavior.events` | script.js |
| `sz_frame_loops` (🔁 Enquanto estiver rodando) | `JSLoopRoot` | `behavior.loops` | script.js |

### 🧩 Meus moldes — a área de definições (08/2026)

Nasceu porque o "Ao iniciar" dos jogos da família ficou grande demais. Medido nos
32 exemplos do Jogo 2D (peso = nós da subárvore de `behavior.start`): **42% do
conteúdo sai** para a área nova, **47% nos dez maiores** (Safári 247→98, Muralha
71%, Sobrevivente 66%). ⭐ O peso vem do `Desenhar a figura ⟨X⟩ assim:` (15 dos 17
exemplos com molde), não dos tipos de inimigo. Os jogos do Kit essencial (Pong,
Dino Run, Pegue a moeda, Sala com paredes) medem **0%**: as crianças clientes não
são afetadas e a área nem aparece para elas.

- ⚠️⚠️ **A seção gera DENTRO do envelope da partida**, como a primeira. Fora dele
  (a leitura ingênua de "antes do início") os tipos de inimigo e moldes morreriam
  no restart — o runtime zera o domínio a cada partida — e uma função declarada
  ali não enxergaria as variáveis do "Ao iniciar": quebra silenciosa em execução,
  sem erro no editor. Dentro, o corpo do molde só roda quando alguém usa a
  receita, então gerar antes não cria dependência sobre o que ainda não existe.
- **Fonte ÚNICA da classificação:** `MOLD_ONLY_STATEMENT_TYPES` (`ir/lifecycle.ts`),
  um subconjunto de `START_ONLY_STATEMENT_TYPES`. `lifecycleAreaForStatement`
  devolve `'molds'` para eles, o preset `mold-declaration` deriva os checks do
  Blockly e a migração de estado salvo lê a MESMA tabela.
- ⭐ **A régua é "molde é a receita que EU escrevo", e CARREGAR não é.** Trazer um
  arquivo que já existe (som, folha de quadros, imagem) é preparação de partida e
  fica no Ao iniciar. Além de ser a distinção mais fácil de ensinar, é o que
  mantém a área invisível no Kit essencial: som é o PRIMEIRO degrau, e torná-lo
  molde fazia a área aparecer para todo mundo. Pelo mesmo motivo
  `g2d:enemyStateAnim` ficou de fora: ele configura o tipo mas CONSOME a folha.
- **O encaixe é ESTRITO** (o Blockly recusa um molde no Ao iniciar), com **duas
  exceções deliberadas**: **`funcDecl`** (`mold-or-start-declaration`) e
  **variável/constante** (`mold-or-start-command`, que preserva os contextos
  aninhados: criar variável dentro de evento/laço continua valendo). ⚠️ Nos dois
  presets, `start` vem PRIMEIRO no `root` de propósito: `areaForBlockType` lê
  `root[0]` como canônica, e é isso que faz esses blocos **não migrarem** e
  ficarem onde a criança deixou.
- ⚠️⚠️ **A exceção da variável não é conforto, é requisito.** Ela é a ÚNICA receita
  de conserto quando um molde precisa de um número ajustável, e sem ela a
  migração que sobe a dependência junto do molde gera um estado que o Blockly
  RECUSA — o projeto simplesmente não abre. Foi assim que o lote nasceu (a
  exceção estava documentada mas não implementada) e o teste da época não pegou,
  porque asseria a cadeia serializada e nunca se ela CARREGAVA.
- **Classe NÃO é exceção**: ao contrário da função, não é içada, então uma classe
  no Ao iniciar usada por um molde acima quebraria por TDZ.
- ⚠️ **`molds` é OPCIONAL na IR e a chave é OMITIDA quando vazia** (`withMolds` em
  `ir/behavior.ts`). Sem molde, o `behavior` tem a forma IDÊNTICA à de antes da
  área, `normalizeSZIR` devolve a MESMA referência e o gerador não emite o
  marcador — nenhuma fixture, drift ou dirty-check por referência enxerga uma
  mudança que não houve.
- **A Ponte organiza sozinha**: o parser devolve tudo em `start` e
  `partitionMolds` divide por TIPO na fronteira (`parsers/project.ts`). O
  marcador `// Meus moldes` é puramente didático — a Ponte não depende de
  comentário para reconstruir a área, e código escrito à mão no modo Código entra
  organizado. ⚠️ **`stripGeneratedLifecycleEnvelope` ancora na PRIMEIRA seção**, e
  não em "Ao iniciar": contar linhas para trás a partir dali cairia no meio das
  definições, o envelope não seria removido e a Ponte o re-embrulharia a cada
  volta (erro de sintaxe real, pego pelo fixpoint dos exemplos).
- **Migração `BEHAVIOR_AREAS_STATE_VERSION` 6 → 7**: `migrateCurrentLifecyclePlacements`
  move os moldes e ⭐ **arrasta junto as variáveis de que eles dependem**
  (`liftMoldDependencies`, casamento por texto de campo com ponto fixo). Isso só é
  seguro porque variável cabe nas duas áreas. Um falso positivo sobe uma constante
  a mais (programa segue válido); um falso negativo vira erro LEGÍVEL, não quebra
  silenciosa.
- **Validação de ordem entre áreas** (`validateMoldsDoNotLookAhead`, `ir/schema.ts`):
  a validação geral de referências junta todos os nomes do projeto antes de
  conferir qualquer um (responde "existe em algum lugar", não "existe ainda"), então
  um molde que aponta para um nome criado no Ao iniciar precisava de checagem
  própria. A mensagem diz o conserto: mover para cima o bloco que cria o nome.
- ⭐⭐ **Primeira área com gate, e ele é DERIVADO, nunca um degrau escolhido à mão**
  (`offersMoldBlock` em `toolbox.ts`): a área entra quando a paleta já montada
  oferece algum bloco que PERTENCE a ela. Um número fixo abre o pior buraco
  possível — a criança vê "Desenhar a figura assim:", arrasta, e a área onde ele
  encaixa não existe para ela. Medido na primeira versão: SETE blocos órfãos,
  incluindo o som do núcleo. Hoje: `iniciante-2d` sem a área (Kit essencial
  limpo), `iniciante-3d` em diante com ela e os 3 moldes do Jogo 2D.
  ⚠️ Três armadilhas neste detector, todas já pagas: (a) contar quem só CABE na
  área (variável/função) fazia ela aparecer no primeiro degrau, sem nada para pôr
  dentro; (b) o flyout DINÂMICO (Funções/Classes) não tem `contents`, então a
  classe escapava da varredura e precisa de marcação própria no `pushSubCustom`;
  (c) ler o REGISTRO global de contratos torna a detecção dependente da ordem de
  inicialização e a área some em silêncio — para o núcleo lê-se a DEFINIÇÃO
  (`definitionBelongsToMolds`), e só as categorias de extensão, que chegam
  prontas, usam o registro. O gate é só de PALETA: área que já existe no projeto
  continua no canvas e continua gerando.
- **Os ~50 exemplos foram ajustados na FONTE**, não normalizados em runtime;
  `__tests__/moldsArea.test.ts` varre os catálogos e falha se algum deixou molde
  em `behavior.start`. ⚠️ O wrapper `beginnerGameExample` (`game-2d/examples/shared.ts`)
  RECONSTRÓI o behavior campo a campo: esquecer `molds` ali apagaria em silêncio
  as figuras de todos os exemplos iniciantes. Mesma armadilha em
  `state/extensionsAdapter.ts`.

### A espera virou um bloco próprio (08/2026)

`sz_js_function` lia **"função ⟨fazerAlgo⟩ assíncrona ☐"**: a palavra aparecia na
cara do bloco mais básico de função, para quem nunca ouviu falar de Promise. O
campo `ASYNC` saiu de `sz_js_function` e de `sz_js_class_method`, e nasceram
**`sz_js_function_async`** e **`sz_js_class_method_async`** no degrau avançado,
junto do `await`. ⚠️ Isso REMOVE um campo de bloco existente (o que a regra de
02/08 proíbe sem cuidado): a cobertura é `blockly/migrateAsyncBlocks.ts`, que roda
ANTES das demais migrações (muda o TIPO, e as seguintes decidem por tipo) e troca
`ASYNC: 'TRUE'` pelo bloco irmão preservando nome, parâmetros e corpo. Contadores
de Programação: 149 → **151** blocos públicos, 156 → **158** registros.

As áreas são chapéus top-level e existe no máximo uma de cada. **Projeto novo
nasce sem áreas**; a criança adiciona somente as que a atividade precisa pela
categoria **🗂️ Áreas do projeto**.

⭐⭐ **Cada área passa pela CURADORIA, como qualquer bloco (08/08).** A categoria
🗂️ nasce VAZIA e `buildCoreToolbox` a preenche no fim: uma área entra quando o
PERFIL dá direito a algum bloco cuja área CANÔNICA é ela. Antes as seis eram
fixas e ficavam fora de todo filtro — o sintoma era silencioso e feio: uma aula
de primeiros passos, sem HTML nem CSS liberados, mostrava 🧱 Estrutura e
🎨 Aparência, e a criança arrastava áreas que não tinham um único bloco para
receber. Medido: `allowBlocks: ['sz_g2d_create_sprite']` → só ⚙️ Ao iniciar;
somar um laço traz 🔁 junto; `['sz_html_text']` → só 🧱. As áreas saem sempre na
ordem em que EXECUTAM, não na ordem da lista da aula.

⚠️⚠️ **A fonte é o UNIVERSO de blocos (`allowedAreasForProfile`, que varre o
`SERVER_BLOCK_CATALOG`), NUNCA a paleta montada.** A primeira versão lia a paleta
e causou um defeito de produção: uma criança no **Construtor**, no Estúdio
Completo, ficou sem ⚡ Quando acontecer e sem 🔁 Enquanto estiver rodando, e não
conseguia montar jogo nenhum. O detalhe que ela deu fechou o diagnóstico —
*"quando criei apareceu, quando saí e voltei sumiu"*: ao criar, a extensão vinha
junto; ao reabrir, a paleta era montada antes de a extensão hidratar. A lista do
Kit essencial (`ESSENTIAL_2D_ALLOW_BLOCKS`) é quase toda de blocos do Jogo 2D,
então sem a extensão carregada não sobrava evento nem laço para "provar" um
direito que a criança tinha. Pelo universo, o direito vem do NÍVEL e da lista, e
instalar ou remover extensão não mexe mais nas áreas. Regressão travada em
`moldsArea.test.ts` com a lista REAL do produto e ZERO extensão passada.
- ⚠️ É a área **canônica** (`root[0]`), não todas em que o bloco cabe: variável e
  função cabem em 🧩 Meus moldes de propósito, e contá-las traria a área já no
  primeiro degrau, sem molde nenhum para pôr dentro.
- ⚠️ Três armadilhas do detector, todas já pagas: o flyout DINÂMICO
  (Funções/Classes) não tem `contents` e precisa marcar suas áreas no
  `pushSubCustom`; ler o REGISTRO global de contratos torna tudo dependente da
  ordem de inicialização (para o núcleo lê-se a DEFINIÇÃO); e a moldura legada
  `sz_frame_behavior` é `hidden` e não pode vazar.
- **As áreas entram no `BLOCK_CATALOG`** (categoria `🗂️ Áreas do projeto`), então
  o professor pode listá-las na aula e a IMPORTAÇÃO de lista de blocos do admin
  as aceita (ela valida contra o mesmo catálogo).
- ⭐⭐ **No modo restritivo, a LISTA manda:** área marcada no picker entra mesmo
  sem nenhum bloco dela na paleta. Sem isso o picker vira botão morto — o
  professor marca 🧩 Meus moldes e a área não aparece, que é o oposto do motivo
  de as áreas terem entrado no catálogo. A regra automática continua valendo por
  cima, então marcar é opcional: uma lista só com blocos de sprite já recebe
  ⚙️ Ao iniciar sozinha.
- ⚠️ **Piso:** paleta COM blocos e NENHUMA área derivada garante ⚙️ Ao iniciar.
  Acontece com uma lista só de valores, que não pertencem a área nenhuma — sem a
  rede, a criança via blocos e não tinha onde encaixá-los.
- ⚠️ **`areaFor` (catálogo server-safe do Zappy) não pode achatar frame em
  "structure".** O mapa antigo mandava todo `domain: 'frame'` para lá, e o tutor
  passava a ensinar que ⚙️ Ao iniciar pertence à estrutura da página. O registro
  central `blockly/projectAreas.ts` liga cada área ao frame que representa; lista,
  layout, paleta, normalização e catálogo derivam desse contrato.
- ⚠️ **`ServerBlockCatalogEntry['area']` atravessa a fronteira do pacote**: o
  `member-shell` mantém um espelho em `PensaStudioBlockReference['area']`
  (planner do Pensa). Área nova aqui exige a mesma lá, senão aquele pacote
  deixa de compilar — e o typecheck do studio sozinho NÃO acusa. Excluir uma área desconecta seus filhos no
mesmo grupo de undo, preservando-os como rascunho. Duplicatas recebem o mesmo
tratamento. ⚠️ **O resgate de rascunho NÃO roda sob a cerca de carga**
(`projectAreaSafeDelete` checa `isWorkspaceLoading()`, 25/07): o clear do
serializer do Blockly itera um SNAPSHOT dos top blocks — o filho desplugado
virava um top NOVO fora do snapshot, sobrevivia à limpeza e DUPLICAVA o conteúdo
dos frames a cada reload de workspace povoado (colar código na Ponte). Regressões:
`__tests__/projectAreaSafeDeleteLoad.test.ts` (unitária, roda no CI) +
`e2e/bridge-paste-duplication.spec.ts` (gesto real de colar).

- **Contrato de posicionamento** (`blockly/blockContracts.ts`): é a fonte comum
  para checks físicos, área-raiz, contexto aninhado, exclusões ancestrais
  (`forbiddenNested`), papel e fase. Criadores de recursos aceitam funções e
  eventos, mas proíbem `loop-body` em qualquer profundidade. Eventos e
  loops são raízes e não podem ser aninhados. Comandos contínuos usam o preset
  `loop-command`: cabem em loops e em funções/métodos, nunca diretamente em
  **Ao iniciar** nem no corpo direto de eventos ou construtores; um loop
  aninhado nesses fluxos continua válido. Imports e classes ficam diretamente
  em **Meus moldes**; funções e variáveis podem ficar em **Meus moldes** ou
  **Ao iniciar**. Loops do motor executam callbacks e NÃO contam
  como laço sintático para `break`/`continue`; somente `for`/`while`/`repeat`
  concedem esse contexto. `break`, `continue`, `return`,
  `await`, `super` e valores dependentes de evento só cabem em seu contexto
  sintático. `ir/lifecycle.ts` repete a gramática recursivamente para proteger
  estados importados e a Bridge.
- **Coleta** (`blockly/buildIR.ts`): lê a primeira área de cada tipo e mantém a
  ordem de cada cadeia. `collectFlatFromWorkspace` existe somente para a
  migração do modelo anterior.
- **Migração transparente** (`blockly/normalizeFrames.ts`): migra estados planos,
  parcialmente organizados e a antiga `sz_frame_behavior` por área, preservando
  IDs e a saída. Se a área antiga coexistir com uma área atual, seus filhos são
  anexados ao frame atual em vez de criar uma duplicata. Wrappers/boots antigos são registrados apenas para carregar
  projetos salvos, nunca aparecem na paleta. Conteúdo de áreas antigas
  duplicadas vira rascunho. O marcador `szBehaviorAreasVersion` impede que um
  rascunho criado intencionalmente seja migrado depois. O sanitizador aceita a
  qualquer versão conhecida de 2 a 7 para que ela chegue ao normalizador e vire
  a versão 7 atual;
  versões futuras continuam rejeitadas até ganharem uma migração explícita.
  ⚠️ **O marcador também protege a migração de ESTRUTURA HTML (25/07)**: em estado
  ATUAL (marcado), bloco HTML solto no topo é rascunho deliberado (ex.: filho-de-svg
  que o encaixe semântico recusou) e `migrateHTMLStructure` recebe
  `preserveTopLevelDrafts: true` — NÃO embrulha num svg/ul novo nem promove filhos.
  Sem a cerca, a reescrita fazia o restore do BlocklyPanel RECARREGAR o canvas no
  meio da edição ("o bloco se auto-encaixou e duplicou o resto" — bug real 24/07).
  Estado legado (sem marcador) segue migrando o topo; o conteúdo DENTRO do frame
  Estrutura normaliza sempre. Regressão: `__tests__/svgTitleDupRepro.test.ts`.
- **Execução**: o gerador emite `molds` → `start` → `events` → `loops` e conversa com o
  runtime pelo `RuntimeLifecycleContract` da extensão. O boot é automático;
  blocos antigos de “começar” não devem aparecer em projetos novos. Jogo 2D e
  Jogo 2D Avançado declaram `managedProjectRun`: seus runtimes incorporam o
  `ProjectRunContext`; listeners DOM inline ou nomeados recebem o `AbortSignal`
  da partida, e timeouts, intervalos e RAFs avulsos passam pelo contexto para
  serem cancelados antes de uma nova factory. Os schedulers e recursos específicos
  continuam sob responsabilidade do motor. O teste de integração
  `projectRunResources.test.ts` cobre o restart no mesmo documento; o E2E
  `behavior-lifecycle.spec.ts` cobre início, evento, loop cancelável e remontagem
  pelo botão de atualizar o preview.
- **Organizar blocos** (`blockly/organize.ts`): dispõe as seis áreas em duas
  linhas e mantém os rascunhos próximos da família correspondente.
- **World Composer**: adiciona conteúdo apenas numa área compatível já criada.
  Se faltar **Ao iniciar**, orienta a criança em vez de criar a área sozinho.
- **Allowlist**: todos os `sz_frame_*` atuais e o legado de migração pertencem a
  `CORE_BLOCKLY_BLOCK_TYPES`; remover um deles pode zerar estado importado.

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

### "Deletar N blocos" mentia (02/08) — `blockly/deleteContextMenu.ts`

⭐ O item NATIVO de apagar conta `block.getDescendants(false).length` — e, para o Blockly, **cada
soquete PREENCHIDO é um bloco** (bloco-sombra). Como aqui a regra é que todo `input_value` nasça com
sombra (ver "SOMBRA nos soquetes"), um único "Mover o sprite ⟨heroi⟩, velocidade ⟨4⟩ pulo ⟨11⟩"
aparecia como **"Deletar 3 blocos"**: a criança lia três e via um. O mesmo valia para o "apagar tudo"
do canvas (`getDeletableBlocks_` usa o mesmo `getDescendants`). Relato dela no playground.

`patchDeleteContextMenus()` (chamado no fim do `ensureBlocklyInitialized`) **troca SÓ o
`displayText`** dos itens nativos `blockDelete` e `workspaceDelete` — pega o item do registry,
`unregister` + `register` com o resto **espalhado** (callback/precondição/peso/scopeType seguem sendo
os do Blockly; o comportamento de apagar não é nosso). A contagem passa a ignorar `isShadow()`, e o
que já estava certo no nativo fica: **a pilha ABAIXO do bloco não entra** (ela sobrevive, o Blockly
religa). Texto: `Apagar este bloco` · `Apagar este bloco e o de dentro` · `Apagar este bloco e os N de
dentro` · no canvas `Apagar os N blocos` (ali o número informa mesmo). ⚠️ `ActionRegistryItem` NÃO é
exportado pelo Blockly 12 — o tipo sai de `Exclude<RegistryItem, {separator: true}>`. Teste:
`__tests__/deleteContextMenu.test.ts` (contagem com sombra/dentro/pilha/valor-real + os textos).

## 🚫 Bloco que a criança JÁ USA não muda de forma (02/08/2026)

**Regra, não sugestão.** Bloco que já existe em projeto salvo tem a forma CONGELADA: não ganha
campo, não perde campo, não muda a face nem a assinatura do helper. Precisa de uma variação?
**Crie um bloco NOVO ao lado.**

O caso que gerou a regra: em 0.55.2 um full review acrescentou um soquete de "tamanho reservado" ao
**`sz_g2d_random_x`/`_y`** ("um x aleatório na tela" → "um x aleatório para largura ⟨40⟩"), para o
sprite não nascer cortado na borda. A intenção era boa e o problema era real. Só que o bloco **não
tinha soquete nenhum**: todo projeto de criança que já usava o bloco antigo passou a receber a sombra
40 na reabertura (via `migrateValueFields`) e o sorteio encolhia sozinho — **sem erro na tela**.
Revertido por inteiro em 02/08 a pedido da usuária ("avacalhou os projetos que já usavam").

⚠️ **O sintoma é sempre esse:** soquete novo num bloco antigo não fica vazio no projeto salvo — a cura
de sombras o preenche. Um campo novo OPCIONAL (dropdown com o padrão sendo o comportamento antigo, ou
sombra que reproduza a saída anterior byte a byte) é o único acréscimo seguro; foi assim no `NAME` do
"criar sprite no grupo" e no `SHAPE` do "criar o molde".

## Blocos: categorias + como adicionar um

**Categorias** (montadas em `src/blockly/toolbox.ts buildCoreToolbox`; cores em `theme.ts CATEGORY_COLORS` — cada categoria tem 1 cor de arco-íris distinta e as sub-categorias são TONS dela via `categoryShades`):
**🗂️ Áreas do projeto** (`blocks/frames.ts` — os 5 blocos-container, ver a seção anterior), **HTML** (`blocks/html.ts`), **🖋️ SVG** (`blocks/svg.ts` — categoria PRÓPRIA: subgrupos Estrutura/Formas/Texto + **🎨 Aparência** = o CSS específico de SVG `fill`/`stroke`/`stroke-width`/`stroke-dasharray`/`stroke-linecap`/`text-anchor`, que CONECTAM na coluna de CSS), **CSS** (`blocks/css.ts`), **Canvas** (`blocks/canvas.ts` — inclui o `sz_html_canvas` "criar tela de desenho", movido do HTML), **Avançado** (`blocks/advanced.ts` — rawHTML/CSS/JS) e o guarda-chuva **Programação** que junta JS (`blocks/js.ts` via `JS_GROUPS`), **🌐 Página** + **⚡ Eventos** (`blocks/dom.ts`; `EVENTOS_TYPE_ORDER` no toolbox ordena os "Quando…" em Eventos), 🔢 Matemática (`math.ts`), 🔣 Valores (`values.ts`), Funções/Classes/Objetos. Comandos e valores de lista vivem juntos em **📋 Listas**; `Object.assign` vive em **Objetos**. Parâmetros contextuais aparecem somente no flyout de **Funções**, para a função/método/construtor atualmente selecionado — nunca em Classes e nunca por varredura global. Cada arquivo exporta `X_BLOCKS` (+ às vezes `X_GROUPS`) e é somado em `blocks/index.ts CORE_BLOCKS`. Texto de bloco 100% PT didático ([[studio-blocos-portugues]]).

**Curadoria por aula** (`#core/levels.ts`): a paleta é filtrada na CONSTRUÇÃO pelo `LearningProfile`
(`level` + `allowCategories` + `allowBlocks`). **Reforma 2D/3D (07/2026):** `BlockLevel` virou a
escada TOTAL de 6 degraus (`iniciante-2d` < `iniciante-3d` < `intermediario-2d` <
`intermediario-3d` < `avancado-2d` < `avancado-3d` — 2D antes do 3D em cada dificuldade, a MESMA
ordem da carreira do aluno; teto = `MAX_BLOCK_LEVEL`). A API pública aceita TAMBÉM os 3 valores
legados (`AnyBlockLevel`) e a fronteira ÚNICA `resolveLearning` normaliza via `normalizeBlockLevel`
(legado: iniciante→ini-2d, intermediario→int-3d, avancado→av-3d — preserva os conjuntos antigos;
lixo→ini-2d fail-closed); consumidores internos leem `config.learning.level` JÁ normalizado.
`minLevel` das extensões: game-2d=ini-2d, game-3d=ini-3d (porta do 3D), game-2d-advanced=int-2d,
world-3d=int-3d, game-3d-advanced=int-3d (reclassificado 26/07 — abre no Arquiteto); sem `minLevel` → `DEFAULT_EXTENSION_MIN_LEVEL` (int-3d)
via helper `extensionMinLevel` (fonte única — nunca `?? '…'` inline). `BLOCK_LEVEL_OPTIONS` é a
fonte dos labels do select do admin. ⚠️ **`allowBlocks` é RESTRITIVO** (06/2026): lista
NÃO-vazia = mostra SÓ esses blocos (+ as 🗂️ Áreas do projeto, que nunca passam pelo filtro), ignorando
nível/categoria; vazia = curadoria por nível. (`isBlockTypeAllowed`/`isCategoryAllowed` ganham o ramo
"tem lista? restringe".) O admin escolhe a lista por um picker alimentado pelo **`BLOCK_CATALOG`**
(export do índice — `blockly/blockCatalog.ts`: id+rótulo+categoria derivados dos `*_BLOCKS`, sem
frames/`hidden`; rótulo = `message0` sem os `%N`, com **`LABEL_OVERRIDES`** p/ os blocos cujo texto vive
nos SOQUETES (senão sobra "de"/"Alterar para" e os pares valor/comando colidem — math função/trig, set-property
texto/cálculo, método em Objetos/Classes); **inclui todas as cinco extensões oficiais, inclusive Mundo 3D** — a restrição também alcança as
EXTENSÕES: `filterToolboxCategory` poda a categoria da extensão p/ só os listados, e `pushSubCustom`
(Funções/Classes — flyout dinâmico) só entra se a aula listou algum bloco dele; ⚠️ bloco de extensão só
APARECE se a extensão estiver INSTALADA no projeto inicial). Catálogo + restrição travados por
`blockly/__tests__/{blockCatalog,toolboxRestrict}.test.ts`. ⚠️ **Poda de vazias:** `buildCoreToolbox`
fecha com `pruneEmptyCategories` (rede de segurança) — categoria/sub-categoria que fica SEM nenhum
bloco visível some (preserva 🔎 Pesquisar e os flyouts dinâmicos `custom`); vale p/ nível E lista.

### 🔎 A busca de blocos (`searchCategory.ts` + `searchFlyoutMetrics.ts`)

- **Resultados AGRUPADOS** por `groupSearchResultsByPalette` (pura, exportada): um cabeçalho
  `kind: 'label'` com `Jogo 2D › 🎬 Animação` antes de cada grupo, para a criança ir aprendendo onde
  o bloco mora. O caminho vem do `palettePathOf` (`paletteMap.ts`) — o caminho REAL da paleta, e não
  o `category` do catálogo, que é curadoria do admin. ⭐ Os grupos saem na ordem do MELHOR resultado
  (o `Map` preserva inserção), nunca em ordem alfabética. Bloco sem caminho vai para "Outros
  blocos", no FIM.
- ⚠️ **A rolagem do flyout ignora o espaço do campo de busca.** O espaço é um separador
  (`kind: 'sep'`) — e o `FlyoutSeparator` do Blockly **não tem DOM**. Como a faixa rolável sai do
  `getBBox()` do canvas e o `getScrollMetrics` DESCARTA o `top` do conteúdo, sobram `gap − MARGIN`
  px inalcançáveis e **o último bloco fica cortado** (medido: 21px no playground). O
  `SearchAwareFlyoutMetrics` devolve essa altura somando `max(0, contentTop − MARGIN)` — parcela que
  é ZERO nas categorias normais, o que importa porque **o flyout é um só para toda a toolbox**.
- ⚠️ **Os dois defeitos são simétricos.** Antes, o espaço era feito deslocando o canvas por
  `transform` (atributo que o Blockly reescreve ao rolar) e sumia o PRIMEIRO bloco; o `sep`
  consertou o topo e criou o corte embaixo. Ao mexer aqui, verifique **os dois extremos**: primeiro
  bloco abaixo do campo depois de rolar e voltar, e último bloco inteiro no fim.
- ⚠️ `bun test` não faz layout: os testes provam a ARITMÉTICA (`searchFlyoutMetrics.test.ts`) e o
  agrupamento puro (`searchGrouping.test.ts`). O pixel é QA de navegador, no playground.
- ⚠️ **Armadilha de QA: metade desta tela vive numa `requestAnimationFrame`.** O `matchBlocks`
  fecha agendando `fitFlyoutToContents()` + `positionField()` numa rAF, e **rAF não dispara em aba
  oculta** (`document.visibilityState === 'hidden'` — foi o que derrubou a captura de capa também).
  Num painel de navegador que não está sendo EXIBIDO, `setTimeout` roda e rAF não: a rolagem e o CSS
  dão para verificar, mas a LARGURA do painel (o piso de `MIN_SEARCH_FLYOUT_WIDTH`, reaplicado só
  naquela rAF) não — dá falso negativo, com o campo largo sobrando por cima de uma caixa estreita.
  Quem instala o cálculo de rolagem é o `showFieldWhenReady`, SÍNCRONO na seleção da categoria, e
  por isso ele é verificável mesmo assim.
- ⚠️ **Medir o flyout pelo `.blocklyFlyoutBackground`, nunca pelo `<g class="blocklyFlyout">`**: o
  `getBoundingClientRect()` do `<g>` é a UNIÃO dos filhos, então um bloco largo demais devolve a
  largura do bloco, não a da caixa.

**Adicionar um bloco = ~9 pontos (round-trip blocos⇄código)** — pular um quebra silenciosamente:
1. `ir/schema.ts` — variante na união TS (`JSStatement`/`JSExpr`/`HTMLNode`/`CSSEntry`) **E** no `z.discriminatedUnion` (senão a validação rejeita o IR salvo/importado).
2. `blocks/<cat>.ts` — `BlockDefinition` + entrada num `*_GROUPS` (senão cai em "Mais"). Campo que REFERENCIA um nome já criado (variável/classe/método/propriedade/sprite/cena/objeto/imagem…)? Use um **seletor** (`field_name_picker`/`field_sprite_picker`/`field_asset_picker`), não `field_input` — e, se o bloco DECLARA um nome novo, registre-o no `*_DECL_BLOCKS` do picker (ver "Padrões já usados").
3. `blockly/buildIR.ts` — case bloco→IR (`f()` campos, `exprInput()` valores, `getStatementChildren()` corpos).
4. `generators/{js,expr,html,css}.ts` — IR→código (+ `collectStatementIdentifiers`/`collectExprIdentifiers` p/ variáveis novas, senão o gerador renomeia errado).
5. `parsers/{js,html,css}.ts` — código→IR (Ponte). Expr usável em `se`/valor precisa entrar em `isSimpleValue` (senão vira rawJS).
6. `blockly/workspaceState.ts` — IR→bloco (`statementToBlock`/`exprToValueBlock`/`htmlNodeToBlock`; **5º arg do `block()` = inputs de VALOR**).
7. `state/projectStore.ts` — type em `CORE_BLOCKLY_BLOCK_TYPES` (drift `blockAllowlist.test.ts`; faltar = `sanitizeImportedBlocksState` zera TODOS os blocos).
8. **`blockly/blockLevels.ts` — DEGRAU do bloco** (curadoria por bloco; reforma 2D/3D 07/2026 = escada TOTAL de 6: `iniciante-2d` < `iniciante-3d` < `intermediario-2d` < `intermediario-3d` < `avancado-2d` < `avancado-3d`, a MESMA ordem da carreira do aluno): a categoria **Programação** tem progressão própria e exaustiva em `programmingContract.ts` (orçamento iniciante explícito; bloco novo cai no intermediário, nunca no iniciante por omissão). **Filosofia "kit primeiro, na unha por último" (26/07):** iniciante = jogos (kits) + **HTML/CSS ESSENCIAL** (cor/texto/imagem/caixa — default iniciante-2d); **SVG inteiro = intermediario-2d** (primitivo visual gentil, via `level` do catálogo); **Canvas 2D inteiro = avancado-2d** (prefixo `sz_canvas_` + os não-prefixados `sz_html_canvas`/`sz_val_image`/`sz_js_new_image`/`sz_input_*` no set `AVANCADO_2D`); **HTML/CSS PROFUNDOS = avancado-2d** (tags semânticas/forms via `level` do catálogo; layout/tipografia/animação/mecânica genérica no set); **Canvas 3D inteiro = avancado-3d** (`INTERMEDIARIO_3D` esvaziado → prefixo `sz_t3d_`). **Todo `sz_g3d_*` é iniciante-3d** (a aula filtra quais mostrar); os pisos por prefixo decidem canvas→av-2d, g3d→ini-3d, gk→int-2d, w3d→int-3d, g3k→int-3d, t3d→av-3d. ⚠️ NUNCA pôr bloco 3D nos sets `*_2D` (o split protege a promessa do eixo — travado no teste). Valores LEGADOS (`iniciante`/`intermediario`/`avancado`) seguem aceitos nas props públicas e normalizam via `normalizeBlockLevel` (`core/levels.ts`: legado→`iniciante-2d`/`intermediario-3d`/`avancado-3d`, preservando os conjuntos antigos; lixo→`iniciante-2d` fail-closed). Os testes cobram tipos reais, tiers exaustivos e ausência de duplicação entre o contrato de Programação e os sets genéricos.
8b. **SOMBRA nos soquetes (`blocks/valueSockets.ts`)** — todo `input_value` novo precisa nascer
   PREENCHIDO na paleta (feedback dela 24/07: "vários blocos sem sombra"): número em
   `VALUE_SOCKETS`, texto em `TEXT_SOCKETS`, cor em `COLOR_SOCKETS`, composto (variável nomeada /
   comparação-semente `x > 0` / `sz_val_get_element`) em `CUSTOM_SOCKETS` — reuse
   `OBJ_VAR_SHADOW`/`LIST_VAR_SHADOW`/`COND_COMPARE_SEED`/`ITEM_COMPARE_SEED`. E soquete de
   literal (number/text/color) TAMBÉM entra em `LEGACY_VALUE_FIELDS` (`migrateValueFields.ts`) p/
   a sombra SOBREVIVER à Ponte e ser curada no load (entrada inerte na migração; soquete de tipo
   misto só vira sombra quando o literal casa o kind). Sombra composta (variável/comparação) é
   SÓ de paleta — não entra no LEGACY.
9. teste de round-trip + `bun run typecheck/test/check`.

**Contratos transversais das categorias web:** não replique invariantes nos
switches centrais. Conteúdo HTML phrasing vem de `html/catalog.ts`, e nomes
acessíveis/alternativas textuais de `html/accessibility.ts`; validação e
codificação de famílias CSS ficam em `css/googleFonts.ts`, `css/keyframes.ts`,
`css/mediaQueries.ts` e `css/motion.ts`; declarações e usos de pincel, inclusive
em expressões aninhadas, são descobertos por `ir/canvasContexts.ts`. ⚠️ **O pincel
tem DUAS fontes além do "Preparar a tela" (25/07)**: (1) corpo que LIGA um ctx como
parâmetro (figura do g2d, onDraw/defineLook do gk — fonte única
`boundCanvasContextsForChild` em `ir/programmingExecution.ts`, consumida pelo
coletor com ESCOPO) e (2) runtime instalado que entrega global preguiçoso
(`RUNTIME_PROVIDED_CANVAS_CONTEXTS` — game-2d expõe `ctx` no boot; o schema e o
`semanticDiagnostics` contam como preparado via `runtimeProvidedCanvasContexts`).
Sem as duas, canvas do núcleo num jogo 2D acusava "pincel não preparado" apesar
de funcionar. Extensão nova que expuser pincel global → entra no mapa. Regressão:
`ir/__tests__/defineShapeCtxRepro.test.ts`. Parser,
schema, diagnóstico, Blockly e gerador consomem esses contratos puros. Ao
acrescentar um caso nessas famílias, estenda primeiro o contrato da categoria e
prove o caminho inválido e o round-trip nos testes.

**Bloco de EXTENSÃO** (`game-2d`/`game-3d`, prefixo `g2d:`/`g3d:`) vive em `official-extensions/<id>/blocks.ts` (NÃO no CORE); schema/buildIR/generators/parsers/workspaceState valem igual, mas com 3 pontos PRÓPRIOS além dos acima: (a) `state/projectStore.ts` → `EXTENSION_BLOCKLY_BLOCK_TYPES['<id>']` (não o CORE); (b) `ir/schema.ts` → o `type` no Set `G2D_STATEMENT_TYPES`/`G3D_STATEMENT_TYPES` (testado em `official-extensions/*/__tests__`); (c) o `blocks.ts` da extensão → a entrada na subcategoria certa do array `SUBCATS` (que monta o `*ToolboxCategory`), senão o bloco cai no grupo genérico "Mais". O `manifest.ts` traz a `docs` (markdown do aluno; `description` ≤ ~500 chars) + bump de `version`. Checklist de revisão: `docs/EXTENSIONS.md`.

**Padrões já usados** (clone-os):
- **Seletores de NOME (escolher, não digitar)** — em vez de a criança redigitar a grafia de algo que já nomeou noutro bloco, o campo CONSUMIDOR abre um pop-up com a lista do que já foi criado (à la Scratch/MakeCode); símbolos de Programação que exigem declaração (`mutable-variable`/`group`≡lista/`class`/`function`) não oferecem texto livre e respeitam escopo, ramo e ordem (funções têm hoisting; classes não). Canvas 3D também exige recursos declarados e separa os papéis `scene3d`/`renderer3d`/`camera3d`/`light3d`/`composer3d`/`object3d`/`loader3d`/`physics-world`; `object3d` aceita objetos Three.js genéricos, enquanto `g3d-object` aceita somente objetos ligados a um mundo do Jogo 3D. A validação da IR usa os contratos de `three/canvas3dContract.ts` e `three/game3dContract.ts`; o catálogo semântico de declarações do Jogo 3D também alimenta o registro geral de variáveis, e `GAME3D_OBJECT_EXPRESSION_TYPES` promove resultados de clique/mira guardados numa variável. Os demais domínios mantêm o input de fallback. Três campos, TODOS `extends Blockly.FieldTextInput` (o VALOR continua string → IR/round-trip/serialização/allowlist IDÊNTICOS a `field_input`; só troca o EDITOR — **nunca `FieldDropdown`**, que coage nome desconhecido p/ a 1ª opção e PERDE o nome no round-trip): `field_name_picker` (`blockly/fields/FieldNamePicker.ts`, nomes puros por `kind`), `field_sprite_picker` (com miniatura/swatch), `field_asset_picker` (IMAGENS do projeto, `__szAssets`). **Regra de ouro: só CONSUMIDORES viram picker; o campo que DECLARA o nome segue `field_input`** (a criança nomeia uma vez). `FieldNamePicker` tem **mais de 50 `kind`** (a união `NameKind`; cresceu muito): além dos de programação (`variable`/`group`/`class`/`function`/`property`/`method`) e 3D (`scene3d`/`object3d`/`g3d-object`/`group3d`/`entity3d`/`mold3d`/…), os de jogo 2D — `canvas`/`spritesheet`/`tilemap`/`character`/`screen`/`gamestate`/`mold`/`battler`(fichas de inimigo de batalha)/`npc`/`flag`/`item`/`map`/`region`/`path`/`look`/`sound`/`effect`/`event`/`enemytype`/`shape`/`pkmcreature`/`pkmtype`.
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
    (`<img> object-fit:contain` p/ imagem). E o **FieldColourSZ** tem o CÍRCULO CROMÁTICO:
    a "corzinha" na linha HEX é um `<input type=color>` **NATIVO** — prévia da cor atual E botão
    que abre o seletor LIVRE do navegador (arrastar preenche o input com o hex ao vivo; confirmar
    aplica no bloco; digitar hex válido espelha no swatch). ⚠️ Em 08/2026 chegou a ser trocado por
    um painel custom (`colourPickerPanel.ts`), mas a dona REJEITOU o visual e pediu a volta do
    nativo (revert em staging 05/08) — **não reintroduzir painel custom aqui sem ela pedir**.
    Estilos do swatch em `studio.css` (`.sz-hex-input-row input[type=color]` — pseudo-elementos
    não entram em cssText inline); a GRADE da paleta é centrada/espaçada via
    `[data-sz-theme].blocklyFieldColour …` (vence o CSS do plugin por especificidade; o input tem
    `min-width:88px` p/ o código `#rrggbb` COMPLETO ficar sempre visível).
  - **Bloco NOVO que declara um nome de um `kind` existente**: adicione-o ao `*_DECL_BLOCKS` correspondente em `FieldNamePicker.ts` (ex.: `VARIABLE_DECL_BLOCKS`, `SCENE3D_DECL_BLOCKS`, `OBJECT3D_DECL_BLOCKS`), senão o picker reporta "nenhum ainda". Sprite/asset têm o seu (`SPRITE_DECL_BLOCKS` no FieldSpritePicker).
  - **`kind` NOVO**: estenda a união `NameKind` + `NAME_KINDS` + `*_DECL_BLOCKS` + um `collect*` + entrada em `KIND_UI` (ícone/placeholder/empty) + um `case` no `collectGlobals`; então troque os campos consumidores.
  - **Nomes LOCAIS de laço** (o "i" do contar, o "item" do enxame): `LOOP_BINDERS_BY_KIND` + `collectScopedNames(block, binders)` sobem por `getSurroundParent` e só aparecem DENTRO do laço (swatch 🔁 "no laço"). Hoje `variable`, `object3d` e `g3d-object`.
  - **Escopo e ordem de declaração**: variáveis globais só aparecem depois do bloco que as declara; parâmetros, iteradores, `catch`, `fetch`, Promise e callbacks de extensão valem somente no ramo/corpo que os recebe. `FieldNamePicker.ts` protege a autoria e `ir/schema.ts` repete o contrato para projetos importados e para a Ponte. Não adicione um nome ao conjunto implícito para esconder uma declaração ausente.
  - **OOP escopado por CLASSE** (`property`/`method`): `blockly/blocks/classIntrospection.ts` (PURO, extraído do `argsMutator.ts` que o reusa) resolve a classe em contexto pela FORMA do bloco (`resolveContextClass`: campo/tomada `OBJ`→`classOfInstance`; sem `OBJ`→`enclosingClass`) e lista SÓ os membros dela (com herança via campo `SUPER`, guarda de ciclo); sem resolver, cai na lista global. ⚠️ NÃO importe `extendsMutator` de dentro do `classIntrospection` (ciclo via FieldNamePicker) — leia `SUPER` inline.
- **Forward-only** (atalho que não precisa voltar a si na Ponte): os blocos dedicados de CSS (fill/stroke/transform/perspective/grid/var…) e o `sz_js_set_style_text` (cssText) produzem IR GENÉRICA (`CSSRule`/`setStyle`); a Ponte reversa devolve a "Regra"/bloco genérico. Só precisam de block+buildIR+allowlist (IR reusada).
- **Container + filho (sem mutator)** p/ N itens: `sz_css_keyframes_steps`+`sz_css_keyframe_step` (animação multi-passo) e `sz_js_switch`+`sz_js_case` espelham `sz_css_rule`+`sz_css_decl` — um helper junta os filhos no buildIR (`getKeyframeSteps`/`getSwitchCases`); round-trip pelo container.
- **Elementos SVG** = `{type:'element', tag, attrs, children}` no MESMO IR do HTML: o gerador emite qualquer tag, o parser `collectAllAttrs` captura todo atributo; em `workspaceState`, `FIELD_ATTRS`/`ID_FIELD_TAGS` dizem quais atributos viram CAMPO de bloco (o resto round-trippa via `data`). Tags SVG vivem em `HTMLTagSchema` + `SUPPORTED_TAGS`/`CONTAINER_TAGS` (parser). O SVG INTEIRO é **intermediario-2d** (26/07 — primitivo visual gentil, um degrau antes do Canvas imperativo); os blocos cobrem acessibilidade (`title`/`desc`) e reutilização (`defs`/`symbol`/`use`). Formas declaram `ID` em texto; `use.HREF` consome esses ids pelo `field_name_picker` `svg-reference`. Paint usa `field_svg_paint` (paleta + texto livre), pois `none`/`currentColor`/`var(--cor)` precisam sobreviver exatamente. Ao importar código, defaults visuais NÃO podem inventar atributos: ausências ficam vazias e `href` × `xlink:href` é preservado. `svgPedagogy.test.ts` é o contrato exaustivo entre catálogo, níveis, grupos, campos e tooltips.
- **SVG dinâmico**: `createElementNS` só vira SVG quando o namespace literal é exatamente `http://www.w3.org/2000/svg` (outros namespaces permanecem código bruto) + `getAttribute`; `setAttribute`/`appendChild`/loop de quadro (`sz_canvas_anim_loop` = requestAnimationFrame no núcleo) já existem. Em layout compacto, o Blockly usa toolbox horizontal para deixar a largura inteira disponível aos blocos; o E2E `svg.spec.ts` protege o fluxo e a largura em 375 px.
- **`agora: …`** (`sz_val_date_part` → `new Date().getHours()…`, numérico, p/ relógios); `getFullYear` continua sendo o `now` string (NÃO vira `dateGet`).
- **Tela cheia** (`sz_js_request/exit/toggle_fullscreen` + `sz_val_is_fullscreen` + evento `fullscreenchange`): ⚠️ exige `allow="fullscreen"` no iframe (`components/preview/PreviewIframe.tsx` + `StudioProjectPlayer.tsx`), senão `requestFullscreen()` rejeita em silêncio.
- O CSS criativo (variáveis `--x`/`var()`, grid, 3D `rotateX`/`perspective`, pseudo `:hover`/`::before`) JÁ funciona pela "Regra CSS" + "propriedade: valor" genéricas (o parser preserva seletor/propriedade/valor livres); os blocos dedicados são só atalho de UX.
- **VALOR com CORPO de statements** (ex.: `sz_val_new_promise` → `new Promise((resolve) => {…})`, lote P9): um bloco de VALOR (`output`) com um `input_statement`. Três gotchas: (1) `blockToExprInner` (buildIR de valores) NÃO recebe `seen` — passe `getStatementChildren(block, 'DO', new Set())` (árvore de blocos não cicla); (2) o `generators/expr.ts` é a camada de BAIXO (o `js.ts` importa dele) e NÃO compila statements — o `js.ts` INJETA `compileStatements` via `_setExprStatementCompiler(fn)` no load, e o `compileExpr` do valor lê `rec?.indent` (novo campo de `ExprMapContext`, alimentado pelo `recAt` do `js.ts`) p/ indentar o corpo (o corpo compila SEM source map — os dois compiladores usam tipos de mapContext diferentes); (3) `collectExprIdentifiers` do valor tem que recursar o corpo via `collectStatementIdentifiers`.
- **Matcher de VALOR que precisa de `bodyOfFn`/`asRaw`** (lê `source`): o `toExpr(node, ctx?)` NÃO recebe `source`. O `ParseCtx` ganhou o campo **`source`** (semeado no construtor do ctx) — use `ctx.source` (ex.: `matchNewPromise` chama `bodyOfFn(arg, ctx.source, ctx)` de dentro do `case 'NewExpression'`).
- **Comentário** (HTML `<!-- -->` / CSS `/* */`, lote P9): nós `{type:'comment', text}` em `HTMLNode`/`CSSEntry` + blocos `sz_html_comment`/`sz_css_comment`. O parser guarda só o MIOLO (regex `/^\/\*([\s\S]*)\*\/$/` no CSS; `node.textContent` no HTML) e o gerador reconstrói os delimitadores — byte-exato. Antes viravam `rawHTML`/`rawCSS` "avançado" (teste que fixa isso PRECISA ser atualizado p/ o nó `comment`).
- **⚠️ Colisão de nome de bloco**: ANTES de nomear um bloco novo, `grep` o tipo — o lote P9 quase duplicou `sz_js_on_click` (que JÁ existia = `addEventListener('click')`, target por id-string); o `.onclick = () => {}` virou `sz_js_element_onclick`. Um `case` duplicado no `switch` do buildIR não dá erro de TS (o 1º vence, o 2º vira código morto) — a colisão passa silenciosa.
- **Flag booleana num bloco existente** (ex.: função ou método `async`, lote P9): `field_checkbox` no `message0` (valor `'TRUE'`/`'FALSE'`; buildIR `f(block,'X') === 'TRUE'`, workspaceState `X: v ? 'TRUE' : 'FALSE'`). ⚠️ Se o bloco tem MUTATOR, confira que o mutator só mexe no PRÓPRIO input (o `sz_params_mutator` gerencia só o `PARAMS_INPUT`, então o checkbox do `message0` sobrevive) — um mutator que reconstrói o bloco via `jsonInit` apagaria o campo.

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

### Editar o desenho + ele se atualizar sozinho nos jogos (mão DUPLA, 08/2026)

A ponte deixou de ser mão única. Duas peças:

**1. Botão "Editar"** — prop de host nova **`onEditDrawing?: (drawingId) => void`**
(`studio/types.ts` → latch no `StudioCore` → contexto `studio/edit-drawing.ts`, molde exato do
`onCloudSync`). O `AssetsPanel` mostra `✏️ Editar` em "Meus desenhos" E `✏️ editar desenho` no card
de "No projeto" (só quando `libId` é `personal:*` **e** o desenho ainda existe na biblioteca — apagado
no Pinta esconde o botão em vez de abrir editor vazio). Sem a prop, nenhum botão: aula e admin
seguem intocados. O host (kids) abre `/pinta?desenho=<id>` em aba nova.

**2. Sincronia de volta** — `src/asset-library/personalSync.ts`
(`syncDrawingsIntoProjects(storeApi)`), disparada pelo `DrawingSyncWatcher` (montado no `Shell`, no
`focus`/`visibilitychange`) e ao abrir o painel de Imagens. Alcança **TODOS os jogos da criança**
(decisão dela), não só o aberto:

- **Portão barato:** marcador `localStorage sz:desenhos-alterados:<ns>` (escrito por
  `savePersonalAsset`/`removePersonalAsset`) × relógio em memória da aba. Igual ⇒ sai sem tocar no
  IndexedDB. `localStorage` (e não BroadcastChannel) pelo MESMO motivo do `blockClipboard`: precisa
  sobreviver à aba fechada e ser lido sob demanda. A chave leva o namespace — irmão não dispara
  sincronia do irmão.
- **Projeto ABERTO** vai pela store (`updateAssetImage`, ação NOVA no `projectStore`); os demais pela
  partição de assets (`loadProjectAssetsById`/`persistProjectAssets`, par novo em `persistence.ts` —
  ⚠️ o persist esquece o id no `lastPersistedAssetsRef`, senão o dirty-check por referência mentiria).
- **A comparação é de BYTES** (`dataUrl`), não de `updatedAt`: nada mais escreve pixels no asset do
  projeto. Zero campo novo no `ProjectAsset`, zero migração, e já cobre assets anteriores à feature.
- ⚠️ **`updateAssetImage` NUNCA toca em `name`/`id`/`libId`/`source`** — os blocos referenciam o asset
  PELO NOME (`FieldAssetPicker` serializa a string). Metadados: o desenho novo traz os dele → valem
  os dele; não traz e a geometria é a mesma → preserva o do projeto (peças/mapa do `TileConfigDialog`
  não existem no Pinta); geometria MUDOU → descarta (índices inválidos).
- **Silenciosa no sucesso** (decisão dela), **nunca na recusa**: cota estourada vai para
  `takeDrawingSyncFailures()` e o painel de Imagens mostra ao abrir.
- Preview, miniaturas de bloco e export reagem sozinhos (identidade nova de `project.assets`).

Testes: `personalSync.test.ts` + `components/assets/AssetsPanelEditDrawing.test.tsx`. O playground
liga a feature (`setPersonalAssetsNamespace('playground')` + `onEditDrawing`) — QA em navegador real
feito: jogo aberto, jogo FECHADO, preview e as duas miniaturas.

### "Trazer do Pinta" — fluxo PULL (08/2026, substitui a seção "Meus desenhos")

A dona rejeitou a lista "Meus desenhos" (enorme, sem busca, sem saber o que já foi trazido). O
fluxo virou PULL: prop de host **`pintaLibrary?: StudioPintaLibraryAdapter`** (`studio/types.ts` →
latch no `StudioCore` → contexto `studio/pinta-library.ts`, molde exato do `onEditDrawing`; tipos
ESPELHO — o Studio segue sem importar o pinta). Com ela presente, o `AssetsPanel` ganha o botão
**"🎨 Trazer do Pinta"** na barra (a barra renderiza com `allowUpload || pintaLibrary`; os uploads
seguem gated por `allowUpload`) e **a seção "Meus desenhos" some** — o fallback (perfil sem posse
do Pinta → host não passa o adapter) mantém a lista antiga. ⚠️ O EFEITO de carga/sincronia do
painel fica vivo nos dois casos (alimenta o auto-update e o `editableDrawingIds`).

- **`PintaImportDialog`** (modal ANINHADA, precedente TileConfigDialog): busca
  (`filterPintaDrawings` puro + `core/searchText.ts normalizeSearchText`, extraída do KitGallery),
  grade de cards (miniatura ou emoji do papel, selo do tipo, selo `jogo: <nome>`), selo
  **"✓ no projeto"** derivado do `libId personal:<id>` dos assets do projeto; adicionar chama
  `adapter.import(id)` → `addAsset` (clone do addFromPersonal; `uniqueAssetName` compartilhado em
  `components/assets/assetNames.ts`); a modal FICA aberta (multi-import). ⚠️ Card já no projeto
  mostra **SÓ o selinho, sem botão** (decisão da dona — o "Adicionar de novo" com sufixo `-2`
  existiu por um dia e foi cortado: trazer a mesma arte duas vezes não é caso de uso da criança).
  Erro `code: 'not-found'` remove o card.
- **O import do host grava em personal-assets ANTES de devolver** — é o que preserva a mão-dupla
  (guard `getPersonalAsset` do resync) e o botão editar. O Studio usa o `name` DEVOLVIDO (o upsert
  pode sufixar).
- **Lado Pinta**: subpath `@sistemazero/pinta/studio-library` (`listGalleryForStudio` +
  `exportAssetForStudio`); o foguete "Usar no Estúdio" agora só aparece em desenho com
  `projectRef` (missão do Pensa) — ver o CLAUDE.md do pinta.
- ⚠️ **Fix no `Modal` (#ui) que a modal aninhada expôs:** o `cancel` do dialog DE CIMA borbulha
  pela árvore REACT (portal propaga pelo componente, não pelo DOM) e fechava OS DOIS — o
  `onCancel` agora ignora `e.target !== e.currentTarget` (valia também para o TileConfigDialog).

Testes: `components/assets/PintaImportDialog.test.tsx` (⚠️ fixtures com nomes que NÃO colidem com
o starter pack — `heroi` da ASSET_LIBRARY quebra `getByText`). QA browser no playground (:5173,
fake `pintaLibraryDemo` no App.tsx que grava de verdade na biblioteca): busca com acento, import,
selo ✓, sufixo -2, Esc fecha só a de cima, "✏️ editar desenho" aparece após o import.

**Full review (02/08) — 4 correções, todas com teste:**
1. ⭐ **Jogo aberto NO MEIO da varredura perdia a atualização.** O id do projeto aberto era capturado
   UMA vez, antes do laço; a varredura roda no foco da aba, que é exatamente quando a criança clica
   num jogo. Abrir P depois do passo 1 fazia a varredura gravar a partição de P por fora — e o
   autosave do editor (com a cópia VELHA em memória) desfazia, em silêncio. Fix: reler
   `storeApi.getState().project?.id` a CADA volta + repetir o passo do projeto aberto no FIM.
2. **Jogo fechado podia estourar a cota.** O caminho do disco não checava
   `maxAssetsTotalChars`; passar do teto faz o `sanitizeProjectAssets` do LOAD **descartar** imagens
   — o jogo abriria com arte faltando, sem aviso. Fix: mesmo orçamento da store, e a recusa entra no
   `pendingFailures` nomeando o jogo.
3. **Duas varreduras no mesmo evento** (painel aberto = observador de foco + painel): `inFlight`
   compartilha a promessa.
4. `EMPTY_RESULT` era uma constante compartilhada com um array mutável → virou `emptyResult()`.

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
extensão. game-2d bump `0.19.0→0.20.0` (tile picker); o manifest atual está em **`0.69.0`** (`src/official-extensions/game-2d/manifest.ts`). Testes: `core/assetMeta.test.ts`, `blockly/fields/__tests__/
FieldAnimationPicker.test.ts` (resolveAnimations/resolveTileset + ANIM não-serializado). **😈 Inimigos (v0.22):** grupos de inimigos por `field_sprite_picker` "inimigo" + comportamentos (perseguir/patrulhar/etc.) em `blocks.ts`. **🎨 Desenho — sprite por código (v0.23):** figura nomeada desenhada em código (`g2d:defineShape` + `paint_*`/Canvas no `runtime.ts`, exemplos em `examples.ts`) vira skin custom do sprite.
**Mostrar a borda da tela (v0.54.0, 01/08):** bloco `sz_g2d_stage_border` em ✨ Aparência
("Mostrar a borda da tela, cor ⟨⟩ espessura ⟨4⟩", `start-only-command`), na família de tornar
visível o invisível (caixa de colisão / FPS): moldura em volta do palco p/ ENSINAR onde começa e
termina a área do jogo. ⭐ A borda vai no **ELEMENTO** (`c.style.border` no runtime
`showStageBorder`), não desenhada por dentro: não gasta pixel do jogo, nada a apaga e custa zero por
quadro; o `box-sizing: border-box` (que `fitScreen`/`setupStage` já usavam justamente p/ isso)
mantém a moldura DENTRO da caixa — sem ele viria barra de rolagem e em tela cheia a borda cairia
fora da janela. Espessura capada em 40 (um `9999` digitado não engole o jogo). ⚠️ **Bloco
`start-only` tem um ponto a mais na cadeia que é fácil esquecer:** o tipo da IR precisa entrar em
**`START_ONLY_STATEMENT_TYPES`** (`ir/lifecycle.ts`) — sem isso o schema ACEITA o bloco aninhado num
evento/laço e o `blockContracts.test.ts` reprova ("preparações exclusivas de Ao iniciar"). Um bloco
NOVO também obriga a mexer em 3 contadores travados: `docDrift.test.ts` (`gameTwoDBlocks.length`) e
duas linhas do `docs/game-2d-audit-2026-07-20.md` (definições de bloco / visíveis / métodos públicos
da API). Teste: `__tests__/stageBorder.test.ts`.

**Sprite de grupo com NOME (v0.53.0, 01/08):** os dois blocos genéricos de criar no grupo
(`sz_g2d_spawn_in_group`/`_image_in_group`) ganharam o campo **`NAME` OPCIONAL** ("criar um sprite
**chamado** …"). Preenchido, a IR leva `varName?` e o gerador emite `const ⟨nome⟩ = SZGame2D.spawn(…)`
— o helper do runtime JÁ devolvia o sprite, então **nada mudou no motor**. É o que destrava ANIMAR um
sprite de grupo: encaixar "Animar sprite ⟨nome⟩" logo abaixo do criar, no mesmo trecho (⚠️ **ISTO MUDOU
em 08/2026, v0.63.0** — `setAnimation` passou a ter GUARDA DE TRANSIÇÃO: re-chamar com os MESMOS
argumentos não reinicia o tempo, então dentro do "a cada quadro" ela roda normalmente em vez de
congelar no 1º quadro. É mudança de comportamento num bloco JÁ enviado, e deliberada: o gk sempre
guardou assim e o comentário de lá chamava isso de "padrão g2d" — que o g2d não tinha. Efeito
colateral: não dá mais para reiniciar uma animação de LOOP re-chamando com os mesmos valores.). ⭐ Vazio ⇒ a chave NÃO entra na IR e a saída fica **byte-idêntica** à de antes
(projeto antigo intocado) — mesma régua do `shape` no `defineEnemyType`. As duas entradas em
`G2D_DECLARATION_FIELDS` (`ir/schema.ts`) dão de graça o símbolo, a recusa de nome repetido e o
ESCOPO (nome criado dentro de um temporizador vale só ali). Parser: `case 'spawn'` no
`tryMatchGame2DVarInit` (forma com `const`) convivendo com o caminho statement de sempre. Os blocos
entraram em `SPRITE_DECL_BLOCKS` (miniatura no seletor); ⚠️ `collectSprites` é GLOBAL (sem escopo),
então o nome aparece no seletor fora do trecho — usar lá é pego pela validação da IR. Testes:
`__tests__/spawnNamed.test.ts` (saída byte-idêntica sem nome, `const` com nome, parser das duas
formas, escopo e runtime: o nomeado É o mesmo objeto do grupo e cada um anima no próprio ritmo).
**"Pôr o sprite ⟨X⟩ no grupo ⟨G⟩" SAIU do backlog (v0.58.0, 05/08):** `sz_g2d_add_to_group` em
📦 Muitos (espelho do "Tirar do grupo"; runtime `addToGroup(grupo, sprite)` — dedup + teto
`MAX_GROUP`, mesma régua do spawn). Nasceu porque o Zappy sugeriu esse bloco sem ele existir.
**Falta ainda** (conversado com a usuária): animação por ESTADO no grupo (espelho do
`setEnemyStateAnimation`).

**Nadar e voar (v0.55.0, 01/08):** três jeitos NOVOS de o sprite se mover em 🕹️ Movimento, todos
`command` como o `platformer` e todos em `runtime/inputAndMotion.ts`. Antes deste lote a extensão tinha
plataforma, 4 direções, ponteiro e nave; **nadar não existia** e voar só existia como COMPORTAMENTO de
inimigo (`voador`/`voador-vertical` dentro do `updateEnemyType`), inacessível ao jogador.

- **`sz_g2d_fly_free`** "voar livre, velocidade ⟨3⟩" → `flyFree(sprite, speed)`: SEM gravidade, acelerando
  enquanto a tecla está apertada e PLANANDO ao soltar. O número digitado é a velocidade MÁXIMA (teto pelo
  módulo, `_clampSpeed`), mantendo o significado do campo igual ao dos vizinhos.
  ⚠️ **A INÉRCIA é a ÚNICA coisa que separa este bloco do `topDown`** — que também anda na diagonal (o
  rótulo dele diz "4 direções", mas o código trata os dois eixos e normaliza) e também não tem gravidade.
  A 1ª versão saiu com 0.35 de aceleração e 0.9 de planeio: arrancada em 3 quadros, virada em 6, deslize
  de 27px. A usuária testou e disse "não vi muita diferença prática" — estava certa, ninguém enxerga 3
  quadros. Retunado para **0.10 / 0.96** (medido com velocidade 3: topo em 0,17s, deslize de 72px por
  2,3s; ao inverter, cruza o zero e muda de direção em ~0,18s, chegando ao teto oposto em ~0,33s).
  Quem mexer nesses dois números precisa medir de novo; o teste
  "a INÉRCIA é o que separa do 4 direções" existe exatamente para isso.
- **`sz_g2d_flap`** "bater as asas, força ⟨8⟩" → `flap(sprite, ctx, force)`: clone honesto do
  `jumpOnGround` (`arcadeKits.ts`) **sem a exigência de estar no chão**. Gravidade do mundo, chão na
  borda visível (por isso leva `ctx`, como o `platformer`) e impulso na BORDA de ↑/W/Espaço **ou de um
  toque** — o mobile vem de graça. ⚠️ A borda é por SPRITE (`sprite._flapHeld`), não a variável de módulo
  do `jumpOnGround`: dois pássaros na mesma tela precisam bater as asas cada um no seu.
- **`sz_g2d_swim`** "nadar, velocidade ⟨2⟩" → `swim(sprite, speed)`: empuxo = `_worldGravityOr(0.6) *
  0.18` (afunda devagar parado, sobe segurando ↑) + arrasto 0.88 nos dois eixos + teto. ⭐ Com a
  gravidade do mundo em **0** o bicho fica BOIANDO — o `gravityConfigured` já distingue "0 declarado" de
  "nada declarado", então isso sai de graça e é coerente com o resto do motor.
- **Animação sem estado novo:** voar livre e nadar chamam `_leaveGroundMode(s)` (as duas linhas de
  `delete onGround/_groundedLastFrame` que o `topDown` já fazia, agora extraídas) — sem isso o
  `_resolveAnimState` classificaria um peixe nadando como **"caindo"**. Assim eles usam
  andando/vertical/parado, que já existem. O bater as asas mantém `onGround = false` de propósito:
  "pulando/caindo" é o certo ali. Migalha de velocidade vira 0 (`< 0.01`), senão "está se movendo?"
  ficaria verdadeiro para sempre e a animação nunca voltaria p/ "parado".
- Contadores: blocos **210 → 213**, API **209 → 212**, manifest **0.54.0 → 0.55.0**, mais as 4 linhas de
  inventário do `docs/game-2d-audit-2026-07-20.md`. Teste: `__tests__/swimAndFly.test.ts` (16).
- **Fora de escopo** (combinado com a usuária): estados de animação "nadando"/"voando" (mexeria no enum
  `G2D_ANIM_STATES`, nos 2 dropdowns de estado, na cadeia de fallback e no parser) e água como LUGAR do
  mapa (entrar na água e passar a nadar sozinho) — ela escolheu "o jeito do sprite o tempo todo".

**Full review do Jogo 2D (v0.55.1, 02/08):** o ponteiro passa a descontar a moldura do canvas ao
converter coordenadas CSS para o palco lógico; formas customizadas aninhadas restauram `_shapeW` e
`_shapeH` com pilha segura; e o reinício recompõe a descrição acessível base, permitindo anunciar a
mesma tela terminal novamente. O contrato do runtime agora valida tipos, ordem e nomes de parâmetros
contra `GameTwoDRuntimeApi`, além da lista de chaves. Os 17 exemplos grandes de Clear Code e Games 2D
moram em módulos individuais sob `examples/clearcode/` e `examples/gamesTwoD/`, com barrels compatíveis
e hashes de conteúdo preservados; seus quatro contratos repetidos de drift/fixpoint/round-trip ficam no
harness único `__tests__/exampleContractHarness.ts`.

**Remediação arquitetural do Jogo 2D (v0.55.4, 02/08):** `_overlapBroadPhase` consome `_hitboxOf`
(mesma geometria do teste exato); `pointerdown` só nasce no `_stageCanvas`; runtime e preview deduplicam
ids preservando a primeira ordem. `_resizeBacking` limita DPR 3, dimensão 8192 e 16.777.216 pixels;
tilemaps manuais limitam 1M caracteres, 512×512 células e 512 sólidos, com `warnOnce`. O player/preview
anunciam a carga lazy e a API principal é `renderProjectToPreviewDocAsync`. Os 31 exemplos têm metadados
editoriais; `KitGallery` mostra o percurso Pegue a moeda → Herói que anda → Mini plataforma → Sala com
paredes, além de busca/filtros e “Ver todos”. A paleta de 211 blocos permanece intacta por decisão explícita.

## Jogo 2D — inimigos COMBINÁVEIS + 18 comportamentos (v0.60.0, 07/08)

A subcategoria 😈 Inimigos tinha 6 comportamentos MUTUAMENTE EXCLUSIVOS num dropdown, e o
despacho era uma cadeia `if/else` sobre `config.behavior` dentro do laço de itens, com cada ramo
sobrescrevendo `vx`/`vy` por conta própria. "Patrulha E atirador" era impossível: para ter três
comportamentos a criança criava três TIPOS (3× gravidade, 3× atualizar, 3× desenhar, 3× derrotado).

- ⭐ **Domínio próprio**: os inimigos saíram do `runtime/arcadeKitsSpace.ts` (l.210-536, onde
  moravam por acidente histórico) para **`runtime/enemies.ts`**, com `_registerRuntimeDomain('enemies')`
  e o reset de `_enemyTypeCreates` junto (saiu do `'arcade-kits'` no `arcadeKitsGorillas.ts`).
- ⭐ **Tabela de EIXOS no lugar do if/else**: `ENEMY_BEHAVIORS` mapeia nome → `{x, y, flying, act,
  immortal, revive, boss, move}`. Por chamada de `updateEnemyType` (não por item) resolve-se
  `ownerX`/`ownerY`/`flying`/`acts`: **por eixo vale o ÚLTIMO da lista que o dirige** (é o que faz
  o "Somar" ter sempre efeito visível) e **as ações rodam todas**. Sem dono do X ⇒ `vx = 0`; sem
  dono do Y ⇒ voa? `vy = 0` : integra vy + `_resolveGravityGround` (o de sempre). Quem dirige os
  DOIS eixos recebe `(ownX, ownY)` e escreve só o que venceu — é isso que faz perseguidor+saltador
  perseguir no chão pulando.
- ⚠️ **A compat é quadro-a-quadro, não "parecida"**: os 6 ramos foram portados VERBATIM para
  funções, e a Etapa 1 rodou com a tabela contendo só os 6 antigos — `enemies.test.ts` (que assere
  posições e cadências EXATAS) e os playthroughs passaram **sem uma edição**. Faça o mesmo se
  mexer aqui: transcreva primeiro, só depois acrescente.
- `config.behaviors: string[]` é a fonte da verdade; **`config.behavior` continua sendo o valor de
  NASCENÇA e nunca é mutado** (o teste o assere no create). Nome desconhecido no ÍNDICE 0 da lista
  resolve como `patrulha` — era o `else` da cadeia antiga, e sem esse ramo o modo Código regrediria
  em silêncio para "parado".
- **`sz_g2d_enemy_add_behavior`** ("O tipo de inimigo ⟨X⟩ também é ⟨Y⟩",
  `placement: 'command'` de propósito: serve a ONDAS). Dedup **move para o fim** (somar de novo o
  que já está passa a mandar). Nome fora do enum é recusado na entrada com aviso 1×/tipo.
- **`sz_g2d_stomp_enemy`** ("Derrotar os inimigos do tipo ⟨X⟩ quando o sprite ⟨Y⟩ pular em cima,
  quique ⟨8⟩") — o pisar no Goomba, que só existia na gk (`stompKill`). Exige `isColliding` E estar
  caindo nele (invertido sob gravidade negativa via `_gravityPullsUp`). Marca `e.hp = 0` **e
  `e.dmg = 0`**: a morte segue sendo do `updateEnemyType` (partículas + "quando for derrotado" +
  aborto de geração num lugar só), e o dano zerado faz o `hurt_by_enemy` do MESMO quadro virar
  no-op de verdade (`damageSprite` sai cedo com `damage <= 0`) — sem isso o pulo certo virava castigo.
- **12 comportamentos novos** (6 → 18), todos determinísticos, **zero `Math.random` no caminho da
  posição**: parado, fugitivo, investida · rondador, mergulhador, teleporte, zigue-zague ·
  atirador-leque, bombardeiro, espinho (nunca morre), ressuscitador (fila `type._revives`, capada
  em 100), chefão (vida ×5 uma vez por inimigo via `s._boss`, `env.speed` à metade).
  `chefao` e `atirador-leque` compartilham a MESMA função de ação, e a montagem de `acts`
  **deduplica por função** — juntos disparam uma rajada só.
- Contadores por ação PRÓPRIOS (`_scd` atirador, `_lcd` leque, `_bcd` bomba, `_tcd` teleporte):
  somar dois atiradores não divide a cadência de nenhum.
- Params: **uma opção nova** no dropdown do "Ajustar no tipo de inimigo" (`voltar` →
  `reviveRate`, default 180). Acrescentar OPÇÃO a dropdown existente é o acréscimo seguro
  (projeto salvo mantém o valor e a saída) — mesmo precedente do `LAYER` da gk que ganhou `'frente'`.
- ⚠️ **Campo por-eixo, não por-comportamento**: `_dir` é a direção do eixo X e pertence a quem
  GANHOU o X; `_dirY` é a do Y. Como só o vencedor de cada eixo roda, dois donos do mesmo eixo
  nunca se atrapalham. O `voador-vertical` chegou a usar `_dir` (herança do código antigo, onde só
  um comportamento existia por vez) e isso fazia a patrulha VIRAR na horizontal toda vez que ele
  batia no limite de cima. Comportamento novo que guarde direção: escolha o campo pelo EIXO.
- Contadores travados que este lote mexeu: `docDrift` 219 → **221**, audit md (221 definições /
  219 visíveis / **220** métodos / **125** arquivos / **22** módulos), catraca de parâmetros
  751 → **829**, e a versão aqui. Testes: `__tests__/enemies.test.ts` foi de 26 para **83** casos.

### Full review dos inimigos (07/08, mesmo lote) — 8 correções

Review adversarial em 3 lentes logo depois de escrever a feature. Achados que viraram correção,
todos com teste de regressão em `enemies.test.ts` (`describe('combinações que já quebraram')`):

1. ⭐ **Espinho pisado virava enfeite para sempre.** `stompEnemyType` zera `e.dmg` contando que o
   inimigo morra no mesmo quadro; o espinho não morre, e nada devolvia o dano. O combo mais natural
   do mundo (plataforma + espinho + pisar) deixava o espinho inofensivo o jogo inteiro. A vida
   restaurada também voltava para `c.hp` em vez do teto do PRÓPRIO inimigo (chefão-espinho ficava
   3/15 na barra para sempre).
2. ⭐ **Perseguidor que só ganhou o X andava a passo de formiga.** O vetor era normalizado em 2D e
   só depois filtrado por eixo: com o alvo 250px acima e 10px ao lado, `vx` saía 0,12 px/quadro.
   Justo no combo-vitrine (perseguidor + saltador). Agora, com posse de UM eixo, a velocidade vale
   naquele eixo.
3. **Somar chefão CURAVA o inimigo** (o comentário jurava o contrário): `setHealth` grava hp E
   hpMax. Virou buff de teto que preserva o dano já levado.
4. **`parado` era um no-op ao ser somado**: não dirigia eixo nenhum, então nunca vencia. O rótulo
   promete "fica no lugar" e o inimigo continuava perseguindo. Agora dirige os dois eixos.
5. **Fugitivo/investida grudavam na CÂMERA**: o clamp usava o retângulo visível, que anda com a
   câmera, então um inimigo parado lá atrás era arrastado pelo mundo colado na borda. Agora só
   segura quem já estava dentro antes de andar (isso também curou o inimigo mais largo que a tela,
   que os dois ifs independentes empurravam para fora).
6. **Mergulhador travava em mergulho eterno** quando outro comportamento tomava o eixo Y: a saída
   do estado olha o `y`, que ele não movia. Agora só mergulha se for dono do Y.
7. **Nome herdado de `Object.prototype`** (`'toString'`, `'constructor'`) passava por comportamento
   válido, e no modo Código o inimigo ficava inerte em vez de cair no padrão. `hasOwnProperty`.
8. **Drift do dropdown**: a auditoria T6 só cobre "opção que não existe no enum". A direção
   perigosa (valor novo no enum esquecido no dropdown, que faz o `FieldDropdown` coagir para a 1ª
   opção e mudar o inimigo da criança sozinho) ganhou teste próprio no `docDrift`.

### Segundo full review, o mesmo dia — 9 correções + a fila de renascer

O primeiro review produziu MUITO código (as 8 correções, os 3 avisos, os renomes) que ninguém
tinha revisado. A segunda rodada mirou só nisso, e valeu:

1. ⭐ **O aviso de "ninguém os desenha" acusava quem estava certo.** O tipo de inimigo É um grupo e
   o seletor de **"Desenhar o grupo ordenado pela base"** o lista: num jogo visto de cima esse é o
   bloco CERTO (é o que faz o herói passar atrás do monstro). O `_drawn` só era marcado em
   `drawEnemyType`, então a criança via o aviso com a tela cheia de inimigos. Agora quem marca é o
   `drawGroup`/`drawGroupByY`, no ponto em que o desenho de fato acontece.
2. ⭐ **O buff do chefão RESSUSCITAVA um inimigo morto.** Sem guarda de `hp > 0`, um inimigo morto
   no quadro anterior (padrão de onda: solta depois do update) tinha o primeiro update dele já com
   vida 0, e o buff o trazia de volta com 12/15 antes da poda.
3. **`parado` derrubava quem voa**: chamava `_resolveGravityGround` sem consultar `flying`, então
   somar "parado" a um fantasma o fazia cair até o chão. O `env` passou a carregar `flying`.
4. **O clamp nunca segurava inimigo nascido EM CIMA da borda** (padrão de onda). A guarda "estava
   todo dentro" era permanente daquele lado; virou "estava ENCOSTANDO na tela", o que também curou
   o inimigo mais largo que a tela.
5. **O mergulhador escrevia `_dir` sem ser dono do X** — a mesma classe do bug do voador-vertical
   que a rodada 1 corrigiu, num arquivo que a rodada 1 mexeu. Somado a uma patrulha, virava a
   marcha dela sozinho no meio do caminho.
6. **Mergulho em curso que PERDE o eixo Y ficava preso**: a saída do estado olha o `y`, que ele não
   move mais. A guarda da rodada 1 cobria só a ENTRADA. Agora aborta.
7. **A janela dos avisos contradizia o próprio comentário.** Eram disparos num quadro FIXO (360);
   o comentário prometia tolerar a "fase 2". Viraram contadores de quadros SEGUIDOS que zeram
   sozinhos quando a criança liga a peça que faltava (desenho e alvo em 360; ajuste órfão em 1800).
8. **O aviso de alvo afirmava algo falso** ("então ele fica parado"): com patrulha + atirador o
   inimigo anda normalmente, só não atira. Se o Console mente uma vez, ela para de ler.
9. **O tooltip do "Ajustar" incluía `teleporte` na velocidade do tiro** e o mapa (corretamente) não:
   o aviso novo passaria a contradizer o tooltip na cara dela.

⭐ **A fila de renascer ganhou dono.** `type._revives` não era esvaziada por nada, e um tipo reusado
entre fases fazia os mortos da fase 1 nascerem nas coordenadas velhas. O gancho certo já existia e
é o gesto que a criança usa: **"Esvaziar o grupo"** (tooltip: "ex.: ao reiniciar a fase"), e o tipo
aparece naquele seletor porque É um grupo. Agora `clearGroup` zera a fila junto. No mesmo lugar, o
slot deixou de sumir em silêncio quando o grupo está no teto (`spawnEnemy` devolve null): ele fica
na fila e tenta no quadro seguinte.

⚠️ **A lição de teste que ficou**: nenhum teste de comportamento soltava mais de UM inimigo, então
todo estado por-inimigo (`_scd`, `_lcd`, `_ang`, `_tside`…) era indistinguível de estado por-TIPO —
trocar `s._ang` por `c._ang` passaria na suíte inteira. Entrou um `describe('dois inimigos do MESMO
tipo')`. Mesma classe: os comportamentos simétricos só eram exercidos para um lado (fugir para a
esquerda, virar na borda direita), então metade de cada `if` nunca rodava.

### Lote de pedagogia do mesmo review (07/08)

A revisão pela lente da criança pegou coisas que os testes nunca pegariam. Vale como molde:

- **Rótulo que descreve o estado ISOLADO mente no mundo combinável.** "atirador (fica no chão e
  atira no alvo)" era verdade sozinho (o fallback do eixo Y resolve o chão) e mentira somado a um
  voador. Regra nova: o rótulo diz só o que aquele comportamento ACRESCENTA.
- **A ordem da gaveta ENSINA a receita.** Os 12 blocos foram reordenados para os quatro primeiros
  serem criar, soltar, atualizar, desenhar: quem arrasta os primeiros que vê tem que ver inimigo
  na tela. O "também é" é tempero e não pode furar essa fila.
- **O dropdown de 18 é agrupado por família** (anda no chão, voa, o que faz) e travado contra o
  enum no `docDrift`. Blockly não tem separador em `FieldDropdown`, então a ordem e o parêntese
  são a única marcação possível; o maior dropdown da extensão (`sz_g2d_play_fx`, 27 opções) já
  resolvia assim.
- **Parêntese de dropdown diz para que SERVE, não de quem é.** O menu do "Ajustar" nomeava um
  comportamento por linha ("alcance do voo (voador)") enquanto o alcance serve a oito deles.
- **Nomes**: `investida`→`arrancada`, `fugitivo`→`medroso`, `ressuscitador`→`renascer` (valor E
  rótulo, para o modo Código não divergir do bloco). Face do combinar virou **"O tipo de inimigo
  ⟨X⟩ também é ⟨Y⟩"** (encaixa na frase do "Criar tipo … que é …" logo acima); a do pisar trocou
  "quique" por "(dando um pulinho de ⟨8⟩)".
- **3 avisos pedagógicos novos** em `_warnEnemySetupOnce`, no molde dos dois que já existiam
  (citam o bloco pela FACE, dizem onde pôr, disparam uma vez, com janela de graça de 360 quadros):
  atualizou e nunca desenhou; ajustou um valor que nenhum comportamento do tipo usa; comportamento
  que precisa de alvo com o campo "alvo:" vazio. ⚠️ A checagem do ajuste roda no UPDATE, não no
  `setEnemyTypeParam`: a ordem normal de montar é ajustar a cadência ANTES de juntar o atirador,
  então conferir na hora daria falso-positivo.
- ⚠️ **O que o `blockContracts.test.ts` NÃO cobre**: os `console.warn` do runtime são copy de
  produto (aparecem no Console da IDE, em português, escritos para criança) e nada vigia travessão
  neles.

## Jogo 2D — jogo de NAVE: inteligência, raio e chefão (v0.61.0, 07/08)

Ela quis montar um shoot-em-up com inimigos de cinco níveis de inteligência, um raio de 3s e um
chefão que renasce. O levantamento mostrou que **metade já dava** com os 18 comportamentos
combináveis (burro = patrulha+bombardeiro; avançado = perseguidor+atirador; rei que renasce = 2
tipos + o evento de derrota; bônus = qualquer bloco no corpo do evento; 50% de anular dano = o
"se ⟨tem chance de 50%?⟩" em volta do "Mudar a vida"). O lote fechou só o que faltava.

- ⭐ **`sz_g2d_define_enemy_smart`** — "Criar tipo de inimigo ⟨alien⟩ **com inteligência** ⟨burra⟩ …",
  irmão do define de sempre (regra de 02/08: variação = bloco NOVO ao lado). Cada nível semeia um
  pacote em `config.behaviors` via `ENEMY_SMART_COMBOS`; o "também é" soma por cima, que é como um
  inimigo burro ganha um raio. burra=patrulha+bombardeiro · basica=patrulha+atirador-alinhado ·
  avancada=perseguidor+atirador · ultra=perseguidor+atirador-preditivo ·
  rei=perseguidor+atirador-preditivo+raio+chefao.
- **4 comportamentos novos (18 → 22)**: `perseguidor-lado` (segue só na horizontal, o andar de
  shmup, que antes só existia por acidente com `arrancada`+alcance 9999), `atirador-alinhado` (só
  atira quando o alvo está na frente; a recarga corre SEMPRE e o alinhamento é só o GATILHO),
  `atirador-preditivo` (lead shot: `tempo = distância / tiro`, mira em `centro + velocidade ×
  tempo`; é o que separa ultra de avançada) e `raio`.
- ⭐ **O raio é o primeiro ataque da extensão que NÃO é projétil.** Três fases por inimigo
  (`_beamPhase`): recarrega (`cadencia`) → **avisa 60 quadros** com um risco fino piscando → liga
  (`duracao`, padrão 180). O aviso é o que torna o ataque justo, e é o molde do `swing window` da
  gk (recuo + janela ativa). Geometria: coluna do pé do inimigo até a borda de baixo visível, 60%
  da largura dele, reto para baixo (não precisa de alvo, então serve ao inimigo burro).
  ⚠️ O dano **não** é automático: `sz_g2d_on_enemy_beam_hit` ("Para cada raio do tipo … que acertar
  o sprite …") entrega o DONO do feixe e, ao contrário do `overlapEnemyShots`, **não remove nada**.
  Quem segura o ritmo do dano é a invencibilidade de 45 quadros do "Machucar com o dano de contato".
- **`sz_g2d_on_enemy_hurt`** — "Quando um inimigo do tipo ⟨rei⟩ levar dano". Dispara ao PERDER vida
  e continuar vivo; quem chega a zero vai pelo evento de derrota (disparar os dois no mesmo golpe
  faria o chefão trocar de fase morrendo). Máquina de handlers clonada da de derrota.
- **Campo `NAME` opcional no "Soltar um inimigo do tipo"** — vazio, a chave sai da IR e a saída é
  byte-idêntica (3º uso do idioma, depois do spawn-em-grupo e do `SHAPE`). Preenchido, declara o
  sprite: é o que deixa a barra de vida do chefão apontar para ELE sem laço.
- **2 ajustes novos**: `vida` (dos próximos que nascerem) e `duracao` (o raio). ⚠️ `vida` entra em
  `ENEMY_PARAM_OWNERS` com valor **null** (serve a todos), senão o drift do mapa reprova e o aviso
  de ajuste órfão acusaria quem está certo.
- Contadores: blocos 221 → **224**, API 220 → **223**, manifest **0.61.0**, catraca 829 → **868**.
  Os drifts criados no review anterior (dropdown × enum, tabela do runtime × enum) pegaram sozinhos
  dois esquecimentos meus durante este lote — valeu ter escrito.

### Terceiro full review (07/08, logo depois) — 11 correções, 3 delas graves

O lote da nave foi revisado em duas lentes (runtime novo + integridade de cadeia) e o resultado
mudou a régua do que eu considero "cadeia completa" nesta extensão:

1. ⭐⭐ **O bloco carro-chefe nascia ÓRFÃO.** `sz_g2d_define_enemy_smart` ficou fora de
   `ENEMYTYPE_DECL_BLOCKS` **e** de `GROUP_DECL_BLOCKS` (`FieldNamePicker.ts`). A criança criava o
   tipo "com inteligência" e ele não aparecia em NENHUM dos 8 seletores de `enemytype`, nem nos
   blocos de grupo. O caminho desenhado do produto estava morto e nenhum teste pegava.
2. ⭐⭐ **O corpo do "quando levar dano" recusava o próprio nome que ele declara.** Faltavam os dois
   eventos novos em `g2dLocalNames` (`ir/schema.ts`): usar ⟨chefe⟩ lá dentro, que é literalmente o
   que o tooltip vende, dava "O nome 'chefe' ainda não foi criado neste jogo".
3. ⭐⭐ **O atirador esperto mirava PARA TRÁS com os valores de fábrica.** Uma passada de correção
   de lead inverte o sinal quando `|velocidade do alvo| > velocidade do tiro`, e é o caso comum: o
   bloco de setas tem sombra 6 e o `shotSpeed` padrão é 4. Agora só adianta a mira quando o tiro é
   mais rápido; senão mira direto (interceptar é impossível mesmo).
4. `programmingReferences.ts` não conhecia `defineEnemySmart` nem o `spawnEnemy` nomeado, então a
   barra de vida do chefão (o motivo do campo "chamado") reprovava no zod.
5. **O raio ficava invisível pelo caminho de GRUPO** — que o review anterior legitimou. Agora
   `drawGroup`/`drawGroupByY` desenham o feixe via `_drawEnemyBeamsIfAny` (reconhece o tipo pelo
   formato: só ele tem `config` e `bullets`).
6. **O espinho não disparava o "levou dano" no golpe que o mataria**: a cura rodava antes da
   comparação. Passou a guardar `hpDoQuadro` ANTES da cura.
7. **`clearGroup` deixava os tiros do tipo voando**: a nave renascia e levava dano sem inimigo na
   tela. Esvaziar leva `type.bullets` junto.
8. **`type._drawn` nunca voltava a `false`**, então o aviso da tela vazia não retomava a contagem
   quando o "Desenhar" saía do ar na fase 2.
9. ⚠️ **A coluna do atirador alinhado era o `alcance`** — que já significava voo, raio do círculo,
   gatilho do mergulho e distância de reação. Com `voador + atirador-alinhado` (o arquétipo do
   shmup) o mesmo número controlava o voo E a coluna, e não dava para ajustar os dois. Virou a
   largura dos DOIS sprites. ⚠️ **Essa segunda régua também estava errada e caiu depois** (ver "o
   corredor do tiro", abaixo): a bala sai do MEIO do inimigo, então a largura dele não entra na conta.
10. Guarda espelhada no parser (`createEnemyType({smart:…})` gerava IR que o zod reprova), aviso de
    inteligência desconhecida com `warnOnce` e sem `"undefined"` cru, piso no `tiro` (zero entupia
    o grupo com tiros parados), `overlapEnemyBeams` sem cópia por quadro, `SPRITE_LOOP_BINDERS` e
    `ir/helpers.ts` com os dois corpos novos.
11. Aviso pedagógico novo (o quarto da família): **tem raio e ninguém confere se acertou**. O raio
    é o único ataque cujo dano exige um bloco separado, e sem isso a criança conclui que ele não
    funciona.

⚠️ **A lição que fica**: "cadeia de 9 pontos" está DEFASADA para esta extensão. Bloco que declara
nome tem hoje **cinco** mapas fora do schema (`*_DECL_BLOCKS` do picker, `G2D_DECLARATION_FIELDS`,
`VARIABLE_DECLARATION_FIELDS` do `programmingReferences`, e para bloco com corpo mais `g2dLocalNames`
e `SPRITE_LOOP_BINDERS`). O 4º review escreveu os drifts que faltavam (abaixo).

### Quarto full review (07/08) — o desenho, a régua da cadeia e o pixel

A rodada mirou o que a TERCEIRA acabara de escrever, que é onde o defeito mora quando ninguém
revisou a correção. Rendeu de novo, e a novidade foi um achado que **só o navegador dava**.

1. ⭐ **O feixe era pintado DUAS vezes.** A rodada 3 pôs o `_drawEnemyBeamsIfAny` no `drawGroup`
   (para o raio aparecer pelo caminho de grupo) e deixou o desenho antigo dentro do
   `drawEnemyType` — que chama o `drawGroup`. O halo de 0.35 composto duas vezes dá 0.58: quase
   sólido, comendo a leitura do que está atrás. E, desenhado ANTES dos sprites, o feixe passava
   por baixo dos inimigos de baixo, contrariando a própria promessa. Agora o desenho vive num
   lugar só e sai DEPOIS das figuras.
2. ⭐ **O aviso do raio nascia invisível.** O pisca era `floor(_beamT / 8) % 2`, e `_beamT` DESCE
   de 60: os 5 primeiros quadros caíam no lado apagado. O aviso existe para ela sair da frente, e
   o começo dele é justamente o que importa. A conta virou o tempo DECORRIDO. ⚠️ Nenhum teste de
   unidade pegaria: o ctx falso aceita qualquer sequência de chamadas. Foi lido no pixel, em
   Chrome real, e a prova ficou como teste (o padrão do risco é `11111111 00000000 11111111`).
3. **O buff do chefão ENGOLIA o golpe anterior ao primeiro update** (onda que solta depois de
   atualizar): o `_hpAntes` ficava no valor pré-buff, então o "levou dano" não via a perda. Sobe
   junto com o teto.
4. **A ultra era a avançada com outro nome.** A mira adiantada só existe quando o tiro é mais
   rápido que o alvo (guarda da rodada 3), e a nave anda a 6 contra um tiro de 4 — ou seja, o
   nível que o menu vende como "mira onde você VAI estar" mirava direto. Os presets viraram
   `{ fazer, tiro }` e ultra/rei nascem com `tiro: 8`.
5. **`overlapEnemyBeams` com a lista mudando por baixo** (a criança remove o dono dentro do
   bloco): varredura por SNAPSHOT + `Set` de vivos, o mesmo idioma dos outros varredores.
6. **Sprite adotado pelo "Pôr no grupo" ia para o NaN**: não passou pelo spawn, então não tinha
   `_homeX/_homeY/_dir`, e o rondador fazia a conta com `undefined`. Inicialização preguiçosa no
   laço de itens.
7. **`tiro` zero** agora avisa em vez de aceitar em silêncio (o tiro nasceria parado em cima dele).
8. **Pedagogia**: 9 rótulos reescritos (cada nível de inteligência agora NOMEIA as peças que
   traz), a gaveta reordenada com o criador clássico primeiro, e a seção do manual (80 linhas
   corridas, com "os 18 comportamentos" quando já eram 22) virou cinco subtítulos. Um parágrafo
   estava colado no último item de uma lista — em markdown isso é continuação preguiçosa, e o
   texto sumia para dentro do bullet.

⭐ **Os drifts que a lição da rodada 3 pedia agora existem** (`docDrift.test.ts`): todo tipo em
`G2D_DECLARATION_FIELDS` está em `VARIABLE_DECLARATION_FIELDS`; todo tipo de IR com `itemName` tem
`case` no `g2dLocalNames`; todo criador de tipo está nos `*_DECL_BLOCKS`; e a **ordem** dos cinco
primeiros blocos da gaveta (criar, criar-atalho, soltar, atualizar, desenhar) é lei — inserir um
bloco no meio empurra o "Desenhar" para baixo da dobra e o sintoma é tela vazia sem erro.

⚠️ **A lição de QA que fica**: ctx falso prova ORDEM e CONTAGEM de chamadas; ele não prova cor.
Composição alfa, ordem de camada e pisca-pisca só aparecem lendo `getImageData` num Chrome de
verdade. A pane fica oculta nesta máquina (rAF congelado), então o contorno é a página estática com
o rAF trocado por fila e `window.__passo(n)` bombeado pelo `javascript_tool` — Chrome real, canvas
real, sem depender de print.

### O atirador alinhado passava por cima e não atirava (07/08, relato de jogo)

Ela montou o shmup, parou a nave embaixo e viu o inimigo de inteligência **básica** passar por cima
três vezes sem disparar. Reproduzido e medido: **602 quadros (10 segundos) e 4 passagens** até o
primeiro tiro.

⭐ **A causa era uma inversão de papéis entre recarga e gatilho.** O `_enemyAimedShootAct` saía cedo
quando estava fora da coluna, ANTES de decrementar `_acd` — ou seja, a recarga só corria durante os
poucos quadros de alinhamento. Patrulhando a 2 px/quadro, a coluna de então (a largura dos dois
sprites, 56 px com os padrões) durava ~28 quadros por passagem, contra uma cadência de 90: QUATRO
passagens para carregar um tiro. O comentário no código dizia o contrário do que o código fazia
("continua carregado para o momento em que a nave aparecer na frente").

Agora a recarga corre SEMPRE e o alinhamento é só o gatilho; o contador nasce em 0 (pronto), porque
quem dá a folga aqui é a coluna — ele já só atira se ela estiver na frente, e um tempo de espera
inicial em cima disso é o que fazia o inimigo parecer quebrado. Medido depois, com a nave parada em
três lugares diferentes: dispara **na 1ª passagem** em todos, em 0,8s / 0,0s / 2,1s, e todo tiro sai
com o alvo alinhado. Nenhuma outra ação tinha o problema (leque, bomba, teleporte e raio já
decrementavam incondicionalmente).

⚠️ **A lição de teste**: o teste que existia usava `cadencia: 3` e um alvo TELEPORTADO para dentro da
coluna, então o inimigo nunca precisava chegar lá andando. O caso real exige o cenário INTEIRO
(patrulha de verdade + alvo parado + a cadência de fábrica), e é assim que a regressão está escrita
agora: conta as PASSAGENS por cima da nave até o primeiro tiro e exige que seja a primeira.

### Dano por ATAQUE: por que ele mora no bloco de acerto (07/08)

Ela perguntou como dar danos diferentes aos três ataques do rei (encostar, leque, raio) e como as
armas dela ferirem inimigos com vidas diferentes. **Já dava, sem bloco novo**, e a conversa virou uma
decisão de design que vale registrar antes que alguém "conserte" isto:

⭐ **O tipo guarda UM dano; quem aplica é sempre um bloco de acerto que ela põe.** É ali, no soquete
do `sz_g2d_damage_sprite` ("Machucar o sprite ⟨X⟩ em ⟨N⟩ e deixá-lo invencível por ⟨M⟩ quadros"), que
cada ataque ganha o número dele. Foi cogitado mover isso para o tipo (`Ajustar ... dano do tiro` /
`dano do raio`) e **foi descartado**: os três blocos de acerto são obrigatórios de qualquer jeito, o
número já cabe num soquete que existe, e a versão por-tipo custaria dois blocos a mais no "Ao
iniciar" afastando o número do lugar onde ele age. Do jeito atual o bloco se lê como uma frase
inteira ("quando o raio acertar a nave, tire 4"), e para criança adjacência ganha de organização.

Também foi cogitado **duplicar o bloco de dano na gaveta 😈 Inimigos**, e a dona recusou (nada de
mexer em bloco). ⚠️ **Ainda bem: a suíte PROÍBE isso.** O `docDrift` tem um teste de que todo bloco
visível está na toolbox **em UM lugar só** (`emDoisLugares` tem que vir vazio, junto com a guarda do
balde "Mais"). O montador da toolbox até aceitaria o tipo em dois SUBCATS (o mapa tipo→cor é um
`flatMap` para `Map`, então ele herdaria o tom da última gaveta), mas o teste fecha a porta de
propósito: bloco em duas gavetas é bloco que a criança acha duas vezes e conta como dois. Então quem ensina são três tooltips (`hurt_by_enemy`, `on_enemy_shot_hit`,
`on_enemy_beam_hit`) e duas receitas novas no manual.

⚠️ **O aviso que mais importa é o do raio**: aquele bloco roda A CADA QUADRO enquanto o feixe está
ligado (~180 quadros), então "Mudar a vida" ali esvazia a barra num piscar. Os quadros de
invencibilidade é que dão o ritmo (com 45, o feixe acerta ~4 vezes por disparo).

⭐ Como os três tooltips agora CITAM a face de um bloco de outro arquivo, entrou um drift no
`docDrift.test.ts`: o trecho entre os soquetes do `message0` do `sz_g2d_damage_sprite` tem que
aparecer nos três. Renomear aquele bloco fazia os três mentirem em silêncio.

### Quinto full review (07/08) — a doc mentindo o nome do bloco

Rodada sobre a correção do atirador alinhado e sobre a leva de copy do dano por ataque. Quatro
achados, três deles em texto que eu mesma tinha escrito nas 24h anteriores:

1. ⭐ **O manual chamava um bloco por um nome que não existe.** A lista de blocos dizia "**Quando um
   tiro acertar o sprite**" para um bloco que se chama "Para cada tiro do tipo ... que acertar o
   sprite ...". Na gaveta, os blocos que começam com "Quando" são os EVENTOS de derrota e de dano:
   a criança procuraria e pegaria o errado. No mesmo item, "Machucar o sprite com o dano do inimigo"
   tinha perdido o "de contato", e a frase prometia "os DOIS jeitos de o ataque alcançar você"
   quando são três (faltava o encostão, que agora aparece com o bloco de colisão certo).
2. ⭐ **Estava anotado aqui que dá para listar um bloco em duas gavetas. NÃO dá**: o `docDrift` tem
   um teste de que todo bloco visível está na toolbox em UM lugar só (`emDoisLugares` vazio). O
   montador aceitaria; a suíte não. A anotação errada foi corrigida no lugar.
3. **Duas dicas ficaram do tamanho de um parágrafo** (645 e 530 caracteres, contra mediana de 102
   na extensão). Dica que ninguém lê não ensina; a explicação longa foi para o manual e as duas
   encolheram para ~460 e ~424, na faixa dos outros blocos complexos.
4. **O script de auditoria de citações estava frouxo** e por isso o achado 1 quase passou: o
   casamento por prefixo não exigia tamanho mínimo da FACE, então face curta casava como prefixo de
   qualquer citação. Corrigido, os "2 suspeitos" viraram 7, dos quais 2 eram drift de verdade.

⭐ **Duas redes novas, ambas matando a CLASSE:**
- `docDrift`: cada item da lista de blocos do manual (`- **nome**`) tem que abrir com a cara real de
  um bloco. Cobre o buraco do drift antigo, que só olhava a forma `**Nome** (em **Categoria**)`.
- `enemies.test.ts`: **nenhuma recarga pode ficar atrás de uma condição de POSIÇÃO**. O teste lê a
  FORMA do runtime e exige que, entre o começo da função e o contador, só exista a guarda de "não
  tem alvo". Provado que morde: reinserindo o código antigo do atirador alinhado, ele aponta a linha
  exata. A versão comportamental disso NÃO pegaria um comportamento novo que repetisse o erro,
  porque o inimigo continua atirando, só que tarde demais.
  ⚠️ Duas escolhas que fazem a rede não envelhecer (endurecidas no 6º review): os nomes das funções
  saem da **tabela `ENEMY_BEHAVIORS`** (19 hoje), não de um padrão `_enemy*`, e o contador é
  reconhecido pela FORMA do decremento (`s._x -= 1`), não pelo nome. Comportamento novo entra na
  rede sozinho, batizado como for e com o contador chamado como for.

⚠️ **Observação de jogo, não defeito**: o `rei` dispara os dois ataques de projétil em LOCKSTEP (o
tiro esperto e o leque do chefão nascem com o mesmo `rate` e zeram no mesmo quadro), então saem 4
balas juntas a cada 90 quadros (medido). Lê-se como uma salva só, não como dois ataques. Quem quiser
separar sem feature nova soma o `atirador em leque` DEPOIS (no "quando levar dano", por exemplo): o
contador dele nasce naquele instante e fica defasado para sempre.

### O corredor do tiro: o alinhado atirava ao LADO da nave (07/08, relato de jogo)

Segundo relato de jogo dela na mesma feature. Com a recarga consertada, o inimigo básico passava a
detectar e atirar, mas **a bala saía do lado da nave parada e descia paralela**, sem nunca acertar.
O que ela descreveu como "atirar em arco" é o rastro de balas de um inimigo que continua andando
enquanto cada bala cai reta no lugar onde foi solta (não existe arco: os tiros são integrados sem
gravidade).

⭐ **Havia DUAS réguas para a mesma coisa, e a de disparar era quase o dobro da de acertar.**
- Disparar perguntava "os SPRITES se cruzam na horizontal?" → `(s.w + t.w) / 2`, **28 px** com os
  padrões (inimigo 32, nave 24).
- Acertar depende do **corredor da bala**: ela nasce no MEIO do inimigo, tem raio 4 e cai com
  `vx: 0`, e o `isColliding` é AABB estrito → só encosta com menos de `meia caixa da nave + raio` =
  **16 px**.

De 16 a 28 px ele disparava um tiro **impossível** de acertar: 43% da janela era erro garantido. E
como a patrulha é periódica, o inimigo repetia quase a mesma posição de disparo, então para uma nave
parada não era "às vezes erra", era "não acerta".

⚠️ **A raiz do erro conceitual**: a largura do INIMIGO entrou numa conta em que ela não tem parte. Ela
faria sentido se a bala saísse da beirada do corpo dele; ela sai da barriga. "Passar na frente dele"
não é "os dois se cruzam", é "a bala cai em cima dela".

A pergunta virou literal: `|centroDaCaixaDoAlvo - centroDoInimigo| >= caixa/2 + ENEMY_SHOT_R` → não
atira. Duas escolhas que impedem a régua de divergir de novo:
- **`_hitboxOf`**, o MESMO helper que a colisão usa, então previsão e acerto não podem discordar; e
  uma nave com "área de colisão de N%" encolhe o corredor de graça.
- **`ENEMY_SHOT_R = 4` virou constante** e substituiu os cinco `radius: 4` literais dos atiradores.
  Com dois números soltos, mudar o tamanho da bala desalinharia a mira em silêncio.

Medido em Chrome real, varrendo o desalinhamento de 0 a 30: **dispara em 0..13, acerta em 0..13, zero
tiro que não pode acertar**. No cenário dela (nave parada, básica patrulhando, 1800+ quadros, três
posições de nave): **todo tiro acerta**, um por passagem.

⚠️ **A lição de teste, e é a mais valiosa desta série**: todos os testes do atirador alinhado asseriam
que uma bala **NASCEU**; nenhum que ela **ACERTOU**. Por isso o defeito atravessou três full reviews
com a suíte verde. O `describe('o tiro do alinhado tem que ACERTAR, não só sair')` acompanha a queda
da bala até a linha da nave e cobra o acerto no corredor inteiro, a recusa fora dele, e que o
corredor siga a caixa de colisão.

⚠️ Caí DE NOVO na armadilha da crase crua dentro do template literal do runtime (comentário com
`` `_hitboxOf` `` e com `` `>=` ``). Fecha a string e a suíte inteira fica vermelha de uma vez.

### Sétimo full review (07/08) — os testes do conserto anterior, e o que eu não checo

Rodada sobre o conserto do corredor. Três furos, todos nos testes que eu tinha escrito na hora:

1. **"Do centro às duas beiradas" era falso.** Os deslocamentos testados iam de -10 a +13: a beirada
   ESQUERDA nunca era exercida, apesar do nome do teste. É a mesma classe que o 2º review catalogou
   ("comportamento simétrico só exercido para um lado"), agora dentro da rede.
2. **O teste da caixa de colisão não tinha anti-vácuo.** Ele só afirmava "não atirou" com a caixa
   reduzida; se o disparo quebrasse por inteiro, passaria como se a caixa estivesse agindo. Ganhou a
   metade positiva: com a MESMA caixa reduzida, alinhado, ele atira e acerta.
3. **Nada travava "a bala desce RETA".** Era o pedido explícito dela, e os testes de acerto
   continuariam verdes se alguém desse um `vx` à bala para "ajudar a mira".

⭐ **Drift novo, do jeito que o defeito voltaria**: nenhum atirador pode escrever o raio da bala na
mão. O tamanho da bala e a régua do disparo saem os dois de `ENEMY_SHOT_R`; um atirador novo com
`radius: 8` solto teria bala de um tamanho e mira de outro, em silêncio. Escopado ao módulo dos
inimigos de propósito, para não reprovar literal legítimo de outro domínio.

**Conferido e limpo:** o RAIO usa o MESMO retângulo (`_enemyBeamRect`) para desenhar e para machucar,
então não tem a doença de duas réguas; o objeto de retângulo é compartilhado mas só é lido ANTES do
callback da criança; e os outros atiradores não prometem coluna nenhuma (o comum e o esperto miram no
centro do alvo, o leque é leque de propósito, o bombardeiro solta reto sem olhar).

⚠️ **Limite conhecido, documentado no código e aceito**: o corredor tem 32 px com os padrões, então um
inimigo que ande mais que isso por quadro pula o corredor entre dois quadros e quase nunca atira.
Vale para qualquer porteiro por posição em tempo discreto; a alternativa (soltar a bala na beirada do
corredor) faria a bala nascer longe do corpo dele. Velocidade de patrulha costuma ser 2.

### Comportamento novo: atirador de lado, a TORRE (v0.64.0, 22 → 23 comportamentos)

Pedido dela depois de eu MEDIR que o atirador alinhado confere só o eixo X (mapa das oito posições em
volta: ele atira para cima ou para baixo na mesma coluna, e cala nas laterais). Ela quis o espelho: a
torre de plataforma, que dispara quando o herói entra na mesma faixa de ALTURA.

- **Nome vindo do vocabulário que já existe**: `atirador-lado` → "atirador de lado", espelhando o
  `perseguidor-lado` → "perseguidor de lado". A extensão já usa "de lado" para dizer "no eixo
  horizontal", então a criança não aprende palavra nova. ⚠️ O `atirador-alinhado` NÃO foi renomeado:
  o valor viaja no projeto salvo dela.
- O `_enemySideShootAct` é o irmão vertical com os eixos trocados, e herda as duas lições que doeram:
  contador PRÓPRIO (`_ycd`), **recarga que corre sempre** (a faixa é gatilho, não relógio) e a régua do
  **corredor da bala** medida com o mesmo `_hitboxOf` da colisão, agora pela ALTURA da caixa.
- ⚠️ **O `facing` foge da convenção dos irmãos DE PROPÓSITO.** Os outros só encaram o alvo quando
  `!hasXDriver`, e `hasXDriver` é `!!ownerX` — o que inclui `parado`, que dirige os dois eixos desde o
  1º review. Numa torre (`parado + atirador de lado`) a convenção deixaria o sprite olhando para um
  lado e atirando para o outro. Como o `autoAnimate` roda DEPOIS das ações e só mexe no facing com
  `|vx| > 0.01`, definir aqui acerta a torre parada e é sobrescrito de graça em quem anda.
- Comportamento novo custou 8 pontos e ZERO contador de bloco/API: enum da IR, dropdown (valor **e**
  ordem), tabela do runtime, `ENEMY_BEHAVIOR_LABELS`, donos de `cadencia`/`tiro` em
  `ENEMY_PARAM_OWNERS`, **a prosa do tooltip do "Ajustar"** (tem drift que cobra cada dono), `ai.ts` e
  o manual. Mais a catraca de parâmetros (881 → 884).
- Medido em Chrome real: o mapa das oito posições é o espelho exato do irmão vertical (laterais
  atiram para o lado certo, coluna e diagonais calam); e uma torre parada com o herói andando na
  altura dela deu **20 tiros, 20 acertos, 2 de dano por acerto**, com a torre virada para ele.
- ⚠️ **Armadilha de sonda que quase virou falso defeito**: na primeira medição o herói perdeu 2 de
  vida em 20 acertos. Não era bug: `blinkFrames` (a invencibilidade) só escoa dentro do `drawSprite`,
  e a minha sonda não desenhava o herói. Sonda de dano tem que desenhar o sprite, como o jogo faz.
- ⚠️ E os valores do meu primeiro teste estavam errados porque confundi o TOPO do sprite com o centro
  dele (`naveY` é o canto; o centro é `naveY + h/2`). O teste pegou.

### Oitavo full review (07/08) — o lote da torre

Rodada sobre o atirador de lado. Nada de errado no runtime; os quatro achados são de REDE, e dois são
de testes meus que prometiam mais do que verificavam:

1. ⭐ **Nada travava o manual e a IA contra o enum de comportamentos.** As duas superfícies estavam
   completas (23/23, medido), mas por sorte: um comportamento novo esquecido ali significa uma opção
   no menu que o manual não explica e que o Zappy nunca sugere, porque não sabe que existe. Drift novo
   cruza o enum com o manual (pelo NOME DO MENU, que é o que a criança lê) e com o contexto da IA
   (pelo VALOR, que é o que ela emite).
2. ⭐ **Nenhum teste levava um VALOR de dropdown pela Ponte de volta.** A cadeia é fechada por
   construção (o parser lê o enum em três pontos, sem lista própria), mas "fechado por construção" foi
   o que eu disse do atirador alinhado antes dos dois defeitos que ela achou jogando. Um comportamento
   que o parser recusasse cairia em `rawJS`: o jogo seguiria rodando e a Ponte devolveria um bloco de
   "código avançado" no lugar do bloco de inimigo, verde em tudo. Agora os 23 fazem código → IR nos
   dois blocos que os oferecem (criar e "também é").
3. **O teste da bala reta ligava a gravidade e media ANTES de a bala andar** — não provava nada sobre
   a gravidade. Agora acompanha 40 quadros de voo e exige a altura CONGELADA.
4. **O teste da cruz dizia "com contadores próprios" e não provava**: com o alvo nas duas faixas os
   dois disparam juntos, e um contador único daria o mesmo resultado. O teste novo gasta SÓ a recarga
   do lateral e prova que o vertical dispara na hora em que o alvo entra na coluna.

⚠️ **E eu quase relatei um defeito que não existia**: o round-trip do "também é" falhou para os 23, e
a causa era o meu palpite do nome da IR (`g2d:addEnemyBehavior` em vez de `g2d:enemyAddBehavior`). O
parser estava certo. Confirmar o nome no schema antes de acusar o produto.

### Um grupo com os inimigos de TODOS os tipos (v0.65.0, o bloco 233)

Com vários tipos, cada tipo é um grupo separado, então toda ação COMPARTILHADA pedia um bloco por
tipo (3 tipos × 4 ações = 12 blocos para 4 ideias). O bloco novo **"Criar o grupo ⟨todos⟩ com os
inimigos de todos os tipos"** (`start-only`, em 😈 Inimigos) resolve com 1 + 4.

⭐ **A escolha central: é uma VISTA derivada, não uma cópia sincronizada.** O `items` do grupo é um
getter que monta a lista a partir dos tipos registrados. Motivo: o atalho manual (grupo comum + "Pôr
o sprite no grupo" a cada nascimento) VAZA, porque a morte tira o inimigo do TIPO e não do grupo
dela, e o morto segue colidindo para sempre. Derivar torna o vazamento impossível e pega de graça o
sprite ADOTADO por "Pôr no grupo ⟨tipo⟩", que uma sincronia no spawn perderia.

⚠️⚠️ **E aqui a lição do lote, que um teste meu pegou na hora:** a primeira versão do cache usava um
contador de rotatividade que eu incrementava À MÃO no spawn e na morte. O teste da poda ("Tirar do
grupo quem sair da tela") falhou imediatamente: aquele caminho remove do tipo sem passar pelos meus
dois pontos, e a vista ficava mostrando inimigo que não existia mais — o MESMO defeito que o lote
existe para eliminar. Conserto: o selo do cache é DERIVADO da soma dos `_revision` dos tipos. Todo
grupo gerenciado já bump o próprio `_revision` em qualquer mutação da lista (o proxy de
`_trackGroupItems` embrulha push/splice/sort/atribuição), então nenhum caminho pode ficar de fora.
**Derivar mata a classe; sincronizar sempre deixa um caminho esquecido.**

Três famílias de comportamento no grupo novo, todas conferidas uma a uma no runtime:
- **Funciona igual a qualquer grupo** (só leem): colisões, "para cada", contar, desenhar, desenhar
  ordenado pela base (usa `snapshot.sort`, não mexe na lista) e "impedir de atravessar".
- **Encaminha para os tipos**, porque tem significado óbvio: esvaziar (limpa todos os tipos), tirar
  o sprite (tira do tipo que o contém), podar quem saiu da tela (poda cada tipo).
- **Avisa e não faz nada**: atualizar e aplicar gravidade (o "Atualizar os inimigos do tipo" já move
  cada um; aqui andariam DUAS vezes por quadro), pôr um sprite (em qual tipo?), trazer para a
  frente/mandar para trás (a ordem volta na remontagem).

O `Atualizar` e o `Desenhar` continuam por tipo, e sempre vão: cada tipo tem a própria lista de
comportamentos e os próprios tiros. **As duas formas convivem** (requisito dela): projeto sem o
bloco novo tem saída byte-idêntica, e há teste comparando o andar do tipo com e sem a vista criada.

Medido em Chrome real: 3 tipos (4+3+2) dão 9 na vista; o morto sai NO MESMO quadro do update (9→8);
15 acertos e 7 mortes com UM bloco de colisão para os três tipos; esvaziar a vista zerou os três.
Contadores: blocos 232 → **233**, API 231 → **232**, catraca 884 → **892**.

### Nono full review (07/08) — o lote da vista

Cinco achados, e o primeiro era um buraco de verdade no que eu tinha acabado de escrever.

1. ⭐⭐ **A lista da vista era um array cru devolvido por referência.** Varri o runtime procurando
   quem faz `group.items.push` e achei SEIS criadores fora das minhas guardas: "Criar tiro no grupo",
   "Criar um sprite no grupo" e os spawns dos kits (obstáculo, ovo, asteroide). Apontar qualquer um
   deles para o grupo da vista escrevia no cache: o sprite aparecia até a próxima remontagem e sumia
   sozinho, em silêncio. Guardar os seis um a um seria a mesma sincronia frouxa que o lote existe
   para eliminar, então a lista passou a **se defender sozinha**: sai embrulhada num proxy que recusa
   os métodos mutantes e avisa. Vale para os criadores que ainda nem existem. Idioma emprestado do
   `_trackGroupItems`, que já faz isso nos grupos normais.
2. **Estado morto**: `_enemyMirrors` era populado e nunca lido. Removido.
3. **O teto de 64 tipos descartava em silêncio**: o tipo 65 funcionava mas não entrava na vista.
   Agora avisa, citando a causa provável (criar tipo dentro do laço).
4. **A copy inventava uma regra que não existe**: dica, manual e `ai.ts` mandavam pôr o bloco
   "depois de criar os tipos". A vista é DERIVADA, então a ordem não importa. Virou teste (a vista
   criada ANTES dos tipos enxerga todos) e a frase caiu nos três lugares. Regra falsa é regra que a
   criança vai obedecer e depois estranhar.
5. **Colisão de texto entre avisos**: o meu aviso novo cita o bloco pela face, e um teste antigo
   filtrava por "contém o nome do bloco" — passou a casar com dois. O filtro do teste ficou preciso
   (a frase própria daquele aviso); a copy não foi degradada por causa de um teste.

**Conferido e medido:**
- O bump de `_revision` acontece só na REMONTAGEM. Se fosse por leitura, o `overlapGroups` (que
  compara `_revision` para refrescar o Set de pertencimento) refaria o Set a cada item: O(n) virava
  O(n²). Está comentado no código para não regredir.
- **Custo do selo derivado, medido em Chrome**: 8 tipos, 200 inimigos, 60 tiros, colisão contra a
  vista todo quadro → **0,141 ms/quadro contra 0,127 ms** de um grupo comum com os mesmos 200
  sprites. Sobrecarga de **0,014 ms**, menos de 0,1% do quadro. O selo somar os revisions dos tipos
  a cada leitura não é problema nesta escala.
- O monotônico do selo é sólido: `_revision` só cresce e a contagem de tipos entra na conta, então
  duas composições diferentes não colidem.

### Décimo full review (07/08) — duas lições REPETIDAS, no mesmo arquivo

Rodada sobre a defesa da vista, escrita na rodada 9. Os dois achados são reincidência de lições que
este arquivo já tinha aprendido, o que faz deles os mais úteis da série.

1. ⭐ **Objeto literal vazando `Object.prototype` na guarda.** O mapa dos métodos mutantes
   (`MIRROR_MUTANTES`) era literal, então `toString`, `valueOf`, `constructor` e `hasOwnProperty`
   vinham do protótipo, eram TRUTHY e existem em `Array.prototype`: a guarda devolvia o AVISO no
   lugar da função real. Consequência: qualquer coerção da lista (`String(items)`, concatenação)
   chamava o stub, recebia `undefined` dos dois lados e estourava "Cannot convert object to
   primitive". ⚠️ É a MESMA armadilha do 1º full review neste arquivo (nome herdado passando por
   comportamento válido, corrigido lá com `hasOwnProperty`). Agora com `Object.create(null)`, e com
   teste que lê `toString`/`String()`/`Object.hasOwn` na lista da vista.
2. ⭐⭐ **O aviso de "ninguém os desenha" voltou a acusar quem está certo.** O `_drawn` é marcado no
   grupo que recebe o desenho; desenhando pela VISTA (que o manual apresenta como o jeito de fazer
   uma coisa só para todos), cada TIPO ficava com `_drawn` falso e, em 360 quadros, o Console
   acusava tela vazia com a tela cheia. É exatamente o defeito que o 2º full review corrigiu quando
   o caminho de grupo virou oficial, reaberto pelo bloco novo. Fix: desenhar a vista marca todos os
   tipos registrados, nos DOIS desenhadores. Teste com 500 quadros nos dois caminhos.
3. Um `noPrototypeBuiltins` no teste que eu tinha acabado de escrever (`Object.hasOwn` resolve).

⚠️ **A lição de segunda ordem desta série de reviews**: as reincidências não vieram de esquecimento
do CLAUDE.md, vieram de eu escrever código NOVO que cai na mesma armadilha por outro caminho. Toda
vez que este arquivo ganha um mapa de nomes, ele precisa de protótipo nulo; toda vez que um caminho
NOVO de desenho vira oficial, o `_drawn` precisa acompanhar.

### O que a vista NÃO cobre, e a decisão de 07/08

A vista é montada dos **inimigos** de cada tipo; os **tiros** vivem em `type.bullets`, uma lista por
tipo que nenhum bloco nomeia. Então o grupo geral resolve o dano por ENCOSTÃO e não resolve o dano
por TIRO nem por RAIO: esses seguem um bloco por tipo (o que tem o lado bom de dar dano diferente por
tipo de graça).

⚠️ **Buraco conhecido, deixado em aberto a pedido dela ("deixa assim mesmo por enquanto")**: o campo
do "Para cada tiro do tipo …" é um seletor com texto livre, então dá para DIGITAR ali o nome do grupo
geral. `overlapEnemyShots` sai cedo em `!type.bullets` — não quebra o jogo, mas também não avisa. Se
alguém retomar isto: o conserto natural é um bloco irmão ("Para cada tiro de QUALQUER inimigo que
acertar o sprite …", a mesma vista derivada aplicada às listas de tiros) mais o aviso no caminho
silencioso. O raio seria o terceiro irmão.

### Décimo primeiro full review (07/08) — a tabela do manual virou contrato

Rodada magra, e a magreza é o achado. Zero defeito no runtime; o que faltava era PROVA.

O manual faz 14 afirmações item por item sobre o grupo da vista (sete blocos funcionam igual, três
encaminham para os tipos, quatro avisam). Boa parte existia só na minha leitura do runtime. Duas
nunca tinham sido exercidas: **"Impedir de atravessar os sprites de um grupo"** (o empurrão contra
todos os inimigos) e **"Mandar para trás"** (cuja guarda eu escrevi por simetria com o "Trazer para a
frente", sem teste). As duas estavam certas, e agora a tabela inteira é `describe('a tabela do manual
sobre a vista é contrato')`.

**Não-achados conferidos** (vale registrar para não reabrir):
- `warnEnemyTypeEmptyOnce` é chamado do `updateEnemyType` E do `drawEnemyType`, então quem desenha só
  pela vista NÃO perde o aviso de "tipo criado e nunca solto".
- `_marcarTiposDesenhados` marcar todos os tipos é correto por construção: a vista contém os itens de
  todos eles, então desenhar a vista desenha todos.
- Erros de tipo no meu próprio teste (identificador duplicado na interface `Api` e um helper que eu
  usei sem declarar) foram corrigidos; o typecheck do pacote agora só acusa `moldsArea.test.ts`, da
  outra sessão.

⚠️ **Observação para quando a feature "Meus moldes" da outra sessão pousar**: ela introduz uma área de
DECLARAÇÕES e já experimentou trocar o `placement` de criadores para `mold-declaration`. O bloco novo
da vista é um criador de recurso `start-only-command` e provavelmente vai querer o mesmo tratamento —
decisão de quem estiver conduzindo aquele lote.

### A identidade do inimigo mudou de área: 🧩 Meus moldes (v0.66.0)

A área de moldes (lote da outra sessão) levou só os dois "Criar tipo de inimigo", e a configuração do
tipo ficou em ⚙️ Ao iniciar. Pelo princípio da dona isso está errado: **molde é o que a coisa É**
(preparo, posso nem usar), **Ao iniciar é pôr para funcionar nesta partida**. Ela pediu cada bloco
numa área SÓ, a que lhe cabe — nada de "vale nas duas".

Três blocos trocaram de encaixe: **"também é"**, **"Ajustar no tipo"** e o **grupo com todos os
inimigos**. A **"Animação dos inimigos do tipo"** continua com raiz em ⚙️ Ao iniciar: ela consome uma
folha carregada na mesma partida e precisa vir depois desse carregamento. Ela ainda cabe aninhada em
evento/temporizador para trocar o visual no meio do jogo.

⭐ **A restrição que apareceu, e como saiu sem enfraquecer nada.** O contrato da área de moldes tem um
invariante — `MOLD_ONLY_STATEMENT_TYPES ⊆ START_ONLY_STATEMENT_TYPES` — e `START_ONLY` **proíbe
aninhar**. Só que "também é" e "Ajustar" PRECISAM caber dentro de um evento: é a receita do chefão que
fica furioso na metade da vida e da onda que endurece. Em vez de afrouxar o `MOLD_ONLY`, entrou um
conjunto IRMÃO, **`MOLD_NESTABLE_STATEMENT_TYPES`** ("raiz no molde, aninhado permitido"), com o
preset `mold-command` do lado do Blockly. O invariante da outra sessão segue valendo inteiro e **o
teste cobre os dois conjuntos separadamente**.

⭐⭐ **A migração não custou uma linha**: as duas pontas já leem o contrato. `normalizeFrames.ts`
compara `areaForBlockType` com a área do frame em que o bloco está e re-hospeda o que não cabe;
`liftMoldDependencies` sobe junto as variáveis de que o molde depende; `appendChildrenToArea` CRIA o
frame de destino quando o projeto salvo não tem a área; e `partitionMolds` faz o mesmo do lado da IR,
preservando a ordem e a identidade de quem não tem nada a mover.

⚠️ **Armadilhas do lote, todas pegas por teste:**
- O `'g2d:allEnemiesGroup'` foi para o conjunto ERRADO: a âncora do meu script bateu primeiro no
  `START_ONLY` (os dois conjuntos listam `defineEnemyType`/`defineEnemySmart` em sequência). O
  `blockAudit` acusou na hora, porque o Blockly dizia molde e a IR dizia início.
- Exemplos: **um** statement (a cadência do canhão em `examples/adventure.ts`) estava no `start` e foi
  para o `molds` do exemplo — a dona pediu conserto na RAIZ, e o teste "NENHUM exemplo oficial deixou
  molde em Ao iniciar" cobra isso. Isso mexeu no **hash do catálogo** (`examplesLoading.test.ts`).
- ⚠️ O meu teste da variável que sobe junto FALHOU por culpa dele mesmo: usei tipos de bloco que não
  existem (`sz_js_var` em vez de `sz_js_var_create`). O `liftMoldDependencies` estava certo.
- `BODY_CONTEXTS` é `const` declarado no meio do arquivo: o preset novo precisou nascer DEPOIS dele,
  senão TDZ no carregamento do módulo.

Contadores: `+1` arquivo próprio (127) e manifest **0.66.0**. Teste novo:
`__tests__/enemyMolds.test.ts` (encaixe dos três moldes, animação no início, o aninhado que não pode morrer, o
invariante do conjunto novo, `partitionMolds`, e o projeto salvo se consertando com e sem a área).

#### Décimo segundo full review (07/08) — o lote da área de moldes

Dois achados, e o primeiro é o mais importante do lote inteiro porque muda o SENTIDO de um jogo salvo.

1. ⭐⭐ **A migração pode mudar o significado da receita da onda.** O "Ajustar … vida" existe para
   endurecer a onda seguinte, e a receita natural era pôr o bloco no ⚙️ Ao iniciar ENTRE dois spawns:
   quem nasceu antes fica fraco, quem nasce depois vem forte. Como o bloco agora é molde e **o molde
   roda antes de TUDO**, um projeto salvo desses passa a dar a vida nova aos DOIS spawns. Não é bug de
   código, é consequência da mudança de área — e estava sem uma linha de aviso. O manual agora diz,
   no próprio bullet do Ajustar, que ajuste no molde vale para o jogo inteiro e que endurecer só a
   onda seguinte pede o bloco dentro de um evento ou de um "A cada N segundos".
2. **Concedi um aninhado sem decidir.** A animação continua podendo aparecer em evento ou
   temporizador para o chefão trocar de visual no meio do jogo, mas a raiz foi corrigida para
   ⚙️ Ao iniciar. Ela consome a folha carregada nessa área; tratá-la como molde criava uma referência
   para um nome que só existiria depois. O manual ensina essa ordem e os testes cobram raiz e corpos.

**Conferido:** o `role` do contrato só distingue `event`/`loop`/`value`, então `declaration` × `command`
não muda checagem nenhuma; o grupo geral RECUSA corpo de evento (é preparação e só, e tem teste); e a
ordem dentro do molde continua cobrada pela regra de declaração do schema — pôr o "também é" acima do
"Criar tipo" reprova, como antes.

### O perseguidor com TRÊS modos (v0.67.0, 23 → 24 comportamentos)

Pedido dela: perseguir completo (os dois eixos), só no X e só no Y; e a **avançada** e a **ultra**
passam a perseguir só no X, ficando na altura em que nasceram (o andar de jogo de nave, em vez de
descer em cima do jogador). O REI mantém o perseguidor completo — ela citou só as duas, e o chefão que
caça por todo lado é a escalada do último nível.

⭐ **Os três modos são três LINHAS da tabela, não três funções.** O `_enemyChaseMove` já tratava posse
de um eixo só desde a correção nº2 do 1º full review, então a tabela de eixos entrega os três com a
mesma função (`{x,y}`, `{x}`, `{y}`). E aí o **`_enemyTrackMove` saiu**: ele era o só-X escrito à mão, e
duas implementações da mesma regra é a receita de divergirem no próximo conserto. **A catraca de
parâmetros DESCEU** (896 → 893) — baixar em vez de deixar folga é o que mantém a catraca cobrando.

⭐ **A disciplina que provou a consolidação**: antes de trocar a função, CAPTUREI a sequência de
posições do `perseguidor-lado` numa sonda descartável (103, 106, 109, 112, 115, 118, com passo curto
119 e parada sem alvo). Depois da troca, idêntica. A sequência virou teste permanente, com o comentário
dizendo que os números vieram da implementação anterior — é o que transforma "achei que não mudou" em
prova. Mesma receita da Etapa 1 do lote original dos inimigos.

- Nome pelo par que já existia (`voador`/`voador-vertical`): **`perseguidor-vertical`**, rótulo curto
  "perseguidor (sobe e desce)".
- Copy travada que mudou de sentido: os rótulos da avançada e da ultra ("perseguidor de lado +
  atirador"), os cinco níveis do manual e a família "Anda no chão", que agora apresenta os três modos
  juntos ("só muda o eixo em que ele se mexe; a esperteza é a mesma").
- Medido em Chrome, do mesmo ponto e com o mesmo alvo: completo `108,96 → 156,132 → 204,168`; de lado
  `120,60 → 180,60 → 240,60`; vertical `60,120 → 60,180 → 60,240`. E as inteligências: avançada e ultra
  ficaram em y=40 (nasceram lá) chegando a x=202 sobre a nave em 200; o rei desceu para y=141.
- ⚠️ O drift do 8º review (todo comportamento explicado no manual e conhecido pela IA) pegou o
  esquecimento na hora: eu tinha editado a frase da família sem ACRESCENTAR o modo novo nela.

#### Décimo terceiro full review (07/08) — o teste da gravidade era um VÁCUO

Rodada sobre o lote dos três modos. Zero defeito no runtime; os quatro achados são de copy e de
REDE, e o terceiro é a classe que mais reincide nesta série.

1. **"sem mudar de lado" é ambíguo** (troca de lado? anda de lado?). O irmão diz "sem mudar de
   altura", que é limpo, e o espelho tinha que ser igual de limpo: "sem andar para os lados".
2. ⭐ **A distinção nova deixou o rótulo do REI sob-informativo.** Com a avançada e a ultra dizendo
   "perseguidor de lado", o "perseguidor" seco do rei não conta mais a diferença que importa — que
   ele é o único que vai atrás de você por todo lado. Virou "persegue por TODO LADO", e o item dele
   no manual abre dizendo "diferente das duas de cima". Achado que só existe porque a mudança
   anterior alterou o CONTRASTE entre rótulos vizinhos, não porque algum deles ficou errado.
3. ⭐⭐ **`o vertical não cai com gravidade ligada` passava sem provar nada.** O teste chamava
   `setGravity(0.6)` e afirmava que o inimigo não afundava — só que **gravidade de mundo não derruba
   inimigo nenhum**: quem acelera o `vy` é o bloco "Aplicar a gravidade ao grupo", e sem ele o
   fallback do eixo Y integra um `vy` que é zero. O teste passaria idêntico se o modo não fosse dono
   do Y, que é exatamente o que ele existia para garantir. Agora aplica a gravidade a cada quadro,
   como o jogo de plataforma faz, e tem **anti-vácuo**: no MESMO cenário a `patrulha` (que não é dona
   do Y) afunda até o chão visível, em 280. É a 5ª vez nesta série que um teste meu promete mais do
   que verifica, e a receita que pega todas é a mesma: escrever a metade que tem que FALHAR.
4. **Rede nova de SIMETRIA**: os dois modos de um eixo saem da mesma função, então o de lado e o
   vertical têm que produzir a mesma sequência de passos em cenários espelhados (alvo a +200 no eixo
   de cada um, e a −200 também). É o teste que morde se alguém tratar um eixo diferente do outro —
   a classe do `_dir` × `_dirY`, que já mordeu duas vezes neste arquivo.

**Conferido e registrado no código:** nenhum dos três modos é `flying`, **inclusive o vertical**
(diferente do `voador-vertical`, que é). É deliberado e agora está comentado na tabela: enquanto o
modo é dono do eixo Y a gravidade nunca roda, e quando outro comportamento LEVA o Y quem manda é ele
— marcar `flying` mudaria de tabela o `perseguidor` que já está em produção. Também conferido: as
quatro superfícies de copy (dropdown, os cinco níveis do manual, a família "Anda no chão" e o
`ai.ts`) descrevem os três modos sem divergência, e as duas menções restantes ao `_enemyTrackMove`
são os comentários que explicam a remoção dele, não referências.

## Jogo 2D Avançado — ver o invisível (v0.54.0, 01/08)

Dois blocos `start-only`, ambos sobre ENXERGAR o que o motor faz:

- **`sz_gk_stage_border`** ("Mostrar a borda da tela, cor ⟨⟩ espessura ⟨4⟩", em 🧰 **O jogo** — na gk,
  🎨 Aparência é o visual dos PERSONAGENS, não do palco). ⭐ **A moldura de fábrica SAIU**: o
  `#szgk-canvas` do `buildCss()` trazia `border: 4px solid #2e2e3e`, então toda partida nascia com uma
  borda cinza que ninguém escolheu e não dava p/ tirar — e era incoerente, porque o ramo "ocupar a tela
  toda" do `resizeCanvas` a apagava (mesmo jogo, moldura num modo e não no outro). Agora o CSS não
  declara borda, o `style.border = '0'` do ramo de tela cheia sumiu junto (se ficasse, **apagaria a
  borda escolhida a cada redimensionamento**) e a escolha vive em `config.border` + `applyStageBorder()`,
  chamado também no fim do `ensureShell` — na gk o canvas só nasce no "Começar o jogo", e o bloco pode
  rodar antes. Espessura capada em 40; `box-sizing: border-box` mantém a moldura DENTRO da caixa (sem
  rolagem, sem empurrar layout, resolução interna intocada). ⚠️ Efeito colateral desejado: os exemplos
  "Profissional" perderam a moldura cinza.
- **`sz_gk_show_hitboxes`** ("Mostrar as caixas de colisão", em 🔧 **Propriedades & direção**, ao lado do
  "Caixa de colisão de …": definir e ver ficam juntos). Chave GERAL (escolha da usuária) — alcança tiros
  e inimigos de molde, que não têm nome. Liga o `debugOverlay` que já existia escondido na crase, mas o
  **`drawDebugOverlay` foi consertado**: desenhava CÍRCULOS a partir de `e.radius` enquanto tudo que o MOTOR
  resolve sozinho (sólido, tiles, plataforma one-way, bordas, golpe, varredura de pares) é RETANGULAR pela
  hitbox — o overlay MENTIA. Agora contorna `hbLeft/hbTop/hbW/hbH`, os mesmos helpers do `touching`.
  ⚠️ **Existe um caminho circular MANUAL** (anterior a este lote): o bloco `sz_gk_touching_circle` ("⟨a⟩ e
  ⟨b⟩ se encostam (círculo)?" → `touchCircle`) — um reporter que a criança põe num "se"; o motor nunca o
  chama. A v0.55.0 (abaixo) fechou a lacuna que sobrava: o overlay desenhava retângulo mesmo em quem
  perguntava pelo círculo.

## Jogo 2D Avançado — a caixa pode ser REDONDA (v0.55.0, 01/08)

"O hitbox sempre é retângulo? Não seria possível escolher para cada sprite?" Agora dá, com uma promessa
ESTREITA de propósito: **o círculo vale para ENCOSTAR** (o bloco "se encostam?", o "para cada par que se
encosta", o golpe `didHit`, o pisar `stompKill` e o clique `pointIn`). **Empurrão sólido, tiles,
plataforma e bordas seguem quadrados** — `resolveSolid` empurra pelo menor eixo de sobreposição, conta que
não existe em círculo, e trocá-la mexeria em todo jogo de plataforma que já existe. Região e "porcentagem
de sobreposição" também ficam de fora (esta pediria a área de círculo ∩ retângulo). A escolha está
registrada no comentário do `setHitbox`, junto do "bordas são sobre o DESENHO".

⭐ **O alcance real é pequeno porque encostar passa por UMA função:** `touching(a,b)` e seus 3 chamadores.
O caminho quente fica INTACTO — `if (a._hbShape || b._hbShape)` desvia para `touchingByShape` e o AABB
inline de sempre continua sendo o que roda nos ~90 mil pares/quadro de dois enxames cheios.

- Campo `_hbShape` (`''` = retângulo, `'circulo'`), nascendo nos 3 pontos dos irmãos `_hb*`
  (`createCharacter`, `blankEntity`, reset do `spawnFromMold`) e NÃO tocado pelo `resetCharacter` (é
  configuração, não estado de partida).
- ⭐ **O raio virou derivado**: `hbRadius(e)` = `e.radius > 0 ? e.radius : min(hbW,hbH)/2`, com centro na
  CAIXA (`hbCenterX/Y`). Para isso o `radius` nasce **0** em `createCharacter`/`defineMold` (era
  `min(w,h)/2` congelado). Conserta de graça dois defeitos do `touchCircle` antigo: o raio ficava velho
  depois de `setProperty(who,'w',…)` e o círculo ignorava o deslocamento do "só os pés colidem". Sem
  caixa configurada os números batem com os de antes, então os 3 usos embutidos não mudaram.
- Bloco **`sz_gk_set_hitbox_shape`** ("Caixa de colisão de ⟨heroi⟩: forma ⟨redonda⟩, raio ⟨0⟩") em 🔧
  Propriedades & direção, irmão do `sz_gk_set_hitbox` e no mesmo degrau (`AVANCADO_2D`). Raio 0 = o motor
  calcula, mesmo idioma do `_hbW/_hbH`.
- **Campo `SHAPE` no `sz_gk_define_mold`** (10º): é o que faz TIRO e INIMIGO de molde ficarem redondos —
  eles não têm nome para receber um bloco próprio. ⭐ Mesma régua do `NAME` do "sprite de grupo com nome":
  no padrão (quadrada) a chave **não entra na IR** e o JS sai byte-idêntico ao dos projetos antigos; o
  parser aceita as duas aridades. A forma viaja `molds[k].shape` → `e._hbShape` no `spawnFromMold` (ao
  lado do `e.radius = m.radius`), então sobrevive à reciclagem do pool.
- `boxOf` do overlay desenha `arc` em quem é círculo e `strokeRect` no resto.
- Contadores: blocos **342 → 343**, API enumerável **341 → 342** (`setStageDescription`), manifest **0.55.0 → 0.56.0**.
- Testes: `__tests__/hitboxShape.test.ts` (13) + o harness compartilhado **`__tests__/kitHarness.ts`**
  (extraído do teste da borda; ⚠️ a api dele é interface NOMEADA — com `Record<string, Fn>` o
  `noUncheckedIndexedAccess` reprova CADA chamada, que foi o erro de typecheck do lote passado). E varre uma
  lista `characters` nova (capada em 200, zerada no restart) além de `pools`/`combatants`: `combatants` só
  recebe quem TOMA DANO, então num jogo sem combate a chave geral não mostraria o herói. `seen` evita
  contornar 2× quem está em duas listas.

Cadeia normal de bloco de extensão + os dois tipos em **`START_ONLY_STATEMENT_TYPES`** (`ir/lifecycle.ts`
— a pegadinha do lote irmão na básica). Contadores travados: `blockAudit.test.ts` 339 → **341** e o
`runtime.test.ts` que fixa o tamanho da API 336 → **338**. Testes:
`__tests__/stageBorderHitbox.test.ts` (CSS sem moldura, borda antes/depois do start, cap, sobrevivência
ao resize em tela cheia, retângulo com deslocamento em vez de círculo, personagem sem combate no
overlay). Verificado também em navegador real (CSS computado `border-box` sem empurrar layout; canvas 2D
real desenhando os mesmos retângulos e ZERO círculos).

**Colisão PLATAFORMA one-way (lote MapperMate F2, 18/07):** o metadado de tileset/tilemap ganhou
**`platform?: number[]`** (índices de peça one-way: pisa por cima CAINDO, atravessa por baixo/subindo).
`ProjectTilesetMeta`/`ProjectTilemapMeta` + `sanitizeTilesetMeta`/`sanitizeTilemapMeta` (`core/project.ts`)
parseiam `platform` com a régua do `solid` (dedup/sort/cap), **removendo os já-sólidos** (sólido vence)
e OMITINDO a chave quando vazia (payload antigo byte-idêntico). Runtime **game-2d**: `createTileMap`
ganha `platform` (filtra já-sólidos), `createTileMapFromAsset` serializa `meta.platform`, `isPlatformCell`
+ ramo one-way em `collideTileMap` (só caindo, pé anterior = `y+h-vy` ≤ topo). Runtime **gk**: `loadTilemap`/
`createEmptyTilemap` montam `m.platform`, `collideTilemapPlatform` clona o cruzamento de plano do
`oneWayPlatform` (feet × feet+vy·dt, respeita `_dropT`/dropThrough). Bloco "Criar mapa de tiles" ganhou
campo irmão **`PLATFORM`** (`field_solid_tiles_picker variant:'platform'` — texto/selo ⬆️/preset
"Plataformas do Pinta"; cadeia IR completa com emissão condicional = fixtures byte-estáveis). O caminho
de 1-clique (`sz_g2d_create_tilemap_from_asset`/`sz_gk_load_tilemap`) usa o meta direto, ZERO bloco novo.
manifests: game-2d `0.27.0`, gk `0.28.0`. Testes: `assetMeta.test.ts`, `tilemapFromAsset.test.ts`
(4 casos one-way), gk `runtime.test.ts` (2 casos).

**"Jogar meu mapa" — projeto-jogo a partir do mapa do Pinta (lote MapperMate F4, 18/07):**
`projects/tilemapGame.ts` (público no index: **`buildTilemapGameProject(payload)`** +
`assembleTilemapGameProject` testável + tipo `TilemapGamePayload`). A criança desenha o mapa no
Pinta e o Estúdio MONTA um `Project` COMPLETO e jogável (equivalente ao export "jogo pronto" do
MapperMate, mas em BLOCOS editáveis): `sanitizeTilemapMeta` re-valida o payload cru
(`tilemap`/`tilemapFront` são `unknown` na fronteira), monta a IR do **game-2d**
(`createTileMapFromAsset` fundo + jogador `createSprite` + `updateEachFrame` = clear → drawTileMap
fundo → mecânica → `tileMapCollide` → `cameraFollow` → drawSprite → **drawTileMap FRENTE DEPOIS do
jogador**), gera blocos (`buildWorkspaceStateFromIR`) + arquivos (`generateProjectFiles`) + os
`ProjectAsset` (mapa + `<mapa>-frente`, nome batendo o `image` do bloco) + extensão game-2d
instalada; `buildTilemapGameProject` ainda `persistProject`. **Heurística de mecânica (full review
18/07):** PLATAFORMA (gravidade+pulo) só quando uma peça-plataforma one-way está de fato COLOCADA na
grade (`gridUsesAny(bgMeta.grid, bgMeta.platform)`), NÃO só declarada no tileset — senão um mapa
top-down cujo tileset (ex.: de template) apenas DEFINE uma peça plataforma cairia em gravidade sem
motivo; senão → TOP-DOWN (RPG). O host (community-kids `pinta-client`) chama
`setStudioStorageNamespace(viewerId)` ANTES e navega pro `/estudio`. Testes: `tilemapGame.test.ts`
(6 — asset+IR+arquivos, top-down/plataforma-COLOCADA/plataforma-só-declarada-segue-top-down, frente
DEPOIS do drawSprite, `null` p/ mapa inválido).

**gk: camada "frente" do "Desenhar o mapa" (18/07):** `sz_gk_draw_tilemap` ganhou o valor **'frente'**
no dropdown LAYER, desamarrado de `solid` (o 'topos' só desenhava peças SÓLIDAS por cima). Como
"frente" é conceito de CAMADA (não de índice de peça — o mesmo índice pode estar no fundo e na
frente), o veículo é uma **grade por-célula**: `ProjectTilemapMeta`/`PintaTilemapMeta` ganharam
**`frontGrid?: string`** (mesmo formato do `grid`, só as camadas de frente). Pinta `tilemapMetaFrom`
emite `frontGrid` no meta COMPLETO quando `hasFrontLayer` (o `tilemapFront` filtrado não repete);
`sanitizeTilemapMeta` valida (mesma régua do `grid`, OMITE vazio/só-'.'). Runtime gk: `loadTilemap`
monta `m.frontRows = parseTileGrid(meta.frontGrid)`; `drawTilemap(name, 'frente')` desenha de
`frontRows` SEM o filtro de sólido (sem frontRows → não desenha nada). ⚠️ **round-trip:** o guard do
parser `parsers/js.ts` (`layer !== 'chão' && … && layer !== 'frente'`) PRECISA listar 'frente' (senão
a Ponte código→blocos joga p/ rawJS e o `blockAudit` quebra). Bump manifest gk `0.32.0 → 0.33.0` +
`docs`/`ai.ts`. Testes: `assetMeta.test.ts` (frontGrid preservado/omitido), gk `runtime.test.ts`
(drawTilemap 'frente' desenha de frontRows; sem frontRows não desenha), `blockAudit`=329 (à época; **hoje 343**, gk `0.56.0` (0.47.0/0.48.0 = refação Chris Courses R1/R2: Muralha do Reino + Escalada do Guerreiro, depois Duelo de Heróis + Portas do Castelo, todos Profissionais) — full review R31 adicionou imagem/ficha/telas + correções; 0.45.0 = fixes dos exemplos Clear Code B (fonte repõe bolas + gate timeCaido na Batalha Profissional, dica do mato na Aventura); 0.46.0 = exemplo "Chuva de Meteoros Profissional" (raylib_intro nível 2) + fix da recarga: `cooldownReady` virou prazo ABSOLUTO em playTime (a versão por-chamada travava o tiro edge-trigger `keyPressed`+recarga da receita canônica); as revisões atuais incorporaram lifecycle por domínio, descarte dos recursos da factory, acessibilidade do canvas/telas, reset completo e exclusão mútua das batalhas; a batalha RPG vive em `runtime/rpgBattle.ts`).

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
GANHOU campo `ID` visível + `img` em `ID_FIELD_TAGS`; `alt=""` é preservado pela opção explícita
“só enfeite”, enquanto a ausência de `alt` continua ausente; `id` vazio não vira atributo). Prova:
`lobstermorphFixture.test.ts` (0 raw, fixpoint textual + de blocos). ⚠️ NÃO tem exemplo
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
  de `on_resize`). Kinds no schema + `KNOWN_EVENT_KINDS`; o contrato de `placement`
  decide se o bloco pertence a Eventos e `EVENTOS_TYPE_ORDER` define apenas a ordem.
  'iniciante'.
- **Fix de round-trip `x = x - n`**: o bloco "Somar N" (`sz_js_var_increment`, DELTA negativo p/
  `x -= n` / `x = x - n`) relia SEMPRE como `x = x + -n`; agora, DELTA<0 relê `x = x - |n|` (buildIR) —
  a forma canônica do gerador → round-trip de BLOCOS byte-estável (o textual já era).
- **CSS forward-only reordena**: `justify-content: center`/`align-items: center` viram blocos dedicados
  (flex) que podem REORDENAR as declarações dentro da regra (dedicadas antes) — lossless (mesma
  renderização). O fixture prova a igualdade SEMÂNTICA do CSS (mapa seletor→declarações via `cssDeclMap`),
  não byte-a-byte; JS e HTML seguem byte-exatos. Declarações CSS repetidas, como
  `image-rendering: pixelated` + `image-rendering: crisp-edges`, permanecem em
  ordem por meio de `CSSDeclaration[]`; regras sem repetição usam o formato
  compacto `Record` por compatibilidade.

## Subsistema assíncrono + UI — lote "Starter Kit P9" (10/07/2026)

Quarto jogo do Franks Laboratory (evolução do P6, mesma base multi-arquivo achatada) — agora com
carregamento ASSÍNCRONO e um menu de UI clicável. A usuária pediu 100% núcleo (via AskUserQuestion,
"tudo em blocos"). Prova: `starterKitP9Fixture.test.ts` (0 raw, fixpoint textual + de blocos; CSS
comparado por `cssDeclMap`). **SEM exemplo embutido** (como V9/P6). Fechou:
- **Async de verdade** (novo paradigma, nível **avancado**, oculto do kids por padrão): função nomeada ou método `async`
  (checkbox `ASYNC` no `sz_js_function` e no `sz_js_class_method` — o mutator de params só mexe no `PARAMS_INPUT`, o checkbox
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

Naquele lote, a extensão `official-extensions/game-2d` chegou ao manifest `version` 0.23.0.
Foi um full review com 4 blocos de família nova. A documentação atual do aluno fica em
`manifest.docs` e o contexto da IA em `ai.ts`. A allowlist é
`EXTENSION_BLOCKLY_BLOCK_TYPES['game-2d']` (tudo-ou-nada).

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

## Índice de exemplos server-safe (`./server-examples`, 08/2026)

Subpath **`@sistemazero/studio/server-examples`** — o catálogo dos 149 exemplos oficiais em forma
de DADO PURO, consumível no **servidor** (Node/Bun, sem DOM). Nasceu para o **Zappy do Estúdio**
consultar "como se monta esta mecânica" e descrever o passo a passo à criança; o payload que vai
ao modelo é **ANÔNIMO** (sem `name`/`key`) porque, por decisão de produto, **a criança não sabe
que os exemplos existem** — o Zappy explica como conhecimento próprio, sem citar exemplo/galeria.

- `src/examples/serverExamplesBuilder.ts` — monta o índice a partir dos 5 `exampleCatalog.ts` das
  extensões + `examples/core.ts` + `examples/qaContracts.ts`. Por exemplo: `{key, extension|null,
  name, description, difficulty?, concepts?, genre?, promise, scenario, blockTypes[], requires[]}`.
  Os `blockTypes` saem de `buildWorkspaceStateFromIR(example.ir)` + walk recursivo — ⚠️ **esse
  caminho NÃO importa Blockly** (verificado; é o que mantém o módulo server-safe). Chave sem
  contrato QA = ERRO do gerador (o índice não pode divergir do que a suíte cobre).
- `scripts/gen-server-examples.ts` (script `bun run gen:server-examples`) escreve
  `src/examples/__gen_serverExamplesIndex.ts` (~291KB estáticos, precedente dos demais `__gen_*`).
  `src/examples/serverExamples.ts` exporta os tipos + `SERVER_EXAMPLES_INDEX`.
- **Drift test** `serverExamples.test.ts`: recomputa o índice e compara deep-equal + trava o
  total em 149. Adicionou/mexeu num exemplo → rode o gerador e commite o `__gen_*`, senão a suíte
  fecha a porta.

## 🔊 Som: tocar os arquivos que a criança enviou (08/2026)

Enviar som sempre funcionou por inteiro (botão "Enviar som" no `AssetsPanel`,
`kind: 'audio'`, teto de 5 MB, prévia com `<audio>`), e o `assetsBridge` já semeava
`window.__SZGAME_SOUNDS` (nome → dataURL). **O que faltava eram os blocos**, e só existiam nas
extensões AVANÇADAS (gk, g3k, w3d). Relato da dona do produto: *"envio som e não acho bloco
para receber esse som, igual a gente tem para as imagens"*.

- ⭐ **A infraestrutura já estava pronta e sem gate de extensão.** `preview/bootstrap.ts` decide
  injetar o bridge de assets olhando SÓ "existe algum asset?"; os 5 call sites passam `sounds`
  incondicionalmente; a CSP tem `media-src data:` e `audio` é permissão baseline. Um projeto
  Canvas puro com um mp3 importado **já** enxergava o manifesto.
- **Seis blocos por alvo, mesmos rótulos nos três** (é o mesmo gesto; a criança não reaprende por
  app): `Carregar o som %1 do arquivo %2` (start-only) · `Tocar o som %1` · `Parar o som %1` ·
  `Tocar a música %1 sem parar` (resource-creator) · `Parar a música` · `Pôr o volume em %1`.
- ⚠️ **Volume de 0 a 10, não de 0 a 1** nos alvos BÁSICOS e no núcleo: são a porta de entrada, e
  `0.7` não é número de criança. O runtime divide por 10. O gk (avançado) fica com o seu `0..1`.
- ⚠️ **Uma trilha por vez**: começar outra troca a que estava tocando (duas faixas sobrepostas não
  teriam bloco que desfizesse); repetir a mesma não recomeça a faixa.
- ⚠️ **Nomes internos divergem entre 2D e 3D de propósito.** No `game-2d`, `playSound`/`playMusic`
  já pertenciam ao bip e à melodia sintetizada — e bloco que a criança já usa não muda de forma —,
  então o runtime usa `loadSound`/`playClip`/`stopClip`/`playTrack`/`stopTrack`/`setSoundVolume`.
  No `game-3d`, onde não havia conflito, são `playSound`/`playMusic`. O `stopTrack` do 2D para as
  DUAS músicas (arquivo e sintetizada), para "Parar a música" sempre fazer o esperado.
- ⭐ **Fila de gesto**: o navegador RECUSA `play()` antes de um clique e a recusa é SILENCIOSA
  (promise rejeitada). Sem ela, "Tocar o som" dentro de "Ao iniciar" não acontecia e nada aparecia
  no console. Agora o pedido espera o primeiro clique/tecla e então toca. O `game-3d` não tinha
  destravamento algum (só `resume()` no toque) e ganhou o mesmo do 2D.
- **NÚCLEO**: categoria de topo **🔊 Som** (magenta `#a21caf`), nível `iniciante-2d`, blocos
  `sz_som_*` em `blockly/blocks/som.ts`. O código gerado chama **`window.__szAudio`**
  (`preview/audioBridge.ts`), o SEGUNDO bridge do núcleo ao lado do `__szInput`: string
  auto-contida, injetada em todo projeto pelo bootstrap e escrita como `public/sz-audio.js` no
  export. Ele lê o manifesto de forma **preguiçosa**, então a ordem no `<head>` não importa.
  ⚠️ O preâmbulo do gerador (molde do pré-carregador de imagens) foi REJEITADO: embrulha o
  programa inteiro num `.then()` e exige codec de marcadores para a Ponte desfazer.
- ⚠️ **Categoria nova do núcleo custa SEIS registros**: `theme.ts` (cor) · `core/levels.ts`
  (`CORE_CATEGORY_LEVELS`) · `blocks/index.ts` (`CORE_BLOCKS`) · `toolbox.ts` (`pushGrouped`) ·
  **`paletteMap.ts`** (espelho manual, server-safe) · `blockCatalog.ts` (senão some do picker do
  admin e do Zappy). E os tipos em `CORE_BLOCKLY_BLOCK_TYPES` — faltar ali **zera TODOS** os
  blocos do projeto no load (é tudo-ou-nada). `blockly/__tests__/somAudit.test.ts` prova o fio
  inteiro e checa os seis pontos.

## 🎬 Animação de UMA vez (v0.63.0, 08/2026)

Toda animação de spritesheet do Jogo 2D era **loop infinito por construção**: o quadro é derivado do
relógio numa linha só (`runtime/sprites.ts`, no `_drawSpriteBody`) e o `% quadros` dela era a ÚNICA
coisa que existia — sem contador de voltas, sem flag, sem callback, sem como perguntar. Pedido da
dona do produto: *"tenho uma estrela cadente e quero que ela anime apenas 1 vez"*.

- **`sz_g2d_animate_once`** ("… uma vez só") + o VALOR **`sz_g2d_anim_ended`** ("a animação de …
  acabou?"). Blocos NOVOS ao lado dos antigos — a regra "bloco que a criança já usa não muda de
  forma". Molde: o par `sz_gk_play_anim_once`/`sz_gk_anim_ended` do Jogo 2D Avançado.
- `animationEnded` é PURO (`(agora - start) * fps >= quadros`), sem estado novo; o clamp no desenho é
  `once ? Math.min(quadros - 1, passo) : passo % quadros`.
- ⚠️ **A guarda de idempotência vale só ENQUANTO a one-shot corre.** Com ela comparando apenas os
  argumentos (como faz o gk), o MESMO golpe tocaria uma única vez na partida inteira — e "quando
  apertar espaço, golpe" é o caso principal do bloco. Depois de acabar, chamar de novo REINICIA.
  Posto solto no "a cada quadro" vira um laço; o que não pode é congelar no 1º quadro.
- ⚠️ **`autoAnimate` cede a vez** enquanto uma one-shot corre (senão bastava o sprite andar para ela
  ser trocada no quadro seguinte). ⭐ E, ao ceder, precisa **ZERAR `_animState`** quando ela acaba:
  sem isso o estado velho bate com o calculado, o early-return corta a troca e o sprite fica
  congelado no último quadro PARA SEMPRE. O g2d não tem trava de estado como a `sz_gk_set_entity_state`.
- ⚠️ **`animationEnded` não é 100% puro por causa dessa retomada.** Ao ceder a vez, o `autoAnimate`
  TROCA a animação no mesmo quadro em que a one-shot acabou — e aí o cálculo puro responderia NÃO. A
  resposta passaria a depender da ORDEM em que a criança empilhou os blocos ("mudei de lugar e parou
  de funcionar"). Por isso o `_onceEndedStamp`: carimba `_frameStamp` DEPOIS do `setAnimation`, e o
  `animationEnded` responde SIM até o fim daquele quadro. Uma one-shot nova no mesmo quadro volta ao
  cálculo puro e responde NÃO — o carimbo não vaza.
- ⚠️ É uma PERGUNTA, não um evento: enquanto o sprite fica congelado a resposta é SIM a cada quadro.
  O balão manda mudar o sprite (sumir/trocar a imagem, que zeram o `anim`); um "somar ponto" solto
  ali somaria sem parar.
- ⚠️ **`isSimpleValue` (`parsers/js.ts`) tem lista EXPLÍCITA**: valor de extensão que não entre nela
  vira `rawJS` no round-trip e a criança PERDE o bloco. O `blockAudit` pega.
- Comportamento provado em `__tests__/animateOnce.test.ts` (runtime avaliado de verdade, relógio
  injetado). ⚠️ A ordem importa no teste do `autoAnimate`: o sprite precisa JÁ estar andando quando o
  golpe começa, senão o `_animState` nunca fica sujo e o teste passa mesmo com o defeito.

## Comandos

- `bun run dev` — playground Vite (porta 5173; rota `/dual` = 2 instâncias lado a lado)
- `bun run gen:server-examples` — regera o `__gen_serverExamplesIndex.ts` (ver seção acima)
- `bun run typecheck` / `bun run test` / `bun run check`
- `bun run e2e` — suíte Playwright completa em Chromium e Firefox contra o playground (manual); o
  CI roda o subconjunto `examples-gallery.spec.ts --project=chromium --grep "game-2d(?:-advanced)?:"`

## Home "Meus Jogos" no padrão Pinta (08/2026)

A `ProjectList` virou cabeçalho de SEÇÃO da comunidade, espelhando a galeria "Meus desenhos" do
Pinta: h1 display `t('projects.heroTitle')` ("Meus Jogos") + subtítulo `t('projects.subtitle')`
("Dê vida aos seus jogos...") à esquerda, ações à direita terminando na ÚNICA pílula 3D primária
("+ Novo projeto"); **largura TOTAL** (sem `max-w-5xl`).

- ⭐ **Grade por `auto-fill`, não por `grid-cols-N`** (`PROJECT_GRID_CLASS`,
  `minmax(225px, 1fr)` + `gap-4`). Com o `xl:grid-cols-4` de antes o teto era o número de COLUNAS,
  então o card ENGORDAVA conforme a tela crescia (~456px num monitor de 1920). Agora a largura do
  card fica estável (~230–270px) e é a quantidade de colunas que acompanha a tela — medido:
  1280→5 · 1366→5 · 1440→5 · 1600→6 · 1920→7 · 2560→9. `auto-fill` e NÃO `auto-fit`: com `auto-fit`
  as faixas vazias colapsam e dois projetos numa tela larga viram dois cards de faixa inteira.
  ⚠️ O piso 225px é o MESMO do `.pensa-project-grid` de propósito — os cards do Estúdio e do Pensa
  saem do mesmo tamanho sem número mágico para sincronizar.
- **Card em `h-72`** (era `h-48`): a capa é `flex-1`, então a altura do card é o que sobra para
  ela. Com 192px a foto virava uma tira de ~60px, achatada demais para reconhecer o jogo; com
  288px ela fica em ~124px, ou seja ~1.5:1 — perto do palco 5:3 do `/jogar`. O rodapé é
  **EMPILHADO** (data numa linha só + "Abrir" de largura inteira): medido, "Atualizado em
  06/08/2026, 20:13" ocupa 183px e o botão mais 79px, então lado a lado o card precisaria de 298px
  — e 298px derruba a grade para 4 colunas num monitor de 1366. ⚠️ O skeleton de carregamento tem
  a MESMA altura (senão volta o layout shift).

- **Classes `sz-home-*` em `studio.css`** (sob `[data-sz-theme]`, vars `--sz-home-gradient`/
  `--sz-home-cta` com fallback kids + override no claro): `.sz-home-btn3d` (pílula gradiente com
  sombra dura, espelho do `.pin-btn-3d`), `.sz-home-btn-ghost` (⚠️ SECUNDÁRIO mas ainda BOTÃO:
  borda 2px + sombra `0 2px 0` + fundo de painel. Com `border: 0` + fundo transparente, "Importar"
  e "Ver os jogos prontos" liam como texto solto na página e só o hover revelava que eram
  clicáveis), `.sz-home-panel` (borda 2px, raio
  1rem, sombra `0 3px 0` — espelho do `pin-panel`), `.sz-home-pop` (hover com guarda
  reduced-motion). ⚠️ Nomeadas `sz-home-*` porque o host kids tem GLOBAIS `.sz-display`/
  `.sz-btn-gradient` — não colidir. Estilo load-bearing vive nas classes CSS (o `cn()` do studio é
  join simples, sem tailwind-merge), aplicadas via `className` nos `Button` — **`ui-internal/
  Button.tsx` fica intocado** (vazaria pro editor inteiro).
- `ProjectCard` usa `sz-home-panel sz-home-pop`; kebab/menu/inputs na receita 44px + borda 2 +
  canto xl. ⚠️ As constantes `MENU_WIDTH`/`MENU_HEIGHT` (posicionamento do menu portalado) andam
  em LOCKSTEP com o restyle do menu.
- **Nomes acessíveis dos e2e INTOCÁVEIS** (lista na seção de regras): `+ Novo projeto`, `Importar`,
  `Ordenar projetos`, `Buscar projeto…`, `Abrir`, `Mais ações`, etc. — `ProjectList.test.tsx`
  trava o copy do cabeçalho E esses nomes.

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
- `baseUrl` da IA (OpenRouterProvider não suporta).
- CSS pré-compilado como alternativa ao `@source` dos consumers.

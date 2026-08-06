# CLAUDE.md — @sistemazero/pinta

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em lib/framework, e use
> Octocode para pesquisa/exploração de código no GitHub.

**Pinta** — editor de assets de jogos para crianças com DOIS estilos de igual peso: **pixel art**
e **vetor** (formas SVG). Nos dois dá para criar personagem ANIMADO (com preview rodando), cenário,
peças (tileset) e mapa (tilemap), com export compatível com o Estúdio. Jornada do produto: Pensa
planeja → **Pinta desenha** → Estúdio constrói. Biblioteca INTERNA do monorepo, consumida como
**TS source** (modelo do pensa/studio): sem build; os apps usam `transpilePackages` +
`@source "../../../pinta/src"` + `@import "../../../pinta/src/styles/pinta.css"` no globals.css
(MESMO gotcha do Studio — sem o @import as utilitárias `pin-*` são no-op).

## API pública (`src/index.ts` — TUDO fora dela é interno)

> Exceção deliberada: o subpath **`@sistemazero/pinta/studio-library`**
> (`src/export/studioLibrary.ts`) — a face de DADOS para o host ligar o "Trazer
> do Pinta" do Estúdio (08/2026): `listGalleryForStudio()` (resumos + miniatura
> leve: pixel/tilemap-pixel = PNG pequeno, vetor = SVG dataUrl sem canvas, cache
> por `updatedAt`) e `exportAssetForStudio(id)` (payload da ponte já validado
> pelos tetos — `ExportForStudioResult` com `reason` tipada). Zero React lá
> dentro (o import dinâmico do host não puxa o app); o host seta o namespace
> pelo `setPintaStorageNamespace` RE-EXPORTADO no próprio subpath.

- **`setPintaStorageNamespace(viewerId)`** — o host chama ANTES de montar (isola a galeria por
  PERFIL no IndexedDB; vazio = store default `sistema-zero-pinta`; mesmo contrato do studio).
- **`<PintaApp adapter={PintaHostAdapter} />`** — uncontrolled, navegação por ESTADO (galeria ⇄
  editor, sem router).
- **`PintaHostAdapter`** (`src/core/types.ts`): `theme?` ('light' default kids | 'dark'),
  `studioOwned?` (só muda a COPY do sucesso da ponte), `onOpenStudio?`,
  `sendToStudio?(PintaExportedAsset) → PintaSendResult` — **ausente = o botão "Usar no Estúdio"
  não aparece** (degrade, padrão Pensa); desde 08/2026 o botão também exige
  **`asset.projectRef`** (desenho de um jogo do Pensa, onde ele marca o progresso da missão) —
  desenho avulso chega ao Estúdio pelo "Trazer do Pinta" de lá —, **`resyncToStudio?`** e **`initialAssetId?`** (ponte de
  MÃO DUPLA, 08/2026 — ver abaixo), **`taskSession?: PintaTaskSession`** e
  **`initialIntent?: PintaInitialIntent`**: `{projectRef, artKind?, style?}` vindo do Cartão de
  Criação aberto por `/pinta?tarefa=<id>` — abre o
  "Criar novo" pré-configurado UMA vez no mount (`takeInitialIntent` no appContext consome via
  ref; voltar do editor à galeria NÃO reabre). Com `artKind`, escolher o ESTILO pula o passo de
  tipo (`NewAssetDialog.initialRole` mapeia sprite/background/tileset → kind do estilo), o nome
  vem sugerido (`heroi`/`cenario`/`pecas` com sufixo anti-colisão) e o topo mostra o selo
  "Desenho para o jogo: <nome>". Fechar o diálogo descarta o intent.

`TaskBriefPanel` mantém “Brief do meu jogo”, passos e critérios visíveis. Abrir um desenho liga
seu id ao `outputRef` e inicia a tarefa. A conclusão exige os itens obrigatórios, um asset local
vinculado e, quando `requiresStudioUse`, o sucesso de “Usar no Estúdio”. O host persiste o
progresso; o Pinta continua sem backend próprio. Contrato transversal: [`../../docs/pensa-planner.md`](../../docs/pensa-planner.md).

## Modelo de dados (`src/core/project.ts` + `projectConfig.ts` — NÃO em types.ts)

- **Não há "projeto"**: a galeria é a lista de ASSETS do perfil; cada asset é um registro
  independente no IndexedDB (`pinta:asset:<id>`, store `sistema-zero-pinta-<ns>`). **MAS (Fase 5)
  todo asset pode carregar um `projectRef?: PintaProjectRef`** (`{id, name, palette?}` — o vínculo
  com o PROJETO do Pensa): a galeria agrupa por `projectRef.name` (seções "🎮 <jogo>" + "Desenhos
  avulsos"; sem nenhum ref = grade plana, zero regressão) e o **VectorEditor** põe a paleta do
  jogo na FRENTE dos swatches fixos (dedupe; SÓ no vetor — o bitmap é indexado em 16 cores e não
  muda). `sanitizeProjectRef` é o portão ÚNICO (exportado: o `galleryStore.create` também o usa) —
  hex minúsculo, ≤8 cores, nome no teto; malformado descarta o REF, nunca o asset.
- **`PintaAssetKind` = ESTILO × PAPEL** (união discriminada plana de 7 kinds):
  `pixel-sprite` · `pixel-background` · `tileset` · `tilemap` (papel dos dois estilos — o
  `tilesetId` aponta para tileset pixel OU vetorial) · `vector-sprite` · `vector-background` ·
  `vector-tileset`. Helpers derivados: `assetStyle(kind)` ('pixel'|'vector'|null p/ tilemap),
  `assetRole(kind)`, `isTilesetKind` (`AnyTilesetAsset`), `isAnimatedSpriteKind`
  (`AnimatedSpriteAsset`), `paletteIdOf` (default p/ kinds sem paleta própria).
- **`PintaAnimation<TFrame>`** é genérica: pixel usa `PintaBitmap`, vetor usa
  `VectorFrame = VectorShape[]` (`PintaVectorAnimation`). `vector-sprite` tem
  `frameWidth/Height` (o quadro rasteriza 1:1 na folha — o documento É o tamanho do sprite;
  tamanhos em `VECTOR_SPRITE_SIZES` [32,64,128]); `vector-tileset` tem `tiles: VectorFrame[]` +
  `solid[]` (mesmo invariante do pixel: índice no array = índice no Studio).
- **MIGRAÇÃO lazy**: o kind antigo `vector` ("Desenho livre") vira `vector-background` DENTRO de
  `sanitizePintaAsset` (o único ponto de normalização — roda em load E import; o registro só é
  reescrito no próximo save). ⚠️ NUNCA renomear kind sem mapear o antigo no sanitize: o
  `default → null` descarta da galeria em silêncio (guarda: teste de round-trip por kind).
- **`PintaBitmap { width, height, data: Uint8Array }`** — ÍNDICES de paleta (1 byte/pixel),
  índice 0 = TRANSPARENTE. Paletas SEMPRE 16 cores (`core/palette.ts`): `arcade` (MakeCode,
  default) + `pastel` + `cinzas`. O vetor usa COR LIVRE (hex), sem paleta.
- Quotas, normalização e fábricas vivem em `projectConfig.ts`; `project.ts` mantém os tipos,
  helpers e o sanitizer e reexporta o contrato histórico. `PINTA_LIMITS` é compartilhado
  criação↔sanitize — subir um teto sobe em todos os pontos.
  `sanitizePintaAsset(raw)` NUNCA lança (descarta com null, padrão studio). Tile corrompido vira
  tile VAZIO (não some — preservaria os índices dos mapas); quadro vetorial vazio `[]` é VÁLIDO.
- Nome de asset: kebab via `normalizeAssetName` — ⚠️ manter em sincronia com o
  `normalizeAssetName` do studio (o nome atravessa a ponte e vira o nome nos blocos).

## Arquitetura

- **Fluxo de criação (`NewAssetDialog`)**: 4 passos — ESTILO (Pixel art | Vetor, lembra o último
  via `galleryStore.lastStyle`) → TIPO (mesmos papéis nos 2 estilos) → tamanho → nome. Mapa
  habilita com QUALQUER tileset (badge de estilo no seletor).
- **Motor pixel (`src/pixel/`)**: `ops.ts` operações PURAS; `tools.ts` máquina PURA de gesto;
  `selection.ts`; `render.ts` única camada canvas.
- **Editor vetorial (pasta `components/editor/vector/`, 08/2026)**: shapes = elementos SVG REAIS;
  edita o "documento de shapes ativo" via `activeShapesOf`/`withActiveShapes`
  (`core/assetEdit.ts` — espelho do par bitmap): cenário inteiro, quadro da animação
  (vector-sprite) ou tile (vector-tileset, `frameIndex` da sessão = índice do tile). O antigo
  componente único `VectorEditor.tsx` foi DECOMPOSTO: **`VectorEditorScope`** (provider por
  documento com estado + ações, consumido via `useVectorEditor()`), **`VectorToolbox`** (caixa),
  **`VectorStage`** (palco + gestos + diálogo de texto), **`VectorColorsPanel`** (Cores),
  **`VectorLayerPanel`** (Camadas), **`VectorRightColumn`** (coluna direita + disclosure
  estreito), `vectorTools.ts` (catálogo/helpers) — o `VectorPropertiesPanel` (Aparência) lê do
  contexto. ⚠️ O palco `<svg>` tem **width/height DEFINIDOS** (doc × zoom, como o
  canvas) — sem isso o wrapper shrink-to-fit colapsa a zero e "a área não aparece" (bug histórico;
  regressão testada). Zoom próprio (`VECTOR_ZOOM_LEVELS`, sessão com `zoomLevels` injetável) +
  botão Ajustar + ferramenta Mão 🖐️ (pan — touch tem touch-action:none; SEGURAR ESPAÇO vira a Mão
  em qualquer ferramenta). Onion skin vetorial via
  `previousShapesOf`. Alças de seleção dimensionadas em px de TELA (÷zoom). Teclado: Delete/setas
  na seleção (listener no window, ignora inputs). Todo gesto guarda `pointerId` (multi-touch não
  corrompe). Pincel usa `smoothStrokeToPathCapped` — o `d` criado SEMPRE cabe no `MAX_PATH_CHARS`
  do sanitize (senão o traço sumiria no reload); acima de 1500 pontos crus decima O(n)
  ANTES do RDP (O(n²) no pior caso — rabisco zigue-zague longo travava o soltar do
  pincel por segundos e estourava o timeout de 5s do teste no CI). Ver a seção
  "Editor de VETOR: paridade + recursos (08/2026)".
- **Animação compartilhada**: `animation/frames.ts` e `tiles/tilesetOps.ts` são GENÉRICOS sobre o
  estilo (`AnimatedSpriteAsset`/`AnyTilesetAsset`; clone vetorial regenera ids de shape);
  `SpriteSheetPanel` concentra animações+quadros e `PreviewPlayer`/`TileStrip` servem os 2 estilos
  (thumbs pixel = canvas, vetor = `VectorFrameSvg` SVG inline, memoizado).
  `useAnimationPlayer` é puro.
- **Compatibilidade com o Studio POR CONSTRUÇÃO** + testes-guarda que reimplementam as fórmulas do
  runtime: a GEOMETRIA da spritesheet é ÚNICA (`packAnimationsGeometry`/`SheetGeometry` — uma
  linha por animação, `columns = max(frames)`) e serve pixel (`packSpritesheet`) E vetor
  (`packVectorSpritesheet` em `export/vectorSheet.ts`); tileset empacota `cols = min(count, 8)`
  nos dois (`packTileset`/`packVectorTileset`); tilemap exporta a grade de texto
  (`"0 1 1 0;. . 2 ."`, `export/studioGrid.ts`, aceita `AnyTilesetAsset`).
- **Folhas vetoriais**: um documento SVG com `<svg>` ANINHADO por célula (clipa por padrão =
  paridade com bitmap), rasterizado UMA vez via Blob URL (`svgToPngDataUrl` em
  `vector/rasterize.ts`); tilemap vetorial usa `<symbol>/<use>` (`tiles/renderVectorTilemap.ts`).
  Upscale vetorial = re-render (sem perda).
- **Ponte "Usar no Estúdio" é ASYNC** (`export/studioBridge.ts buildStudioPayload`): PNG achatado
  {id,name,dataUrl,width,height} **+ METADADOS (07/2026)**: sprites levam `sprite: {frameW,frameH,
  animations:{name,from,to,fps,loop}[]}` (de `packSpritesheet`/`packVectorSpritesheet` — helper puro
  `spriteMetaFromPack`) e tilesets levam `tileset: {tileSize,solid:number[]}` (`tilesetMetaFrom`:
  boolean[]→índices). Assim o Estúdio oferece o SELETOR de animação POR NOME (a criança não digita
  mais os índices) e o de tiles sólidos. O `PintaExportedAsset` ganhou `sprite?`/`tileset?` opcionais;
  o `EditorScreen` os repassa no `sendToStudio`; o host (community-kids) já encaminha o asset inteiro
  ao `savePersonalAsset` (sem mudança). O Estúdio é o DONO do formato (sanitiza no `#core`); asset sem
  metadado → fallback manual no bloco. Guarda de 800k chars (só do `dataUrl`) ANTES de enviar
  (sincronizada com `MAX_ASSET_DATA_URL_CHARS` do studio — comentário recíproco nos 2 lados). A trava
  `sending` arma ANTES da rasterização (anti duplo clique). ⚠️ Em happy-dom o raster devolve `null`
  (sem canvas) → o payload inteiro é `null`; os metadados são testados pelos helpers PUROS
  (`studioBridge.test.ts`), o resto é QA de browser.
- **Stores zustand POR INSTÂNCIA** (factories, nunca singleton): `galleryStore` (CRUD + `lastStyle`;
  import religa tilemap→tileset via idMap, tilesets entram PRIMEIRO na quota), `editorStore`
  (history por snapshots com orçamento em bytes — `assetBytes` conta o payload real dos shapes —
  + autosave debounced ~1s com flush; `persist` injetável), `sessionStore`
  (ferramenta/cor/zoom/`zoomLevels`/onion — a Mão 'pan' é da sessão, não do motor pixel).
- **Persistência (`src/state/persistence.ts`)**: cada operação captura o store do namespace no
  instante da chamada; a fila FIFO é por handle de IndexedDB, nunca por id/namespace global.
  `persistAssets` usa um único `setMany`, portanto commits que alteram tileset+mapas dependentes
  ficam atômicos e não atravessam de perfil durante uma troca de sessão.
- **Copy 100% PT** centralizada em `src/core/copy.ts` (sem travessão, sem jargão; nomes de cor
  amigáveis em `colorNames` p/ os swatches).
- **Seleção do PIXEL com ações + atalhos + zoom pela rolagem (08/2026)** — ver a seção
  dedicada mais abaixo.
- **Layout dos kinds de PIXEL no desktop (revisto 08/2026, pedido da usuária)**: coluna ESQUERDA
  só com o rail de FERRAMENTAS · palco no meio · coluna DIREITA (`w-68`) com **Prévia → Camadas →
  Cores** · faixa (Spritesheet/peças + zoom) em **LARGURA TOTAL** no rodapé.
  ⚠️ O arranjo anterior (cores na esquerda, faixa só sob palco+prévia) existia porque
  ferramentas+cores juntas não cabiam em 1366×768 quando a faixa era um rodapé de tudo. Com as
  cores na direita esse conflito sumiu: medido em 1366×768, o rail sozinho ocupa 391px e a página
  não rola. **A faixa segue com teto interno próprio** (`max-h-56` na lista do `SpriteSheetPanel`)
  e rola por dentro — o topo do palco nunca se move. Efeito colateral aceito: no PERSONAGEM
  animado a coluna direita (prévia 244 + camadas + cores ≈ 700px) rola por dentro; no cenário
  cabe inteira (626px).
- **Responsivo (07/2026)**: `EditorScreen` usa `useMediaQuery('(min-width: 768px)')`
  (`editor/useMediaQuery.ts`, espelho do pensa) — em tela ESTREITA a coluna lateral do sprite
  (prévia + animações, `SpriteSidePanel`) vira FAIXA horizontal rolável abaixo do palco (a
  coluna fixa w-48 espremia o canvas no tablet). **Atalhos**: Ctrl/Cmd+Z desfaz,
  Ctrl/Cmd+Shift+Z e Ctrl/Cmd+Y refazem (listener de window no `EditorScreen`, ignora
  INPUT/TEXTAREA/contentEditable — mesmo guard do VectorEditor). **Onboarding**: galeria vazia
  mostra convite grande + CTA `gallery.emptyCta` (rótulo distinto do "Criar novo" do header, p/
  não colidir com o getByRole dos testes).
- **⭐ O Pinta é uma SEÇÃO da comunidade kids, não um app à parte (08/2026)**: fundo, superfície,
  borda e texto dos tokens `--color-pin-*` apontam para os primitivos `--sz-kids-*`
  (`@sistemazero/ui/theme-kids.css`) com FALLBACK literal — dentro do kids o fundo é o MESMO
  `--background` da página (azul-céu `#f0f8ff`; escuro = navy), então o app "assenta" nela sem
  emenda; fora do kids vale a reserva (o creme MakeCode de antes). O host TIROU o card que
  envolvia o app (`pinta-client.tsx`), e o cabeçalho da GALERIA é o cabeçalho de seção da
  comunidade (`text-3xl md:text-4xl` + subtítulo) — some sozinho ao abrir o editor.
  ⚠️ `color-mix` vai **`in oklab`, nunca `in oklch`**: oklch é polar e interpola o MATIZ —
  misturar o azul (252°) com o branco (`oklch(1 0 0)`, matiz 0) dá ROSA (pego no QA).
  ⚠️ O Tailwind v4 **PODA do `@theme`** os tokens que nenhuma utilitária usa: valor consumido só
  por CSS (ex.: `--pin-panel-head`) mora no bloco `[data-pinta-theme]`, não no `@theme`.
- **Galeria compacta (08/2026)**: grade `auto-fill minmax(164px,1fr)` — ≈6 colunas num notebook de
  1366 e 9 em 1920, card sempre ~165px (número FIXO de colunas esticaria o card no monitor
  grande). ⚠️ **O piso de 164px é a REGRA DE TOQUE**: as três ações (renomear/duplicar/apagar)
  ficam NO card, e três alvos de 44px somam 132px + respiros. Um menu "⋮" com card de ~94px (10
  colunas) chegou a ser feito e foi REJEITADO pela dona — não reintroduzir sem ela pedir.
- **Painéis com cabeçalho (`components/ui/Panel.tsx`)**: faixa de título tonal (`.pin-panel-head`)
  + divisória, no lugar do `<span>` em negrito solto. ⚠️ O `aria-label` fica na MESMA `<section>`
  (4 testes casam o seletor `section[aria-label=…]`) e o título é MOVIDO, nunca duplicado (Prévia
  e Spritesheet têm `getByText` que quebra com dois nós do mesmo texto).
- **CSS**: tokens `--color-pin-*` em `@theme` sob `[data-pinta-theme]` (claro default kids).
  Cor de chip por PAPEL (`pin-kind-*`, só emoji) + selinho de ESTILO (`pin-style-*`, carrega
  TEXTO branco — ⚠️ manter L ≤ ~0.55 nos DOIS temas). SEM `@import "tailwindcss"`, SEM `@source`,
  SEM regras globais. Prefixo `pin-` (NÃO `pt-`/`px-`).
- **a11y**: alvos ≥44px, Dialog com foco/Esc/trap, Toast aria-live, wizard com bolinhas de
  progresso + `role=status` no erro de nome.

## Seleção do pixel, atalhos e zoom pela rolagem (08/2026)

**Ações do pedaço selecionado (`PixelCanvas`)** — copiar/recortar/colar/duplicar/espelhar/
apagar. Motivação: fazer a asa do outro lado da nave sem redesenhar.
- Área de transferência = **`sessionStore.clipboard: PintaBitmap | null`** (ao lado do
  `stamp`). Vive na SESSÃO de propósito: sobrevive à troca de quadro → copiar no quadro 1 e
  colar no 2 é o caso de uso da animação.
- `pixel/selection.ts` ganhou dois puros: **`cropBitmap`** (recorte SEM furar a origem — o
  `extractSelection` reusa) e **`hasPaintedPixel`**.
- Colar cria um recorte FLUTUANTE em `origem + 2px` com `remaining` = o desenho atual
  (colar ACRESCENTA, não fura), liga a ferramenta `select` e só vira bitmap no carimbo.
  Duplicar = copiar + colar. Espelhar levanta o assentado (`extractSelection`) antes de
  girar. Apagar: flutuante → commita `remaining`; assentado → commita o buraco.
- **Regra da usuária: só o que foi PINTADO é selecionável.** Marquee cujo retângulo não
  tem nenhum pixel opaco NÃO vira seleção (`hasPaintedPixel` no `selectPointerUp`) — antes
  a barra abria em cima de fundo quadriculado vazio.
- **Clicar FORA do desenho desseleciona** (listener de `pointerdown` no document; o canvas
  e a própria barra não contam como "fora") — senão a barra ficava presa aberta.
- Barra flutuante (`role=toolbar`, absoluta sobre o palco, some sem seleção): Duplicar ·
  Espelhar ↔ · Espelhar ↕ · Apagar. É a via do TOUCH, onde não há teclado.
- Teclado (listener de window, ignora INPUT/TEXTAREA/contentEditable): Ctrl/Cmd+C · +X ·
  +V · +D · Delete/Backspace. Ctrl+C só consome a tecla quando há seleção.
- O `PixelCanvas` **carimba a seleção pendente no DESMONTE** (a limpeza do filho roda antes
  do `flush()` do EditorScreen) — antes um recorte levantado se perdia ao sair do editor.
- O espelho React da seleção é só `'none' | 'rect' | 'floating'` (`selKind`): o arrasto do
  recorte continua em refs, sem re-render por movimento.

**Zoom pela rolagem (`useWheelZoom`, os 3 palcos)** — rolar aproxima/afasta nos degraus da
sessão; Ctrl+rolagem também (pinça do trackpad, sem zoom do navegador); **Shift+rolagem
continua rolando**. Gotchas travados:
1. O listener é `addEventListener('wheel', …, { passive: false })` À MÃO — o `onWheel` do
   React é PASSIVO na raiz e o `preventDefault()` seria ignorado (o palco rolaria).
2. O ponto sob o cursor fica ancorado por correção RELATIVA da rolagem, aplicada no layout
   E depois da pintura (o canvas do pixel/mapa só redimensiona no efeito que pinta).
3. O wrapper do canvas do pixel tem **tamanho explícito (doc × zoom)**, como o `<svg>` do
   vetor: sem isso a área rolável fica com a medida velha por um quadro e a âncora erra.
4. **Palcos com `min-w-0` + `[align-items:safe_center]`/`[justify-content:safe_center]`**
   (nos 3): sem `min-w-0` o mínimo automático do item flex é o do CONTEÚDO e o canvas
   aproximado esticava o editor em vez de rolar; com `items-center`/`m-auto` puros o que
   passa do topo/da esquerda fica INALCANÇÁVEL (rolagem não vai a negativo) — metade do
   desenho aproximado sumia. Ambos eram bugs PRÉ-EXISTENTES.
5. happy-dom DESCARTA `deltaMode`/`shiftKey` do init do `WheelEvent` — os testes montam o
   evento à mão com `Object.defineProperties`.

**Atalhos de ferramenta (`useToolShortcuts` + `toolShortcutMap`)** — letras dos programas de
desenho de gente grande (a criança leva o hábito). Combinação com Ctrl/Cmd/Alt é ignorada
(não atropela copiar/colar/desfazer) e campo de texto também. A letra entra SÓ no `title`
do `ToolButton` (`shortcut`); o `aria-label` segue sendo o rótulo puro (leitor de tela +
testes por `getByRole({name})`).

| | Pixel | Vetor | Mapa |
|---|---|---|---|
| P/E/G/R | Lápis · Borracha · Balde · Trocar cor | Caneta | Lápis · Borracha · Balde |
| M/V/A/H | Selecionar | Selecionar · Editar pontos · Mão | Selecionar · Mão |
| B/L/U/O | Linha · Retângulo · Círculo | Pincel · Linha · Retângulo · Círculo | Linha · Retângulo |
| I/T/Y/S | Conta-gotas | Conta-gotas · Texto · Polígono · Estrela | Conta-gotas |

⚠️ No vetor, `A` sozinho é "editar os pontos" e `Ctrl+A` continua "selecionar tudo". `P` é a
Caneta SÓ no vetor (o Lápis do pixel usa o mesmo `P` — os mapas de atalho são POR editor).
No MAPA, **Delete** aciona o "Apagar pedaço" que já existia (a ação vem por ref, montada
depois das saídas antecipadas do componente).

### Correções do full review (01/08) — o que a usuária viu no playground

- **⭐ "os botões piscam e a grade sobe e desce"**: a barra Copiar/Apagar pedaço do MAPA era
  filha EM FLUXO do palco — aparecer empurrava a grade para baixo, sumir puxava de volta, e
  clicar em células seguidas fazia o mapa balançar. Agora ela **flutua** (absolute num wrapper
  `relative`, fora do container rolável), igual à do pixel: `canvasTop` fica CONSTANTE ao
  selecionar/desselecionar. Regra: **nada que apareça/suma com a seleção pode estar no fluxo do
  palco.**
- **"consigo selecionar a grade de fundo"** no mapa: `hasFilledCell` (espelho do
  `hasPaintedPixel`) — marquee só de células vazias não vira seleção. Clicar fora do mapa
  também desseleciona (mesmo listener de `pointerdown` no document do pixel).
- **"clico com o lápis e não acontece nada"**: NÃO era o lápis — a peça selecionada estava EM
  BRANCO (tileset novo nasce com 1 peça vazia), então pintar não mostra nada. `isTileBlank`
  (`tiles/tilesetOps.ts`) + toast `COPY.tiles.blankTile` avisam no 1º traço; **não bloqueia**
  (a célula guarda o ÍNDICE, então desenhar a peça depois preenche o mapa sozinho).

⚠️ **Gotchas de QA em browser deste editor** (custaram tempo): (1) o mapa converte
ponteiro→célula pela LARGURA REAL do canvas — em happy-dom (rect 0) todo clique vira
`Infinity`, então o teste de UI FIXA o `getBoundingClientRect`; (2) disparar vários gestos no
MESMO turno de JS faz cada um partir do bitmap velho (o React ainda não re-renderizou) — só o
último sobrevive; use UM gesto com vários `pointermove`; (3) o toast/o repaint aparecem um
microtask/efeito DEPOIS do evento — ler no mesmo turno dá falso negativo.

## Painel de cores do PIXEL (redesign 08/2026)

O `PaletteBar` virou painel COMPACTO: header = **nome da paleta ativa** (abre o DROPDOWN de troca)
+ **lixeira** (exclui a cor selecionada, com confirmação) + **"+" azul** (seletor livre); embaixo,
grade de swatches QUADRADOS, **5 por linha**, com **scroll interno** (`max-h-48` — as 17 células
base cabem em 4 linhas sem scroll; a coluna esquerda NÃO cresce). Os 3 cartões de paleta em fluxo
MORRERAM. ⚠️ O painel tem **largura FIXA (`w-68`)** — pedido da usuária: sem ela a largura era
ditada pelo NOME da paleta ativa ("Arcade" × "Lápis e carvão") e a grade `1fr` esticava os vãos
junto, alternando o espaçamento a cada troca.

- **Dropdown de paletas em `position: fixed`** (rect do acionador): a coluna esquerda é um scroll
  container (`overflow-y-auto`) que deceparia um `absolute`, e o pacote evita portais — o fixed
  escapa do clip SEM sair da árvore DOM (tokens `pin-*` valem). Fecha em clique-fora/Esc (devolve
  o foco)/scroll fora do menu/resize/seleção; `role="menu"` + itens `menuitemradio`/`aria-checked`
  com preview de swatches + nome + Check; setas ↑↓ navegam. O layout `row` (tela estreita) usa o
  MESMO dropdown ancorado no ToolButton de paleta (o Dialog de troca morreu) + lixeira na linha.
- **Lixeira SÓ apaga cores EXTRAS** (adicionadas pelo "+", índice ≥16 — decisão da usuária): as 16
  base são fixas por contrato do bitmap indexado; cor base/borracha → toast gentil (botão fica
  `aria-disabled` + opacity, nunca `disabled` — o toast é o aviso). Excluir = **um commit só**
  (desfazível): `removeExtraColor` (`core/assetEdit.ts`, puro) remapeia TODOS os bitmaps do asset
  (sprite: animações × quadros; background; tileset: peças) via `removeColorIndex`
  (`pixel/ops.ts`, passe único: pixels da cor → transparente, índices maiores descem 1 — NUNCA
  compor dois `replaceColor`), tira a entrada de `extraColors` (**vazia → a CHAVE some**, convenção
  do sanitize) e clampa a seleção (`setColor`, nunca no 0). Mapas dependentes de tileset NÃO
  precisam de remap (guardam índice de PEÇA). A confirmação avisa que os pixels pintados viram
  transparente e mostra o quadradinho da cor.
- Testes: `paletteUi.test.tsx` (dropdown/lixeira/+/teto 48 — happy-dom monta o layout PANEL,
  innerWidth 1024 ≥ 768) + puros em `ops.test.ts`/`assetEdit.test.ts`. ⚠️ O round-trip
  `sanitizePintaAsset(result) ≡ result` trava a chave omitida.

**Prévia da animação (mesmo lote):** os botões Reproduzir/Editar viraram TOOLBUTTONS de ícone
(Play/SquarePen, tooltip = title) + um 3º de **Configurações** (Settings, `aria-haspopup="dialog"`)
que abre a **MODAL "Animação selecionada"** — o `AnimationDetails` virou o CONTEÚDO de um `Dialog`
dentro do `PreviewPlayer` (estado LOCAL `useState`, nada na sessão) e devolve só a pilha de
controles (sem `<section>`/título/`aria-label` próprios: quem rotula é o `aria-labelledby` do
Dialog — `aria-label` num `<div>` sem role reprova no biome). O `EditorScreen` NÃO monta mais o
`AnimationDetails` (nem na coluna direita nem no disclosure estreito) → a coluna do sprite ficou
só com a prévia. Testes: `animationPanelUi.test.tsx`.

## Caixa de ferramentas com DUAS cores (08/2026)

Layout de programa de desenho (pedido da usuária, com imagem-modelo): a caixa vertical é uma
COLUNA com três blocos — tamanhos do traço FIXOS no topo, ferramentas em **duas colunas** rolando
no meio (`flex-1 min-h-0 overflow-y-auto`) e as duas CORES FIXAS no pé. ⚠️ Os extremos fixos não
são enfeite: em 768px (com a faixa do Spritesheet comendo altura) a caixa mede ~670px e as cores
saíam da vista — que é justamente o que ela precisa mostrar sempre.

- **Duas cores na sessão** (`sessionStore`): `color` (PRINCIPAL, botão esquerdo) +
  `colorSecondary` (botão direito, nasce TRANSPARENTE = apagar) + `activeSlot` ('primary' |
  'secondary'). Ações: `setColor`/`setColorSecondary`, `setActiveSlot`, **`applyColor(cor, slot?)`**
  (aplica no slot ATIVO — é o que a paleta chama) e `swapColors`.
- **A paleta pinta o quadrado SELECIONADO**: o `PaletteBar` usa `applyColor` e destaca o swatch
  pelo `slotColor` (a cor do slot ativo), não mais pelo `color`. A lixeira e o "+" também seguem o
  slot ativo; ao excluir uma extra, **as DUAS cores são clampadas** (a exclusão desloca índices).
- **Botão direito pinta com a secundária**: `PixelCanvas` lê `event.button === 2` no `pointerdown`
  (só ali o botão é confiável — o resto do traço herda pelo `settings` congelado no `ToolGesture`)
  e passa `settings(secondary)`. O conta-gotas com o direito guarda na secundária. O canvas tem
  `onContextMenu` com `preventDefault` (senão o menu do navegador abre por cima do desenho).
- Testes: `toolboxUi.test.tsx`.

## CAMADAS do pixel (08/2026)

Cenário e personagem animado têm **camadas** (peças NÃO — a pecinha é pequena demais para valer).

- **Modelo** (`core/project.ts`): `PintaPixelLayer {id,name,visible}` (só metadados) + os "cels" —
  `PintaPixelFrame = PintaBitmap[]`, UM cel por camada, alinhado por índice com `asset.layers`. No
  cenário são `asset.cels`; no sprite cada QUADRO é a pilha (`PintaAnimation<PintaPixelFrame>`).
  Índice 0 = FUNDO; a UI lista invertida (topo da lista = camada de cima). Teto
  `PINTA_LIMITS.maxPixelLayers = 4` (cada camada multiplica os bytes do snapshot de undo).
- ⭐ **O que tornou isso barato:** `PintaAnimation<TFrame>` já era genérica (o vetor usa
  `VectorFrame`) e só `emptyFrameFor`/`cloneFrameOf` (`animation/frames.ts`) conhecem o tipo
  concreto — todo o resto do motor de animação ficou intocado. Quadro novo nasce com um cel por
  camada, então o painel é o mesmo em qualquer quadro.
- **MIGRAÇÃO lazy** (`sanitizePintaAsset`, o único ponto): cenário antigo (`bitmap` solto) →
  `cels: [bitmap]`; sprite antigo (quadro = 1 bitmap) → `[bitmap]`; `layers` ausente → derivada do
  nº de cels com nomes automáticos. `alignCels` impõe o invariante (falta cel → camada vazia,
  sobra → corta). Travado por teste — sem isso um desenho antigo sumiria da galeria em silêncio.
- **Ops puras** (`pixel/layers.ts`, molde do `tiles/tilemapOps.ts`): `flattenCels` (a de cima
  vence; invisível fora; **1 visível devolve o próprio cel, sem cópia**), `flattenCelsRange`,
  `stackBitmaps`, `addPixelLayer` (topo + cel vazio em TODOS os quadros), `removePixelLayer`
  (nunca zero), `togglePixelLayerVisible`, `renamePixelLayer`, `movePixelLayer` (leva os cels
  junto). Todas devolvem o MESMO asset quando nada muda (é como a UI detecta o teto).
- **Camada ativa** vive na SESSÃO (`sessionStore.layerId`, null = a de cima) — interage com
  quadro/onion/seleção. `assetEdit` é o funil: `activeBitmapOf`/`withActiveBitmap` leem/gravam o
  cel da ativa (por isso `pixel/tools.ts`, `ops.ts` e `selection.ts` não mudaram de assinatura),
  mais `activeCelsOf`, `flattenActiveOf` e `withActiveCels` (espelhar/girar valem para o quadro
  INTEIRO — girar camadas separadamente as deixaria com dimensões diferentes e o sanitize as
  descartaria).
- **Regra das ferramentas**: "pego o que vejo, pinto onde estou" — conta-gotas e balde leem o
  COMPOSTO (`floodFill` ganhou o param `reference`: região no composto, tinta na camada ativa,
  senão vaza); lápis/borracha/recolor/limpar agem na camada ativa. Camada escondida avisa por
  toast no 1º traço (régua do `isTileBlank`).
- **Render** (`pixel/render.ts`): `paint(bitmap, colors, scale, {ghost, under, over, hideActive})`
  — under/over são os compostos pré-achatados das camadas abaixo/acima (o gesto blita 3 imagens
  por movimento em vez de recompor a pilha). ⚠️ `hideActive` existe porque esconder a camada EM
  EDIÇÃO não tirava nada da tela (bug pego só no QA de browser — happy-dom não pinta).
- **Achatamento obrigatório** em prévia, miniaturas (galeria/quadros), `packSpritesheet`, ZIP e
  ponte com o Estúdio. O `.pinta.json` PRESERVA as camadas (backup ≠ export). Guarda de teste:
  a célula da folha leva as camadas visíveis e deixa a escondida fora.
- Testes: `pixel/layers.test.ts` (puros), `layersUi.test.tsx` (painel), migração em
  `core/project.test.ts`, achatamento em `export/spritesheet.test.ts`.
- ⚠️ O painel do TILEMAP também se chama "Camadas" (`COPY.tiles.layers`) — ao consultar por
  `section[aria-label="Camadas"]` num teste/QA, confira qual editor está aberto.

## Editor de VETOR: paridade + recursos (08/2026, inspiração Vectorpea)

Pedido da usuária: o vetor com o MESMO layout do pixel (a criança não estranha ao trocar) e só
ADIÇÕES de recursos — nada removido. Palco SEM canto arredondado nos DOIS editores (o raio da
moldura "comia" o canto do desenho; os painéis `pin-panel` continuam arredondados).

- **Layout espelho do pixel**: caixa à ESQUERDA (espessuras do traço fixas no topo, ferramentas em
  DUAS colunas rolando no meio, e os slots PREENCHIMENTO/CONTORNO fixos no pé — espelho do
  principal/secundária, com botão de trocar; o slot clicado = `activeChannel`, quem recebe a
  próxima cor) · palco no meio · coluna DIREITA `w-68` (Prévia → **Camadas** → **Cores** →
  Aparência) · faixa (Spritesheet/peças + zoom) em LARGURA TOTAL. A coluna dupla do
  vector-sprite MORREU (`PixelRightColumn` saiu do ramo vetor). Tela estreita: caixa horizontal +
  disclosure "Cores e camadas" (`VectorPanelsDisclosure`).
- **Papel BRANCO fixo** no palco (sem xadrez — decisão de produto: cor absoluta nos 2 temas;
  forma branca sem contorno some — mitigado pelo contorno preto default e pela grade).
- **Grade de apoio + snap** (`vector/grid.ts`): botão Grade na caixa (mesmo `session.showGrid` do
  pixel; no VETOR nasce DESLIGADA via `sessionDefaultsFor`). Overlay = `<pattern>` + 1 `<rect>` SÓ
  no editor (o export NUNCA a leva), traço `1/zoom`; espaçamento 4/8/16 por tamanho do doc
  (≤64/≤256/acima). Ligada, encaixam: desenho de formas, Caneta, mover e redimensionar — o pincel
  e os nós do editar pontos ficam LIVRES. Ordem: snap PRIMEIRO, Shift depois. ⚠️ O gesto de mover
  virou delta TOTAL sobre a base (`baseShapes` no gesto) — sem deriva e com os offsets internos da
  seleção preservados.
- **Laço de seleção**: arrasto no fundo com a Selecionar (Shift acrescenta); pega toda forma
  VISÍVEL cuja bbox encosta (`boundsIntersect`); toque parado continua limpando. **Multi-resize**:
  a caixa da UNIÃO (`boundsUnion`) ganha as 8 alças; todas escalam em torno da mesma âncora
  (girar segue só individual — futuro). **Barra flutuante da seleção** sobre o palco (espelho da
  do pixel, via do touch; rótulos `sel*` DISTINTOS dos do painel p/ a11y/testes). **Alinhar**
  (`alignShapes`): 6 botões no painel; 2+ = entre si, 1 = na tela; grupos transladam INTEIROS.
- **CAMADAS do vetor** (`VectorLayerPanel`): uma linha por FORMA (topo primeiro) com olho,
  miniatura, nome (`COPY.vector.shapeNames`; texto = "Texto: <conteúdo>") e alça (arrasto = UMA
  entrada de undo via replace+`commitGesture`; ↑/↓ pelo teclado). Linha seleciona o GRUPO inteiro
  (aria-label "Selecionar: <nome>" — distinto do botão de ferramenta). **`hidden?: boolean`** no
  `VectorShapeBase` (sanitize OMITE quando falso; helper `visibleShapes`): escondida some do
  palco e de TODO export/prévia num funil único (`shapesToMarkup`+`gradientDefsMarkup` no string,
  `VectorFrameSvg` no React) — paridade com a camada escondida do pixel. Laço/Ctrl+A/conta-gotas
  pulam escondidas; esconder desseleciona.
- **Caneta** (`pen`, atalho P, ícone PenLine — o PenTool é do editar pontos): clique a clique,
  fecha com clique perto do 1º ponto (raio 10/zoom), Enter ou duplo clique; Esc descarta; vira
  POLÍGONO comum (≤64 pontos; teto de formas checado no 1º clique). Prévia elástica tracejada.
- **Texto reeditável**: duplo clique (com a Selecionar) reabre o diálogo em "Mudar o texto";
  slider "Tamanho da letra" no painel com 1 texto selecionado. **Raio do retângulo**: slider
  "Cantos arredondados" (o modelo/export já tinham `rx`; `makeRect` ganhou o param `radius`).
- **Cores por CANAL** (`VectorColorsPanel`): UMA grade de swatches 5/linha aplicando no canal
  ativo. O conta-gotas usa `adoptStyle` (muda SÓ o estilo vigente, sem re-estilizar a seleção).
  Ver "Ajustes do vetor (08/2026)" abaixo — os chips saíram e o painel virou espelho do
  `PaletteBar`.
- **Fora de escopo (futuro)**: operações booleanas (pathfinder), degradê multi-stop/ângulo livre,
  importar SVG, máscaras/filtros/blend, alças de bézier, campos numéricos X/Y/W/H, girar
  multi-seleção, snap dos nós do editar pontos.
- Testes: `vectorUi.test.tsx` (caixa/canais/grade/snap/laço/multi-resize/alinhar/caneta/texto/
  raio/espaço), `vectorLayersUi.test.tsx` (painel Camadas), `vector/grid.test.ts`,
  `geometry.test.ts` (union/intersect/align), `model.test.ts`+`svg.test.ts` (hidden). ⚠️ Gotchas
  de teste: escopar consultas de shapes NO PALCO (`stage.querySelector(...)` — miniaturas do
  painel e ícones lucide também têm rect/text) e fixar o `getBoundingClientRect` do svg.

## Ajustes do VETOR: faixa da seleção, caixa que encolhe, degradê em modal, paleta (08/2026)

Pedido dela sobre a captura anotada: "os recursos de alinhamento quando o objeto está selecionado
podem aparecer na barra", "ajustar a altura ao conteúdo" (a caixa), "colocar um botão para abrir o
card de degradê", "altura fixa, sem rolagem na página, mas sim nos componentes internos" e "a paleta
de cores tem que melhorar, ser igual a de pixel art, até porque pelo controle na caixa de ferramenta
já saberemos o que é preenchimento e o que é contorno".

- ⭐ **`VectorSelectionBar`**: faixa contextual colada EMBAIXO da barra de cima (mesmo
  `bg-pin-surface` + `border-b-2`), com alinhar ×6 · espelhar ×2 · ordem ×4 · agrupar/desagrupar ·
  duplicar · apagar. Só existe com seleção; `overflow-x-auto` (nunca `flex-wrap`: crescer em altura
  roubaria palco). 14 botões = ~800px, cabem numa linha em 1366. O bloco equivalente SAIU do
  `VectorPropertiesPanel` — era o fim da coluna da direita, onde a criança só achava rolando.
  ⚠️ **Pré-requisito arquitetural**: o `VectorEditorScope` subiu para o TOPO do ramo vetorial
  (`EditorScreen`), envolvendo a faixa + o corpo. A `EditorTopbar` continua FORA dele (ela é irmã
  do corpo, e o escopo devolve `null` sem documento ativo — só o corpo pode sumir).
- **Barra flutuante da seleção = só TOQUE** (`VectorStage` checa `useMediaQuery('(min-width:768px)')`):
  no desktop as ações moram na faixa. As duas NUNCA coexistem — por isso compartilham o
  `aria-label` `selectionBar` e os rótulos `sel*`. Os rótulos-irmãos do painel
  (`vector.remove/duplicate/group/ungroup`) foram REMOVIDOS do copy (ficaram órfãos).
- ⭐ **A caixa de ferramentas não estica mais**: `VectorToolbox` virou filha de um wrapper
  (`VectorLeftColumn`, gêmeo do `PixelLeftColumn`) — era a ÚNICA assimetria estrutural entre os
  dois editores. Sendo filha direta da linha `items-stretch`, o `.pin-panel` esticava até a altura
  do palco e o `flex-1` do miolo virava um vão branco acima das cores (`shrink-0` não protege: ele
  age no eixo PRINCIPAL, o stretch é no cruzado).
- ⭐ **`max-h-full` nas DUAS caixas** (pixel e vetor): sem ele a caixa crescia até a altura do
  CONTEÚDO (medido: 672px numa faixa de 532px), quem rolava era a coluna e as duas cores iam parar
  embaixo da linha d'água — exatamente o que o comentário do `ToolBar` jurava evitar. Com o teto,
  quem rola é a grade do meio e os extremos ficam fixos de verdade.
- **Degradê em MODAL** (`VectorPropertiesPanel`): um `Button` com amostra do degradê vigente
  (`gradientCss`, helper compartilhado com os slots da caixa) abre um `Dialog` com os 3 tipos + as
  2 cores + **"Tirar o degradê"** (`applyStyle({fill: gradiente.from})`) — antes NÃO existia
  caminho de volta e tocar qualquer controle já convertia o preenchimento. O `Panel` "Aparência"
  continua existindo (botão + espessura + opacidade): `section[aria-label="Aparência"]` é asserido.
  As seções condicionais (lados/pontas, cantos, tamanho da letra) viraram `Panel` com o VALOR no
  título e `aria-label` no input (o `<label>` que envolvia o range sumiu).
- ⭐ **Paleta do vetor = espelho do `PaletteBar`**: sem chips (o canal é dito pelos dois
  quadradinhos da caixa), título = NOME da paleta com dropdown (Arcade/Doces/Lápis e carvão),
  lixeira + "+" no cabeçalho, grade 5/linha com "sem cor" na frente. Ordem: paleta escolhida (15) →
  cores do JOGO (Pensa) → personalizadas no fim (as apagáveis). O `paletteId` do vetor vive em
  `useState` no `VectorEditorScope` (kinds vetoriais não têm o campo no asset, e criá-lo entraria
  no desfazer sem mudar o desenho) → vale enquanto o editor está aberto, como as cores recentes.
  A lixeira NÃO pede confirmação: no vetor a forma guarda o hex, então some só a sugestão.
- **`PaletteMenu.tsx`** (novo): o dropdown ancorado (`position:fixed`, `role=menu` +
  `menuitemradio`, fecha em clique-fora/Esc/scroll/resize, setas ↑↓) foi EXTRAÍDO do `PaletteBar` e
  é consumido pelos dois. `paletteUi.test.tsx` é a prova de que a extração não mudou nada.
  ⚠️ Ele é `w-56` e `vectorSpriteUi.test.tsx` exige `.w-56` ausente em REPOUSO → só pode renderizar
  aberto. ⚠️ O menu mora DENTRO do `<section aria-label="Cores">`: contar botões da seção com o
  menu aberto traz 3 a mais.
- Medido no playground (1366×768, vector-sprite com Spritesheet + seleção): página não rola
  (768=768), faixa 54px, caixa travada na altura da coluna com as cores à vista, coluna da direita
  rolando por dentro. Em 375×812: faixa ausente, barra flutuante presente.

## Colisão por peça: sólido × plataforma (one-way) — lote MapperMate F2 (18/07)

`TilesetAsset`/`VectorTilesetAsset` ganharam **`platform: boolean[]`** paralelo a `solid`
(mutuamente exclusivos — sólido vence no conflito; `sanitizePintaAsset` impõe a exclusividade e
ausência → tudo falso, então asset antigo sanitiza sem plataforma). `tiles/tilesetOps.ts`:
`cycleCollision` (livre→sólido→plataforma→livre, substituiu `toggleSolid`) + `tileCollisionAt`;
add/duplicate/remove fazem splice/filter dos DOIS arrays. UI: `TileStrip` ciclo de 3 estados +
`TileCollisionBadge` (🧱 sólido vermelho / ⬆️ plataforma âmbar via `--color-pin-collision-platform`),
`TilemapEditor` overlay "Ver as colisões do mapa" (vermelho sólido / âmbar plataforma com faixa forte
no TOPO). **Cadeia de export** (`platform` OMITIDO quando vazio = payload byte-idêntico ao antigo):
`core/types.ts` (`PintaTilesetMeta`/`PintaTilemapMeta` + `platform?`), `export/studioGrid.ts`
(`tilesetPlatformList`), `export/studioBridge.ts` (`tilesetMetaFrom`/`tilemapMetaFrom` emitem só
quando não-vazio). O Estúdio re-sanitiza (`sanitizeTilesetMeta`/`sanitizeTilemapMeta` dedup contra
solid) e os runtimes game-2d + gk fazem o one-way (pisa por cima caindo, atravessa por baixo/subindo).

## Modelos prontos + importar imagem — lote MapperMate F3 (18/07)

**Modelos prontos ("Começar de um modelo")**: `templates/` — `art.ts` (`bitmapFromArt`/`cellsFromArt`,
mesmo dialeto do `bmp()` dos fixtures, que agora DELEGA aqui), `builders.ts` (monta assets pelas
fábricas + arte, ids frescos por chamada = cópia independente), `catalog.ts` (`PintaTemplate{id,
style,role,suggestedName,build()}` + `PINTA_TEMPLATES`), `data/*.ts` (8 modelos: herói/slime/moeda/
nave pixel-sprite, chao-de-grama tileset [tem 1 peça PLATAFORMA, vitrine do F2], fase-plataforma
mapa 20×15 2 camadas + tileset companheiro no MESMO build, fantasminha vetor, ceu-com-sol vetor).
`galleryStore.createFromTemplate` (quota c/ companheiros, `firstFreeName`, projectRef sanitizado em
TODOS, persiste na ordem do build = tileset antes do mapa). Wizard: 3º cartão "✨ Modelos prontos"
no passo de estilo → passo `template` (TemplatePicker, miniatura real por kind) → nome pré-preenchido;
bolinhas por ramo. Teste-guarda `catalog.test.ts` (todo build passa sanitize, células<tileCount, ids
frescos).

**Importar imagem ("Trazer uma foto")**: `import/` — `quantize.ts` PURO (`downscaleRGBA` box+alpha
premult, `resizeCover` cover+crop central, `quantizeToIndexed` [15 arcade + até 48 extras por
frequência, posteriza 4 bits, distância `2Δr²+4Δg²+3Δb²`, raio `FUSION_RADIUS_SQ`=1600, SEM
dithering], `sliceIndexedTiles` dedupe+pula vazias+`tooMany`, `detectTileSize` = MENOR peça que cabe
no teto ⚠️ [maior daria 1 peça p/ imagem do tamanho de 1 tile]), `decodeImage.ts` BROWSER (ctx antes
do `createImageBitmap`, cap 2048, accept png/jpeg/webp — `null` no happy-dom). `ImportImageDialog`
(cenário `pixel-background` cover-crop OU peças `tileset` fatiado → entra por `galleryStore.
importAssets`). Botão "Trazer uma foto" no header da galeria. QA browser: decode real + 4 peças + 3
cores novas OK.

## Camada da frente + jogar meu mapa — lote MapperMate F4 (18/07)

**Camada "da frente" (F)**: `TilemapLayer` ganhou **`front?: boolean`** (saneado em
`sanitizePintaAsset` — `...(l.front === true ? { front: true } : {})`, ausente = fundo). Camada da
frente = desenhada POR CIMA do jogador (copa de árvore, telhado). `tiles/tilemapOps.ts`:
`flattenLayers(tilemap, include?)` virou genérico com predicado + `flattenBackground` (`l.front !==
true`), `flattenFront` (`l.front === true`), `hasFrontLayer` (tem camada front visível não-vazia),
`toggleLayerFront`. `export/studioGrid.ts` (`tilemapToStudioGrid(tilemap, include?)`) e
`export/studioBridge.ts` (`tilemapMetaFrom(tilemap, tileset, sheet, include?)`) aceitam o predicado:
o payload leva `tilemap` (só fundo, `l.front !== true`) + **`tilemapFront`** (só frente, OMITIDO
quando não há frente = retrocompat byte-idêntico). UI: `TilemapEditor` painel de camadas ganhou o
botão "camada da frente" (ícone `BringToFront`) + selo "frente" no nome.

**"Jogar meu mapa" (C)**: `PintaHostAdapter` ganhou **`sendGameToStudio?(asset)`** e
`PintaExportedAsset` ganhou `tilemapFront?`. O `EditorScreen` mostra o botão "Jogar meu mapa" só em
`kind === 'tilemap'` E com o callback presente (`handlePlayMap`: exporta, guarda o teto de folha
`180_000` = o `MAX_TILEMAP_SHEET_CHARS` do studio, chama o adapter com `tilemap` + `tilemapFront`).
Quem MONTA o jogo é o **Estúdio** (`@sistemazero/studio` → `buildTilemapGameProject`, ver o CLAUDE.md
de lá); o kids (`pinta-client`) liga o callback só com o Estúdio Completo. QA browser: marcar
"Decoração" como frente → payload separa fundo (sem a peça 5) e frente (só a peça 5), zero erro no
console. ⚠️ **Follow-up adiado:** o dropdown 'frente' do bloco `sz_gk_draw_tilemap` na extensão gk
(desamarrar de `solid`) NÃO entrou — evitei tocar os arquivos do WIP concorrente da gk.

## Full review (correções) — 18/07/2026

Auditoria multi-agente (correção/segurança/desempenho/a11y, lente infantil) com foco no lote
MapperMate F1–F4. **Segurança: NADA acionável** (raster via Blob→Image, não innerHTML; cores
validadas por `sanitizeFill`; dados 100% locais no IndexedDB). 6 achados corrigidos; verde no
typecheck+test(344)+biome do pinta e no studio (`tilemapGame` 6/0). QA browser real (:5199).

- **[ALTA — regressão do F4] Camada da frente sumia no "Usar no Estúdio":** o `studioBridge.ts`
  passou (no F4) a montar `tilemap` só com o FUNDO (`l.front !== true`), e o `handleSendToStudio`
  repassa esse meta ao `savePersonalAsset` ("Meus desenhos") → um mapa com camada "da frente"
  PERDIA a decoração da grade que o bloco "Criar mapa do meu desenho" lê (sobrevivia só na
  miniatura). **Fix:** o campo `tilemap` do payload voltou a ser o mapa COMPLETO (todas as camadas
  visíveis); `tilemapFront` (só-frente) permanece p/ o passe "por cima do jogador" do jogo. O
  `buildTilemapGameProject` desenha `tilemap` (base) + `tilemapFront` (topo): peça de frente nos dois
  passes = oclusão idêntica, colisão inalterada (frente = decoração não-sólida). QA browser: "Usar no
  Estúdio" num mapa com "Decoração" marcada frente → a grade INCLUI a peça 5.
- **[MÉDIA — a11y ≥44px]** `TilePicker` (X de limpar carimbo 36→44px) e `AnimationDetails` (botões do
  segmentado 40→44px).
- **[MÉDIA — a11y] Trap de Tab do `Dialog` escapava p/ o fundo:** o `Dialog` renderiza INLINE (sem
  `inert`/portal); quando o foco caía no `<body>` (um botão de passo do wizard desmonta ao avançar),
  o Tab ia p/ a galeria de fundo. **Fix:** se o `activeElement` NÃO está dentro do card, o Tab é
  redirecionado p/ o 1º focável do modal (Shift→último). QA browser: foco no body + Tab → volta p/ o
  "Fechar" do modal (não escapa).
- **[BAIXA] `handlePlayMap` sem o teto de 800k do `dataUrl`:** paridade com o `handleSendToStudio`
  (a miniatura é capada em 512px, mas o guarda dá a mensagem gentil).
- **[BAIXA] Load da galeria não isolava registro corrompido:** `persistence.ts` (`listAllAssets`/
  `loadAssetById`) ganhou `safeSanitize` (try/catch por registro) — uma regressão futura que faça o
  sanitize lançar em UM registro não derruba a galeria inteira (paridade com o import `.pinta.json`).

**A heurística plataforma×top-down do jogo** também foi refinada, mas o fix vive no studio
(`projects/tilemapGame.ts`) — ver o CLAUDE.md de lá.

## Backlog sweep — 18/07/2026 (limpou o "documentado/não corrigido")

- **⭐ Transação de undo CROSS-ASSET (o maior):** editar peça do tileset (add/duplicate/remove)
  remapeia as células dos MAPAS dependentes; antes isso ia direto p/ a galeria+disco FORA do undo do
  tileset → desfazer dessincronizava os mapas. Agora o `editorStore` guarda snapshot COMPOSTO
  `{asset, linkedMaps}`: **`commitLinked(next, {before, after})`** grava o tileset E os mapas na MESMA
  entrada; `undo`/`redo` restauram/reaplicam os mapas via o callback injetado **`applyLinkedAssets`**
  (o `EditorScreen` liga = `gallery.absorb` + `persistAsset`). `commit`/`replace`/`commitGesture`
  carregam o `linkedMaps` corrente adiante (edição comum não toca mapas) → ZERO regressão nos editores
  sprite/mapa/vetor (nunca chamam commitLinked). ⚠️ a história é POR SESSÃO de editor (fechar perde o
  undo — o remap fica persistido). QA browser: remover peça → grade do mapa remapeia; remover+desfazer
  na mesma sessão → mapa volta idêntico.
- **importAssets** não orfana o mapa se o persist do tileset falhar (Set `persistedIds`).
- **Autosave** sem duplo-persist: `saveNow` usa `while (saving)` (não `if`).
- **i18n:** ~16 literais soltos → `COPY.a11y` (aria-labels + `Cor/Quadro/Passo/Abrir/quadro` +
  defaults de modelo `Chão`/`Camada`/`animação`). `core/project.ts` e `tiles/tilemapOps.ts` passaram a
  importar `COPY` (é módulo de constantes, sem ciclo de runtime).
- **Dead-click** do `createFromTemplate` (`!primary` seta `mutateError` + `GalleryScreen` com toast de
  fallback). **Packers** de tileset compartilham `tiles/packGeometry.ts tilesetGridGeometry(count)`.
  **Sanitize** coage `number[]`→`Uint8Array`/`Int16Array` (registro sem o typed array do clone/JSON).
- Gancho de teste novo: `testing/idbMock.ts setIdbWriteGuard(fn)` (faz o `set` lançar p/ testar
  caminhos de erro). **Não-mudança (por-design/inalcançável):** colisão de id de gradiente na folha
  (frames.ts regenera ids), gap de migração de kind (exaustivo/test-guarded), borda "tudo-frente"
  (resolvida pelo `tilemap` completo do full review).

**gk camada "frente" (fatia vertical):** `PintaTilemapMeta` ganhou **`frontGrid?: string`** (grade SÓ
das camadas de frente); `tilemapMetaFrom` a emite no meta COMPLETO quando `hasFrontLayer` (o
`tilemapFront` filtrado NÃO repete). O Estúdio (gk) desenha essa grade "por cima" — ver o CLAUDE.md do
studio.

## Ponte de MÃO DUPLA com o Estúdio (08/2026)

Antes, ajustar um desenho que já estava no jogo era: voltar ao Pinta, achar, editar, "Usar no
Estúdio" de novo, voltar, re-adicionar, apagar o velho. Agora o Estúdio tem um botão **"Editar"**
nos desenhos vindos daqui e o desenho salvo **se atualiza sozinho nos jogos**.

- **`initialAssetId?: string`** — abre DIRETO um desenho da galeria, 1× no mount. O kids preenche a
  partir de `/pinta?desenho=<id>` (query string, não `sessionStorage`: o botão do Estúdio abre a aba
  com `noopener` e `sessionStorage` não atravessa). ⚠️ Aplicado só DEPOIS de `gallery.loaded`, num
  componente próprio (`InitialAssetOpener` no `PintaApp`): o `EditorScreen` resolve o asset num
  inicializador de `useState` e volta p/ a galeria quando não acha — abrir cedo faria o link parecer
  quebrado. Id inexistente → galeria + toast `COPY.gallery.drawingGone`.
- **`resyncToStudio?(asset) → {updated}`** — reenvia ao PARAR de desenhar (debounce
  de 1,5s em `useStudioResync`, + flush no `visibilitychange`→hidden e no `pagehide`,
  p/ a biblioteca já estar em dia quando ela troca de aba). Gatilho = **identidade de `asset`**, não
  o autosave. Devolvendo `updated`, o cabeçalho mostra "Atualizado no Estúdio" — a ÚNICA confirmação
  visível (do lado do Estúdio a troca é silenciosa, decisão da usuária).
- ⚠️ **Abrir NÃO reenvia, só editar** — a trava compara a IDENTIDADE do asset com a do 1º render.
  Um booleano "já montei" NÃO serve: em StrictMode o React monta → limpa → monta, a 2ª montagem
  passava e o desenho era reenviado só por ter sido aberto (visto no playground).
- ⚠️ **Quem decide se há o que atualizar é o HOST**, não o Pinta: o `pinta-client` do kids só reemite
  quando `getPersonalAsset(id)` já existe. Sem essa guarda, todo rascunho cairia na biblioteca do
  Estúdio sozinho e o "Usar no Estúdio" deixaria de ser a decisão explícita que é.
- ⚠️ **Sair do editor NÃO pode engolir o reenvio**: `useStudioResync` alimenta uma fila
  single-flight (`latestTaskQueue`) que serializa chamadas e mantém apenas o snapshot pendente mais
  recente. Desmontar flusha a fila; respostas antigas nunca sobrescrevem o estado de uma edição
  mais nova e toda rejeição é capturada.

O outro lado (sincronia para dentro dos projetos, o botão, o marcador cross-aba) vive no studio —
ver `packages/studio/CLAUDE.md` §"Editar o desenho".

## Regras não-negociáveis

1. **NUNCA `fetch('data:')`** — bloqueado pelo `connect-src` da CSP do kids. Conversão data
   URL→Blob é `atob` (`export/png.ts dataUrlToBlob`).
2. **happy-dom NÃO tem canvas 2D**: `getContext()` é null E o `new Image()` nunca carrega — todo
   caminho de raster guarda o ctx ANTES do Image (senão a promise pendura a suíte; ver
   `svgToPngDataUrl`) e devolve null. `toDataURL` acima do teto do device devolve `"data:,"` sem
   lançar — os caminhos de PNG validam o prefixo (`pngOrNull`) p/ não baixar arquivo vazio com
   toast de sucesso.
3. **Compatibilidade com o Studio é por CONSTRUÇÃO** (geometria única pixel/vetor, ver acima).
   Testes reimplementam as fórmulas do runtime do Studio como guarda.
4. **Uint8Array/Int16Array vão DIRETO ao IndexedDB** (structured clone) — o codec RLE é só do
   `.pinta.json` de export (F6). `decodeBitmap` valida o teto ANTES de alocar (backup malicioso).
5. **Migração de kind SÓ via sanitize** (lazy, nunca em massa); kind novo/renomeado sem mapeamento
   = galeria "apagada".

## Testes

`bun test src` (happy-dom via bunfig/test-setup, padrão pensa). Fixtures de bitmap como
strings (`src/testing/fixtures.ts`); mock FUNCIONAL de idb-keyval em `src/testing/idbMock.ts`
(importar ANTES do código sob teste). Sem fake timers: testes passam `autosaveDelayMs` à factory
do editor, sem estado global entre arquivos. Gotcha:
update de store zustand fora de act → `await act(async () => Bun.sleep(0))`. happy-dom NÃO faz
layout — o fix do palco é testado por ATRIBUTOS width/height (`vectorSpriteUi.test.tsx`), nunca
por px reais.

## Comandos

`bun run typecheck` · `bun test src` · `bun run check[:fix]`

## Histórico / status

- **F1–F6 (07/2026, commit 5d5d4bf) — EM PRODUÇÃO (PR #65, main `e1f5ad1`, 09/07/2026)**: fundação + pixel, animações + preview
  (fps 🐢→🐇 gravado = o do export), ponte + plataforma kids (`/pinta` gate 3 estados, produto
  `pinta` R$97 no catalog), tiles com REMAP automático dos mapas, vetorial v1, export completo
  (ZIP organizado + `.pinta.json` + upscale).
- **REFACTOR "vetor de primeira classe" (07/2026, pós-5d5d4bf)**: criação em 4 passos
  (estilo→tipo), kinds `vector-sprite`/`vector-background` (migração do antigo `vector`)/
  `vector-tileset` com paridade TOTAL (animação com preview, peças, mapa, export com
  folha/receita/upscale, ponte); fix do palco vetorial invisível (svg sem dimensão); full review
  multi-agente com fixes (perda de traço do pincel, decodeBitmap sem teto, duplo clique na ponte,
  multi-touch, PNG vazio, contraste do selinho, Mão/pan, flip, teclado, zoom honesto do mapa,
  pintura incremental no arrasto do mapa). ZIP: a pasta `vetores/` MORREU — vetor sai em
  `personagens/`/`cenarios/`/`tilesets/` ao lado do pixel (+ `.svg` extra).
- **Cartão de Criação Pensa→Pinta (08/2026):** `projectRef`, `PintaInitialIntent` e
  `PintaTaskSession` restauram contexto por `/pinta?tarefa=<id>`; o host busca e persiste a
  sessão no backend. Não use `sessionStorage` para o handoff.
- **Ponte de MÃO DUPLA com o Estúdio (08/2026, não commitado)**: `initialAssetId` (deep link
  `/pinta?desenho=`) + `resyncToStudio` (reenvio ao parar de desenhar). QA em browser real feito no
  playground (:5199): abrir pelo link, abrir-sem-reenviar, e o reenvio após um traço. Ver a seção
  dedicada.
- **Seleção + atalhos + zoom pela rolagem (08/2026, não commitado)**: ver a seção dedicada.
  QA em browser real feito no playground (:5199) para o pixel — duplicar+espelhar+arrastar,
  Ctrl+C/V, Delete, área vazia não seleciona, clicar fora desseleciona, âncora do zoom.
  **Pende QA no vetor e no mapa** (atalhos + rolagem) e em toque/tablet.
- **Editor de VETOR: paridade + recursos (08/2026, não commitado em main)**: ver a seção
  dedicada — layout espelho do pixel (coluna direita única w-68 com Prévia → Camadas → Cores →
  Aparência, slots de cor na caixa, faixa em largura total), palco de canto reto + papel branco,
  grade+snap, laço, multi-resize, barra flutuante, alinhar, painel Camadas + `hidden`, Caneta,
  texto reeditável, raio do retângulo, espaço-pan. Suíte 482 verde; QA de browser real pendente.
- **Pendências**: QA em browser real (palco vetorial, fluxo estilo→tipo, animação vetorial
  ponta-a-ponta, peças/mapa vetoriais, export, ponte entre perfis, tema claro/escuro, touch,
  Cartão de Criação → Pinta pré-preenchido → asset vinculado → envio ao Estúdio; o lote novo do
  vetor: grade/snap/laço/camadas/caneta em touch e nos 3 kinds).
- **Backlog de produto conhecido (baixo)**: strings de UI soltas fora do copy.ts; auto-avançar no
  passo de tamanho; nome do estilo "Vetor" pode virar "Desenho de formas" se o QA com crianças
  mandar.

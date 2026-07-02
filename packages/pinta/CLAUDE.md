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

- **`setPintaStorageNamespace(viewerId)`** — o host chama ANTES de montar (isola a galeria por
  PERFIL no IndexedDB; vazio = store default `sistema-zero-pinta`; mesmo contrato do studio).
- **`<PintaApp adapter={PintaHostAdapter} />`** — uncontrolled, navegação por ESTADO (galeria ⇄
  editor, sem router).
- **`PintaHostAdapter`** (`src/core/types.ts`): `theme?` ('light' default kids | 'dark'),
  `studioOwned?` (só muda a COPY do sucesso da ponte), `onOpenStudio?`,
  `sendToStudio?(PintaExportedAsset) → PintaSendResult` — **ausente = o botão "Usar no Estúdio"
  não aparece** (degrade, padrão Pensa).

## Modelo de dados (`src/core/project.ts` — NÃO em types.ts)

- **Não há "projeto"**: a galeria é a lista de ASSETS do perfil; cada asset é um registro
  independente no IndexedDB (`pinta:asset:<id>`, store `sistema-zero-pinta-<ns>`).
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
- Quotas em `PINTA_LIMITS` (compartilhadas criação↔sanitize — subir uma sobe em todos).
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
- **Editor vetorial (`VectorEditor`)**: shapes = elementos SVG REAIS; edita o "documento de shapes
  ativo" via `activeShapesOf`/`withActiveShapes` (`core/assetEdit.ts` — espelho do par bitmap):
  cenário inteiro, quadro da animação (vector-sprite) ou tile (vector-tileset, `frameIndex` da
  sessão = índice do tile). ⚠️ O palco `<svg>` tem **width/height DEFINIDOS** (doc × zoom, como o
  canvas) — sem isso o wrapper shrink-to-fit colapsa a zero e "a área não aparece" (bug histórico;
  regressão testada). Zoom próprio (`VECTOR_ZOOM_LEVELS`, sessão com `zoomLevels` injetável) +
  botão Ajustar + ferramenta Mão 🖐️ (pan — touch tem touch-action:none). Onion skin vetorial via
  `previousShapesOf`. Alças de seleção dimensionadas em px de TELA (÷zoom). Teclado: Delete/setas
  na seleção (listener no window, ignora inputs). Todo gesto guarda `pointerId` (multi-touch não
  corrompe). Pincel usa `smoothStrokeToPathCapped` — o `d` criado SEMPRE cabe no `MAX_PATH_CHARS`
  do sanitize (senão o traço sumiria no reload); acima de 1500 pontos crus decima O(n)
  ANTES do RDP (O(n²) no pior caso — rabisco zigue-zague longo travava o soltar do
  pincel por segundos e estourava o timeout de 5s do teste no CI).
- **Animação compartilhada**: `animation/frames.ts` e `tiles/tilesetOps.ts` são GENÉRICOS sobre o
  estilo (`AnimatedSpriteAsset`/`AnyTilesetAsset`; clone vetorial regenera ids de shape);
  `AnimationList`/`FrameStrip`/`PreviewPlayer`/`TileStrip` servem os 2 estilos (thumbs pixel =
  canvas, vetor = `VectorFrameSvg` SVG inline, memoizado). `useAnimationPlayer` é puro.
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
- **Ponte "Usar no Estúdio" é ASYNC** (`export/studioBridge.ts buildStudioPayload`): SEMPRE um PNG
  achatado {id,name,dataUrl,width,height}; sprites enviam a FOLHA inteira (from/to/fps ficam na
  receita do ExportDialog); guarda de 800k chars ANTES de enviar (sincronizada com
  `MAX_ASSET_DATA_URL_CHARS` do studio — comentário recíproco nos 2 lados). A trava `sending`
  arma ANTES da rasterização (anti duplo clique).
- **Stores zustand POR INSTÂNCIA** (factories, nunca singleton): `galleryStore` (CRUD + `lastStyle`;
  import religa tilemap→tileset via idMap, tilesets entram PRIMEIRO na quota), `editorStore`
  (history por snapshots com orçamento em bytes — `assetBytes` conta o payload real dos shapes —
  + autosave debounced ~1s com flush; `persist` injetável), `sessionStore`
  (ferramenta/cor/zoom/`zoomLevels`/onion — a Mão 'pan' é da sessão, não do motor pixel).
- **Persistência (`src/state/persistence.ts`)**: idb-keyval + `runSerializedWrite(id, task)`
  FIFO por asset (clone do studio).
- **Copy 100% PT** centralizada em `src/core/copy.ts` (sem travessão, sem jargão; nomes de cor
  amigáveis em `colorNames` p/ os swatches).
- **CSS**: tokens `--color-pin-*` em `@theme` sob `[data-pinta-theme]` (claro default kids).
  Cor de chip por PAPEL (`pin-kind-*`, só emoji) + selinho de ESTILO (`pin-style-*`, carrega
  TEXTO branco — ⚠️ manter L ≤ ~0.55 nos DOIS temas). SEM `@import "tailwindcss"`, SEM `@source`,
  SEM regras globais. Prefixo `pin-` (NÃO `pt-`/`px-`).
- **a11y**: alvos ≥44px, Dialog com foco/Esc/trap, Toast aria-live, wizard com bolinhas de
  progresso + `role=status` no erro de nome.

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
(importar ANTES do código sob teste). Sem fake timers: `setAutosaveDelayForTests(ms)`. Gotcha:
update de store zustand fora de act → `await act(async () => Bun.sleep(0))`. happy-dom NÃO faz
layout — o fix do palco é testado por ATRIBUTOS width/height (`vectorSpriteUi.test.tsx`), nunca
por px reais.

## Comandos

`bun run typecheck` · `bun test src` · `bun run check[:fix]`

## Histórico / status

- **F1–F6 (07/2026, commit 5d5d4bf em staging)**: fundação + pixel, animações + preview
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
- **Pendências**: QA em browser real (palco vetorial, fluxo estilo→tipo, animação vetorial
  ponta-a-ponta, peças/mapa vetoriais, export, ponte entre perfis, tema claro/escuro, touch).
- **Backlog conhecido (baixo, do full review)**: undo do tileset não desfaz o remap dos mapas
  (pré-existente, exige transação tileset+mapas); strings de UI soltas fora do copy.ts;
  auto-avançar no passo de tamanho; nome do estilo "Vetor" pode virar "Desenho de formas" se o
  QA com crianças mandar.

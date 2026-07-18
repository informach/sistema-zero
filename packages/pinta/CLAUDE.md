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
  não aparece** (degrade, padrão Pensa) — e **`initialIntent?: PintaInitialIntent`** (Fase 5,
  07/2026): `{projectRef: PintaProjectRef, artKind?}` vindo da MISSÃO DE ARTE do Pensa — abre o
  "Criar novo" pré-configurado UMA vez no mount (`takeInitialIntent` no appContext consome via
  ref; voltar do editor à galeria NÃO reabre). Com `artKind`, escolher o ESTILO pula o passo de
  tipo (`NewAssetDialog.initialRole` mapeia sprite/background/tileset → kind do estilo), o nome
  vem sugerido (`heroi`/`cenario`/`pecas` com sufixo anti-colisão) e o topo mostra o selo
  "Desenho para o jogo: <nome>". Fechar o diálogo descarta o intent.

## Modelo de dados (`src/core/project.ts` — NÃO em types.ts)

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
- **Persistência (`src/state/persistence.ts`)**: idb-keyval + `runSerializedWrite(id, task)`
  FIFO por asset (clone do studio).
- **Copy 100% PT** centralizada em `src/core/copy.ts` (sem travessão, sem jargão; nomes de cor
  amigáveis em `colorNames` p/ os swatches).
- **Responsivo (07/2026)**: `EditorScreen` usa `useMediaQuery('(min-width: 768px)')`
  (`editor/useMediaQuery.ts`, espelho do pensa) — em tela ESTREITA a coluna lateral do sprite
  (prévia + animações, `SpriteSidePanel`) vira FAIXA horizontal rolável abaixo do palco (a
  coluna fixa w-48 espremia o canvas no tablet). **Atalhos**: Ctrl/Cmd+Z desfaz,
  Ctrl/Cmd+Shift+Z e Ctrl/Cmd+Y refazem (listener de window no `EditorScreen`, ignora
  INPUT/TEXTAREA/contentEditable — mesmo guard do VectorEditor). **Onboarding**: galeria vazia
  mostra convite grande + CTA `gallery.emptyCta` (rótulo distinto do "Criar novo" do header, p/
  não colidir com o getByRole dos testes).
- **CSS**: tokens `--color-pin-*` em `@theme` sob `[data-pinta-theme]` (claro default kids).
  Cor de chip por PAPEL (`pin-kind-*`, só emoji) + selinho de ESTILO (`pin-style-*`, carrega
  TEXTO branco — ⚠️ manter L ≤ ~0.55 nos DOIS temas). SEM `@import "tailwindcss"`, SEM `@source`,
  SEM regras globais. Prefixo `pin-` (NÃO `pt-`/`px-`).
- **a11y**: alvos ≥44px, Dialog com foco/Esc/trap, Toast aria-live, wizard com bolinhas de
  progresso + `role=status` no erro de nome.

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
- **Fase 5 — projeto transversal Pensa↔Pinta (07/2026, não commitado)**: `projectRef` no asset
  (agrupamento da galeria + paleta no vetor), `PintaHostAdapter.initialIntent` (missão de arte
  abre o "Criar novo" pré-configurado), `NewAssetDialog` com `initialRole`/`initialName`/selo do
  jogo, exports novos `PintaInitialIntent`/`PintaProjectRef` no index. O intent chega do kids por
  `sessionStorage sz:pinta:intent` (escrito pelo pensa-client, lido/limpo pelo pinta-client).
- **Pendências**: QA em browser real (palco vetorial, fluxo estilo→tipo, animação vetorial
  ponta-a-ponta, peças/mapa vetoriais, export, ponte entre perfis, tema claro/escuro, touch,
  missão de arte → Pinta pré-preenchido → asset agrupado).
- **Backlog conhecido (baixo, do full review)**: undo do tileset não desfaz o remap dos mapas
  (pré-existente, exige transação tileset+mapas); strings de UI soltas fora do copy.ts;
  auto-avançar no passo de tamanho; nome do estilo "Vetor" pode virar "Desenho de formas" se o
  QA com crianças mandar.

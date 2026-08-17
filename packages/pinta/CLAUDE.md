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
> por namespace + id + `updatedAt`) e `exportAssetForStudio(id)` (payload da ponte já validado
> pelos tetos — `ExportForStudioResult` com `reason` tipada). Zero React lá
> dentro (o import dinâmico do host não puxa o app); o host seta o namespace
> pelo `setPintaStorageNamespace` RE-EXPORTADO no próprio subpath.

- **`setPintaStorageNamespace(viewerId)`** — o host chama ANTES de montar (isola a galeria por
  PERFIL no IndexedDB; vazio = store default `sistema-zero-pinta`; mesmo contrato do studio).
> Segunda e terceira exceções: **`@sistemazero/pinta/lesson`** (`src/lesson/index.ts`), a face
> React do BLOCO DE AULA (`PintaLesson`, `PintaHandle`), e **`@sistemazero/pinta/assets`**
> (`src/assets/index.ts`), o desenho como DADO — `createAsset`, `sanitizePintaAsset`,
> `assetToJson`/`assetFromJson`, `PINTA_LIMITS`, presets — sem uma linha de React, que é o que o
> servidor importa. Ver a seção dedicada mais abaixo.

- **`<PintaApp adapter={PintaHostAdapter} persistence?={PintaPersistence} />`** — uncontrolled,
  navegação por ESTADO (galeria ⇄ editor, sem router). `persistence` ausente = IndexedDB do perfil.
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
  habilita com QUALQUER tileset (badge de estilo no seletor). **Tamanho PERSONALIZADO
  (08/2026)**: card "Personalizado" no passo de tamanho — cenários (16..512 pixel / 16..2048
  vetor, largura × altura), personagens (largura × altura 8..128) e mapa (1..128 colunas × linhas); PEÇAS
  ficam FORA (whitelist dura 16/32/48 do motor). Também no "Trazer uma foto" (só o alvo cenário).
  Helpers PUROS em `gallery/customSize.ts`: a `sizeKey` fica na sentinela `'custom'` e a chave
  REAL ("300x200"/"96"/"50x40") é derivada dos campos a cada render — `buildInput`, o
  `galleryStore` e as fábricas ficam INTOCADOS (elas já clampam). Formulário compartilhado
  `CustomSizeFields` (`inputMode="numeric"`, faixa/erro num `role=status`, padrão do nameError).
  ⚠️ O card Personalizado NÃO auto-avança (selecionar só revela o formulário; os presets
  continuam avançando ao toque) — não copiar o `setStep` dos presets para ele.
## Tamanho do desenho: deitado na criação e mutável no editor (13/08/2026)

Dois pedidos dela, no mesmo assunto: **"lá no Pinta só dá para criar quadrado"** e **"percebi no
meio do desenho que precisava de outro tamanho, e hoje tenho que apagar e criar outro"**.

- ⭐ **Personagem deixou de ser QUADRADO.** O MODELO sempre teve `frameWidth`/`frameHeight`
  separados (o sanitize já os validava um a um) — quem impunha o quadrado eram o assistente
  (`customSizeSpecFor` devolvia `fields: ['frame']`) e as duas fábricas. Agora são **largura ×
  altura**, e uma nave é 128x32 de verdade. Motivação: no Estúdio a caixa de colisão do sprite é o
  RETÂNGULO do quadro, então 96px de vazio transparente viravam área que encosta sem encostar.
  ⚠️ O preset quadrado ("32") semeia os DOIS campos — sem isso, escolher preset e depois
  "Personalizado" abria a altura vazia com o Avançar desligado.
- ⭐⭐ **O defeito que isso revelou, e que vale para qualquer mexida em tamanho:** a fábrica passou a
  declarar `frameWidth: 128, frameHeight: 32` e continuou criando `createBitmap(size, size)`. O
  `sanitizePintaAsset` **DESCARTA** um asset cujo bitmap não casa com o quadro — e o desenho some da
  galeria **sem uma linha de erro**. Dimensão declarada e bitmaps têm que andar juntos, sempre.
- ⭐ **Mudar o tamanho DENTRO do editor** (`core/assetResize.ts` + `components/editor/
  ResizeAssetDialog.tsx`): botão na barra de cima mostrando o tamanho de agora ("Tamanho: 128 x 32")
  → o MESMO `CustomSizeFields` do assistente → **um commit** (desfazível com Ctrl+Z).
  - `resizeAsset` é uma op PURA e ÚNICA justamente por causa do defeito acima: no personagem ela
    alcança TODAS as animações × TODOS os quadros × TODAS as camadas. Precedente do
    `removeExtraColor`, que já remapeia o asset inteiro num commit.
  - `resizeTargetOf` devolve tamanho + limites, ou **`null` para PEÇAS** — o tamanho do tile é
    whitelist dura do motor (16/32/48) e mexer nele quebraria os mapas que apontam para elas. O
    botão nem aparece.
  - Mapa muda em **células** (a copy troca sozinha); no VETOR basta o quadro (as formas guardam
    coordenadas próprias e o `<svg>` aninhado já clipa).
  - Âncora **centro**, uma regra só: "o desenho fica no meio do novo tamanho". Encolher CORTA, e
    a modal avisa antes (o desfazer cobre).
  - ⚠️ **No teste, esperar o selo "Salvo" NÃO prova nada** — ele já está na tela desde a criação. O
    autosave é debounced: quem diz a verdade é o disco, relido num `waitFor` até refletir a edição.
  - ⚠️ **Round-trip pelo sanitize com `structuredClone`, NUNCA JSON**: o JSON transforma
    `Uint8Array` em objeto e o sanitize recusaria por outro motivo — o teste passaria pela razão
    errada (aconteceu ao escrever a rede). O IndexedDB usa structured clone.
  - Testes: `core/assetResize.test.ts` (puros + o **anti-vácuo** que prova que esquecer um quadro
    realmente apaga o desenho) e `components/editor/resizeUi.test.tsx` (fluxo, aviso de corte,
    botão desligado, peças sem botão, mapa em células).

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
  Upscale vetorial = re-render (sem perda). No `TilemapEditor`, a URL temporária é revogada em
  `load`, `error` E cleanup com guarda idempotente; troca rápida de tileset/unmount não pode deixar
  a Blob URL viva.
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
  + autosave debounced ~1s; `dirty`/`pending` explícitos; `flush` devolve sucesso/erro e drena
  edições feitas durante um save; `savedAsset` é a revisão confirmada; `persist` injetável), `sessionStore`
  (ferramenta/cor/zoom/`zoomLevels`/onion — a Mão 'pan' é da sessão, não do motor pixel).
- **Persistência (`src/state/persistence.ts`)**: `createPintaPersistence()` captura o store do
  namespace ao criar a `galleryStore`; a instância inteira (inclusive mutações ainda na fila)
  continua presa àquele perfil mesmo se o host trocar o namespace global. A fila FIFO é por
  handle de IndexedDB, nunca por id/namespace global. `persistAssets` usa um único `setMany`,
  portanto commits que alteram tileset+mapas dependentes ficam atômicos e não atravessam perfil.
  Desde o full review de 12/08/2026, toda mutação mede a galeria PROJETADA e recusa passar dos
  mesmos 32 MiB do restore. `GalleryBackupSizeCache` mantém a contribuição UTF-8 exata por
  `{id, updatedAt}` e força os ids tocados: a galeria inteira não é reserializada em cada autosave.
  Galeria legada já acima do teto só aceita mutação que reduza o backup (excluir continua sempre
  disponível). O erro é
  `PintaStorageBudgetError`, traduzido pela galeria e pelo badge do editor; não trocar por uma
  checagem aproximada, pois o JSON real é a fonte única da invariante “se gera, restaura”.
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
  não rola. **A faixa segue com teto interno próprio** (`max-h-56` compacta / `max-h-96`
  expandida na lista do `SpriteSheetPanel`) e rola por dentro — o topo do palco nunca se move. O
  controle de expansão só aparece quando a lista compacta tem overflow real; enquanto expandida,
  permanece visível para permitir recolher a faixa.
  Efeito colateral aceito: no PERSONAGEM
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
  e Spritesheet têm `getByText` que quebra com dois nós do mesmo texto). `disclosure` é controlado
  e põe o chevron em um botão separado (o título da paleta continua livre para abrir seu menu).
  Na coluna direita do vetor, Prévia/Camadas/Cores/Aparência são accordions independentes; fechar a
  Prévia também pausa seu loop de animação.
- **CSS**: tokens `--color-pin-*` em `@theme` sob `[data-pinta-theme]` (claro default kids).
  Cor de chip por PAPEL (`pin-kind-*`, só emoji) + selinho de ESTILO (`pin-style-*`, carrega
  TEXTO branco — ⚠️ manter L ≤ ~0.55 nos DOIS temas). SEM `@import "tailwindcss"`, SEM `@source`,
  SEM regras globais. Prefixo `pin-` (NÃO `pt-`/`px-`).
- **a11y**: alvos ≥44px, Dialog com foco/Esc/trap, Toast aria-live, wizard com bolinhas de
  progresso + `role=status` no erro de nome. ⚠️ Live region tem que MONTAR VAZIA e receber o
  texto depois (região inserida no DOM já preenchida não é anunciada — receita do
  `tooManyTiles` do import e do help do tamanho personalizado). Desde o full review de 12/08/2026,
  `Dialog` prende `keydown` e `focusin` no `document` enquanto aberto: recupera foco que escapou,
  cicla Tab/Shift+Tab, trata Esc e remove os listeners ANTES de restaurar o acionador. Uma pilha
  global por card deixa só o modal do topo capturar foco/Escape; em modal aninhada o foco volta em
  duas etapas. `aria-modal` sozinho não implementa o trap. A regressão DOM cobre esse contrato;
  manter QA cross-browser para comportamento real de foco.

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
- **Guia do espelho**: `PixelCanvas` pinta `paintMirrorGuides` DEPOIS da grade e ANTES da seleção.
  `mirrorX` mostra a linha vertical central, `mirrorY` a horizontal e os dois juntos mostram a
  cruz. São duas passadas tracejadas (branco + azul), só de tela: não entram no bitmap, undo,
  miniatura nem export. A posição é `largura/altura × zoom / 2`, inclusive em grades ímpares.

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
  próxima cor). Os dois slots têm símbolos diferentes: preenchimento é uma PLACA cheia; contorno é
  uma MOLDURA vazada. Os símbolos se sobrepõem visualmente, mas os BOTÕES não: cada canal preserva
  seu próprio alvo de toque e foco de 44 px, sem um botão cobrir metade do outro. Transparência usa
  o quadriculado no símbolo correspondente; gradiente ocupa a placa de preenchimento · palco no
  meio · coluna DIREITA `w-68` (Prévia → **Camadas** → **Cores** →
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
  entrada de undo via replace+`commitGesture`; ↑/↓ pelo teclado). ⚠️ **A alça move o GRUPO
  inteiro** (ver "Ordem-Z do grupo"), e a faixinha à esquerda da linha avisa que ela não anda
  sozinha. Linha seleciona o GRUPO inteiro
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
- **Fora de escopo (futuro)**: degradê multi-stop/ângulo livre,
  importar SVG, máscaras/filtros/blend, campos numéricos X/Y/W/H, snap dos nós do editar pontos,
  negrito/itálico do texto. ⚠️ **Operações booleanas (pathfinder) SAIU desta lista** (14/08/2026):
  ver "Misturar formas" abaixo. ⚠️ **Fonte SAIU desta lista** (12/08/2026): há cinco famílias
  portáteis; ver abaixo. ⚠️ **Alças de bézier SAIU desta lista** (08/2026): a Fase 2 da
  edição de pontos as implementa. ⚠️ **Girar multi-seleção SAIU desta lista** (08/2026): ver
  "Girar a seleção inteira" abaixo.
- **Backlog irmão do girar em grupo (ninguém pediu ainda)**: `flipSelected` espelha cada forma no
  PRÓPRIO centro, não no da seleção (espelhar um rosto de dois olhos deveria TROCAR os olhos). Muda
  o resultado visual de desenhos que já existem, por isso ficou de fora. ⚠️ **A ordem-Z SAIU desta
  lista** (17/08/2026): ver "Ordem-Z do grupo" abaixo.
- Testes: `vectorUi.test.tsx` (caixa/canais/grade/snap/laço/multi-resize/alinhar/caneta/texto/
  raio/espaço), `vectorLayersUi.test.tsx` (painel Camadas), `vector/grid.test.ts`,
  `geometry.test.ts` (union/intersect/align), `model.test.ts`+`svg.test.ts` (hidden). ⚠️ Gotchas
  de teste: escopar consultas de shapes NO PALCO (`stage.querySelector(...)` — miniaturas do
  painel e ícones lucide também têm rect/text) e fixar o `getBoundingClientRect` do svg.

## Ordem-Z do grupo (`vector/order.ts`, 17/08/2026)

Pedido dela: mandar um GRUPO para a frente e para trás. ⚠️⚠️ **O que estava em jogo era pior que
"não anda junto": agrupar TIRAVA o acesso à ordem.** Clicar numa forma agrupada expande a seleção
(`expandToGroups`), então `single` ficava `null` e os quatro botões viviam `disabled` — a única
saída era arrastar as linhas do painel uma a uma, justo o trabalho que agrupar deveria poupar.

A régua agora é uma só, compartilhada pelos quatro botões e pelo painel Camadas:

| gesto | o que acontece |
|---|---|
| uma camada para a frente/trás | o bloco pula o **cluster** vizinho inteiro (cluster = o grupo, ou a forma solta) |
| bem para a frente/fundo | o bloco vai ao topo/fundo, na ordem relativa |
| vizinho **escondido** | não consome o passo (senão o botão parece morto) |
| arranjo inalterado | `null`, e quem chama NÃO commita |

- ⭐ **`moveShapesOrder`/`dropShapesOrder` expandem os ids para o grupo POR DENTRO** — por isso o
  painel manda só o id da linha e o grupo vem junto, sem importar UI dentro de `vector/`.
- ⚠️ A chave de cluster é `g:<groupId>` **ou** `s:<id>`, em espaços SEPARADOS: com o `groupId ?? id`
  cru do `alignShapes`, um `groupId` igual ao `id` de outra forma grudaria as duas. `newId` não
  colide na prática, mas um `.pinta.json` importado escreve o que quiser nesses campos (medido: sem
  o prefixo, mover `y` levava junto a forma de id `abc`). ⚠️ O `alignShapes` segue com a chave crua.
- ⚠️ **`null` no no-op é obrigação**: `commitShapes` só desiste quando o asset sai IDÊNTICO, então
  um array novo de conteúdo igual criaria uma entrada de desfazer que não desfaz nada.
- ⚠️ **Mover TORNA o bloco contíguo**: agrupar nunca reordenou (é só etiqueta), então uma forma de
  fora pode estar empilhada no meio do grupo — e ela sai do meio no primeiro movimento. É a
  tradução de "o grupo é uma peça só", e vale dizer isso antes de alguém achar que é bug.
- ⚠️⚠️ **Agrupar continua SEM reordenar.** Compactar no `groupSelected` mudaria o desenho no
  instante em que ela agrupa, sem ninguém ter pedido ordem — é o risco que segurou este item no
  backlog por meses.
- **Toque não ganhou os quatro botões**: a barra flutuante já chega a 7 alvos em 375px (mesmo
  motivo do "misturar formas" ter levado só um). No celular a ordem se faz pelo painel Camadas,
  dentro do disclosure "Cores e camadas" — verificado em 375px, alças de 44px e sem rolagem lateral.
- Testes: `vector/order.test.ts` (puro, com os anti-vácuos do grupo que se parte e do vizinho-grupo
  pela metade), `vectorLayersUi.test.tsx` (seta e arrasto levando o grupo com UM undo) e
  `vectorUi.test.tsx` (os quatro botões VIVOS com grupo selecionado). ⚠️ Antes deste lote os quatro
  não tinham teste nenhum.
- ⚠️ Gotcha de QA em navegador: dirigir o arrasto do painel por `PointerEvent` sintético estoura
  `setPointerCapture` ("No active pointer with the given id") e o arrasto nem começa. Não é bug do
  produto — é o ponteiro sintético; neutralize `Element.prototype.setPointerCapture` durante a
  medição, ou dirija pelo CDP de verdade.

## Girar a seleção inteira, cursor da Mão e texto de várias linhas (08/2026)

Lote de CINCO pedidos da dona: girar um objeto AGRUPADO, o cursor mudar ao arrastar a tela, abrir
o caminho NO ponto escolhido, alinhar o texto e trazer um desenho da galeria para dentro do
desenho aberto.

### Girar em grupo (`rotateShapesAround`, `geometry.ts`)

⭐ **É EXATO, inclusive com membros já girados.** O render desenha cada forma como
`rotate(r, centro-da-caixa-SEM-rotação)` (`shapeCommonAttrs`), e transladar a geometria translada
essa mesma caixa junto. Logo `R(r+δ, c^δ) ∘ T` e `R(δ, pivô) ∘ R(r, c)` são o mesmo movimento
rígido: as duas têm parte rotacional `r+δ` e concordam no ponto `c`. Nada de aproximação.

- ⚠️ **O early-out `dx === 0 && dy === 0` é LOAD-BEARING**, não otimização: `translateShape(s,0,0)`
  devolveria um objeto NOVO (re-serializando o `d` de um traço a cada quadro), quebrando a
  memoização por identidade do `VectorFrameSvg` — e é ele que faz o giro de UMA forma continuar
  byte a byte o de antes (com uma forma só, o pivô É o centro dela).
- O gesto guarda `baseShapes` (não mais `baseRotation`) e aplica o delta TOTAL sobre a base, o
  mesmo idioma de mover e redimensionar.
- ⚠️ **A caixa da união fica ALINHADA AOS EIXOS durante o giro**, sem o `<g rotate>` que a seleção
  única usa: os membros podem ter rotações diferentes, e mesmo com uma só, a união de caixas não
  giradas girada como bloco rígido NÃO é a caixa da união girada — a moldura sairia de cima do
  desenho. Ela é recalculada a cada quadro, então "respira". Não "consertar" com o wrapper.
- A alça de girar leva `data-rotate` nos DOIS blocos (os testes contam `data-node`/`data-handle`,
  e `vectorUi.test.tsx` exige exatamente 8 `rect[width="14"]` no palco).

### Cursor da Mão (`components/editor/stageCursor.ts`)

Módulo puro compartilhado pelo vetor e pelo MAPA (o pixel não tem ferramenta Mão). `grabbing`
vence; senão `grab` se a Mão está ativa ou o espaço está segurado. O gesto vive num `useRef` de
propósito, então há um `useState` `panning` ligado só nas BORDAS do arrasto: dois renders por
gesto, zero durante o movimento. ⚠️ O efeito de troca de quadro/tile zera o `gestureRef` SEM
passar pelo `endGesture` — tem que soltar o `panning` lá também, senão o cursor trava fechado.

### Texto de VÁRIAS linhas + alinhamento

- `\n` dentro do próprio `text` (nada de campo novo: o `shapeBytes` já conta `text.length * 2` e
  string é imutável, então o clone RASO de `animation/frames.ts` não morde como mordia no
  `points`). `normalizeTextContent` é a regra ÚNICA (CRLF→LF, `MAX_TEXT_CHARS` 400,
  `MAX_TEXT_LINES` 12) e é idempotente.
- ⭐ **`align?: 'center' | 'right'` — `'left'` é INEXPRIMÍVEL**, não só "chave omitida": o tipo
  impede escrever o padrão, então todo texto que já existe atravessa o sanitize byte a byte. Leia
  sempre por `textAlignOf`.
- ⭐ **`textLines()` (svg.ts) é a fonte ÚNICA dos números**: o funil string emite `<tspan>` e o
  React emite `<tspan>` de verdade, com o mesmo `x`/`dy`. Verificado em navegador: o markup do
  palco e o da miniatura das Camadas saem idênticos.
- **Uma linha continua saindo como conteúdo CRU** (sem `tspan`, sem `text-anchor`): o markup de
  todo desenho antigo fica igual ao de antes, e nenhum `getByText` de teste passa a casar duas vezes.
- `x`/`y` são a ÂNCORA e o que ela significa depende do `align` — por isso o `shapeBounds` desloca
  a caixa e o `flipShape` repõe o deslocamento da âncora (sem isso um texto centralizado saltava).
  ⚠️ **A caixa é ESTIMADA** (0.6em por caractere, sem medir no DOM: happy-dom não faz layout e o
  export não tem DOM). O `setTextAlign` preserva a caixa ESTIMADA, então trocar o alinhamento move
  o texto real por alguns pixels (medido: ~9px num texto de 97px). É reversível e não acumula
  (esquerda→meio→direita→esquerda devolve o `x` exato).
- O diálogo virou `<textarea>`: Enter QUEBRA A LINHA (um textarea dentro de form não dispara o
  submit implícito, então basta não amarrar nada ao Enter cru) e **Ctrl/Cmd+Enter salva**, junto
  com o botão. `isTextEntryTarget` já casa `textarea`, então os atalhos de window continuam mudos.
- Os 3 botões vivem num `Panel` da Aparência, visíveis com a ferramenta Texto OU com um texto
  selecionado. Rótulos `textAlign*` DISTINTOS dos `align*` da faixa da seleção (que alinham
  FORMAS), e ícones `AlignLeft/Center/Right` (os `Align*Horizontal/Vertical` são das formas).

### Cinco fontes vetoriais PORTÁTEIS (12/08/2026)

`Baloo 2`, `Nunito`, `Press Start 2P`, `Bungee` e `Fredoka One` são opções da ferramenta Texto e do
texto selecionado.

> ⭐⭐ **DUAS delas nunca funcionaram, e a causa era um par de aspas (13/08/2026).** O
> `shapeGeometryAttrs` emitia `font-family="Press Start 2P"` CRU. Sem aspas o nome vira uma
> sequência de identificadores CSS, e identificador **não pode começar com dígito**: o token `2P`
> (e o `2` de `Baloo 2`) invalida a declaração INTEIRA, e o navegador a descarta em silêncio.
> Nunito, Bungee e Fredoka escondiam o defeito por serem uma palavra só.
> Medido em Chrome com `getComputedTextLength()` num `<text>` real, "Herói 123" a 30px:
> Press Start 2P sem aspas **134,7** (idêntico a NENHUMA fonte) contra **270,0** com aspas; Baloo 2
> **134,7** contra **117,6**. Fonte única do valor: **`fontFamilyCss`** (`vector/model.ts`), que
> sempre cita — o `@font-face` de `vector/fonts.ts` já citava; quem faltava era o USO.
> ⚠️ Os testes de `svg.test.ts` chegaram a assertar a saída QUEBRADA palavra por palavra
> (`font-family="Press Start 2P"`); hoje há um caso que percorre as CINCO famílias e exige as
> aspas, com anti-vácuo.

> ⭐ **`fredoka` = Fredoka ONE, não a variável (13/08/2026).** A CHAVE continua `fredoka` (ela
> viaja nos desenhos salvos), mas a face é a display redonda e gordinha. A variável nova é mais
> fina e o peso 600 dela NÃO reproduz o traço — medido em Chrome: largura média por caractere
> 0,524 (One) contra 0,502 (variável), e a variável até ESTREITA ao engordar. O `widthFactor` foi
> de 0,57 para **0,60** (razão medida 1,044).
> ⚠️ **Consequência aceita:** desenho que já usava Fredoka re-renderiza na One — mais gordo e ~4%
> mais largo —, e como o `widthFactor` mudou, a caixa ESTIMADA de texto centralizado/à direita
> desloca alguns pixels.
> ⚠️ **Licença:** o Google DELISTOU `ofl/fredokaone/` (o OFL.txt de lá responde 404) ao absorver a
> família, então o gerador mantém `slug: 'fredoka'` — e isso é correto, não um contorno: a primeira
> linha do OFL vendorizado diz `Copyright 2016 The Fredoka Project Authors
> (https://github.com/hafontia/Fredoka-One)`. É o mesmo projeto e a mesma licença. O modelo guarda a chave estável `fontFamily`; chave ausente ou inválida lê como
`Nunito`, mas o sanitizer omite o default em documentos antigos para preservar o round-trip.

- O catálogo leve fica em `vector/model.ts`; os WOFF2 Latin ficam em módulos separados em
  `vector/fontData/` e entram por import dinâmico só quando usados. `bun run gen:vector-fonts`
  regenera dados e licenças OFL em `licenses/fonts/`.
- `vector/fonts.ts` é a fonte única do `@font-face`; o editor registra a família usada no
  `document`, enquanto `vector/portableSvg.ts` incorpora como `data:font/woff2;base64` apenas as
  famílias dos textos visíveis.
- Todo funil final usa o SVG portátil: SVG avulso, PNG, spritesheet, tira, tileset, tilemap, ZIP,
  miniatura da biblioteca do Studio e os botões do `ExportDialog`. Funções puras `*Svg` continuam
  úteis para markup/testes internos, mas não podem alimentar download ou rasterização diretamente.
- Bounds/hit testing seguem determinísticos e sem DOM: `shapeBounds` usa o `widthFactor` da
  família. É aproximação deliberada; alterar as métricas exige regressões de geometria.

### Trazer um desenho da galeria para dentro do vetor (08/2026)

Decisão da dona: desenho de VETOR entra como as formas de verdade (agrupadas, ainda editáveis
ponto a ponto) e desenho de PIXEL ART entra como uma FIGURA. `vector/insertAsset.ts` faz a
triagem; `core/assetThumb.ts` (extraído do `AssetCard`) diz qual é a "cara" de cada asset.

- ⭐ **Entra exatamente o que a MINIATURA da galeria mostra**, e o seletor reusa o próprio
  `AssetThumb` do card. O seletor é WYSIWYG por construção, não por coincidência. Shapes ocultos
  são filtrados ANTES de contagem, bounds, escala e clone; documento todo oculto é vazio.
- ⭐ **Os dois caminhos ASSAM o conteúdo na hora.** Nada guarda referência viva ao asset de
  origem: não existe ciclo A→B→A, apagar o original não fura o desenho, e o rasterizador do export
  consegue ler (uma URL externa não passaria pelo modo estático do SVG-em-`<img>`).
- **Variante `image`** no modelo: `{x, y, w, h, src, pixelated?}`. `src` é SEMPRE
  `data:image/png;base64,` (o `startsWith` É a história de segurança: barra http(s), `svg+xml` e
  `javascript:`), com teto `MAX_IMAGE_SRC_CHARS` (300k) no molde do `MAX_PATH_CHARS`. Quem insere
  recusa ANTES do teto, senão a figura sumiria sozinha no próximo load.
- ⚠️ **`sanitizeVectorShape` é o ÚNICO switch de shape que o TypeScript NÃO obriga a cobrir**
  (tem `default: return null`). Variante nova esquecida lá some do desenho em silêncio no próximo
  load. Os outros cinco (`shapeBounds`, `translateShape`, `scaleShape`, o `flip()` interno e
  `shapeGeometryAttrs`) o compilador enumera sozinho — rode o typecheck e siga a lista.
- ⚠️ **`shapeBytes` conta o `src`**: sem isso a figura pesaria 128 bytes no orçamento de 16 MB do
  undo e a sessão comeria RAM em silêncio. Travado por teste no `editorStore.test.ts`.
- `preserveAspectRatio="none"` para a figura PREENCHER a caixa — assim as 8 alças dizem a verdade
  (o padrão `xMidYMid meet` deixaria tarja e a alça mentiria). `image-rendering: pixelated` sempre,
  porque toda figura vem de pixel art. Só `href` (SVG2), nunca `xlink:href` duplicado: repetir um
  data URL dobraria o arquivo.
- **O MAPA fica fora do seletor**: a miniatura dele é um MINIMAPA (um pixel por célula), então
  "entra o que a miniatura mostra" daria uma grade de cores sem sentido; desenhar o mapa de verdade
  passaria do teto do `src`; e um mapa é uma cena, não um adesivo. O desenho ABERTO também sai da
  lista (num cenário, inserir a si mesmo dobraria as formas a cada toque).
- A busca usa `isInsertableAsset` (metadados), não `thumbnailBitmap`/`flattenCels`; a lista é
  derivada uma vez por `useMemo`, e o `AssetThumb` compartilha cache por identidade do asset. O
  comando retorna booleano e o modal fecha SOMENTE depois de um commit bem-sucedido.
- A inserção de vetor recebe **um `groupId` único** (anda como uma peça). ⚠️ Os grupos internos do
  original são ACHATADOS nele; desagrupar solta tudo.
- ⭐ **O risco que precisava de navegador foi MEDIDO e passou**: o `<image href="data:…">`
  sobrevive ao `svgToPngDataUrl` (SVG por Blob URL num `<img>`, modo estático), **não contamina o
  canvas** (`toDataURL` não lança) e os pixels chegam ao PNG (1879 pixels opacos dentro da caixa,
  Chrome). Se um dia falhar em outro navegador, o `catch` do `rasterize.ts` degrada para `null` —
  o export sai sem a figura, em SILÊNCIO. Vale re-medir em Safari/iPadOS antes de confiar lá.
- ⚠️ Efeito de segunda ordem a vigiar: `studioLibrary` manda a miniatura vetorial como SVG cru
  abaixo de `SVG_THUMB_MAX_CHARS` (100k) e só acima disso rasteriza. Uma figura inserida empurra
  quase qualquer documento para além dos 100k, então essas miniaturas passam a depender do canvas.
- Testes: `vector/insertAsset.test.ts` (puros: triagem dos 7 kinds, grupo único, centralização,
  proporção, busca sem acento), `model.test.ts` (aceita/recusa `src`, round-trip do `pixelated`),
  `svg.test.ts` (markup), `editorStore.test.ts` (orçamento) e 4 casos de UI no `vectorUi.test.tsx`.
  ⚠️ **No teste, semear a galeria com `importAssets`, nunca `absorb`**: só o primeiro PERSISTE, e o
  `PintaApp` monta uma galeria própria que relê do disco. E o caminho do PIXEL não fecha em
  happy-dom (sem canvas) — o que se afere lá é a RECUSA educada.

## Editar os PONTOS e as CURVAS (08/2026)

A ferramenta "Editar os pontos" (`reshape`, atalho `A`) só arrastava UM nó de UMA forma. Agora ela
escolhe vários, acrescenta, apaga, fecha/abre o caminho (Fase 1) e mexe na curvatura: alças de
bézier, curva↔reta, ponto suave/canto e "suavizar o traço" (Fase 2).

### ⭐⭐ A decisão que evitou uma migração: nada é guardado por ponto

O modelo não tem onde pôr metadado por ponto — `path` é uma **string `d`** e `polygon` é um
`Vec2[]` cru. **`vector/pathNodes.ts`** é a visão canônica (`PathNode {p, in?, out?}` +
`EditablePath {nodes, closed}`) e vive só em MEMÓRIA, entre `toEditablePath` e `fromEditablePath`.
Guardar um campo por ponto custaria três coisas, todas silenciosas:
`shapeBytes` (`state/editorStore.ts`) conta `points.length * 16` e passaria a subestimar o
orçamento de 16 MB do undo; `sanitizeVectorShape` deixa passar chave extra **sem validar**; e
`animation/frames.ts` clona o quadro de forma RASA (o array `points` é compartilhado por
referência entre quadros duplicados — mutar um ponto no lugar corromperia o vizinho).

Por isso **"suave" e "canto" são LIDOS da geometria**, não guardados: um nó é suave quando as duas
alças estão na MESMA RETA, uma de cada lado da âncora. O pincel entrega isso de graça — a
Catmull-Rom escreve saída `p + (p₊₁−p₋₁)/6` e entrada `p − (p₊₁−p₋₁)/6` (teste em
`pathNodes.test.ts`, com folga de 0.02 = o arredondamento de 2 casas do `d`).

⚠️ **Colinear, NÃO simétrico.** Exigir os dois lados do mesmo TAMANHO é mais forte que a
continuidade da curva e barrava dois casos legítimos: o "ponto suave" que preserva os tamanhos que
já existiam, e arrastar uma alça de um nó suave (que alonga um lado só). A primeira versão usava
simetria e dois testes caíram na hora.

### O que já estava pronto e não precisou de nada

⭐ **O `Z` já atravessava a cadeia inteira**: `parsePathD` aceita, `shapeGeometryAttrs` passa o `d`
verbatim. **Fechar o caminho não exigiu uma linha de modelo.**

### Regras do lote

- **Polígono e linha viram TRAÇO ao ganhar curva ou ao mudar de fechado/aberto** (decisão da dona,
  sem perguntar). Enquanto continuam do jeito nativo a forma é preservada — senão arrastar um nó já
  mataria o slider de lados. Só o nome no painel Camadas muda.
- ⚠️ **A colisão do Delete.** `VectorEditorScope` já ligava Delete a "apagar a FORMA" num listener
  de `window`. O ramo de apagar PONTO mora no MESMO handler, antes: o `VectorStage` é filho e
  registra os listeners dele ANTES, então `preventDefault` daqui não seguraria o irmão (só
  `stopImmediatePropagation`, que é a versão frágil). As setas seguem a mesma regra.
- ⭐ **Nenhuma escolha de nó atravessa uma edição estrutural**: acrescentar deixa SÓ o ponto novo
  escolhido e apagar limpa. Foi mudança do QA — somar o novo aos anteriores deixava três marcados e
  o Delete seguinte levaria os três. De quebra, não existe índice velho para reindexar.
- **Pisos duros**: traço nunca abaixo de 2 nós, polígono nunca abaixo de 3 (abaixo disso o sanitize
  DESCARTA a forma no próximo load). Recusa com toast que diz o NÚMERO.
- **Acrescentar ponto é um toque no traço**, não um botão: `nearestOnPath` com folga
  `10/zoom + espessura/2`, e a divisão do cúbico é de **Casteljau** (a curva desenhada não muda —
  teste amostra 21 pontos antes e depois). Como não há botão, a faixa carrega a dica escrita.
- `shapeNodes`/`setShapeNode` **saíram do `geometry.ts`** (viraram `toEditablePath` + `moveNodes`,
  com a mesma semântica de arrastar as alças do nó junto).
- Os nós vivem em coordenadas LOCAIS (sem rotação) e o laço é medido em coordenadas do DOCUMENTO:
  `vectorNodeGestures.ts` faz a ponte. ⚠️ Girar a CAIXA do laço estaria errado (caixa girada não é
  retângulo); quem gira é o nó.
- Testes: `vector/pathNodes.test.ts` (puros) e o bloco "editar os pontos do vetor" em
  `vectorUi.test.tsx` — o `reshape` não tinha **nenhum** teste de UI antes deste lote. ⚠️ As UI
  consultam `circle[data-node]`: as ALÇAS também são `<circle>` no palco.

### A tesoura: abrir NO ponto e cortar em dois (08/2026)

O mesmo botão faz três coisas conforme o estado, e os rótulos são load-bearing:

| caminho | nós escolhidos | rótulo | o que faz |
|---|---|---|---|
| fechado | 0 | "Abrir o caminho" | `setClosed(false)` — TIRA o trecho que fechava (como sempre) |
| fechado | 1 | "Abrir o caminho neste ponto" | `openClosedPathAt` — PRESERVA todos os trechos |
| aberto | 0 | "Fechar o caminho" | como sempre |
| aberto | 1 no miolo | "Cortar em dois neste ponto" | `splitOpenPathAt` → DUAS formas |
| aberto | 1 na ponta | idem, mas toasta | não há o que cortar numa ponta |
| qualquer | 2+ | desligado | a tesoura promete "aqui" e não existe um "aqui" |

- ⭐ **A emenda duplica o nó** e cada cópia guarda UMA alça: o começo fica com o `out`, o fim com o
  `in` (`asStart`/`asEnd`). É o que faz a curva não mudar — `editablePathToD` nunca lê o `in` do
  primeiro nem o `out` do último quando o caminho é aberto.
- ⭐ **A ida e volta fecha o círculo**: `parseEditablePath` funde um nó final repetido SÓ quando o
  caminho está FECHADO, então a emenda sobrevive aberta, e fechar de novo devolve o laço original.
  Isso está travado por teste — é a rede de segurança do desenho inteiro.
- ⚠️ **A metade A guarda o id ORIGINAL.** Com dois ids novos, `selectedIds` ficaria órfão por um
  render, `single` viraria null, `nodePath` também, e o `VectorNodeActions` inteiro sumiria da tela
  (ele devolve `null` sem `nodePath`) — leria como "quebrou".
- ⚠️ `applyNodeEdit` agora devolve `boolean`: `fromEditablePath` retorna a forma ORIGINAL quando o
  `d` estoura `MAX_PATH_CHARS`, e sem esse retorno o "corte" duplicaria o traço inteiro em silêncio.
  O corte também não passa por ele (troca UMA forma por DUAS) e chama `commitShapes` direto.
- Recusa por `PINTA_LIMITS.maxShapes` reusa `COPY.vector.shapeLimit`.

### Fase 2: as curvas

- **Alvo dos botões de curva/reta**: os segmentos ENTRE os nós escolhidos; com UM nó só, os dois
  que encostam nele (senão escolher um ponto e pedir "curva" não faria nada).
- **Virar curva não move o desenho**: os controles nascem em 1/3 e 2/3 da corda, então a cúbica É
  a própria reta e o que a criança vê é a alça aparecer. Travado por teste que amostra 21 pontos.
- **"Ponto suave"** tem três casos, do que menos mexe ao que mais: com as DUAS alças alinha na
  direção média preservando os tamanhos; com UMA espelha ela; sem nenhuma inventa as duas pela
  corda dos vizinhos (é o "arredonde este canto"). **"Ponto de canto"** REMOVE as duas — marcar
  canto sem mudar nada seria um botão que não faz nada.
- **"Suavizar o traço" é repetível** e não pode ficar mudo: um toque vale se tirar ponto OU
  arredondar um canto que ainda era quina. Quando nenhuma das duas se aplica (traço de pincel, que
  já é todo curvo e cujos pontos o RDP guarda na mesma régua), a régua DOBRA até sair ponto.
  Medido no playground: 21 → 18 → 13 nós em três toques. Sem isso, do segundo toque em diante o
  botão não fazia nada.
- ⚠️ **A ida e volta pelo `d` INVENTAVA alça** (defeito real, pego pelo teste de UI): um trecho com
  alça de um lado só vira um cúbico com o outro controle EM CIMA da âncora, e a releitura lia isso
  como alça degenerada no vizinho. Efeito: "ponto de canto" não fazia nada nele e a forma nunca
  mais perdia a curvatura. **Controle colado na âncora não é alça** — o parser o descarta.
- ⚠️ **Alça perto demais do nó não é desenhada** (`MIN_HANDLE_GAP`, 12 px de TELA). Num traço de
  pincel a Catmull-Rom deixa a alça a ~4 px do nó: desenhada por cima ela roubava o arrasto do
  PONTO, e desenhada por baixo era impossível de pegar. Aproximar o zoom afasta as duas e a alça
  reaparece (medido). As alças que a criança CRIA de propósito (ponto suave, virar curva) nascem
  longas e nunca caem nessa faixa.
- **A conversão polígono → traço é de MÃO ÚNICA**: tirar a curvatura depois NÃO devolve o polígono
  (o caminho de volta é o Ctrl+Z). O teste puro que exercita "volta a ser polígono" passa a forma
  ORIGINAL, um cenário que a UI não produz — está lá para travar o `fromEditablePath`, não o fluxo.

⚠️ **Armadilha de QA em navegador**: disparar `pointerdown/move/up` no mesmo turno de JS faz o
`endGesture` ler o `marquee` ANTES da repintura e tratar o arrasto como toque (a seleção some).
Dê uma folga entre os eventos. E o rect do palco tem que ser lido A CADA evento: a faixa contextual
aparecendo/sumindo move o palco, e um rect cacheado joga o clique fora do alvo.

## Misturar formas: unir, tirar a da frente, o pedaço em comum e o resto (14/08/2026)

Pedido dela com a captura do Pathfinder do Illustrator: as quatro "Shape Modes" numa barra que
aparece ao escolher duas formas. O Pinta já sabia **agrupar** (andam juntas, continuam separadas) e
**cortar um traço em dois**; o que faltava era **fundir geometria**. Sem isso, uma lua crescente ou
uma estrela vazada numa placa só saíam desenhando o contorno inteiro ponto a ponto.

Três módulos PUROS, em camadas, e oito linhas de cola:

| arquivo | sabe o quê |
|---|---|
| `vector/flatten.ts` | forma → anéis de pontos, rotação já assada |
| `vector/polygonClip.ts` | só anéis; **não conhece `VectorShape`** |
| `vector/pathfinder.ts` | dobra N-ária, teto de caracteres, IDENTIDADE do resultado |

A separação não é enfeite: o clipper ser cego à forma é o que deixa os casos difíceis serem
testados como número entra, número sai, sem fixture de forma no meio.

### ⭐⭐ O algoritmo robusto e o orçamento

As quatro booleanas usam o sweep de Martinez de `polygon-clipping` (MIT). O clipper próprio por
noding/encadeamento foi removido depois que fuzz determinístico encontrou cadeias abertas em
interseções quase paralelas: a rede de segurança recusava corretamente, mas uma forma suportada não
pode falhar de modo probabilístico. `vector/polygonClip.ts` continua sendo a fronteira do Pinta:

- converte o array plano de anéis nonzero para `MultiPolygon` sem inventar furo em anéis aninhados
  com a mesma winding;
- converte a saída de volta para anéis sem ponto repetido, externo positivo e furo negativo;
- mantém `polyArea`, `pointInPoly` e o serializer M/L/Z como API pura do pacote.

`pathfinder.ts` separa componentes pelas caixas antes da conta. União/xor concatenam componentes
desconectados e só clipam o grupo que realmente se toca; interseção entre componentes é vazia;
diferença ignora cortadores desconectados da base. A dobra conectada tem orçamento determinístico de
pares de arestas e recusa com `too-big` antes de congelar a thread. Regressão: 500 elipses válidas,
com só as duas primeiras sobrepostas, precisam terminar em menos de 500 ms (31–47 ms local), não em
9–15 s.

Rasterizar e vetorizar de volta continua proibido: dá escadinha que a criança amplia depois.

### A régua do achatamento (`CHORD_TOLERANCE = 0.1`)

Não é chute, e duas contas independentes batem no mesmo número: o export re-renderiza em ×4 (meio
pixel ⇒ ≤ 0.125) e o editor chega a ×16 (dois pixels ⇒ ≤ 0.125). **Círculo de 100px = 50 segmentos,
~700 chars de `d`.** Sagita por arco `Δθ ≤ √(8·tol/r)`; cúbica por `n ≥ √(3L/(4·tol))`.

⚠️ O anel é INSCRITO no arco, então sai um tiquinho MENOR que a conta exata (cada gomo perde
`(r²/2)(θ − sen θ)`). Cobrar igualdade exata num teste é cobrar que o achatamento não achate.

### ⭐ NONZERO, não par-ímpar

O modelo não tem `fill-rule` e o SVG usa nonzero por padrão, então é **o que a criança já vê na
tela**. Par-ímpar furaria o meio de um traço fechado que se cruza sozinho, que lê como "o computador
estragou meu desenho". O furo aparece pela **winding invertida**: externo `signedArea > 0`, furo
`< 0`, e o aninhamento sai da PROFUNDIDADE (par pintado, ímpar furo) — "o maior é o de fora"
deixaria uma ilha dentro de um furo vazada.

### ⭐⭐ A identidade do resultado

**O resultado guarda o id, o lugar na pilha, o estilo e o grupo do participante de TRÁS**, com
`rotation: 0`.

O id é **obrigação, não gosto**: com um id novo, `selectedIds` fica órfão por um render, `selected`
vira `[]` e a `VectorSelectionBar` INTEIRA devolve `null`. Ela está no FLUXO, então o palco pularia
uns 54px e voltaria. É a lição do corte com a tesoura, um degrau pior.

A frase para a criança: *a forma de trás é quem manda; ela cresce, encolhe ou ganha um buraco, e
continua com a cor dela.* Uma regra só para os quatro botões — "a da frente manda" seria impossível
no "tirar a da frente", onde ela é justamente a que some.

⚠️ **Z-order é o contrato**: o array entra fundo → frente, que é a ordem natural de
`currentShapes()`. NUNCA reordenar por `ids` — a ordem em que ela TOCOU não é a do desenho. Travado
por um anti-vácuo que passa os ids invertidos.

⚠️ Forma **escondida** não participa **e não some**: filtrar pelos ids dos PARTICIPANTES, não pela
seleção crua.

### A UI

- Bloco na `VectorSelectionBar` gated por `selected.length >= 2`, o mesmo gatilho do Agrupar. **O
  bloco inteiro é gated, não cada botão**: um gatilho só significa UMA mudança de layout, e a
  lixeira desliza uma vez em vez de duas. Medido no playground: faixa continua com **54px**, uma
  linha só, alvos de 44px.
- Os quatro ficam **sempre habilitados**; quem avisa é o TOAST. Botão morto não ensina o que fazer.
- ⭐ **Os quatro ícones existem no lucide 0.546** (`SquaresUnite/Subtract/Intersect/Exclude`), já
  tipados como `LucideIcon`: nada de desenhar à mão nem de afrouxar o tipo do `ToolButton`. Medido a
  20px: 120–154 pixels de tinta cada, os quatro perfis distintos (menor diferença 29).
- **No TOQUE só o "Virar uma forma só"** (decisão dela): as outras três pedem enxergar quem está na
  frente, e em 375px a barra já chega a 6 alvos. No mesmo lote a barra flutuante ganhou o
  `max-w`/`overflow-x-auto` que a irmã do reshape já tinha.
- O mapa de recusas é um **`Record<PathfinderRefusal, string>`**, não um `switch`: recusa nova no
  núcleo quebra o typecheck em vez de virar toast vazio.

⭐ **A recusa `apart` merece existir**: unir duas formas separadas produz um resultado que PARECE
idêntico ao que estava lá, e as outras três viram no-op ou apagam tudo. Botão que parece não fazer
nada é o pior desfecho possível para uma criança, e um diagnóstico cobre os quatro. (No QA em
navegador foi uma recusa que me disse o que eu tinha feito de errado: o desenho de teste já tinha um
traço aberto e o meu laço o pegou junto.)

### ⭐ A faixa dos pontos passa a DIZER em vez de sumir

Resultado com furo tem dois `M`, e `toEditablePath` recusa vários sub-caminhos de propósito
(`pathNodes.ts:102`). Antes a `VectorSelectionBar` inteira devolvia `null` no modo reshape, o que lê
como "quebrou". Agora mostra `COPY.vector.nodeUneditable`, com `min-h-11` nos dois ramos para o
palco não pular. Conserta de quebra um buraco que já existia: retângulo/círculo/texto/figura também
apagavam a faixa em silêncio.

**Fora deste lote, nomeadamente:** ensinar sub-caminhos ao `toEditablePath`.

### Quem entra e quem não entra

`rect`, `ellipse`, `polygon` e `path` **fechado** (tantos `Z` quantos `M`). Traço de pincel nunca
fecha (`catmullRomToPath` não emite `Z`), então cai em `open-path` com uma frase que diz o que fazer.

**Recusados, com o porquê:** linha (não tem miolo), texto (pediria decodificar WOFF2 e ler os
glifos — o Illustrator também exige "Criar contornos" antes) e figura (é imagem, não tem contorno).

### Testes

`vector/polygonClip.test.ts`, `vector/flatten.test.ts`, `vector/pathfinder.test.ts` e o bloco de
integração no `vectorUi.test.tsx`. As regressões incluem a combinação rotacionada que quebrava o
clipper antigo e o SLA de 500 elipses.

Os que valem mais que os outros:
- **A identidade inclusão-exclusão**, table-driven: `área(união) + área(interseção) = área(A) +
  área(B)` e as duas irmãs. Cruza as quatro operações entre si sem uma constante calculada à mão.
- **`o d de saída sobrevive ao parsePathD e ao sanitize`**, para todo caso `ok`. Pega "emiti um `A`",
  "emiti minúscula", "emiti `M0 0` colado" e "emiti 25k chars" — todos produzem forma que DESENHA
  bem no editor e **some da galeria no próximo load, em silêncio**. Mesma família do bitmap que não
  casava com o quadro no lote do redimensionar.
- **Formas giradas**: o anti-vácuo é `área(união) > 10000`, porque quem ignora a rotação devolve
  10000 nas duas e **ainda assim satisfaz a identidade da soma**.
- **UM desfazer devolve as duas formas** (a prova de "um commit só"; com dois commits voltaria uma).

⚠️ Casos que existem porque criança produz exatamente eles: dois quadrados IDÊNTICOS (o anti-vácuo é
`ring.length === 4`, não a área), aresta inteira compartilhada, sobreposição colinear parcial
(anti-vácuo: a lista exata de 8 vértices), encostar num ponto só, tocar só no canto (um oito tem a
mesma área).

### QA em navegador, feito

O playground é Vite, então dá para `import('/@fs/…/pathfinder.ts')` e rodar o **módulo de verdade no
Chrome**. Medido lendo PIXEL do SVG rasterizado (Blob URL → `<img>` → canvas → `getImageData`):

| conta | só-quadrado | só-círculo | em comum |
|---|---|---|---|
| tirar a da frente | pintado | vazio | vazio |
| interseção | vazio | vazio | pintado |
| excluir | pintado | pintado | vazio |
| **furo** (círculo dentro) | anel pintado | — | **miolo VAZIO** |

⭐ O furo é a única parte que teste de unidade nenhum prova: é a winding invertida virando buraco de
verdade no rasterizador. E no app real, ponta a ponta: 2 retângulos → 1 traço com o `d` sendo o L de
8 pontos exato; quadrado + círculo dentro → 1 traço com 2 sub-caminhos; **um** Desfazer devolve as
duas formas.

⚠️ **O painel do navegador desta sessão fica OCULTO**: `visibilityState: 'hidden'`, então print não
sai e o rAF é estrangulado — mas o LAYOUT funciona (`getBoundingClientRect` devolve valores reais),
diferente do que acontece no studio. Medir por pixel e por rect dá; fotografar não.

⚠️ Gotcha de QA que custou uma rodada: disparar `pointerdown/move/up` no mesmo turno de JS faz o
gesto ser lido como toque, e o rect do palco tem que ser relido A CADA evento (a faixa contextual
aparecendo move o palco).

**Pende o QA dela desenhando.**

### Full review do lote do pathfinder (14/08/2026) — 3 achados

Rodada inicial logo depois de escrever a feature, porque **código novo escrito de uma sentada é
código que ninguém revisou**. Ela encontrou três defeitos na borda entre o núcleo e a criança; o
full review posterior de 14/08 encontrou também as falhas raras de geometria e o custo no limite,
hoje cobertos pelas regressões descritas acima.

1. ⭐⭐ **"Tirar a da frente" que não tira nada apagava as formas da frente e devolvia a base
   intacta.** O `apart` pergunta "NENHUM par se encosta?", e com TRÊS formas as duas da frente podem
   se encostar ENTRE SI enquanto nenhuma toca a base: a guarda não disparava, a conta devolvia a
   base igualzinha, e o efeito era o pior possível — as da frente SUMIAM do desenho e nada foi
   recortado. **Não é clique morto, é perda de desenho.** Fix: a régua passou a ser a ÁREA (o
   resultado tem que diferir da base), o que também pega o caso das caixas que se cruzam sem as
   formas se cruzarem. Medido antes do conserto: base de 1600 entrava e saía 1600, com `ok: true`.
   ⚠️ Só o `menos-frente` precisa disso: unir formas soltas de fato as junta numa forma só (é a
   promessa do botão) e interseção vazia já caía no `empty`.

2. ⭐ **Um `d` ILEGÍVEL dizia à criança que o traço "está aberto".** São coisas diferentes: aberto
   ela fecha, ilegível ela não tem como consertar. Nasceu a recusa `bad-path`, com frase própria.
   ⭐ O `Record<PathfinderRefusal, string>` fez exatamente o trabalho para o qual foi escolhido:
   somar a recusa nova na união **quebrou o typecheck** até a copy existir. Um `switch` teria virado
   toast vazio.

3. ⭐⭐ **A faixa da seleção CRESCIA 17px em altura, e o comentário do arquivo jurava que não.**
   Ele promete "*rola de LADO (`overflow-x-auto`) … nunca cresce em altura, nunca rouba altura do
   palco*". A promessa nunca foi verdadeira: a barra de rolagem do Chrome é CLÁSSICA e ocupa layout.
   Medido numa janela de 800px: conteúdo 1107px, faixa de **52 → 69px**, empurrando o palco. É o
   mesmo defeito de "os botões piscam e a grade sobe e desce" que este pacote já tratou uma vez.
   ⚠️ **Pré-existente, e o meu bloco alargou muito a faixa de larguras onde aparece** (de 768–843
   para 768–1107). Fix: `.pin-scroll-x` (`styles/pinta.css`) esconde o desenho da barra sem tirar a
   rolagem, aplicado nas quatro faixas roláveis do vetor. Medido depois: **54px**, sem barra
   ocupando altura, e `scrollWidth 1107 > clientWidth 800` provando que ainda rola.
   ⚠️ **Contrapartida honesta:** abaixo de ~1107px de largura os últimos botões pedem rolagem
   lateral SEM aviso visual. É limite antigo desta faixa; o palco pulando é o mal maior, e foi o que
   este pacote já decidiu uma vez.

**Não-achados, todos MEDIDOS** (valem porque poupam a próxima rodada):

- **Custo pequeno**: 700 + 700 pontos numa união e seis círculos continuam rápidos, mas isso não
  substitui o orçamento: o caso desconectado de 500 formas provou que a dobra binária crescia por
  segundos antes de recusar pelo tamanho final.
- ⭐⭐ **A ESTRELA que se cruza sozinha sai EXATA** pela interpretação nonzero do clipper:
  área visível 2806 (a com sinal é 3674, porque o miolo conta duas vezes), e unir um quadradinho
  DENTRO do miolo já pintado acrescenta **0,0**. Nonzero é o que o SVG já fazia, então o resultado
  bate com o que ela via.
- **Ilha dentro do FURO**: as quatro contas certas (união 7900 = 7500 + 400, interseção vazia,
  diferença 7500, xor 7900). A profundidade par/ímpar funciona.
- **Rosca como a da FRENTE**: quadrado de 100 menos um anel devolve exatamente **2500** (o miolo).
- **Caixas que se cruzam sem as formas se cruzarem**: união 2 anéis, interseção vazia, diferença
  intacta. Todas certas.
- **Degradê** no de trás sobrevive (o id é preservado, então o `<linearGradient>` regenera).
- **Frente cobrindo a base por inteiro** → `empty`. **Largura zero** → recusa. **Id repetido na
  lista** → dedup.

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
- **Cor livre é uma transação**: `ColorPickerDialog` mantém um rascunho local e só chama o
  consumidor em “Aplicar”/“Adicionar”. Cancelar não cria swatch nem histórico; confirmar uma ponta
  do degradê cria uma única entrada de undo. `VectorEditorScope` deduplica a união paleta base →
  projeto → recentes e ressincroniza o inspetor com a forma após undo/redo.
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
  entrada; `undo`/`redo` restauram/reaplicam os mapas em `linkedAssets`. A galeria NÃO recebe a
  revisão viva: depois do `setMany` confirmar, `onSaved` publica principal+ligados num único
  `absorbMany`. `commit`/`replace`/`commitGesture`
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
  p/ a biblioteca já estar em dia quando ela troca de aba). Gatilho = identidade de **`savedAsset`**,
  atualizada somente depois da persistência confirmar; revisão em `dirty/error` nunca atravessa a
  ponte. Devolvendo `updated`, o cabeçalho mostra "Atualizado no Estúdio" — a ÚNICA confirmação
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

## A CAIXA DE COLISÃO sai do desenho (08/2026)

O relato dela: no Pinta o personagem só podia ser um QUADRADO, então uma nave de 128x32 vinha num
quadro 128x128 com 96px de vazio, e no Estúdio esse vazio **encostava sem encostar**. O pedido tinha
três partes; as duas primeiras estão feitas (a terceira, um bloco explícito de hitbox, ficou de fora
de propósito — ver §"Fora de escopo" no studio).

1. **Quadro NÃO-quadrado** (a raiz): largura e altura separadas na fábrica, no assistente e no
   redimensionar. ⚠️⚠️ A fábrica declarava `frameWidth: 128, frameHeight: 32` mas chamava
   `createBitmap(size, size)` — o `sanitizePintaAsset` DESCARTAVA o asset inteiro, sem uma linha de
   erro, e o desenho sumia da galeria. Bitmap e quadro andam juntos, sempre.
2. **`export/spriteHitbox.ts`**: mede onde de fato tem pixel (ou forma visível) e manda a caixa no
   `sprite` da ponte. O Estúdio aplica sozinho, sem bloco nenhum.

⭐ Três decisões que fazem isso funcionar, e cada uma tem uma rede:

- **UNIÃO de todos os quadros**, nunca por quadro. Caixa por quadro pulsaria com a animação: o braço
  estica no golpe e a colisão muda sozinha. ⚠️ O teste usa um par ASSIMÉTRICO (o golpe vai para a
  esquerda num quadro e para a direita no outro) porque um par que cresce só para um lado passaria
  também com "o último quadro vence".
- **FRAÇÃO do quadro (0..1)**, nunca pixels: o mesmo desenho entra no jogo em qualquer tamanho.
- **Arte que preenche o quadro OMITE a chave** — quem já usava o quadro inteiro continua com payload
  byte-idêntico e comportamento idêntico. A caixa só aparece quando de fato aperta.

⚠️ **Camada escondida não conta** (achata pelo `flattenCels`, igual ao export): a colisão segue o
que se vê.

⚠️⚠️ **`shapeBounds` IGNORA a rotação, e o `svg.ts:89` a RENDERIZA** (`rotate()` ao redor do
centro). Para o editor a aproximação serve — a alça fica perto da forma —, e todos os consumidores
dela são de UI. Colisão é outra coisa: uma espada girada 45 graus ficava com caixa ~30% menor que o
desenho e o golpe passava por dentro do inimigo. Por isso o `giradaAoRedorDoCentro` mora AQUI e não
no `shapeBounds`: mexer lá moveria as alças de seleção do editor inteiro.

⚠️ **Redimensionar tem que mover as FORMAS junto**, não só o quadro. O `<svg>` aninhado já clipa,
então mudar `frameWidth`/`frameHeight` bastava para a correção — mas o pixel, no MESMO diálogo,
centraliza a arte. Medido no full review: 32→128 deixava a forma em x=8 com o quadro novo centrado
em 64, ou seja, o desenho pulava para o canto. Vale para o sprite E para o fundo vetorial.

O outro lado (sanitize, cano do preview, runtime e a regra de quem vence) vive no studio — ver
`packages/studio/CLAUDE.md` §"A caixa de colisão vem do desenho".

## Backup e restauro simétricos (15/08/2026)

`Baixar tudo` gera `meus-desenhos-pinta.zip` com os arquivos de uso e o backup canônico
`galeria.pinta.json` na raiz. `Trazer de volta` aceita esse ZIP DIRETO ou um `.pinta.json` solto.
No ZIP, `export/backupFile.ts` lê por faixas o EOCD, o diretório central, o cabeçalho local e SÓ os
bytes da entrada canônica; PNGs, SVGs e receitas nunca entram na memória. O descompactador `fflate`
só é importado dinamicamente quando a entrada usa deflate. O nome da entrada vive em
`export/backupFormat.ts`, compartilhado por escrita e leitura. O JSON descompactado é limitado a
32 MiB; ZIP inválido, criptografado, ZIP64, sem a entrada, com entrada duplicada ou acima do teto é
recusado com motivo próprio. Enquanto lê/descompacta/persiste, o botão fica desabilitado, com texto
de andamento e `aria-busy`.

O `ExportDialog` também baixa `desenho.pinta.json`. Quase todo asset viaja sozinho; TILEMAP leva o
tileset apontado por `tilesetId`, primeiro no array, e recusa o download se as peças sumiram.
`galleryStore.importAssets` cria ids e nomes novos e religa o par. ⚠️ Esse caminho usa
`assetBundleToJson`; o `assetToJson` público continua serializando UM asset com identidade
preservada, pois o bloco de aula depende desse contrato para retomar o mesmo desenho.
O par TILEMAP + tileset é restaurado com `{atomic: true}`: quota, nome ou persistência falhou, não
publica nenhuma metade. Mapa sem o tileset no mesmo arquivo nem já existente na galeria é recusado;
o restauro completo continua parcial para desenhos independentes, mas nunca cria mapa órfão.

## Bloco de aula: `@sistemazero/pinta/lesson` (Fase 1, 15/08/2026)

Pedido dela: "hoje a aula tem o bloco de Estúdio; quero o mesmo com o Pinta — eu já configuro o
tipo e o tamanho, abre no editor com o projeto criado, e a criança envia a atividade para o
professor". Esta é a **Fase 1**: abrir a API do pacote. O bloco em si (members + member-shell +
admin + kids) é a Fase 2.

O Estúdio nasceu embarcável (13 subpaths, `initialProject`, persistência injetável, `onChange`,
ref). O Pinta tinha 3 subpaths e `PintaApp({adapter})` — lia tudo do IndexedDB do perfil no mount
e **o host nunca via o desenho**. As quatro peças que faltavam:

### `assetToJson` / `assetFromJson` (`export/assetJson.ts`)

Embrulham o `galleryToPintaJson`/`importPintaJson`, que já faziam round-trip fiel. ⚠️ **Preservam
id e nome** — quem troca a identidade é o `galleryStore.importAssets`, de propósito ("import nunca
sobrescreve"), e por isso este caminho **não passa por ele**. Sem essa preservação, reabrir o bloco
criaria uma cópia a cada abertura em vez de retomar de onde parou. O arquivo é um `.pinta.json` de
UM desenho, no mesmo envelope do ZIP: baixar no bloco e importar no Pinta completo funciona sem
ponte nova.

### Curadoria da CAIXA DE FERRAMENTAS (`core/toolCuration.ts` + `adapter.allowTools`)

"A tela da criança não pode vir cheia." É o `allowBlocks` do Estúdio aplicado à caixa: lista
NÃO-VAZIA mostra só aqueles ids, ausente ou vazia mostra tudo (o Pinta solto nunca cura).

- ⭐ **Um id, três editores.** Pixel, vetor e mapa compartilham vários ids (`select`, `line`,
  `rect`, `ellipse`, `picker`, `pan`), então um preset é UMA lista e cada caixa a intersecta com o
  próprio catálogo; id desconhecido é ignorado. É o que deixa "Só o essencial" significar a coisa
  certa nos três sem três listas para drifar.
- ⭐ **A curadoria alcança a caixa INTEIRA**, não só o que é selecionável: alternadores (`mirror`,
  `mirrorV`, `grid`, `filled`) e ações do quadro (`flipH`, `flipV`, `rotate`, `clear`) têm id
  igual. Quem pede "sem tralha" está olhando a caixa toda.
- ⚠️ **Ferramenta ativa cortada é ESTADO IMPOSSÍVEL** (selecionada e fora da tela): `toolFallback`
  cai na 1ª permitida, nos três editores. De quebra, o atalho de teclado não alcança mais uma
  ferramenta escondida — ela volta sozinha.
- ⚠️ **`fit` ("Ajustar", só no vetor) está nos DOIS presets**: é o único item da caixa que mexe só
  na VISTA, e quem aproximou demais pela rolagem precisa do caminho de volta. Já `insertAsset`
  ("trazer um desenho da galeria") fica FORA dos presets: numa aula o desenho é isolado da galeria
  pessoal.
- Grupo vazio some junto com o divisor dele — senão a caixa curada fica com traços separando nada.
- ⚠️ Curar ferramenta **não** é curar painel. Camadas/Cores/Prévia/Aparência mexem no layout das
  colunas (calibrado) e saem por `features`, não por lista.

### Persistência injetável + `onChange`

- `createGalleryStore(persistence?)` e `PintaApp({persistence})`. ⚠️⚠️ **O vazamento real estava no
  EDITOR**, não na galeria: o `EditorScreen` chamava o `persistAssets` de MÓDULO, que vai direto ao
  IndexedDB do perfil e furaria qualquer armazenamento injetado. Hoje ele lê do contexto.
- `state/memoryPersistence.ts` = o `'none'`. ⭐ Ela existe para que "não guardar no navegador" NÃO
  vire "salvamento desligado": o autosave roda, `savedAsset` avança, o selo "Salvo" aparece e o
  `onChange` dispara — é assim que o host salva no backend. Arrancar a persistência cortaria o fio
  em silêncio e o desenho nunca chegaria ao professor.
- ⚠️ **Abrir NÃO dispara `onChange`, só editar** — a trava é a IDENTIDADE do `savedAsset`, nunca um
  booleano "já montei": em StrictMode o React monta → limpa → monta, e a 2ª montagem passaria. É a
  mesma lição do reenvio ao Estúdio.

### `<PintaLesson>` + `PintaHandle` (`src/lesson/`)

Um desenho só, sem galeria atrás. O `initialAssetId` do `PintaApp` não servia: é só um empurrão no
mount, com pisca de galeria, com o voltar sempre presente, e um id inexistente despeja a criança na
galeria inteira do perfil.

- **Moldura restrita por default** (`PintaLessonChrome` no appContext): sem botão voltar (não há
  para onde), sem mudar o tamanho (é escolha do professor) e sem "Baixar" (o bloco tem o download
  dele). `features={{resize, export}}` religa.
- ⚠️⚠️ **A semeadura é CONDICIONAL**: se o armazenamento já conhece o id, o que está lá é o que a
  criança desenhou. Semear incondicionalmente apagaria a aula dela a cada reabertura — o bloco
  remonta com o mesmo `initialAsset` toda vez. Mesma ordem de seed do bloco do Estúdio.
- **`PintaHandle`** (`getAsset`/`save`/`replaceAsset`): o editor se anuncia pelo
  `context.onEditorReady`. ⚠️ `replaceAsset` **recusa id diferente** — o editor é montado POR ID, e
  trocar a identidade por baixo dele deixaria a galeria apontando para um desenho que não existe.
- ⚠️ **`persistence: 'local'` grava na galeria do PERFIL** e fura o isolamento entre o desenho da
  aula e os pessoais. Existe para playground/uso solto; o bloco usa `'none'` ou adapter próprio.
- **Não há `onSave`** (o plano previa, espelhando o Estúdio): lá existe uma ação explícita de
  salvar, aqui o salvamento é automático e `onSave` seria um segundo nome do `onChange`. Quem quer
  salvar na hora chama `handle.save()` e recebe o resultado.
- **`core/newAsset.ts`** tirou `createAsset`/`NewAssetInput` do `galleryStore`: são PUROS e têm
  consumidor fora do navegador (o admin pré-cria, o servidor valida na borda), e puxar a store
  arrastaria zustand + IndexedDB para dentro de um serviço Bun.

### Fase 2 — o bloco ponta a ponta (15/08/2026)

O bloco existe: `members` (enum `pinta` na migration `0065`, gate `PINTA_GATE_NOT_SUBMITTED`,
`pintaState`, rotas `pinta-submission`), `member-shell` (`PintaBlockView`), `community-kids` +
`community` (renderizadores) e `admin` (autoria + viewer da entrega). Contratos e armadilhas de
cada lado vivem no CLAUDE.md do pacote respectivo. O que é DAQUI:

- **`PINTA_LESSON_ASSET_OPTIONS` + `createLessonAsset`** (`core/newAsset.ts`, exportados em
  `/assets`): os tamanhos que a AUTORIA de uma aula oferece. ⚠️ Param em **256** no cenário
  porque o desenho ATRAVESSA a borda (teto de 2 MB do gateway): 512x512 com 4 camadas chega a
  2,6 M chars no pior caso e a criança desenharia sem conseguir enviar. Telas maiores seguem no
  Pinta solto, onde nada trafega.
- **`PINTA_ASSET_KINDS` + `isPintaAssetLike`** (`core/project.ts`): os 7 tipos em RUNTIME. O
  admin distingue a entrega de desenho da de Estúdio por aqui — as duas moram na MESMA tabela e
  a linha não carrega o kind do bloco. Sem isso, seriam três cópias da mesma lista.
- **`createPintaPersistence({namespace})`**: banco próprio, ignorando o namespace global. É o
  que dá ao bloco um rascunho por bloco+perfil sem tocar a galeria pessoal da criança.
- **`assets/members-conformance.test.ts`**: o `members` copia os 7 tipos (não pode depender deste
  pacote — é um serviço Bun e a dep arrastaria lucide-react + o peer de React). O teste mora AQUI
  e lê o domínio dele por caminho relativo, porque só este lado consegue importar os dois.

### Full review da Fase 1 (15/08/2026) — 4 achados

Rodada logo depois de escrever a fase, porque código novo escrito de uma sentada é código que
ninguém revisou. Os quatro estavam na BORDA entre o pacote e quem o consome.

1. ⭐⭐ **O subpath `./lesson` era impossível de usar do servidor, e o cabeçalho dele mentia.**
   Ele dizia "o servidor importe só o que é puro daqui" — mas importar QUALQUER coisa de um barril
   avalia o barril inteiro, e o `PintaLesson.tsx` importa React. O `members` é um serviço Bun
   **sem React nas dependências**: a validação na borda quebraria na resolução de módulo, num
   deploy. Nasceu **`@sistemazero/pinta/assets`**, livre de React, e o `./lesson` reexporta dele.
   ⭐ A fronteira virou o GRAFO DE MÓDULOS, com `assets/purity.test.ts` percorrendo os imports
   relativos e nomeando a trilha que trouxe o problema. Provado apontando o barril puro para o
   componente: o teste acusa `assets/index.ts → lesson/PintaLesson.tsx`.
2. ⭐⭐ **Armazenamento que falha deixava a criança com um retângulo BRANCO para sempre.** A IIFE
   assíncrona da semeadura não tinha `catch`: a promessa rejeitava, o `setStatus` nunca rodava e
   nada aparecia — nem erro no console dela. Hoje há `loading` / `ready` / `error` com recado.
3. ⭐ **O `initialAsset` não era saneado na borda.** Ele vem do backend e o `createEditorStore` não
   sanea nada: um desenho malformado entraria, seria editado, e **sumiria no próximo load** (a
   falha mais cara deste pacote). Hoje o `sanitizePintaAsset` roda uma vez no boot, e `null` vira
   um recado DIFERENTE do de falha de rede — recarregar não conserta autoria.
4. **Trocar a prop `initialAsset` refazia o `load()`.** As deps do efeito eram o objeto inteiro, e
   um host que monta `initialAsset={...}` inline passa identidade nova a cada render. Hoje o
   desenho é fixado no boot; para abrir outro, remonte com `key`.

Testes: `core/toolCuration.test.ts`, `components/editor/toolCurationUi.test.tsx` (os três
editores), `components/editor/injectedPersistenceUi.test.tsx`, `lesson/pintaLessonUi.test.tsx`,
`assets/purity.test.ts`, `export/assetJson.test.ts`. **Pende QA em navegador** e as Fases 2 e 3.

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
- **Misturar formas / pathfinder (08/2026, não commitado)**: unir, tirar a da frente, o pedaço em
  comum e o resto. Três módulos puros (`vector/flatten.ts`, `vector/polygonClip.ts`,
  `vector/pathfinder.ts`), zero dependência nova. QA em navegador FEITO (as quatro contas medidas em
  PIXEL de Chrome, inclusive o furo; e o fio inteiro no app: 2 formas → 1 traço, um desfazer devolve
  as duas). **Full review feito no mesmo lote: 3 achados**, sendo um de perda de desenho e um de
  altura da faixa que era PRÉ-EXISTENTE. Ver as duas seções dedicadas. **Pende o QA dela
  desenhando** e a legibilidade dos glifos no olho.
- **Bloco de aula, Fase 1 (15/08/2026, não commitado)**: subpath `./lesson` com `PintaLesson` +
  `PintaHandle`, curadoria da caixa nos três editores, persistência injetável + `onChange`,
  `assetToJson`/`assetFromJson` e `core/newAsset.ts`. 813 testes verdes. Ver a seção dedicada.
  **Pende QA em navegador e as Fases 2 e 3** (o bloco ponta a ponta e a cadeia entre aulas).
- **Pendências**: QA em browser real (palco vetorial, fluxo estilo→tipo, animação vetorial
  ponta-a-ponta, peças/mapa vetoriais, export, ponte entre perfis, tema claro/escuro, touch,
  Cartão de Criação → Pinta pré-preenchido → asset vinculado → envio ao Estúdio; o lote novo do
  vetor: grade/snap/laço/camadas/caneta em touch e nos 3 kinds).
- **Backlog de produto conhecido (baixo)**: strings de UI soltas fora do copy.ts; auto-avançar no
  passo de tamanho; nome do estilo "Vetor" pode virar "Desenho de formas" se o QA com crianças
  mandar.

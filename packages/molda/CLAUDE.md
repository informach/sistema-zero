# CLAUDE.md — @sistemazero/molda

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em lib/framework, e use
> Octocode para pesquisa/exploração de código no GitHub.

**Molda** — a oficina 3D do Estúdio, para crianças de 9+: **modelos low poly** (peças cubo/rampa/
cilindro/bola numa grade, com a pele PINTADA direto no modelo), **texturas** de superfície (folha
de pixels sem emenda) e **céus 360°** paramétricos (saem como `.hdr`). Jornada do produto: Pensa
planeja → Pinta desenha → **Molda modela** → Estúdio constrói. Irmão do Pinta: mesma arquitetura,
copiada por VALOR (zero import entre os dois pacotes). Biblioteca INTERNA do monorepo, consumida
como **TS source** (sem build): o kids usa `transpilePackages` + `@import "../../../molda/src/
styles/molda.css"` no globals.css. O stylesheet registra `../components` e exclui
`**/*.test.{ts,tsx}`: o host não precisa varrer todo `molda/src`. Sem o `@import` as
utilitárias `mld-*` são no-op; todo `@import` antes de qualquer `@source`.

Desenho completo (decisões, modelo de dados, motor, integrações, lotes, riscos, verificação):
[`docs/plans/2026-09-04-molda-design.md`](../../docs/plans/2026-09-04-molda-design.md). O
estudo do Blockbench (GPL-3.0) rendeu IDEIAS, nunca código: cubo como peça-base, box-UV
automático, pintar direto no modelo, espelho de modelagem, modos que trocam a caixa de ferramentas,
export glTF com `NearestFilter`, projeto JSON com migração lazy.

## Estado (04/09/2026) — os 8 lotes do plano prontos: L1 (pacote + galeria + rota kids), L2 (Montar), L3 (Pintar + GLB), L4 (Céu + HDR), L5 (Textura + Vestir), L6 (nuvem), L7 (Estúdio) e L8 (modelos prontos + backup ZIP)

**Estúdio (L7):** o "🧊 Trazer do Molda" do painel de Imagens do Estúdio Completo lê este
pacote pelo subpath `./studio-library` (`listGalleryForStudio` + `exportAssetForStudio`, os
três tipos), e o kit iniciante Jogo 3D ganhou os blocos "Criar o objeto … com o modelo"
(`.glb`) e "Usar o céu 360°" (`.hdr`). Nada mudou aqui; o que o Estúdio espera do export está
em `packages/studio/CLAUDE.md` (seção "Trazer do Molda"). ⚠️ O GLB sai com `y = 0` no chão e
centrado; o kit re-centra o modelo na caixa dele (o centro do bbox cai na origem do objeto) e
escala pelo lado MAIOR = "tamanho" do bloco.

**Nuvem ("Guardado na sua conta", L6):** o pacote NÃO fala com servidor nenhum. O host kids
embrulha a `MoldaPersistence` (`community-kids/src/lib/molda-cloud-persistence.ts`, molde do
wrapper do Pinta) e passa o espelho em `<MoldaApp persistence>`; o members ganhou a tool
`molda` (migration `0072`, enum `creation_tool` + `'molda'` no FIM). O que o pacote oferece
para isso: `load(id)` na persistência (o produtor da fila relê o disco na hora de subir),
`subscribe` com `sync-start`/`changed`/`sync-end` (a galeria mostra "buscando…" e relê),
`isMoldaAssetOpen`/`subscribeMoldaAssetOpenState` (a descida não grava por baixo de uma
criação aberta; ⚠️ o aviso NÃO leva o id: quem confere é o wrapper) e `assetToJson`/
`assetFromJson` (o blob que viaja, peles em base64). A miniatura do modelo (`thumb` no asset,
≤ 12 000 chars) vai na reserva; textura e céu sobem sem miniatura.

O que existe: `core/` (modelo de dados, limites, sanitize, paleta, histórico, copy, busca),
`model/` (a parte PURA do motor: formas, peles, gêmeos, base das faces, geometria, matriz,
operações, atlas + raster, picking de texel, malha fundida), `paint/` (pincel, balde, gesto),
`sky/` (presets + ranges, ruído, render na CPU), `texture/` (a folha: pintura com volta pela
borda, balde, cores extras, e o "Vestir a peça"), `state/` (persistência IndexedDB por
namespace, em memória, galleryStore, editorStore, sessionStore), `viewport/` (o palco three.js
com o atlas, a prévia PMREM do céu, a prévia caixa + bola da textura), `export/` (JSON, PNG, GLB
e RGBE PRÓPRIOS, `modelGlb`, `skyHdr`, `texturePng`, `studioLibrary` com lista + export dos
três tipos, `zip` + `backupFile` do "Baixar tudo"/"Trazer de volta"), `templates/` (os modelos
prontos), `assets/` (face pura), `components/` (MoldaApp, galeria completa com o `TemplatePicker`,
casca do editor, a bancada do modelo com MONTAR e PINTAR + "Vestir com textura" + "Baixar .glb";
o céu com presets/sol/cores/nuvens/estrelas/exposição + "Baixar .hdr"; a textura com a folha de
pixels, prévia 3×3, prévia 3D + "Baixar .png").

O que fica FORA (deliberado, decisão da dona em 04/09; ver `docs/plans/2026-09-04-molda-design.md`):
animação, UV manual, importar `.glb`/`.bbmodel`, PBR (normal/rough/metal), física, bloco de aula e
rota no adulto. Entraram DEPOIS, em 06/09: a MALHA com vértices, arestas e faces (seção "Malha"
no fim deste arquivo) e a mão dupla com o Estúdio (`resyncToStudio`).
O que ainda PENDE fora do pacote: o QA no kids `:3008` com dois perfis e o QA da nuvem em staging.

## Modelos prontos + "Baixar tudo" em ZIP (L8)

- **Modelos prontos** (`src/templates/`): o catálogo `MOLDA_TEMPLATES` (personagem, carro, cristais,
  árvore, casa, nave), no molde do Pinta: cada template tem `suggestedName` e um `build()` que
  devolve o modelo JÁ montado com ids frescos (`builders.ts buildTemplateModel`: peças autoradas
  na grade via `createPart`; a pele de uma face vem em arte ASCII pelo `art.ts` e TEM de vir no
  tamanho de `faceSkinSize`, senão lança). Só modelos na v1: textura e céu já nascem prontos pelos
  presets do próprio "Criar novo". Entram pelo 4º cartão do passo do tipo ("✨ Modelos prontos",
  `a11y.openTemplates`) → `TemplatePicker` (grade com a miniatura isométrica de cada um) → nome
  sugerido já livre (`uniqueAssetName`) → `galleryStore.createFromTemplate({templateId, name})`.
  ⚠️ `catalog.test.ts` exige que `sanitizeMoldaAsset(structuredClone(build()))` seja IGUAL ao
  build (grade, snap, giro múltiplo de 15, pele no tamanho certo) e que o `.glb` caiba no Estúdio:
  um template torto reprova antes de chegar à criança. Vitrines deliberadas: o personagem tem o
  rosto pintado na face `pz` da cabeça (Pintar); o carro e a nave usam peças GIRADAS (rodas e
  motores são cilindros deitados: a caixa é autorada ANTES do giro, com o pivô no centro); a casa
  tem duas rampas (uma girada 180°) formando o telhado de duas águas.
- **Miniatura isométrica PURA** (`src/model/isoThumb.ts`, `projectModelThumb`): projeta os
  triângulos de `buildPartGeometry` × `partMatrix` numa câmera ortográfica na diagonal do palco
  (16, 12, 20), corta as faces de costas, ordena do fundo para a frente e sombreia pela normal (5
  níveis, cache por cor) → polígonos para um `<svg>`. É a miniatura do `TemplatePicker` e a
  RESERVA do `ModelThumb` quando o asset não tem `thumb` (modelo que desceu da nuvem e nunca abriu
  aqui); acima de `ISO_THUMB_MAX_TRIANGLES` (6 000) cai no emoji. Cor = a cor base da peça (a pele
  pintada não aparece).
- **"Baixar tudo" virou ZIP** (`src/export/zip.ts`, `zipGallery`): `modelos/<nome>.glb`,
  `texturas/<nome>.png`, `ceus/<nome>.hdr` (os arquivos PRONTOS, os mesmos do "Baixar" de cada
  editor), `galeria.molda.json` (o backup completo; `MOLDA_GALLERY_ZIP_ENTRY` em `backupFormat.ts`)
  e `LEIA-ME.txt` (texto em `COPY.gallery.readme`). Criação que o Estúdio não aceita (modelo sem
  peça, atlas cheio, acima do teto) fica FORA dos arquivos prontos mas DENTRO do backup. O céu
  custa ~0,5 s cada (render 1024×512): a galeria mostra "Preparando..." e a montagem cede a
  thread entre criações (`yieldBetween`). fflate sob demanda.
- **"Trazer de volta" é um botão inteligente** (`src/export/backupFile.ts`, `readMoldaBackupFile`,
  molde do leitor do Pinta): aceita o `.zip` OU o `.molda.json` solto; no ZIP lê por FAIXAS
  (diretório central, cabeçalho e só os bytes de `galeria.molda.json`, inflate em stream) e nunca
  carrega os `.glb`/`.hdr`; recusa criptografia, ZIP64, entrada duplicada e JSON acima de
  `MAX_BACKUP_FILE_BYTES` (2 × `maxGalleryBytes`, para cobrir o base64 do JSON). O leitor aceita
  toda a contagem do ZIP clássico e limita o diretório central; o `accept` inclui `.zip`.
- Testes: `templates/catalog.test.ts`, `model/isoThumb.test.ts`, `export/zip.test.ts`,
  `export/backupFile.test.ts` e os dois casos novos de `MoldaApp.test.tsx` (modelo pronto →
  editor; ZIP e JSON de volta). QA no playground (Chrome real): a grade dos 5 modelos, o carro
  criado do template no palco (10 peças, 320 triângulos, rodas em pé), o `.zip` do "Baixar tudo"
  e o "Trazer de volta" desse mesmo `.zip`.

## Textura + Vestir a peça (L5)

- **Folha** (`texture/ops.ts`, puro): `paintTexture` (carimbo 1/2/3; com `wrap` as coordenadas
  dão a volta pelo módulo), `lineTexelsWrap` (Bresenham que, com `wrap`, pega o caminho MAIS
  CURTO pela borda: de x = 15 para x = 0 anda UM texel, não a folha inteira; devolve coordenadas
  desdobradas e quem pinta aplica o módulo), `floodFillTexture` (4-conectado; com `wrap` os
  vizinhos atravessam a borda), `addTextureColor`/`removeTextureColor` (mesma regra do modelo:
  texel da cor apagada → 0, extras seguintes descem 1). Índice 0 = TRANSPARENTE (regra do Pinta).
- **Palco de pixels** (`components/editor/texture/PixelStage.tsx`): canvas `size × size`
  ampliado por CSS (`image-rendering: pixelated`), `role="img"`. `texelOf` aplica o deslocamento
  de VISTA (módulo) e, com "Sem emenda" DESLIGADO, prende o ponteiro à borda (fora da folha vale
  a borda); LIGADO, o ponteiro além da borda reaparece do outro lado (é assim que o traço
  atravessa quando a criança arrasta para fora). ⚠️ Sem layout (testes) a folha mede 1 px por
  texel (`rect.width || size`): `clientX` = texel.
- **Editor** (`TextureEditor.tsx`): Lápis/Borracha/Balde/Conta-gotas (P/E/G/I), tamanhos 1/2/3,
  **S = "Sem emenda"** (mora no ASSET: commit + undo), **D = "Deslocar meio"** (só VISTA, na
  sessão, fora do undo). Traço = gesto (`replace` ao vivo, UM `commitGesture` no soltar; balde e
  conta-gotas são um toque). Prévia 3×3 (canvas) e **prévia 3D** (`viewport/TexturePreview.ts`:
  caixa + bola com `MeshStandardMaterial` OPACO e `DataTexture` sRGB NEAREST `flipY true`; o
  transparente aparece PRETO de propósito, é o que o jogo mostra; fábrica injetável
  `setMoldaTexturePreviewFactory`, fake em `testing/fakeTexturePreview.ts`; sem WebGL, recado).
  "Baixar .png" = `export/texturePng.ts` (índice 0 → alfa 0; recusa acima de
  `studioMaxImageChars`). `studio-library` exporta a textura como `image` (`<nome>.png`, com
  `width`/`height`).
- **Vestir a peça** (`applyTextureToPart` + `buildColorRemap` em `texture/ops.ts`,
  `components/editor/model/ApplyTextureDialog.tsx`): no PINTAR do modelo, com uma peça
  selecionada (sem seleção, toast), "Vestir com textura" lista as texturas da galeria e veste
  TODAS as faces da peça FONTE (bake texel a texel na pele de cada face, no tamanho que a face
  tem; 0 preserva a cor base; `syncTwins` no fim). Modos **Repetir** (`x % size`) e **Esticar**
  (nearest). Paleta: mesma cor reaproveita o índice, cor nova vira extra do modelo (até 48), sem
  vaga pega a mais parecida (distância RGB). É CÓPIA: apagar a textura depois não mexe no
  modelo. UM commit (um undo desfaz a roupa inteira).

## Céu + HDR (L4)

- **Render na CPU** (`sky/render.ts`, puro, determinístico): imagem equiretangular em float
  LINEAR (RGB), linha 0 = zênite, a convenção `equirectUv` do three. A MESMA função para a
  prévia (256×128) e o export (1024×512, ~50 ms no bun). Por pixel: gradiente topo/horizonte/
  chão em linear × fator de dia (`smoothstep(-12°, 12°)` na altura do sol) → disco solar +
  halo + névoa (`sunIntensity` até 100 = HDR de verdade, é o que faz o PMREM dar reflexo) →
  nuvens por fbm de value noise (`sky/noise.ts`, hash inteiro com `Math.imul`, zero
  `Math.random`) projetado no domo → estrelas em células FIXAS (`STAR_CELLS` 256×128: as
  mesmas estrelas em qualquer resolução) → × exposição.
- **RGBE próprio** (`export/rgbe.ts`): `#?RADIANCE` nos 10 primeiros bytes (a assinatura que o
  Estúdio confere), `-Y h +X w`, float → rgbe com expoente compartilhado, scanlines novas
  `[2,2,hi,lo]` + RLE adaptativa por canal (o algoritmo do Radiance; larguras fora de [8,
  32767] saem planas). Testado contra um decodificador INDEPENDENTE (`testing/rgbeDecode.ts`)
  e contra o `HDRLoader` do three com `FloatType` (JS puro, roda no bun). ⚠️ O HDRLoader
  entrega os dados na ordem do ARQUIVO (linha 0 em cima) e marca `flipY = true`: quem vira é
  o upload. `exportSkyHdr` (`export/skyHdr.ts`) recusa acima do teto do Estúdio; o nublado com
  estrelas em 1024×512 dá ~1,3 M chars (medido).
- **Prévia** (`viewport/SkyPreview.ts`): `DataTexture` HALF FLOAT (`DataUtils.toHalfFloat`;
  float32 com filtro linear falta em celular), `LinearSRGBColorSpace`,
  `EquirectangularReflectionMapping`, `flipY = true` → `PMREMGenerator.fromEquirectangular` em
  `scene.environment` + a própria textura em `background`; cena de amostra = chão, casinha
  (caixa + telhado cone de 4 lados + chaminé) e bola metálica (o reflexo mostra o HDR). Sem
  tone mapping (é o que o runtime do Estúdio mostra). Sem WebGL → miniatura CSS + recado.
- **Editor** (`components/editor/sky/SkyEditor.tsx`): presets, sol (altura, direção, tamanho,
  brilho), cores (inputs de cor NATIVOS), nuvens (quantidade, suavidade, "Sortear nuvens" =
  LCG na semente), estrelas, exposição. Cada slider é um GESTO (`useSkyGesture`: `begin` no
  pointerdown/keydown, `replace` no change, `commitGesture` no pointerup/keyup/blur) = UM passo
  de desfazer por arrasto; mexer põe `preset = 'custom'` ("Do seu jeito"). A prévia re-renderiza
  40 ms depois da última mudança. "Baixar .hdr" roda num `setTimeout` com o "Preparando o
  céu...". `studio-library` exporta o céu como `environment3d` (`.hdr`).

## Pintar + atlas + GLB (L3)

- **Atlas** (`model/atlas.ts`): uma região por face PINTADA das peças fonte + um swatch 4×4 por
  cor da paleta; face sem pele aponta para o CENTRO do swatch da cor base (UV degenerada = face
  lisa). Prateleiras determinísticas (altura, largura, chave), 1 texel de folga por região,
  64 → 128 → 256 → 512, senão `atlas-full` (o palco avisa uma vez; as faces novas ficam lisas).
  A `atlasKey` (lista de faces pintadas + tamanhos + nº de cores) decide o reempacotamento; uma
  pincelada numa pele existente NÃO reempacota. O gêmeo não tem região: usa a região da face
  espelhada da fonte com `u` invertido (`MIRRORED_FACE` + `1 - u`).
- **Raster** (`model/atlasRaster.ts`): sRGB RGBA8; texel 0 = cor base da peça; a folga é a
  borda DILATADA (defesa contra filtro linear no runtime).
- **Picking** (`model/pick.ts`): ponto do `Raycaster` → `worldToBox` (transposta da matriz) →
  `faceUvAt` (base plana; lado do cilindro e bola por ângulo) → texel. ⚠️ `hit.uv` do three NÃO
  serve (face lisa tem UV degenerada). `pickTexelAtPoint` (puro) acha peça/face por um ponto no
  espaço: é o espelho de pintura (x → -x) e o que os testes usam. Toque num gêmeo resolve para a
  fonte (face espelhada + coluna invertida).
- **Gesto** (`paint/stroke.ts`, puro): carimbo 1/2/3, Bresenham entre toques na mesma face, balde
  na face (4-conectado), balde na peça (`updatePart` color), conta-gotas (0 = cor base),
  `finishStroke` apaga peles todas-0. O palco pinta um modelo de TRABALHO durante o gesto (sem
  React no meio) e entrega o resultado no soltar: `onPaintStart`/`onPaintEnd` → UM
  `commitGesture`. O `pointerdown` de pintura é registrado em CAPTURA (roda antes do
  OrbitControls) e chama `stopImmediatePropagation` quando acerta uma peça.
- **Palco**: `AtlasTexture` = `DataTexture` sRGB, `flipY false`, NEAREST, sem mipmap, upload
  PARCIAL por linha suja (`addUpdateRange` em TEXELS). O `geometryHash` inclui o
  `layoutVersion`: reempacotar reconstrói as UVs de todas as peças (barato). Trocar a paleta
  re-rasteriza a folha inteira.
- **Export** (`export/png.ts`, `export/glb.ts`, `export/modelGlb.ts`): PNG RGBA filtro None +
  zlib (fflate) com CRC32 próprio; GLB: 1 malha (geometria MUNDIAL fundida, gêmeos incluídos,
  transladada para o chão e centrada), 1 material `baseColorTexture` com fator branco (o
  runtime tinge), sampler NEAREST + CLAMP, `min/max` no POSITION, chunks padded a 4. Recusa com
  `empty` | `atlas-full` | `too-big` (teto `studioMax3DChars`). Testado contra decodificadores
  INDEPENDENTES (`testing/pngDecode.ts`, `testing/glbRead.ts`) e o `sharp`; pior caso medido
  (128 bolas texels 8) cabe no teto. `studio-library` já exporta o modelo (`model3d`).
- **Cores extras**: `removeExtraColor` remapeia toda pele e cor de peça (texel da cor apagada →
  0; extras seguintes descem 1). `setTexelsPerUnit` re-amostra toda pele.
- **Atalhos do Pintar**: P lápis, E borracha, G balde na face, I conta-gotas, 1/2/3 tamanho,
  M espelho de pintura.

## Bancada Montar (L2): motor puro + palco three.js

- **Geometria pura** (`model/geometry.ts`, sem three): triângulos NÃO indexados, normal PLANA
  por triângulo, winding CCW visto de fora (testado com o `Raycaster` do three em `FrontSide`:
  raio de fora acerta, de dentro não), UV LOCAL por face (u, v em [0, 1], origem no canto
  superior esquerdo; o atlas do L3 remapeia). Contagem: caixa 12, rampa 8, cilindro 64 (16
  segmentos), bola 120 (12 × 6; nos polos só um triângulo por quadrilátero, senão nasce
  triângulo degenerado — foi um bug real).
- **Base (s, t) por face** (`model/frame.ts`): canto-origem, `s` = direita, `t` = para baixo
  olhando de fora; invariante testado em toda face plana: `cross(s, t) == -normal`. Faces curvas
  (lado do cilindro, bola) são paramétricas dentro do `geometry.ts`.
- **Matriz da peça** (`model/transform.ts`): `R = Rx · Ry · Rz` em graus = o Euler 'XYZ' do
  three (testado contra `Matrix4.makeRotationFromEuler`); gira em torno do pivô
  (`origin ?? centro`). O gêmeo `[rx, -ry, -rz]` é o espelho geométrico exato (testado pelos
  cantos).
- **Operações** (`model/partOps.ts`): puras, devolvem asset novo e terminam em `syncTwins`.
  `addPart` encosta na peça selecionada (direita, esquerda, frente, trás, em cima) ou cai no
  chão em espiral; `duplicatePart` copia peles; `setPartBox` normaliza ao encaixe/grade e
  RE-AMOSTRA as peles quando o tamanho muda; `setMirrorX(on)` cria gêmeos das peças que não
  cruzam x = 0 e `off` assa; um gêmeo nunca é editado direto (`resolveSourceId`).
- **Palco** (`viewport/MoldaViewport.ts`, classe sem React): UM `MeshStandardMaterial`
  (`vertexColors`) e um `Mesh` por peça, render sob demanda (rAF coalescido, laço só enquanto
  o amortecimento da órbita assenta), `setModel` incremental (hash de forma/tamanho/cor
  decide rebuild; transformação sempre reaplicada). `OrbitControls` (um dedo orbita, dois
  pan/zoom) + `TransformControls` (`scene.add(gizmo.getHelper())`, giro em passos de 15°).
  ⚠️ Mover arredonda o DELTA ao encaixe (não a posição: o pivô de lado ímpar cai no meio da
  célula); ao vivo o editor recebe `replace`, no soltar UM `commitGesture`. ⚠️ Tamanho não é
  aplicado ao vivo (o mesh fica escalado; a caixa nova nasce no soltar). Ajudas (grade, contorno,
  alças) só somem na FOTO da miniatura (nada de `layers`: o raycaster interno do gizmo só vê a
  layer 0). Miniatura = `WebGLRenderTarget` 96² (`colorSpace: SRGBColorSpace` para ler sRGB) →
  canvas 2D → JPEG ≤ 12 000 chars, refeita 700 ms depois de cada mudança nas peças
  (`editorStore.setThumb`, sem histórico).
- **Sem WebGL** o `WebGLRenderer` lança → `useViewport` devolve `unsupported` e a tela mostra
  o recado. Testes de componente usam o palco FALSO (`testing/fakeViewport.ts` via
  `setMoldaViewportFactory`); o playground embrulha o real e expõe `window.__molda.viewport`.
- **Atalhos do Montar**: V mover, R girar, T tamanho, G grudar, B caixa, M espelho, Delete apagar,
  Ctrl+D duplicar (Ctrl+Z/Y na casca). Ignorados em campo de texto e com modal aberto.

## API pública (`src/index.ts` — TUDO fora dela é interno)

- **`setMoldaStorageNamespace(viewerId)`** — o host chama ANTES de montar (isola a galeria por
  PERFIL no IndexedDB: `sistema-zero-molda-<ns>`, store `assets`, chave `molda:asset:<id>`).
- **`<MoldaApp adapter={MoldaHostAdapter} persistence?={MoldaPersistence} />`** — uncontrolled,
  navegação por ESTADO (galeria ⇄ editor). `persistence` ausente = a instância PADRÃO do
  namespace (`getDefaultMoldaPersistence`, UMA por namespace: galeria, editor e `studio-library`
  enxergam o mesmo inventário de bytes).
- **`MoldaHostAdapter`**: `theme?` ('light' default | 'dark' → `data-molda-theme` no root),
  `studioOwned?` + `onOpenStudio?` (atalho "Abrir o Estúdio" + dica do "Trazer do Molda"; SÓ
  fluxo PULL, não há "Usar no Estúdio"), `initialAssetId?` (deep link `?criacao=`), `onChange?`,
  ⭐ `resyncToStudio?(asset: MoldaExportedAsset)` (06/09: a VOLTA da ponte, porte do Pinta; o
  `useStudioResync` do `EditorScreen` chama só depois de SALVAR, debounced 1,5 s, envios em ORDEM,
  na hora ao esconder a aba/desmontar, NUNCA ao abrir; o host decide pela guarda dele o que regravar).
- Subpaths: **`./assets`** (dado puro, zero React/zustand/three/IndexedDB — o `purity.test.ts`
  anda o grafo e reprova) e **`./studio-library`** (zero React; `listGalleryForStudio()`; o
  `exportAssetForStudio(id)` chega com os codificadores; `exportLoadedAssetForStudio(asset)` é a
  variante pura a partir da criação já carregada, mesmo cache por id + `updatedAt`). `./styles.css`
  = `src/styles/molda.css`.

## Modelo de dados (`src/core/model.ts`) e o portão único (`src/core/sanitize.ts`)

- Três criações numa união por `kind`: **`model`** (`parts: MoldaPart[]`, `texelsPerUnit` 2|4|8,
  `snap` 1|0.5, `mirrorX`), **`texture`** (`size` 16|32|64, `bitmap`), **`sky`** (`params`).
- `MoldaPart`: `shape` box|wedge|cylinder|sphere|mesh, `from/to` (posição em múltiplos de 1/16;
  formas primitivas com lado em múltiplos de 0,5; `from < to`, lado ≤ 32, grade x,z ∈ [-16,16],
  y ∈ [0,32], chão = y 0), `origin?` (também em 1/16), `rotation` (múltiplos de 15),
  `color` (índice ≥ 1), `faces` (pele opcional por face: `MoldaSkin { width, height, data:
  Uint8Array }`), `mirrorOf?` (gêmeo DERIVADO da fonte; `syncTwins` no fim de todo sanitize).
- **Índice 0**: na TEXTURA = transparente (regra do Pinta); na PELE de uma face = "usa a cor base
  da peça". Paletas SEMPRE 16 (`arcade`/`pastel`/`cinzas`, cópia das do Pinta) + até 48 extras;
  paleta custom preserva slots vazios `''` (compactar deslocaria os índices).
- **Tamanho da pele de uma face** = `clamp(round(unidades × texelsPerUnit), 4, 32)` por eixo
  (`model/shapes.ts` `faceSkinSize`): o sanitize RE-AMOSTRA (nearest) o que divergir; pele toda
  0 some; índice fora da paleta vira 0. Peça inválida cai SEM derrubar o modelo.
- `MOLDA_LIMITS` (`core/limits.ts`) é a fonte única criação ↔ sanitize ↔ export; espelha os tetos
  do Studio (`studioMax3DChars 7_000_000`, `studioMaxImageChars 800_000`) com comentário recíproco.
- `sanitizeMoldaAsset(raw)` NUNCA lança (`null` = não é criação); aceita `data` de pele como
  `Uint8Array`, array simples ou base64 (o JSON do backup/nuvem). ⚠️ Toda migração de formato mora
  no sanitize (lazy, no load), nunca em massa. Guarda: round-trip por kind com `structuredClone`
  (nunca JSON no teste: o `Uint8Array` viraria objeto).
- Nome kebab ≤ 48 via `normalizeAssetName` (`core/names.ts`): ⚠️ manter em sincronia com o do
  Pinta e do Studio (é o nome que os blocos referenciam). Ids `crypto.randomUUID` (nunca `:`).

## Estado e persistência (`src/state/`)

- `createMoldaPersistence({namespace?, maxBytes?})`: `loadAll` + `load(id)` (uma criação pelo
  sanitize; a nuvem do host relê o disco na hora de subir), escritas em FILA por banco, `saveMany`
  atômico, orçamento em bytes por INVENTÁRIO em memória (`assetBytes`; estourar lança
  `MoldaStorageBudgetError` ANTES de tocar o banco), `BroadcastChannel('molda:assets:<db>')`
  para as outras abas (o próprio eco é ignorado pelo `senderId`), registro de criações ABERTAS
  (`markMoldaAssetOpen/Closed`, `isMoldaAssetOpen`, `subscribeMoldaAssetOpenState`).
- `galleryStore` (zustand vanilla, POR instância): mutações serializadas, nome único `-2..-999`,
  `importAssets` com ids novos (gêmeos remapeados) e tudo-ou-nada, `attachPersistence` relê em
  `changed` (debounce 250 ms) e no `sync-end`; a releitura NÃO regride uma criação aberta mais
  nova em memória.
- `editorStore`: histórico por snapshots com orçamento em bytes (`core/history.ts`), `commit`
  (undo + carimba `updatedAt` + autosave 600 ms com laço de drenagem), `replace` (sem histórico,
  arrasto ao vivo) + `commitGesture`, `undo/redo` (também salvam), `flush()` na saída. ⚠️
  `dispose()` só cancela o timer — não trava o store (StrictMode remonta com o MESMO store).

## Componentes (`src/components/`)

- UI copiada por valor do Pinta: `Button/IconButton/ToolButton` (≥ 44 px), `Dialog` (inline, pilha
  modal, `data-molda-dialog`, `isMoldaDialogOpen()` para os atalhos, `returnFocusTo`), `Panel`,
  `Toast` (um por vez, `aria-live`). Tokens `mld-*` no `styles/molda.css` (tema por
  `[data-molda-theme]` no ROOT, nunca no `<html>` do host; tokens só-CSS FORA do `@theme`, que o
  Tailwind poda; `color-mix in oklab`, nunca `in oklch`).
- Galeria: busca (nome + tipo) + chips de tipo, cards memoizados com a cor do tipo na borda
  (`--mld-panel-border`), miniaturas: modelo = `thumb` guardado no asset (precisa de WebGL) ou
  emoji; textura = canvas 2D (sem canvas, emoji); céu = gradiente CSS dos parâmetros. "Criar
  novo" em 3 passos (tipo → opções → nome), renomear (bloqueado com a criação ABERTA), duplicar,
  apagar (confirmação), "Baixar tudo" (`galeria.molda.json`, writer do envelope `molda-gallery`
  v2; reader aceita v1 e v2) e "Trazer de volta" (`importMoldaJson` nunca lança; aceita criação
  solta).
- Copy 100 % em `core/copy.ts`: pt-BR, SEM travessão, sem "etapa"/"curso-base" (os testes do
  kids varrem o `src/` dele; o Molda é `@source`, então as CLASSES entram, as strings não, mas a
  régua vale igual).

## Testes

`bun test src` (happy-dom via `test-setup.ts`; `testing/idbMock.ts` substitui o `idb-keyval`
por um Map com `structuredClone` — importar ANTES do módulo em teste). `host-conformance.test.ts`
lê por texto o que precisa existir FORA do pacote (railway.json, ci.yml, package.json/next.config/
globals.css do kids, rota/proxy/nav, member-shell, seed do catálogo). Playground Vite `:5198`
(`bun run dev`, `.claude/launch.json` → `molda-playground`).

## Comandos

`bun run typecheck && bun test src && bun run check` (biome). Consumidores: `bun run
typecheck:kids` + `bun run test:kids` na raiz.

## Lote 06/09/2026: cores sem inundar, galeria como seção, volta ao Estúdio

- **"+ Nova cor" é um GESTO** (relato dela: "um monte de cor repetida"). Causa: o `<input
  type="color">` escondido do `ColorsPanel` dispara `input` a cada passo do arrasto no seletor do
  sistema (o React entrega como `onChange`), e cada passo fazia `addExtraColor` + `commit`: uma
  extra e um desfazer por pixel arrastado, até o teto de 48. Regra da casa mantida: seletor
  NATIVO (painel custom foi rejeitado). Fix: `ColorsPanel` expõe `onAddColor(hex)` (cada passo)
  + `onAddColorEnd()` (o `change` NATIVO, ouvido no elemento com `queueMicrotask` porque ele roda
  ANTES do handler do React na raiz; `blur` como rede, e o "+" faz `focus()` + `click()` para o
  blur ser real). `ModelEditor`/`TextureEditor` guardam `colorGesture = { before, index, full }`
  PRÓPRIO (o `gestureBefore` do palco não serve: um `pointerdown` no canvas chega antes do blur):
  1º passo cria a extra (`addExtraColor` + `replace`), os seguintes só `updateExtraColor` /
  `updateTextureColor` (troca NO LUGAR; mesma referência se o hex já existe em qualquer índice,
  senão o sanitize deduplicaria e deslocaria índices), fim = UM `commitGesture`. Cor que já
  existia não vira alvo do gesto (não se troca a extra de outra peça por tabela); teto no meio do
  gesto = um toast e os passos seguintes ignorados; Esc (sem `change`) deixa a extra e o commit
  sai no blur. QA real no Chrome (06/09): 3 passos → 16 swatches (era 15) e um desfazer volta a 15.
  Testes: `partOps.test.ts`/`ops.test.ts` (`update*Color`), `ModelEditor.test.tsx` e
  `TextureEditor.test.tsx` ("N passos viram UMA extra e UM desfazer").
- **Galeria = cabeçalho de SEÇÃO** (a "faixa branca" que destoava do Pinta/Estúdio): o `<header>`
  perdeu fundo/borda e virou `mb-5 flex flex-wrap items-end justify-between gap-3` com `h1
  text-3xl md:text-4xl`, DENTRO da raiz rolável `flex min-h-0 flex-1 flex-col overflow-y-auto p-4
  sm:p-6` (a mesma do Pinta); o `<main>` próprio saiu (o host tem o dele). O **hover cortado** era
  o `.mld-pop` (translate -2px + scale 1.02) crescendo acima da borda de um `overflow-y-auto` sem
  padding no topo: agora o `p-4` da raiz é a folga. `AssetCard` = `mld-panel mld-pop flex flex-col
  gap-1 p-2` com miniatura `rounded-lg` (o molde do Pinta); grade `minmax(164px,1fr)`.
  `Panel.tsx` ganhou `shrink-0` e as colunas direitas dos 3 editores `.mld-scroll-y` (gêmeo do
  `.pin-scroll-y`). Teste estrutural em `MoldaApp.test.tsx` (header sem `bg-mld-surface`, dentro
  da raiz rolável, sem `<main>`).
- **Volta ao Estúdio**: `MoldaHostAdapter.resyncToStudio` + `useStudioResync` (ver a seção da
  API pública) + `exportLoadedAssetForStudio`; o lado do Estúdio está em
  `packages/studio/CLAUDE.md` §"✏️ Editar de verdade".

## Malha: vértices, arestas e faces (M1 a M5, 06/09/2026)

Estudo do Blockbench (GPL: só IDEIAS): malha = `vertices` e `faces` em MAPAS por chave (nunca
índices), normais calculadas, quads e tris, seleção FORA do elemento com os vértices como lista
mestra, picking em pixels com viés de profundidade, alça no centro da seleção, "consertar DEPOIS
e perguntar" em vez de impedir, e o "Ajustar" depois da ação no lugar de modal. Plano do lote:
`docs/plans/2026-09-06-molda-malha-lote.md` (F1..F7 + M1..M5 + extras).

- **Dado** (`core/model.ts`): `shape: 'mesh'` numa PEÇA comum com `mesh: { vertices: Record<v_…,
  Vec3>, faces: Record<f_…, { v: string[] }> }` (3 ou 4 chaves por face, CCW visto de fora);
  `from`/`to` são DERIVADOS da caixa dos vértices (`meshBox`), então `partMatrix`, `partBounds`,
  gêmeos, painéis, histórico e o JSON valem sem mexer; asset antigo não muda um byte. A pele de
  uma face de malha mora em `part.faces['f_…']` como a de um cubo. Limites em `MOLDA_LIMITS`:
  `maxMeshVertices 1_024`, `maxMeshFaces 1_024` e o orçamento por TRIÂNGULOS `maxTriangles
  20_000` (quad = 2 tris; caixa 12, rampa 8, cilindro 64, bola 120). O status mostra
  `T/20000 triângulos` quando passa da metade.
- **Núcleo puro** (`model/mesh.ts`, `model/meshFrame.ts`, `model/vec.ts`): `boxMesh` (8 vértices
  `v_xyz` em bits, 6 quads `f_px..f_nz` com frames IDÊNTICOS aos da caixa: a pele migra sem
  re-amostrar), `meshBox`, `normalizeMesh` (idempotente; `orderQuad`), `faceNormal` (Newell),
  `meshEdges`, `meshTriangleCount`, `meshIssues` (quad côncavo/não plano, vértices sobrepostos,
  face virada), `mirrorMesh` (x → -x + cada ciclo INVERTIDO, `reverse()`: o gêmeo mostra a pele da
  fonte com `1 - u`, o mesmo `flipSkinH`/`width-1-x` das caixas). `meshFaceFrame` devolve um
  `FaceFrame` plano (`s` = do primeiro ao ÚLTIMO ponto do ciclo, normal de Newell, `t = cross(s, normal)`, invariante
  `cross(s, t) == -normal`): para atlas, pele, pintura e picking a face de malha É uma "face de
  cubo" (`faceSkinSize` = `skinDim(su) × skinDim(tv)`; tri = a rampa: pele retangular, só o
  polígono conta). `partFaces(part)` substitui `FACES_BY_SHAPE[shape]` em sanitize, pick e ops.
- **Sanitize** (`core/sanitize.ts` `sanitizeMesh` + `fitMeshToGrid`): chaves `v_`/`f_`, ciclos
  de 3..4 chaves existentes, vértices arredondados à precisão de 1/16 (`meshPrecision`, não ao encaixe) e presos à grade, teto de
  triângulos (a peça que estoura cai SEM derrubar o modelo), caixa gravada ignorada (derivada).
- **Editar malha no palco** (`state/sessionStore.ts`, `model/meshSelection.ts`, `model/meshOps.ts`,
  `viewport/meshEditOverlay.ts`): sub-modo do Montar (botão "Editar malha" / "Transformar em
  malha", atalho E; a 5ª forma "Malha" coloca uma caixa já convertida). A seleção mora na SESSÃO
  (`meshEditId`, `meshSelectMode` Pontos/Arestas/Faces = 1/2/3 e `meshSelection` com os elementos
  EXATOS; os vértices afetados só são derivados para mover), "Somar à seleção" = o Shift para o
  toque. Trocar de modo limpa uma seleção de outro tipo. Overlay = `Points` + `LineSegments`
  FILHOS do mesh da peça (sem depth test), picking com
  tolerância em PIXELS convertida ao mundo na distância do candidato (8 px mouse, 14 px toque),
  somente o tipo do modo ativo e nada ATRÁS da superfície tocada. A alça é uma âncora (`meshAnchor`) no
  centro da seleção, só de mover: o arrasto é um gesto sobre a BASE (delta total encaixado, `replace`
  ao vivo, UM `commitGesture`); Delete apaga a seleção (`deleteMeshSelection`: faces que perdem
  vértice caem; malha vazia = a peça sai com toast); Esc = Pronto. As setas movem os pontos escolhidos.
- **Ferramentas** (`model/meshTools.ts`, puras, `null` = não dá): **Puxar** (`extrudeFaces`: a
  região sobe pela normal média, paredes SÓ nas arestas de borda, a pele da tampa migra;
  `extrudeEdges`: cada aresta vira uma aba), **Cortar no meio** (`loopCut`: o anel atravessa os
  quads; vértice do meio memoizado por aresta; pele reprojetada nas duas metades; corte que cai
  fora do encaixe liga o meio bloco no MESMO commit + toast), **Juntar pontos** (`mergeVertices`,
  derruba faces degeneradas em tris), **Fechar face** (`createFace`, virada para fora; três/quatro
  pontos sem área são recusados antes do commit), **Conectar
  pontos** (`connectVertices`: dois cantos opostos dividem um quad pela diagonal escolhida, sem
  aresta solta), **Encolher dentro** (`insetFace`: uma face reta e convexa vira miolo + anel, 25%
  ajustável de 10% a 80%), **Virar face** (`flipFaces`, espelha a pele), **Dividir em triângulos**
  (`splitQuads`, pele reprojetada). A caixa é CONTEXTUAL: Pontos, Arestas ou Faces mostram só as
  ações daquele modo; `meshCommands.ts` concentra id, requisito, disponibilidade, ação e dica.
  `skinReproject.ts`: `reprojectSkin` (texel a texel pelo ponto do MUNDO) e `rotateSkin90`.
  **Consertar DEPOIS e perguntar**: `meshIssues` depois de cada ferramenta/arrasto; um problema
  NOVO vira `showToast(msg, actions)` com Juntar/Dividir/Virar + Desfazer + Deixar (`Toast` ganhou
  `actions`; `applyMeshFix`). **Ajustar**: depois de Puxar ou Encolher dentro, o painel reexecuta a
  ferramenta sobre o "antes" com outra distância/porcentagem via `editorStore.amend(next)` (aplica
  sem `history.record`) = um passo só de desfazer; morre quando qualquer outra coisa muda o modelo.
- **Pintar na malha**: `faceContains` usa o polígono da face (par-ímpar, aceita côncavo), o
  espelho de pintura é pelo PONTO espelhado (`pickTexelAtPoint`, vale para malha e gêmeo), o
  "Vestir com textura" veste todas as faces (`partFaces`). Nova ferramenta **"Girar a pele"** (R):
  um toque gira a pele da face 90° (`rotateFaceSkin`; face retangular volta ao tamanho por
  vizinho mais próximo). A peça em edição ganha um VERSO escuro (`backMaterial`, `BackSide`): face
  virada aparece (errada) em vez de sumir.
- **Modelo pronto "Cristais"** (`templates/data/cristal.ts`): três bipirâmides de malha numa
  pedra (`TemplatePartSpec.mesh`, caixa derivada). O `catalog.test.ts` exige round-trip exato pelo
  sanitize: chaves estáveis, `normalizeMesh` no builder, ciclos orientados para FORA (`outward`).
- **Extras do lote**: **setas** (←→ X, ↑↓ Z, PageUp/Down Y, Shift = 5 encaixes; `movePartsBy`
  prende o GRUPO à grade), **trancar/esconder** (`locked?`/`hidden?` só como `true`, o gêmeo
  herda; trancada: o toque no palco passa por ela e a alça some, a lista e os steppers seguem;
  escondida: `mesh.visible = false`, fora do toque, DENTRO do modelo e do export), **Ver arestas**
  (`EdgesGeometry` a 30° em todas as peças), **pivô** (steppers "Pivô X/Y/Z" presos à caixa +
  "Pivô no centro"; `origin` já existia no dado), **seleção múltipla** (`extraIds` + "Somar à
  seleção"/Shift no palco e na lista; contorno em todas, alça na âncora do GRUPO só de mover com
  o delta preso à grade pelo grupo; peça trancada fica parada sem esconder a alça das livres,
  mesmo quando ela é a principal; `DragPatch.parts` leva caixas ABSOLUTAS por peça; Delete,
  Duplicar e as setas valem para o grupo).
- **Grudar pontos** (`model/snap.ts`, `viewport/SnapOverlay.ts`, tecla G): fluxo explícito de dois
  toques inspirado na ideia Vertex Snap do Blockbench, com implementação própria. O primeiro
  toque escolhe um vértice/pivô da peça principal ou o centro da seleção; o segundo só enxerga as
  âncoras da peça visível sob o ponteiro. Origem = círculo amarelo, destino = losango verde, com
  raio de 10 px no mouse e 22 px no toque. Peças somadas viajam juntas; origem trancada bloqueia,
  alvo trancado vale, e origem/gêmeos/escondidas não valem como alvo. O segundo toque revalida as
  referências no modelo atual, arredonda o delta a 1/16 e faz UM commit atômico; grade, referência
  velha ou sincronização do espelho inválida deixam o modelo intacto. Sucesso volta para Mover;
  G outra vez, Esc, trocar ferramenta/modo, colocar forma ou editar malha cancelam. As âncoras de
  malha usam cache por identidade; primitivas, cache limitado a 1 024 assinaturas geométricas.
- Testes: `mesh.test.ts`, `meshFrame.test.ts`, `meshSelection.test.ts`, `meshOps.test.ts`,
  `meshTools.test.ts`, `viewport/meshEditOverlay.test.ts` (Raycaster real), `export/meshGlb.test.ts`
  (20 000 tris + atlas cheio cabem no teto do Estúdio), `ModelEditor.mesh.test.tsx`, os blocos
  "malha" em sanitize/twins/pick/partOps/geometry/atlas/stroke/ops, `sessionStore.test.ts` e o bloco
  "extras de 06/09" em `ModelEditor.test.tsx`; e2e `model-editor.spec.ts` cobre o grupo cuja peça
  principal está trancada, o Grudar completo em dois toques + um desfazer e "malha: toque escolhe
  a face…" (toque real com folga, Puxar, lápis e Girar a pele). O Grudar também tem testes puros
  em `model/snap.test.ts`, projeção em `viewport/SnapOverlay.test.ts`, Raycaster real em
  `viewport/snapPicking.test.ts` e integração em `ModelEditor.test.tsx`.
- Desempenho medido em 06/09 (bun, melhor de 5; `scripts/bench-mesh.ts`): malha de 1 024 quads e
  1 089 vértices: `buildPartGeometry` 8 ms, `meshIssues` 31 ms, `meshEdges` 0,7 ms, sanitize do
  modelo 14 ms, `overlay.setMesh` com 100 escolhidos 3 ms, `extrudeFaces` 2 ms, `loopCut`
  atravessando 32 quads 9 ms; 128 caixas: geometria de todas 3 ms, `packAtlas` 0,1 ms, sanitize
  1,4 ms. Nada disso pesa num toque; o `meshIssues` roda só depois de ferramenta/arrasto.
- ⚠️ Compat pendente (decisão do plano, NÃO feita): o sanitize ainda DESCARTA peça de forma
  desconhecida; uma aba com código antigo que abra um modelo com malha regrava o asset sem ela.
  Como a malha já está no código, a janela é só o deploy; se um dia entrar outra forma, fazer o
  sanitize PRESERVAR a peça desconhecida antes.
- **Full review de 06/09 (tarde), o que mudou no pacote** (achados confirmados por script ou teste
  antes de corrigir; cada item tem regressão):
  - Malha pura: `orderQuad` SÓ desfaz a "gravata" (um dardo côncavo é uma face válida e ficava
    virando pipa); "face virada" virou regra LOCAL (a aresta dividida com a vizinha percorrida
    no mesmo sentido; a antiga, pelo centro, acusava as faces internas de um L ou U); limitações
    conhecidas: duas vizinhas viradas juntas e uma face solta não são apontadas. Puxar só para
    FORA (distância zero/negativa fazia paredes coplanares e viradas; o Ajustar começa em um
    encaixe) e o deslocamento anda pelo ENCAIXE eixo a eixo (`snapOffset`); a aba do Puxar de
    aresta nasce com o ciclo certo; Dividir corta pela diagonal que passa pelo dente; Juntar
    pontos não deixa duas faces com o mesmo conjunto; Fechar face orienta pelas VIZINHAS (o
    centro só vale para face solta); `normalizeMesh` derruba face sem área; `createPart` clona a
    malha e deriva a caixa dela; mover pontos REPROJETA a pele das faces que mudaram de forma
    (re-amostrar a cada commit apagava um xadrez em dois toques de seta); mover uma malha cuja
    caixa está fora do encaixe é translação exata (`setPartBox`); duplicar translada a malha,
    respeita o teto de triângulos (`trianglesFull`) e a cópia nasce visível e destrancada; o
    gêmeo herda `locked`/`hidden` de verdade (`twinUpToDate`); triângulo de área zero não vai ao
    `.glb`; `mesh.ts` sem byte NUL (o git tratava o arquivo como binário).
  - Follow-up do full review: `loopCut` cria os midpoints já em `meshPrecision` e recusa
    atomicamente quando o arredondamento colide com uma extremidade/outro vértice; o commit ainda
    confirma que todos os pontos e faces planejados sobreviveram à normalização. `movePartsBy`
    projeta o grupo inteiro, valida o orçamento sincronizado uma vez e só então atualiza os gêmeos;
    teto de peças/triângulos devolve o modelo original, sem mover apenas parte da seleção.
  - Palco: trancar/esconder a peça escolhida tira a alça na hora (e o `mouseDown` da alça
    confere); a folga em pixels vale na silhueta (toque sem superfície tocada); a alça da malha
    anda nos eixos da PEÇA (`setSpace('local')`); a miniatura sai sem arestas, overlay e verso,
    enquadrada pelo que se vê; o espelho de pintura não alcança escondida nem trancada; "Girar a
    pele" com espelho gira a face espelhada no sentido oposto.
  - Editor: o gesto do "+ Nova cor" fecha ANTES de qualquer outro commit ou gesto do palco (Esc
    no seletor não manda `change` e o `pointerdown` de pintura não tira o foco: o `before` velho
    entrava no histórico depois e o Desfazer andava para trás e para frente); um passo do
    seletor sobre uma cor que já existe tira a extra e aponta para ela; o lápis volta à 1ª cor
    quando a extra some (desfazer); foco volta ao "+" ao fechar o seletor; o input do seletor
    fica fora da árvore de acessibilidade; "+" desabilitado sem peça no Montar. Setas: toque ou
    tecla segurada = UM gesto (`replace` no keydown, `commitGesture` no keyup/blur/próximo
    commit), só com algo escolhido (senão a seta é do navegador); Ctrl+A escolhe todos os
    pontos; E dentro do Editar malha FECHA; peça trancada ou escondida não entra no Editar malha
    (toast) e trancá-la durante a edição fecha; o Pintar ignora o "Somar à seleção" (e trocar de
    modo o desliga); o toast com ações só age sobre o estado que gerou o aviso (`fixes.stale`),
    o aviso roda também no Ajustar e no apagar, `meshIssues` memoizada por identidade; corte
    fora do encaixe avisa (`cutOffGrid`); arrasto barrado pela grade avisa (`cannotMove`);
    dicas certas para Dividir, corte sem quad e face repetida; `canSplit` próprio.
  - Acessibilidade e UI: `Toast` com a mensagem na região viva e os botões FORA dela, relógio
    parado com foco ou mouse num botão; `MeshToolbox` com legenda "Ferramentas de malha" e a
    contagem sem live region (o palco já tem a dele); `PartsPanel` com rótulos FIXOS + `aria-pressed`
    e os selos falados por `aria-describedby`; galeria com a busca e os chips presos no topo ao
    rolar; coluna rolável com a barra FINA (a criança de mouse precisa ver que há mais painel);
    `./assets` só exporta o tipo `MeshIssue` da malha (as funções são internas).
  - Bancada: `scripts/bench-mesh.ts` é a medição do bullet acima; o plano do lote está em
    `docs/plans/2026-09-06-molda-malha-lote.md`.
- **Full review de 06/09 (rodada 3):** `editorStore.contentRevision` separa edição real de
  `setThumb`; toast e Ajustar recusam qualquer revisão posterior, inclusive troca de paleta que
  preserva `parts`. A seleção explícita impede duas faces opostas de virarem as seis faces do cubo
  em Puxar/Delete; normal média nula recusa o Puxar. Resize de malha arredonda e normaliza antes do
  commit, recusa colapso de topologia e já é idêntico ao round-trip do sanitize. `setPartBoxes`
  aplica os destinos absolutos do arrasto em uma transação e compartilha o portão atômico de
  `movePartsBy`. `createFace` recusa face degenerada e confirma que a face nova sobreviveu ao
  commit. Desenho: `docs/plans/2026-09-06-molda-full-review-round-3-design.md`.

## Evolução aprovada e proteção de documentos (06/09/2026)

O plano geral está em `../../docs/plans/2026-09-06-molda-evolution.md`. Ele substitui
as exclusões antigas de produto para animação, UV e interoperabilidade, mas **não**
declara essas funcionalidades já implementadas. Implementação própria, sem incorporar
código do Blockbench. Primeiro lote: guardas de formato, recuperação e benchmark válido.

- Formato nativo corrente: `MOLDA_DOCUMENT_VERSION = 1`. Ausente = legado. Leitura
  discriminada em `core/documentReader.ts`; `sanitizeMoldaAsset` e os escritores
  recusam formatos desconhecidos. Não confundir com envelope de galeria v2 nem
  com revisão de upload da nuvem.
- `state/guardedWrite.ts`: versão/quota/gravação na mesma transação IndexedDB;
  não depende de Web Locks. Primeira edição de legado preserva original em
  `molda:recovery:<id>`, contabilizado na quota e removido apenas ao excluir a criação.
  `read`, `loadRecovery` e `getReadIssues` expõem recuperação sem sanitizar o original.
- `RecoveryNotice` mostra arquivos ilegíveis/futuros; download não passa pelo writer
  corrente. `recoveryJson` mantém campos desconhecidos e codifica Uint8Array em base64;
  tipos não representáveis são recusados. Nunca emitir backup parcial silenciosamente.
- A nuvem recebe `formatVersion` e bloqueia regressão de formato confirmado/reservado
  com `CREATION_CLIENT_OUTDATED`. Implantar migration 0075 e todos os guards backend
  antes de novos escritores. `molda:document:<id>` isola a escrita atual do prefixo
  legado `molda:asset:<id>`; promoção, recuperação e retirada da chave antiga são
  atômicas. Tombstones impedem ressurreição por abas antigas após exclusão. Formato 2
  ainda não está ativo; rollout backend e homologação com abas reais seguem pendentes.
- Benchmark: `bun scripts/bench-mesh.ts`, fixture válida de 900 quads/961 vértices,
  8 aquecimentos/40 amostras, p50/p95/p99, roundtrip e resultados das operações
  conferidos. CPU/heap delta não são medições de FPS ou ausência de vazamento.
- `guardedWrite.test.ts` usa `fake-indexeddb` independente do mock de idb-keyval,
  cobrindo transações concorrentes/rollback. Testes DOM não substituem homologação
  em navegador com WebGL, tablet ou testes com crianças.
- Execução autorizada em lotes sequenciais, revisão técnica por lote e validação
  humana ao final; não pausar por checkpoints de aprovação do plano.
- `core/history.ts` + `snapshotDelta.ts`: orçamento conjunto undo/redo, deltas de
  ramos e faixas Uint8Array, fallback denso limitado. A base é a última revisão
  confirmada, não `replace` em andamento; miniaturas derivadas ficam fora. `amend`
  rebaseia o delta da última ação. Um único passo acima do teto continua permitido.
- `core/gesture.ts`/`useEditorGesture`: propriedade e revisão para begin/preview/
  commit/cancel em todos os controles contínuos. Nunca aplicar fim atrasado após
  outro comando/undo. Cancelar devolve o conteúdo sem criar histórico; o viewport
  abandona buffers/alças antes de restaurar o documento. Pointer capture real
  continua gate de browser, não é coberto por happy-dom.
- `DeferredEditor` carrega as ferramentas por tipo, com retry e proteção contra
  resultados após unmount. Instrumentação QA não deve importar Three estaticamente
  para a galeria de produção. `DemandRenderLoop` suspende fora da tela, aba oculta e
  contexto perdido; retoma dirty, remove observers/listeners e evita resize repetido.
- `viewportCamera` separa projeção/enquadramento; vistas nomeadas são ortográficas,
  Livre é perspectiva. `viewportNavigation` cria OrbitControls com up-axis correto,
  pan em vistas planas e damping opcional; ao trocar vista, descartar o controle
  anterior (o quaternion de up-axis do OrbitControls é calculado no construtor).
  Câmera/seleção não entram no documento/histórico. Enquadrar seleção inclui gêmeos
  visíveis; nunca enquadrar por peças escondidas. Picking ortográfico respeita zoom.
- `WorkspaceInspector` é dock recolhível em largura ≥1024px e gaveta não modal no
  tablet. O conteúdo permanece montado ao recolher/redimensionar; foco vai ao título
  ao abrir e volta ao acionador ao fechar. Não tirar foco do campo nativo em Escape.
- Isolamento é `sessionStore.isolateSelection`, não `part.hidden`. Segue seleção e
  gêmeos, sai ao perder a seleção, filtra picking/Grudar/enquadramento. Miniatura e
  exportação representam a criação inteira (respeitando apenas hidden persistido).
- `readRecords` usa cursores pontuais na mesma transação para distinguir chave
  ausente de valor inválido `undefined`; nunca cair no legado por corrupção canônica.
- `workers/workerTask` é dono de um worker por tarefa; abort/sucesso/erro terminam
  e removem listeners. Entrada via structured clone, sem transferir buffers vivos.
  `skyExport` valida token documento/revisão e retorna bytes idênticos ao encoder.
  Download HDR é cancelável; editar/undo/sair invalida a tarefa. A prévia pequena
  continua síncrona. `bench-sky(-worker).ts` mede CPU/ocupação da thread, não FPS.
  Vite e Next/Turbopack compilam o worker por `new Worker(new URL(..., import.meta.url))`.
- ZIP e `exportLoadedAssetForStudio` usam o worker HDR; esta última API retorna
  Promise. A fila Studio engloba exportação + entrega, captura namespace antes de
  aguardar e `flush` drena tudo. Ao Voltar, reconferir revisões após awaits e não
  sair se a última edição não foi salva; não navegar por resultado após unmount.
- Cache de exportação usa `ByteLru`: 16MiB (UTF-16 + overhead) e 16 entradas;
  não reter resultados acima do orçamento. Limite contábil não é medição de heap.
- Armazenamento indexado (lote 11) sucede `molda:document:`: `molda:record:` e
  `molda:summary:` são gravados juntos; recuperação/tombstones usam `record-recovery`
  e `record-deleted`, isolados também das abas sem índice. É geração de armazenamento,
  não formato nativo 2. Ao promover, conservar o backup mais antigo e retirar chaves
  anteriores na mesma transação. Metadados e miniaturas duplicadas contam na quota.
  `listSummaries` não lê documentos indexados; legado/índice inválido é leitura pontual
  guardada, um documento por vez, sem escrita durante a listagem. A biblioteca Studio
  usa esta capacidade; `loadAll` permanece para consumidores explícitos de conteúdo.
- Galeria visual/store e reconciliação Kids usam resumos. `useAssetDocument` abre
  um documento com retry e invalidação assíncrona. Miniaturas são derivadas em fila
  individual por galeria, ao entrar na área visível; cache 8MiB/60 entradas e descarte
  ao sair, sem guardar geometria/pixels canônicos. Aplicar textura lê pixels somente
  no clique. Backup completo é leitura explícita, não efeito de abrir a galeria.
- `saveIfUnchanged` e `removeIfUnchanged` são operações obrigatórias de persistência:
  comparar `updatedAt` e escrever/apagar na mesma transação; `null` = ausência. Nunca
  implementar como `await load` seguido de `save`. Divergência não modifica nada e
  não emite BroadcastChannel. Nuvem usa essa condição para aplicar/remover/restaurar
  e reverter cópias não adotadas; renomear mantém timestamp crescente e recusa revisão
  vencida. Corrupção/futuro não contam como ausência.
- Seleção topológica em `model/topologySelection.ts` é pura e compartilhada pelos
  adaptadores legado (`meshSelectionGraph`) e nativo (`scene/meshComponents`): grafo de incidência,
  não matriz de pares, caminhada iterativa; arestas soltas pertencem à seleção.
  Faces se conectam por aresta, não só por ponto. Anel atravessa quads opostos;
  caminho para em polos/bordas/triângulos/ambiguidade. UI/teclado/ajuda compartilham
  `commandRegistry`; Ctrl+A respeita o modo. Seleção não altera documento/histórico
  nem retargeta um gesto ativo. Novos comandos ficam no disclosure “Escolher mais”
  do legado ou “Mais jeitos de escolher” da oficina nativa.
- `ReferenceImageGuide` é apoio de tela temporário por vista, não geometria ou
  conteúdo persistido. Posição/escala/opacidade/espelho são sessão; export/thumbnail
  capturam somente WebGL. Loader lazy aceita PNG/JPEG limitado por bytes/dimensões,
  verifica assinatura antes do decoder e recusa animação PNG. Cada imagem tem um
  blob URL com descarte idempotente; cancelar/trocar/sair invalida resultados tardios.
  Não buscar URLs externas nem subir imagens de referência à nuvem.
- Pintura 2D: linha/retângulo/elipse usam `texture/shapes.ts`, sempre a base do
  gesto, sem acumular prévias. Cor/pincel/ferramenta/offset são capturados no início.
  Eventos do `PixelStage` são coordenadas da folha visível; interpolar e recortar
  antes de aplicar o offset de “Deslocar meio” ao bitmap. Balde/conta-gotas seguem
  o mesmo contrato. Trocar essa vista cancela a prévia, não desloca os pixels salvos.
- `PartGeometryResource` pertence ao viewport: geometria espacial e UV têm
  invalidação separada. RGB não invalida buffers; mudanças de regiões só atualizam
  spans UV afetados. `PartGeometry.faceRanges` é lista de spans contíguos por face,
  pois as tampas do cilindro são intercaladas. Não duplicar esse índice no viewport.
  Faixas pendentes de atributo são união limitada e não perdem atualizações sem
  frame. `bench-viewport-geometry.ts` verifica golden de bytes, não mede GPU/FPS.
- `ModelAtlasResource` gerencia layout/fallback/pixels sem cena/React. Tamanho
  igual reutiliza DataTexture; `rasterAtlas` pode escrever em buffer derivado
  exclusivo do tamanho exato, limpando regiões desocupadas. `AtlasTexture` conserva
  full-pending até `onUpdate`; parciais são no máximo uma faixa por linha, nunca
  uma faixa atravessando linhas (contrato Three). Não limpar pedido completo ao
  chegar outro traço. Descarte é idempotente e ignora escritas tardias.
- Exclusão local simples/em lote protege versões de todos os documentos e
  recuperações que apaga, não só o registro vencedor. Conferir na transação IDB;
  dados inválidos conhecidos podem ser excluídos explicitamente, futuros não.
  Migração não retira originais futuros escondidos por outra geração. Fallback
  memória segue os mesmos guards, prepara todo o lote antes de mutar, retém o
  original e informa `getReadIssues`/`read`/`loadRecovery`. Resumos não retêm cópia
  completa da galeria. Essa proteção não corrige abas antigas retroativamente;
  escritor de formato seguinte exige geração isolada e rollout backend.
- Política de documento separa `MOLDA_MAX_READ_VERSION` (capacidade de leitura)
  de `MOLDA_DOCUMENT_WRITE_VERSION` (escritor liberado); ambas ainda são 1.
  `MOLDA_DOCUMENT_VERSION` é alias legado, não usar em novos consumidores.
  Escrita exige a versão do escritor mesmo quando um leitor futuro for ampliado.
  JSON nativo é união discriminada tipada com versão literal por formato e peles
  base64. Metadata da nuvem vem desse mesmo documento serializado, não de outro carimbo.
- `scene/matrix.ts` é math pura compartilhada com o legado. TRS ou matriz afim são
  representações alternativas, nunca duas transformações autorais. Não decompor
  shear silenciosamente; normais com escala usam inversa transposta, não direção.
  `scene/graph.ts` deriva filhos/ordem/mundo por revisão, iterativamente. Reparent
  prepara todas as raízes selecionadas antes de devolver estado; descendentes
  selecionados junto com pais não recebem a transformação duas vezes.
- Domínio interno seguinte em `scene/document.ts`, **não habilitado** nos entrypoints
  públicos/persistência. `readDocument` é estrito, nunca usa sanitize v1; `documentJson`
  codifica camadas em base64. Campos desconhecidos/refs quebradas recusam o conjunto,
  mantendo raw recuperável. Orçamentos são agregados; arrays numéricos e Uint8Array
  continuam compatíveis com histórico existente. Zero com sinal é canonicamente +0
  (JSON não preserva -0); demais coordenadas/UV não são quantizados.
  `migrateLegacy` é determinístico, sem writes, mantém pivô como origem local, paleta
  editável e pixels próprios; faces degeneradas retornam aviso de UV. `evaluate`
  deriva instâncias espelhadas de fonte única, flags herdadas e orientação (-1 requer
  inverter winding); `bounds` rejeita overflow após composição. Migração local real
  ainda exige geração isolada, original preservado e transação; não promover via v1 save.
- `state/promoteScene.ts` implementa a primitiva interna de promoção (não chamada
  pelo app público). `molda:scene:*` vence `record/document/asset`; `scene-deleted`
  suprime fallback. `scene-originals` retém valores brutos de todas as chaves
  retiradas, não uma versão sanitizada. Comparar, preservar e promover na mesma
  transação sem await; abortar tudo se a última escrita falhar. Resumo v1 não pode
  encobrir geração nova. Recebimento parcial preexistente não pode ser sobrescrito.
  A varredura de quota mista é deliberada nesta primitiva; ledger/blobs ainda não
  implementados. Não liberar migração/escrita v2 automaticamente por existir o codec.
- `createDocumentEditorStore` compartilha o motor de histórico/gestos/autosave entre
  documentos tipados; `createEditorStore` conserva o contrato v1. Inferir o tipo
  pelo asset, não pela função de tamanho (`NoInfer`). Miniatura é derivada e fica
  fora do histórico. Não duplicar o motor para o editor de hierarquia.
- `scene/commands` produz revisões imutáveis para hierarquia, transformação, pivô,
  duplicação, flags e espelhos. Usa `commandContext` para seleção/travas, identidades
  e custos; comandos especializados reutilizam essa fronteira, sem clonar pixels
  na validação. Operar só nas raízes da seleção e respeitar travas
  herdadas/descendentes. Pivô preserva mundo e faz copy-on-write de geometria
  compartilhada. Duplicação copia recursos alcançáveis uma vez e remapeia material
  por face e imagem; não compartilhar pixels com o original. Desagrupar conserva
  ocultação e compõe matrizes locais, inclusive sob pai singular. Excluir nós retira
  apenas geometrias usadas exclusivamente pelos nós apagados; mantém as compartilhadas,
  órfãs preexistentes e bibliotecas de materiais/imagens. Undo restaura a geometria.
  Medidas de primitivas usam copy-on-write e não reamostram tinta. Metadados de edição
  são carimbados pelo motor.
- `scenePersistence` é interno e exige revisão de armazenamento em cada mutation;
  não confundir com timestamp autoral. Tombstone avança revisão; apenas `restore`
  com a revisão de exclusão reabre a criação. Recibos de migração permanecem para
  recuperação, inclusive depois da exclusão local. UI de recuperação deve informar
  esse espaço; não oferecer limpeza implícita. `sceneMetadata` guarda custos por
  registro. `sceneQuota` lê os metadados e o documento alvo na mesma transação;
  demais cenas válidas ficam no disco. Legados/índices desconhecidos exigem medição
  raw. Não presumir que abas v1 mantêm esse índice. IDs de criação usam
  `isMoldaAssetId`, distintos dos IDs internos de recursos. Blobs/rollout continuam pendentes.
- `scene/geometry` deriva triângulos e UV/material por canto; `triangulate` trata
  concavidade sem mudar winding e informa faces degeneradas/autointersectadas.
  Consumidores precisam mostrar os problemas, não exportar perdas silenciosamente.
  Primitivas nativas usam precisão relativa; o gerador v1 conserva seu limiar
  absoluto. `scene/composite` mistura camadas sRGB com alfa direto, só quantiza a
  saída e compõe a cor base SOB a pintura. Não multiplicar a tinta pela cor base
  do material (isso altera cores migradas). Imagens/atlas/GPU continuam derivados.
- `SceneRenderResource` mantém instâncias de desenho planas com matrizes de mundo
  derivadas, não outra hierarquia autoral. Compartilhar geometria/material por ID,
  inclusive no espelho. Three trata winding de matriz negativa no renderer;
  inverter índices apenas em exportações que assem essa matriz. Cálculos falíveis
  de geometria/pixels são preparados antes de atualizar o frame. `RgbaTexture`
  compartilha posse de pixels e uploads entre imagens retangulares e `AtlasTexture`
  (fachada quadrada compatível). Material usa branco quando o fundo já foi composto
  na imagem; sRGB não deve ser interpretado como linear. Recursos saem das caches
  quando a última instância deixa de usá-los, com dispose idempotente.
- Oficina interna em `components/editor/scene`, montada lazy apenas pelo playground
  `?oficina=nova`; nenhuma ativação do escritor público/cloud. `openSceneWorkshop`
  promove explicitamente no store recebido e nunca abre legado por baixo de v2
  inválido/futuro. `createSceneEditorStore` possui o token CAS e só o avança após
  escrita bem-sucedida; conflito permanece exportável e não adota token de outra aba.
  Reutilizar WorkspaceInspector/gestos/histórico, não criar outro motor. Ajuste de
  uma peça respeita o pivô; seleção múltipla usa centro conjunto. `SceneViewport`
  mantém navegação/picking e loop sob demanda; perda de contexto bloqueia entrada,
  chamadas depois do descarte não recriam controles. Renderer injetável é fronteira
  do browser, não substitui geometria/câmera/raycast reais nos testes.
- `sceneBounds` inclui locators apenas quando pedido pelo enquadramento; eles não
  viram geometria de exportação. `buildSceneGeometry` informa `precision` quando
  Float32 colapsa uma face válida; mantém a fonte intacta. Avisos de faces precisam
  acompanhar prévias/exportações, não podem ser ignorados por codecs.
- `SceneTransformGizmo` transforma um proxy de mundo, não a matriz autoral; o delta
  absoluto vai ao `sceneTransformGesture`, que captura seleção/revisão inicial.
  Não decompor shear nem acumular deltas sobre prévias. `GesturePorts.cancel` usa
  `editor.cancelGesture` para salvar a restauração quando uma prévia já chegou ao
  disco; só chamar `replace(before)` perde essa compensação. Uma revisão alheia
  invalida preview/commit/cancel do token antigo. Flags herdadas são derivadas por
  `evaluateSceneNodeFlags`, em passagem linear, não buscas repetidas nos ancestrais.
- Seleção por caixa/laço na oficina interna usa pontos de giro projetados dos
  objetos, não silhuetas. `sceneRegionPicking` respeita flags herdadas, isolamento,
  oclusão e fontes de espelhos; peças travadas ainda ocluem. `SceneAreaSelection`
  limita o laço a 512 pontos e possui a captura de um ponteiro. Região/seleção são
  sessão, sem histórico. Blur/perda de contexto precisam limpar ponteiros retidos
  e recriar OrbitControls; não depender de pointerup para voltar a aceitar gestos.
- `scene/primitiveMesh` é a tesselação autoral comum ao desenho nativo e à conversão:
  IDs topológicos conectam costura/polos, UV permanece por canto e Float32 só existe
  nos buffers derivados. `convertSceneNodesToMesh` converte subárvores num commit,
  mantendo compartilhamento entre selecionados e isolando usuários não escolhidos.
  `indexSceneDocument` limita triângulos autorais, inclusive recursos sem instâncias,
  além do custo de desenho. Triangulação normaliza ambos os eixos projetados para
  não confundir faces finas com interseções; nunca modifica os pontos autorais.
- `parametricGeometry` escolhe o gerador/custo das formas. Cilindros/esferas guardam
  divisões opcionais; omissão conserva os valores legados. `pathMesh` deriva tubos
  de caminhos abertos com 2–128 pontos identificados, raio, 3–64 lados e tampas.
  Pontos do caminho são a fonte canônica; não persistir também a superfície gerada.
  Frames são transportados ao longo do caminho, com UV por comprimento e por canto.
  `pathCommands` copia uma cadeia para uma peça nova e permite editar parâmetros ou
  pontos por ID; conserva a fonte, trava/COW, transformações e desfazer. Curvas podem
  se atravessar; não sugerir que o gerador repara autointerseções automaticamente.
  Mudanças de pivô também deslocam pontos de caminhos; bounds incluem o raio.
- `meshPlaneCut` divide faces planas/convexas com UV afim e compartilha interseções
  entre faces/linhas; guarda proveniência e lado das faces no resultado derivado.
  Não apaga lados nem preenche buracos. `meshBevel` usa essa base para um chanfro
  plano localizado numa quina externa; recusa atingir outro canto ou apagar faces.
  Só a nova tampa recebe UV novo; a pintura das faces originais não é reprojetada.
- `appearanceUsage` indexa vínculos de material/imagem por peça, inclusive faces,
  caminhos e travas herdadas/ocultas. Edição compartilhada confere todos os usuários;
  `copySceneMaterialForNode` isola material/imagem e remapeia só a peça, com COW de
  geometria. Metadados usam `readSceneMaterial`; pixels não passam por sanitizador v1.
  `imageLayerCommands` preserva camadas/pixels imutáveis e verifica capacidade antes
  de alocar. Indexado → RGBA conserva cada camada, mas libera o vínculo da paleta;
  não reduzir RGBA para índices silenciosamente. Prévia usa `compositeSceneImage`,
  linhas mostradas de baixo para cima para acompanhar UV/GPU `flipY=false`.
  Painéis lazy têm chaves qualificadas por função, não só pelo ID da peça.
- `imagePaint` é o núcleo único de lápis indexado/RGBA para 2D e 3D. Só a camada
  alterada recebe cópia; RGBA substitui pixels, sem acumular alpha por amostra.
  `scenePaintGesture` conserva revisão/undo/cancelamento; `useScenePaint` interrompe
  traços em revisão externa, blur e ocultação. `ScenePaintInput` usa o primeiro
  hit visível (até uma peça travada encobre), vínculo de imagem e UV por canto;
  muda a região ao cruzar face/espelho para não interpolar através de costuras.
  Canvas 2D usa seu retângulo real, linha zero V=0, cursor por teclado e captura
  exclusiva; falha de captura cancela. Pintura e edição de componentes são modos
  mutuamente exclusivos. Navegação 3D tem alternância explícita “Olhar o modelo”.
- `materialImages` centraliza papéis cor/normal/roughness/metalness e imagens
  alcançadas. Dados exigem RGBA e usam fundo neutro + `NoColorSpace`; cor usa sRGB.
  Normal tangente usa RGB/força/inversão Y; roughness usa G e metalness B. Não
  quantizar dados por paleta nem deixar mapas alterarem alpha/depth-write.
  Cópia/duplicação remapeia todos os papéis uma vez, travas cobrem todos os usuários.
  Chave de recurso inclui imagem/base/espaço de cor; paleta não recompõe dados.
  Conversão de atlas recusa materiais com mapas até remapear todos os canais juntos.
- `ScenePaintTarget.imageKind` é sessão (padrão cor), validado no domínio e no
  material do hit 3D. O canvas usa fundo neutro do papel. Criar/importar/pintar
  dados nunca substitui o vínculo de cor por engano. A interface contextual
  `SceneMaterialImageTools` reutiliza `SceneImageCreateForm`, camadas e importação;
  a chave da prévia inclui material/papel. Troca de papel cancela tarefas/traços.
- `imageAtlas` prepara packing determinístico e raster pelo compositor canônico;
  margens replicam bordas, sem resize. Imagem/base idênticas deduplicam tiles, não
  acabamentos. Recusa mistura de classificação opaca/transparente e UV fora do tile.
  `imageAtlasCommands` isola só a peça escolhida com COW, mantém parâmetros e
  originais na biblioteca, grava a nova imagem/UV/vínculos em um undo. A pintura
  consolidada é uma nova fonte RGBA, não um cache persistido; explicar flattening
  e perda do vínculo futuro com paleta. Worker só devolve raster/token, nunca
  geometria/IDs. `useSceneImageAtlas` conserva prévia em sessão e cancela em revisão,
  Escape, blur, ocultação e fechamento. Conversão sozinha não reduz draw calls.
- `imageStamp` aplica source-over uma vez após o gesto, com raster RGBA próprio,
  escala inteira e giros de 90° seguidos de flips nos eixos da prévia. Clipa o laço
  antes de percorrer; nunca aloca a imagem ampliada. `intersectImageRegions` é comum
  ao comando e ao contorno. Captura lê só a camada, sem opacidade/composição;
  configurações/raster são congelados no começo. Prévia usa CSS sem reamostrar
  dados autorais. Carimbo permanece sessão após undo, mas fecha com a pintura.
- `decodeLocalRaster` é a fronteira compartilhada para referências e importação:
  inspeciona PNG/JPEG e orçamento antes de decodificar; cada recurso tem um dono
  e descarte idempotente. `sceneRaster` limita a pintura a 1024 por eixo, sem resize,
  conserva bytes do canvas em linhas V=0 e libera URL/canvas após leitura. Não
  prometer preservação de metadados ou bytes que o decoder do navegador descarte.
  `useSceneRasterFile` usa escopo explícito, aborta resultados antigos e mantém
  prévia fora do documento. Importar cria/vincula nova imagem em um undo, mantém
  biblioteca anterior e UVs; `bindNewMaterialImage` centraliza travas e orçamento
  antes de alocar/copiar tanto imagens vazias quanto importadas.
- `imageGradient` interpola cores sRGB codificadas com alpha premultiplicado;
  conserva bytes nos extremos, recusa distância zero e respeita a seleção. Usa
  o gesto/worker de formas, não altera pixels durante o arrasto. Conversão para
  RGBA é explícita, com undo separado. `imageColor` lê bytes/índice da camada,
  nunca sua composição; conta-gotas é estado de ferramenta, sem histórico.
  `useScenePaint` mantém uma ferramenta ativa única; cores/alpha usam controles
  reutilizáveis, e desfazer o formato não deve quantizar dados autorais.
- `imageOperations` reúne conversão RGBA e balde por conectividade de quatro
  vizinhos. Tolerância compara RGBA original com a semente; índices são exatos.
  Fila/visitação têm tamanho limitado, nenhum pixel é reavaliado após preenchido.
  `sceneImageTask` valida fonte/travas/orçamento, mantém um worker por revisão e
  aplica um commit ao concluir. Cancelar/revisão externa substitui o proprietário,
  termina CPU e impede resposta tardia. `sceneImageProtocol` reaproveita o leitor
  estrito de imagem, transfere só camadas alteradas na volta e conserva as demais
  por referência. Não transferir buffers vivos na ida. UI mostra cancelamento,
  inclusive ao fechar material/pintura; a cor de ferramenta acompanha o formato
  após undo sem alterar os pixels autorais. Benchmark: `bench-scene-image.ts`.
- `imageRaster` compara fontes imutáveis e prepara região compacta pelo compositor
  único. Não usar dicas globais que retenham cadeias de documentos/histórico.
  Mudanças de paleta/base, tamanho/formato e estrutura/opacidade/visibilidade
  invalidam tudo; nomes e bytes iguais não. `ScenePaintResource` copia o patch
  e mantém contagem de transparência; `RgbaTexture` acumula faixas pendentes, sem
  perder alterações antes do primeiro upload completo. Acabamento não refaz raster.
  `SceneImagePreview` calcula fora do render React e escreve só o patch bottom-up.
  Benchmark CPU: `bench-scene-paint.ts`; não extrapolar para FPS/GPU ou prometer
  custo constante, pois a camada alterada ainda é comparada/copiada integralmente.
- `ScenePaintResource` possui a textura derivada e contagem de transparência;
  `SceneMaterialResource` possui só o acabamento e nunca descarta a pintura.
  `SceneRenderResource` compartilha imagem/base exatas, prepara um patch por
  combinação e retém apenas fontes atuais. Bases Double diferentes e IDs de
  imagem diferentes ficam separados mesmo se o raster coincidir. Mudanças de
  alpha/resize atualizam todos os usuários; descarte vem após o último vínculo.
  Benchmark: `bench-scene-shared-paint.ts`, CPU/identidade/bytes, não FPS/GPU.
- `imageFlipbook` valida quadros sem sobras, até 256 células/passos, sequência
  explícita e velocidade Double. Numeração visual começa no alto/esquerda; pixels
  continuam bottom-up. Amostragem distingue passo/célula e limita UV dentro do
  quadro antes de deslocar. Metadados não mudam pixels/UV nem criam reprodução
  autoral: relógio/quadro ativo pertencem à sessão. Configurar/remover passa por
  `imageFlipbookCommands` com travas compartilhadas e undo. Atlas recusa fontes
  animadas no comando e no kernel, sem achatamento silencioso.
- `SceneRasterWindow` é a composição atual mais uma janela opcional, compartilhada
  por preview 2D e recurso de pintura. Sem janela, pixels derivam de um único
  buffer; com janela, reusar um buffer de quadro. Atualizar fora da janela não
  envia upload; traduzir interseções sem reescalar UV. Transparência é da folha
  inteira, nunca do quadro atual. Validar recortes antes de publicar recursos;
  reset/remover metadados precisa religar e descartar texturas com tamanho novo.
  Pintura 3D amostra a célula ativa em coordenadas da folha e separa regiões por quadro.
- `SceneFlipbookPlayer` é sessão assinável, sem pixels/documento/histórico. Assinar
  no preview e diretamente na ponte do viewport, nunca na raiz inteira da oficina
  a cada quadro. RAF só após reprodução explícita; cancelar em pausa/fim/revisão/
  blur/ocultação/contexto perdido/desmontagem, descartando callbacks antigos por
  geração. Seek guarda passo inteiro mais tempo relativo, sem arredondar fps.
  Publicar documento antes de sincronizar um quadro de metadados novos; confirmar
  a identidade dos metadados exibidos para não amostrar uma grade anterior.
  Sincronização do mesmo quadro não cancela pincelada nem solicita render adicional.
  `ScenePaintSample.bounds` limita ferramentas 3D à célula em interseção com a
  seleção; conta-gotas/reseleção ficam livres e o canvas 2D continua sendo a folha.
- `paint/shapeTexels` é o raster incremental de linha/retângulo/elipse compartilhado
  com texturas legadas; conservar seamless e simetria. `imageShapes` valida antes
  de percorrer, copia só a camada alterada e respeita `imageRegion`. Lápis e balde
  recebem a mesma região retangular opcional; nunca confundi-la com recorte autoral.
  `scenePaintShapeGesture` mantém rascunho leve, cancela ao sair da região/costura
  ou mudar revisão e só inicia o worker ao soltar. Seleção pertence à sessão e
  inclui imagem/dimensões, sem undo. Teclado confirma duas âncoras com espaço/Enter.
  Contorno CSS do canvas não pode reduzir a área usada para mapear pixels.
- `meshUv` deriva ilhas/costuras de UV exato por canto e vínculo de material,
  sem soldagem por proximidade. `meshUvOperations` altera só o encaixe escolhido:
  transformação no centro, projeção plana e packing por faixas/escala uniforme.
  Packing exige ilhas completas, não redesenha pixels nem impede sobreposição
  com ilhas fora da seleção. `SceneUvEditor` carrega ao abrir; canvas sob demanda,
  seleção compartilhada com 3D, coordenadas fora do tile visíveis, sem persistir
  layout/seleção. Toda edição passa por `editSceneMesh` (travas/COW/undo).
- `meshUvProjection` mantém projeção local e escala métrica separadas;
  `autoMeshUv` usa a mesma escala global para faces separadas, sem modificar
  posições/materiais/pixels. Tirar a translação antes de normalizar, tratar spans
  de Double que transbordam e recusar perda de área por precisão. `meshUvPacking`
  recebe grupos disjuntos explícitos; não inferir conectividade dos UV provisórios
  sobrepostos. Organização por face não é unwrap de superfície curva nem marcação
  persistente de costuras. `sceneUv` executa auto-UV em worker sob pedido, devolvendo
  só UV Double dos cantos selecionados com token de documento/revisão/nó. Validar
  protocolo antes de mapear na fonte; posições/topologia/materiais não vêm na resposta.
  `useSceneUvPreview` cancela em revisão/seleção/bloqueio, Escape/blur/ocultação/
  contexto e fechamento; confirmação revalida revisão e usa o comando COW/undo.
  Prévia somente leitura reutiliza o bitmap UV, sem botão ou callback fictício.
- `meshUvAutoProjection` centraliza a escala métrica comum. `unfoldMeshUv`
  desdobra facetas planas com uniões orientadas/manifold e do mesmo material;
  cortes explícitos também bloqueiam caminhos alternativos. Grupos de no máximo
  64 faces/128 triângulos limitam comparação de sobreposição. Validar novamente
  após packing; não tolerar margem que feche um corte. Testes de lado conservam
  zero nos próprios endpoints, sem normalização separada que invente overlap.
  Cortes são instruções da tarefa, UV é a fonte autoral; não criar mapa duplicado
  de costuras nem prometer relaxamento de ângulos/número mínimo de cortes.
  `sceneUv` aceita abertura conectada opcional; `meshUvSelectedSeams` deriva a
  preservação dos cortes existentes dentro do worker. Configuração/cortes são
  próprios e estritos; resposta continua só UV. Troca de método/opção/margem
  cancela a prévia, sem cálculo ao alternar controles. Medição do lote 82 ainda
  tem intervalos de timer acima de 50 ms; worker não homologa fluidez/hardware.
- Animações internas opcionais preservam Double e campos ausentes; fps é grade
  de exibição, não snap. `local-delta` é matriz original × TRS animado; `local`
  exige pose original TRS e não admite decomposição aproximada de shear. Chaves
  ordenadas/únicas e valores próprios no leitor; orçamentos agregados antes da
  cópia excedente. Smooth é ease-in/out limitado, não spline. Tempo é sessão.
  Índice confere referências/custos sem revarrer valores de todas as chaves em
  comandos de pintura. Duplicação/tubos copiam trilhas; exclusão poda alvos.
  Não reparentar através de ancestrais animados, remover grupos animados ou mover
  pivôs animados sem bake que preserve o movimento; recusas são atômicas.
- `prepareSceneAnimation` compila só hierarquia/trilhas; amostrar usa busca binária
  e não lê geometria/imagens. Quaternions são normalizados apenas na pose derivada,
  por SLERP no arco curto; constantes Double não podem desaparecer ao interpolar.
  `SceneRenderResource.setPose` exige a mesma revisão, valida todos os desenhos
  antes de aplicar matrizes e preserva recursos/isolamento. Não chamar update do
  documento por frame; restaurar pose e descartar libera referências da sessão.
- `animationCommands` grava tempos exatos e valores próprios, sem mudar a pose
  original. FPS não retima; encurtar sem retime recusa chaves fora do final.
  Retime/inversão recusam colisões Double. Inversão de chaves step mantém hold à
  esquerda, não promete reprodução temporal reversa exata. Travas incluem grupo
  e descendentes afetados. Exclusão em massa indexa tempos uma vez por trilha;
  duplicação confere orçamento antes de copiar. Cada confirmação é um undo.
- `SceneAnimationPlayer` é sessão com um callback pendente, sem autostart nem
  gravações no editor. Pausa captura frações; seek mostra o final exato; gerações
  descartam callbacks antigos. Erros de cálculo/desenho param e são publicados.
  Hook pausa em revisão/blur/ocultação/movimento reduzido, retém cursor limitado
  ao reabrir o mesmo clipe e libera fonte/pose ao desmontar. Não reter pose de
  revisão anterior se a nova falhar; limpar e apresentar o erro.
- Canvas assina poses sem setDocument por frame; perda de contexto/desmontagem
  pausam e erros de desenho são publicados no player. Viewport usa matrizes de
  pose também para bounds/pivô/câmera, desabilita edição da pose original durante
  a prévia e não redesenha matrizes constantes. `prepareSceneBounds` guarda caixas
  locais por índice/revisão; outro dono é recusado. Não reler vértices por frame
  nem reter cache de histórico. Locators/helpers também precisam caber em Float32.
- Modelar/Animar são modos de sessão; timeline e editores de clipes são lazy.
  Animar esconde comandos destrutivos de modelagem, inclusive Delete. Seleção,
  comando, Escape e saída pausam. Gravar chave é explícito e confirma a revisão;
  formulários renovam campos após undo sem perder o foco do botão de gravação.
  Ângulos apresentados podem ser arredondados, mas campos inalterados preservam
  o quaternion original exato. Nenhum formulário arredonda tempos/vetores Double.
- Presets produzem clipes independentes/editáveis, com validação de orçamento
  antes da geração. Prévia de clipe é explícita no player: chaves próprias e
  validadas, geometria pertencente à revisão original. Nunca substituir o asset
  ou registrar histórico/autosave para experimentar. Não iniciar reprodução só
  ao preparar. Confirmação exige revisão/seleção/fonte ainda válidas; interrupções
  descartam a prévia. Cancelar restaura cursor/clipe anterior pausado, mas não
  interfere numa escolha reentrante de outra fonte. Liberação remove referências.
- Gravar poses usa `setSceneAnimationKeys`, com uma fronteira de cena por lote;
  não repetir um comando completo por canal/peça. Conferir custos antes de copiar
  valores excedentes e preservar chaves/canais intocados. Clipboard local possui
  só valores/nome, nunca geometria/imagens. Colar preserva curvas existentes,
  trabalha nas raízes escolhidas e não mistura pose absoluta/delta sem conversão.
  Espelhamento é local (S × TRS × S), não mapeamento de lados de um rig.
  Ações passadas diretamente aos controles, como seek, precisam manter seu vínculo.
- Alças em Animar usam `SceneAnimationPoseGesture`, nunca `editor.replace` ou
  recompilação de clipe por ponteiro. Capturar índices/valores/curvas uma vez;
  prévias mantêm documento e revisão exatos, sem histórico/autosave. Gravar pose
  confirma só canais alterados em um undo. Autokey é opt-in e só confirma ao
  soltar um gesto válido; ativá-lo não grava uma pose já pendente. Cancelar um
  arrasto restaura a prévia anterior; cancelamento geral/interrupção libera o dono.
  Não decompor matriz autoral: TRS derivado valida shear, sinais e recomposição.
  Translação/escala uniforme preservam quaternion exato; eixos singulares ou
  ajustes não representáveis orientam aos campos, sem aproximar a forma original.
- Habilitação de alças na pose é explícita; pintura e seleção de componentes
  continuam desabilitadas. Canvas assina rascunhos diretamente, sem documento
  por frame. Viewport captura ações no início do gesto, cancela ao desmontar e
  ignora pointer-up atrasado: não encaminhar o fim a ações de outra instância.
  Troca de miniatura também muda o objeto dono: reabrir clipe/cursor pausado,
  sem criar histórico, ou descartar prévia temporária; não reter pose órfã.
- Faixas de animação desenham marcas por pixel, com cursor separado: não gerar
  DOM por chave nem repintar o bitmap por frame. Teclado conserva tempos exatos.
  Edição em conjunto valida referências, destinos/custos e travas atomicamente;
  não sobrescrever colisões ou aceitar deslocamentos que desapareçam em Double.
  Ferramentas por intervalo só montam abertas e descartam rascunhos ao mudar dono.
- Exportação hierárquica prepara nós em `prepareSceneGlbHierarchy`: local absoluto
  e delta têm alvos distintos, com delta depois da base; filhos se ligam à folha.
  glTF não aceita shear num único nó. `affineTrsChain` produz dois TRS derivados,
  nunca uma substituição do documento: Jacobi limitado, sinais/posto preservados,
  recomposição por coluna <=1e-12, falha explícita se não representar com precisão.
  Rotação de base ortonormal usa `rotationQuaternion`, comum às alças derivadas.
  Espelhos clonam caminhos de ancestrais sob reflexão de mundo e compartilham
  somente caminhos do mesmo plano, não arrays mutáveis nem malhas de ancestrais.
  Expandir no máximo 16.384 nós; ocultos e seus espelhos ficam fora da saída, salvo
  transformações necessárias aos ossos de peças visíveis. Não revelar as malhas desses
  apoios; relatar exclusões e dependências separadamente. `encodeSceneGlb` liga essa preparação ao binário
  interno: malhas por geometria/material, atributos compartilhados e PNGs por uso.
  Container comum ao legado, bytes compatíveis; GLB e pixels derivados têm tetos
  independentes de 32 MiB. Não confundir com orçamento menor do Studio.
- `SceneGlbMaterials` compõe base SOB pintura e converte só fatores sRGB para linear.
  PNG converte linhas bottom-up para top-down junto com reflexão V no GLB (lote 187).
  Dados usam fundo neutro; G derivado é invertido se normalFlipY não for true,
  compensando a bitangente refletida. Rugosidade G/metal B combinam grades via MMC
  <=1024 por eixo (ampliação inteira NEAREST), nunca resize aproximado silencioso.
  Ocultos, faces descartadas, geometria solta, primeiro quadro de flipbook e
  tangent space dependente do runtime exigem aceite explícito de relatório.
  Não inventar tangentes que troquem o shader nativo por outro sem explicar a perda.
  Khronos Validator é somente teste/dev, com avisos esperados conferidos por código,
  nunca ignorados. UI/cloud continuam sem ativação.
- `prepareSceneGlbAnimations` compartilha samplers entre alvos espelhados, separa
  local/delta e preserva duração por holds. STEP/LINEAR diretos; smooth vetorial
  usa Hermite por segmento. Quaternion smooth e mistura STEP/outras curvas são
  aproximações relatadas, nunca equivalência exata. Amostragem smooth limita erro
  pré-Float32 a 0,1 grau ou 1/1024 da excursão; salto misto usa o predecessor
  Float32 da chave. Recusar colisões de tempos/amostras, overflow e duração zero.
  Tetos: 262.144 chaves derivadas/65.536 canais. Não normalizar chaves autorais:
  quaternions unitários só na saída. Clipes vazios/ocultos são relatados.
  Benchmark integral ultrapassa 50 ms; integração UI deve usar worker cancelável.
- `sceneStudioCompatibility` confere uma cópia contra os limites atuais dos dois
  runtimes Studio, não o orçamento do jogo inteiro. No GLB nativo, malhas carregadas
  pelo GLTFLoader são primitivas × instâncias (`stats.drawCalls`), não definições
  (`stats.meshes`) nem só peças. Calcular base64 pelo comprimento + prefixo/padding,
  sem alocar string. Aviso de destino não concede perdas nem impede export portátil;
  clipes ainda exigem Jogo 3D Avançado e a ponte pública nativa não está ativada.
  `stats.bones` conta nós distintos citados por skins exportadas, incluindo juntas
  refletidas, mas sem repetir ossos compartilhados por vínculos/materiais. O limite
  de 256 ossos vem do motor avançado; o básico ainda não tem contrato de clones de
  esqueleto. Orientar peças vinculadas ao Avançado mesmo sem clipes; testar 256/258
  contra GLTFLoader real e o protocolo deve exigir estatística finita/inteira limitada.
- `sceneGlbRequest` compacta somente chaves do pedido privado em Float64 e códigos
  de curva, sem alterar documento/persistência/encoder. Validar campos reservados,
  tipos sem coerção e limites agregados antes de alocar; reconstruir no worker e
  passar pelo leitor nativo estrito. Ausência de clipes difere de lista vazia.
  Geometria/pixels continuam clonados, nunca transferidos da fonte. Medir a chamada
  síncrona inteira, incluindo empacotamento, não apenas `postMessage`.
- `sceneGlb` worker lê documento v2 estritamente e responde com id/revisão, relatório
  e GLB de buffer próprio transferido. Nunca espalhar o pedido inteiro no envelope
  nem transferir pixels autorais. `useSceneGlbExport` prepara, mas só baixa em clique
  explícito; qualquer aviso exige aceite vinculado àquela resposta. Edição/undo,
  troca de editor, blur/ocultação e fechamento invalidam bytes/callbacks. Miniatura
  e estado de salvamento não mudam GLB. Não gravar histórico/autosave nessa sessão.
  `SceneGlbExportPanel` agrupa avisos por código; sem DOM por face/chave.
  Falha do worker nunca recai em encoding síncrono na UI. Não confundir o check
  de transporte/container com validação completa de GLB externo.
- Clipes exportados têm nomes únicos; desambiguar apenas a cópia GLB, preservar nomes
  autorais já únicos e reservar nomes originais antes de escolher sufixos. Renomeação
  exige aceite e proveniência. Manifesto de no máximo 64 clipes deve corresponder às
  estatísticas, sem ids/nomes repetidos; UI apresenta esses nomes e não infere loop do
  jogo a partir do loop autoral. Dialog inclui o primeiro summary no trap de foco,
  mas exclui descendentes de details fechado fora desse summary.
- Núcleo `scene/skin*` integra o campo opcional `skins` do documento v2 interno. Junta referencia
  grupo/locator existente; pesos completos por ponto de malha explícita, no máximo
  quatro por ponto. Bind preserva matriz afim; normalização é ação explícita, não
  sanitização. Orçamento de pontos considera cada vínculo, mesmo em geometria
  compartilhada. `skinPose` prepara buffers Double próprios e paleta por junta; o
  deformador CPU é oráculo/bake, não deve reconstruir a geometria no loop visual.
- `readSkin` lê estrutura/valores próprios; `skinIndex` checa referências/custos sem
  normalizar nem copiar os pesos a cada comando. Bind pertence à instância de malha,
  não à geometria compartilhada; comandos de pesos preservam linhas intocadas.
  Recapturar bind exige ação explícita. Duplicar remapeia juntas copiadas e mantém
  juntas externas; apagar a peça remove seu vínculo, apagar junta usada recusa.
  Pivô vinculado/topologia sem pesos precisam desvincular antes. Trava herdada da
  peça protege o vínculo sem exigir editar as juntas. GLB interno inclui skins com
  relatório de conversões; jamais ignorar o campo ou recapturar IBMs silenciosamente.
- `sceneGlbSkin` compartilha JOINTS_0/WEIGHTS_0 por vínculo, não por geometria; usa
  faceIds/cornerIndices existentes, inclusive em pontos coincidentes. IBMs completos
  viram MAT4 Float32 próprios; recusar overflow, singularidade após arredondar e peso
  positivo que desapareceria. Sem normalização autoral. Referências de força zero
  usam índice zero só na cópia; arredondamento e simplificação são relatados.
  Esqueletos de espelhos clonam juntas/caminhos por plano, com raiz comum quando
  juntas nativas vêm de raízes distintas. Herança de transformação da peça deve
  permanecer no nó de desenho: achatá-lo na raiz preserva posições mas troca culling
  de escala negativa e normalMatrix no Three. O teste de orientação/normais reproduziu
  essa regressão; não substituir por doubleSided. Khronos emite um aviso esperado
  NODE_SKINNED_MESH_NON_ROOT por instância vinculada, sem erros; conferir os códigos,
  não suprimir o validador. Relatório skin-render-space exige aceite e explica que
  iluminação/lados podem variar em outros programas. Isto não homologa outros
  consumidores, GPU, hardware ou o bridge público.
- `skinDraw` segue faceIds/cornerIndices do triangulador e recusa pesos positivos que
  somem em Float32. Bounds derivados por junta incluem erro dos pesos/arredondamento.
  `SceneSkinResource` possui geometria/atributos e Skeleton, mas não materiais do
  chamador. Ossos planos recebem paleta local; hierarquia/timeline não são duplicadas.
  Pré-validar poses antes de tocar recursos vivos; só compartilhar esqueleto entre
  instâncias da mesma deformação (por exemplo, espelhos). `SceneRenderResource` compila
  vínculos indexados e prepara todas as paletas antes de aplicar qualquer uma. Fechar
  sobre dados próprios impede alterar uma pose preparada; outro instante/descarte
  invalida sua aplicação. UV precisa atingir também os atributos próprios da skin,
  inclusive quando pesos e UV mudam juntos. Reutilizar recursos ao renomear vínculo,
  pintar ou mover juntas. Controles de vínculo ficam no diálogo contextual lazy da oficina.
- Limites visuais da skin são snapshots próprios por nó e revisão de desenho;
  `sceneBounds` aceita substituição local por nó para enquadrar/contornar sem reler
  vértices por pose. Null substitui a geometria, não significa fallback. Espelhos
  usam o mesmo limite local transformado. Oclusão de SkinnedMesh faz snapshot Double
  por consulta e indexa por objeto, nunca só pela geometria compartilhada; não deixar
  BVH ou atributos de consulta no recurso renderizado nem fazer bake por frame.
- Componentes de peça vinculada editam a forma-base, com rótulo/aviso explícitos.
  `setFormBase` troca Mesh/SkinnedMesh, conservando recursos e pesos; espelhos seguem
  a peça e outras skins não mudam. Poses são validadas antes de sair da forma-base.
  Não reabrir componentes durante pose; criação diferente limpa o modo, mas revisões
  da mesma criação preservam o gesto/edição. Bounds ignoram substituição de skin só
  na peça em forma-base. Essa visualização não cria histórico nem recaptura bind.
- `skinSuggestion` sugere pesos iniciais em coordenadas mundiais Double: rígido por
  junta mais próxima ou segmento entre ancestrais escolhidos, com no máximo duas
  influências. Empates são ASCII estáveis; coincidência não inventa segmento nem
  divisão uniforme. Não substituir vínculo existente ou descartar forças positivas
  irrepresentáveis. Não é vinculação anatômica/heat binding.
  Worker recebe somente dados próprios, com token e floresta de juntas validada;
  devolve índices Uint16/pesos Double, nunca documento. Conferir índices, somas,
  custos e dono antes de expandir pesos. Cancelar termina CPU e ignora mensagens
  atrasadas. O retorno constrói linhas próprias já validadas e confere soma/duplicação
  sem repetir o leitor autoral por ponto. Comparar os hashes do benchmark ao otimizar;
  lote 110 reduziu retorno, não eliminou custo síncrono de preparação/envio.
- `useSceneSkinBinding` guarda somente sessão: parâmetros, cálculo cancelável e
  revisão de criar/remover/recapturar. Confirmar usa comandos puros com um undo;
  rebind sem mudança não cria histórico. Não aplicar respostas ou confirmações de
  nó/editor/criação/revisão/parâmetros antigos; blur/ocultação/fechamento cancelam.
  Miniaturas não invalidam a revisão e sua versão mais recente é preservada no commit.
  UI não inventa apoios nem substitui pesos existentes. Rever consequências de
  remover/rebind, respeitar travas e explicar a restrição temporária de exportação.
  Revisão atual é resumo dos pesos, não prévia gráfica da deformação. A abertura
  cancela gestos; o modal bloqueia atalhos e devolve foco. Não ativar formato público.
- `skinJoints` captura relação inicial somente da junta adicionada. `addSceneSkinJoint`
  preserva IBMs antigos e pesos, inclusive quando uma junta antiga está em escala zero.
  Não rebindar nem dar força implicitamente. `removeSceneSkinJoint` exige zero uso
  positivo (sem epsilon) e limpa só slots zero desse osso; não normaliza o resto nem
  apaga nós/clipes/outros vínculos. Contagens de uso percorrem no máximo quatro
  influências por ponto em uma passagem. O modal revisa consequências antes do
  commit único e invalida confirmações em perda de contexto, além das outras guardas.
- `SceneSkinWeightEditor` é rascunho lazy, sem prévia/gravação autoral. Pontos de
  faces/linhas são deduplicados; misturas diferentes começam vazias e exigem aceite
  para uniformizar. No máximo quatro ossos do vínculo; remover influência e ajustar
  total são escolhas independentes. Porcentagem abreviada não é a fonte de um peso
  Double não editado; rejeitar underflow no parse/divisão/desenho, sem zerar forças.
  Confirmar usa `setSceneSkinWeights` com COW e um undo; no-op não arredonda nem grava.
  Dono inclui editor/revisão/seleção e bloqueio de gestos; desmontar, seleção, arrasto,
  fechar, blur/ocultação/perda de contexto revogam rascunhos/callbacks. Outro store com
  IDs/revisões iguais precisa de chave visual nova. Miniaturas não mudam esse dono.
- `SceneSkinWeightOverlay` mostra pesos guardados nos pontos autorais da forma-base,
  inclusive pontos soltos. Buffers próprios limitados, compartilhados entre original
  e espelhos; RGB linear, tamanho em tela, sem tone mapping. Não mudar materiais,
  pixels, pesos ou histórico. Cor não substitui valor exato nos controles numéricos.
  Preparar antes de substituir revisão visível; reutilizar atributos e evitar uploads
  para valores iguais. Fora de componentes/visibilidade, liberar recursos. Isolamento,
  seleção através e matrizes afins continuam governados pelo viewport. Não reutilizar
  foco de mapa em outra criação ou após excluir o osso/encerrar componentes. Esfera
  não faz culling sob shear; custos extremos/GPU precisam de medição real.
- `SceneSupportOverlay` é apresentação, não esqueleto persistido: origens mundiais
  de grupos/locators, não bones planos da skin. `Ver apoios` ativa x-ray explícito;
  picking 44×44 px usa distância em tela, profundidade e ID ASCII. Respeitar
  ocultação/travas, suspender durante componentes/pintura e não incluir guias no GLB.
  Três buffers/geometrias/materiais próprios e limitados, reutilizados nas poses;
  pré-validar dados antes de substituir o quadro. Isolamento mantém ossos associados
  acessíveis às alças/limites sem revelar outras malhas. `includeGroupOrigins` em
  bounds é opt-in para esses guias, preservando os limites anteriores quando desligados.
- `SceneUvCutPicker` possui foco próprio, não altera a seleção 3D. Bitmap/teclado
  escolhem face e borda por cantos; não produzir uma opção DOM por face da malha.
  Destaque `activeEdge` do canvas é visual, não uma alça de edição autoral.
  Marcadores são instruções com dono por malha/revisão/seleção, descartados em
  troca de dono; o efeito libera a referência anterior. Modificar marcadores
  cancela a prévia. Preservar cortes existentes e marcadores explícitos se unem
  somente dentro do worker; confirmar continua sendo uma edição UV com COW/undo.
- `geometryUv` só prepara patches quando a topologia, posições e materiais
  imutáveis comprovam uma mudança apenas de UV. O mapeamento de cantos derivado
  mantém diagonais/winding e acompanha faces removidas por precisão. Diagnósticos
  e outras mudanças usam builder integral. Validar todos os recursos antes de
  aplicar patches; manter BufferGeometry/atributos/bounds/grupos. Um envelope de
  upload limitado acumula alterações até `onUpload`, inclusive antes do primeiro
  desenho. Double invisível em Float32 atualiza a fonte sem novo upload. O mapa
  de cantos não é documento nem atributo GPU; não cachear revisões históricas.
- `meshUvCorners` move só o canto escolhido e alinha bordas copiando dois UVs
  exatos da referência, apenas entre faces selecionadas com material/orientação
  compatíveis. Não confundir com marcação autoral de costuras/unwrap. Alças UV
  congelam layout, passo, callback e revisão; contorno SVG é sessão, sem pintura
  ou documento por amostra. `sourceKey` inclui documento/revisão/nó; alterações
  externas cancelam mesmo conservando a referência da malha. Captura exclusiva,
  amostra final, cancelamento em blur/ocultação e confirmação única são comuns
  a ponteiro e teclado. Clique sem deslocamento não arredonda UV nem cria undo.
- `meshDiagnosis` produz observações, não infere intenção: bordas abertas,
  coincidências e orientação não são reparadas automaticamente. `sceneMeshCheck`
  executa conferência/reparo em worker cancelável com token de documento/revisão,
  protocolo estrito e buffers próprios. `useSceneMeshCheck` compartilha o gesto
  transacional de malha: preview COW, confirmar com um undo, Escape/blur/ocultação/
  revisão externa cancelam. Relatórios retêm apenas a fonte ainda viva; fechar
  libera a referência. Faces repetidas exigem UV/material/orientação idênticos.
- `scene/meshFaces` mantém coordenadas/UV autorais ao apagar/soltar/triangular/virar.
  Soltar duplica apenas vértices compartilhados fora da região; apagar faces não
  apaga pontos/arestas independentes. Virar recusa mudanças de diagonais que poderiam
  reprojetar pintura. `editSceneMesh` centraliza travas, copy-on-write e orçamento.
  Modo/seleção de pontos, linhas e faces são sessão. `SceneComponentOverlay` possui atributos próprios,
  compartilhados só entre seus overlays; não emprestar atributos do modelo a uma
  geometria descartável. Proxies double-sided de picking nunca são renderizados.
- `meshTopology` centraliza incidências/IDs locais. Extrusão nativa conserva UV dos
  caps e não cria paredes internas; regiões precisam ser planas e orientadas.
  Inset é proporcional por face convexa/plana, com UV afim comprovado; não reprojetar
  pintura incompatível silenciosamente. `sceneMeshGesture` reusa o coordenador e
  repete IDs em prévias absolutas; COW não pode criar uma geometria por amostra.
  Confirmar cria um undo e cancelar restaura também o disco. UI suspende outras
  operações de face durante a prévia e cancela em interrupções/fechamento do painel.
- Alças de componentes usam `sceneComponentTransformGesture` sobre o gesto de malha: delta de
  mundo conjugado pela matriz inicial, sem decompor shear, uma atualização por ponto
  compartilhado e identidade exata sem undo. `meshVertices` preserva UV/topologia;
  os pontos ligados também alteram faces vizinhas. Centro da alça deriva dos pontos
  escolhidos em mundo. Ressincronizar a mesma seleção não pode cancelar o arrasto.
  Roteie callbacks pelo dono do gesto, não pelo modo atual da UI.
- Superfícies acima de 1024 faces usam `sceneSurfaceSession`: um Worker por prévia,
  um pedido em voo e só o último valor pendente. Validar cabeçalho/token antes de
  reconstruir o pacote atual com `readSceneMeshPacket`; obsoletos não entram no domínio.
  Não transportar imagens/documento nem transferir buffers autorais. Cancelamento
  termina o Worker; confirmar aguarda a resposta atual. Worker não elimina custo de
  clone/validação principal: benchmark do lote 40 ainda excede 50 ms. Não afirmar
  fluidez/hardware só porque o cálculo foi deslocado. IDs importados como `__proto__`
  são dados próprios: acumuladores de IDs arbitrários não devem usar setter herdado.
- Respostas de malha usam `sceneMeshPacket` privado, com Float64 autoral e índices
  tipados. Validar todos os limites/tipos/referências ao reconstruir. Só os cinco
  buffers derivados do pacote são transferidos; nunca buffers de imagens/histórico.
  O Worker ainda usa `readSceneGeometry` antes de empacotar. Medição compacta do lote
  41 reduziu intervalos de timer, mas não comprovou limite de 50 ms/GPU/hardware.
- `meshSubdivide` usa níveis absolutos 0–3, sem suavizar/snap. Um midpoint topológico
  por aresta, UV interpolado por canto; ajustar vizinhos/arestas soltas ligados para
  não introduzir T-junctions. Pré-validar orçamento completo e pintura afim também
  nos vizinhos. Cantos retos inseridos por uma divisão anterior não são concavidade.
  Subdivisão sempre usa Worker, pois o resultado cresce por nível; selecionar filhos
  em passagem linear e restaurar a seleção original no zero/cancelamento.
- Contrato portátil com skin do lote 117: `testing/sceneStudioSkinContract` produz
  GLB e oráculo CPU Float64 com IBMs afins, juntas ocultas, dois espelhos e clipes
  local/delta. `scripts/print-scene-studio-contract.ts --skin` somente imprime;
  comparar a fixture Studio integralmente antes de alterá-la. Não importar runtime
  Studio no Molda nem o inverso. O consumidor avançado testa poses, independência,
  pausa, reciclagem e descarte de recursos. Zero erros Khronos, três avisos esperados
  de mesh com skin fora da raiz, sujeitos ao relatório de perdas. Não confundir
  esse contrato automatizado com homologação GPU, motor básico ou ponte pública.
- Pintura de pesos nativa (lote 119): `skinPaint` usa o campo `meshDistanceField`
  em mundo pelas arestas de faces, sem atravessar arestas soltas; movimento suave
  continua usando todas as arestas. Campos pertencem à geometria imutável de um
  traço e não são caches globais. Cobertura é máxima por ponto/traço, não acúmulo
  por evento. `skinPaintWeights` conserva ordem/zeros e redistribui apenas os outros
  ossos existentes; quinto slot, destinatário ausente e precisão são recusas
  explícitas. Força parcial não pode arredondar silenciosamente para zero/100%.
  `sceneSkinPaintGesture` publica somente deltas de cor próprios, sem replace do
  documento/autosave; confirmar faz um comando esparso. Revisão de conteúdo revoga
  o dono; miniatura/save são preservados. Limpeza pode reentrar: tickets protegem
  o traço novo de callbacks antigos. Domínio/transação não significam UI pronta,
  geodésica exata, interpolação contínua de ponteiro ou desempenho homologado.
- Entrada de pintura nativa (lote 120): `CapturedPaintInput` compartilha captura
  exclusiva entre UV/imagens e forças, sem decidir o que é pintado. Capturar só
  depois de conferir que `begin` conservou o dono; a amostra final não pode confirmar
  um gesto cancelado. Liberar captura antes de chamar `end`. `lostpointercapture`
  não significa dedo levantado: conservar os contatos até `pointerup/cancel`,
  inclusive fora do canvas, para impedir retomada por um terceiro dedo.
  `sceneSurfaceHit` considera o obstáculo visível mais próximo mesmo trancado.
  `sceneSkinPaintPick` só aceita forma-base, resolve face autoral e desfaz apenas
  a reflexão em mundo do espelho, conservando shear/escala da origem.
- Prévia do mapa de forças usa atributo próprio e deltas esparsos por token. A
  primeira mensagem vazia abre o dono; tokens encerrados entram em WeakSet. Validar
  a amostra inteira antes de escrever cores. `markSceneAttributeUpload` mantém um
  envelope limitado até `onUpload`, compartilhado com UV. Trocas de fonte/alvo,
  ocultação e descarte encerram a prévia; `sameSceneContent` compara COW ignorando
  somente miniatura e timestamp de save. Não reutilizar esse teste raso para validar
  documentos mutados in-place. Benchmark `scripts/bench-scene-skin-paint.ts` conserva
  hashes do lote 120: movimentos locais baratos, mas preparar/confirmar 131.072
  pontos excedem 50 ms; relatório em `.audits/molda-evolution/skin-paint-l120.md`.
- Confirmação preparada de pesos (lote 121): `stroke.commit` aceita somente seu
  patch privado e conteúdo COW original (miniatura/save podem mudar). Compartilha
  `patchSceneSkinWeights` com o comando geral, que continua integral; mantém
  orçamento, pertença e bounds. Não expor parâmetro para índice/patch externo nem
  usar identidade rasa com documentos mutados in-place. 64 casos diferenciais
  comprovam equivalência com `setSceneSkinWeights`. No extremo, confirmação p95
  179,723 → 50,099/47,412 ms, hashes fixos preservados; preparação ainda >50 ms.
  Evidência e experimento descartado: `.audits/molda-evolution/skin-paint-l121.md`.
- Oficina de forças (lote 122): `sceneSkinPaintSession` conecta um viewport por vez;
  cada conexão copia ajustes e possui seu gesto descartável. Constructor/factory
  não assina o editor; efeitos podem conectar novamente no StrictMode. Fonte visível
  deve corresponder ao conteúdo atual antes do começo. Deltas vão diretamente ao
  viewport, contadores estáveis só aos controles; não colocar documento/Map de prévia
  em estado React. Interrupções centrais também cancelam pintura, inclusive comandos
  sem mudança de revisão. Miniatura não desmonta a conexão; revisão cancela o traço.
  Callbacks/cleanup antigos não atingem conexões novas; tickets de notificação evitam
  status obsoleto após cancelamento reentrante. Só observar desliga o pincel; Escape
  dentro do canvas desliga primeiro o pincel, sem sair da forma-base. Controles e
  cores não são prova de revisão visual, geodésica exata, cursor ou entrada contínua.
- Índice de vínculos (lote 123) enumera chaves/valores próprios na mesma ordem,
  depois das guardas de contagem. O array contém referências temporárias, sem
  tupla/cópia de influência/cache global. Não trocar por lookup de propriedade
  sem medir: preparação de 131.072 pontos p95 86,710 → 65,635/71,000 ms, ainda
  acima de 50 ms. Prova/limitações em `.audits/molda-evolution/skin-paint-l123.md`.
- Correspondência de pontos (lote 124): reusar as chaves já enumeradas da geometria.
  Contagem igual mais igualdade completa da sequência prova presença; só então
  dispensar consultas `hasOwn`. Ordem divergente, inclusive válida, conserva o
  laço individual e seus erros. Não ordenar, criar cache ou dispensar validação de
  influências. Preparação extrema p95 95,405 → 53,447/83,023 ms, ainda variável e
  acima de 50 ms; evidência em `.audits/molda-evolution/skin-paint-l124.md`.
- Cursor do pincel (lote 125): `SceneBrushCursor` é referência tangente de raio em
  mundo, não fronteira geodésica. Normal deriva da inversa transposta da instância;
  ponto visível do espelho é separado da amostra em mundo da origem. Buffers próprios
  lazy, reutilizados, descartados uma vez; guia não representável é oculto, sem
  limitar a operação. Hover não cria histórico/estado React; captura reaproveita
  o mesmo acerto. Mudanças de câmera/cancelamento/saída limpam o guia. Consultas
  `sceneSurfaceHit` atualizam matriz da câmera antes do raycast: pode haver entrada
  depois de navegar/blur e antes do próximo render sob demanda. Testar essa ordem
  sem inserir um frame para mascarar matriz obsoleta. Sem homologação visual/GPU.
- Entrada agrupada (lote 126): `CapturedPaintInput` processa subeventos registrados
  de pointermove OU seu resumo, nunca os dois. API ausente/lista vazia usa o evento;
  pointerup conserva posição final. Não pintar posições previstas nem ouvir rawupdate.
  Conferir identidade do dono antes/depois de cada pick; cancelamento/troca no meio
  do grupo revoga posições restantes. Captura é compartilhada com imagens: testar
  igualdade de trajetórias UV/pesos, acertos ausentes e undo, não apenas callbacks.
- Dois segmentos (lote 127): `twoBoneReach` é solver geométrico euclidiano puro,
  não IK conectado à UI/timeline. Conserva comprimentos com prova de reconstrução;
  alvos fora de alcance recebem status, nunca stretch silencioso. Reporta escolha
  da dobra (indicação/pose/eixo) e usa unidades do maior comprimento. Coordenadas
  sem precisão para preservar os segmentos são recusadas. Base afim não uniforme
  muda a métrica: não usar o solver para justificar decomposição aproximada ou
  mudanças de escala/translação dos ossos na animação. Prova em
  `.audits/molda-evolution/two-bone-l127.md`.
- Prévia de rotações (lote 128): `prepareSceneAnimationRotationPreview` conserva
  canais/matrizes fixos no tempo e reusa a composição da reprodução. Não colapsar
  alvos aninhados em raízes de seleção: raiz e descendente podem girar no mesmo
  ajuste. Saídas possuem inclusive matrizes estáticas; entradas não são retidas.
  Amostras não consultam geometria, pixels ou chaves originais. Base local afim é
  recusa explícita; local-delta conserva a base inteira. É desenho de sessão;
  locks/revisão/orçamento de escrita pertencem ao adaptador/comando seguinte.
- Articulação preparada (lote 129): `twoBonePose` resolve uma cadeia direta no
  referencial do pai da raiz e escreve somente rotações. A prévia precisa reconstruir
  eixos/origens conservando canais T/S e bases originais; recusar shear/precisão,
  não decompor dados importados para fazê-los caber. `rotationBetweenDirections`
  usa atan2 para o arco mínimo e eixo determinístico no antiparalelo exato. Chaves
  privadas em WeakMap impedem forjar commit alterando saídas; cancelar revoga tudo.
  Commit usa documento atual explícito, COW e comando geral. Sem UI ou autogravação.
- Guia de articulação (lote 133): `SceneAnimationPose.twoBoneGuide` é efêmero,
  nunca chave/documento. `SceneSupportOverlay(4)` reaproveita desenho com 192 bytes
  de atributos de posição; não alocar todos os nós para quatro pontos. Destino
  pedido difere da ponta limitada; não aproximar o destino para torná-lo desenhável.
  Mudança só de guia deve atualizar mesmo com matrizes iguais, sem RAF/upload se
  os atributos não mudaram. Reset/playback/commit retiram metadados, blur/contexto
  escondem a guia. Não adicionar captura de ponteiro ou picking na guia visual.
- Arraste assistido (lote 134): `transformActions` captura dono e entrada de cada
  alça; callbacks antigos não podem ser redirecionados ao gesto atual. Destino
  usa translação privada a partir do frame inicial, não ponta limitada/metadados
  visuais. Soltar mantém prévia, cancelar restaura a anterior; jamais autokey.
  Campos bloqueados durante movimento e sincronizados ao final. `setPose` também
  observa entrada/saída de guia mesmo com matrizes iguais para restaurar a alça.
  Reusar captura/multitoque existente; testes sintéticos não homologam hardware.
- Conjuntos de poses (lote 135): captura conserva cada ID escolhido, inclusive
  pai/filho, usando um índice de hierarquia/trilhas. Colagem simples ainda reduz
  a raízes. Snapshot possui somente IDs/nomes/canais próprios; leitor estrito,
  teto de nós, espaço único. Correspondência cobre cada origem e destino uma
  vez, sem nomes/ordem implícitos. S * TRS * S é local, não retargeting global.
  `sceneAnimationPoseKeys` compartilha interpolação por destino; conjunto passa
  uma vez por `setSceneAnimationKeys`, com travas/orçamentos e undo atômicos.
- Prévia de conjuntos (lote 136): dono `pose-set` na mesma sessão, `kind` derivado
  do dono, candidato privado e desenho com a fonte original. Autokey/alças não
  gravam colagem; confirmar exige fonte/revisão/tempo e geração exatos. Hook é
  vinculado também à abertura: painel fechado ou callbacks de uma abertura
  anterior não podem iniciar outra prévia. Mapa/eixo retiram a entrada própria;
  não cancelar/substituir outro dono no mesmo contexto. UI mantém um seletor de
  destino para todos os pares, nomes únicos legíveis e IDs só para desambiguar.
  Clipboard de números permanece no mesmo projeto, não atravessa criações.
- Skins glTF (lote 148): juntas únicas/ordenadas, skeleton ancestral e raiz comum;
  memberships de cena não podem vir de outra cena. Índice iterativo de subárvores,
  sem recursão/caminhada de pais por junta. Orçamento antes de ler/copiar índices.
  MAT4/Float com linha final afim, sem target/stride/view de malha; count pode
  exceder juntas. Ausente significa identidade, singular não é inválida no glTF.
  Manter referência ao accessor e conferir valores uma vez por chamada, mas count
  por skin. Não confundir metadados com pesos válidos/conversão de binding nativo.
- Rasters glTF (lote 147): planejar só índices selecionados e todo o orçamento
  RGBA (32 MiB, PNG16 a oito bytes/pixel) antes do primeiro decoder. Aliases são
  intervalos idênticos no mesmo buffer, não hashes; MIME conferido por descritor.
  Planos privados/inalterados até consumo síncrono, nenhuma fonte compartilhada.
  jpeg-js 0.4.4 com preflight de framing/tabelas/scans, limites próprios e do codec,
  sem ICC/EXIF/flip; RGB versus YCbCr segue JFIF/Adobe/IDs. Decoder não é validador
  completo de JPEG nem medição de RAM; CMYK/12 bits/aritmético não suportados.
  Erro preserva causa, nunca fallback/resultado parcial no catch. Worker pendente.
- Pixels PNG glTF (lote 146): decoder puro sem canvas/ICC/gamma/EXIF/flip ou
  premultiplicação; manter RGB sob alpha zero e 16 bits exatos até conversão
  explícita. CRC, layout e tetos antes de pixels; cinco filtros/Adam7 completos.
  Pako 3.0.1 com saída por bloco de 16 KiB e comprimento exato, Adler conferido;
  trailing zlib ignorado conforme PNG, nunca inflar ICC/texto/quadros APNG.
  Não usar fixture decoder como produção nem confundir teto individual com
  orçamento agregado de todos os rasters. Testes incluem oracle libvips real.
- Recursos com imagens glTF (lote 145): `readGltfResources` usa orçamento conjunto
  antes de copiar/decodificar bytes; `readGltfBuffers` compartilha o planejador.
  Views não duplicam armazenamento; arquivo inteiro conta mesmo quando buffer
  usa prefixo. Saída é própria mas compartilhada e somente leitura por contrato.
  Octetos percent-encoded não são UTF-8; caminhos e Data URIs não fazem IO.
  MIME da URI/descritor e roles de accessors exigem conferência posterior. Não
  usar leitor só de buffers na montagem completa para contornar o teto de imagens.
- Nuvem das duas gerações (lote 230): `createMoldaSceneCloudSource` (exportado no barril)
  é o que o host usa para listar, ler, conferir (`inspect`, sem gravar), gravar com
  renomeação, copiar e apagar a geração seguinte. ⚠️⚠️ Promover TIRA o registro do
  inventário v1: sem somar as duas listas, a reconciliação lê a promoção como exclusão e
  apaga o backup da criança. Por isso é UM espelho ciente das duas, nunca dois.
  ⚠️ `MOLDA_MAX_READ_VERSION` agora é 2 (o que o CLIENTE sabe abrir, por qualquer leitor)
  e `MOLDA_V1_MAX_READ_VERSION` continua 1 (o registro do leitor v1, onde o `never` do
  despacho cobra um parser). Quem declara 2 precisa ter a fonte da geração ligada.
  ⚠️ Este é o passo de LEITORES: implantar ANTES de qualquer escritor da geração nova.
- Miniatura da oficina seguinte (lote 229): `SceneViewport.renderThumb()` reusa o
  `ViewportThumbnail` do editor antigo (96 px, mesmo fundo) e entrou no `SceneViewportPort`,
  então todo palco falso precisa respondê-lo. `useSceneViewport` agenda por `onThumb`
  700 ms depois que o desenho assenta e só fotografa a revisão que o palco DESENHOU.
  ⚠️ Com isolamento ativo devolve `null`: foto velha e inteira vale mais que uma nova pela
  metade. A foto é derivada (`setThumb`): nenhum passo de desfazer, nenhuma revisão de
  conteúdo. Criação que ficou para trás só ganha foto quando a criança a abre.
- Oficina seguinte no app (lote 228): `MoldaHostAdapter.sceneWorkshop`, DESLIGADA por
  padrão. Ligada, a galeria lista as duas gerações numa lista só (`GallerySceneSource` no
  `createGalleryStore`) e a oficina É o editor de MODELOS: abrir um modelo antigo o PROMOVE.
  ⚠️ O discriminador é `summary.formatVersion === 2` (a GERAÇÃO), nunca o `kind`: o
  documento seguinte é sempre `kind: 'model'`. ⚠️ As duas gerações vivem no MESMO banco
  (`getMoldaGenerationStore`), porque `storedDocumentKey` resolve as duas na mesma chave.
  ⚠️ `unlistedReadIssues`: criação que a galeria lista NÃO é arquivo ilegível, senão ela
  aparece como cartão e como aviso de recuperação ao mesmo tempo. ⚠️ A inscrição de
  mudanças da cena é assíncrona e o StrictMode a aborta: sem `catch` vira rejeição não
  tratada. ⚠️⚠️ `three-mesh-bvh` tem DUAS cópias no monorepo (o drei do kids fixa a 0.8,
  o Molda usa a 0.9) e cada uma aumenta `BufferGeometry` com o seu `boundsTree`: escrever
  o campo direto reprova o typecheck do KIDS, não o do Molda. Use `setBoundsTree`.
  Pendem antes de ligar: miniatura da geração nova, ramo v2 da nuvem, "Baixar tudo" e
  a ponte do Estúdio.
- Destino da cópia (lote 227): o painel de exportação escolhe entre "Para outros programas"
  (padrão, GLB portátil) e "Para o Estúdio" (`animatedPaint`). ⚠️ O destino faz parte da
  IDENTIDADE do pedido: entrou no `SceneGlbToken` e `readSceneGlbReply` recusa a resposta
  da outra gravação, como recusa outra criação ou revisão. Trocar o destino DESCARTA a
  cópia preparada (consentimento não atravessa gravações). ⚠️ `sceneGlbReply` monta a
  resposta campo a campo, NÃO por espalhamento: campo novo no token exige acrescentar ali
  também, senão o worker responde sem ele e a identidade reprova.
- Pintura animada no GLB (lote 225): `encodeSceneGlb(doc, { animatedPaint: true })` é a
  gravação para o Estúdio; ausente, o GLB portátil continua no primeiro quadro com
  `flipbook-first-frame`. Ligada, a cor base leva a FOLHA INTEIRA, `KHR_texture_transform`
  aponta o primeiro quadro da SEQUÊNCIA (não a célula 0) e o contrato versionado 1 mora em
  `materials[i].extras.molda.flipbook` — o GLTFLoader entrega isso em `material.userData`.
  O contrato leva grade e sequência, NUNCA deslocamentos prontos: o consumidor roda a mesma
  `sceneGlbFlipbookTransform`. A chave do cache de textura inclui a escolha; `extensionsUsed`
  só sai quando algum material usa a extensão. Normal/rugosidade/metal com quadros seguem no
  primeiro quadro, avisando. ⚠️ A folha inteira decide a transparência do material, e a cor
  base entra como FUNDO da composição (base opaca = nenhum quadro transparente). Fora do
  navegador o loader não decodifica PNG: `map.offset` real é gate de browser.
- Ajuda contextual (lote 224): SceneFirstSteps dentro do palco, com chave de projeto,
  leitura por assunto só na sessão. Não recebe editor nem cancela gestos/poses;
  Escape local fecha ajuda, não pintura/pose. Foco no layout sem roubar de modais,
  navegação mantém foco nos extremos. Nomes reais em sceneFirstStepsCopy; sem
  inferir aprendizagem. Integral 2.805/0, tipos/Biome/builds; visual ainda pendente.
- Recorte de transparência (lote 223): alphaMask opcional {cutoff,opacity} no
  material interno; cutoff finito ≥0 (aceita >1), opacity 0–1. Ausência mantém
  blend automático. Não assar alpha em RGBA8: fator e cutoff ficam editáveis,
  separados no shader/GLB MASK. Cutoff zero revela RGB sob alpha zero: somente
  usos MASK preservam RGB da última camada RGBA participante/base. Raster,
  patches, flipbooks, GLB e atlas worker compartilham a política; não modificar
  o compositor antigo por padrão nem juntar chaves de cache incompatíveis.
  SceneMaterialMaskSettings aplica/remove com um undo e foco preservado. Leitor,
  blobs, worker real, atlas e GLTFLoader/validator cobertos; integral 2.800/0.
- Picking de pintura (lote 222): SceneSurfaceQuery retém candidatos BVH por
  geometria estática do SceneRenderResource. Somente a broad phase é indexada;
  campos finais vêm de Mesh.raycast nativo, com matriz/material/UV correntes e
  ordem de root.children preservada. SkinnedMesh/objetos externos são nativos.
  Sem prototype patch, sem mutar atributos de desenho. Cache lazy descartado
  junto da geometria; proxy não retém materiais entre consultas. Oracle exato,
  goldens e integral 2.790/0. Ganho CPU no traço longo tem custo frio/RSS; não FPS.
- Traço de pesos (lote 221): CapturedPaintInput reserva dono antes do primeiro
  picking, mas só envia end se begin já começou. Percurso opcional em tela apenas
  para pesos: 1–16 px CSS sugeridos pelo raio projetado e até 256 pontos sintéticos
  por segmento, sem descartar eventos reais/coalescidos/up. Cada ponto faz picking
  real, não interpolação 3D entre hits. Um undo, geometria/binds/mistura intactos.
  Mudança real de câmera interrompe pinturas preservando contatos ainda pressionados.
  Benchmark `scripts/bench-scene-skin-path.ts recorded|resampled` tem goldens distintos
  por capacidade; somar ao Biome e verificar tipos explícitos do script. Não chamar
  ~79 ms no traço grande de fluidez: picking perfilado ainda exige otimização.
- Preflight de metadata (lote 220): somente a preparação privada da chamada pode
  provar equivalência do corpo completo e bytes correntes. Excluir só quatro campos
  escalares (nome/datas/thumb), validá-los e ajustar custo lógico por structuredBytes.
  Manifesto/índice isolados são apenas estrutura, não prova de integridade. Diferença
  no corpo/pixels exige hidratação completa; CAS relê as mesmas dependências.
  Não expor flag de confiança ou cache de snapshots mutáveis. Ganhos medidos apenas
  em saves de metadata no simulador; hardware/pintura ainda sem aceite geral.
- Writer de blobs (lote 219): preparar/hashar fora de IDB; reler e comparar dependências
  reais no commit, inclusive pixels e presença de recibos, não apenas revision.
  CAS significa primeiro commit, não FIFO entre chamadas. Reusar bytes exatos sem put;
  quota cobra estado final, desconhecidos e retenção conservadora. GC somente de
  candidatos aposentados quando todos os manifests comprovam ausência de referência;
  opacos/futuros prendem candidatos e geram diagnóstico, nunca exclusão especulativa.
  Inline converte no save explícito; promoção já convertida valida blobs fora de IDB.
  sameScenePixelBytes compara palavras/cauda exatas sem cópia; sem hash fraco/cache.
  Ganho de payload não prova ganho de latência/RAM: benchmark 219 ainda regride no teto.
- Reader de blobs (lote 218): snapshot readonly único de manifesto/metadata/blobs,
  integridade fora da transação, custos lógico/físico separados e metadata 1/2.
  Inline writer recusa layout novo; sem GC/migração/rollout. Recibo presente com
  custo zero agora cai na quota raw (duas falhas reproduzidas). Cancelamento de
  abertura rejeita: harness Host sinaliza conclusão também em finally e exige
  AbortError. Integral final 2.727/0, tipos/Biome/Vite/Kids passaram; 90 repetições
  storage e 30 Host. Review blob-reader-l218.md; avisos act históricos continuam abertos.
- Quota de registros futuros (lote 217): guardedWrite agora conta raw de qualquer
  chave molda: não reconhecida, sem confiar em bytes declarado/reparar/apagar.
  Prefixos de outras ferramentas ficam fora; métricas conhecidas, CAS e transação
  permanecem. Três falhas reproduzidas, regressões com codec real e concorrência;
  2.699/0, tipos/Biome/Vite/Kids passaram. Não corrige abas v1 já carregadas nem
  ativa blobs em produção. Review future-record-quota-l217.md.
- Codec de blobs (lote 216): sceneBlob/sceneStorageDocument são computação sem IO.
  Snapshot de todas as camadas/metadata antes do primeiro await; hash de pixels
  crus, não JSON. Ref repetida deduplica armazenamento, nunca buffers autorais.
  Leitores estruturais compartilhados em readDocument não validam relações/bounds;
  hidratação exige leitor completo. Futuro é reconhecido antes do layout. Teto
  32 MiB e ownership/cancelamento/codec portátil testados; 2.696/0 na integral,
  tipos/Biome/Vite/Kids passaram. Writer/GC/migração ainda pendentes. Avisos act em
  ModelEditor.paint.test seguem sem causa provada; review blob-codec-l216.md.
- Contrato/baseline de blobs (lote 215): spec 2026-09-09-molda-blob-persistence.md.
  Documento autoral/backup continuam hidratados; envelope físico terá versão própria
  na mesma chave canônica. SHA de pixels não é CloudPart (hash de JSON). Ledger já
  evita outras cenas; alvo inline ainda é copiado/regravado completo. Novo prefixo
  exige quota compatível; abas v1 já abertas são gate de rollout, não corrigíveis
  retroativamente. Codec/GC/writer ainda não implementados nesse lote. Benchmark
  fake-IDB com goldens e perfil, não browser/disk/GPU; review blob-persistence-l215.md.
- Restaurar cópia nativa (lote 214): ação lazy em SceneStart, arquivo v2 .molda.json,
  leitor JSON limitado + worker cancelável e protocolo próprio. Não aceita ZIP/v1,
  nem repara formato desconhecido. Revisão/player/nome antes de qualquer escrita;
  copySceneProject mantém conteúdo/vínculos com ID/tempos novos, pixels próprios e
  sem miniatura derivada externa (aviso na UI). Host usa o mesmo saveNew CAS nulo
  de vazio/template; cancelar commit já autorizado só impede navegação, não apaga
  a nova cópia. Namespace/arquivo têm ownership. Recebedor rejeita SAB/views parciais
  e confere orçamento de todas as camadas antes de clonar. Integral 2.685/0,
  tipos/Biome/Vite/Kids passaram; avisos act em ModelEditor.test só na integral
  seguem sem causa provada. Review native-project-restore-l214.md na pasta .audits.
- Começo rápido/navegação internos (lote 213): SceneWorkshopHost no playground,
  SceneStart com vazio/seis templates e nome, resumos paginados sem ler pinturas.
  createSceneProject fornece IDs/pixels próprios e não aceita perdas de catálogo;
  gravação CAS nula antes de abrir. Nenhuma demo criada por load/link inválido.
  Rascunho/lista/página/abertura/commit têm ownership de namespace e cancelamento.
  SceneExitControl confirma cancelamento de prévias e aguarda flush completo;
  erro preserva edição/undo, oferece backup e saída com descarte explícito. Host
  não pode chamar flush no cleanup dessa saída. Esc/Ficar cancela só intenção de
  navegação, não escrita já autorizada. Formato público segue 1. Integral 2.675/0,
  tipos/Biome/Vite/Kids passaram; review quick-start-l213.md em .audits/molda-evolution.
- Avisos de persistência interna (lote 212): canal scene-storage por tupla exata
  banco/object store, mensagem fechada e pequena, só após complete de save/remove/
  restore/promote. Conflito/aborto não emite; indisponibilidade não reverte commit.
  createSceneEditorStore expõe storage (observer com ownership por assinatura),
  passado explicitamente ao SceneWorkshop no playground. Reler somente índice;
  mensagem/índice não fornecem token nem certificam documento. Sem troca automática
  de asset/histórico; foco/retorno visível/conferência manual, sem polling. Escrita
  local invalida observação antiga; remount ignora respostas tardias e fecha canais.
  Token CAS agora também fica preso ao ID original do editor: não aceitar outro ID
  mesmo com revisão igual. Integral 2.655/0, tipos/Biome/Vite/Kids passaram. Review:
  .audits/molda-evolution/scene-storage-notifications-l212.md. Abas reais pendentes.
- Fontes CSS limitadas à UI (lote 211): molda.css registra ../components e exclui
  **/*.test.{ts,tsx}; Kids/playground não varrem molda/src inteiro. Não mover
  componentes/receitas para fora dessa fronteira sem atualizar fonte e regressão.
  scripts/check-css-sources.mjs usa compiler/scanner instalados no plugin Vite e
  verifica o CSS real de ambos os consumidores. 913 fontes não visuais removidas,
  golden de produção preservado; pipeline isolado mediano 128,76→49,17 ms, não FPS.
  Integral 2.643/0, tipos, Biome, Vite/Kids passaram. Review: CSS, hashes, métricas
  e limitações em .audits/molda-evolution/css-sources-l211.md na raiz.
- Camadas bbmodel integradas (lote 210): images.layers reject/molda-layers explícito.
  Leitor de todos os metadados de camadas ativas; texto conjunto com fontes raiz,
  planos de recursos/cabeçalhos e orçamento decodificado conjunto antes de inflate;
  cópias autorais por alias também entram no teto de 32 MiB antes de pixels.
  Até 32 camadas inteiras, offset zero/scale um/blend default. Preservar ordem,
  visibilidade, opacidade e pixels ocultos; root fornece dimensões, não pintura.
  Recusar image_data/in_limbo, misturas especiais e imagens parciais sem fallback.
  RGBA16 exige opção existente; nomes/tamanhos anotados/precisão no relatório.
  paint-layers é variante fechada no worker, cruzada com todos os IDs/nomes/pixels
  contabilizados/opacidades e escolhas. Composição Molda explícita, não Canvas
  bit-exato. UI paginada, todas as camadas, cobertura de opções, aceite renovado e
  um undo. Integral 2.642/0, tipos, Biome, Vite e Kids passaram. Sem homologação GPU.
  Limites/review: .audits/molda-evolution/bbmodel-paint-layers-l210.md na raiz.
- Clipes bbmodel integrados (lote 209): remainder.animations reject/omit/convert;
  controllers reject/omit separado (padrão omit só na opção antiga estática).
  clips tem nove opções estritas, mesmo em fonte vazia/estática. Converter usando
  nodeIds da hierarquia real e avaliar bounds antes de recursos/pixels. Seção
  animations do relatório é null estática ou fonte/conversão/contagens/políticas/
  bounds; soma ao orçamento global de 4 Mi UTF-16. sourceName inclui nomes omitidos.
  Receptor valida variantes fechadas, escolhas, custos e identidades e recalcula
  bounds nativos sem avaliar curvas de origem. Não prova origem criptográfica.
  UI tem todos os controles, adaptação sugerida inativa até escolha de trazer,
  nenhuma omissão padrão, resumo com motivos e cinco itens por página, todos
  acessíveis. Player/relatório/aceite novo por ajuste/commit único/undo/redo cobertos.
  Integral final 2.623/0, tipos, Biome, Vite e Kids passaram; Browser indisponível.
  Formato público 1 inalterado; camadas ampliadas no lote 210, PBR completo pendente.
- Limites animados bbmodel (lote 208): assessBbmodelAnimationBounds recebe somente
  saídas nativas correspondentes, TRS local e sem skins. Envelope por clipe inclui
  filhos sem trilhas e vértices sem face, sem misturar máximos entre clipes.
  Arredondamento positivo para cima e tolerância quaternion compartilhada (1e-6)
  envolvem composição e interpolação; dados não são quantizados/clampados.
  Recusa conservadora não prova overflow real nem certifica câmera/normais/GPU.
  Geometria é lida uma vez, sem agenda por FPS. Integral 2.605/0, tipos, Biome,
  Vite e Kids passaram; integração no documento/worker continua no lote 209.
- Planejamento bbmodel (lote 207): planBbmodelClips lê todas as declarações
  conhecidas antes de omissões. Só bone/grupo selecionado/local Euler; global e
  quaternion impedem até animador vazio. Unsupported pode omitir clipe inteiro,
  nunca salvar prefixo de trilhas; budgets/malformado/erro interno/sampling não
  são engolidos. Duração declared positiva ou fit-keys (maior key, mínimo 1/FPS),
  não getMaxLength/snapping. Once/hold/loop viram reprodução independente declarada.
  Peso number 0/vazio -> 1, string '0' -> 0, negativo -> 0 com diagnóstico; sem
  executar Molang. Campos de tempo diferentes de string vazia seguem sem suporte.
  Metadados e unknown têm políticas próprias; contar ocorrências + primeiro path,
  não anunciar lista exaustiva. Markers são omissão de subárvore. Alias/sombras
  e handles de segmento misto considerados. convertBbmodelClips projeta opções
  estritas para assembler e limita relatório agregado; collector final deve somar
  demais etapas. Controller/documento/world/worker/UI/adoção permanecem separados.
- Clipes preparados bbmodel (lote 206): assembler privado exige adaptação
  continuous-sampled, drafts locais Euler já vinculados/aprovados e tempo/peso
  explícitos. Step/linear representáveis mantêm tempos; curvas/Euler interpolado
  recebem grade. Pre/post exige sample-pre separado e pode perder/espalhar saltos.
  FPS não limita erro nem impede aliasing de voltas; não prometer fidelidade
  contínua. Todas as agendas cabem antes de XYZ/handles/base. Clipes/relatórios
  próprios, IDs por índice original e zero nativo canônico sem quantização F64.
  Relatório agrega por trilha, não por amostra; consumidor ainda precisa aplicar
  orçamento global do relatório. Não dispensa planner/remainder/flags nem bounds
  mundiais, worker/revisão/adoção. Mínimo de escala só atua nos zeros amostrados.
- Poses bbmodel (lote 205): valores absolutos para space local, NÃO local-delta.
  Grupo ZYX sem rescale/escala-base não unitária; binding/flags continuam separados.
  Capturar base uma vez, somar ângulos Euler em radianos após ponderação sem
  normalizar voltas antes dela. bbmodelRadians compartilha a fórmula do repouso.
  Peso numérico zero permanece zero; resolução de blend_weight é responsabilidade
  do planner. Escala 1+(v-1)*peso; zero/cancelamento exige reject, preserve-zero ou
  source-minimum (0,00001). Não aplicar piso a negativos. Valores próprios F64,
  overflow F32 local rejeitado, componentes de underflow preservados/reportados.
  Esses checks NÃO provam bounds mundiais animados nem aprovam global/quaternion/IK.
- Agendas (lote 204): merge temporal compartilhado com gltfCubicSampleTimes,
  janela/tempos autorais exatos e grade opcional, sem snap/Set/sort. i/fps decide
  pertencimento real, não apenas ceil/floor do produto. Iteradores são encerrados
  ao limitar janela/orçamento. Draft bbmodel recebe duração/FPS explícitos e modo
  authored/grid por trilha; agenda não decide se uma curva pode manter só keys.
  Todos os metadados/cardinalidades/custo mínimo precedem tempos; união exata de
  TODAS as trilhas é contada antes do primeiro array de agenda. 64 clipes/4.096
  trilhas/65.536 keys conjuntos; aliases não reduzem custo lógico. XYZ/handles não
  são lidos, source não muda, output possui arrays distintos. Empty track não vira
  movimento, empty clip continua explícito. Orçamento fonte anterior permanece
  por ocorrência; não são medições de RAM nem aprovação de amostragem/adoção.
- Curvas bbmodel (lote 203): sampleBbmodelContinuousTrack é adaptação matemática,
  NÃO emulação da reprodução de origem. Conversor deve exigir escolha/relatório
  de tempo exato, Bezier contínuo e quebra de tangente Catmull pre/post. Sem snap
  1/1200/tabela de 201 pontos/parametrização deslocada. Busca binária, extremos
  pre/post próprios, step anterior vence, Catmull em qualquer extremo precede
  Bezier/linear. Loop de vizinhos Catmull (mínimo três chaves) não envolve tempo.
  De Casteljau e bisseção até F64 adjacentes/tempo igual, teto 1.076 iterações;
  handles de tempo limitados antes da divisão, valores livres. Gap/razão/resultado
  não representável é diagnóstico, sem XYZ parcial. O(log keys), espaço constante,
  oracle Three só em testes. Não faz pose/quaternion/global, native budget ou
  adoção. Integral 203 teve avisos act de TextureEditor não reproduzidos no focal;
  não estão corrigidos nem suprimidos, investigação da interação da suíte pendente.
- Trilhas bbmodel (lote 202): preparação por canal conhecido, índices/paths e F64
  preservados, lista própria ordenada sem epsilon ou subtração de tempos. Duplicatas
  rejeitam canal antes dos valores; shapes de todos precedem constantes, 1|2 pontos
  sem truncagem e curvas desconhecidas explícitas. Nenhum resultado parcial.
  Pré-5: ausência de data_points não alcança fallback direto; [] direto não inverte;
  overlay values vence após inversão do pai e não recebe inversão novamente.
  Pai truthy incompatível não pode ficar escondido. Bezier só inverte valores do
  par declarado/ativo; left-only antigo não é reparado por defaults, right-only
  e tempos intactos. String que reescrita serializaria em expoente é não resolvida;
  nenhum Molang executado. Pontos/handles próprios; zero assinado preservado sem
  equivalência binária com parser. Preparação não aprova target, sampling, clipping,
  loop, native budget nem adoção; outros canais continuam não aprovados.
- Vínculos bbmodel (lote 201): bone para grupos, índices originais, UUID lowercase
  8/4/4/4/12 sem restrição RFC e sem normalizar IDs. Nomes reject por padrão;
  unique-name exige correspondência única e não faz trim. UUID existente vence
  nome, chave-nome precede nome declarado; ambiguidade não permite outro fallback.
  Índice único inclui grupos omitidos; nomes só lidos se habilitados. Todos os
  animadores que disputam alvo no mesmo clipe viram conflito, incluindo vazios;
  outros clipes independentes. Alvo omitido não vira ausente. Elementos errados,
  armature/IK/efeitos/desconhecidos não são aprovados como grupos. Sem leitura de
  pontos, adoção ou ativação de movimentos; opções antes dos inputs. Review
  corrigiu canal ausente no leitor 199 com prova red/green, sem novo default.
- Constantes bbmodel (lote 200): classificar escalares já validados/orçados,
  number finito ou subconjunto decimal confirmado (menos, inteiro, fração e f/F
  após fração; whitespace só externo). Não executar Molang nem usar parsing
  parcial/gramática JS mais ampla. Texto restante explícito; overflow/underflow
  literal não viram zero. Por chave: todos XYZ próprios ou todos diagnósticos,
  nunca coordenadas parciais. Proveniência do alias em paths, sem releitura raw;
  pontos/ângulos/eixos/handles intactos. Não é binding, sampling ou clipe nativo.
- Chaves bbmodel (lote 199): schemas bone/armature TRS e null_object posição,
  sem aprovação de target/IK. Canal string obrigatório (corrigido no review 201):
  addKeyframe da origem filtra antes do construtor; não usar default rotation
  para chave sem canal. Effects literal e tipos/canais desconhecidos ficam
  unresolved sem leitura de valores/flags. Preservar ordem, tempos duplicados,
  F64/±0 e number|string, sem parse/eval ou migração de eixos pré-5. Uniform não
  copia X. Bezier presente é conferido mesmo inativo; ausência total não cria
  quatro vetores por chave. Lista de pontos não é truncada ao limite 2 da UI
  de origem; estrutura admite até 1.000, sem aprovar pre/post/curva. Alias values
  apenas em ponto explícito, overlay de propriedades próprias, representado por
  layout/aliasSource readonly; nunca mutar fonte/protótipo. Texto conhecido
  efetivo tem teto separado de 4 Mi UTF-16 em todos os clipes. Listas/vetores
  próprios; declarações/raw emprestados. Ainda não habilita movimentos nativos.
- Estrutura de animações bbmodel (lote 198): contêineres agregados antes de números
  e listas próprias de keys; ausente/[] em data_points reserva um slot direto.
  UUID de clipe obrigatório/único literal; tipo/loop desconhecidos permanecem
  declarados, não aprovados. Timing Molang inerte number|string, snapping não é
  FPS, length não é duração nativa; F64/±0 sem clamp/dedup. Marker name pode ser
  zero numérico. Texto conhecido por ocorrência UTF-16 antes das cópias de keys,
  sem contar defaults/propriedades/paths gerados nem estimar RAM. Saída possui
  contêineres próprios e raw records emprestados readonly. Não resolve targets,
  valores/curvas, eixos pré-5 ou remainder. O importador estático continua
  reject/omit para clipes; leitura privada não habilita movimentos na UI.
- Interface bbmodel (lote 197): painel lazy no seletor glTF/OBJ/bbmodel. Arquivos,
  opções e consentimento pertencem à sessão, não ao documento. useSceneFileImport
  compartilha o fluxo OBJ/bbmodel via adaptadores estáveis; glTF conserva inspeção.
  Revisão viva, troca de editor/formato, blur/cancelamento e reentrância invalidam
  resultados/consentimento; só confirmar faz um commit desfazível. Não preparar
  automaticamente ao escolher arquivos. Preservar originais para download na
  sessão; paths literais e budgets completos antes de IO, sem recópia no append.
  Todas as opções do codec representadas; omissões reject por padrão. Sugestões
  de aparência visíveis e relatadas, sem promessa de equivalência visual. Cor de
  tela sRGB convertida para linear só ao editar RGB; alpha isolado não quantiza
  os outros canais. Lista técnica de 50 avisos, download completo. Nenhuma
  execução de texto externo. Clipes de peças/camadas ativas/PBR completo pendentes;
  painel/worker internos não ativam formato público nem homologam GPU/toque.
- Transporte bbmodel (lote 196): snapshot de escolhas/identidade/bytes somente
  após validar todos os limites; fonte não vazia e sem SAB. Um worker por tarefa,
  encerrado ao cancelar ou concluir; structured clone dos originais, transfer
  somente dos pixels derivados completos. Três tokens antes de ler respostas;
  documento/identidade/custos e variantes de 14 etapas conferidos no receptor.
  Relatório não aprova adoção: UI ainda precisa de revisão viva e consentimento.
  Contar chaves externas e texto identicamente no produtor/receptor; teto de
  4 Mi caracteres inclui toda a estrutura. Faces contadas uma vez por geometria.
  Diagnósticos próprios, códigos exaustivos, escolhas cruzadas, origens por imagem
  com índices contíguos de recursos/aliases. Não reparsear a fonte na UI nem
  prometer detectar relatório inventado internamente consistente. Metadados -0
  preservados; canonicalização nativa permanece. UI/adoção no lote 197.
- Composição bbmodel (lote 195): convertBbmodelDocument valida identidade e TODAS
  as opções antes dos arquivos; preflight de bytes/paths compartilhado com
  recursos antes do JSON. Ler TODOS os metadados/visuais/geometrias/aparência,
  mesmo para nós omitidos. Selecionar texturas por faces retidas, sem fallback;
  somar materiais padrão e de textura antes de pixels. Remainder/relatório
  limitado antes de materializar XYZ/UV; geometria e camadas ativas antes de
  abrir recursos. Mesma guarda de camadas no conversor de imagens.
  Resultado ready tem documento validado/relatório review=required; missing
  não tem documento parcial. Não arquiva bytes, adota ou executa scripts.
  Campo não mapeado exige discard por caminho sem ler seu valor; não contorna
  semântica/limites conhecidos. Grupos inline 4.x têm children processado;
  groups separado de 5.0 não o tem silenciosamente coberto. Clipes/controladores
  exigem omit separado para cópia estática, sem validar/executar seu conteúdo.
  Relatório discriminado em 14 etapas: teto 65.536 issues, 64 Ki caracteres/path
  e 4 Mi caracteres textuais agregados; manter recursos/adaptações/custos.
  Worker no lote 196 e UI/adoção no 197; clipes/camadas ativas/PBR completo pendentes.
- Compatibilidade de superfícies bbmodel (lote 194): metadados/topologia/UV
  privados correspondentes, teto e todos os vínculos antes das faces. Labels
  desconhecidos de shading/renderOrder/seams não são aprovados pelas opções.
  Normais nativas por triângulo exigem molda-flat e relatório por peça/faces
  originais, inclusive smooth vazio como configuração perdida. Não prometer
  equivalência de normais de quad/smooth/caixa invertida. Descarte de ordem,
  seam labels e shade=false separado; não soldar UV nem interpretar chaves.
  UV externo texturizado exige clamp do quadro escolhido sem mudar UV; não
  aprova wrap/material/PBR nem fonte restante. Relatório deve chegar à adoção.
- Superfícies/materiais sem textura bbmodel (lote 193): ler TODOS os metadados
  conhecidos antes da seleção; teto agregado de seams antes de valores/mapas.
  Marcador numérico não é RGB; ausência e labels desconhecidos ficam explícitos,
  sem aprovação visual. Chaves de seam são literais: não dividir underscore.
  Material padrão próprio por geometria, sem substituir vínculos por face.
  Superfícies sem textura exigem uniform escolhido, com RGBA/lados/marcador e
  contagem de faces originais no relatório. Sem superfície ou só com textura não
  gera aproximação visível. Limite e todos os vínculos antes das faces; opções,
  cores e mapas próprios. Shade/shading/renderOrder/seams ainda precisam de
  política de compatibilidade; estes módulos não aprovam documento completo.
- Hierarquia bbmodel (lote 192): grafo/metadados completos/seleção/poses/recursos
  privados correspondentes. Limites e todos os vínculos/políticas antes de copiar
  TRS. Preservar ordem/grupos vazios/identidade literal; sem pivô extra/reparent/bake.
  Material padrão por nó com ID validado, sem substituir material por face.
  Grupos ocultos/travados exigem inherit explícito: origem edita flags dos filhos
  no toggle, nativo herda na avaliação. export=false exige discard com relatório;
  não omitir/esconder nós nem prometer export futuro de peças ocultas. Arrays/mapas
  próprios, nomes pelo adaptador comum. Sem aprovação de aparência/animação/fonte
  restante ou documento completo; fallback de aparência precisa de etapa própria.
- Materiais de textura bbmodel (lote 191): plano metadata-only antes de recursos/
  pixels. Shader texturizado próprio exige molda-standard explícito, com relatório
  de adaptação de iluminação/sRGB/alpha/profundidade. Auto-sidedness depende da
  sessão; front/double autoral prevalece. Repeat→clamp, efeitos→standard e grupo
  PBR→texture-only são escolhas separadas, recusadas por padrão. Enums desconhecidos
  não viram defaults. Canal de dados usado como imagem de cor é relatado, não mapa
  normal/rough/metal. Materializador liga planos/imagens privados sem fallback;
  base transparente SOB pintura, roughness 1/metalness 0. Não aprova shading de
  geometria/camadas/UV externo/hierarquia/PBR completo. Somar materiais de peças
  ao orçamento final e manter relatórios anteriores na composição.
- Imagens bbmodel (lote 190): bitmap simples de layouts/rasters/aparência privados
  correspondentes; uma imagem editável independente por textura, inclusive aliases.
  Custo RGBA8 agregado e todas as identidades/camadas/precisão antes de pixels.
  RGBA8 exato, incluindo RGB transparente; RGBA16 exige round-to-rgba8 e relatório.
  Sem gamma/ICC/EXIF/premultiplicação/threshold. Cópia própria bottom-up, inclusive
  Buffer.subarray, e sequência flipbook própria. Nomes pelo adaptador comum.
  Camadas ativas recusadas nesse caminho; inativas omitidas com contagem, sem ler
  conteúdo. Não presumir source como composição. Não aprova shader/PBR/sampler;
  preservar relatórios anteriores e reservar novos pixels para futuras receitas.
- Geometria editável bbmodel (lote 189): composição de topologia/XYZ/UV privados
  correspondentes, não parser de planos externos. Custos agregados e identidades
  de todos os estágios antes da primeira cópia. Vértices locais próprios, inclusive
  construção/coincidentes, faces/cantos/arestas e diagonal planejada preservados.
  Textura exige ID material explícito válido; sem textura herda material do nó.
  Não escolher substituto. Builder nativo relata degeneração/cruzamento/colapso
  Float32 por polígonos nativos, sem remover faces armazenadas. UV privado ausente
  é bug de composição, não zero. Sem bake/snap/solda/aprovação de aparência ou
  documento; readSceneDocument ainda normaliza -0 no contrato persistido existente.
- UV/layout bbmodel (lote 188): resolução lógica por eixo: textura, projeto, 16;
  nunca cached/decoded pixel size. Normalização por face/canto original é local
  ao quadro: u/width, 1-v/height, sem divisão pela folha inteira. Sem textura usa
  projeto; não inventar vínculo. Overflow Float32 recusa; UV externo, colapso
  aritmético e underflow são relatados sem clamp/snap. Preparação de imagens usa
  dimensões decodificadas para contar faixa vertical pela proporção UV e margem
  0,05 da fonte. Quadros precisam de linhas inteiras. Orçar imagens/aliases em
  RGBA8 antes de sequências; não ler pixels nesse estágio. 256 células/passos,
  FPS default 7, mínimo 1 da fonte relatado, máximo 60 sem redução. Custom só
  inteiros seguros não negativos; volta modular relatada, repetições mantidas.
  Não trimar espaços que representam passos fallback. Static não interpreta
  playback; free não usa frame_time de mcmeta. Não aprova cor/camadas/PBR/wrap,
  relógio da sessão, UV fora do quadro ou adoção de documento completo.
- Orientação de intercâmbio (lote 187): pixels nativos bottom-up, V para cima;
  decoder neutro continua top-down. glTF reflete V após bake, inverte linhas
  próprias e define normalFlipY=true; OBJ mantém V/transform MTL e só inverte
  linhas, com normalFlipY para fonte negativa. Conferir também o leitor de
  detalhes do relatório worker. Ausência UV preserva fallback (0,0), distinta
  de UV autoral zero convertido. Export GLB reflete V e linhas simultaneamente;
  normal G compensa flag + bitangente. Nunca modificar camada/fonte/cache alheio.
  Reversão usa uma linha temporária. Testar imagem 2D, amostra 3D, relevo físico
  e exportação independente; roundtrip sozinho pode esconder dois erros opostos.
  Sem nova orientação serializada ou migração de documentos. Fronteiras exatas
  NEAREST têm desempate refletido, sem correção artificial por epsilon.
- UV autoral bbmodel (lote 186): unidades de fonte por face/canto original, não
  UV normalizado. Preparar cada face uma vez apesar da triangulação. Box UV free
  usa floor(to-from+1e-7), laterais/tampas orientadas, mirror com troca east/west
  e offset; não inflate/stretch/pivô/pixels. Cubo explícito prevalece sobre projeto;
  missing herda, default false. Giro só múltiplo não negativo seguro de 90, índice
  modular constante, nunca loop por ângulo. Conferir overflow só nas faces retidas.
  Missing mesh UV exige zero escolhido ou erro; surplus relatado por pares fonte.
  Preservar signed zero/coincidentes, sem margem/nudge do preview. Não consumir
  UV de superfícies omitidas/construção. Normalização/frames/ordem de linhas e
  equivalência de materiais precisam de estágio posterior; não inferir topo de
  imagem da frase "linha zero em V=0". Editor 2D nativo usa linhas bottom-up.
- Coordenadas bbmodel (lote 185): planos orçados/fontes/poses privadas correspondentes.
  Cubo aplica centro e (semi-extensão+inflate)*stretch, depois subtrai origin;
  rescale só no TRS, nunca duas vezes. Mesh já é local. boxMesh próprio mantém
  ordem binária de vértices. Zero/invertido exige preservar explicitamente com
  relatório, sem engrossar 0,001, ordenar ou encaixar. Overflow é unsupported.
  Conferir todos os pontos locais/world e cantos AABB transformados, mesmo sem
  faces/ocultos. Float32 infinito é recusado; underflow gera aviso por ponto sem
  alterar Float64/signed zero. Buffers próprios. Não aprova faces/UV/normais,
  câmera ou shader/GPU; não altera domínio Float64 nativo nem substitui gate final.
- Topologia nativa bbmodel (lote 184): seleção/geometrias privadas correspondentes;
  tetos agregados antes de converter XYZ/UV/pixels. Todos os pontos retidos contam,
  mesmo ocultos ou sem superfície. Reusar boxMesh próprio para ciclos TL/BL/BR/TR;
  null desativa superfície, mas gaiola não coberta fica como aresta solta. Mesh de
  dois cantos mantém outline mesmo com null; deduplicar identidade, não posição.
  Quad padrão vira triângulos pela diagonal 0–2; editable-quads é adaptação
  explícita. Relatar ambos, sem prometer equivalência de normal não plano. >4 ou
  referências repetidas exigem omissão escolhida; pontos continuam preservados.
  IDs/cantos/proveniência próprios; não preencher UV, soldar, reordenar, aprovar
  shading/parâmetros de cubo ou confundir plano topológico com documento válido.
- Metadados de nós bbmodel (lote 183): leitor free de TODOS os grupos/cubos/malhas
  definidos, não só selecionados. Nomes até 4.096 sem trim/geração; missing null,
  string vazia distinta. Flags visible/export/locked estritas, sem aplicá-las ao
  runtime; origem/rotação próprias e finitas em Float64, sem limites nativos/GPU.
  Índices/proveniência preservados, raw readonly para semânticas restantes. Tipos
  desconhecidos/missing continuam unresolved; não interpretar campos de plugins.
  Primitivas de pose/propriedades compartilhadas com geometria/transforms, mantendo
  algoritmo/ordem de erros. A composição completa deve chamar este leitor antes
  de adotar; ele não substitui geometria/recursos/animações nem compatibilidade
  das ocorrências. Não aplicar defaults free a grupos de outros formatos.
- Transformações bbmodel (lote 182): repouso free da seleção/grafo correspondentes.
  Origem absoluta menos pivô do pai Group define translação local; mesh vertices
  continuam locais, endpoints de cubo ainda precisam subtrair seu próprio pivô.
  XYZ para Mesh (default Three), ZYX para Cube/Group; graus→radianos conforme
  convenção de origem, sem snap/modulo, reescala de unidades ou achatamento.
  Rescale de cubo é escala TRS por eixos cruzados, não stretch geométrico. Não
  aplica scale/rescale de campos não consumidos em outras famílias como se fossem
  suportados; raw continua para revisão posterior. Matrizes local/world precisam
  ser finitas em Float32, mas isso não prova que pontos/UVs possam ser desenhados.
  Ocorrência separada aceita só uuid/children/isOpen/selected; outros campos são
  unsupported antes de números, sem merge legado/plugin silencioso. Dados inline
  antigos são a própria definição. Arrays/matrizes próprios, fonte inalterada.
  Este estágio parcial não valida todo o documento, poses ou visibilidade. A
  conversão completa precisa passar pelo leitor de metadados do lote 183,
  incluindo os grupos omitidos.
- Seleção bbmodel (lote 181): somente planejamento estrutural do formato free.
  Nós nativos ainda precisam de transforms/geometria/aparência/animações validados.
  Unlisted default reject; append/omit explícitos e reportados. Tipos desconhecidos
  ou cubos/malhas usados como contêineres default reject; omit-subtree remove ramo
  inteiro na proposta e conta todos os descendentes, sem promovê-los/reparentear.
  Travessia iterativa do grafo já validado, ordem BFS/irmãos/raízes preservada;
  append usa ordem unlisted de grupos primeiro. IDs são índices de fonte, não nomes.
  512 nós e 128 partes/geometrias antes de coordenadas/pixels; ocultos e export false
  contam. Omissões limitam conversão, não eliminam validação dos leitores de fonte.
  Arrays/resultados próprios; sem adoção/aceite, execução de texto ou fallback Cube.
- Rasters bbmodel (lote 180): consumir resultado ready privado e inalterado
  do estágio de recursos, após seleção explícita. Cada recurso escolhido entra
  uma vez no batch comum; bindings de texturas não multiplicam pixels/cotas.
  Map textura original→raster próprio compartilhado readonly. Headers/MIME e
  orçamento RGBA agregado antes de descompressão; 16 bits contam em dobro.
  Usar dimensões reais, não cached pixels/UV. Sem flip, premultiplicação, ICC,
  composição de camadas ou inferência de frames. Erro aponta source da primeira
  textura escolhida ou caminho literal de arquivo, com causa RasterInputError;
  falhas de programação não viram erro recuperável nem fallback de imagem.
- Recursos bbmodel (lote 179): núcleo neutro de Data URI compartilhado com
  glTF e caminhos literais com OBJ, sem dependência entre formatos. Base 4.9
  trata entrada como diretório; 4.10+ usa seu pai. Nunca percent-decode caminhos,
  acessar path absoluto ou buscar por basename/caixa. Fonte preferida explícita;
  outra só se campo preferido ausente, nunca após inválido/faltante. Namespaces
  separados para URI e arquivo; rejeitar referência à própria entrada.
  Preflight de todos os escolhidos (32 MiB cada/64 MiB seleção/1.024 arquivos)
  e recursos únicos (1.024/32 MiB) antes de cópia/decodificação de bytes. Faltantes
  sem parcial. Resultados próprios compartilhados readonly; sem IO/cache global.
  MIME embutido não comprova header/pixels. Camadas/PBR/animações separados.
- Aparência bbmodel (lote 178): metadados apenas. Tamanho UV positivo/finito
  separado de cached pixels inteiros não negativos; nenhum deles autoriza
  alocação de imagem. Metadados ausentes por eixo continuam null. IDs únicos
  por namespace textura/grupo, grupo referenciado precisa existir. Preflight
  65.536 texturas/grupos cada, 262.144 camadas e 32 Mi unidades UTF-16 de source
  agregadas antes de números. Visitar buracos de listas de descritores.
  Paths/source/modos/frames/material_config/camadas inertes, sem IO/execução.
  Binding recebe dados já lidos: índice/UUID devem existir; false/null distintos;
  default free é none, outros formatos unresolved-default, nunca textura escolhida
  por sessão. Geometria leva sourcePath para erros na proveniência original.
- Fonte geométrica bbmodel (lote 177): plano agregado antes de XYZ/UV de todos
  os cubos/malhas, inclusive ocultos. Limites de entrada não são limites nativos.
  Cubos mantêm parâmetros e seis faces declaradas; sem preencher presets ausentes
  ou aplicar inflação/rotação/box UV. Mesh preserva vértices Float64/cantos Uint32,
  ordem/repetições e UV Map próprio (missing continua missing, surplus preservado).
  Sem weld/sort/triangulação/normalização de -0/V-flip. Finitude não autoriza
  Float32/adoção: conversor posterior precisa conferir desenho/domínio.
  Texture absent/false/null/index/UUID distintos; referência ainda não resolvida.
  Unknown/missing type fica unresolved, nunca Cube. Raw de nós/faces permanece
  para revisar shading/seams/tint/cullface/size/rotated/etc. Não ignorar campos
  com semântica apenas porque o subset numérico já foi lido.
- Organização bbmodel (lote 176): Map por UUID explícito/literal, nunca por nome;
  4.x grupos inline, 5.0 referências a definições separadas (também elementos
  contêineres). Conferir 65.536 definições/ocorrências agregadas e profundidade
  própria 128, iterativamente. Pais únicos, referências existentes, sem ciclos
  ou colocação repetida. Preservar roots/ordem BFS autorados; unlisted separado,
  não apagar nem anexar silenciosamente. Dados de origem/ocorrência continuam
  distintos, readonly por contrato; vínculos próprios. Não confundir esse reader
  com validação de transforms/UV/rig/tipos nem com o limite nativo de 512 nós.
- Envelope bbmodel (lote 175): JSON próprio e inerte, não modelo validado.
  Reusar readImportJson com tetos/factory de erros, sem conhecer schemas nesse
  núcleo. Conferir 32 MiB e ArrayBuffer exclusivo antes dele; UTF-8 fatal/BOM,
  profundidade 128 e um milhão de tokens antes de JSON.parse. Sem IO/execução.
  Exigir meta.format_version e model_format; somente strings 4.9/4.10/5.0,
  nunca comparar decimais ou inferir versão/formato legado. Identificador plugin
  não é aprovação de capacidades. Assinatura <lz> é unsupported, sem inflar.
  Desconhecidos/editor_state/Molang permanecem dados; números/geometria/grupos/
  UV/animação exigem leitores posteriores. Não adaptar sinais/caminhos no envelope.
- Oficina de importação (lote 174): sessão, leitura local, confirmação e revisão
  comuns; adapters por formato. Trocar formato desmonta/revoga dono e aceite,
  nunca compartilha arquivos entre formatos. OBJ só converte após Preparar;
  políticas explícitas, prévia isolada e um commit/undo após guarda viva do host.
  Revogar antes de abortar, conferir reentrância e identidade da instância do
  editor além de id/revisão. Mudança de opções/fonte cancela consentimento.
  Relatório visual limita ocorrências a 50, download conserva todas; originais
  só por clique. Preview/testes compartilham domínio real, fake apenas na porta GPU.
  Conferir Float32 finito de TODOS os pontos OBJ mantidos antes de rasters, não
  só triângulos desenhados; sem recorte/escala/descarte. Domínio nativo continua
  Float64. Câmera prepara e valida enquadramento/projeções em candidatos antes
  de copiar nas instâncias vivas; falha preserva matrizes/target/vista anteriores.
  Não prometer que qualquer caixa Float32 caiba em uma câmera Float32.
- Worker OBJ (lote 173): token/identidade e preflight de arquivos comuns com glTF;
  regras de paths por formato, sem acoplar parsers. Conferir todo o conjunto antes
  de snapshot (32 MiB/arquivo, 64 MiB/seleção, 1.024 companions), sem SAB/detach dos
  originais. Reusar runWorkerTask; um worker por pedido, cancelamento termina CPU,
  remove listeners e impede publicação tardia. Somente revisão ou faltantes,
  nunca adoção/documento parcial. Retorno passa pelo domínio, identidade/custos,
  seis readers estritos de avisos, referências e coerência de escolhas/imagens.
  Bibliotecas pertencem ao conjunto; origem de material usa identidade comum da
  seleção. Limitar 65.536 decisões e 4 Mi unidades UTF-16 de valores/chaves de
  texto (não bytes JSON/RAM). Contador só recebe dados validados/acíclicos, cobra
  incrementalmente na produção e no reader. Sink síncrono de materialização
  antecipa avisos/nomes ao plano antes do bake, sem truncar ou perder o relatório
  independente. Custos são acrescentados ao final. UI de adoção continua separada.
- Documento OBJ completo (lote 172): identidade explícita validada pelo domínio
  antes da fonte; template/custos comuns com glTF, sem herdar thumb ou campos do
  host. Normalizar todas as escolhas antes dos estágios; nomes de opções aninhados
  conservam cause. Plano de geometria compartilhado com organização/conversão;
  limites/decisões conhecidos antes de coordenadas e buffers desenhados antes
  de rasters. Leitor final confere documento completo, sem adoção/IO/relógio/RNG.
  Bundle guarda entryPath canônico, não bytes OBJ. Relatório soma seis estágios,
  origens de material por índice de biblioteca/declaração e custos finais reais;
  review sempre required e original/metadados não arquivados. Teto de 65.536
  decisões sem truncar; orçamento textual/transporte ampliado no lote 173.
  Adapters de custos traduzem só SceneValidationError e conservam causa.
- Organização OBJ (lote 171): objetos por linha/ordem de declaração, sempre
  raízes, não por nome. Vazio explícito vira grupo; omit só com escolha/contagem.
  Implícito sem geometria não ganha nó. Pool de pontos não referenciados é peça
  própria e reserva um nó no preflight de 512, antes de nomes/elementos. IDs de
  geometria únicos, uma parte por objeto, refs existentes; nunca recentralizar
  coordenadas ou inventar pais/instâncias a partir de g. Associações g usadas,
  não-default, são omitidas com contagem, não preservadas como tags nativos.
  Expandir listas compartilhadas uma vez por chamada, sem duplicar nomes dentro
  da lista. Nós/TRS/Maps próprios; helper de nomes comum. Leitor, grafo e GLB
  verificados; montagem completa/revisão OBJ ainda seguem depois.
- Materiais OBJ nativos (lote 170): políticas explícitas de alpha de cor, Y de
  normal e face dupla; máscara de outra resolução rejeitada salvo nearest
  relatado, com grade da cor e centros de pixel. Kd/mapa em luz linear, alpha
  reto, base transparente também com máscara isolada. RGB sob alpha zero fica
  editável; compositor pode gerar zero invisível sem alterar a camada. Escalares
  seguem canal/curva/faixa/inversão do plano; matte linear, rough/metal cinza com
  fatores contínuos. Normal sem curva, alpha 255; 1-V exige flip nativo para
  fonte Y positiva, verificado com tangentes Three e GLB. Quantização 16→8 relatada.
  Planejar todas as receitas antes de pixels (20.000/32 MiB); chave por raster e
  receita, cache por chamada, buffers/UV/bindings próprios. Relatório adicional
  não substitui decisões anteriores. Helper de nomes nativos comum conserva
  algoritmo glTF. Sem documento completo, adoção ou homologação de GPU neste lote.
- Aparência OBJ (lote 169): compor propriedades efetivas/mapas antes de base,
  para que fatores dependam dos papéis retidos. Pm ausente é 1 com mapa de metal,
  0 no sólido. Pr autorado contribui; sem Pr, mapa roughness usa fator 1 e Ns
  é omitido sem ler seu valor. Variante sem UV ainda valida/aproxima Ns; não
  esconder seu erro pela outra variante. Map_Ns só é roughness após opt-in.
  Seleção efetiva em WeakMap por chamada/declaração, índices próprios por variante;
  bindings/UV copiados. Referências por declaração/propriedade, erros com arquivo
  e opções aninhadas. Este plano não lê pixels nem produz documento adotável.
- Rasters compartilhados/OBJ (lote 168): núcleo raster* sem dependência de
  gltf/obj/mtl; adapters preservam famílias/path/reason e acrescentam causa raster.
  Não traduzir exceções alheias ou retornar parcial. Algoritmos/limites PNG/JPEG
  conservados, sem ICC/gamma/EXIF/flip/premultiplicação. Headers e teto agregado
  precedem todo pixel; 16 bits contam oito bytes/pixel. Alias só por intervalo
  exato, MIME conferido em cada fonte inclusive alias, cache apenas por chamada.
  OBJ resolve somente referências retidas por biblioteca/material/propriedade,
  path literal relativo ao MTL. Teto de referências antes da fonte, sem IO/canvas
  ou leitura de mapas omitidos. Conjunto completo sem recurso é erro, não missing
  parcial. Pixels próprios não equivalem a materiais/documento/adoção prontos.
- Mapas MTL/UV OBJ (lote 167): selecionar papéis antes de opções/pixels; variantes
  sem UV omitem só superfície, reflexão exige política própria. Opções repetidas
  e conflitos de papel exigem escolha; bump RGB/map_Ns roughness/map_Tr invertido
  são interpretações explícitas. Cor/dados/alpha separados; l é Rec.709 relatado,
  matte linear. Não tratar -cc como sRGB, altura como RGB, clamp MTL como extensão
  de borda. Sampler nativo é adaptação relatada; UV diferente exige bake futuro.
  Ganho/base sem clamp, normal 0–4/sem escala zero. Metadados não aprovam raster.
  Transformações por material têm preflight próprio e cópia antes de coordenadas;
  aplicadas por face antes de 1-v. Ausência de UV não inventa amostra. Costuras e
  construção preservadas; overflow não é recortado. Conferir orientação tangente
  de normais na materialização, ainda pendente junto de canais/bake/raster OBJ.
- Base escalar MTL (lote 166): RGB exige espaço explícito, sem quantização/clamp;
  XYZ/espectral e halo não viram RGB/alpha comum. d/Tr coexistentes exigem escolha.
  Pr vence Ns com aviso; Ns sozinho exige inversa empírica Blender opt-in, não
  equivalência de BRDF. Não inferir metal de Ka/Ks. Defaults/adaptações/omissões
  aparecem no relatório. Redeclaração de propriedade é separada da de material;
  aliases bump/disp compartilham slot, refl conserva instruções separadas.
  Índices efetivos não aprovam mapas e não leem opções/pixels. Curvas unitárias
  comuns preservam matemática antiga glTF/legada; Three usa aproximações, não
  confundir com oracle exato. Base sólida não substitui bake de fator sob pintura.
- Seleção de materiais OBJ (lote 165): metadados do conjunto completo, sem
  coordenadas/valores de propriedade/bytes. Uma lista mtllib busca em ordem;
  várias listas exigem política declaration/all, relatada. Lista única é global
  mesmo se tardia. Duplicata na biblioteca escolhida exige first/last; ausente
  só vira padrão com opção explícita e contagem por escopo. Não resolver material
  de pontos/linhas de construção. IDs por biblioteca/declaração/useUvTextures;
  reflexão é independente do UV e sólido não ganha variante extra. Limite inclui
  padrão/variantes; índices altos não alocam arrays esparsos. Cache por chamada,
  classificação uma vez por declaração entre escopos, sem tocar a fonte. Não
  confundir vínculo de material com conversão de aparência ou adoção OBJ.
- Conjunto OBJ/MTL (lote 164): normalização local comum com glTF; só URI glTF
  decodifica percent-encoding. OBJ adapta backslash relativo na referência,
  nunca no nome escolhido. Conferir contenção/caminho relativo também após
  normalizar. Sem lookup externo/basename/caixa. Preflight de todo o conjunto
  escolhido (64 MiB), recursos referenciados (32 MiB/1.024) e tetos MTL agregados
  reduzidos antes de cada append. Biblioteca canônica é lida uma vez; conservar
  ordem/repetições em librarySets, sem escolher precedência de materiais aqui.
  Faltantes são todos os atualmente descobríveis, sem fonte parcial ou cópias
  de recursos. Somente conjunto completo ganha buffers próprios pelo intervalo
  escolhido. Mapas/curvas são bytes inertes; erro conserva arquivo/linha/cause.
  Arquivos não usados contam no preflight, mas seu conteúdo não é interpretado.
- Fonte MTL (lote 163): reutiliza lexer/decimais OBJ, erros da família OBJ/MTL.
  Materiais/propriedades em ordem e por declaração, nunca objeto por nome ou
  último valor silencioso. Conservar ausência, d/Tr, RGB/XYZ/espectral, opções
  repetidas e aridade; valores finitos fora de faixas usuais não autorizam
  conversão nativa. Bump é altura, norm é normal. Roles/opções conhecidos são
  estritos; colorspace ausente não consome a próxima opção. Caminhos literais,
  sem URI decode/IO/exec/aspas; keywords e aliases explícitos. Preflight de
  materiais/propriedades/opções antes de append, não apenas limite por linha.
  Fonte sintática não significa material renderizável, recurso resolvido ou
  aceite de adaptação. Arquivo original não é substituído pelo AST.
- Geometria OBJ (lote 162): partes por declaração, não nome/grupo/material;
  vértices globais não usados em construção separada. Preflight agregado inclui
  duplicação entre objetos antes de xyz. Vínculos por índice de face fonte,
  IDs nativos estritos e nomeados sem fallback silencioso. Preservar polígonos,
  winding e costuras; só retirar fechamento com três referências idênticas.
  Repetições restantes e faces >64 cantos são unsupported. UV nativo usa 1-v;
  ausência usa [0,0]. Não dividir xyz pelo peso nem soldar pontos coincidentes.
  Pontos/linhas são construção, adaptações relatadas por parte. Leitor/build
  reais mantêm faces autorais sem desenho com diagnóstico; limites conjuntos.
  Não confundir esse estágio com MTL, hierarquia, bounds completos ou adoção OBJ.
- Fonte OBJ (lote 161): leitor poligonal puro/limitado, referências globais
  independentes e negativas no ponto de uso, Float64 para coordenadas e Int32
  para cantos. Conservar w/UVW/normais sem dividir, inverter ou normalizar no
  leitor. `objectLine` identifica declarações até com nome repetido; grupos
  são associação múltipla, não pais. Contextos/bibliotecas são dados, sem IO.
  Recusar call/csh/formas livres/instruções não suportadas sem retorno parcial.
  Faces exigem layout uniforme; linhas podem ter UV ausente por canto. Erros
  e preflight preservam linha/reason; lexer só formata erro no ramo de falha,
  mudança medida com testes/goldens/perfis. Não confundir fonte com importação
  nativa completa. Pureza falha em qualquer aresta relativa não resolvida,
  sem impor quantidade arbitrária de módulos a um grafo válido.
- Revisão glTF (lote 160): entrada lazy apenas na oficina interna, arquivos/cena
  explícitos e prévia sem editor. File.arrayBuffer só após preflight do conjunto;
  preservar paths de pasta e originais, não resolver nomes por aproximação. Worker,
  leitura e aceite têm dono por editor/revisão/pedido; retirar dono antes de abort
  ou commit e conferir novamente após callbacks do host. Nome/ID preservados,
  um commit/desfazer; nenhuma escrita durante revisão. Relatório com resumo por
  código/50 detalhes e download completo, aviso de originais/metadados/autoria.
  Inputs/selects têm name além de rótulo/alvo 44 px. Não descartar pose pendente
  para importar. Build inclui worker, mas não comprova GPU/toque/usabilidade.
- Worker glTF (lote 159): pacote estrito, 32 MiB por arquivo/64 MiB por conjunto,
  todos os acompanhantes contados antes de snapshot/post. Copiar intervalos, não
  backing oculto; nunca destacar originais ou aceitar SAB. Capturar identidade,
  opções e token criação/revisão/pedido antes da factory. Worker próprio terminado
  em sucesso/erro/cancelamento; inspect/faltantes não são documento parcial nem
  escolha automática. Resposta valida domínio, identidade, custos reais comuns,
  códigos exhaustivos/alvos e review obrigatório. 65.536 avisos no máximo, sem
  truncar perdas; IDs prospectivos de clipes omitidos são exceção de referência.
  Transferir só pixels finais próprios. Receptor ainda copia ao validar; não
  chamar orçamento de pixels/transporte de pico de memória ou prometer latência.
  UI deve conferir revisão viva e preservar acesso ao original/limitação de autoria.
- Documento glTF nativo (lote 158): seleção explícita e identidade do host;
  converter não gera ID/tempo, faz IO, arquiva original ou aceita perdas. Plano
  de material compartilha IDs/UV/recusas e só pede rasters dos mapas retidos.
  Custo de topologia vem do plano de geometria; cobrar cada instância antes de
  pixels, inclusive faces guardadas sem draw. Compor mundos antes de skin/pixels
  e classificar overflow como unsupported; leitor final ainda verifica bounds
  de pontos e documento inteiro, sem bypass da cópia defensiva. Relatório mantém
  diagnósticos tipados e extensões globais, declara original/metadados auxiliares
  não retidos e review obrigatório mesmo sem avisos. Host deve preservar acesso
  ao original e mostrar a limitação de metadados/atribuição. Pixels finais não
  representam memória máxima do pipeline. Conferir poses no documento final real.
- Clipes glTF (lote 157): TRS local absoluto mira nodeIds, não a forma filha de
  junta. STEP/LINEAR preservam tempos e sinais; FPS não faz snap e loop é false
  por padrão. Duração inclui caudas de canais omitidos/externos, não samplers
  sem referência. Input sem buffer/sparse é core zero apesar de bounds declarados.
  Cúbico exige bake explícito: união exata da grade e chaves originais, limite
  agregado por trilha antes de outputs. Relatar aproximação, não erro contínuo
  garantido. Quaternion nulo não vira identidade; normalização/omissão opt-in.
  Conferir poses por clipes nativos reais contra Three, incluindo Bone com Mesh
  filha, skin/mirrors e seeks fora de ordem. Não confundir conversão com aceite.
- Materiais glTF (lote 156): índices selecionados são mapa esparso também na
  geometria. Cor sem textura mantém sRGB autoral contínuo; cor texturizada assa
  fator em linear, alfa separado e base nativa transparente. Superfície usa RGB
  linear e alfa 255, G rugosidade/B metal; dados 16-bit têm quantização relatada.
  Variantes por raster/interpretação/fatores antes de pixels, 32 MiB de saída
  separado do orçamento do decoder. Sem buffers editáveis compartilhados com
  fonte. Alias colapsado, filtros/repetição e luz omitida são relatados; MASK,
  UVs incompatíveis e força normal fora do contrato são recusados sem reparo.
  Lookup RGB de 256 bytes por canal usa expressão exata, só em imagens >=256
  pixels, temporário por imagem. Preservar goldens do benchmark antes de otimizar.
- Bindings glTF (lote 155): mapear juntas para alvos de hierarquia e vértices para
  fontes de geometria; IBM autorado ou identidade implícita, nunca capturar outra
  pose. Limitar por instância antes de valores; validar inversas antes dos pesos.
  Template por layout, buffers compactos e saída própria por vértice/binding.
  Preservar peso por padrão; normalização explícita só quando necessária, com
  relatório, sem pruning ou apagar positivo em Float32. Não afrouxar 1e-8 nativo.
  Prévia de superfície observa revisões de conteúdo, inclusive após worker pronto.
  Coordenador distingue publicação própria de escrita aninhada; callbacks capturam
  dono revogável e nunca ressuscitam ou limpam o sucessor. Cancelamento mantém
  contexto para aviso e não sobrescreve revisão externa. Miniatura não é conteúdo.
- Hierarquia glTF (lote 154): copiar transforms e mapear índices para IDs, sem
  decompor/normalizar. Junta com mesh vira grupo + forma filha identidade; TRS
  e juntas apontam para o grupo, binding/morph para a forma. Contar expansão nos
  512 nós antes de transforms. Não apagar transform de malha com skin: seus
  filhos rígidos dependem dele e o domínio cancela meshWorld no cálculo da pele.
  Singularidade de binding continua sujeita ao gate específico. Câmeras, nomes
  ajustados e separação são relatados; hierarquia não equivale a documento pronto.
- Seleção glTF (lote 153): índice explícito, sem mesclar/default automático.
  Pré-contar 512 nós/128 instâncias antes de malhas/bytes. Variantes de forma-base
  compartilham por mesh + pesos exatos, não vínculos ou morphs animados. Todas
  as dependências core, inclusive sparse/cinco mapas, mantêm índices originais.
  Particionar todos os canais em selecionados/fora/não resolvidos; alvo sem nó
  e extensões globais seguem explícitos. Não abrir valores/pixels nem declarar
  aceite de perdas ou orçamento final de conversão nesta etapa.
- Entrada glTF (lote 152): compor recursos conjuntos e todos os leitores core;
  ready é fonte própria, não documento nativo nem aprovação dos pixels. Missing
  não retorna documento parcial. Extensões obrigatórias sem suporte interrompem
  antes de recursos; opcionais têm inventário de pontos do schema, jamais busca
  recursiva em extras/payloads. Não reter BIN duplicado. Câmeras reais precedem
  suas referências; preservar ausência e recomendações distintas de exigências.
- Sampling glTF (lote 151): preparar canal explícito de fonte validada imutável.
  Busca binária e clamp de endpoints; chaves exatas/STEP mantêm valores originais
  (incluindo quaternion quantizado). SLERP pelo menor arco normaliza orientações
  apenas entre chaves. Hermite multiplica tangentes pela duração real; quaternion
  cúbico zero é erro, nunca identidade substituta. Resultado próprio por amostra,
  sem copiar arrays completos, snap de FPS ou clamp de morphs/escala. Sampler
  nativo tem contrato diferente: não substituí-lo nem usá-lo como leitor glTF.
- Animações glTF (lote 150): conservar referências, STEP/LINEAR/CUBICSPLINE e
  tempos. Alvo ausente/extensão é `unresolved`, nunca nó zero. Input exige bounds
  e tempos crescentes; cubic exige duas chaves e tripla de valores. Quaternion
  verifica chaves, não tangentes, com tolerância Khronos/quantização 0,00769;
  isso não promete contrato nativo 1e-6. Não normalizar dados durante leitura.
  Cache por accessor + interpretação cúbica; limite de trabalho precede valores.
  Views de animação não misturam malha/IBM/target/stride; mesmo accessor não pode
  ter papéis input/output. Guardar JSON para revisão de extensões/perdas.
- Pesos glTF (lote 149): somar conjuntos completos sem pruning/normalização.
  Slots zero também precisam caber na menor skin usada por mesh. Uma junta não
  pode repetir peso positivo. Somas U8/U16 exigem numeradores exatos sobre 65535;
  Float32 não unitário é diagnóstico preservado, não aprovação nativa. Limitar
  slots antes dos valores; cache pela combinação inteira e faixa por mesh.
  Conferência de malha restaura foco no mesmo commit via layout effect; não
  adiar até efeito passivo nem acrescentar esperas para encobrir a janela.
- Aparência glTF (lote 144): defaults core, fatores lineares e canais distintos
  preservados sem clamp/sRGB antecipado. Sampler ausente não inventa filtro;
  source ausente não inventa imagem. Todos os UVs referenciados precisam existir,
  mesmo com força zero. Views de imagem não têm target/stride/storage numérico,
  inclusive sparse; índice de roles só é construído para imagem em view. Leitura
  de metadados não promete conversão nativa fiel nem suporte a extensões/pixels.
- Hierarquia glTF (lote 143): pais únicos, ciclos desconectados e raízes de cena
  conferidos iterativamente. Não mesclar cenas quando falta default; null em
  seleção só representa biblioteca sem cenas. TRS/matriz exclusivos, quaternion
  sem normalização, ortogonalidade por colunas escalonadas; eixos nulos não
  autorizam decomposição com divisão por zero. Guardar valores originais. Leitura
  aceita 65.536 nós; seleção editável para em 512 antes da materialização. Skin
  confere atributos por mesh uma vez na chamada, jamais cache entre importações.
- Geometria glTF (lote 142): converter somente variantes pedidas, após orçamento
  agregado também de trabalho de topologia (degenerados não gastam faces, mas
  gastam processamento). Não soldar primitives ou quantizar dados. UV/material
  por canto/face; um conjunto UV escolhido pelo material, falta explícita é erro.
  Morph vira forma assada com aviso; for-of valida buracos nos pesos. Normais,
  tangentes, cores e dados não representados são relatados. Faces autoradas que
  não desenham permanecem com relatório do build real; índices repetidos são
  omitidos com contagem. Mapa de origem possui IDs/índices, nunca buffers. Não
  confundir geometria com importação completa de cena/skin/material/animação.
- Malhas glTF (lote 141): sete modos preservam ordem/winding/degenerados; nenhuma
  solda ou omissão implícita. Counts/tipos/restart/roles de views são conferidos.
  Base exige conjuntos consecutivos, morph pode alterar apenas UV1. Conferir
  nomes antes de valores sob orçamento, incluindo sufixo com newline. Tangentes
  compartilhadas só são varridas uma vez por importação, nunca cache global que
  atravessa mudanças de dados. Saída guarda referências aos accessors por índice,
  não cópias por primitive. Não confundir topologia com conversão nativa completa.
- Accessors glTF (lote 140): preflight agregado antes de Float64, intervalo completo
  com stride/padding e sparse sobre base ou zeros. Matriz alinha colunas localmente
  em quatro bytes, mas offset absoluto segue largura do componente; byte matrix
  em bufferView ímpar é válida. Min/max após sparse/antes de normalized; Float32
  via Math.fround. NaN/Infinity recusados, fontes intactas. Não tratar esse leitor
  numérico como validação de papéis em malha/skin/animação. Three não cobre todas
  as matrizes sparse/padded: usar também especificação/validador/fixtures próprias.
- Recursos glTF (lote 139): `readGltfBuffers` não possui fetch/IO. Resolver paths
  exatos dentro do conjunto escolhido, decodificar URI uma vez mas nunca nomes
  literais dos arquivos. Não aproximar basename/maiúsculas nem converter pasta
  em arquivo ao remover dot-segments. Faltantes não produzem buffers parciais.
  Conferir intervalo declarado/padding e orçamento agregado antes de decodificar;
  recursos repetidos compartilham uma cópia própria. Ausente difere de null.
  Views não dão licença para ignorar alinhamento/roles/sparse dos accessors.
- Envelope glTF (lote 138): `readGltfEnvelope` só valida contêiner/JSON/versões,
  não geometria/extensões/recursos. Orçamentos antes de JSON.parse, UTF-8 fatal/BOM,
  JSON-only e chunks desconhecidos compatíveis. minVersion governa suporte;
  comparar dígitos sem Number. Não executar/fazer fetch em leitor de entrada.
  BIN próprio via Uint8Array, nunca Buffer.slice; respeitar byteOffset e não
  reter backing completo. `invalid`, `unsupported` e `budget` são distintos.
- Portabilidade assistida (lote 137): fixture deve gravar pelo solver e colar pelo
  comando real antes de exportar; trilhas manuais não provam integração. Conferir
  worker/encoder, validador, deformação nativa versus dois mixers independentes
  e descarte. Bake leva poses e curvas, não restrição IK contínua/limite editável.
  Exportar não descarta pose pendente ou arraste: gate no snapshot e no handler
  vivo, motivo visível e escolha explícita Gravar/Cancelar. Não autogravar.
- Limite de dobra (lote 132): `bendLimit: { min, max }` opcional em grupo/locator,
  graus 0–180 (0 esticado, 180 dobrado), somente para assistência de dois ossos.
  Nunca recortar curvas existentes, Euler/quaternion ou alças de giro. Leitor/
  índice/comando compartilham validação estrita; configuração é um undo separado
  da pose. Campos de faixa pendentes retiram a prévia e bloqueiam novos ajustes.
  Resolver por intervalo radial normalizado, tratar extremos naturais exatamente
  e verificar comprimentos/ângulo sem afrouxar tolerâncias. GLB leva poses, mas
  declara `bend-limit-omitted`; protocolo reserva dois avisos por nó. Regra não
  equivale a torção/cone/dobradiça nem promete rigidez métrica em mundo afim.
- Controles de articulação (lote 131): `useSceneTwoBonePreview` possui uma entrada
  revogável por documento/clipe/tempo/cadeia. `reset` retira a pose pendente mas
  preserva a preparação; `isCurrent` permite reuso sem indexar geometria de novo.
  Alterar campos nunca deixa Gravar confirmar a prévia antiga. Fechar/Escape
  cancelam só essa entrada, sem atingir outra sessão. Mesmos tokens mld/alvos
  44 px, nomes reais dos três apoios e campos exatos opcionais. Não confundir
  controle por passos com alvo 3D arrastável ou homologação de toque/GPU.
- Sessão de articulação (lote 130): reusar `SceneAnimationPoseGesture`, com dono
  discriminado e entrada capturada de `beginTwoBone`. Nunca redirecionar callback
  antigo ao dono atual; articulação exige gravação explícita, não autokey das alças.
  Cancelar revoga o preparado e a entrada. Geração antes da publicação de remoção
  impede commit antigo quando um assinante começa outra pose na mesma revisão.
  Revalidar contexto antes de instalar uma captura após cancelar seleção: a
  publicação de cancelamento pode fazer seek. Miniatura ainda cancela a sessão
  pelo contrato exato do viewport/player. Não anunciar tolerância COW de UI ainda.

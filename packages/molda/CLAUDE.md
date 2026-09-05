# CLAUDE.md — @sistemazero/molda

> Sempre consulte o Context7 (docs atualizadas) antes de mexer em lib/framework, e use
> Octocode para pesquisa/exploração de código no GitHub.

**Molda** — a oficina 3D do Estúdio, para crianças de 9+: **modelos low poly** (peças cubo/rampa/
cilindro/bola numa grade, com a pele PINTADA direto no modelo), **texturas** de superfície (folha
de pixels sem emenda) e **céus 360°** paramétricos (saem como `.hdr`). Jornada do produto: Pensa
planeja → Pinta desenha → **Molda modela** → Estúdio constrói. Irmão do Pinta: mesma arquitetura,
copiada por VALOR (zero import entre os dois pacotes). Biblioteca INTERNA do monorepo, consumida
como **TS source** (sem build): o kids usa `transpilePackages` + `@import "../../../molda/src/
styles/molda.css"` + `@source "../../../molda/src"` no globals.css (sem o `@import` as utilitárias
`mld-*` são no-op; todo `@import` antes de qualquer `@source`).

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

O que fica FORA da v1 (deliberado, decisão da dona em 04/09; ver `docs/plans/2026-09-04-molda-design.md`):
malhas com vértices, animação, UV manual, importar `.glb`/`.bbmodel`, PBR (normal/rough/metal),
física, bloco de aula, rota no adulto e a mão dupla (editar no Molda e o jogo atualizar sozinho).
O que ainda PENDE fora do pacote: o QA no kids `:3008` com dois perfis e o QA da nuvem em staging.

## Modelos prontos + "Baixar tudo" em ZIP (L8)

- **Modelos prontos** (`src/templates/`): o catálogo `MOLDA_TEMPLATES` (personagem, carro,
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
- **Atalhos do Montar**: V mover, R girar, T tamanho, B caixa, M espelho, Delete apagar,
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
  fluxo PULL, não há "Usar no Estúdio"), `initialAssetId?` (deep link `?criacao=`), `onChange?`.
- Subpaths: **`./assets`** (dado puro, zero React/zustand/three/IndexedDB — o `purity.test.ts`
  anda o grafo e reprova) e **`./studio-library`** (zero React; `listGalleryForStudio()`; o
  `exportAssetForStudio(id)` chega com os codificadores). `./styles.css` = `src/styles/molda.css`.

## Modelo de dados (`src/core/model.ts`) e o portão único (`src/core/sanitize.ts`)

- Três criações numa união por `kind`: **`model`** (`parts: MoldaPart[]`, `texelsPerUnit` 2|4|8,
  `snap` 1|0.5, `mirrorX`), **`texture`** (`size` 16|32|64, `bitmap`), **`sky`** (`params`).
- `MoldaPart`: `shape` box|wedge|cylinder|sphere, `from/to` (múltiplos do snap, `from < to`, lado ≤
  32, grade x,z ∈ [-16,16], y ∈ [0,32], chão = y 0), `origin?`, `rotation` (múltiplos de 15),
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
  apagar (confirmação), "Baixar tudo" (`galeria.molda.json`, envelope `molda-gallery` v1) e
  "Trazer de volta" (`importMoldaJson` nunca lança; aceita criação solta).
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

# Molda — a oficina 3D do Estúdio (modelos low poly, texturas e céus HDR)

## Contexto

O Pinta cobre a arte 2D (pixel + vetor) dos jogos 2D. Para os jogos 3D a criança hoje só tem
primitivas coloridas por bloco ou o **upload manual** de `.glb`/`.hdr` que ela não tem como
produzir. O lado consumidor JÁ existe no Estúdio (`packages/studio`, verificado no código):

| formato | `ProjectAsset.kind` | quem consome hoje |
|---|---|---|
| `.glb` (glTF binário v2) | `model3d` | `sz_g3k_part` "modelo importado" (Jogo 3D Avançado), `sz_w3d_scatter_model`/`sz_w3d_place_model` (Mundo 3D), `sz_t3d_load_model` (Canvas 3D) |
| `.hdr` (Radiance RGBE equiretangular) | `environment3d` | `sz_g3k_set_sky_photo`, `sz_w3d_sky_photo`, `sz_t3d_load_environment` |
| `.png` | `image` | `sz_g3d_set_texture` "Vestir X com a imagem Y" (**kit iniciante Jogo 3D**), `sz_g3k_part.texture`, `sz_w3d_totem_image` |

Validação na entrada: `packages/studio/src/core/project.ts:228-276` (`ASSET_3D_SPECS`: MIME
`data:model/gltf-binary` + `.glb` + assinatura GLB v2; `data:image/vnd.radiance` + `.hdr` +
`#?RADIANCE`), tetos `MAX_MODEL3D_DATA_URL_CHARS = 7_000_000`, imagem `800_000`, nome kebab ≤ 48.
No preview a rede é MORTA (`connect-src 'none'`, sem `wasm-unsafe-eval`): o binário chega como
`data:` URL em `window.__SZGAME_ASSETS_3D`, passa por `atob` e por `GLTFLoader.parse(arrayBuffer)`
/ `HDRLoader.parse` (`official-extensions/game-3d-advanced/runtimeModelAssets.ts`). Orçamento por
modelo no runtime: **≤ 48 malhas, ≤ 64 materiais, ≤ 96 draw calls, ≤ 500 k triângulos**; a
mensagem de estouro já manda "unir as peças no editor 3D", um editor que não existe. Os runtimes
fazem `material.map = tex`, `magFilter = NearestFilter`, `colorSpace = SRGBColorSpace` e podem
tingir `material.color`. Todo asset é referenciado pelo NOME dentro da IR.

Pedido da dona (04/09/2026): uma irmã do Pinta para arte 3D, público 9+, "dois modos, modelo e
textura", estudando o Blockbench. **Decisões tomadas com ela nesta sessão**: nome **Molda**; v1
com **Modelo + Céu HDR + Textura de superfície**; peças **cubo + rampa + cilindro + bola**; portão
no **Inventor(a)** com **dois blocos novos no kit Jogo 3D** para o kit iniciante usar o que ela
fez; produto próprio `molda` no catálogo, dentro do combo Comunidade dos Criadores.

## O que o estudo concluiu

**Blockbench** (github.com/JannisX11/blockbench, GPL-3.0; Electron + web, Vue 2 + three 0.129):
editor low-poly de Minecraft (cubos + texturas pixel). Formato `.bbmodel` = JSON com `elements`
(cubo `from/to/origin/rotation/faces{uv,texture}`, `box_uv`; malha com vértices), `outliner`
(grupos), `textures` (PNG base64), `animations`. **Vale copiar a IDEIA, nunca o código (GPL)**:
(1) o cubo como peça-base; (2) **box UV automático** (a criança nunca vê editor de UV); (3)
**pintar direto no modelo** (raycast → face → texel) com balde por face/peça e espelho de pintura;
(4) **espelho de modelagem**; (5) modos que trocam a caixa de ferramentas (Editar × Pintar); (6)
export glTF com textura em `NearestFilter`; (7) projeto JSON com versão + migração lazy (o
`sanitizePintaAsset` do Pinta). **NÃO serve para 9 anos**: medido no web.blockbench.net, 5 menus,
~12 painéis, editor de UV de 5 000 linhas, malhas/loop cut/knife, timeline, Molang, plugins. Um
"Trazer do Blockbench" (`.bbmodel` é JSON legível) é ponte viável numa v2.

**Referências que calibram o público**: Tinkercad (6-12: formas numa grade), Roblox Studio (9+:
parts com cor e snap), editores de skin do Minecraft (pintar pixel a pixel num boneco girando),
Asset Forge (modelos prontos para remixar), Crocotile/Tinypoly (bons para adultos, complexos aqui).

**"Textura HDR" = céu que ilumina.** `environment3d` vira `scene.environment` + `background`: é o
céu 360° que ilumina a cena e dá reflexo. A "textura para modelo feito por código" é um PNG que o
bloco "Vestir X com a imagem Y" aplica num cubo/bola (nearest, sem repetição). Duas coisas, dois
formatos; o Molda faz as duas.

## Decisão de produto

**Molda** (verbo no imperativo, 5 letras, sem acento, como Pensa/Pinta). Jornada:
*Pensa planeja → Pinta desenha → Molda modela → Estúdio constrói*.

| criação | o que a criança faz | sai como | usa no Estúdio |
|---|---|---|---|
| **Modelo** | monta peças (cubo, rampa, cilindro, bola) numa grade e PINTA a pele direto na superfície; abas **Montar** e **Pintar** | `.glb` (`model3d`) | bloco novo "Criar o objeto … com o modelo" no Jogo 3D; "Peça … modelo importado" no g3k; "Pôr/Espalhar o modelo" no Mundo 3D; "carregar modelo" no Canvas 3D |
| **Textura** | folha quadrada (16/32/64) pintada com os mesmos lápis, "sem emenda", prévia num cubo e em 3×3; pode ser **aplicada** numa peça do modelo (copia os pixels para a pele da face; sem referência viva, regra do `image` do Pinta) | `.png` (`image`) | "Vestir X com a imagem" (Jogo 3D), `texture` da Peça (g3k), quadro do Mundo 3D |
| **Céu** | céu paramétrico (presets dia/entardecer/noite/nublado/alienígena, sol, cores, nuvens, estrelas, exposição), prévia iluminando um modelo | `.hdr` (`environment3d`) | bloco novo "Usar o céu 360°" no Jogo 3D; céu de foto no g3k, Mundo 3D e Canvas 3D |

Chegada ao Estúdio na v1 = **fluxo PULL** ("🧊 Trazer do Molda" no painel de Imagens, espelho do
"Trazer do Pinta"); o editor do Molda tem "Baixar" (.glb/.png/.hdr) e uma dica de onde buscar no
Estúdio. Sem botão "Usar no Estúdio" (a dona já rejeitou a lista push no Pinta).

**Fora da v1 (deliberado, com gancho no modelo)**: malhas com vértices, animação, UV manual,
importar `.glb`/`.bbmodel`, PBR (normal/rough/metal), física, bloco de aula, rota no adulto,
mão dupla (editar no Molda e o jogo atualizar sozinho).

## Modelo de dados e limites (`packages/molda/src/core/`)

```ts
type MoldaAssetKind = 'model' | 'texture' | 'sky'
interface MoldaSkin { width: number; height: number; data: Uint8Array }       // row-major
type ShapeId = 'box' | 'wedge' | 'cylinder' | 'sphere'
type FaceId = 'px'|'nx'|'py'|'ny'|'pz'|'nz'|'slope'|'side'|'top'|'bottom'|'around'
interface MoldaPart {
  id; name; shape: ShapeId
  from: Vec3; to: Vec3            // múltiplos do snap (1 ou 0.5), from < to, lado ≤ 32; grade x,z ∈ [-16,16], y ∈ [0,32] (chão = y 0)
  origin?: Vec3                   // pivô da rotação, dentro da caixa; ausente = centro
  rotation: Vec3                  // graus, múltiplos de 15
  color: number                   // índice de paleta ≥ 1: cor base das faces não pintadas
  faces: Partial<Record<FaceId, MoldaSkin>>   // ausente = não pintada; índice 0 no skin = "usa a cor base" (NÃO é transparente)
  mirrorOf?: string               // gêmeo do espelho de modelagem: geometria e pele DERIVADAS da fonte
}
interface MoldaModelAsset { kind: 'model'; id; name; createdAt; updatedAt
  paletteId; customPalette?; extraColors?       // MESMA regra do Pinta (16 + até 48 extras), copiada por VALOR
  texelsPerUnit: 2 | 4 | 8; snap: 1 | 0.5; mirrorX: boolean; parts: MoldaPart[] }
interface MoldaTextureAsset { kind: 'texture'; …; paletteId; customPalette?; extraColors?
  size: 16 | 32 | 64; bitmap: MoldaSkin /* aqui índice 0 = TRANSPARENTE, como no Pinta */; seamless: boolean }
interface MoldaSkyAsset { kind: 'sky'; …; params: SkyParams }
interface SkyParams { preset; sunElevation /* -90..90 */; sunAzimuth /* 0..360 */; sunSize /* 0.5..10° */;
  sunIntensity /* 0..100, HDR */; topColor; horizonColor; groundColor; clouds: { amount; softness; seed: uint32 };
  stars /* 0..1 */; exposure /* 0.25..4 */ }
```

- `MOLDA_LIMITS` (fonte única criação ↔ sanitize ↔ export): `maxParts 128`, `maxPartSize 32`,
  `gridHalf 16`, `gridHeight 32`, skin `4..32` texels por eixo, `texelsPerUnit {2,4,8}`,
  `atlasMax 512`, `textureSizes {16,32,64}`, `maxExtraColors 48`, `maxNameChars 48`,
  `undoBudgetBytes 16_000_000`, `maxGalleryBytes 96 MiB`, espelhos comentados dos tetos do Studio
  (`7_000_000` chars para `.glb`/`.hdr`, `800_000` para `.png`).
- **`sanitizeMoldaAsset(raw): MoldaAsset | null`** = portão único (load + import), nunca lança
  (molde do `sanitizePintaAsset`): id sem `:`, nome kebab, paleta (custom só válida; `extraColors`
  ≤ 48 dedup; chave omitida quando vazia = round-trip byte-idêntico); peça inválida cai SEM
  derrubar o asset; `from/to` arredondados ao snap e clampados; rotação `round(r/15)*15`; skin com
  tamanho divergente é RE-AMOSTRADO (nearest), skin todo 0 some; `mirrorOf` órfão cai; com
  `mirrorX: false` gêmeos são assados; `syncTwins` no fim. Teste-guarda de round-trip por kind com
  `structuredClone` (nunca JSON: o Uint8Array viraria objeto).
- `assetBytes` (modelo = 256 + 160/peça + Σ skins) alimenta o undo por snapshots imutáveis com
  orçamento (cópia do `core/history.ts` do Pinta).

## Motor (`packages/molda/src/`)

```
core/    model, limits, sanitize, palette (cópia do Pinta), history (cópia), bytes, copy, id
model/   shapes (faces e geometria por forma), frame (base s,t por face), transform (matriz da peça, snap),
         skinOps (ensure/resample/resize), twins (gêmeos), pick (raycast puro), atlas (shelf packing),
         atlasRaster (skins → RGBA), build (malha mundial fundida para o export)
paint/   bitmap/ops/tools (cópias do Pinta + opção wrap), faceFill (balde face/peça, espelho), stroke (gesto 3D)
viewport/ MoldaViewport (classe sem React), atlasTexture (DataTexture com upload parcial), partMeshes,
         cameraViews, useViewport (hook), reducedMotion
sky/     params (ranges + presets), noise (hash inteiro, value noise, fbm), render (CPU puro), preview (PMREM)
texture/ ops (wrap, deslocar meio), apply (aplicar na peça: tile | stretch + remap de paleta)
export/  base64, png (codificador próprio), glb (escritor próprio), rgbe (escritor próprio), texturePng, thumbs, zip
components/ MoldaApp, gallery/, editor/ (Model/Texture/Sky screens + painéis), ui/ (cópias do Pinta)
testing/ glbRead, pngDecode, rgbeDecode (decodificadores independentes só para teste), fixtures
```

### Geometria, faces e pele
- Faces por forma: box `px nx py ny pz nz`; rampa `ny nz slope px nx` (5; altura cheia em
  `z = from.z`, zero em `to.z`; `px/nx` triângulos dentro de um skin retangular); cilindro
  `side top bottom` (16 segmentos); bola `around` (12×6, UV equiretangular). Normais PLANAS por
  triângulo (low poly de verdade), índices CCW vistos de fora.
- **Tamanho do skin** = `clamp(round(unidades × texelsPerUnit), 4, 32)` por eixo (`side` do
  cilindro usa o perímetro; `around` usa perímetro × meia-circunferência). Redimensionar a peça ou
  trocar `texelsPerUnit` re-amostra (nearest): a pintura acompanha.
- **Base (s,t) por face** (`model/frame.ts`): cada face tem canto-origem, eixo `s` (direita
  olhando de fora) e `t` (para baixo). **Invariante testado em toda face de toda forma:
  `cross(s, t) == -normal`**. É o que deixa a textura em pé de qualquer vista e casa com o glTF
  (origem da UV no canto superior esquerdo, `flipY = false` no editor E no `GLTFLoader`).
  `faceTexelAt(part, face, localPoint, tpu)` é a inversa do gerador (testado: o centro de um
  texel gerado cai no mesmo texel, inclusive com rotação e pivô).
- **Atlas só no export e no editor, nunca na tela**: swatches 4×4 por cor base (face não pintada
  aponta para o centro do swatch: um modelo sem pintura vira atlas de 64×64 e GLB minúsculo) +
  shelf packing determinístico (ordena por altura/largura/chave, 1 texel de padding, tenta 64 →
  128 → 256 → 512, senão `atlas-full` com aviso "Modelo grande demais para pintar tudo. Diminua os
  texels por bloco"). No editor, `packIncremental` só reempacota quando uma face NOVA ganha pele.
  Raster: 0 → cor base; padding = dilatação da borda (defesa contra filtro linear no runtime).
- **Gêmeos** (`mirrorX`): o gêmeo não guarda skin nem geometria; `syncTwins` deriva `from/to`
  espelhados, rotação `[rx, -ry, -rz]`, mesma cor; geometria = fonte com `x → -x` e winding
  invertido, UVs idênticas (a textura aparece espelhada nele, que é o que "espelhar" significa).
  Pintar ou pegar cor num gêmeo espelha o ponto e resolve na fonte. Desligar o espelho assa o gêmeo
  em peça própria pela tabela de flip por face (testado por amostragem de pontos na superfície).
- **Picking puro** (`model/pick.ts`, slab test + triângulos em espaço local) dá o mesmo resultado
  do `Raycaster` do three (mesma geometria); o viewport usa o three, os testes usam o puro.

### Pintura
- `paint/` = cópia por valor de `bitmap.ts`/`ops.ts`/`tools.ts` do Pinta (`PintaBitmap → MoldaSkin`),
  com `wrap` opcional no pincel e `floodFillWrap` (só na Textura sem emenda).
- Gesto 3D (`paint/stroke.ts`): `pointerdown` → hit `(peça, face, texel)` → `ensureSkin` (face
  nova = zeros; se ganhou região, reempacota ANTES do primeiro texel) → máquina do Pinta no skin;
  `pointermove` na mesma face interpola (Bresenham), face diferente fecha um gesto e abre outro;
  `pointerup` = UM commit para todas as faces tocadas. Balde na face, balde na peça (`part.color`),
  conta-gotas, **espelho de pintura** (espelha o ponto mundial e resolve `pickTexelAtPoint`: vale
  para peça que cruza o plano, gêmeos e peças giradas, sem tabela especial). Paleta = port do
  `PaletteBar`/`PaletteMenu` do Pinta (16 + extras, lixeira só nas extras, "+" cor livre).

### Viewport (three cru, sem React dentro)
- `MoldaViewport(canvas, callbacks)`: `PerspectiveCamera(45)`, `WebGLRenderer({antialias})`,
  `pixelRatio ≤ 2`, `HemisphereLight` + `DirectionalLight`, `GridHelper` + plano do chão, ajudas
  na `layers` 1 (o thumb só renderiza a 0). **UM `MeshStandardMaterial({map: atlas, roughness 1,
  metalness 0})` compartilhado e um `Mesh` por peça** (a fusão em 1 malha só acontece no export,
  onde valem os tetos do runtime); seleção = `LineSegments(EdgesGeometry)`. Render SOB DEMANDA
  (rAF coalescido; laço contínuo só enquanto o damping assenta; com `prefers-reduced-motion`
  damping desligado e vistas por salto). `setModel` incremental por id.
- **Atlas = UMA `DataTexture` RGBA8 (`SRGBColorSpace`, `flipY false`, `NearestFilter`, sem mipmap)
  com upload parcial**: cada pincelada escreve em `image.data` e chama `addUpdateRange` por linha
  suja (o three exige range dentro de uma linha e funde adjacentes; verificado em `updateTexture`
  do 0.184) → poucos `texSubImage2D` de ≤ 32 texels por quadro. Rejeitado: uma `CanvasTexture`
  por face (até 768 texturas/materiais/draw calls e o export teria que fundir de qualquer jeito).
- Controles: `OrbitControls` (`touches` padrão: um dedo orbita, dois fazem pan/zoom; `touch-action:
  none`; menu de contexto prevenido). Em Pintar, o listener de `pointerdown` do Molda é registrado
  ANTES do OrbitControls: acertou peça → `orbit.enabled = false` + `setPointerCapture` + gesto;
  errou → orbita. `TransformControls` (`scene.add(tc.getHelper())`, `setSize(1.5)` para mão de
  criança, `setTranslationSnap(snap)`, `setRotationSnap(15°)`, `setScaleSnap(snap)`,
  `dragging-changed` desliga a órbita; `objectChange` → patch de `from/to`/rotação/tamanho
  arredondado ao snap, `replace` sem undo; `mouseUp` → UM commit, com `resizePartSkins` se o
  tamanho mudou). Adicionar peça = primeiro vão livre perto da seleção, ou clique numa face/chão
  (`hit.point + normal × 0.5`, snap), estilo voxel.
- Raycast → texel: `Raycaster` → `mesh.userData.triangleFace[hit.faceIndex]` → `worldToLocal(hit.point)`
  → `faceTexelAt` (um caminho só; `hit.uv` NÃO serve porque face não pintada tem UV degenerada).
- Perda de contexto: `webglcontextlost` (`preventDefault`) / `restored` (`atlas.needsUpdate`,
  refazer PMREM, `requestFrame`); `dispose()` idempotente (StrictMode); `useViewport` com fábrica
  injetável para os testes de componente. Thumb do modelo = `WebGLRenderTarget(96²)` +
  `readRenderTargetPixels` → canvas → JPEG ≤ 12 000 chars (teto do `thumb` das creations); sem GL
  → `null` → emoji (🧊 modelo, 🧱 textura, 🌤️ céu). Thumbs de textura e céu são PUROS.
- Metas: 60 fps orbitando com 128 peças (≤ 128 draw calls, ~60 k tris no pior caso); traço ≤ 2 ms
  por quadro; face nova (reempacotar + reraster + upload ≤ 1 MB) ≤ 16 ms.

### Export (escritores PRÓPRIOS, puros, determinísticos, testáveis sem canvas)
- **PNG** (`export/png.ts`): assinatura + `IHDR` (RGBA 8 bits) + `IDAT` (`fflate zlibSync`,
  filtro None por linha) + `IEND`, CRC32 próprio. Base64 em blocos de 32 KiB (nunca spread de
  array grande: lição do GIF do Pinta).
- **GLB** (`export/glb.ts`): `buildModelMesh` gera geometria MUNDIAL por peça (gêmeos incluídos),
  funde tudo, translada para a origem no centro do chão (`y 0` = chão: o Estúdio põe no chão),
  `Uint16` até 65 535 vértices. Container: header `glTF`/2/tamanho, chunk JSON (padded com 0x20 até
  múltiplo de 4), chunk BIN (padded com 0x00); bufferViews POSITION/NORMAL/TEXCOORD_0 (float32,
  target 34962), INDICES (34963), IMAGE (PNG do atlas); acessores com `min/max` no POSITION; JSON:
  1 node, 1 mesh/1 primitive, 1 material `pbrMetallicRoughness { baseColorTexture 0, baseColorFactor
  [1,1,1,1], metallicFactor 0, roughnessFactor 1 }`, 1 texture, sampler `{ magFilter 9728, minFilter
  9728, wrapS/T 33071 }`, 1 image `image/png`. Recusa antes dos 7 M chars com recado gentil.
  Por que funciona no runtime: 1 malha, 1 material, `map` já presente, fator branco deixa
  `material.color` neutro, sampler NEAREST evita mipmap e vazamento.
- **RGBE** (`export/rgbe.ts`): header `#?RADIANCE\n# Molda\nFORMAT=32-bit_rle_rgbe\n\n-Y h +X w\n`
  (os 10 primeiros bytes são o que o `isRadianceHdr` checa; casa as regexes do `HDRLoader`).
  Float → rgbe com expoente compartilhado (`v = max(r,g,b)`; `v < 1e-32` → 0; `e` tal que
  `v/2^e ∈ [0.5,1)`; canais `floor(c × 256/2^e)`, `e + 128`). Scanlines: `w < 8 || w > 32767` →
  flat; senão `[2,2,hi,lo]` + RLE adaptativa POR CANAL (repetição ≥ 4 → `[128+run, valor]`, run
  ≤ 127; literais em blocos ≤ 128), exatamente o que `RGBE_ReadPixels_RLE` espera. Export a
  1024×512 num `setTimeout` com toast "Preparando o céu..." (~0,5-1,5 s).
- **Textura** (`export/texturePng.ts`): índice 0 → alfa 0 (regra do Pinta); `data:image/png;base64,`.

### Céu (`sky/render.ts`, CPU puro, determinístico por seed, zero `Math.random`)
Por pixel: direção pela convenção do `equirectUv` do three (linha 0 = zênite, a orientação que o
`HDRLoader` + `flipY = true` esperam) → gradiente topo/horizonte/chão em linear (curva sRGB exata)
× fator de dia (`smoothstep` na elevação do sol) → disco solar com borda suave + halo exponencial
+ névoa no horizonte (`sunIntensity` até 100: é o que faz o PMREM dar reflexo de verdade) → nuvens
por fbm de value noise projetado no domo (`amount`/`softness`/`seed`) → estrelas em células fixas
(mesmas estrelas na prévia 256×128 e no export 1024×512) → × `exposure`. Presets em tabela testada
contra os ranges; mexer em slider põe `preset = 'custom'`; "Sortear nuvens" troca só o seed.
Prévia: `DataTexture` **half float** (`DataUtils.toHalfFloat`; float32 com filtro linear falta em
celular), `LinearSRGBColorSpace`, `EquirectangularReflectionMapping`, `flipY true` →
`PMREMGenerator.fromEquirectangular` em `scene.environment` + a própria textura em `background`;
objeto de amostra = casinha de 3 caixas + esfera metálica (reflexo visível) ou um modelo da galeria.

### Textura (`texture/`)
Bitmap `size²`, ferramentas do Pinta; `seamless` liga o `wrap` (traço/balde atravessam a borda);
"Deslocar meio" é deslocamento de VISTA na sessão (não entra no undo); prévia 3×3 e cubo/esfera
com `RepeatWrapping`. `applyTextureToFace/Part(mode: 'tile' | 'stretch')`: cópia texel a texel
(0 preserva a cor base), paletas diferentes passam pelo `remapBitmapColors` copiado do Pinta; um
commit só; é bake (apagar a textura depois não afeta o modelo).

## Pacote (`packages/molda`, espelho do Pinta)

- `package.json`: `@sistemazero/molda`, TS-source sem build, `module: src/index.ts`, exports `.`
  (React), `./assets` (dado puro, zero React: `MOLDA_ASSET_KINDS`, `MOLDA_LIMITS`,
  `sanitizeMoldaAsset`, `isMoldaAssetLike`, `normalizeAssetName`, `createAsset`, `assetToJson`/
  `assetFromJson`, `moldaAssetToWire`/`FromWire`), `./studio-library`, `./styles.css`. Deps
  `clsx`, `fflate`, `idb-keyval`, `lucide-react`, `zustand`, **`three ^0.184.0` na MESMA faixa do
  kids** (`packages/community-kids/package.json:51`; `@types/three ^0.184.1` em dev), peer
  `react ^19`; devDeps do Pinta (happy-dom, RTL, `sharp` para decodificar PNG nos testes, vite,
  playwright). ⚠️ O `three` hoje vive em `node_modules` POR pacote (kids 0.184, studio 0.180):
  confirmar no `next build` do kids que só existe UM `three.module.js` no bundle; se duplicar,
  alias em `next.config.ts` (`turbopack.resolveAlias`/webpack) apontando para a cópia do kids.
  Nada de Draco/Meshopt/KTX2/Rapier (CSP sem `wasm-unsafe-eval`); nunca `fetch('data:')`.
- `tsconfig.json`, `bunfig.toml`, `test-setup.ts`: cópias literais do Pinta. Playground Vite
  `:5198` (`.claude/launch.json`), `CLAUDE.md` no molde do Pinta.
- `state/persistence.ts`: `setMoldaStorageNamespace`/`createMoldaPersistence({namespace})` sobre
  idb-keyval (`sistema-zero-molda-<ns>`, `molda:asset:<id>`, structured clone), FIFO por handle,
  `setMany` atômico, `safeSanitize` por registro, orçamento SIMPLIFICADO por `asset.bytes`
  (inventário em memória + `BroadcastChannel('molda:assets:<db>')`, sem o `GalleryBackupSizeCache`
  do Pinta), `MoldaStorageBudgetError`, registro de aberto (`markMoldaAssetOpen/Closed`,
  `isMoldaAssetOpen`, `subscribeMoldaAssetOpenState`), `subscribe?` (`sync-start`/`changed`/
  `sync-end`); `memoryPersistence.ts`.
- Stores zustand POR INSTÂNCIA: `galleryStore` (CRUD, nome único `-2`, `importAssets` com ids
  novos, `attachPersistence` relê em `changed` e expõe `syncing`), `editorStore` (history + autosave
  debounced + `savedAsset`), `sessionStore` (modo, ferramenta, cores, vista, deslocamento de vista).
- `MoldaHostAdapter { theme?; studioOwned?; onOpenStudio?; initialAssetId?; onChange? }`,
  `<MoldaApp adapter persistence?>` uncontrolled, galeria ⇄ editor por estado, `data-molda-theme`
  no root, `InitialAssetOpener` espera `loaded` e `sync-end`.
- `styles/molda.css`: `@theme` sob `[data-molda-theme]`, tokens `--color-mld-*` apontando para
  `--sz-kids-*` com fallback literal (copiar os valores de `pinta.css:23-60`), `--color-mld-kind-
  model/texture/sky`, `[data-molda-theme="dark"]`, tokens só-CSS fora do `@theme` (o Tailwind
  poda), `.mld-btn-3d`/`.mld-panel`/`.mld-gallery-card { content-visibility: auto }`; proibido
  `@import "tailwindcss"`, `@source`, `@custom-variant dark`, regra global; `color-mix in oklab`.
- `core/copy.ts`: 100 % pt-BR, sem travessão, sem "etapa"/"curso-base" (testes do kids varrem).
  Galeria "Minhas criações 3D"; kinds Modelo/Textura/Céu; Montar/Pintar; Adicionar caixa/Rampa/
  Cilindro/Bola; Espelhar no X; Encaixe de meio bloco; Mover/Girar/Tamanho/Duplicar/Apagar; Lápis/
  Borracha/Balde na face/Balde na peça/Conta-gotas/Espelho de pintura; Texels por bloco; Frente/
  Trás/Esquerda/Direita/Cima/Enquadrar; Altura do sol/Direção do sol/Tamanho do sol/Brilho do sol/
  Nuvens/Sortear nuvens/Estrelas/Exposição; Sem emenda/Deslocar meio/Aplicar na peça; Baixar .glb/
  .png/.hdr; "Preparando o céu...". Atalhos: pintura com as letras do Pinta (P/E/G/I), montar
  V/M/R/T/B, Delete, Ctrl+D, Ctrl+Z/Y; ignorados em campo de texto e com modal aberto.
- UI: cópias do Pinta (`Button`, `Dialog` com `returnFocusTo`, `Panel`, `Toast`, `ToolButton` 44 px,
  `useMediaQuery`). Layout espelho do Pinta: caixa à esquerda em 2 colunas (muda com a aba
  Montar/Pintar; tamanhos no topo e as duas cores no pé em Pintar), viewport no centro, coluna
  direita `w-68` (Peças → Cores → Propriedades), faixa de baixo (vistas + Enquadrar + Grade +
  status "N/128 peças · T triângulos · atlas W×H"), barra de cima (Voltar, nome, Montar/Pintar,
  Desfazer/Refazer, Salvo, Baixar). Tela estreita: coluna direita vira disclosure abaixo do palco.
  `TextureEditorScreen` (palco de pixels + prévia 3×3 + prévia 3D) e `SkyEditorScreen` (viewport
  de prévia + painéis de presets/sol/cores/nuvens/estrelas/exposição). Diálogos `NewAssetDialog`
  (tipo → tamanho/texels → nome), `ApplyTextureDialog`, `ExportDialog`.

## Integrações

### Portão de carreira e acesso (`packages/member-shell`)
- `src/lib/studio-tier.ts` (após a l.45): `THREE_D_CREATION_MIN_LEVEL: CareerLevelSlug = 'hacker'`
  (o degrau estudado pelo Inventor(a) é o Iniciante 3D, `docs/carreira-do-criador.md:214-215`:
  a oficina 3D abre onde a trilha 3D começa); terceira constante ao lado de
  `FREE_CREATION_MIN_LEVEL` e `AI_APPS_MIN_LEVEL`.
- `src/server/creative-apps-access.ts`: `meetsThreeDCreationLevel` (cópia de
  `meetsFreeCreationLevel`, l.42-48).
- `src/server/clients.ts`: `MOLDA_ACCESS_REF = 'molda'` (após a l.117); `checkMoldaAccessReadonly()`
  (refs `molda,estudio-completo`) e `checkCreativeToolsAccessReadonly()` (refs
  `estudio-completo,pinta,molda`, uma ida só para o `/estudio`); exportar em
  `packages/community-kids/src/server/members.ts`.

### Kids (`packages/community-kids`)
| arquivo | diff |
|---|---|
| `package.json` | `"@sistemazero/molda": "workspace:*"` + `bun install` |
| `next.config.ts` | `transpilePackages` + `'@sistemazero/molda'` |
| `src/app/globals.css` | `@import "../../../molda/src/styles/molda.css";` (após a l.17) e `@source "../../../molda/src";` (após a l.28); os DOIS são obrigatórios (sem o `@import` as `mld-*` são no-op) e todo `@import` fica antes de qualquer `@source` |
| `src/lib/embedded-app-path.ts:7` + `tests/embedded-app-path.test.ts:36` | `'/molda'` (o teste assere a lista exata) |
| `src/proxy.ts:28` | `'/molda'` em `protectedPrefixes` |
| `src/components/kids/nav.ts` | `{ href: '/molda', label: 'Molda', icon: Box, match: '/molda' }` entre Pinta e Estúdio; `MOBILE_NAV_ITEMS.match` do `/criar` ganha `'/molda'` (tab bar segue com 5) |
| `src/app/(app)/criar/page.tsx` | 4º card `JOURNEY` (step 3 "Molda": "Modele personagens, texturas e céus 3D para o seu jogo."; Estúdio vira step 4) |
| `kids-locked-molda.tsx`, `kids-career-locked-molda.tsx` (`minLevelSlug={THREE_D_CREATION_MIN_LEVEL}`), `kids-molda-unavailable.tsx` | wrappers no molde dos do Pinta/Pensa |
| `src/app/(app)/molda/{page,loading}.tsx` | gate de 4 estados (molde `pinta/page.tsx:24-45`, sem handoff): indisponível / sem produto / abaixo do Inventor(a) / `<MoldaClient viewerId studioOwned>` |
| `src/components/kids/molda-client.tsx` | molde `pinta-client.tsx` sem Pensa: import dinâmico no efeito, `setMoldaStorageNamespace(viewerId ?? '')` ANTES de montar, `EMBEDDED_APP_FRAME`, `useTheme` → `adapter.theme`, `onOpenStudio`; nuvem no L6 |
| `src/lib/career-rewards.ts` + `tests/career-rewards-conformance.test.ts` | Inventor(a) anuncia "Pensa + Zappy + Molda"; `PROMISES_MOLDA` contra `THREE_D_CREATION_MIN_LEVEL` |
| `railway.json` watchPatterns (`/packages/molda/**`), `.github/workflows/ci.yml` (`packages/molda/*) add community-kids ;;`) | deploy |
| `CLAUDE.md` do kids | seção "Molda (oficina 3D, produto vendável)" |

Regime das rotas embarcadas (`main-container.tsx`: `md:h-dvh md:min-h-[36rem]` + frame
`min-h-[34rem]`): a viewport WebGL é `h-full min-h-0` e rola por dentro; medir em 1366×768 e numa
janela de ~500 px. Sidebar chega a 10 itens: se clipar a 768 px, `nav` ganha `min-h-0
overflow-y-auto`.

### Catálogo (`packages/catalog/scripts/seed.ts`)
`MOLDA_SKU = 'molda'`, produto `kind: 'tool'` + oferta `molda-padrao` R$97 placeholder (molde do
Pinta, l.266-309), componente do combo Comunidade dos Criadores (`sortOrder: 6`) + descrição.
⚠️ O seed só CRIA o bundle quando não existe: em staging/prod o operador adiciona o componente ao
bundle pelo admin E concede `molda` aos assinantes ativos (o members não reconcilia combo
alterado); sem isso a tela bloqueada promete "faz parte da Comunidade" a quem já assina.

### Nuvem ("Guardado na sua conta") — o union da tool está espelhado em SEIS lugares
| arquivo | diff |
|---|---|
| `packages/members/src/infrastructure/persistence/drizzle/schema.ts:1269` | `creation_tool` = `['studio','pinta','molda']` (`'molda'` no FIM) |
| migration `0072_*.sql` | gerar com `bun run db:generate` (NUNCA `when` à mão); manter SÓ `ALTER TYPE "members"."creation_tool" ADD VALUE IF NOT EXISTS 'molda';` (cabeçalho de `0065_pinta_block.sql`); descartar `ALTER TYPE` antigos que o generate re-proponha |
| `packages/members/src/domain/creations/creation.ts` | `CREATION_TOOLS` + `'molda'`, `CREATION_ACCESS_REF.molda = 'molda'` |
| `packages/members/src/interfaces/http/dtos.ts:1393` | `t.Literal('molda')` |
| `creations.service.ts:99-104` (mapa de nomes), `tool-ownership-cache.ts:35-38` (⚠️ lista tools na mão: sem `molda` uma matrícula revogada seguiria reservando por 60 s), `creations.repository.ts:524` e `tests/fakes/creations-in-memory.ts:61` (⚠️ `Record<CreationTool, number>` literal para de compilar: derivar de `CREATION_TOOLS`) | |
| `packages/members/tests/db/creations.repository.test.ts:42` + `tests/integration/creations.test.ts` | DDL do enum com os 3 + `add value if not exists`; casos: reserva `molda` sem posse → 403, com `grantLifetime('molda')` → 200, `kind: 'model'` aceito |
| `packages/core/src/creations/storage-keys.ts:8` | `CreationStorageTool` + `'molda'` |
| `packages/member-shell/src/routes/creations.ts:50` (`z.enum`) e `src/lib/types.ts:529` | `'molda'` |
| `packages/community-kids/src/lib/creations-cloud.ts:36` | `CreationTool` + `'molda'` |
| `packages/community-kids/src/lib/molda-cloud-persistence.ts` (novo) | molde `pinta-cloud-persistence.ts` sem paletas: marcas `sz:creations-synced:molda:<viewer>`, produtor `null` sem mudança, `meta.thumb` só ≤ 12 000 chars, `reconcileCreations` com `isBusy`/`localUpdatedAt`/`fetch` (`assetFromJson` + `sanitizeMoldaAsset` + id igual)/`apply`/`keepLocalCopy` (`-copia`)/`resolveStale`; `uniqueAssetName` extraído para `src/lib/creation-names.ts` e re-exportado pelo módulo do Pinta |
| `molda-client.tsx` | `createCreationsCloud({ tool: 'molda', viewerId, idleMs: 5_000 })` + `CloudSaveBadge`, `flush({timeoutMs: 5000})` no cleanup |

Gateway e shims `api/creations/[tool]` são genéricos por `:tool`: zero mudança. Deploy:
**members antes do kids** (sem a migration, a reserva `molda` falha e a fila retenta).

### Estúdio (`packages/studio`)
1. **"🧊 Trazer do Molda"** (fluxo PULL, zero import entre pacotes):
   - Molda: `src/export/studioLibrary.ts` (subpath `./studio-library`, zero React; re-exporta
     `setMoldaStorageNamespace`): `listGalleryForStudio()` (`{id, name, kind, updatedAt, bytes,
     thumbDataUrl}`, cache por ns+id+updatedAt) e `exportAssetForStudio(id)` → `MoldaExportedAsset
     { id, name, kind: 'model3d'|'image'|'environment3d', dataUrl, originalFileName ('<nome>.glb'|
     '.png'|'.hdr'), width?, height?, bytes, thumbDataUrl }` ou `{ok:false, reason: 'not-found'|
     'encode-failed'|'asset-too-big'}`; tetos com comentário recíproco (`STUDIO_MAX_3D_CHARS =
     7_000_000`, `STUDIO_MAX_TEXTURE_CHARS = 800_000`); teste reimplementa `isGlbV2`/`isRadianceHdr`.
   - Studio: `src/studio/molda-library.ts` (clone de `pinta-library.ts`: adapter `{ list(); import(id) }`,
     contexto/provider), `studio/types.ts` `moldaLibrary?`, latch + provider no `StudioCore`, tipos
     no `index.ts`, i18n `moldaImport.*` em pt-BR E en (o teste de i18n exige as mesmas chaves),
     `components/assets/MoldaImportDialog.tsx` (clone do `PintaImportDialog` chaveado por `kind`;
     "Adicionar" de modelo/céu desabilitado sem extensão 3D, texto "Instale o Jogo 3D ... para usar
     modelos e céus"), `AssetsPanel.tsx` (botão após o do Pinta; seção "Meus desenhos" e
     `editableDrawingIds` filtram `kind === 'image'`, senão um `.glb` cairia em `addFromPersonal`
     como imagem e o "editar" abriria o Pinta), `asset-library/personal.ts` (`PersonalAsset.kind:
     'image'|'model3d'|'environment3d'` + `originalFileName?`; legado sem `kind` = imagem;
     validação por `isValidAssetDataUrl`; `PERSONAL_ASSET_LIMITS.maxTotalChars` 24 M → 40 M),
     `personalSync.ts` já filtra imagem (mão dupla 3D fica para depois), empty state do seletor 3D
     (`FieldAssetPicker.ts:299-311`) cita o Molda como o ramo do mapa cita o Pinta.
   - Kids: `estudio/page.tsx` usa `checkCreativeToolsAccessReadonly` (uma ida) → `moldaOwned`;
     `studio-full-client.tsx` monta `moldaLibrary` SÓ com posse (`import('@sistemazero/molda/
     studio-library')`, nunca a raiz; `setMoldaStorageNamespace(viewerId)` em cada método;
     `import(id)` → `exportAssetForStudio` → `savePersonalAsset({kind, originalFileName, ...})`
     ANTES de devolver, com o nome salvo); `studio-full-editor.tsx` repassa a prop.
2. **Kit Jogo 3D (iniciante) ganha dois blocos** (checklist verificado no código):
   - `sz_g3d_create_model_file` "Criar o objeto %1 com o modelo %2 na cena %3 tamanho %4":
     `field_input NAME` (declara) + `field_asset_picker {kind:'3d', filter:'model3d'}` +
     `field_name_picker {kind:'g3d-world'}` (⚠️ é `g3d-world`, não `scene3d`) + `input_value SIZE`;
     `placement: 'start-only-command'`, `inputsInline: true`. Após `sz_g3d_create_model`
     (`game-3d/blocks.ts:1687`), subcategoria `'🧊 Formas & modelos'` (`SUBCAT_DEFINITIONS`, `:2213`;
     nunca criar subcategoria nova: as cores re-derivam). Sombra obrigatória em
     `G3D_SOCKET_SHADOWS` (`:2390`, `SIZE: numShadow(1)`).
   - `sz_g3d_sky_photo` "Usar o céu 360° %1 na cena %2": `field_asset_picker {kind:'3d',
     filter:'environment3d'}` + `g3d-world`; após `sz_g3d_set_sky` (`:1881`), `'💡 Luz & céu'` (`:2237`).
   - **Runtime** (`game-3d/runtime.ts` é STRING template: crase e `${` escapados, `templateGuard`):
     ler `window.__SZGAME_ASSETS_3D` ao lado de `ASSETS` (`:59-61`), colar
     `dataUrlToBufferRuntimeSource` (`official-extensions/assetRuntime.ts`) por `replace` de marcador
     como o kit plataforma (`:3547-3553`); portar do g3k (`game-3d-advanced/runtimeModelAssets.ts`)
     `loadModel` (284-403: fila por nome, timeout 10 s, `GLTFLoader().parse(buf,'',cb,err)`),
     `inspectModel`/`modelBudgetProblem` (167-212), `warmModel`, `disposeImportedModel`, e
     `useEnvironmentTexture`/`loadHdrTexture`/`setSkyPhoto` (427-545) adaptados a `world.scene`
     (o g3d é multi-cena; `setSky` `:1152-1174` mostra o dispose do background antigo).
     ⚠️ `runProject` do g3d é SÍNCRONO (`:3368`): o objeto nasce como cubo placeholder via `addMesh`
     (`:504-527`, é o que registra `_objects` + `attachWorld` e faz mover/girar/colidir/vestir
     funcionarem) e as malhas do GLB são penduradas quando o parse resolve. Caches novos liberados
     em `disposeAll` (`:2258-2273`, molde do `_texCache`). Exportar `createModelFile`/`skyPhoto` no
     literal `window.SZGame3D` (`:3378`).
   - **IR**: ⚠️ `ir/schema.ts` está no TETO de linhas (`architecture.test.ts` ≤ 12 800, folga ~0):
     os dois membros moram num módulo lateral do kit, no molde de `game-3d/platformIR.ts` +
     `platformCodec.ts` (fiado em `schema.ts:33-37`/`:3306-3310`), nunca fundidos com outro `type`
     (regra do `Extract`). Adicionar em `G3D_STATEMENT_TYPES` (`schema.ts:12169+`),
     `GAME3D_START_ONLY_STATEMENT_TYPES` (`three/game3dContract.ts:550-598`, cobrado pelo
     `blockAudit`), `GAME3D_SEMANTIC_DECLARATION_FIELDS` (`:15-34`, `'g3d:createModelFile': {field:
     'varName', kind: 'object'}`), `GAME3D_SEMANTIC_REFERENCE_FIELDS` (`:48+`, `[world()]` nos dois)
     e ⚠️ `GAME3D_CALL_ARITIES` (`:470-537`: `createModelFile: 3`, `skyPhoto: 2`; sem isso o parser
     devolve `null`). Custo: 2 membros na união da IR (folga ~40, `packages/studio/CLAUDE.md`).
   - **Cadeia**: `blockly/buildIR.ts` (ao lado de `sz_g3d_create_model` `:4896` e `sz_g3d_set_sky`
     `:5008`, com `seen.add('game-3d')`), `generators/js.ts` (emissão `:2586-2609` +
     `collectStatementIdentifiers` `:6247-6271`), `parsers/js.ts` (`tryMatchGame3DVarInit` `:10668`,
     molde `createTorus` `:10794`; statements `:10449`), `blockly/workspaceState.ts`
     (`statementToBlock`, 5º arg = soquetes, molde `g3d:createBox` `:2874`), `FieldNamePicker.ts`
     `OBJECT3D_DECL_BLOCKS` (`:1231`). Derivados sozinhos: allowlist do `projectStore`,
     `blockLevels` (`sz_g3d_` → `iniciante-3d`), `blockCatalog`.
   - **Docs/IA/testes**: `manifest.ts` `0.29.0 → 0.30.0` + manual do aluno; `ai.ts` cita
     `createModelFile(` e `skyPhoto(` (drift `docDrift`); `runtimeTypecheck.test.ts` ganha
     `__SZGAME_ASSETS_3D` no `HOST_CONTRACT`. Cobram: `blockAudit` (round-trip byte-idêntico +
     start-only ⇔ contrato), `docDrift` (`categoriaMais` vazio), `blocksPedagogy` (tooltip + sombra),
     `templateGuard`, `restoreShadowLiterals`, `architecture`. Exemplos/`serverExamples` só mudam se
     um exemplo usar os blocos.
   - `AssetsPanel.tsx:53-70` `has3DExtension` passa a incluir `game-3d` (+ comentário `:56-63`).
3. Bug adjacente, fora de escopo, registrar: `export/fileMap.ts:232` deixa os assets 3D fora do
   ZIP exportado.

## Lotes (cada um é um PR que fecha sozinho; ordem recomendada)

- **L1 — pacote + galeria + rota kids (sem 3D ainda)**: esqueleto, `core/` (tipos, sanitize,
  limites, paleta, história, copy, id), `state/` (persistence, memoryPersistence, galleryStore),
  `export/assetJson.ts` + `assets/wire.ts`, `assets/index.ts`, `styles/molda.css`, `MoldaApp` +
  galeria + `NewAssetDialog`, `index.ts`; member-shell (constante + refs); kids (tabela acima,
  sem nuvem); catálogo; design doc `docs/plans/2026-09-04-molda-design.md` (cópia deste plano).
  Testes: persistence, galleryStore, assetJson (round-trip por `structuredClone`), project
  (sanitize por kind, peça inválida cai sem derrubar), MoldaApp, `assets/purity.test.ts`,
  `host-conformance.test.ts` (railway/ci), embedded-app-path, career-rewards.
- **L2 — Modelo/Montar**: `model/shapes|frame|transform|skinOps|twins|pick`, `viewport/*` (sem
  pintura), `PartsPanel`/`PropertiesPanel`/`Toolbox` do Montar, undo, thumb. Marco: montar, mover,
  girar, redimensionar, espelhar, duplicar, apagar com undo e 60 fps a 128 peças.
- **L3 — Modelo/Pintar + atlas + GLB**: `model/atlas|atlasRaster|build`, `paint/*`,
  `viewport/atlasTexture`, `export/png|glb|base64|thumbs`, `ColorsPanel`, `testing/glbRead|pngDecode`,
  Baixar `.glb`. Marco: pintar ao vivo e um GLB que o `GLTFLoader` abre e o Studio aceita.
- **L4 — Céu + RGBE**: `sky/*`, `export/rgbe`, `SkyEditorScreen`, `testing/rgbeDecode`.
- **L5 — Textura + Aplicar**: `texture/*`, `TextureEditorScreen`, `ApplyTextureDialog`,
  `export/texturePng`.
- **L6 — nuvem**: members (schema + migration 0072 + domínio + DTO + service + cache + repo/fake +
  tests/db + integração), core, member-shell, kids (`creations-cloud`, `molda-cloud-persistence`,
  `molda-client` liga fila + selo), `tests/molda-conformance.test.ts` (varre por texto os seis
  espelhos + migration + `proxy.ts` + `seed.ts` + `EMBEDDED_APP_PREFIXES`). Deploy members ANTES.
- **L7 — Estúdio**: "Trazer do Molda" (Molda `studio-library` + Studio adapter/dialog/personal
  assets 3D + kids wiring) e os dois blocos do kit Jogo 3D + `has3DExtension`.
- **L8 — modelos prontos + backup + docs**: `templates/` (personagem, carro, árvore, casa, nave)
  como o Pinta; "Baixar tudo"/"Trazer de volta" (`galeria.molda.json` + `.glb/.png/.hdr`);
  CLAUDE.md dos pacotes tocados (molda, kids, members, member-shell, studio);
  `docs/carreira-do-criador.md` (Inventor(a) ganha o Molda); QA integrado.

## Riscos e gotchas (todos vistos no código)

1. Duas cópias do `three` no bundle do kids (seção Pacote): checar no build; alias se preciso.
2. `TransformControls` no toque de criança: validar cedo em tablet real (`setSize(1.5)`).
3. Atlas cheio com texels 8 e 128 peças: aviso + swatch das faces não pintadas mitigam.
4. Thumb do modelo precisa de render target (sem `preserveDrawingBuffer`) e de canvas para o JPEG.
5. Céu a 1024×512 no celular (~1 s): toast + `setTimeout`.
6. `Record<CreationTool, number>` literal para de compilar; `invalidateToolOwnership` lista tools
   na mão; enum no FIM do array + `when` gerado (incidente 03/08 da migration pulada).
7. `tests/db/creations.repository.test.ts` cria o enum com `if not exists`: banco compartilhado
   deixa o enum velho; somar `add value if not exists`.
8. `globals.css`: `@import` obrigatório e antes de qualquer `@source`.
9. `tests/embedded-app-path.test.ts` assere a lista exata; `copy-sem-travessao` e
   `copy-vocabulario` varrem o `src/` do kids.
10. `PersonalAsset` legado não tem `kind` (default `image`); teto total 24 M → 40 M chars.
11. Sem `pintaLibrary` a seção "Meus desenhos" reaparece: filtrar imagens.
12. `has3DExtension` exclui `game-3d` até os blocos novos entrarem (mesmo lote L7).
13. Ids passam em `^[A-Za-z0-9_-]{1,64}$` (`crypto.randomUUID`, nunca `:`).
14. `bun run --filter '*' test` roda 22 pacotes juntos: teste sensível a tempo re-roda sozinho.
15. Item da nuvem pode chegar a ~7 MB de JSON base64: `idleMs 5 s`, marca por `updatedAt`
    (zero HTTP sem mudança), fila já compassa 429.
16. Combo do catálogo não ganha o componente pelo seed (backfill operacional).
17. Crase crua dentro do template do runtime do g3d = suíte pendurada (`templateGuard` primeiro).

## Verificação

- **Unitários/propriedade (bun + happy-dom, sem WebGL)**: sanitize round-trip por kind; geometria
  (contagem de triângulos, normais unitárias, CCW, `cross(s,t) = -normal` em toda face, `faceTexelAt`
  inversa do gerador com rotação e pivô); atlas (200 listas aleatórias com seed fixo: sem
  sobreposição contando padding, dentro dos limites, determinismo, `atlas-full`, incremental
  preserva regiões); gêmeos (geometria espelhada com winding invertido, `bakeTwins` ≡ espelhar por
  amostragem, `syncTwins` idempotente); pick com rotação; pintura (testes do Pinta + `wrap` +
  máquina 3D: troca de face fecha o gesto, um undo só); PNG (encode → decoder próprio e `sharp`
  idênticos, CRCs, bytes determinísticos); GLB (`testing/glbRead`: magic/versão/tamanhos múltiplos
  de 4/offsets alinhados/1 malha/1 material/1 textura/sampler 9728-33071/`min-max`/índices no
  range + os 8 bytes do `isGlbV2` + MEDIÇÃO do pior caso 128 esferas texels 8 ≤ 7 M chars); RGBE
  (round-trip via `new HDRLoader().parse(buffer)` com `FloatType`, que é JS puro e roda no bun, E via
  decoder próprio; tolerância `max(r,g,b)/128`; larguras 4/8/1024; runs de 4, 127, 200, 128
  literais; `#?RADIANCE` nos 10 primeiros bytes; MEDIÇÃO nublado+estrelas 1024×512 ≤ 7 M chars);
  céu (determinismo bit a bit, seed só muda nuvens, sol a 90° no topo, noite escura, tudo finito e
  ≥ 0, presets nos ranges, perf registrada sem assert apertado); textura (tile/stretch/remap/0
  preservado); thumbs; componentes (alternador de modo, toolbox por modo, paleta no slot ativo,
  steppers commitam e desfazem, `useViewport` com fábrica fake); persistence/gallery/cloud/
  conformidades listadas nos lotes.
- **Playwright (Chromium real, playground `:5198`, `window.__molda` expõe model/viewport)**: viewport
  renderiza; pintura por raycast muda o texel e o pixel; alças movem `from.x` em um snap e giram
  15°; `GLTFLoader.parse` do nosso GLB na página (1 malha, `map`, mesma contagem de triângulos,
  render idêntico); `HDRLoader.parse` (e o alias `RGBELoader`) do nosso HDR + PMREM sem erro; toque
  emulado (um dedo orbita, dois aproximam, um dedo pinta); perda de contexto
  (`WEBGL_lose_context`) recupera.
- **Round-trip com o Estúdio** (playground do studio `:5173` ou kids `:3008`): `.glb` do Molda →
  "Trazer do Molda" → `sz_g3k_part` "modelo importado" e o bloco novo do Jogo 3D renderizam no
  preview SEM erro de CSP/WASM; `.hdr` → `sz_g3d_sky_photo`/`sz_g3k_set_sky_photo` mudam fundo e
  reflexo; `.png` → "Vestir X com a imagem" nítido; tetos (modelo > 5 MB recusado com recado;
  128 peças = 1 malha dentro dos 48/64/96).
- **Roteiro de QA no playground**: criar "casa" com texels 4 → adicionar caixa, mover com a alça,
  ligar encaixe ½, redimensionar (peles re-amostradas) → espelhar no X, peça em x>0 vira gêmea,
  girar 15°, desligar o espelho e conferir a pintura espelhada assada → pintar (lápis, balde na
  face, balde na peça, conta-gotas, espelho numa caixa centrada), Ctrl+Z desfaz o traço inteiro →
  texels 4→8→2 → Baixar `.glb` e abrir num visualizador → 128 peças orbitando liso → pintar em
  texels 8 até o aviso de atlas cheio → textura 32 sem emenda (traço atravessa a borda, deslocar
  meio, 3×3, cubo, Aplicar na peça em tile, `.png`) → céu (presets, sol, nuvens ≤ 200 ms, seed,
  `.hdr`, reflexo na esfera) → reduzir movimento no SO → tablet.
- **QA em :3008 com DOIS perfis**: galeria isolada; selo "Guardando/Guardado na sua conta";
  descida noutro navegador; apagar num aparelho não volta no outro; 3 telas de bloqueio; equipe
  passa livre; tema escuro; 1366×768 sem rolagem da janela e janela de ~500 px; mobile: card no
  `/criar`, aba "Criar" acesa em `/molda`.
- **Comandos**: `bun run typecheck && bun test && bun run check` em molda, core, members
  (+ `TEST_DATABASE_URL=... bun test tests/db`), member-shell (+ community), studio, community-kids
  (+ `bun run build:kids`); `bun run ci` (biome raiz). Um `three.module.js` só no build do kids.

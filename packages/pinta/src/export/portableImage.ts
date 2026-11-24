import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  assertPintaImageDimensions,
  PINTA_IMAGE_DATA_KEYWORD,
  PINTA_IMAGE_WORLD_LIMITS,
  type PintaImageDependencyRule,
  type PintaImageDerivation,
  PintaImageDerivationSchema,
  type PintaImageRecipe,
  PintaImageRecipeSchema,
  type PintaImageSelectionKind,
  type PintaImageTargetLimits,
  PintaImageTargetLimitsSchema,
  type PintaImageWorld,
  PintaImageWorldSchema,
  pintaImageDependencyRule,
  pintaImageOutputMime,
  pintaImageRecipeKey,
} from '@sistemazero/core/studio/pinta-image'
import { thumbnailBitmap, thumbnailShapes } from '../core/assetThumb'
import { embeddedTilesetOf } from '../core/mapResourceVersions'
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  resolveAssetPalette,
  tilemapNeedsV3,
} from '../core/project'
import { flattenCelsOrBlank } from '../pixel/layers'
import { capturePintaAssetForImage, getPintaStorageNamespace } from '../state/persistence'
import { collectMapTilesetsFrom, resolveMapTilesets } from '../tiles/mapTilesets'
import { assetToJson } from './assetJson'
import { pngWithPintaData } from './pngText'
import {
  mapAtlasSelection,
  type PintaImageData,
  spritesheetSelection,
  tilesetSheetSelection,
} from './portableImageData'
import {
  type PintaImageRaster,
  type PintaImageScene,
  pintaImageSceneIsVector,
  readPngDimensions,
  renderPintaImage,
  renderPintaImageSvg,
} from './portableImageRender'
import {
  collectPintaImageWorld,
  pintaImageSceneCells,
  pintaImageSceneTemporaryPixels,
  WORLD_BUDGET_MESSAGE,
} from './portableMapWorld'
import { exportPintaScene } from './scene'

export interface PintaPortableImage {
  dataUrl: string
  derivation: PintaImageDerivation
}

interface WorldRasterBudget {
  cells: number
  pixels: number
  resourceChars: number
  metadataBytes: number
  images: WeakMap<PintaAsset, Promise<string | null>>
  queue: Promise<unknown>
}

export class PintaImageSelectionError extends Error {
  constructor() {
    super('A animação, o quadro ou a peça escolhida não existe mais. Escolha novamente.')
    this.name = 'PintaImageSelectionError'
  }
}

function select(
  source: PintaAsset,
  tilesets: readonly AnyTilesetAsset[],
  recipe: PintaImageRecipe,
): { scene: PintaImageScene; width: number; height: number; data?: PintaImageData } {
  if (source.id !== recipe.drawingId) throw new Error('O desenho não corresponde à seleção.')
  const selection = recipe.selection
  const tileset = tilesets[0] ?? null
  // The data kinds already return OUTPUT sizes (whole cells), so they skip the rounding below.
  if (selection.kind === 'spritesheet') {
    if (source.kind === 'pixel-sprite' || source.kind === 'vector-sprite')
      return spritesheetSelection(source, recipe.scale)
  } else if (selection.kind === 'tileset') {
    if (isTilesetKind(source)) return tilesetSheetSelection(source, recipe.scale)
  } else if (selection.kind === 'map' || selection.kind === 'map-world') {
    if (source.kind === 'tilemap') {
      if (!tileset || tileset.id !== source.tilesetId)
        throw new Error('O conjunto de peças deste mapa não está disponível.')
      return mapAtlasSelection(source, tilesets, recipe.scale, {
        complete: selection.kind === 'map-world',
      })
    }
  } else if (selection.kind === 'background') {
    if (source.kind === 'vector-background')
      return { scene: { kind: 'vector', doc: source }, width: source.width, height: source.height }
    if (source.kind === 'pixel-background') {
      const bitmap = flattenCelsOrBlank(source.cels, source.layers)
      return {
        scene: { kind: 'pixel', bitmap, colors: resolveAssetPalette(source) },
        width: bitmap.width,
        height: bitmap.height,
      }
    }
  } else if (selection.kind === 'frame') {
    if (source.kind === 'pixel-sprite') {
      const animation = source.animations.find(
        (candidate) => candidate.id === selection.animationId,
      )
      const frame = animation?.frames[selection.frameIndex]
      if (!frame) throw new PintaImageSelectionError()
      const bitmap = flattenCelsOrBlank(frame, source.layers)
      return {
        scene: { kind: 'pixel', bitmap, colors: resolveAssetPalette(source) },
        width: source.frameWidth,
        height: source.frameHeight,
      }
    }
    if (source.kind === 'vector-sprite') {
      const animation = source.animations.find(
        (candidate) => candidate.id === selection.animationId,
      )
      const shapes = animation?.frames[selection.frameIndex]
      if (!shapes) throw new PintaImageSelectionError()
      return {
        scene: {
          kind: 'vector',
          doc: { width: source.frameWidth, height: source.frameHeight, shapes },
        },
        width: source.frameWidth,
        height: source.frameHeight,
      }
    }
  } else if (selection.kind === 'tile') {
    if (source.kind === 'tileset') {
      const bitmap = source.tiles[selection.tileIndex]
      if (!bitmap) throw new PintaImageSelectionError()
      return {
        scene: { kind: 'pixel', bitmap, colors: resolveAssetPalette(source) },
        width: source.tileSize,
        height: source.tileSize,
      }
    }
    if (source.kind === 'vector-tileset') {
      const shapes = source.tiles[selection.tileIndex]
      if (!shapes) throw new PintaImageSelectionError()
      return {
        scene: { kind: 'vector', doc: { width: source.tileSize, height: source.tileSize, shapes } },
        width: source.tileSize,
        height: source.tileSize,
      }
    }
  } else if (source.kind === 'tilemap') {
    if (!tileset || !isTilesetKind(tileset) || tileset.id !== source.tilesetId)
      throw new Error('O conjunto de peças deste mapa não está disponível.')
    return {
      scene: { kind: 'map', map: source, tileset },
      width: source.cols * tileset.tileSize,
      height: source.rows * tileset.tileSize,
    }
  }
  throw new PintaImageSelectionError()
}

/**
 * The tilesets a map really uses: its default first, then each layer's in `tilemapTilesetIds`
 * order, only the ones given and compatible (`resolveMapTilesets`). Without the default the
 * list is empty and the selection is refused. The fingerprint and the atlas read the same list.
 */
function mapTilesetsOf(source: PintaAsset, given: readonly AnyTilesetAsset[]): AnyTilesetAsset[] {
  if (
    source.kind !== 'tilemap' ||
    (!embeddedTilesetOf(source) && !given.some((tileset) => tileset.id === source.tilesetId))
  )
    return []
  return resolveMapTilesets(source, given).filter(
    (tileset): tileset is AnyTilesetAsset => tileset !== null,
  )
}

/** Without a selection, a map depends on its default tileset (the historical inspection). */
function dependencyRule(
  source: PintaAsset,
  kind: PintaImageSelectionKind | undefined,
): PintaImageDependencyRule {
  if (kind !== undefined) return pintaImageDependencyRule(kind)
  return source.kind === 'tilemap' ? 'default-tileset' : 'none'
}

/** Fingerprints native content, including a map's dependencies, without rasterizing anything.
 * `map` lists every captured tileset (default first); the flat `tilemap` only the default. */
async function fingerprint(
  source: PintaAsset,
  tilesets: readonly AnyTilesetAsset[],
  rule: PintaImageDependencyRule,
  signal?: AbortSignal,
  assets?: readonly PintaAsset[],
): Promise<PintaImageDerivation['provenance']> {
  signal?.throwIfAborted()
  const sourceText = assetToJson(source)
  const captured = new Map((assets ?? tilesets).map((asset) => [asset.id, asset]))
  // An embedded tileset is captured by the map, even when there is no external gallery record.
  // Append only absent IDs so established provenance ordering remains unchanged.
  for (const tileset of tilesets) captured.set(tileset.id, tileset)
  const depends =
    source.kind !== 'tilemap' || rule === 'none'
      ? []
      : rule === 'linked-maps'
        ? collectPintaImageWorld(source, [...captured.values()]).assets.filter(
            (asset) => asset.id !== source.id,
          )
        : rule === 'default-tileset'
          ? tilesets.slice(0, 1)
          : [...captured.values()]
  const texts = depends.map((tileset) => ({ drawingId: tileset.id, text: assetToJson(tileset) }))
  const sourceSha256 = await sha256Hex(sourceText)
  signal?.throwIfAborted()
  const dependencies: PintaImageDerivation['provenance']['dependencies'] = []
  for (const dependency of texts) {
    dependencies.push({ drawingId: dependency.drawingId, sha256: await sha256Hex(dependency.text) })
    signal?.throwIfAborted()
  }
  return { sourceSha256, dependencies }
}

async function capture(
  drawingId: string,
  namespace: string,
  signal?: AbortSignal,
  selection?: PintaImageSelectionKind,
) {
  signal?.throwIfAborted()
  const captured = await capturePintaAssetForImage(drawingId, {
    namespace,
    signal,
    includeSceneMaps: selection === 'map-world',
  })
  signal?.throwIfAborted()
  if (!captured.ok)
    throw new Error(
      captured.reason === 'needs-tileset'
        ? 'O conjunto de peças deste mapa não está disponível.'
        : 'Este desenho não está mais na galeria.',
    )
  return captured
}

/** `selection` names the kind being re-derived: a `map` depends on every tileset it uses. */
export async function inspectPintaImageForStudio(
  drawingId: string,
  options: { namespace?: string; signal?: AbortSignal; selection?: PintaImageSelectionKind } = {},
): Promise<PintaImageDerivation['provenance']> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  const captured = await capture(drawingId, namespace, signal, options.selection)
  return fingerprint(
    captured.source,
    captured.tilesets,
    dependencyRule(captured.source, options.selection),
    signal,
    captured.assets,
  )
}

async function prepareCapturedDrawing(
  source: PintaAsset,
  given: readonly AnyTilesetAsset[],
  recipe: PintaImageRecipe,
  limits: PintaImageTargetLimits,
  signal?: AbortSignal,
  assets?: readonly PintaAsset[],
  raster?: PintaImageRaster,
  budget?: WorldRasterBudget,
) {
  signal?.throwIfAborted()
  const tilesets = mapTilesetsOf(source, given)
  const selected = select(source, tilesets, recipe)
  const width = selected.data ? selected.width : Math.round(selected.width * recipe.scale),
    height = selected.data ? selected.height : Math.round(selected.height * recipe.scale)
  assertPintaImageDimensions(width, height, limits)
  if (
    source.kind === 'tilemap' &&
    selected.data?.kind === 'map' &&
    (selected.data.version === 2 || recipe.selection.kind === 'map-world')
  ) {
    const byId = new Map((assets ?? given).map((a) => [a.id, a]))
    const renderResource = async (a: PintaAsset): Promise<string | null> => {
      const bitmap = thumbnailBitmap(a),
        doc = thumbnailShapes(a)
      const selection = isTilesetKind(a)
        ? tilesetSheetSelection(a, 1)
        : a.kind === 'pixel-sprite' || a.kind === 'vector-sprite'
          ? spritesheetSelection(a, 1)
          : bitmap
            ? {
                scene: { kind: 'pixel' as const, bitmap, colors: resolveAssetPalette(a) },
                width: bitmap.width,
                height: bitmap.height,
              }
            : doc
              ? { scene: { kind: 'vector' as const, doc }, width: doc.width, height: doc.height }
              : null
      if (!selection) return null
      if (budget) {
        const scaledWidth = Math.round(selection.width * recipe.scale),
          scaledHeight = Math.round(selection.height * recipe.scale)
        assertPintaImageDimensions(scaledWidth, scaledHeight, limits)
        budget.pixels += scaledWidth * scaledHeight
        if (budget.pixels > limits.totalImagePixels) throw new Error(WORLD_BUDGET_MESSAGE)
      }
      const bytes = await renderPintaImage(
        selection.scene,
        selection.width,
        selection.height,
        limits,
        signal,
        raster,
      )
      const png = pngDataUrl(bytes, budget ? limits : undefined)
      if (budget) {
        budget.resourceChars += png.length
        if (budget.resourceChars > PINTA_IMAGE_WORLD_LIMITS.encodedChars)
          throw new Error(WORLD_BUDGET_MESSAGE)
      }
      return png
    }
    let queue: Promise<unknown> = Promise.resolve()
    const imageOf = (asset: PintaAsset): Promise<string | null> => {
      const cached = budget?.images.get(asset)
      if (cached) return cached
      const image = (budget?.queue ?? queue).then(() => renderResource(asset))
      if (budget) {
        budget.queue = image
        budget.images.set(asset, image)
      } else queue = image
      return image
    }
    selected.data.scene = await exportPintaScene(source, (id) => byId.get(id) ?? null, imageOf)
    if (budget) {
      budget.cells += pintaImageSceneCells(selected.data.scene)
      if (budget.cells > PINTA_IMAGE_WORLD_LIMITS.cells) throw new Error(WORLD_BUDGET_MESSAGE)
      budget.pixels += pintaImageSceneTemporaryPixels(selected.data.scene, recipe.scale, limits)
      if (budget.pixels > limits.totalImagePixels) throw new Error(WORLD_BUDGET_MESSAGE)
    }
    selected.data.version = selected.data.scene.version === 3 ? 4 : 2
  }
  // The destination asked for the real vector: never fall back to PNG in silence.
  if (recipe.output === 'svg' && !pintaImageSceneIsVector(selected.scene))
    throw new Error(
      selected.scene.kind === 'map'
        ? 'Este mapa usa peças de pixels e só pode vir como imagem PNG.'
        : 'Este desenho é de pixels e só pode vir como imagem PNG.',
    )
  return { recipe, limits, width, height, scene: selected.scene, data: selected.data }
}

async function prepare(
  sourceInput: PintaAsset,
  tilesetsInput: readonly AnyTilesetAsset[],
  recipeInput: PintaImageRecipe,
  limitsInput: PintaImageTargetLimits,
  signal?: AbortSignal,
  assetsInput?: readonly PintaAsset[],
  raster?: PintaImageRaster,
) {
  signal?.throwIfAborted()
  const recipe = PintaImageRecipeSchema.parse(recipeInput)
  const limits = PintaImageTargetLimitsSchema.parse(limitsInput)
  // Every caller-owned document is captured once, before the first await.
  const [source, given, assets] = structuredClone([
    sourceInput,
    [...tilesetsInput],
    assetsInput ? [...assetsInput] : undefined,
  ]) as [PintaAsset, AnyTilesetAsset[], PintaAsset[] | undefined]
  const world =
    recipe.selection.kind === 'map-world'
      ? source.kind === 'tilemap'
        ? collectPintaImageWorld(source, [...(assets ?? []), ...given])
        : null
      : null
  if (recipe.selection.kind === 'map-world' && !world)
    throw new Error('Escolha um cenário para trazer outros lugares.')
  const boundedScene =
    !!world ||
    (source.kind === 'tilemap' && recipe.selection.kind === 'map' && tilemapNeedsV3(source))
  if (boundedScene) {
    limits.dimension = Math.min(limits.dimension, PINTA_IMAGE_WORLD_LIMITS.dimension)
    limits.imagePixels = Math.min(limits.imagePixels, PINTA_IMAGE_WORLD_LIMITS.imagePixels)
    limits.totalImagePixels = Math.min(
      limits.totalImagePixels,
      PINTA_IMAGE_WORLD_LIMITS.totalImagePixels,
    )
  }
  let budget: WorldRasterBudget | undefined
  if (boundedScene) {
    budget = {
      cells: 0,
      pixels: 0,
      resourceChars: 0,
      metadataBytes: 0,
      images: new WeakMap(),
      queue: Promise.resolve(),
    }
    for (const map of world?.maps ?? (source.kind === 'tilemap' ? [source] : [])) {
      const size = mapAtlasSelection(
        map,
        collectMapTilesetsFrom(map, world?.assets ?? assets ?? given),
        recipe.scale,
        {
          complete: true,
        },
      )
      assertPintaImageDimensions(size.width, size.height, limits)
      budget.pixels += size.width * size.height
      if (budget.pixels > limits.totalImagePixels) throw new Error(WORLD_BUDGET_MESSAGE)
    }
  }
  const drawing = await prepareCapturedDrawing(
    source,
    given,
    recipe,
    limits,
    signal,
    world?.assets ?? assets,
    raster,
    budget,
  )
  if (world && drawing.data?.kind === 'map') {
    const maps: PintaImageWorld['maps'] = []
    let chars = 0
    let precisePhysics = drawing.data.version === 4
    for (const map of world.maps.slice(1)) {
      signal?.throwIfAborted()
      const tilesets = collectMapTilesetsFrom(map, world.assets)
      const child = await prepareCapturedDrawing(
        map,
        tilesets,
        { ...recipe, drawingId: map.id },
        limits,
        signal,
        world.assets,
        raster,
        budget,
      )
      if (budget)
        budget.metadataBytes += new TextEncoder().encode(JSON.stringify(child.data)).byteLength
      if (budget && budget.metadataBytes > PINTA_IMAGE_WORLD_LIMITS.metadataBytes)
        throw new Error(WORLD_BUDGET_MESSAGE)
      const png = pngDataUrl(await renderPreparedPng(child, signal, raster), limits)
      precisePhysics ||= child.data?.kind === 'map' && child.data.version === 4
      chars += png.length
      if (chars > PINTA_IMAGE_WORLD_LIMITS.encodedChars) throw new Error(WORLD_BUDGET_MESSAGE)
      maps.push({ id: map.id, name: map.name, png })
    }
    drawing.data = {
      ...drawing.data,
      version: precisePhysics ? 4 : 3,
      world: PintaImageWorldSchema.parse({ version: 1, rootId: source.id, maps }),
    }
    if (
      budget &&
      budget.metadataBytes + new TextEncoder().encode(JSON.stringify(drawing.data)).byteLength >
        PINTA_IMAGE_WORLD_LIMITS.metadataBytes
    )
      throw new Error(WORLD_BUDGET_MESSAGE)
  }
  const provenance = await fingerprint(
    source,
    mapTilesetsOf(source, given),
    pintaImageDependencyRule(recipe.selection.kind),
    signal,
    world?.assets ?? assets,
  )
  return {
    ...drawing,
    provenance,
    key: canonicalJson({ recipe: pintaImageRecipeKey(recipe), provenance, limits }),
  }
}

async function renderPreparedPng(
  prepared: Awaited<ReturnType<typeof prepareCapturedDrawing>>,
  signal?: AbortSignal,
  raster?: PintaImageRaster,
): Promise<Uint8Array<ArrayBuffer>> {
  if (
    prepared.data?.kind === 'map' &&
    'world' in prepared.data &&
    new TextEncoder().encode(JSON.stringify(prepared.data)).byteLength >
      PINTA_IMAGE_WORLD_LIMITS.metadataBytes
  )
    throw new Error(WORLD_BUDGET_MESSAGE)
  let bytes = await renderPintaImage(
    prepared.scene,
    prepared.width,
    prepared.height,
    prepared.limits,
    signal,
    raster,
  )
  signal?.throwIfAborted()
  if (prepared.data) {
    bytes = await pngWithPintaData(bytes, prepared.data, PINTA_IMAGE_DATA_KEYWORD)
    signal?.throwIfAborted()
    if (bytes.byteLength > prepared.limits.imageBytes)
      throw new Error(
        'A imagem com os dados do Pinta ultrapassa o limite de tamanho do projeto. Escolha outra escala.',
      )
    const actual = readPngDimensions(bytes, prepared.limits)
    if (actual.width !== prepared.width || actual.height !== prepared.height)
      throw new Error('O PNG não corresponde ao tamanho escolhido.')
  }
  return bytes
}

function pngDataUrl(bytes: Uint8Array, limits?: PintaImageTargetLimits): string {
  const parts: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 4096)
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 4096)))
  const url = `data:image/png;base64,${btoa(parts.join(''))}`
  if (limits && url.length > limits.dataUrlChars)
    throw new Error('A imagem ultrapassa o limite de tamanho do projeto.')
  return url
}

async function finish(
  prepared: Awaited<ReturnType<typeof prepare>>,
  signal?: AbortSignal,
  raster?: PintaImageRaster,
): Promise<PintaPortableImage> {
  const mime = pintaImageOutputMime(prepared.recipe)
  let bytes: Uint8Array<ArrayBuffer>
  let dataUrl: string
  if (mime === 'image/svg+xml') {
    const svg = await renderPintaImageSvg(
      prepared.scene,
      prepared.width,
      prepared.height,
      prepared.limits,
      signal,
    )
    bytes = new TextEncoder().encode(svg)
    // UTF-8 percent-encoding: the same form as the JS bridge, decoded to these exact bytes.
    dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    if (
      bytes.byteLength > prepared.limits.imageBytes ||
      dataUrl.length > prepared.limits.dataUrlChars
    )
      throw new Error(
        'O desenho vetorial ficou grande demais para o projeto. Escolha um quadro mais simples ou remova algumas formas.',
      )
  } else {
    bytes = await renderPreparedPng(prepared, signal, raster)
    dataUrl = pngDataUrl(bytes, prepared.limits)
  }
  signal?.throwIfAborted()
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  signal?.throwIfAborted()
  const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const derivation = PintaImageDerivationSchema.parse({
    recipe: prepared.recipe,
    provenance: prepared.provenance,
    output: {
      mime,
      ...(prepared.data && prepared.data.version > 1 ? { dataVersion: prepared.data.version } : {}),
      width: prepared.width,
      height: prepared.height,
      bytes: bytes.byteLength,
      sha256,
    },
  })
  return { dataUrl, derivation }
}

/** Validated native drawings already owned by the caller; never reads another profile's gallery. */
export async function deriveLoadedPintaImage(
  source: PintaAsset,
  recipe: PintaImageRecipe,
  limits: PintaImageTargetLimits,
  options: {
    /** The map's default tileset (enough for every kind except `map`). */
    tileset?: AnyTilesetAsset | null
    /** Every tileset the map uses, default first (`map` draws and depends on all of them). */
    tilesets?: readonly AnyTilesetAsset[]
    assets?: readonly PintaAsset[]
    signal?: AbortSignal
    raster?: PintaImageRaster
  } = {},
): Promise<PintaPortableImage> {
  const { signal, raster } = options
  const tilesets = options.tilesets ?? (options.tileset ? [options.tileset] : [])
  const prepared = await prepare(source, tilesets, recipe, limits, signal, options.assets, raster)
  return finish(prepared, signal, raster)
}

// One completed image only, bounded by the destination's byte AND pixel quotas. No source documents.
// Every hit still requires a fresh, authorized capture and native-source fingerprints.
let latest: { namespace: string; key: string; image: PintaPortableImage } | null = null

export async function exportPintaImageForStudio(
  recipeInput: PintaImageRecipe,
  limitsInput: PintaImageTargetLimits,
  options: {
    namespace?: string
    signal?: AbortSignal
    expectedProvenance?: PintaImageDerivation['provenance']
  } = {},
): Promise<PintaPortableImage> {
  const recipe = PintaImageRecipeSchema.parse(recipeInput)
  const limits = PintaImageTargetLimitsSchema.parse(limitsInput)
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  const expectedProvenance =
    options.expectedProvenance === undefined
      ? undefined
      : PintaImageDerivationSchema.shape.provenance.parse(options.expectedProvenance)
  const captured = await capture(recipe.drawingId, namespace, signal, recipe.selection.kind)
  const prepared = await prepare(
    captured.source,
    captured.tilesets,
    recipe,
    limits,
    signal,
    captured.assets,
  )
  signal?.throwIfAborted()
  if (
    expectedProvenance !== undefined &&
    canonicalJson(prepared.provenance) !== canonicalJson(expectedProvenance)
  )
    throw new Error('O desenho mudou durante o preparo. Tente novamente.')
  if (latest?.namespace === namespace && latest.key === prepared.key)
    return structuredClone(latest.image)
  const image = await finish(prepared, signal)
  signal?.throwIfAborted()
  latest = { namespace, key: prepared.key, image: structuredClone(image) }
  return image
}

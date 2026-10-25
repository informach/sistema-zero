import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  assertPintaImageDimensions,
  PINTA_IMAGE_DATA_KEYWORD,
  type PintaImageDependencyRule,
  type PintaImageDerivation,
  PintaImageDerivationSchema,
  type PintaImageRecipe,
  PintaImageRecipeSchema,
  type PintaImageSelectionKind,
  type PintaImageTargetLimits,
  PintaImageTargetLimitsSchema,
  pintaImageDependencyRule,
  pintaImageOutputMime,
  pintaImageRecipeKey,
} from '@sistemazero/core/studio/pinta-image'
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  resolveAssetPalette,
} from '../core/project'
import { flattenCelsOrBlank } from '../pixel/layers'
import { capturePintaAssetForImage, getPintaStorageNamespace } from '../state/persistence'
import { resolveMapTilesets } from '../tiles/mapTilesets'
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

export interface PintaPortableImage {
  dataUrl: string
  derivation: PintaImageDerivation
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
  } else if (selection.kind === 'map') {
    if (source.kind === 'tilemap') {
      if (!tileset || tileset.id !== source.tilesetId)
        throw new Error('O conjunto de peças deste mapa não está disponível.')
      return mapAtlasSelection(source, tilesets, recipe.scale)
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
  if (source.kind !== 'tilemap' || !given.some((tileset) => tileset.id === source.tilesetId))
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
): Promise<PintaImageDerivation['provenance']> {
  signal?.throwIfAborted()
  const sourceText = assetToJson(source)
  const depends =
    source.kind !== 'tilemap' || rule === 'none'
      ? []
      : rule === 'default-tileset'
        ? tilesets.slice(0, 1)
        : tilesets
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

async function capture(drawingId: string, namespace: string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const captured = await capturePintaAssetForImage(drawingId, { namespace, signal })
  signal?.throwIfAborted()
  if (!captured.ok)
    throw new Error(
      captured.reason === 'source-changed'
        ? 'O desenho mudou durante o preparo. Tente novamente.'
        : captured.reason === 'needs-tileset'
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
  const captured = await capture(drawingId, namespace, signal)
  return fingerprint(
    captured.source,
    captured.tilesets,
    dependencyRule(captured.source, options.selection),
    signal,
  )
}

async function prepare(
  sourceInput: PintaAsset,
  tilesetsInput: readonly AnyTilesetAsset[],
  recipeInput: PintaImageRecipe,
  limitsInput: PintaImageTargetLimits,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted()
  // All caller-owned data is snapshotted before the first await, including typed pixel arrays.
  const recipe = PintaImageRecipeSchema.parse(recipeInput)
  const limits = PintaImageTargetLimitsSchema.parse(limitsInput)
  const [source, given] = structuredClone([sourceInput, [...tilesetsInput]]) as [
    PintaAsset,
    AnyTilesetAsset[],
  ]
  const tilesets = mapTilesetsOf(source, given)
  const selected = select(source, tilesets, recipe)
  // The destination asked for the real vector: never fall back to PNG in silence.
  if (recipe.output === 'svg' && !pintaImageSceneIsVector(selected.scene))
    throw new Error(
      selected.scene.kind === 'map'
        ? 'Este mapa usa peças de pixels e só pode vir como imagem PNG.'
        : 'Este desenho é de pixels e só pode vir como imagem PNG.',
    )
  const width = selected.data ? selected.width : Math.round(selected.width * recipe.scale),
    height = selected.data ? selected.height : Math.round(selected.height * recipe.scale)
  assertPintaImageDimensions(width, height, limits)
  const provenance = await fingerprint(
    source,
    tilesets,
    pintaImageDependencyRule(recipe.selection.kind),
    signal,
  )
  return {
    recipe,
    limits,
    provenance,
    width,
    height,
    scene: selected.scene,
    data: selected.data,
    key: canonicalJson({ recipe: pintaImageRecipeKey(recipe), provenance, limits }),
  }
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
    bytes = await renderPintaImage(
      prepared.scene,
      prepared.width,
      prepared.height,
      prepared.limits,
      signal,
      raster,
    )
    signal?.throwIfAborted()
    if (prepared.data) {
      // The drawing's data travels INSIDE the PNG (iTXt "pinta", right after IHDR).
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
    const parts: string[] = []
    for (let offset = 0; offset < bytes.length; offset += 4096)
      parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 4096)))
    dataUrl = `data:image/png;base64,${btoa(parts.join(''))}`
    if (dataUrl.length > prepared.limits.dataUrlChars)
      throw new Error('A imagem ultrapassa o limite de tamanho do projeto.')
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
    signal?: AbortSignal
    raster?: PintaImageRaster
  } = {},
): Promise<PintaPortableImage> {
  const { signal, raster } = options
  const tilesets = options.tilesets ?? (options.tileset ? [options.tileset] : [])
  const prepared = await prepare(source, tilesets, recipe, limits, signal)
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
  const captured = await capture(recipe.drawingId, namespace, signal)
  const prepared = await prepare(captured.source, captured.tilesets, recipe, limits, signal)
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

import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  assertPintaImageDimensions,
  type PintaImageDerivation,
  PintaImageDerivationSchema,
  type PintaImageRecipe,
  PintaImageRecipeSchema,
  type PintaImageTargetLimits,
  PintaImageTargetLimitsSchema,
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
import { assetToJson } from './assetJson'
import {
  type PintaImageRaster,
  type PintaImageScene,
  pintaImageSceneIsVector,
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
  tileset: AnyTilesetAsset | null,
  recipe: PintaImageRecipe,
): { scene: PintaImageScene; width: number; height: number } {
  if (source.id !== recipe.drawingId) throw new Error('O desenho não corresponde à seleção.')
  const selection = recipe.selection
  if (selection.kind === 'background') {
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

/** Fingerprints native content, including a map's dependency, without rasterizing anything. */
async function fingerprint(
  source: PintaAsset,
  tileset: AnyTilesetAsset | null,
  signal?: AbortSignal,
): Promise<PintaImageDerivation['provenance']> {
  signal?.throwIfAborted()
  const sourceText = assetToJson(source)
  const dependency =
    source.kind === 'tilemap' && tileset
      ? { drawingId: tileset.id, text: assetToJson(tileset) }
      : null
  const sourceSha256 = await sha256Hex(sourceText)
  signal?.throwIfAborted()
  const dependencies = dependency
    ? [{ drawingId: dependency.drawingId, sha256: await sha256Hex(dependency.text) }]
    : []
  signal?.throwIfAborted()
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

export async function inspectPintaImageForStudio(
  drawingId: string,
  options: { namespace?: string; signal?: AbortSignal } = {},
): Promise<PintaImageDerivation['provenance']> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  const captured = await capture(drawingId, namespace, signal)
  return fingerprint(captured.source, captured.tileset, signal)
}

async function prepare(
  sourceInput: PintaAsset,
  tilesetInput: AnyTilesetAsset | null,
  recipeInput: PintaImageRecipe,
  limitsInput: PintaImageTargetLimits,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted()
  // All caller-owned data is snapshotted before the first await, including typed pixel arrays.
  const recipe = PintaImageRecipeSchema.parse(recipeInput)
  const limits = PintaImageTargetLimitsSchema.parse(limitsInput)
  const [source, tileset] = structuredClone([sourceInput, tilesetInput]) as [
    PintaAsset,
    AnyTilesetAsset | null,
  ]
  const selected = select(source, tileset, recipe)
  // The destination asked for the real vector: never fall back to PNG in silence.
  if (recipe.output === 'svg' && !pintaImageSceneIsVector(selected.scene))
    throw new Error(
      selected.scene.kind === 'map'
        ? 'Este mapa usa peças de pixels e só pode vir como imagem PNG.'
        : 'Este desenho é de pixels e só pode vir como imagem PNG.',
    )
  const width = Math.round(selected.width * recipe.scale),
    height = Math.round(selected.height * recipe.scale)
  assertPintaImageDimensions(width, height, limits)
  const provenance = await fingerprint(source, tileset, signal)
  return {
    recipe,
    limits,
    provenance,
    width,
    height,
    scene: selected.scene,
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
    tileset?: AnyTilesetAsset | null
    signal?: AbortSignal
    raster?: PintaImageRaster
  } = {},
): Promise<PintaPortableImage> {
  const { signal, raster } = options
  const prepared = await prepare(source, options.tileset ?? null, recipe, limits, signal)
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
  const prepared = await prepare(captured.source, captured.tileset, recipe, limits, signal)
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

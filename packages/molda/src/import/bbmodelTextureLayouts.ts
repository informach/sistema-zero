import type { SceneImageFlipbook } from '../scene/document'
import { SCENE_FLIPBOOK_LIMITS } from '../scene/imageFlipbook'
import { SCENE_LIMITS } from '../scene/limits'
import type { BbmodelAppearance, BbmodelTexture } from './bbmodelAppearance'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelRasters } from './bbmodelRasters'
import { bbmodelUvDimensions } from './bbmodelUvDimensions'
import type { BbmodelVec2 } from './bbmodelValues'

export interface BbmodelTextureLayout {
  texture: number
  raster: number
  width: number
  height: number
  uvSize: BbmodelVec2
  /** Frame-local UV is independent of this strip's sheet coordinates. */
  flipbook: SceneImageFlipbook | null
}
export type BbmodelTextureLayoutIssue =
  | {
      code: 'declared-pixel-size-differs'
      texture: number
      path: string
      declared: [number | null, number | null]
      actual: BbmodelVec2
    }
  | { code: 'texture-flipbook-materialized'; texture: number; path: string; frames: number }
  | { code: 'texture-fps-floor'; texture: number; path: string; source: number; target: 1 }
  | { code: 'frame-indices-wrapped'; texture: number; path: string; count: number }

function unsupported(path: string, message: string): never {
  throw new BbmodelInputError('unsupported', path, message)
}
function budget(value: number, maximum: number, path: string): void {
  if (value > maximum)
    throw new BbmodelInputError(
      'budget',
      path,
      'As imagens ou os quadros ultrapassam o orçamento de edição do Molda.',
    )
}

function sequence(texture: BbmodelTexture, count: number, path: string) {
  const mode = texture.frameOrderType
  if (!['loop', 'backwards', 'back_and_forth', 'custom'].includes(mode))
    unsupported(`${path}.frame_order_type`, 'Esta ordem de quadros ainda não é suportada.')
  if (mode === 'custom' && texture.frameOrder) {
    // Leading/trailing spaces create fallback steps in the source preview; do not trim them away.
    const tokens = texture.frameOrder.split(/\s+/)
    budget(tokens.length, SCENE_FLIPBOOK_LIMITS.sequence, `${path}.frame_order`)
    let wrapped = 0
    const frames = tokens.map((token) => {
      // Do not execute expressions or reproduce parseInt's acceptance of trailing text.
      const value = Number(token)
      if (!/^\+?\d+$/.test(token) || !Number.isSafeInteger(value))
        unsupported(
          `${path}.frame_order`,
          'Use índices de quadro inteiros não negativos, sem expressões ou texto extra.',
        )
      if (value >= count) wrapped++
      return value % count
    })
    return { frames, wrapped }
  }
  const length = mode === 'back_and_forth' ? 2 * count - 2 : count
  budget(length, SCENE_FLIPBOOK_LIMITS.sequence, `${path}.frame_order_type`)
  const frames = Array.from({ length }, (_, step) =>
    mode === 'backwards'
      ? count - 1 - step
      : mode === 'back_and_forth' && step >= count
        ? length - step
        : step,
  )
  return { frames, wrapped: 0 }
}

/**
 * Plans chosen free-format images from matching decoded rasters without reading/copying RGBA.
 * Pixel dimensions are authoritative; source UV dimensions determine the vertical frame count.
 * Does not approve color space, layers, PBR, wrap/sampling or source session's current frame.
 */
export function planBbmodelTextureLayouts(
  appearance: BbmodelAppearance,
  decoded: BbmodelRasters,
  textureIndices: readonly number[],
): { textures: BbmodelTextureLayout[]; pixelBytes: number; issues: BbmodelTextureLayoutIssue[] } {
  if (appearance.modelFormat !== 'free')
    unsupported('meta.model_format', 'Estas imagens precisam do formato genérico do Blockbench.')
  budget(textureIndices.length, BBMODEL_INPUT_LIMITS.textures, 'textures')
  const selected = [...new Set(textureIndices)]
  budget(selected.length, SCENE_LIMITS.images, 'textures')
  let pixelBytes = 0
  // Charge every adopted image before sequence allocation or any future pixel materialization.
  // Raster aliases need not share UV dimensions or playback metadata.
  const requested = selected.map((texture) => {
    requireBbmodel(
      Number.isSafeInteger(texture) && texture >= 0 && texture < appearance.textures.length,
      'textures',
      'A textura escolhida não existe.',
    )
    const raster = decoded.textures.get(texture),
      image = raster === undefined ? undefined : decoded.rasters[raster]
    requireBbmodel(
      image !== undefined,
      `textures[${texture}]`,
      'A imagem escolhida precisa ser decodificada antes de configurar seus quadros.',
    )
    pixelBytes += image.width * image.height * 4
    budget(pixelBytes, SCENE_LIMITS.pixelBytes, 'textures')
    return { texture, raster: raster!, width: image.width, height: image.height }
  })
  const issues: BbmodelTextureLayoutIssue[] = []
  const textures = requested.map((image): BbmodelTextureLayout => {
    const { texture: index, width, height } = image,
      texture = appearance.textures[index]!,
      path = `textures[${index}]`,
      uvSize = bbmodelUvDimensions(appearance, index),
      ratio = uvSize[0] / uvSize[1] / (width / height)
    if (!Number.isFinite(ratio))
      unsupported(path, 'A proporção entre imagem e mapa UV excede o intervalo numérico.')
    if (
      (texture.width !== null && texture.width !== 0 && texture.width !== width) ||
      (texture.height !== null && texture.height !== 0 && texture.height !== height)
    )
      issues.push({
        code: 'declared-pixel-size-differs',
        texture: index,
        path,
        declared: [texture.width, texture.height],
        actual: [width, height],
      })
    // Free-format inference has a 0.05 margin; cached width/height never participate.
    const count = Math.max(1, Math.ceil(ratio - 0.05))
    budget(count, SCENE_FLIPBOOK_LIMITS.cells, path)
    if (count === 1) return { ...image, uvSize, flipbook: null }
    if (height % count !== 0)
      unsupported(
        path,
        'Os quadros precisam ter linhas inteiras de pixels, sem cortar ou redimensionar a imagem.',
      )
    const fps = Math.max(1, texture.fps ?? 7)
    if (fps > SCENE_FLIPBOOK_LIMITS.maxFps)
      unsupported(
        `${path}.fps`,
        'A velocidade excede o limite de 60 quadros por segundo; ela não foi reduzida.',
      )
    const { frames, wrapped } = sequence(texture, count, path)
    issues.push({ code: 'texture-flipbook-materialized', texture: index, path, frames: count })
    if (texture.fps !== null && texture.fps < 1)
      issues.push({
        code: 'texture-fps-floor',
        texture: index,
        path: `${path}.fps`,
        source: texture.fps,
        target: 1,
      })
    if (wrapped)
      issues.push({
        code: 'frame-indices-wrapped',
        texture: index,
        path: `${path}.frame_order`,
        count: wrapped,
      })
    return {
      ...image,
      uvSize,
      flipbook: { frameWidth: width, frameHeight: height / count, frames, fps, loop: true },
    }
  })
  return { textures, pixelBytes, issues }
}

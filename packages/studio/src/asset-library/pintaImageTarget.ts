import {
  assertPintaImageDimensions,
  type PintaImageDerivation,
  PintaImageDerivationSchema,
  type PintaImageTargetLimits,
} from '@sistemazero/core/studio/pinta-image'
import { STUDIO_PYTHON_MATERIAL_DATA_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import type { ProjectAsset } from '#core'
import { decodeProjectAsset, isSvgDataUrl } from '../core/assetBinary'
import { pgzeroSvgSize } from '../runtime/python/pgzero/svgSize'
import {
  TURTLE_GRAPHICS_LIMITS,
  TURTLE_IMAGE_DIMENSION_LIMIT,
} from '../runtime/python/turtle/graphicsProtocol'
import { readTurtleImage } from '../runtime/python/turtle/images'

const measuredImages = new WeakMap<ProjectAsset, { dataUrl: string; pixels: number }>()
function imagePixels(asset: ProjectAsset): number {
  // Author-provided width/height must not undercount an existing PNG/GIF.
  // Only tiny dimension facts are cached, tied to the asset lifetime.
  if (/^data:image\/(?:png|gif)[;,]/i.test(asset.dataUrl)) {
    if (asset.dataUrl.length > STUDIO_PYTHON_MATERIAL_DATA_LIMITS.maxAssetDataUrlChars)
      throw new Error('Uma imagem do projeto ultrapassa o limite de tamanho.')
    const cached = measuredImages.get(asset)
    if (cached?.dataUrl === asset.dataUrl) return cached.pixels
    const image = readTurtleImage(decodeProjectAsset(asset.dataUrl).bytes)
    const pixels = image.width * image.height
    measuredImages.set(asset, { dataUrl: asset.dataUrl, pixels })
    return pixels
  }
  // Other stored media do not become Turtle formats by being in this panel.
  return (asset.width ?? 0) * (asset.height ?? 0)
}

/** Loaded with Python image selection/synchronization, not by opening a JavaScript gallery.
 * Replacing an image returns that image's budget; unrelated materials still count. */
export function pintaImageTargetLimits(
  assets: readonly ProjectAsset[],
  replacingId?: string,
): PintaImageTargetLimits {
  let pixels = 0
  let chars = 0
  for (const asset of assets) {
    if (asset.id === replacingId) continue
    chars += asset.dataUrl.length
    if (asset.kind !== 'image') continue
    pixels += imagePixels(asset)
  }
  const remainingPixels = TURTLE_GRAPHICS_LIMITS.totalImagePixels - pixels
  const remainingChars = STUDIO_PYTHON_MATERIAL_DATA_LIMITS.maxAssetsTotalChars - chars
  if (remainingPixels <= 0 || remainingChars <= 0)
    throw new Error(
      'As imagens do projeto já ocupam o espaço disponível. Remova uma ou escolha outra escala.',
    )
  return {
    dimension: TURTLE_IMAGE_DIMENSION_LIMIT,
    imagePixels: TURTLE_GRAPHICS_LIMITS.imagePixels,
    totalImagePixels: remainingPixels,
    imageBytes: TURTLE_GRAPHICS_LIMITS.imageBytes,
    dataUrlChars: Math.min(STUDIO_PYTHON_MATERIAL_DATA_LIMITS.maxAssetDataUrlChars, remainingChars),
  }
}

export function assertPintaImageFits(
  image: { dataUrl: string; derivation: PintaImageDerivation },
  limits: PintaImageTargetLimits,
): void {
  if (!PintaImageDerivationSchema.safeParse(image.derivation).success)
    throw new Error('Os dados da seleção de imagem são inválidos. Escolha a imagem novamente.')
  const svg = image.derivation.output.mime === 'image/svg+xml'
  if (svg ? !isSvgDataUrl(image.dataUrl) : !image.dataUrl.startsWith('data:image/png;base64,'))
    throw new Error(
      svg ? 'A prévia precisa ser um desenho SVG.' : 'A prévia precisa ser uma imagem PNG.',
    )
  assertPintaImageDimensions(image.derivation.output.width, image.derivation.output.height, limits)
  if (
    image.derivation.output.bytes > limits.imageBytes ||
    image.dataUrl.length > limits.dataUrlChars
  )
    throw new Error(
      svg
        ? 'O desenho vetorial ultrapassa o espaço disponível no projeto. Escolha um quadro mais simples ou remova algumas formas.'
        : 'A imagem ultrapassa o espaço disponível no projeto. Escolha outra escala.',
    )
  const bytes = decodeProjectAsset(image.dataUrl).bytes
  if (svg) {
    // The size Pygame Zero reads from the root element must be the chosen output size.
    const size = pgzeroSvgSize(new TextDecoder().decode(bytes))
    if (
      bytes.byteLength !== image.derivation.output.bytes ||
      size?.width !== image.derivation.output.width ||
      size?.height !== image.derivation.output.height
    )
      throw new Error('Os dados do desenho não correspondem à prévia.')
    return
  }
  const decoded = readTurtleImage(bytes)
  if (
    bytes.byteLength !== image.derivation.output.bytes ||
    decoded.width !== image.derivation.output.width ||
    decoded.height !== image.derivation.output.height
  )
    throw new Error('Os dados da imagem não correspondem à prévia.')
}

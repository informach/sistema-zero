import { srgbToLinear } from '../core/color'
import { reverseRgbaRowsInPlace } from '../core/rgbaRows'
import type { SceneImage } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import type { GltfDocument } from './gltfDocument'
import { GltfInputError, requireGltf } from './gltfInput'
import { type GltfMaterialIssue, gltfLinearToSrgb } from './gltfMaterialConversionTypes'
import type { GltfMaterial } from './gltfMaterials'
import { gltfNativeName } from './gltfNativeName'
import type { GltfPngRaster } from './gltfPng'
import type { GltfRasters } from './gltfRasters'

interface ImagePlan {
  id: string
  source: number
  raster: GltfPngRaster
  /** Null is linear surface data: RGB unchanged, alpha unused by glTF. */
  color: { factor: GltfMaterial['baseColorFactor']; opaque: boolean } | null
}

/** Private synchronous planner. Register EVERY use before materializing any pixel array. */
export function planGltfMaterialImages(
  source: GltfDocument,
  decoded: GltfRasters,
  issues: GltfMaterialIssue[],
) {
  const plans = new Map<string, ImagePlan>(),
    aliases = new Set<string>()
  let pixelBytes = 0
  return {
    add(image: number, path: string, color: ImagePlan['color']): string {
      const index = decoded.images.get(image),
        raster = index === undefined ? undefined : decoded.rasters[index]
      requireGltf(raster !== undefined, path, 'A imagem usada pelo material não foi decodificada.')
      requireGltf(
        !color || raster.depth === 8,
        path,
        'Texturas de cor base glTF precisam de canais de 8 bits.',
      )
      const key = color
        ? `${index}:color:${color.factor.slice(0, 3).join(',')}:${color.opaque ? 'opaque' : color.factor[3]}`
        : `${index}:data`
      const existing = plans.get(key)
      if (existing) {
        const alias = `${image}:${existing.id}`
        if (image !== existing.source && !aliases.has(alias)) {
          aliases.add(alias)
          issues.push({
            code: 'image-alias-shared',
            path: `images[${image}]`,
            targetId: existing.id,
          })
        }
        return existing.id
      }
      pixelBytes += raster.width * raster.height * 4
      if (plans.size >= SCENE_LIMITS.images || pixelBytes > SCENE_LIMITS.pixelBytes)
        throw new GltfInputError(
          'budget',
          path,
          'As imagens convertidas ultrapassam o orçamento de pixels do Molda.',
        )
      const id = `gltf_image_${plans.size}`
      plans.set(key, {
        id,
        source: image,
        raster,
        color: color ? { factor: [...color.factor], opaque: color.opaque } : null,
      })
      if (raster.depth === 16)
        issues.push({ code: 'rgba16-to-rgba8', path: `images[${image}]`, targetId: id })
      return id
    },
    materialize(): { images: SceneImage[]; pixelBytes: number } {
      const images = Array.from(plans.values(), (plan): SceneImage => {
        const { raster, color } = plan,
          rgba = raster.rgba,
          pixels = new Uint8Array(raster.width * raster.height * 4),
          divisor = raster.depth === 16 ? 257 : 1,
          { name, change } = gltfNativeName(
            source.appearance.images[plan.source]!.name,
            `Imagem ${plan.source + 1}`,
          )
        if (change)
          issues.push({ code: change, path: `images[${plan.source}].name`, targetId: plan.id })
        // Each RGB channel is an integer in [0,255]. Cache the exact rounded
        // expression only when the image has at least as many pixels as the table.
        const tables =
          color && pixels.length >= 256 * 4
            ? color.factor
                .slice(0, 3)
                .map((factor) =>
                  factor === 1
                    ? null
                    : Uint8Array.from({ length: 256 }, (_, value) =>
                        Math.round(gltfLinearToSrgb(srgbToLinear(value) * factor) * 255),
                      ),
                )
            : null
        for (let offset = 0; offset < pixels.length; offset += 4) {
          for (let c = 0; c < 3; c++) {
            const value = rgba[offset + c]!,
              table = tables?.[c]
            pixels[offset + c] = table
              ? table[value]!
              : color && color.factor[c] !== 1
                ? Math.round(gltfLinearToSrgb(srgbToLinear(value) * color.factor[c]!) * 255)
                : Math.round(value / divisor)
          }
          pixels[offset + 3] =
            !color || color.opaque ? 255 : Math.round(rgba[offset + 3]! * color.factor[3])
        }
        // Decoder rows start at the image top; the native 2D/UV/flipbook domain starts at V=0 below.
        reverseRgbaRowsInPlace(pixels, raster.width, raster.height)
        return {
          id: plan.id,
          name,
          width: raster.width,
          height: raster.height,
          encoding: 'rgba',
          layers: [
            { id: `${plan.id}_layer`, name: 'Imagem importada', visible: true, opacity: 1, pixels },
          ],
        }
      })
      return { images, pixelBytes }
    },
  }
}

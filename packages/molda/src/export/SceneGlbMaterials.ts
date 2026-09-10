import { srgbToLinear } from '../core/color'
import { reverseRgbaRowsInPlace } from '../core/rgbaRows'
import {
  compositeSceneImageRegion,
  type SceneRgba,
  sceneBaseColor,
  scenePalette,
} from '../scene/composite'
import type { SceneImage } from '../scene/document'
import { sceneFlipbookRegion } from '../scene/imageFlipbook'
import { SCENE_LIMITS } from '../scene/limits'
import { requireScene } from '../scene/validation'
import type { GlbBinary } from './GlbBinary'
import { encodePng } from './png'
import {
  type SceneGlbFlipbookContract,
  sceneGlbFlipbookContract,
  sceneGlbFlipbookTransform,
} from './sceneGlbFlipbook'
import type { prepareSceneGlbHierarchy } from './sceneGlbHierarchy'
import type { SceneGlbIssue } from './sceneGlbReport'

interface TextureInfo {
  index: number
  extensions?: { KHR_texture_transform: { offset: [number, number]; scale: [number, number] } }
}
interface GlbMaterial {
  name: string
  pbrMetallicRoughness: {
    baseColorFactor: SceneRgba
    baseColorTexture?: TextureInfo
    metallicFactor: number
    roughnessFactor: number
    metallicRoughnessTexture?: TextureInfo
  }
  normalTexture?: TextureInfo & { scale: number }
  alphaMode: 'BLEND' | 'OPAQUE' | 'MASK'
  alphaCutoff?: number
  doubleSided: boolean
  extras?: { molda: { flipbook: SceneGlbFlipbookContract } }
}
type Hierarchy = ReturnType<typeof prepareSceneGlbHierarchy>

/** Whole sheet only where the frames themselves travel; every other map stays one cell. */
function dimensions(image: SceneImage | undefined, whole = false) {
  return {
    width: (whole ? image?.width : image?.flipbook?.frameWidth) ?? image?.width ?? 1,
    height: (whole ? image?.height : image?.flipbook?.frameHeight) ?? image?.height ?? 1,
  }
}
function commonSize(a: number, b: number) {
  let x = a,
    y = b
  while (y) [x, y] = [y, x % y]
  const size = (a / x) * b
  requireScene(
    size <= SCENE_LIMITS.imageSide,
    'export.texture',
    'Os mapas de rugosidade e metal precisam de tamanhos compatíveis para caber juntos no GLB.',
  )
  return size
}

/** Compose once per distinct material image use; retain compressed bytes, not raster caches. */
export class SceneGlbMaterials {
  readonly materials: GlbMaterial[] = []
  readonly textures: Array<{ source: number; sampler: 0 }> = []
  readonly images: Array<{ bufferView: number; mimeType: 'image/png' }> = []
  readonly samplers = [{ magFilter: 9728, minFilter: 9728, wrapS: 33071, wrapT: 33071 }]
  pixelBytes = 0
  /** Set only when a material actually carries the transform, so extensionsUsed stays honest. */
  textureTransform = false
  private readonly palette: SceneRgba[]
  private readonly materialIds = new Map<string, number>()
  private readonly textureIds = new Map<string, { index: number; transparent: boolean }>()
  private readonly flipbooks = new Set<string>()

  constructor(
    private readonly hierarchy: Hierarchy,
    private readonly binary: GlbBinary,
    private readonly issues: SceneGlbIssue[],
    private readonly animatedPaint = false,
  ) {
    this.palette = scenePalette(hierarchy.source)
  }

  private image(id: string | undefined) {
    return id === undefined ? undefined : this.hierarchy.index.images.get(id)!
  }

  private raster(
    image: SceneImage,
    base: SceneRgba,
    preserveTransparentRgb = false,
    whole = false,
  ) {
    const region =
      image.flipbook && !whole
        ? sceneFlipbookRegion(image, image.flipbook.frames[0]!)
        : { x0: 0, y0: 0, x1: image.width - 1, y1: image.height - 1 }
    // Carrying every frame is not a loss, so it must not report one.
    if (image.flipbook && !whole && !this.flipbooks.has(image.id)) {
      this.flipbooks.add(image.id)
      this.issues.push({ code: 'flipbook-first-frame', sourceId: image.id })
    }
    // Keep native rows through compositing/cropping. texture() converts the owned
    // final raster to PNG top-down together with the V reflection in GLB geometry.
    return compositeSceneImageRegion(image, this.palette, base, region, preserveTransparentRgb)
  }

  private texture(key: string, width: number, height: number, render: () => Uint8Array) {
    const cached = this.textureIds.get(key)
    if (cached) return cached
    requireScene(
      this.pixelBytes + width * height * 4 <= SCENE_LIMITS.pixelBytes,
      'export.textures',
      'As texturas prontas para o GLB ultrapassam o orçamento de pixels.',
    )
    const rgba = render()
    reverseRgbaRowsInPlace(rgba, width, height)
    const index = this.textures.length
    const result = { index, transparent: rgba.some((value, i) => i % 4 === 3 && value < 255) }
    this.images.push({
      bufferView: this.binary.addView(encodePng(rgba, width, height)),
      mimeType: 'image/png',
    })
    this.textures.push({ source: index, sampler: 0 })
    this.textureIds.set(key, result)
    this.pixelBytes += width * height * 4
    return result
  }

  get(id: string) {
    const cached = this.materialIds.get(id)
    if (cached !== undefined) return cached
    const source = this.hierarchy.index.materials.get(id)!
    const base = sceneBaseColor(source, this.palette)
    const color = this.image(source.colorImageId)
    const result: GlbMaterial = {
      name: source.name,
      pbrMetallicRoughness: {
        baseColorFactor: color
          ? [1, 1, 1, 1]
          : [
              srgbToLinear(base[0] * 255),
              srgbToLinear(base[1] * 255),
              srgbToLinear(base[2] * 255),
              base[3],
            ],
        metallicFactor: source.metalness,
        roughnessFactor: source.roughness,
      },
      alphaMode: base[3] < 1 ? 'BLEND' : 'OPAQUE',
      doubleSided: source.doubleSided,
    }
    if (color) {
      const animated = this.animatedPaint && color.flipbook !== undefined
      const { width, height } = dimensions(color, animated)
      const preserveTransparentRgb = source.alphaMask !== undefined
      const texture = this.texture(
        JSON.stringify(['color', color.id, base, preserveTransparentRgb, animated]),
        width,
        height,
        () => this.raster(color, base, preserveTransparentRgb, animated),
      )
      result.pbrMetallicRoughness.baseColorTexture = { index: texture.index }
      // The whole sheet decides transparency now: a later frame counts as much as the first.
      result.alphaMode = texture.transparent ? 'BLEND' : 'OPAQUE'
      const contract = animated ? sceneGlbFlipbookContract(color) : null
      if (contract) {
        result.pbrMetallicRoughness.baseColorTexture.extensions = {
          KHR_texture_transform: sceneGlbFlipbookTransform(contract, contract.frames[0]!),
        }
        result.extras = { molda: { flipbook: contract } }
        this.textureTransform = true
      }
    }
    if (source.alphaMask) {
      result.alphaMode = 'MASK'
      result.alphaCutoff = source.alphaMask.cutoff
      result.pbrMetallicRoughness.baseColorFactor[3] *= source.alphaMask.opacity
    }
    const normal = this.image(source.normalImageId)
    if (normal) {
      // The native renderer uses derivative tangent frames, not authored MikkTSpace.
      // Do not silently change that shading contract by inventing exported tangents.
      this.issues.push({ code: 'runtime-tangent-space', sourceId: source.id })
      const { width, height } = dimensions(normal)
      const texture = this.texture(
        JSON.stringify(['normal', normal.id, source.normalFlipY === true]),
        width,
        height,
        () => {
          const rgba = this.raster(normal, [128 / 255, 128 / 255, 1, 1])
          // Export reflects V, reversing the bitangent in addition to the authored normal convention.
          if (!source.normalFlipY) for (let i = 1; i < rgba.length; i += 4) rgba[i] = 255 - rgba[i]!
          return rgba
        },
      )
      result.normalTexture = { index: texture.index, scale: source.normalStrength ?? 1 }
    }
    const roughness = this.image(source.roughnessImageId),
      metalness = this.image(source.metalnessImageId)
    if (roughness || metalness) {
      const roughSize = dimensions(roughness),
        metalSize = dimensions(metalness)
      const width = commonSize(roughSize.width, metalSize.width),
        height = commonSize(roughSize.height, metalSize.height)
      const texture = this.texture(
        JSON.stringify(['surface', roughness?.id, metalness?.id]),
        width,
        height,
        () => {
          const rough = roughness ? this.raster(roughness, [1, 1, 1, 1]) : null
          const metal = metalness ? this.raster(metalness, [1, 1, 1, 1]) : null
          const rgba = new Uint8Array(width * height * 4).fill(255)
          for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4
              // Integer enlargement to the least common dimensions preserves every
              // NEAREST texel boundary; incompatible grids are refused, never blurred.
              if (rough)
                rgba[i + 1] =
                  rough[
                    (Math.floor((y * roughSize.height) / height) * roughSize.width +
                      Math.floor((x * roughSize.width) / width)) *
                      4 +
                      1
                  ]!
              if (metal)
                rgba[i + 2] =
                  metal[
                    (Math.floor((y * metalSize.height) / height) * metalSize.width +
                      Math.floor((x * metalSize.width) / width)) *
                      4 +
                      2
                  ]!
            }
          return rgba
        },
      )
      result.pbrMetallicRoughness.metallicRoughnessTexture = { index: texture.index }
    }
    const index = this.materials.length
    this.materials.push(result)
    this.materialIds.set(id, index)
    return index
  }
}

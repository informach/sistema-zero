import type { SceneImage } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import type { MtlTexturePlan } from './mtlTexturePlanTypes'
import { nativeImportName } from './nativeImportName'
import { ObjInputError, objBudget, requireObj } from './objInput'
import type {
  ObjMaterialIssue,
  readObjMaterialConversionOptions,
} from './objMaterialConversionTypes'
import {
  materializeObjPixels,
  type ObjColorImageSample,
  type ObjImageRecipe,
  type ObjImageSource,
  type ObjScalarImageSample,
} from './objMaterialPixels'
import type { RasterBatch } from './rasterBatch'

export interface ObjMaterialMap {
  map: MtlTexturePlan
  /** Canonical local resource path. */
  path: string
  /** File and source declaration line, used for diagnostics. */
  at: string
}
interface ImagePlan {
  id: string
  name: string
  recipe: ObjImageRecipe
  source: ObjImageSource
}

/** Private call-local planner: register every material before materialize; staged inputs stay immutable. */
export function planObjMaterialImages(
  decoded: RasterBatch<string>,
  issue: (value: ObjMaterialIssue) => void,
  policy: ReturnType<typeof readObjMaterialConversionOptions>,
) {
  const plans = new Map<string, ImagePlan>()
  let pixelBytes = 0
  function source(input: ObjMaterialMap): ObjImageSource {
    const index = decoded.images.get(input.path),
      raster = index === undefined ? undefined : decoded.rasters[index]
    requireObj(
      index !== undefined && raster !== undefined,
      input.at,
      'A imagem selecionada não foi decodificada.',
    )
    return { index, raster, path: input.path }
  }
  function scalar(input: ObjMaterialMap): ObjScalarImageSample {
    requireObj(
      input.map.sample.kind === 'scalar',
      input.at,
      'Este mapa precisa de amostra escalar.',
    )
    const sample = { ...input.map.sample }
    // Alpha never uses the RGB transfer, so differing RGB tags do not create different pixels.
    if (sample.channel === 'm') sample.rgbSpace = 'linear'
    return { source: source(input), sample, range: [...input.map.range] }
  }
  const scalarKey = (value: ObjScalarImageSample | null) =>
    value
      ? [
          value.source.index,
          value.sample.channel,
          value.sample.rgbSpace,
          value.sample.invert,
          ...value.range,
        ]
      : null
  function add(key: unknown[], recipe: ObjImageRecipe, primary: ObjImageSource, at: string) {
    const serialized = JSON.stringify(key),
      existing = plans.get(serialized)
    if (existing) return existing.id
    objBudget(plans.size + 1, SCENE_LIMITS.images, at)
    pixelBytes += primary.raster.width * primary.raster.height * 4
    objBudget(pixelBytes, SCENE_LIMITS.pixelBytes, at)
    const id = `obj_image_${plans.size}`,
      basename = primary.path.slice(primary.path.lastIndexOf('/') + 1),
      { name, change } = nativeImportName(basename, `Imagem ${id}`)
    plans.set(serialized, { id, name, recipe, source: primary })
    const inputs =
        recipe.kind === 'color' ? [recipe.color?.source, recipe.opacity?.source] : [primary],
      reported = new Set<number>()
    for (const input of inputs) {
      if (input?.raster.depth !== 16 || reported.has(input.index)) continue
      reported.add(input.index)
      issue({
        code: 'rgba16-to-rgba8',
        path: `files[${JSON.stringify(input.path)}]`,
        targetId: id,
      })
    }
    if (change)
      issue({ code: change, path: `files[${JSON.stringify(primary.path)}]`, targetId: id })
    return id
  }
  return {
    color(
      color: ObjMaterialMap | null,
      opacity: ObjMaterialMap | null,
      factor: [number, number, number, number],
      targetId: string,
    ): string {
      requireObj(
        color || opacity,
        'images',
        'A imagem de cor precisa de cor ou máscara de opacidade.',
      )
      if (color)
        requireObj(
          color.map.sample.kind === 'color',
          color.at,
          'Este mapa precisa de amostra de cor.',
        )
      const rgb: ObjColorImageSample | null =
          color && color.map.sample.kind === 'color'
            ? {
                source: source(color),
                rgbSpace: color.map.sample.rgbSpace,
                range: [...color.map.range],
              }
            : null,
        mask = opacity ? scalar(opacity) : null,
        primary = rgb?.source ?? mask!.source,
        { width, height } = primary.raster
      if (mask && (mask.source.raster.width !== width || mask.source.raster.height !== height)) {
        if (policy.opacitySampling === 'reject')
          throw new ObjInputError(
            'unsupported',
            opacity!.at,
            'A máscara tem outra resolução. Escolha a amostragem mais próxima para combiná-la à cor.',
          )
        issue({
          code: 'opacity-resampled-nearest',
          path: opacity!.at,
          targetId,
          source: [mask.source.raster.width, mask.source.raster.height],
          target: [width, height],
        })
      }
      if (color)
        issue({
          code: 'color-alpha-interpreted',
          path: color.at,
          targetId,
          mode: policy.colorAlpha,
        })
      issue({ code: 'color-factor-baked', path: color?.at ?? opacity!.at, targetId })
      return add(
        [
          'color',
          rgb ? [rgb.source.index, rgb.rgbSpace, ...rgb.range] : null,
          scalarKey(mask),
          ...factor,
          rgb ? policy.colorAlpha : 'ignore',
        ],
        {
          kind: 'color',
          color: rgb,
          opacity: mask,
          factor: [...factor],
          colorAlpha: policy.colorAlpha,
        },
        primary,
        color?.at ?? opacity!.at,
      )
    },
    data(input: ObjMaterialMap): string {
      if (input.map.sample.kind === 'normal') {
        const image = source(input)
        return add(['normal', image.index], { kind: 'normal', source: image }, image, input.at)
      }
      const value = scalar(input)
      return add(
        ['scalar', scalarKey(value)],
        { kind: 'scalar', scalar: value },
        value.source,
        input.at,
      )
    },
    materialize(): { images: SceneImage[]; pixelBytes: number } {
      const images = Array.from(plans.values(), (plan): SceneImage => {
        const { width, height } = plan.source.raster
        return {
          id: plan.id,
          name: plan.name,
          width,
          height,
          encoding: 'rgba',
          layers: [
            {
              id: `${plan.id}_layer`,
              name: 'Imagem importada',
              visible: true,
              opacity: 1,
              pixels: materializeObjPixels(plan.recipe, width, height),
            },
          ],
        }
      })
      return { images, pixelBytes }
    },
  }
}

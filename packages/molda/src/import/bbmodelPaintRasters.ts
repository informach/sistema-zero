import { SCENE_LIMITS } from '../scene/limits'
import { decodeBbmodelImageDataUri } from './bbmodelImageDataUri'
import type { BbmodelImageOptions } from './bbmodelImages'
import { BbmodelInputError, BBMODEL_INPUT_LIMITS as limits } from './bbmodelInput'
import type { BbmodelPaintLayerPlan } from './bbmodelPaintLayers'
import type { BbmodelRasters } from './bbmodelRasters'
import type { BbmodelResourcesRead } from './bbmodelResources'
import { decodeRasterBatchPlan, planRasterBatch, type RasterSource } from './rasterBatch'
import { RasterInputError } from './rasterInput'

export interface BbmodelPaintRasters extends BbmodelRasters {
  /** Exact embedded URI → raster, borrowed only inside this synchronous import. */
  paint: ReadonlyMap<string, number>
}

/** Root dimensions and editable layers share ONE decoded budget; native alias copies have their own aggregate budget. */
export function decodeBbmodelPaintRasters(
  bundle: Extract<BbmodelResourcesRead, { status: 'ready' }>,
  paint: BbmodelPaintLayerPlan,
  options: Required<BbmodelImageOptions>,
): BbmodelPaintRasters {
  if (
    bundle.resourceBytes + paint.resourceBytes > limits.fileBytes ||
    bundle.resources.length + paint.resources.size > limits.resources
  )
    throw new BbmodelInputError(
      'budget',
      'resources',
      'As imagens e suas camadas ultrapassam o orçamento de recursos do Molda.',
    )
  if (bundle.textures.length > SCENE_LIMITS.images)
    throw new BbmodelInputError(
      'budget',
      'textures',
      'Há imagens selecionadas demais para o Molda.',
    )
  function* sources(): Generator<RasterSource<string>> {
    const origins = new Map<number, number>()
    for (const binding of bundle.textures)
      if (!origins.has(binding.resource)) origins.set(binding.resource, binding.texture)
    for (const [index, resource] of bundle.resources.entries()) {
      const texture = origins.get(index)
      if (texture === undefined) throw new Error('Unused bbmodel root resource')
      yield {
        key: `root:${index}`,
        bytes: resource.bytes,
        mimeTypes: [resource.mimeType],
        path:
          resource.path === null
            ? `textures[${texture}].source`
            : `files[${JSON.stringify(resource.path)}]`,
      }
    }
    for (const [uri, resource] of paint.resources)
      yield {
        key: uri,
        path: resource.path,
        bytes: decodeBbmodelImageDataUri(resource.data, resource.path),
        mimeTypes: ['image/png'],
      }
  }
  try {
    const planned = planRasterBatch(sources()),
      textures = new Map<number, number>(),
      layers = new Map<string, number>()
    let nativeBytes = 0
    for (const binding of bundle.textures) {
      const rootIndex = planned.images.get(`root:${binding.resource}`)
      if (rootIndex === undefined) throw new Error('Missing bbmodel root raster plan')
      textures.set(binding.texture, rootIndex)
      const root = planned.plans[rootIndex]!,
        rows = paint.layers.get(binding.texture)
      const paths = rows
        ? rows.map((row) => ({ key: row.dataUrl!, path: `${row.path}.data_url` }))
        : [{ key: `root:${binding.resource}`, path: root.path }]
      for (const source of paths) {
        const index = planned.images.get(source.key)
        if (index === undefined) throw new Error('Missing bbmodel paint raster plan')
        const entry = planned.plans[index]!
        if (entry.plan.width !== root.plan.width || entry.plan.height !== root.plan.height)
          throw new BbmodelInputError(
            'unsupported',
            source.path,
            'A camada tem outro tamanho. Por enquanto, cada camada precisa cobrir a imagem inteira, sem recortes nem preenchimento automático.',
          )
        if (entry.mime === 'image/png' && entry.plan.depth === 16 && options.rgba16 === 'reject')
          throw new BbmodelInputError(
            'unsupported',
            source.path,
            'Esta imagem tem canais de 16 bits. Escolha a conversão para 8 bits para torná-la editável.',
          )
        nativeBytes += root.plan.width * root.plan.height * 4
        if (nativeBytes > SCENE_LIMITS.pixelBytes)
          throw new BbmodelInputError(
            'budget',
            source.path,
            'As cópias editáveis das imagens e camadas ultrapassam 32 MiB.',
          )
        if (rows) layers.set(source.key, index)
      }
    }
    const decoded = decodeRasterBatchPlan(planned)
    return { textures, paint: layers, rasters: decoded.rasters, pixelBytes: decoded.pixelBytes }
  } catch (error) {
    if (!(error instanceof RasterInputError)) throw error
    throw new BbmodelInputError(error.reason, error.path, error.message, { cause: error })
  }
}

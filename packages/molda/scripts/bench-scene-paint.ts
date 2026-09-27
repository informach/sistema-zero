import { DataTexture, Mesh } from 'three'
import { compositeSceneImage, sceneBaseColor, scenePalette } from '../src/scene/composite'
import { paintSceneImage } from '../src/scene/imagePaint'
import { prepareSceneImageRaster } from '../src/scene/imageRaster'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { makeModel } from '../src/testing/fixtures'
import { SceneRenderResource } from '../src/viewport/sceneRenderResource'

/** CPU command/compositor/resource timings. No renderer/GPU/React is measured here. */
const stats = (values: number[]) => {
  values.sort((a, b) => a - b)
  return {
    p50: +values[Math.floor(values.length / 2)]!.toFixed(3),
    p95: +values[Math.ceil(values.length * 0.95) - 1]!.toFixed(3),
  }
}
for (const side of [256, 512, 1024]) {
  let document = migrateLegacyModel(makeModel()).document
  const original = document.images[0]!
  const image = {
    ...original,
    width: side,
    height: side,
    layers: Array.from({ length: 8 }, (_, i) => ({
      ...original.layers[0]!,
      id: `layer-${i}`,
      opacity: 0.5,
      pixels: new Uint8Array(side * side).fill(i % 3 === 0 ? 0 : 2),
    })),
  }
  document = { ...document, images: [image, ...document.images.slice(1)] }
  const material = document.materials.find((m) => m.colorImageId === image.id)!
  const target = { nodeId: 'body', materialId: material.id, imageId: image.id, layerId: 'layer-7' }
  const palette = scenePalette(document),
    base = sceneBaseColor(material, palette)
  const resource = new SceneRenderResource()
  resource.update(document)
  const command: number[] = [],
    composite: number[] = [],
    prepare: number[] = [],
    raster: number[] = []
  let patchBytes = 0
  try {
    for (let n = 0; n < 23; n++) {
      let time = performance.now()
      const next = paintSceneImage(document, target, {
        from: [n, n],
        to: [n + 2, n],
        brush: 3,
        color: n % 2 ? 7 : 5,
      })
      const commandMs = performance.now() - time
      time = performance.now()
      const expected = compositeSceneImage(next.images[0]!, palette, base)
      const compositeMs = performance.now() - time
      time = performance.now()
      const patch = prepareSceneImageRaster(
        { image: next.images[0]!, paletteKey: JSON.stringify(palette), base },
        palette,
        { image: document.images[0]!, paletteKey: JSON.stringify(palette), base },
      )
      const rasterMs = performance.now() - time
      patchBytes = patch?.pixels.byteLength ?? 0
      time = performance.now()
      resource.update(next)
      const prepareMs = performance.now() - time
      const body = resource.root.children.find(
        (object) => resource.instanceFor(object)?.sourceNodeId === 'body',
      )
      if (!(body instanceof Mesh) || !Array.isArray(body.material)) throw new Error('Missing body')
      const texture = body.material.find((material) => material.map instanceof DataTexture)?.map as
        | DataTexture
        | undefined
      if (!texture || !expected.every((byte, i) => texture.image.data[i] === byte))
        throw new Error('Partial raster differs from full composition')
      if (n >= 3) {
        command.push(commandMs)
        composite.push(compositeMs)
        prepare.push(prepareMs)
        raster.push(rasterMs)
      }
      document = next
    }
    console.info(
      JSON.stringify({
        side,
        layers: 8,
        samples: command.length,
        commandMs: stats(command),
        fullCompositeMs: stats(composite),
        resourceMs: stats(prepare),
        rasterPatchMs: stats(raster),
        patchBytes,
      }),
    )
  } finally {
    resource.dispose()
  }
}

import { scenePalette } from '../src/scene/composite'
import type { SceneImage } from '../src/scene/document'
import { operateSceneImage } from '../src/scene/imageOperations'
import { operateImageInWorker } from '../src/workers/sceneImage'
import type { SceneImageRequest } from '../src/workers/sceneImageProtocol'

/** CPU/worker wall time only. This does not measure GPU uploads, React, touch latency or FPS. */
const palette = scenePalette({ paletteId: 'arcade' })
const stats = (samples: number[]) => {
  samples.sort((a, b) => a - b)
  return {
    p50: +samples[Math.floor(samples.length / 2)]!.toFixed(3),
    p95: +samples[Math.ceil(samples.length * 0.95) - 1]!.toFixed(3),
  }
}
for (const side of [256, 512, 1024]) {
  const image: SceneImage = {
    id: 'image',
    name: 'Imagem',
    width: side,
    height: side,
    encoding: 'indexed',
    layers: [
      {
        id: 'layer',
        name: 'Camada',
        visible: true,
        opacity: 1,
        pixels: new Uint8Array(side * side).fill(2),
      },
    ],
  }
  for (const operation of [
    { kind: 'rgba' } as const,
    {
      kind: 'fill',
      layerId: 'layer',
      point: [0, 0],
      color: 7,
      tolerance: 0,
    } as SceneImageRequest['operation'],
  ]) {
    const request: SceneImageRequest = {
      documentId: 'bench-image',
      revision: 1,
      image,
      palette,
      operation,
    }
    operateSceneImage(image, operation, palette)
    await operateImageInWorker(request)
    const cpu: number[] = [],
      worker: number[] = []
    for (let n = 0; n < 15; n++) {
      let start = performance.now()
      const direct = operateSceneImage(image, operation, palette)
      cpu.push(performance.now() - start)
      start = performance.now()
      const result = await operateImageInWorker(request)
      worker.push(performance.now() - start)
      if (!result.layers[0]!.pixels.every((byte, i) => byte === direct.layers[0]!.pixels[i]))
        throw new Error('Worker output differs')
    }
    console.info(
      JSON.stringify({
        side,
        operation: operation.kind,
        samples: cpu.length,
        cpuMs: stats(cpu),
        workerWallMs: stats(worker),
        sourceBytes: image.layers[0]!.pixels.byteLength,
      }),
    )
  }
}

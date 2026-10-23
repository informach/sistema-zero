import type { TilemapAsset, VectorTilesetAsset } from '../../packages/pinta/src/core/project'
import { flattenLayers } from '../../packages/pinta/src/tiles/tilemapOps'
import { vectorToPortableSvg } from '../../packages/pinta/src/vector/portableSvg'
import { svgToCanvas } from '../../packages/pinta/src/vector/rasterize'

// L0 alternative for a native-resolution flattened PNG. Rasterize each used
// tile once, then composite in the same row-major order as vectorTilemapSvg.
// No thumbnail, resolution reduction, or change to the Pinta/JS export path.
export async function materializeVectorMap(
  map: TilemapAsset,
  tileset: VectorTilesetAsset,
  options: { signal?: AbortSignal; onProgress?: (rows: number, total: number) => void } = {},
) {
  const { signal, onProgress } = options
  signal?.throwIfAborted()
  const cells = flattenLayers(map)
  const tile = tileset.tileSize
  const images = new Map<number, ImageBitmap>()
  let worker: Worker | undefined
  try {
    for (const index of new Set(cells)) {
      const shapes = tileset.tiles[index]
      if (index < 0 || !shapes) continue
      const image = await svgToCanvas(
        await vectorToPortableSvg({ width: tile, height: tile, shapes }),
        tile,
        tile,
      )
      if (!image) throw new Error(`Tile ${index} could not be rasterized`)
      try {
        images.set(index, await createImageBitmap(image))
      } finally {
        image.width = image.height = 0
      }
      signal?.throwIfAborted()
    }
    worker = new Worker(new URL('./pinta-composite.js', import.meta.url), { type: 'module' })
    const active = worker
    const blob = await new Promise<Blob>((resolve, reject) => {
      const abort = () => {
        active.terminate()
        reject(new DOMException('Conversion cancelled', 'AbortError'))
      }
      signal?.addEventListener('abort', abort, { once: true })
      active.addEventListener(
        'error',
        (event) => {
          signal?.removeEventListener('abort', abort)
          reject(new Error(event.message))
        },
        { once: true },
      )
      active.addEventListener('message', ({ data }) => {
        if (
          data?.type === 'progress' &&
          Number.isInteger(data.completedRows) &&
          data.completedRows > 0 &&
          data.completedRows <= map.rows &&
          data.totalRows === map.rows
        ) {
          onProgress?.(data.completedRows, data.totalRows)
          return
        }
        signal?.removeEventListener('abort', abort)
        if (data?.ok === true && data.blob instanceof Blob && data.blob.type === 'image/png')
          resolve(data.blob)
        else reject(new Error(String(data?.error ?? 'Invalid conversion response')))
      })
      active.postMessage({ cols: map.cols, rows: map.rows, tile, cells, images: [...images] }, [
        ...images.values(),
      ])
    })
    signal?.throwIfAborted()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      const abort = () => reader.abort()
      signal?.addEventListener('abort', abort, { once: true })
      reader.onloadend = () => signal?.removeEventListener('abort', abort)
      reader.onerror = () => reject(reader.error)
      reader.onabort = () => reject(new DOMException('Conversion cancelled', 'AbortError'))
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Invalid PNG encoding'))
      reader.readAsDataURL(blob)
    })
  } finally {
    worker?.terminate()
    for (const image of images.values()) image.close()
  }
}

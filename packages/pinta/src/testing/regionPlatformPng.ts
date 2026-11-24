import { createCanvas } from '@napi-rs/canvas'
import { encodePintaRegionLayers } from '@sistemazero/core/creations'
import { embedPintaRegionImage } from '../export/regionImage'

/** Real PNG with a fractional one-way platform far from the origin, in both gravity directions. */
export async function regionPlatformPng(direction: 1 | -1 = 1) {
  const image = new Uint8Array(createCanvas(16, 16).toBuffer('image/png'))
  const row = direction === 1 ? 6250 : -6251
  const chunkRow = Math.floor(row / 32),
    cells = new Int16Array(1024).fill(-1)
  cells[(row - chunkRow * 32) * 32] = 0
  const bounds = { col: -2, row: direction === 1 ? 0 : -10000, cols: 4, rows: 10000 }
  const layers = encodePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, chunks: [{ col: 0, row: chunkRow, cells }] }],
    bounds,
  )
  if (!layers) throw Error('Invalid platform fixture')
  const scene = {
    version: 4,
    physics: 'precise',
    id: 'distant-platform',
    name: 'Plataforma distante',
    tileSize: 16,
    origin: { col: bounds.col, row: bounds.row },
    cols: bounds.cols,
    rows: bounds.rows,
    tilesets: [
      {
        id: 'sheet',
        name: 'Peças',
        image: `data:image/png;base64,${Buffer.from(image).toString('base64')}`,
        columns: 1,
        count: 1,
        solid: [],
        platform: [0],
      },
    ],
    layers: [
      {
        id: 'platform',
        kind: 'tiles',
        name: 'Plataforma',
        visible: true,
        tilesetId: 'sheet',
        offsetY: direction * 0.004,
        cells: layers[0],
      },
    ],
  }
  return (await embedPintaRegionImage(image, JSON.stringify(scene))).png
}

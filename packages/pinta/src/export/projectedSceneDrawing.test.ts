import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import {
  encodePintaHexRegionLayers,
  encodePintaRegionLayers,
  makePintaHexCell,
  PINTA_HEX_EMPTY_CELL,
} from '@sistemazero/core/creations'
import {
  type PintaProjectedSceneWire,
  readPintaProjectedScene,
} from '@sistemazero/core/studio/pinta-projected-scene'
import { drawScene, scenePng } from './sceneDrawing'

function scene(kind: 'isometric' | 'hexagonal') {
  const bounds = { col: -32, row: -32, cols: 10000, rows: 10000 }
  const iso = new Int16Array(1024).fill(-1)
  iso[1023] = 0
  const hex = new Uint32Array(1024).fill(PINTA_HEX_EMPTY_CELL)
  hex[1023] = makePintaHexCell(0, { rotation: 60, flipX: true })!
  const location = { col: -1, row: -1 }
  const cells =
    kind === 'hexagonal'
      ? encodePintaHexRegionLayers(
          [{ kind: 'hex-regions', side: 32, version: 1, chunks: [{ ...location, cells: hex }] }],
          bounds,
        )?.[0]
      : encodePintaRegionLayers(
          [{ kind: 'regions', side: 32, version: 1, chunks: [{ ...location, cells: iso }] }],
          bounds,
        )?.[0]
  if (!cells) throw Error('Fixture de projeção inválida')
  const wire: PintaProjectedSceneWire = {
    id: 'teste',
    name: 'Ilha',
    version: 5,
    physics: 'precise',
    tileSize: 16,
    cols: bounds.cols,
    rows: bounds.rows,
    origin: { col: bounds.col, row: bounds.row },
    projection:
      kind === 'hexagonal'
        ? {
            kind,
            tileWidth: 16,
            tileHeight: 16,
            hexSideLength: 8,
            staggerAxis: 'y',
            staggerIndex: 'odd',
          }
        : { kind, tileWidth: 16, tileHeight: 8 },
    tilesets: [
      {
        id: 'tiles',
        name: 'Peças',
        columns: 1,
        count: 1,
        image: 'tiles.png',
        solid: [],
        platform: [],
      },
    ],
    layers: [
      { id: 'tiles', name: 'Peças', kind: 'tiles', visible: true, tilesetId: 'tiles', cells },
    ],
  }
  return readPintaProjectedScene(JSON.stringify(wire))!
}

function paintSource() {
  const source = createCanvas(16, 16)
  const ctx = source.getContext('2d')
  ctx.fillStyle = '#27d277'
  ctx.fillRect(0, 0, 5, 7)
  ctx.fillStyle = '#e15759'
  ctx.fillRect(5, 7, 11, 9)
  return source
}

for (const kind of ['isometric', 'hexagonal'] as const) {
  test(`real Canvas projects signed ${kind} cells with bottom anchors, culling and independent turns`, async () => {
    const map = scene(kind)
    const sheet = paintSource()
    const camera = { x: -22, y: -29 }
    const rect = { ...camera, width: 38, height: 41 }
    const mesh = new Map([['tiles', sheet as unknown as CanvasImageSource]])
    const pixels = (reference: boolean, clipped = false) => {
      const canvas = createCanvas(rect.width, rect.height)
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.translate(-camera.x, -camera.y)
      if (reference) {
        // Authored cell (-1,-1). The sprite sits on the bottom of its footprint.
        const y = kind === 'isometric' ? -8 : -4
        ctx.translate(0, y)
        if (kind === 'hexagonal') {
          ctx.rotate(Math.PI / 3)
          ctx.scale(-1, 1)
        }
        ctx.drawImage(sheet, -8, -8)
      } else
        drawScene(
          ctx as unknown as CanvasRenderingContext2D,
          map,
          mesh,
          'back',
          0,
          camera,
          clipped ? rect : undefined,
        )
      return Buffer.from(ctx.getImageData(0, 0, rect.width, rect.height).data)
    }
    const direct = pixels(false)
    expect(direct).toEqual(pixels(true))
    expect(direct).toEqual(pixels(false, true))
    expect(direct.some((value) => value !== 0)).toBe(true)
    expect(map.cols * map.rows).toBe(100000000)
    await expect(scenePng(map)).rejects.toThrow('imagem ficou grande')
  })
}

import { describe, expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { isObjectLayer, isTileLayer } from '../../src/core/project'
import {
  type Drawing,
  gameDocuments,
  gamePng,
  type MapDrawing,
  pintaDocuments,
  type TilesetDrawing,
} from './drawing'
import { Px } from './pixel'

const png = (drawing: Drawing) => gamePng(pintaDocuments(drawing, 'teste'), 2)

function pintaData(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset)
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at)
    const type = new TextDecoder().decode(png.subarray(at + 4, at + 8))
    if (type === 'iTXt') {
      const body = png.subarray(at + 8, at + 8 + length)
      expect(new TextDecoder().decode(body.subarray(0, 6))).toBe('pinta\0')
      expect([...body.subarray(6, 10)]).toEqual([1, 0, 0, 0])
      return JSON.parse(new TextDecoder().decode(inflateSync(body.subarray(10))))
    }
    at += 12 + length
  }
  return null
}

const tile = (color: string) => new Px(16, 16, color)
const ground: TilesetDrawing = {
  kind: 'tileset',
  name: 'chao',
  tileSize: 16,
  tiles: [
    { image: tile('#335522'), collision: 'solid' },
    { image: tile('#886644'), collision: 'platform' },
  ],
}
const decor: TilesetDrawing = {
  kind: 'tileset',
  name: 'enfeites',
  tileSize: 16,
  tiles: [{ image: tile('#ffcc00') }],
}
const level: MapDrawing = {
  kind: 'map',
  name: 'fase',
  cols: 3,
  rows: 2,
  layers: [
    { type: 'tiles', name: 'Terreno', tileset: ground, cells: [0, 1, -1, 0, 0, 0] },
    { type: 'tiles', name: 'Frente', tileset: decor, front: true, cells: [-1, -1, 0, -1, -1, -1] },
    {
      type: 'objects',
      name: 'Entidades',
      objects: [
        { name: 'jogador', type: 'jogador', x: 8, y: 8 },
        {
          name: 'porta',
          type: 'saida',
          x: 32,
          y: 0,
          width: 16,
          height: 16,
          properties: { destino: 'casa' },
        },
      ],
    },
  ],
}

test('a map becomes Pinta documents: its tilesets, per-layer tilesets and object layers', () => {
  const documents = pintaDocuments(level, 'teste')
  expect(documents.map((document) => document.kind)).toEqual(['tileset', 'tileset', 'tilemap'])
  const map = documents[2]!
  if (map.kind !== 'tilemap') throw new Error('mapa')
  expect(map.tilesetId).toBe('teste-chao')
  const [terrain, front, objects] = map.layers
  expect(terrain && isTileLayer(terrain) ? terrain.cells[1] : null).toBe(1)
  expect(front && isTileLayer(front) ? [front.tilesetId, front.front] : null).toEqual([
    'teste-enfeites',
    true,
  ])
  expect(
    objects && isObjectLayer(objects) ? objects.objects.map((object) => object.name) : null,
  ).toEqual(['jogador', 'porta'])
  // Deterministic: the same drawing gives the same documents.
  expect(JSON.stringify(pintaDocuments(level, 'teste'))).toBe(JSON.stringify(documents))
})

test('the map PNG carries an atlas of every tileset and the layers in output pixels', async () => {
  const data = pintaData(await png(level))
  expect(data).toMatchObject({
    format: 'pinta',
    version: 1,
    kind: 'map',
    tileSize: 32,
    cols: 3,
    rows: 2,
  })
  expect(data.tilesets).toEqual([
    { name: 'chao', y: 0, columns: 2, count: 2, solid: [0], platform: [1] },
    { name: 'enfeites', y: 32, columns: 1, count: 1, solid: [], platform: [] },
  ])
  expect(data.layers[1]).toMatchObject({ type: 'tiles', front: true, tileset: 1 })
  expect(data.layers[2].objects[1]).toMatchObject({
    x: 64,
    y: 0,
    width: 32,
    height: 32,
    properties: { destino: 'casa' },
  })
  // The object ids are the document's: the Pinta derives the same ones after "Editar no Pinta".
  const map = pintaDocuments(level, 'teste')[2]!
  if (map.kind !== 'tilemap') throw new Error('mapa')
  const objects = map.layers[2]
  expect(data.layers[2].objects.map((object: { id: string }) => object.id)).toEqual(
    objects && isObjectLayer(objects) ? objects.objects.map((object) => object.id) : [],
  )
  expect(data.layers[2].objects[0].id).toBe('teste-fase-obj-0')
})

test('a sprite PNG lists its animations, one row each, and the painted box', async () => {
  const frame = new Px(8, 8)
  frame.rect(2, 1, 3, 6, '#ff0000')
  const sheet = await png({
    kind: 'sprite',
    name: 'heroi',
    frameWidth: 8,
    frameHeight: 8,
    animations: [
      { name: 'parado', fps: 4, loop: true, frames: [frame] },
      { name: 'correr', fps: 10, loop: true, frames: [frame, frame, frame] },
    ],
  })
  expect(pintaData(sheet)).toEqual({
    format: 'pinta',
    version: 1,
    name: 'heroi',
    scale: 2,
    kind: 'sprite',
    frameWidth: 16,
    frameHeight: 16,
    columns: 3,
    rows: 2,
    animations: [
      { name: 'parado', row: 0, frames: 1, fps: 4, loop: true },
      { name: 'correr', row: 1, frames: 3, fps: 10, loop: true },
    ],
    hitbox: { x: 4, y: 2, width: 6, height: 12 },
  })
})

test('Pinta limits are enforced while drawing (colours per drawing)', () => {
  const busy = new Px(8, 8)
  for (let index = 0; index < 64; index++)
    busy.set(index % 8, Math.floor(index / 8), `#0000${index.toString(16).padStart(2, '0')}`)
  expect(() => pintaDocuments({ kind: 'background', name: 'cheio', image: busy }, 'teste')).toThrow(
    '63',
  )
})

test('a drawing that fills its frame has no hitbox (null = the whole frame, as in the Pinta)', async () => {
  const full = new Px(8, 8, '#00ff00')
  const data = pintaData(
    await png({
      kind: 'sprite',
      name: 'bloco',
      frameWidth: 8,
      frameHeight: 8,
      animations: [{ name: 'a', fps: 1, loop: true, frames: [full] }],
    }),
  )
  expect(data.hitbox).toBeNull()
})

test('a frame of another size is an error, not an animation the Pinta drops in silence', () => {
  const sprite: Drawing = {
    kind: 'sprite',
    name: 'concha',
    frameWidth: 16,
    frameHeight: 8,
    animations: [
      { name: 'parado', fps: 1, loop: true, frames: [new Px(16, 8, '#ff0000')] },
      { name: 'perola', fps: 1, loop: true, frames: [new Px(8, 8, '#ffffff')] },
    ],
  }
  expect(() => pintaDocuments(sprite, 'teste')).toThrow('perola')
  // A frame narrower than the Pinta's smallest (8 px) would be clamped: also an error.
  const thin: Drawing = {
    kind: 'sprite',
    name: 'laser',
    frameWidth: 5,
    frameHeight: 8,
    animations: [{ name: 'a', fps: 1, loop: true, frames: [new Px(5, 8, '#ff0000')] }],
  }
  expect(() => pintaDocuments(thin, 'teste')).toThrow('laser')
})

describe('one document per drawing in desenhos.pinta.json', () => {
  test('a sprite and a map tileset with the same name stop the generator', () => {
    const sprite: Drawing = {
      kind: 'sprite',
      name: 'enfeites',
      frameWidth: 8,
      frameHeight: 8,
      animations: [{ name: 'flor', fps: 1, loop: true, frames: [new Px(8, 8, '#ffcc00')] }],
    }
    expect(() => gameDocuments([sprite, level], 'teste')).toThrow('teste-enfeites')
  })

  test('two drawings with one name (one PNG) stop the generator', () => {
    expect(() => gameDocuments([ground, { ...ground }], 'teste')).toThrow('assets/chao.png')
  })

  test('the same tileset brought by two maps is one document', () => {
    const other: MapDrawing = { ...level, name: 'fase-2' }
    const documents = gameDocuments([level, other], 'teste')
    expect(documents.map((document) => document.id)).toEqual([
      'teste-chao',
      'teste-enfeites',
      'teste-fase',
      'teste-fase-2',
    ])
  })

  test('an equal copy of a tileset is fine, a different one with that name is not', () => {
    const copy: TilesetDrawing = { ...ground, tiles: [...ground.tiles] }
    expect(() =>
      gameDocuments(
        [
          level,
          {
            ...level,
            name: 'fase-2',
            layers: [{ ...level.layers[0]!, tileset: copy } as MapDrawing['layers'][number]],
          },
        ],
        'teste',
      ),
    ).not.toThrow()
    const changed: TilesetDrawing = {
      ...ground,
      tiles: [{ image: tile('#000000') }, ground.tiles[1]!],
    }
    expect(() =>
      gameDocuments(
        [
          level,
          {
            ...level,
            name: 'fase-2',
            layers: [{ ...level.layers[0]!, tileset: changed } as MapDrawing['layers'][number]],
          },
        ],
        'teste',
      ),
    ).toThrow('teste-chao')
  })
})

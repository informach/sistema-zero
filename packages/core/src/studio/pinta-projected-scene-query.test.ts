import { expect, test } from 'bun:test'
import { PINTA_HEX_EMPTY_CELL } from '../creations/pinta-hex-cell'
import type { PintaProjectedScene, PintaProjectedSceneMap } from './pinta-projected-scene'
import { createProjectedSceneQueries } from './pinta-projected-scene-query'

function diamond(): PintaProjectedScene {
  const cells = new Int16Array(1024).fill(-1)
  cells[0] = 0
  cells[2 * 32 + 2] = 1
  return {
    version: 5,
    id: 'map',
    name: 'Campo',
    tileSize: 32,
    cols: 20,
    rows: 20,
    origin: { col: -8, row: -8 },
    physics: 'precise',
    projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
    tilesets: [
      {
        id: 'tiles',
        name: 'Peças',
        count: 2,
        columns: 2,
        image: 'tiles.png',
        solid: [0],
        platform: [1],
      },
    ],
    layers: [
      {
        kind: 'tiles',
        id: 'ground',
        name: 'Fundo',
        visible: true,
        tilesetId: 'tiles',
        cells: { kind: 'regions', side: 32, version: 1, chunks: [{ col: 0, row: 0, cells }] },
      },
    ],
  }
}

test('isometric collision uses the diamond and supports one-way landing without blocking ascent', () => {
  const game = createProjectedSceneQueries(diamond())
  expect(game.spawn()).toEqual({ x: 0, y: 8 })
  expect(game.intersectsBox({ x: -15, y: 1, width: 1, height: 1 })).toBe(false)
  expect(game.intersectsBox({ x: -15, y: 7, width: 1, height: 2 })).toBe(true)
  expect(game.moveBox({ x: -40, y: 7, width: 2, height: 2 }, 64, 0).x).toBeCloseTo(-18, 7)
  const before = { x: -1, y: 20, width: 2, height: 2 }
  const after = { ...before, y: 49 }
  expect(game.platformLanding(before, after)).toEqual({ ...before, y: 30 })
  expect(game.platformLanding(after, before)).toBeNull()
  expect(game.intersectsBox({ ...before, y: 32 })).toBe(false)
})

test('a projected hex set transforms collision and scoped object references in the same world frame', () => {
  const scene = diamond()
  const cells = new Uint32Array(1024).fill(PINTA_HEX_EMPTY_CELL)
  cells[1023] = 0
  const set: PintaProjectedSceneMap = {
    id: 'island',
    cols: 1,
    rows: 1,
    origin: { col: -1, row: -1 },
    projection: {
      kind: 'hexagonal',
      tileWidth: 32,
      tileHeight: 32,
      hexSideLength: 16,
      staggerAxis: 'y',
      staggerIndex: 'odd',
    },
    layers: [
      {
        kind: 'tiles',
        id: 'floor',
        name: 'Peças',
        visible: true,
        tilesetId: 'tiles',
        cells: { kind: 'hex-regions', side: 32, version: 1, chunks: [{ col: -1, row: -1, cells }] },
      },
      {
        kind: 'objects',
        id: 'sign',
        name: 'Lugares',
        visible: true,
        objects: [
          {
            id: 'door',
            name: 'Porta',
            type: '',
            role: 'door',
            x: 0,
            y: -8,
            width: 0,
            height: 0,
            shape: 'point',
            properties: { local: { type: 'object', value: 'door' }, destination: 'lake' },
          },
        ],
      },
    ],
  }
  scene.sets = [set]
  scene.layers.push({
    kind: 'objects',
    id: 'places',
    name: 'Lugares',
    visible: true,
    objects: [
      {
        id: 'instance',
        type: '',
        name: 'Ilha',
        x: 64,
        y: 64,
        width: 32,
        height: 64,
        setId: set.id,
        shape: 'set',
        rotation: 90,
        flipX: true,
        properties: {},
      },
    ],
  })
  const game = createProjectedSceneQueries(scene)
  const [door] = [...game.iterateObjects((object) => object.role === 'door')]
  expect(door?.id).toBe('instance/door')
  expect(door?.x).toBeCloseTo(32, 8)
  expect(door?.y).toBeCloseTo(80, 8)
  expect(door?.properties.local).toEqual({ type: 'object', value: 'instance/door' })
  expect(game.intersectsBox({ x: 31, y: 79, width: 2, height: 2 })).toBe(true)
  expect(game.intersectsBox({ x: 2, y: 65, width: 1, height: 1 })).toBe(false)
})

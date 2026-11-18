import { expect, it } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import type { ExtensionBootstrapContext } from '#extensions'
import { gameTwoDRuntime } from '../game-2d/runtime'
import { gameKitRuntime } from '../game-2d-advanced/runtime'
import {
  MAP_TWO_D_BOOTSTRAP_EXTRA_CHARS,
  mapTwoDBootstrap,
  mapTwoDBootstrapVariant,
} from './bootstrap'
import type { MapTwoDApi } from './contract'
import { mapTwoDSource } from './runtime'

const scene = {
  version: 1,
  name: 'vila',
  id: 'vila',
  tileSize: 16,
  cols: 2,
  rows: 2,
  tilesets: [
    { id: 'ts', name: 'ts', image: 'pixels', columns: 1, count: 1, solid: [0], platform: [] },
  ],
  layers: [
    { id: 'g', kind: 'group', name: 'Grupo', visible: true, opacity: 0.5 },
    {
      id: 't',
      kind: 'tiles',
      parentId: 'g',
      name: 'Chão',
      visible: true,
      tilesetId: 'ts',
      cells: [4096, -1, -1, -1],
    },
    {
      id: 'o',
      kind: 'objects',
      name: 'Objetos',
      visible: true,
      objects: [
        {
          id: 's',
          name: 'Início',
          type: '',
          role: 'start',
          x: 24,
          y: 24,
          width: 0,
          height: 0,
          properties: {},
        },
        {
          id: 'a',
          name: 'Área',
          type: '',
          role: 'trigger',
          shape: 'ellipse',
          x: 16,
          y: 16,
          width: 16,
          height: 16,
          properties: { vida: { type: 'int', value: 3 } },
        },
      ],
    },
  ],
}
it('compõe camadas, espelho, opacidade, objetos e colisão sem perder dados', () => {
  const canvas = createCanvas(32, 32),
    sheet = createCanvas(16, 16),
    s = sheet.getContext('2d')
  s.fillStyle = 'red'
  s.fillRect(0, 0, 8, 16)
  s.fillStyle = 'green'
  s.fillRect(8, 0, 8, 16)
  Object.assign(sheet, { complete: true, naturalWidth: 16 })
  let grid: number[][] = []
  let collisions = 0
  const api = new Function(`${mapTwoDSource};return createMap2D;`)()({
    meta: () => ({ scene }),
    context: () => canvas.getContext('2d'),
    width: () => 32,
    height: () => 32,
    camera: () => ({ x: 0, y: 0 }),
    screen: () => {},
    image: () => sheet,
    warn: (message: string) => {
      throw new Error(message)
    },
    collision: (_name: string, _scene: unknown, rows: number[][]) => {
      grid = rows
      return rows
    },
    collide: () => collisions++,
  }) as MapTwoDApi
  api.createMapScene('mapa', 'vila')
  api.drawMapScene('mapa', 'back')
  expect(canvas.getContext('2d').getImageData(1, 1, 1, 1).data[1]).toBeGreaterThan(100)
  expect(canvas.getContext('2d').getImageData(1, 1, 1, 1).data[3]).toBe(128)
  expect(grid).toEqual([
    [0, -1],
    [-1, -1],
  ])
  api.collideMapScene({ x: 20, y: 20, w: 2, h: 2 }, 'mapa')
  expect(collisions).toBe(1)
  expect(api.mapSpawn('mapa', 'x')).toBe(24)
  const area = api.mapObjectNamed('mapa', 'Área')
  expect(api.mapObjectProperty(area, 'vida')).toBe(3)
  expect(api.mapInArea({ x: 23, y: 23, w: 2, h: 2 }, area)).toBe(true)
  let enters = 0
  api.mapArea('mapa', { x: 23, y: 23, w: 2, h: 2 }, 'trigger', () => enters++)
  api.drawMapScene('mapa', 'back')
  api.drawMapScene('mapa', 'back')
  expect(enters).toBe(1)
})
it('projetos sem os novos métodos recebem os mesmos bytes; a variante completa tem teto próprio', async () => {
  const old = { code: 'SZGame2D.clear();' } as ExtensionBootstrapContext,
    newCode = {
      code: 'const g=SZGame2D;g["createMapScene"]("mapa","vila");',
    } as ExtensionBootstrapContext
  expect(mapTwoDBootstrapVariant(old)).toBe('')
  expect(await mapTwoDBootstrap('g2d', old)).toBe(gameTwoDRuntime)
  expect(await mapTwoDBootstrap('gk', old)).toBe(gameKitRuntime)
  for (const target of ['g2d', 'gk'] as const) {
    const full = await mapTwoDBootstrap(target, newCode),
      base = target === 'g2d' ? gameTwoDRuntime : gameKitRuntime
    expect(() => new Function(full)).not.toThrow()
    expect(full.length - base.length).toBeLessThanOrEqual(MAP_TWO_D_BOOTSTRAP_EXTRA_CHARS)
    expect(full).toContain('createMapScene:_map2d.createMapScene')
  }
})

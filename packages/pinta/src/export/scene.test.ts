import { expect, it } from 'bun:test'
import { PintaSceneSchema, sceneFitsStudio } from '@sistemazero/core/studio/pinta-scene'
import { createTilemapAsset, createTilesetAsset } from '../core/project'
import { CELL_FLIP_H, makeCell } from '../tiles/cell'
import { createMapObject } from '../tiles/mapObjects'
import { exportPintaScene } from './scene'

it('converte grupos, bits, peças de várias bibliotecas e objetos sem achatar nem trocar ids', async () => {
  const a = { ...createTilesetAsset({ name: 'terra', tileSize: 16 }), id: 'a' }
  const b = {
    ...createTilesetAsset({ name: 'agua', tileSize: 16 }),
    id: 'b',
    animations: { '0': [{ tile: 0, duration: 100 }] },
  }
  const m = {
    ...createTilemapAsset({ name: 'Vila e floresta', tilesetId: 'a', cols: 2, rows: 1 }),
    layers: [
      { id: 'g', kind: 'group' as const, name: 'Floresta', visible: true, opacity: 0.5 },
      {
        id: 't',
        name: 'Água',
        visible: true,
        parentId: 'g',
        tilesetId: 'b',
        cells: new Int16Array([makeCell(0, CELL_FLIP_H), -1]),
      },
      {
        id: 'o',
        name: 'Portas',
        kind: 'objects' as const,
        visible: true,
        objects: [
          createMapObject({
            role: 'door',
            shape: 'ellipse',
            width: 20,
            height: 30,
            properties: { destino: 'casa' },
          }),
        ],
      },
    ],
  }
  const scene = await exportPintaScene(
    m,
    (id) => [a, b].find((t) => t.id === id) ?? null,
    async (asset) => `data:image/png;base64,${asset.id}`,
  )
  expect(scene.tilesets.map((t) => t.id)).toEqual(['a', 'b'])
  expect(scene.layers[0]?.opacity).toBe(0.5)
  expect(scene.layers[1]?.kind === 'tiles' && scene.layers[1].cells).toEqual([4096, -1])
  expect(scene.layers[2]?.kind === 'objects' && scene.layers[2].objects[0]?.role).toBe('door')
  expect(PintaSceneSchema.safeParse(JSON.parse(JSON.stringify(scene))).success).toBe(true)
  expect(sceneFitsStudio(scene)).toBe(true)
  expect(
    PintaSceneSchema.safeParse({ ...scene, layers: [{ ...scene.layers[1], cells: [0] }] }).success,
  ).toBe(false)
  expect(
    PintaSceneSchema.safeParse({ ...scene, layers: [{ ...scene.layers[1], parentId: 'ausente' }] })
      .success,
  ).toBe(false)
})

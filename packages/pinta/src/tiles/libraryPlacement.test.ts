import { expect, it } from 'bun:test'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  isObjectLayer,
  PINTA_LIMITS,
  sanitizePintaAsset,
  type TilemapAsset,
  withPintaSchemaStamp,
} from '../core/project'
import { libraryPlacement, placeLibraryObject } from './libraryPlacement'
import { createMapSet } from './sets'
import { addObjectLayer } from './tilemapOps'

function scene(): TilemapAsset {
  const map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 8, rows: 6 }),
    'Objetos',
  )
  const objects = map.layers.at(-1)!
  return {
    ...map,
    layers: [
      ...map.layers.slice(0, -1),
      { id: 'group', kind: 'group', name: 'grupo', visible: true, offsetX: 16, offsetY: 8 },
      { ...objects, parentId: 'group', offsetX: 16, offsetY: 8 },
    ],
  }
}
const art = createPixelSpriteAsset({ name: 'árvore', frameSize: 16 })

it('prévia e inserção compartilham tamanho, offset herdado e encaixe sem alterar a origem', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  for (const snap of [false, true]) {
    const preview = libraryPlacement(map, layerId, art, 16, { x: 59, y: 43 }, snap)
    expect(preview).not.toBeNull()
    expect([preview!.object.x, preview!.object.y]).toEqual(snap ? [16, 16] : [19, 19])
    expect([preview!.offsetX, preview!.offsetY]).toEqual([32, 16])
    expect(map.layers.filter(isObjectLayer)[0]!.objects).toHaveLength(0)
    const placed = placeLibraryObject(map, layerId, preview!.object)
    expect(placed.layers.filter(isObjectLayer)[0]!.objects).toEqual([preview!.object])
    expect(sanitizePintaAsset(withPintaSchemaStamp(placed))).toEqual(withPintaSchemaStamp(placed))
  }
})

it('camada ausente, bloqueio herdado e teto de objetos recusam antes da prévia e da escrita', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  expect(libraryPlacement(map, 'ausente', art, 16, { x: 10, y: 10 }, true)).toBeNull()
  const locked: TilemapAsset = {
    ...map,
    layers: map.layers.map((l) => (l.id === 'group' ? { ...l, locked: true } : l)),
  }
  expect(libraryPlacement(locked, layerId, art, 16, { x: 10, y: 10 }, true)).toBeNull()
  const preview = libraryPlacement(map, layerId, art, 16, { x: 10, y: 10 }, true)!
  expect(placeLibraryObject(locked, layerId, preview.object)).toBe(locked)
  const full = {
    ...map,
    layers: map.layers.map((l) =>
      isObjectLayer(l)
        ? {
            ...l,
            objects: Array.from({ length: PINTA_LIMITS.maxTilemapObjects }, (_, i) => ({
              ...preview.object,
              id: String(i),
            })),
          }
        : l,
    ),
  }
  expect(libraryPlacement(full, layerId, art, 16, { x: 10, y: 10 }, true)).toBeNull()
  expect(placeLibraryObject(full, layerId, preview.object)).toBe(full)
})

it('conjunto permanece uma instância vinculada, com suas dimensões e sem achatar elementos', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  const set = createMapSet(map, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'casa')
  const preview = libraryPlacement(map, layerId, set, 16, { x: 60, y: 60 }, true)!
  expect([preview.object.width, preview.object.height]).toEqual([32, 32])
  expect(preview.object.setId).toBe(set.id)
  expect(preview.object.art).toBeUndefined()
  const placed = placeLibraryObject(map, layerId, preview.object)
  expect(placed.layers.filter(isObjectLayer)[0]!.objects).toHaveLength(1)
  expect(sanitizePintaAsset(withPintaSchemaStamp(placed))).toEqual(withPintaSchemaStamp(placed))
})

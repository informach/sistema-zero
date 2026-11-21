import { expect, test } from 'bun:test'
import { createPixelSpriteAsset, createTilemapAsset, isObjectLayer } from '../core/project'
import { libraryPlacement, placeLibraryObject } from './libraryPlacement'
import { expandRegionMap, prepareMapRegions } from './regionMap'

function scene() {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'mundo', tilesetId: 'tiles', cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  return {
    ...expanded.map,
    layers: [
      ...expanded.map.layers,
      {
        id: 'group',
        kind: 'group' as const,
        name: 'Grupo',
        visible: true,
        offsetX: 12.5,
        offsetY: -8.25,
      },
      {
        id: 'objects',
        kind: 'objects' as const,
        name: 'Objetos',
        visible: true,
        parentId: 'group',
        offsetX: 0.25,
        offsetY: 0.5,
        objects: [],
      },
    ],
  }
}
const art = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
test('biblioteca assinada conserva frações, origem e deslocamento herdado sem materializar o mundo', () => {
  const map = scene()
  for (const snap of [false, true]) {
    const preview = libraryPlacement(map, 'objects', art, 16, { x: -100.5, y: -80.25 }, snap)
    expect(preview).not.toBeNull()
    expect([preview!.object.x, preview!.object.y]).toEqual(snap ? [-128, -80] : [-121.25, -80.5])
    expect([preview!.offsetX, preview!.offsetY]).toEqual([12.75, -7.75])
    const placed = placeLibraryObject(map, 'objects', preview!.object)
    expect(placed.origin).toEqual(map.origin)
    expect(placed.layers.find(isObjectLayer)?.objects).toEqual([preview!.object])
    expect(placed.layers[0]).toBe(map.layers[0])
  }
})

test('biblioteca assinada usa os limites do mundo antes de descontar o deslocamento da camada', () => {
  const preview = libraryPlacement(scene(), 'objects', art, 16, { x: -9999, y: -9999 }, false)
  expect(preview?.object.x).toBe(-1612.75)
  expect(preview?.object.y).toBe(-1592.25)
})

test('biblioteca recusa alvo e escala inválidos em vez de inserir silenciosamente na origem', () => {
  for (const tileSize of [0, NaN, Infinity])
    expect(libraryPlacement(scene(), 'objects', art, tileSize, { x: 0, y: 0 }, false)).toBeNull()
  expect(libraryPlacement(scene(), 'objects', art, 16, { x: NaN, y: 0 }, false)).toBeNull()
})

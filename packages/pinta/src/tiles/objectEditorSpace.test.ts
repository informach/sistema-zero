import { expect, test } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import type { AuthorMap } from './mapCellEdits'
import { objectEditorSpace } from './objectEditorSpace'
import { expandRegionMap, prepareMapRegions } from './regionMap'

function scene(regional: boolean) {
  const base = createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 8, rows: 8 })
  const withLayers = <Map extends AuthorMap>(map: Map) => ({
    ...map,
    layers: [
      ...map.layers,
      {
        id: 'parent',
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
        parentId: 'parent',
        offsetX: 0.25,
        offsetY: 0.5,
        objects: [],
      },
    ],
  })
  if (!regional) return withLayers(base)
  const prepared = prepareMapRegions(base)
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -4, row: -4, cols: 12, rows: 12 })
  if (!expanded.ok) throw Error(expanded.reason)
  return withLayers(expanded.map)
}

test('o espaço legado mantém régua, offset, snap e cortes anteriores', () => {
  const space = objectEditorSpace(scene(false), 'objects', 16, 1, false)
  expect(space.viewBox).toBe('-16 -16 160 160')
  expect(space.fromClient({ x: 80, y: 80 }, { left: 0, top: 0, width: 160, height: 160 })).toEqual({
    x: 51.25,
    y: 71.75,
  })
  expect(space.snapEdge(51.25)).toBe(51)
  expect(space.snapPoint(71.75)).toBe(72)
  expect(space.clampX(-1000, 16)).toBe(0)
  expect(space.clampY(1000, 16)).toBe(112)
  expect(space.createObject({ x: -24.25, y: -8.5 })?.x).toBe(0)
})

test('o espaço regional mantém mundo, camada e frações separados', () => {
  const space = objectEditorSpace(scene(true), 'objects', 16, 1, false)
  expect(space.viewBox).toBe('-80 -80 224 224')
  expect(space.fromClient({ x: 80, y: 80 }, { left: 0, top: 0, width: 224, height: 224 })).toEqual({
    x: -12.75,
    y: 7.75,
  })
  expect(space.snapEdge(-10.25)).toBe(-10.25)
  expect(space.snapPoint(-10.25)).toBe(-10.25)
  expect(space.clampX(-1000, 16)).toBe(-76.75)
  expect(space.clampY(-1000, 16)).toBe(-56.25)
  expect(space.clampX(1000, 16)).toBe(99.25)
  expect(space.clampY(1000, 16)).toBe(119.75)
  const object = space.createObject({ x: -24.25, y: -8.5, width: 16, height: 16 })
  expect(object).toMatchObject({ x: -24.25, y: -8.5, width: 16, height: 16 })
  expect(space.createObject({ x: NaN })).toBeNull()
  expect(space.contains({ x: -76.75, y: -56.25 })).toBe(true)
  expect(space.contains({ x: -76.76, y: -56.25 })).toBe(false)
})

test('a grade global conserva peças e centros em coordenadas negativas', () => {
  const space = objectEditorSpace(scene(true), 'objects', 16, 1, true)
  expect(space.snapEdge(-10.25)).toBe(-16)
  expect(space.snapPoint(-10.25)).toBe(-8)
})

test('caixa sem layout ou ponteiro inválido não cria posição na origem', () => {
  for (const regional of [false, true]) {
    const space = objectEditorSpace(scene(regional), 'objects', 16, 1, false),
      box = { left: 0, top: 0, width: 160, height: 160 }
    expect(space.fromClient({ x: NaN, y: 0 }, box)).toBeNull()
    expect(space.fromClient({ x: 0, y: 0 }, { ...box, width: 0 })).toBeNull()
    expect(space.fromClient({ x: 0, y: 0 }, { ...box, height: Infinity })).toBeNull()
  }
})

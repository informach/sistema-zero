import { expect, test } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  effectiveLayer,
  isObjectLayer,
  isTilesetKind,
  type RegionTilemapAsset,
} from '../core/project'
import { PINTA_RESOURCE_LIMITS } from '../core/projectConfig'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../core/regionDocument'
import { addMapObjects, createMapObject, createRegionMapObject } from './mapObjects'
import { objectBounds } from './objectGeometry'
import { DEFAULT_OBJECT_SCATTER, scatterMapObjects } from './objectScatter'
import { REGION_EDIT_LIMIT } from './regionCells'
import { expandRegionMap, prepareMapRegions } from './regionMap'

function scene(): RegionTilemapAsset {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'mundo', tilesetId: 'ground', cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -100, row: -100, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  return {
    ...expanded.map,
    layers: [
      ...expanded.map.layers,
      { id: 'group', kind: 'group', name: 'Grupo', visible: true, offsetX: -0.25, offsetY: 0.5 },
      {
        id: 'objects',
        kind: 'objects',
        name: 'Objetos',
        visible: true,
        parentId: 'group',
        offsetX: 0.125,
        offsetY: -0.25,
        objects: [],
      },
    ],
  }
}
const settings = { ...DEFAULT_OBJECT_SCATTER, density: 1, spacing: 0, seed: 37 },
  tree = createRegionMapObject({
    id: 'tree',
    name: 'Árvore',
    shape: 'art',
    art: { assetId: 'tree-art', tile: 0 },
    x: -0.25,
    y: -0.5,
    width: 16.5,
    height: 24.25,
    rotation: 45,
    properties: { self: { type: 'object', value: 'tree' } },
  })!

test('scatter uses signed world bounds and preserves fractional centers with inherited offsets', () => {
  const map = scene(),
    positions = [
      { col: -99, row: -99 },
      { col: -4, row: -3 },
      { col: 0, row: 0 },
      { col: 9899, row: 9899 },
    ],
    before = structuredClone(map)
  const result = scatterMapObjects(
      map,
      'objects',
      tree,
      16,
      positions,
      { ...settings, rotate: true, mirror: true },
      'gesture',
    ),
    layer = result.map.layers.find(isObjectLayer)!,
    offset = effectiveLayer(result.map, layer)
  expect(result.overflow).toBe(false)
  expect(layer.objects.length).toBeGreaterThanOrEqual(3)
  for (const object of layer.objects) {
    const b = objectBounds(object),
      center = { x: b.x + b.width / 2 + offset.offsetX, y: b.y + b.height / 2 + offset.offsetY }
    expect(
      positions.some(
        (p) =>
          Math.abs(center.x - (p.col + 0.5) * 16) < 1e-7 &&
          Math.abs(center.y - (p.row + 0.5) * 16) < 1e-7,
      ),
    ).toBe(true)
    expect(b.x + offset.offsetX).toBeGreaterThanOrEqual(-1600 - 1e-7)
    expect(b.y + offset.offsetY).toBeGreaterThanOrEqual(-1600 - 1e-7)
    expect(b.x + b.width + offset.offsetX).toBeLessThanOrEqual(158400 + 1e-7)
    expect(object.properties.self).toEqual({ type: 'object', value: object.id })
  }
  expect(decodeRegionMapDocument(encodeRegionMapDocument(result.map))).toEqual(result.map)
  expect(map).toEqual(before)
})

function resourceScene(): RegionTilemapAsset {
  const art = createTilesetAsset({ name: 'arte', tileSize: 16 }),
    direct = {
      ...art,
      id: 'direct',
      tileProperties: { '0': { target: { type: 'object' as const, value: 'tree' } } },
    },
    dependent = {
      ...art,
      id: 'dependent',
      tileProperties: { '0': { linked: { type: 'asset' as const, value: 'direct' } } },
    }
  return {
    ...scene(),
    resources: [
      { sourceId: 'art-a', capturedAt: 1, asset: direct },
      { sourceId: 'art-b', capturedAt: 1, asset: dependent },
    ],
  }
}

test('scatter preview deterministically relinks each object and its private resource dependency chain', () => {
  const map = resourceScene(),
    template = { ...tree, art: { assetId: 'dependent', tile: 0 } },
    positions = [
      { col: -4, row: -3 },
      { col: -1, row: -1 },
    ],
    before = structuredClone(map)
  const first = scatterMapObjects(map, 'objects', template, 16, positions, settings, 'stroke'),
    repeat = scatterMapObjects(
      map,
      'objects',
      template,
      16,
      [...positions].reverse().concat(positions),
      settings,
      'stroke',
    )
  expect(first.addedIds).toHaveLength(2)
  expect(first.map).toEqual(repeat.map)
  for (const object of first.map.layers.find(isObjectLayer)!.objects) {
    const dependent = first.map.resources!.find((v) => v.asset.id === object.art?.assetId)!.asset
    expect(dependent.id).not.toBe('dependent')
    if (!isTilesetKind(dependent)) throw Error('Peças esperadas')
    const linked = dependent.tileProperties!['0']!.linked
    if (typeof linked !== 'object' || linked.type !== 'asset') throw Error('Vínculo esperado')
    const direct = first.map.resources!.find((v) => v.asset.id === linked.value)!.asset
    if (!isTilesetKind(direct)) throw Error('Peças esperadas')
    expect(direct.tileProperties!['0']!.target).toEqual({ type: 'object', value: object.id })
  }
  expect(decodeRegionMapDocument(encodeRegionMapDocument(first.map))).toEqual(first.map)
  expect(map).toEqual(before)
})

test('scatter refuses sample and private resource budgets atomically', () => {
  const map = scene(),
    tooMany = Array.from({ length: REGION_EDIT_LIMIT + 1 }, () => ({ col: 0, row: 0 })),
    work = scatterMapObjects(map, 'objects', tree, 16, tooMany, settings, 'stroke')
  expect(work.map).toBe(map)
  expect(work.overflow).toBe(true)
  expect(work.reason).toBe('work-budget')
  const resources = resourceScene(),
    template = { ...tree, art: { assetId: 'dependent', tile: 0 } },
    positions = Array.from({ length: PINTA_RESOURCE_LIMITS.maxVersions }, (_, i) => ({
      col: i,
      row: 0,
    })),
    art = scatterMapObjects(resources, 'objects', template, 16, positions, settings, 'stroke')
  expect(art.map).toBe(resources)
  expect(art.addedIds).toEqual([])
  expect(art.reason).toBe('resources')
})

test('scatter clips transformed geometry at signed borders and refuses inherited locks', () => {
  const map = scene(),
    large = { ...tree, width: 48, height: 48, rotation: 0 },
    positions = [
      { col: -100, row: -100 },
      { col: 9899, row: 9899 },
    ],
    result = scatterMapObjects(map, 'objects', large, 16, positions, settings, 'stroke')
  expect(result.map).toBe(map)
  const locked = {
    ...map,
    layers: map.layers.map((l) => (l.id === 'group' ? { ...l, locked: true as const } : l)),
  }
  expect(
    scatterMapObjects(locked, 'objects', tree, 16, [{ col: -4, row: -3 }], settings, 'stroke').map,
  ).toBe(locked)
})

test('signed scatter keeps live sets linked and observes spacing from existing negative objects', () => {
  const source = createRegionMapObject({
      id: 'house',
      name: 'Casa',
      shape: 'set',
      setId: 'house-and-garden',
      x: -64.125,
      y: -48.25,
      width: 16,
      height: 16,
      rotation: 0,
      properties: { self: { type: 'object', value: 'house' } },
    })!,
    map = addMapObjects(scene(), 'objects', [source]),
    positions = Array.from({ length: 64 }, (_, i) => ({
      col: -8 + (i % 8),
      row: -8 + Math.floor(i / 8),
    })),
    options = { ...settings, spacing: 2, rotate: true, mirror: true },
    first = scatterMapObjects(map, 'objects', source, 16, positions, options, 'first'),
    repeat = scatterMapObjects(
      map,
      'objects',
      source,
      16,
      [...positions].reverse(),
      options,
      'first',
    )
  expect(first.map).toEqual(repeat.map)
  expect(first.addedIds.length).toBeGreaterThan(1)
  const objects = first.map.layers.find(isObjectLayer)!.objects
  for (const object of objects) {
    expect(object.setId).toBe('house-and-garden')
    expect(object.properties.self).toEqual({ type: 'object', value: object.id })
  }
  const centers = objects.map((object) => {
    const b = objectBounds(object)
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  for (let i = 0; i < centers.length; i++)
    for (let j = i + 1; j < centers.length; j++)
      expect(
        Math.hypot(centers[i]!.x - centers[j]!.x, centers[i]!.y - centers[j]!.y),
      ).toBeGreaterThanOrEqual(32 - 1e-7)
  expect(decodeRegionMapDocument(encodeRegionMapDocument(first.map))).toEqual(first.map)
})

test('future artwork metadata refuses the whole scatter without downgrading the source', () => {
  const base = resourceScene(),
    map = {
      ...base,
      resources: base.resources!.map((version) => ({
        ...version,
        asset: { ...version.asset, schema: 99 },
      })),
    },
    before = structuredClone(map)
  const result = scatterMapObjects(
    map,
    'objects',
    { ...tree, art: { assetId: 'dependent', tile: 0 } },
    16,
    [{ col: -4, row: -3 }],
    settings,
    'stroke',
  )
  expect(result.map).toBe(map)
  expect(result.reason).toBe('resources')
  expect(map).toEqual(before)
})

test('legacy scatter also relinks embedded tile object properties instead of retaining the template ID', () => {
  const source = resourceScene(),
    base = createTilemapAsset({ name: 'legado', tilesetId: 'ground', cols: 8, rows: 8 }),
    map = {
      ...base,
      resources: source.resources,
      layers: [
        ...base.layers,
        { id: 'objects', kind: 'objects' as const, name: 'Objetos', visible: true, objects: [] },
      ],
    },
    template = createMapObject({
      ...tree,
      x: 0,
      y: 0,
      rotation: 0,
      width: 16,
      height: 16,
      art: { assetId: 'direct', tile: 0 },
    })
  const result = scatterMapObjects(
      map,
      'objects',
      template,
      16,
      [{ col: 2, row: 2 }],
      settings,
      'stroke',
    ),
    object = result.map.layers.find(isObjectLayer)!.objects[0]!,
    art = result.map.resources!.find((v) => v.asset.id === object.art?.assetId)!.asset
  if (!isTilesetKind(art)) throw Error('Peças esperadas')
  expect(art.tileProperties!['0']!.target).toEqual({ type: 'object', value: object.id })
})

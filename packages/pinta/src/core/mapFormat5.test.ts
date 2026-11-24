import { describe, expect, it } from 'bun:test'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import {
  envelopeVersionFor,
  galleryBackupByteLength,
  galleryToPintaJson,
  importPintaJson,
} from '../export/projectJson'
import {
  createTilemapAsset,
  type MapSetAsset,
  PINTA_MAX_SCHEMA,
  pintaAssetSchema,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapLayer,
  withPintaSchemaStamp,
} from './project'

function map(layer: Partial<TilemapLayer> = {}): TilemapAsset {
  const m = createTilemapAsset({ name: 'preciso', tilesetId: 'pecas', cols: 2, rows: 2, now: 1 })
  m.layers[0] = { ...m.layers[0]!, ...layer } as TilemapLayer
  return m
}

const set = (m: TilemapAsset): MapSetAsset => ({
  id: 'conjunto',
  kind: 'map-set',
  name: 'conjunto',
  createdAt: 1,
  updatedAt: 1,
  schema: 4,
  map: m,
})

describe('formato 5: offsets fracionários recusados pelo leitor completo de schema 4', () => {
  it.each([
    'tiles',
    'objects',
    'group',
  ] as const)('fração em %s exige carimbo e envelope 5', (kind) => {
    const m = map()
    const common = { id: 'fracao', name: 'Fração', visible: true, offsetX: 16.5, offsetY: 0.25 }
    m.layers.push(
      kind === 'tiles'
        ? { ...common, cells: new Int16Array(4).fill(-1) }
        : kind === 'objects'
          ? { ...common, kind, objects: [] }
          : { ...common, kind },
    )
    const stamped = withPintaSchemaStamp(m)
    expect(stamped.schema).toBe(5)
    expect(stamped.schema).toBeGreaterThan(4)
    expect(pintaAssetSchema(stamped)).toBe(5)
    expect(envelopeVersionFor([stamped])).toBe(5)
    expect((pintaAssetToWire(m) as { schema: number }).schema).toBe(5)
    expect(importPintaJson(galleryToPintaJson([m])).assets).toEqual([stamped])
    expect(galleryBackupByteLength([stamped])).toBe(
      new TextEncoder().encode(galleryToPintaJson([stamped])).byteLength,
    )
    for (const schema of [3, 4, 5])
      expect(pintaAssetFromWire({ ...(pintaAssetToWire(m) as object), schema })).toEqual(stamped)
  })

  it('frações no mapa interno elevam também o conjunto e o envelope; inteiros voltam a 4', () => {
    const source = set(map({ offsetX: 0.25 }))
    const stamped = withPintaSchemaStamp(source)
    expect(stamped.schema).toBe(5)
    expect(stamped.map.schema).toBe(5)
    expect(pintaAssetSchema(source)).toBe(5)
    expect(envelopeVersionFor([source])).toBe(5)
    expect(pintaAssetFromWire(pintaAssetToWire(source))).toEqual(stamped)
    expect(importPintaJson(galleryToPintaJson([source])).assets).toEqual([stamped])
    const integer = withPintaSchemaStamp({ ...stamped, map: map({ offsetX: 16 }) })
    expect(integer.schema).toBe(4)
    expect(integer.map.schema).toBe(3)
    expect(envelopeVersionFor([integer])).toBe(4)
  })

  it('mapas ricos inteiros continuam 4, camadas inteiras 3 e antigos sem carimbo', () => {
    const rich = map({ properties: { vidas: { type: 'int', value: 3 } }, offsetX: 16 })
    expect(withPintaSchemaStamp(rich).schema).toBe(4)
    expect(envelopeVersionFor([rich])).toBe(4)
    const layers = map({ offsetX: 16 })
    expect(withPintaSchemaStamp(layers).schema).toBe(3)
    expect(envelopeVersionFor([layers])).toBe(3)
    const old = map()
    expect(withPintaSchemaStamp(old)).toBe(old)
    expect(envelopeVersionFor([old])).toBe(1)
    expect(PINTA_MAX_SCHEMA).toBe(7)
    expect(sanitizePintaAsset({ ...rich, schema: PINTA_MAX_SCHEMA + 1 })).toBeNull()
    expect(sanitizePintaAsset({ ...set(rich), schema: PINTA_MAX_SCHEMA + 1 })).toBeNull()
    const future = { ...JSON.parse(galleryToPintaJson([rich])), version: PINTA_MAX_SCHEMA + 1 }
    expect(importPintaJson(JSON.stringify(future)).assets).toEqual([])
  })
})

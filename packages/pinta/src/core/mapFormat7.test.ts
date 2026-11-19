import { describe, expect, test } from 'bun:test'
import { pintaCanWriteNativeSchema } from '@sistemazero/core/creations'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import {
  envelopeVersionFor,
  galleryBackupByteLength,
  galleryToPintaJson,
  importPintaJson,
} from '../export/projectJson'
import { createMapObject, updateMapObject } from '../tiles/mapObjects'
import {
  createTilemapAsset,
  type MapSetAsset,
  pintaAssetSchema,
  sanitizePintaAsset,
  type TilemapAsset,
  withPintaSchemaStamp,
} from './project'

function map(): TilemapAsset {
  const result = createTilemapAsset({
    name: 'colisao',
    tilesetId: 'tiles',
    cols: 4,
    rows: 4,
    now: 1,
  })
  result.layers.push({
    id: 'objects',
    kind: 'objects',
    name: 'Objetos',
    visible: true,
    objects: [
      {
        id: 'wall',
        name: 'Parede',
        type: '',
        x: 16,
        y: 16,
        width: 16,
        height: 16,
        shape: 'ellipse',
        properties: {},
        collision: true,
      },
    ],
  })
  return result
}
describe('formato 7: colisão autoral de objeto', () => {
  test('adoção explícita da física precisa protege também mapas sem paredes de objeto', () => {
    const source = updateMapObject(map(), 'objects', 'wall', { collision: undefined })
    const precise: TilemapAsset = { ...source, physics: 'precise' }
    expect(pintaAssetSchema(source)).toBe(4)
    expect(pintaAssetSchema(precise)).toBe(7)
    expect(importPintaJson(galleryToPintaJson([precise])).assets).toEqual([
      withPintaSchemaStamp(precise),
    ])
  })
  test('carimbo e envelope recusam leitores que descartam a marca de colisão', () => {
    const source = map(),
      stamped = withPintaSchemaStamp({ ...source, schema: 4 })
    expect(stamped.schema).toBe(7)
    expect(pintaAssetSchema(source)).toBe(7)
    expect(envelopeVersionFor([source])).toBe(7)
    expect(pintaAssetFromWire(pintaAssetToWire(source))).toEqual(stamped)
    const backup = galleryToPintaJson([source])
    const imported = importPintaJson(backup)
    expect(imported.warnings).toEqual([])
    expect(imported.assets).toEqual([stamped])
    expect(galleryBackupByteLength([source])).toBe(new TextEncoder().encode(backup).byteLength)
  })
  test('definição reutilizável protege o mapa interno e o conjunto externo', () => {
    const source: MapSetAsset = {
      id: 'set',
      name: 'set',
      kind: 'map-set',
      createdAt: 1,
      updatedAt: 1,
      schema: 4,
      map: map(),
    }
    const stamped = withPintaSchemaStamp(source)
    expect(stamped.schema).toBe(7)
    expect(stamped.map.schema).toBe(7)
    expect(importPintaJson(galleryToPintaJson([source])).assets).toEqual([stamped])
  })
  test('ligar, desligar e copiar a marca passa pelas mesmas operações e sanitizador', () => {
    const source = map()
    const off = updateMapObject(source, 'objects', 'wall', { collision: undefined })
    expect(off).not.toBe(source)
    expect(pintaAssetSchema(off)).toBe(4)
    const on = updateMapObject(off, 'objects', 'wall', { collision: true })
    expect(on).not.toBe(off)
    expect(pintaAssetSchema(on)).toBe(7)
    expect(updateMapObject(on, 'objects', 'wall', { collision: true })).toBe(on)
    const created = createMapObject({ shape: 'polygon', collision: true })
    expect(created.collision).toBe(true)
    expect(createMapObject({ ...created, id: 'copy' }).collision).toBe(true)
    expect(sanitizePintaAsset(withPintaSchemaStamp(on))).toEqual(withPintaSchemaStamp(on))
  })
  test('sem marca nova, o documento anterior permanece no formato anterior', () => {
    const source = updateMapObject(map(), 'objects', 'wall', { collision: undefined })
    const stamped = withPintaSchemaStamp(source)
    expect(stamped.schema).toBe(4)
    expect(envelopeVersionFor([source])).toBe(4)
    const layer = stamped.layers.find((l) => l.kind === 'objects')
    if (layer?.kind !== 'objects') throw new Error('Expected objects')
    expect(Object.hasOwn(layer.objects[0]!, 'collision')).toBe(false)
    expect(importPintaJson(galleryToPintaJson([source])).assets).toEqual([stamped])
  })
  test('rollout do leitor não permite enviar documento 7 com declaração antiga', () => {
    for (const declared of [1, 2, 3, 4, 5])
      expect(pintaCanWriteNativeSchema(7, declared)).toBe(false)
    expect(pintaCanWriteNativeSchema(7, 6)).toBe(true)
    expect(pintaCanWriteNativeSchema(8, 6)).toBe(false)
  })
})

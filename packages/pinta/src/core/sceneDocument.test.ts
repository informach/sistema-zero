import { describe, expect, it } from 'bun:test'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import { envelopeVersionFor, galleryToPintaJson, importPintaJson } from '../export/projectJson'
import { cloneWithNewIds, planImport } from '../state/importPlan'
import { addMapObject, createMapObject, updateMapObject } from '../tiles/mapObjects'
import { createMapSet } from '../tiles/sets'
import {
  createTilemapAsset,
  createTilesetAsset,
  effectiveLayer,
  isObjectLayer,
  sanitizePintaAsset,
  type TilemapAsset,
} from './project'

const map = (): TilemapAsset => ({
  ...createTilemapAsset({ name: 'vila', tilesetId: 'pecas', cols: 4, rows: 4 }),
  layers: [
    { id: 'g', kind: 'group', name: 'Vila', visible: true },
    { id: 't', name: 'Chão', parentId: 'g', visible: true, cells: new Int16Array(16).fill(0) },
    { id: 'o', kind: 'objects', name: 'Objetos', parentId: 'g', visible: true, objects: [] },
  ],
})
describe('documento de cenário completo', () => {
  it('recortar objetos num grupo deslocado conserva posição e referências após sanear', () => {
    const m = map()
    m.layers[0] = { ...m.layers[0]!, offsetX: 32, offsetY: 16 }
    const layer = m.layers[2]
    if (!layer || !isObjectLayer(layer)) throw new Error('Objetos ausentes')
    layer.objects = [
      createMapObject({
        id: 'a',
        x: 8,
        y: 8,
        properties: { alvo: { type: 'object', value: 'b' } },
      }),
      createMapObject({ id: 'b', x: 16, y: 8 }),
    ]
    const set = createMapSet(m, { col: 2, row: 1, cols: 2, rows: 2 }, 16, 'Modelo'),
      read = sanitizePintaAsset(set)
    if (read?.kind !== 'map-set') throw new Error('Conjunto inválido')
    const objects = read.map.layers.find(isObjectLayer)!
    const state = effectiveLayer(read.map, objects)
    expect(objects.objects.map((o) => [o.x + state.offsetX, o.y + state.offsetY])).toEqual([
      [8, 8],
      [16, 8],
    ])
    expect(objects.objects[0]?.properties.alvo).toEqual({
      type: 'object',
      value: objects.objects[1]!.id,
    })
    layer.objects.push(createMapObject({ shape: 'set', setId: set.id, x: 8, y: 8 }))
    expect(() => createMapSet(m, { col: 2, row: 1, cols: 2, rows: 2 }, 16, 'Outro')).toThrow(
      'Solte os conjuntos',
    )
  })
  it('formas, giro, papéis e propriedades tipadas sobrevivem clone, wire e arquivo', () => {
    let m = addMapObject(
      map(),
      'o',
      createMapObject({
        shape: 'polygon',
        role: 'danger',
        rotation: -90,
        points: [
          { x: 0, y: 0 },
          { x: 16, y: 0 },
          { x: 8, y: 16 },
        ],
        properties: {
          vidas: { type: 'int', value: 3 },
          cor: { type: 'color', value: '#aabbcc' },
          alvo: { type: 'object', value: 'jogador' },
        },
      }),
    )
    m = updateMapObject(
      m,
      'o',
      (m.layers[2] as { objects: { id: string }[] }).objects[0]?.id ?? '',
      { rotation: 45 },
    )
    const canonical = sanitizePintaAsset(m)
    if (!canonical) throw new Error('Mapa de referência inválido')
    expect(pintaAssetFromWire(JSON.parse(JSON.stringify(pintaAssetToWire(m))))).toEqual(canonical)
    expect(importPintaJson(galleryToPintaJson([m])).assets).toEqual([canonical])
    expect(envelopeVersionFor([m])).toBe(3)
    const clone = cloneWithNewIds(m, 'copia') as TilemapAsset
    expect(clone.layers[1]?.parentId).toBe(clone.layers[0]?.id)
    expect(isObjectLayer(clone.layers[2]!) && clone.layers[2].objects[0]?.rotation).toBe(45)
  })
  it('metadados de peças conservam índices, validam animações e recusam formato futuro', () => {
    const ts = {
      ...createTilesetAsset({ name: 'pecas', tileSize: 16 }),
      animations: {
        '0': [
          { tile: 0, duration: 120 },
          { tile: 50, duration: 40 },
        ],
      },
      tileProperties: { '0': { preco: { type: 'float', value: 1.5 } } },
      terrains: [
        {
          id: 'grama',
          name: 'Grama',
          mode: 'corner',
          colors: ['#00ff00'],
          tiles: { '0': [0, 1, 0, 1, 0, 1, 0, 1] },
        },
      ],
    }
    const read = sanitizePintaAsset(ts)
    expect(read?.kind === 'tileset' && read.animations?.['0']).toEqual([{ tile: 0, duration: 120 }])
    expect(importPintaJson(galleryToPintaJson([read!])).assets).toEqual([read!])
    expect(envelopeVersionFor([read!])).toBe(3)
    expect(sanitizePintaAsset({ ...ts, schema: 4 })).toBeNull()
  })
  it('conjuntos atravessam fronteiras e religam as peças na importação', () => {
    const set = createMapSet(map(), { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'Casa')
    expect(pintaAssetFromWire(JSON.parse(JSON.stringify(pintaAssetToWire(set))))).toEqual(
      sanitizePintaAsset(set),
    )
    expect(importPintaJson(galleryToPintaJson([set])).assets[0] ?? null).toEqual(
      sanitizePintaAsset(set),
    )
    const ts = { ...createTilesetAsset({ name: 'pecas', tileSize: 16 }), id: 'pecas' }
    const plan = planImport([ts, set], new Set(['pecas']), new Set())
    const restored = plan.pairs[1]?.restored
    expect(restored?.kind === 'map-set' ? restored.map.tilesetId : undefined).toBe(
      plan.idMap.get('pecas'),
    )
    expect(
      sanitizePintaAsset({
        ...set,
        map: {
          ...set.map,
          layers: [
            ...set.map.layers,
            {
              id: 'x',
              kind: 'objects',
              name: 'x',
              visible: true,
              objects: [createMapObject({ shape: 'set', setId: set.id })],
            },
          ],
        },
      }),
    ).toBeNull()
  })
})

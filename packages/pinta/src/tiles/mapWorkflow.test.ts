import { describe, expect, it } from 'bun:test'
import {
  createTilemapAsset,
  isObjectLayer,
  sanitizePintaAsset,
  type TileTerrain,
} from '../core/project'
import { addMapGroup, moveMapLayer, setMapLayerParent, updateMapLayer } from './layerTree'
import { addMapObject, createMapObject, objectAt } from './mapObjects'
import { arrangeObjects, pasteObjects } from './objectSelection'
import { scatterTiles } from './scatter'
import { stampCells } from './stamp'
import { paintTerrain } from './terrain'
import { addObjectLayer, removeLayer, setCell } from './tilemapOps'
import { transformStamp } from './transform'

const base = () => createTilemapAsset({ name: 'fase', tilesetId: 'ts', cols: 4, rows: 4 })
describe('fluxo de criação do mapa', () => {
  it('a distância admitida na edição sobrevive ao leitor sem corte na reabertura', () => {
    const map = base(),
      layerId = map.layers[0]!.id
    const updated = updateMapLayer(map, layerId, { parallaxX: 16, parallaxY: 4 })
    expect(updated.layers[0]!.parallaxX).toBe(4)
    const reopened = sanitizePintaAsset(updated)
    if (reopened?.kind !== 'tilemap') throw Error('Mapa esperado')
    expect(reopened.layers).toEqual(updated.layers)
  })
  it('reparentar, mover e destrancar conservam a árvore; grupo não fecha ciclo', () => {
    let m = addMapGroup(base(), 'Vila'),
      g = m.layers.at(-1)!.id,
      t = m.layers[0]!.id
    m = setMapLayerParent(m, t, g)
    expect(m.layers[1]?.parentId).toBe(g)
    expect(setMapLayerParent(m, g, t)).toBe(m)
    m = updateMapLayer(m, g, { locked: true })
    expect(setCell(m, t, 0, 0, 0)).toBe(m)
    expect(removeLayer(m, g)).toBe(m)
    m = updateMapLayer(m, g, { locked: undefined })
    expect(setCell(m, t, 0, 0, 0)).not.toBe(m)
    m = addObjectLayer(m, 'Objetos')
    const moved = moveMapLayer(m, g, 1)
    expect(sanitizePintaAsset(moved)).not.toBeNull()
    expect(moved.layers.at(-1)?.parentId).toBe(g)
  })
  it('carimbo girado preserva os bits e quatro giros restauram a arte', () => {
    const s = { cols: 2, rows: 1, tiles: Int16Array.of(0, 1) }
    let turned: import('./stamp').TileStamp = s
    for (let i = 0; i < 4; i++) turned = transformStamp(turned, 'rotate')
    expect(turned).toEqual(s)
    const m = base(),
      id = m.layers[0]!.id
    const painted = stampCells(
      m,
      id,
      [{ col: 0, row: 0 }],
      transformStamp(s, 'horizontal'),
      { col: 0, row: 0 },
      2,
    )
    expect(painted.layers[0]?.cells?.[0]).toBe(4097)
  })
  it('terreno de cantos resolve as bordas e vizinhos; recusa peças incompletas de modo atômico', () => {
    const terrain: TileTerrain = {
      id: 't',
      name: 'Grama',
      mode: 'corner',
      colors: ['#00ff00'],
      tiles: {},
    }
    for (let i = 0; i < 16; i++)
      terrain.tiles[String(i)] = [
        0,
        (i >> 0) & 1,
        0,
        (i >> 1) & 1,
        0,
        (i >> 2) & 1,
        0,
        (i >> 3) & 1,
      ]
    const m = base(),
      id = m.layers[0]!.id
    const result = paintTerrain(m, id, terrain, 1, [{ col: 1, row: 1 }])
    expect(result.unmatched).toBe(0)
    expect(result.map.layers[0]?.cells?.[5]).toBe(15)
    expect(result.map.layers[0]?.cells?.[0]).toBe(2)
    const failed = paintTerrain(m, id, { ...terrain, tiles: {} }, 1, [{ col: 1, row: 1 }])
    expect(failed.map).toBe(m)
    expect(failed.unmatched).toBeGreaterThan(0)
  })
  it('espalhar repete a prévia pela semente e respeita cadeado', () => {
    const m = base(),
      id = m.layers[0]!.id,
      cells = Array.from({ length: 16 }, (_, i) => ({ col: i % 4, row: Math.floor(i / 4) }))
    expect(scatterTiles(m, id, cells, [0, 1, 2], 0.6, 42)).toEqual(
      scatterTiles(m, id, cells, [0, 1, 2], 0.6, 42),
    )
    const locked = updateMapLayer(m, id, { locked: true })
    expect(scatterTiles(locked, id, cells, [0], 1, 42)).toBe(locked)
  })
  it('copiar objetos religa propriedades e alinhar conserva as formas', () => {
    let m = addObjectLayer(base(), 'Objetos'),
      id = m.layers.at(-1)!.id
    m = addMapObject(
      m,
      id,
      createMapObject({
        id: 'a',
        shape: 'ellipse',
        x: 10,
        y: 20,
        width: 10,
        height: 10,
        properties: { alvo: { type: 'object', value: 'b' } },
      }),
    )
    m = addMapObject(
      m,
      id,
      createMapObject({ id: 'b', shape: 'rect', x: 40, y: 50, width: 10, height: 10 }),
    )
    const l = m.layers.find((l) => l.id === id)!
    if (!isObjectLayer(l)) throw new Error('Camada esperada')
    const pasted = pasteObjects(m, id, l.objects),
      objects = pasted.layers.flatMap((l) => (isObjectLayer(l) ? l.objects : []))
    expect(objects[2]?.properties.alvo).toEqual({ type: 'object', value: objects[3]!.id })
    const aligned = arrangeObjects(m, id, ['a', 'b'], 'left')
    expect(
      aligned.layers.flatMap((l) => (isObjectLayer(l) ? l.objects.map((o) => o.x) : [])),
    ).toEqual([10, 10])
    expect(objectAt(l, 10, 20)).toBeNull()
    expect(objectAt(l, 15, 25)?.id).toBe('a')
  })
})

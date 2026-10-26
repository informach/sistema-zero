/**
 * Camadas de OBJETOS e peças POR CAMADA (10/2026): o modelo (sanitize), as ops
 * puras e as fronteiras (wire, `.pinta.json` v1/v2, `.pinta-tilemap.json`).
 *
 * ⚠️ Round-trip pelo sanitize com `structuredClone` (é o que o IndexedDB faz);
 * o caminho JSON passa pelo wire/projectJson, que convertem os typed arrays.
 */
import { describe, expect, it } from 'bun:test'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import {
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  isObjectLayer,
  PINTA_LIMITS,
  remapTilemapTilesetIds,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapObjectLayer,
  tilemapTilesetIds,
  tilemapUsesTileset,
} from '../core/project'
import { assetBundleToJson, isTilemapBundle } from '../export/assetJson'
import { galleryToPintaJson, importPintaJson } from '../export/projectJson'
import { tilemapExportJson, tilemapToStudioGrid } from '../export/studioGrid'
import { tileLayerAt } from '../testing/fixtures'
import { makeRect } from '../vector/shapes'
import {
  addMapObject,
  createMapObject,
  objectAt,
  removeMapObject,
  snapToGrid,
  updateMapObject,
  withObjectProperty,
} from './mapObjects'
import {
  collectMapTilesetsFrom,
  drawableIn,
  drawableMapTile,
  resolveMapTilesets,
} from './mapTilesets'
import { tilemapMinimapColors } from './minimap'
import { vectorTilemapSvg } from './renderVectorTilemap'
import {
  addLayer,
  addObjectLayer,
  flattenWithTilesets,
  growTilemap,
  removeLayer,
  setCell,
  setLayerTileset,
  toggleLayerFront,
  topTileAt,
} from './tilemapOps'
import { addTile, remapTilemapCells, removeTile } from './tilesetOps'

const square = (fill: string) =>
  makeRect({ x: 0, y: 0 }, { x: 16, y: 16 }, { fill, stroke: null, opacity: 1 })

function objectLayerOf(map: TilemapAsset, index = 1): TilemapObjectLayer {
  const layer = map.layers[index]
  if (!layer || !isObjectLayer(layer)) throw new Error('camada de objetos esperada')
  return layer
}

/** Mapa 4×2 com uma camada de peças (padrão) + uma de objetos com um ponto e uma área. */
function mapWithObjects(): TilemapAsset {
  let map = createTilemapAsset({ name: 'fase', tilesetId: 'pecas', cols: 4, rows: 2 })
  map = setCell(map, tileLayerAt(map).id, 0, 0, 1)
  map = addObjectLayer(map, 'Objetos')
  const layerId = objectLayerOf(map).id
  map = addMapObject(
    map,
    layerId,
    createMapObject({ name: 'inicio', type: 'jogador', x: 8, y: 8, properties: { vidas: 3 } }),
  )
  map = addMapObject(
    map,
    layerId,
    createMapObject({ name: 'porta', type: 'porta', x: 32, y: 0, width: 16, height: 32 }),
  )
  return map
}

describe('sanitize: camadas de objetos', () => {
  it('mapa ANTIGO (sem kind, sem peças por camada) atravessa igualzinho', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 2, rows: 2 })
    map = setCell(map, tileLayerAt(map).id, 1, 1, 3)
    const back = sanitizePintaAsset(structuredClone(map))
    expect(back).toEqual(map)
    // A forma canônica da camada de peças NÃO ganha chave nova.
    expect(Object.keys(tileLayerAt(back as TilemapAsset)).sort()).toEqual(
      ['cells', 'id', 'name', 'visible'].sort(),
    )
  })

  it('camada de objetos válida atravessa igualzinha', () => {
    const map = mapWithObjects()
    expect(sanitizePintaAsset(structuredClone(map))).toEqual(map)
  })

  it('descarta objeto sem id ou com medida não numérica; arredonda e corta no teto', () => {
    const map = mapWithObjects()
    const raw = structuredClone(map) as unknown as { layers: Array<Record<string, unknown>> }
    const objectsRaw = raw.layers[1] as { objects: unknown[] }
    objectsRaw.objects = [
      { id: 'a', name: 'ok', type: '', x: 1.6, y: -5, width: 0, height: 99999, properties: {} },
      { name: 'sem-id', x: 0, y: 0, width: 0, height: 0 },
      { id: 'b', name: 'x-texto', x: '3', y: 0, width: 0, height: 0 },
      { id: 'c', name: 'nan', x: Number.NaN, y: 0, width: 0, height: 0 },
      'lixo',
    ]
    const back = sanitizePintaAsset(raw) as TilemapAsset
    const layer = objectLayerOf(back)
    expect(layer.objects.map((o) => o.id)).toEqual(['a'])
    expect(layer.objects[0]).toMatchObject({
      x: 2,
      y: 0,
      width: 0,
      height: PINTA_LIMITS.maxObjectCoord,
    })
  })

  it('propriedades: texto/número/sim-não ficam; o resto cai; chaves e tetos', () => {
    const map = mapWithObjects()
    const raw = structuredClone(map) as unknown as {
      layers: Array<{ objects?: Array<Record<string, unknown>> }>
    }
    const object = raw.layers[1]?.objects?.[0]
    if (!object) throw new Error('objeto esperado')
    const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`p${i}`, i]))
    object.properties = {
      nome: 'x'.repeat(500),
      vidas: 3,
      voa: false,
      nada: null,
      lista: [1, 2],
      objeto: { a: 1 },
      infinito: Number.POSITIVE_INFINITY,
      '1comeca-com-numero': 1,
      'tem espaco': 1,
      ['k'.repeat(40)]: 1,
      ...many,
    }
    object.name = 'n'.repeat(80)
    object.type = '  inimigo  '
    const back = sanitizePintaAsset(raw) as TilemapAsset
    const props = objectLayerOf(back).objects[0]?.properties ?? {}
    expect(props.nome).toBe('x'.repeat(PINTA_LIMITS.maxObjectPropertyStringChars))
    expect(props.vidas).toBe(3)
    expect(props.voa).toBe(false)
    for (const dropped of [
      'nada',
      'lista',
      'objeto',
      'infinito',
      '1comeca-com-numero',
      'tem espaco',
    ]) {
      expect(Object.hasOwn(props, dropped)).toBe(false)
    }
    expect(Object.keys(props)).toHaveLength(PINTA_LIMITS.maxObjectProperties)
    expect(objectLayerOf(back).objects[0]?.name).toHaveLength(PINTA_LIMITS.maxObjectNameChars)
    expect(objectLayerOf(back).objects[0]?.type).toBe('inimigo')
  })

  it('teto de objetos por camada e de camadas por mapa', () => {
    const map = mapWithObjects()
    const raw = structuredClone(map) as unknown as { layers: Array<Record<string, unknown>> }
    const objects = Array.from({ length: PINTA_LIMITS.maxTilemapObjects + 10 }, (_, i) => ({
      id: `o${i}`,
      name: '',
      type: '',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      properties: {},
    }))
    ;(raw.layers[1] as { objects: unknown }).objects = objects
    const extra = Array.from({ length: 12 }, (_, i) => ({
      kind: 'objects',
      id: `l${i}`,
      name: `L${i}`,
      visible: true,
      objects: [],
    }))
    raw.layers.push(...extra)
    const back = sanitizePintaAsset(raw) as TilemapAsset
    expect(back.layers).toHaveLength(PINTA_LIMITS.maxTilemapLayers)
    expect(objectLayerOf(back).objects).toHaveLength(PINTA_LIMITS.maxTilemapObjects)
  })

  it('camada de tipo desconhecido cai; mapa só de objetos é descartado', () => {
    const map = mapWithObjects()
    const raw = structuredClone(map) as unknown as { layers: Array<Record<string, unknown>> }
    raw.layers.push({ kind: 'futuro', id: 'z', name: 'Z', visible: true })
    const back = sanitizePintaAsset(raw) as TilemapAsset
    expect(back.layers.map((l) => l.kind ?? 'tiles')).toEqual(['tiles', 'objects'])

    const onlyObjects = { ...structuredClone(map), layers: [structuredClone(map.layers[1])] }
    expect(sanitizePintaAsset(onlyObjects)).toBeNull()
  })

  it('peças por camada: igual ao padrão some (forma canônica), outra fica, lixo cai', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols: 2, rows: 1 })
    map = addLayer(map, 'outra', 't2')
    const raw = structuredClone(map) as unknown as { layers: Array<Record<string, unknown>> }
    ;(raw.layers[0] as Record<string, unknown>).tilesetId = 't1'
    raw.layers.push({ ...raw.layers[1], id: 'lixo', tilesetId: 42 })
    const back = sanitizePintaAsset(raw) as TilemapAsset
    expect(tileLayerAt(back, 0).tilesetId).toBeUndefined()
    expect(tileLayerAt(back, 1).tilesetId).toBe('t2')
    expect(tileLayerAt(back, 2).tilesetId).toBeUndefined()
    expect(tilemapTilesetIds(back)).toEqual(['t1', 't2'])
    expect(tilemapUsesTileset(back, 't2')).toBe(true)
    expect(tilemapUsesTileset(back, 't3')).toBe(false)
  })
})

describe('ops: peças por camada', () => {
  const base = createTilesetAsset({ name: 'chao', tileSize: 16 })
  const other = createTilesetAsset({ name: 'casas', tileSize: 16 })
  const bigger = createTilesetAsset({ name: 'grande', tileSize: 32 })
  const vector = createVectorTilesetAsset({ name: 'vetor', tileSize: 16 })

  it('setLayerTileset recusa outro tamanho de peça e outro estilo; aceita o compatível', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 2, rows: 1 })
    map = addLayer(map, 'casas')
    const layerId = tileLayerAt(map, 1).id
    expect(setLayerTileset(map, layerId, bigger, base)).toBe(map)
    expect(setLayerTileset(map, layerId, vector, base)).toBe(map)
    const next = setLayerTileset(map, layerId, other, base)
    expect(tileLayerAt(next, 1).tilesetId).toBe(other.id)
    // Voltar ao padrão tira a chave.
    expect(tileLayerAt(setLayerTileset(next, layerId, base, base), 1).tilesetId).toBeUndefined()
  })

  it('remap de peça só renumera as camadas daquele tileset', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 2, rows: 1 })
    map = setCell(map, tileLayerAt(map).id, 0, 0, 2)
    map = addLayer(map, 'casas', other.id)
    map = setCell(map, tileLayerAt(map, 1).id, 0, 0, 2)
    // Uma peça nova entra no índice 1 de "casas": só a camada de "casas" sobe.
    const inserted = remapTilemapCells(map, { insertedAt: 1 }, other.id)
    expect(tileLayerAt(inserted, 0).cells[0]).toBe(2)
    expect(tileLayerAt(inserted, 1).cells[0]).toBe(3)
    // Remover a peça 2 do padrão esvazia só a camada do padrão.
    const removed = remapTilemapCells(map, { removedAt: 2 }, base.id)
    expect(tileLayerAt(removed, 0).cells[0]).toBe(-1)
    expect(tileLayerAt(removed, 1).cells[0]).toBe(2)
    // As ops do tileset continuam as mesmas (anti-vácuo do fixture).
    expect(addTile(other, 0).tiles).toHaveLength(2)
    expect(removeTile(addTile(other, 0), 1).tiles).toHaveLength(1)
  })

  it('flattenWithTilesets diz de QUAL tileset é a peça que venceu', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 2, rows: 1 })
    map = setCell(map, tileLayerAt(map).id, 0, 0, 0)
    map = setCell(map, tileLayerAt(map).id, 1, 0, 0)
    map = addLayer(map, 'casas', other.id)
    map = setCell(map, tileLayerAt(map, 1).id, 1, 0, 5)
    const flat = flattenWithTilesets(map)
    expect(flat.tilesetIds).toEqual([base.id, other.id])
    expect(Array.from(flat.tiles)).toEqual([0, 5])
    expect(Array.from(flat.sources)).toEqual([0, 1])
  })

  it('resolve e coleta: tileset incompatível fica de fora (as camadas dele não aparecem)', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 1, rows: 1 })
    map = addLayer(map, 'casas', other.id)
    map = addLayer(map, 'grande', bigger.id)
    expect(collectMapTilesetsFrom(map, [bigger, other, base]).map((t) => t.name)).toEqual([
      'chao',
      'casas',
    ])
    expect(resolveMapTilesets(map, [base, other, bigger]).map((t) => t?.name ?? null)).toEqual([
      'chao',
      'casas',
      null,
    ])
    // Sem o padrão, nada: o mapa mostra "peças sumiram".
    expect(collectMapTilesetsFrom(map, [other])).toEqual([])
  })

  it('remapTilemapTilesetIds religa o padrão E as camadas (o import)', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: 'velho-a', cols: 1, rows: 1 })
    map = addLayer(map, 'b', 'velho-b')
    const ids = new Map([
      ['velho-a', 'novo-a'],
      ['velho-b', 'novo-b'],
    ])
    const next = remapTilemapTilesetIds(map, (id) => ids.get(id) ?? id)
    expect(next.tilesetId).toBe('novo-a')
    expect(tileLayerAt(next, 1).tilesetId).toBe('novo-b')
    expect(remapTilemapTilesetIds(map, (id) => id)).toBe(map)
  })

  it('a última camada de PEÇAS não sai; a de objetos sai', () => {
    const map = mapWithObjects()
    expect(removeLayer(map, tileLayerAt(map).id)).toBe(map)
    expect(removeLayer(map, objectLayerOf(map).id).layers).toHaveLength(1)
  })

  it('o teto de 8 camadas vale para peças e objetos somados', () => {
    let map = createTilemapAsset({ name: 'fase', tilesetId: 't', cols: 1, rows: 1 })
    for (let i = 0; i < 10; i += 1) map = i % 2 ? addLayer(map, `p${i}`) : addObjectLayer(map, '')
    expect(map.layers).toHaveLength(PINTA_LIMITS.maxTilemapLayers)
  })
})

describe('ops: objetos', () => {
  it('cria, muda (com os cortes) e apaga; nada muda = mesmo asset', () => {
    const map = mapWithObjects()
    const layerId = objectLayerOf(map).id
    const id = objectLayerOf(map).objects[0]?.id ?? ''
    const moved = updateMapObject(map, layerId, id, { x: 40.4, name: '  heroi  ' })
    expect(objectLayerOf(moved).objects[0]).toMatchObject({ x: 40, name: 'heroi' })
    expect(updateMapObject(moved, layerId, id, { x: 40 })).toBe(moved)
    expect(objectLayerOf(removeMapObject(moved, layerId, id)).objects).toHaveLength(1)
    // Numa camada de PEÇAS as ops de objeto não fazem nada.
    expect(addMapObject(map, tileLayerAt(map).id, createMapObject())).toBe(map)
  })

  it('teto de objetos por camada', () => {
    let map = mapWithObjects()
    const layerId = objectLayerOf(map).id
    for (let i = 0; i < PINTA_LIMITS.maxTilemapObjects; i += 1) {
      map = addMapObject(map, layerId, createMapObject({ x: i }))
    }
    expect(objectLayerOf(map).objects).toHaveLength(PINTA_LIMITS.maxTilemapObjects)
    expect(addMapObject(map, layerId, createMapObject())).toBe(map)
  })

  it('propriedades: normaliza a chave, recusa repetida/inválida/teto, renomear mantém a ordem', () => {
    const start = { a: 1, b: 'x' }
    const renamed = withObjectProperty(start, 'Vida Extra', 2, 'a')
    expect(renamed.ok && Object.keys(renamed.properties)).toEqual(['Vida_Extra', 'b'])
    expect(withObjectProperty(start, 'b', 1)).toEqual({ ok: false, reason: 'duplicate-key' })
    expect(withObjectProperty(start, '123', 1)).toEqual({ ok: false, reason: 'invalid-key' })
    const full = Object.fromEntries(
      Array.from({ length: PINTA_LIMITS.maxObjectProperties }, (_, i) => [`p${i}`, i]),
    )
    expect(withObjectProperty(full, 'mais', 1)).toEqual({ ok: false, reason: 'limit' })
  })

  it('crescer o mapa à esquerda/em cima empurra os objetos uma peça junto', () => {
    const map = mapWithObjects()
    const grown = growTilemap(map, 'left', 16)
    expect(objectLayerOf(grown).objects[0]).toMatchObject({ x: 24, y: 8 })
    const down = growTilemap(map, 'bottom', 16)
    expect(objectLayerOf(down).objects[0]).toMatchObject({ x: 8, y: 8 })
  })

  it('hit-test: ponto pelo raio, área pela caixa, de cima para baixo', () => {
    const layer = objectLayerOf(mapWithObjects())
    expect(objectAt(layer, 9, 9, 4)?.name).toBe('inicio')
    expect(objectAt(layer, 40, 20)?.name).toBe('porta')
    expect(objectAt(layer, 2, 30)).toBeNull()
    expect(snapToGrid(23, 16)).toBe(16)
    expect(snapToGrid(25, 16)).toBe(32)
  })
})

describe('fronteiras: wire, .pinta.json e .pinta-tilemap.json', () => {
  it('wire: objetos e peças por camada atravessam o JSON', () => {
    let map = mapWithObjects()
    map = addLayer(map, 'casas', 'outro')
    const back = pintaAssetFromWire(JSON.parse(JSON.stringify(pintaAssetToWire(map))))
    expect(back).toEqual(map)
  })

  it('.pinta.json: só sai v2 quando o mapa PRECISA; v1 continua lida', () => {
    const plain = createTilemapAsset({ name: 'velho', tilesetId: 't', cols: 1, rows: 1 })
    const v1 = galleryToPintaJson([plain])
    expect(JSON.parse(v1).version).toBe(1)
    expect(importPintaJson(v1).assets[0]).toEqual(plain)

    const map = mapWithObjects()
    const v2 = galleryToPintaJson([plain, map])
    expect(JSON.parse(v2).version).toBe(2)
    // O cabeçalho mede o mesmo nas duas versões (o medidor incremental conta com isso).
    expect(v2.indexOf('"assets"')).toBe(v1.indexOf('"assets"'))
    const { assets, warnings } = importPintaJson(v2)
    expect(warnings).toEqual([])
    expect(assets[1]).toEqual(map)

    // Versão futura: recusa com o recado, não lê pela metade.
    const future = JSON.parse(v2)
    future.version = 3
    expect(importPintaJson(JSON.stringify(future)).assets).toEqual([])
  })

  it('pacote do mapa leva TODAS as peças dele (e é reconhecido como pacote)', () => {
    const base = createTilesetAsset({ name: 'chao', tileSize: 16 })
    const other = createTilesetAsset({ name: 'casas', tileSize: 16 })
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 1, rows: 1 })
    map = addLayer(map, 'casas', other.id)
    const json = assetBundleToJson(map, [map, other, base])
    if (!json) throw new Error('pacote esperado')
    const { assets } = importPintaJson(json)
    expect(assets.map((a) => a.name)).toEqual(['chao', 'casas', 'fase'])
    expect(isTilemapBundle(assets)).toBe(true)
    expect(isTilemapBundle(assets.slice(1))).toBe(false)
  })

  it('.pinta-tilemap.json: objetos, frente e peças por camada; a grade é só do padrão', () => {
    const base = createTilesetAsset({ name: 'chao', tileSize: 16 })
    base.solid[0] = true
    const other = createTilesetAsset({ name: 'casas', tileSize: 16 })
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 2, rows: 1 })
    map = setCell(map, tileLayerAt(map).id, 0, 0, 0)
    map = addLayer(map, 'casas', other.id)
    map = setCell(map, tileLayerAt(map, 1).id, 1, 0, 0)
    map = toggleLayerFront(map, tileLayerAt(map, 1).id)
    map = addObjectLayer(map, 'Objetos')
    map = addMapObject(
      map,
      objectLayerOf(map, 2).id,
      createMapObject({ name: 'inicio', type: 'jogador', x: 8, y: 8, properties: { vidas: 3 } }),
    )
    // A camada de outras peças NÃO entra na grade colável (o bloco só tem uma imagem).
    expect(tilemapToStudioGrid(map)).toBe('0 .')
    const parsed = JSON.parse(tilemapExportJson(map, [base, other]))
    expect(parsed).toMatchObject({
      format: 'pinta-tilemap',
      version: 2,
      tileSize: 16,
      cols: 2,
      rows: 1,
      grid: '0 .',
      solid: '0',
    })
    expect(parsed.tilesets.map((t: { name: string }) => t.name)).toEqual(['chao', 'casas'])
    expect(parsed.tilesets[0].solid).toEqual([0])
    expect(parsed.layers[0]).toMatchObject({ type: 'tiles', front: false, tileset: 0 })
    expect(parsed.layers[1]).toMatchObject({ type: 'tiles', front: true, tileset: 1 })
    expect(parsed.layers[1].cells).toEqual([-1, 0])
    expect(parsed.layers[2]).toMatchObject({
      type: 'objects',
      name: 'Objetos',
      objects: [
        {
          name: 'inicio',
          type: 'jogador',
          x: 8,
          y: 8,
          width: 0,
          height: 0,
          properties: { vidas: 3 },
        },
      ],
    })
    // Sem as peças da camada: o índice vira null em vez de apontar para outra.
    expect(JSON.parse(tilemapExportJson(map, base)).layers[1].tileset).toBeNull()
  })
})

describe('desenho com várias peças', () => {
  it('o SVG do mapa vetorial dá um símbolo por (tileset, peça); o padrão mantém o id antigo', () => {
    const base = createVectorTilesetAsset({ name: 'chao', tileSize: 16 })
    const other = createVectorTilesetAsset({ name: 'casas', tileSize: 16 })
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 2, rows: 1 })
    map = setCell(map, tileLayerAt(map).id, 0, 0, 0)
    map = addLayer(map, 'casas', other.id)
    map = setCell(map, tileLayerAt(map, 1).id, 1, 0, 0)
    const svg = vectorTilemapSvg(map, [base, other])
    expect(svg).toContain('<symbol id="tile-0"')
    expect(svg).toContain('<symbol id="tile-1-0"')
    expect(svg).toContain('href="#tile-1-0" x="16"')
    // Sem as outras peças, a camada delas simplesmente não aparece.
    expect(vectorTilemapSvg(map, base)).not.toContain('tile-1-0')
  })

  it('o minimapa pinta cada célula com a cor das peças da camada que venceu', () => {
    const base = createVectorTilesetAsset({ name: 'chao', tileSize: 16 })
    base.tiles = [[square('#ff0000')]]
    const other = createVectorTilesetAsset({ name: 'casas', tileSize: 16 })
    other.tiles = [[square('#0000ff')]]
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 2, rows: 1 })
    map = setCell(map, tileLayerAt(map).id, 0, 0, 0)
    map = addLayer(map, 'casas', other.id)
    map = setCell(map, tileLayerAt(map, 1).id, 1, 0, 0)
    expect(tilemapMinimapColors(map, [base, other])).toEqual(['#ff0000', '#0000ff'])
  })

  it('a camada sem as peças dela (sumiram ou são de outro tamanho) não tapa a de baixo, como no jogo', () => {
    const base = createVectorTilesetAsset({ name: 'chao', tileSize: 16 })
    base.tiles = [[square('#ff0000')]]
    const other = createVectorTilesetAsset({ name: 'casas', tileSize: 16 })
    other.tiles = [[square('#0000ff')]]
    const bigger = createVectorTilesetAsset({ name: 'grande', tileSize: 32 })
    bigger.tiles = [[square('#00ff00')]]
    let map = createTilemapAsset({ name: 'fase', tilesetId: base.id, cols: 3, rows: 1 })
    for (const col of [0, 1, 2]) map = setCell(map, tileLayerAt(map).id, col, 0, 0)
    map = addLayer(map, 'casas', other.id)
    map = setCell(map, tileLayerAt(map, 1).id, 0, 0, 0)
    // Uma casa que aponta para uma peça que "casas" não tem (o atlas do pygame grava -1).
    map = setCell(map, tileLayerAt(map, 1).id, 1, 0, 7)
    map = addLayer(map, 'grande', bigger.id)
    map = setCell(map, tileLayerAt(map, 2).id, 2, 0, 0)

    // Tudo achado: "casas" vence a 1ª; a peça 7 e a camada incompatível não tapam nada.
    expect(tilemapMinimapColors(map, [base, other, bigger])).toEqual([
      '#0000ff',
      '#ff0000',
      '#ff0000',
    ])
    // "casas" sumiu da galeria: a camada dela não aparece e o chão volta a aparecer.
    expect(tilemapMinimapColors(map, [base, bigger])).toEqual(['#ff0000', '#ff0000', '#ff0000'])
    const svg = vectorTilemapSvg(map, [base, bigger])
    for (const x of [0, 16, 32]) expect(svg).toContain(`href="#tile-0" x="${x}"`)
    expect(svg).not.toContain('tile-1-')
    expect(svg).not.toContain('tile-2-')

    // A mesma regra no achatado e na célula do editor (`topTileAt`).
    const drawable = drawableMapTile(map, resolveMapTilesets(map, [base, bigger]))
    expect(Array.from(flattenWithTilesets(map, undefined, drawable).sources)).toEqual([0, 0, 0])
    const found = drawableIn(new Map([[base.id, base]]))
    expect(topTileAt(map, 0, 0, undefined, found)?.layer.id).toBe(tileLayerAt(map).id)
    // Sem filtro, a regra antiga (quem não sabe das peças): a de cima vence.
    expect(topTileAt(map, 0, 0)?.layer.id).toBe(tileLayerAt(map, 1).id)
  })
})

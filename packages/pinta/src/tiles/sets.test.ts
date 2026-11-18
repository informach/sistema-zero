/**
 * Conjuntos (pedaços reutilizáveis do mapa): guardar um pedaço, pôr uma instância e soltá-la.
 * O que estes testes seguram: soltar nunca corta calado, nunca escreve chave no valor padrão (o
 * mapa pediria um formato mais novo sem precisar) e respeita os tetos de criação do editor.
 */
import { describe, expect, it } from 'bun:test'
import { pintaAssetToWire } from '../assets/wire'
import {
  createTilemapAsset,
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  type MapSetAsset,
  PINTA_LIMITS,
  PINTA_SCENE_SCHEMA,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapObject,
  type TilemapObjectLayer,
  type TilemapTileLayer,
  tilemapNeedsV3,
  tilemapSchemaFor,
  withPintaSchemaStamp,
} from '../core/project'
import { CELL_FLIP_H, cellFlags, cellTile } from './cell'
import { addMapObject, createMapObject } from './mapObjects'
import { createMapSet, detachMapSet, placeMapSet } from './sets'
import { addObjectLayer } from './tilemapOps'

const TILE = 16

/** Mapa de 4 × 3 com células 0..11 e uma camada de objetos vazia. */
function mapaBase(): TilemapAsset {
  const base = createTilemapAsset({ name: 'vila', tilesetId: 'pecas', cols: 4, rows: 3 })
  const chao = base.layers[0] as TilemapTileLayer
  const comCelulas: TilemapAsset = {
    ...base,
    layers: [{ ...chao, cells: Int16Array.from({ length: 12 }, (_, i) => i) }],
  }
  return addObjectLayer(comCelulas, 'Coisas')
}

const objetos = (map: TilemapAsset): TilemapObjectLayer => {
  const layer = map.layers.find(isObjectLayer)
  if (!layer) throw new Error('camada de objetos esperada')
  return layer
}
const pecas = (map: TilemapAsset): TilemapTileLayer[] => map.layers.filter(isTileLayer)

/** Um conjunto de 2 × 1 (células 5 e 6) com um objeto dentro. */
function conjuntoSimples(): { origem: TilemapAsset; set: MapSetAsset } {
  let origem = mapaBase()
  origem = addMapObject(
    origem,
    objetos(origem).id,
    createMapObject({ name: 'bau', x: 1 * TILE + 4, y: 1 * TILE + 2, width: 8, height: 8 }),
  )
  return { origem, set: createMapSet(origem, { col: 1, row: 1, cols: 2, rows: 1 }, TILE, 'casa') }
}

describe('createMapSet', () => {
  it('recorta as células do retângulo e os objetos que começam dentro dele, com ids novos', () => {
    const { origem, set } = conjuntoSimples()
    expect(set.kind).toBe('map-set')
    expect(set.schema).toBe(PINTA_SCENE_SCHEMA)
    expect(set.name).toBe('casa')
    expect(set.id).not.toBe(origem.id)
    expect(set.map.id).not.toBe(origem.id)
    expect({ cols: set.map.cols, rows: set.map.rows }).toEqual({ cols: 2, rows: 1 })
    expect(Array.from(pecas(set.map)[0]?.cells ?? [])).toEqual([5, 6])
    const dentro = objetos(set.map).objects
    expect(dentro).toHaveLength(1)
    // Posição relativa ao canto do recorte; id novo (o original continua no mapa de origem).
    expect(dentro[0]).toMatchObject({ name: 'bau', x: 4, y: 2, width: 8, height: 8 })
    expect(dentro[0]?.id).not.toBe(objetos(origem).objects[0]?.id)
    const idsOrigem = new Set(origem.layers.map((l) => l.id))
    expect(set.map.layers.some((l) => idsOrigem.has(l.id))).toBe(false)
    // A origem não muda.
    expect(Array.from(pecas(origem)[0]?.cells ?? [])).toEqual([...Array(12).keys()])
  })

  it('objeto fora do retângulo fica de fora, e a camada de objetos vazia não entra', () => {
    let origem = mapaBase()
    origem = addMapObject(
      origem,
      objetos(origem).id,
      createMapObject({ name: 'longe', x: 3 * TILE, y: 2 * TILE, width: 8, height: 8 }),
    )
    const set = createMapSet(origem, { col: 0, row: 0, cols: 2, rows: 2 }, TILE, 'canto')
    expect(set.map.layers.filter(isObjectLayer)).toHaveLength(0)
    expect(Array.from(pecas(set.map)[0]?.cells ?? [])).toEqual([0, 1, 4, 5])
  })

  it('conserva os bits de giro da célula e o que sai do mapa vira vazio', () => {
    const origem = mapaBase()
    const chao = pecas(origem)[0] as TilemapTileLayer
    const virada = Int16Array.from(chao.cells)
    virada[11] = 11 | CELL_FLIP_H
    const comVirada = {
      ...origem,
      layers: origem.layers.map((l) => (l.id === chao.id ? { ...chao, cells: virada } : l)),
    }
    const set = createMapSet(comVirada, { col: 3, row: 2, cols: 2, rows: 2 }, TILE, 'borda')
    const cells = pecas(set.map)[0]?.cells ?? new Int16Array()
    expect(cellTile(cells[0] ?? -1)).toBe(11)
    expect(cellFlags(cells[0] ?? -1)).toBe(CELL_FLIP_H)
    expect(Array.from(cells.slice(1))).toEqual([-1, -1, -1])
  })

  it('🚨 recusa guardar um pedaço que já tem uma instância de conjunto (sem conjunto dentro de conjunto)', () => {
    const { set } = conjuntoSimples()
    const destino = mapaBase()
    const comInstancia = placeMapSet(destino, objetos(destino).id, set, 0, 0, TILE)
    expect(() =>
      createMapSet(comInstancia, { col: 0, row: 0, cols: 2, rows: 2 }, TILE, 'outro'),
    ).toThrow()
    // Fora do alcance da instância, o recorte é aceito.
    expect(
      createMapSet(comInstancia, { col: 2, row: 2, cols: 2, rows: 1 }, TILE, 'outro').map.cols,
    ).toBe(2)
  })

  it('o conjunto criado passa pelo sanitizador sem perder nada', () => {
    const { set } = conjuntoSimples()
    expect(sanitizePintaAsset(JSON.parse(JSON.stringify(pintaAssetToWire(set))))).toEqual(set)
  })
})

describe('placeMapSet', () => {
  it('põe UM objeto que aponta para o conjunto, do tamanho dele, sem copiar células', () => {
    const { set } = conjuntoSimples()
    const destino = mapaBase()
    const posto = placeMapSet(destino, objetos(destino).id, set, 16, 32, TILE)
    const [instancia] = objetos(posto).objects
    expect(objetos(posto).objects).toHaveLength(1)
    expect(instancia).toMatchObject({
      shape: 'set',
      setId: set.id,
      name: 'casa',
      x: 16,
      y: 32,
      width: 2 * TILE,
      height: 1 * TILE,
    })
    expect(pecas(posto)[0]?.cells).toBe(pecas(destino)[0]?.cells)
    expect(tilemapSchemaFor(posto)).toBe(PINTA_SCENE_SCHEMA)
  })

  it('camada que não é de objetos (ou não existe): o mesmo mapa', () => {
    const { set } = conjuntoSimples()
    const destino = mapaBase()
    expect(placeMapSet(destino, pecas(destino)[0]?.id ?? '', set, 0, 0, TILE)).toBe(destino)
    expect(placeMapSet(destino, 'nao-existe', set, 0, 0, TILE)).toBe(destino)
  })
})

describe('detachMapSet', () => {
  function posto(x = 0, y = 0, extra: Partial<TilemapObject> = {}) {
    const { set } = conjuntoSimples()
    const destino = mapaBase()
    const layerId = objetos(destino).id
    let map = placeMapSet(destino, layerId, set, x, y, TILE)
    const instancia = objetos(map).objects[0] as TilemapObject
    if (Object.keys(extra).length)
      map = {
        ...map,
        layers: map.layers.map((l) =>
          l.id === layerId && isObjectLayer(l)
            ? { ...l, objects: [{ ...instancia, ...extra }] }
            : l,
        ),
      }
    return { set, map, layerId, instanciaId: instancia.id }
  }

  it('troca a instância por cópias independentes das camadas, na ordem, antes da camada dona', () => {
    const { set, map, layerId, instanciaId } = posto(16, 32)
    const solto = detachMapSet(map, layerId, instanciaId, set, TILE)
    expect(solto).not.toBe(map)
    // chão do mapa, [peças do conjunto, objetos do conjunto], camada dona (agora sem a instância).
    expect(solto.layers).toHaveLength(map.layers.length + 2)
    expect(solto.layers[solto.layers.length - 1]?.id).toBe(layerId)
    expect(objetos({ ...solto, layers: [solto.layers[solto.layers.length - 1]!] }).objects).toEqual(
      [],
    )
    const nova = solto.layers[1] as TilemapTileLayer
    expect(isTileLayer(nova)).toBe(true)
    expect(nova.cells).toHaveLength(map.cols * map.rows)
    // As células entram no canto da camada; o deslocamento da camada é que a põe no lugar.
    expect(Array.from(nova.cells.slice(0, 2))).toEqual([5, 6])
    expect(Array.from(nova.cells.slice(2)).every((c) => c === -1)).toBe(true)
    expect({ offsetX: nova.offsetX, offsetY: nova.offsetY }).toEqual({ offsetX: 16, offsetY: 32 })
    const novosObjetos = solto.layers[2] as TilemapObjectLayer
    expect(novosObjetos.objects).toHaveLength(1)
    expect(novosObjetos.objects[0]).toMatchObject({ name: 'bau', x: 16 + 4, y: 32 + 2 })
    // Ids novos em tudo: soltar duas instâncias não pode repetir id.
    const idsDoConjunto = new Set([
      ...set.map.layers.map((l) => l.id),
      ...objetos(set.map).objects.map((o) => o.id),
    ])
    expect(solto.layers.some((l) => idsDoConjunto.has(l.id))).toBe(false)
    expect(idsDoConjunto.has(novosObjetos.objects[0]?.id ?? '')).toBe(false)
    // O conjunto e o mapa de antes não mudam.
    expect(Array.from(pecas(set.map)[0]?.cells ?? [])).toEqual([5, 6])
    expect(objetos(map).objects).toHaveLength(1)
  })

  it('🚨 não escreve chave no valor padrão: solto na origem, o mapa continua no formato antigo', () => {
    const { set, map, layerId, instanciaId } = posto(0, 0)
    const solto = detachMapSet(map, layerId, instanciaId, set, TILE)
    for (const layer of solto.layers) {
      for (const chave of ['opacity', 'offsetX', 'offsetY', 'parentId', 'locked'])
        expect(chave in layer, `${layer.name}.${chave}`).toBe(false)
      if (isObjectLayer(layer))
        for (const o of layer.objects)
          for (const chave of ['rotation', 'flipX', 'flipY', 'shape', 'setId'])
            expect(chave in o, `${o.name}.${chave}`).toBe(false)
    }
    expect(tilemapNeedsV3(solto)).toBe(false)
    expect(tilemapSchemaFor(solto)).toBeUndefined()
    // E já está na forma canônica: o sanitizador devolve exatamente o mesmo mapa.
    expect(sanitizePintaAsset(JSON.parse(JSON.stringify(pintaAssetToWire(solto))))).toEqual(solto)
  })

  it('fora da origem só entra o deslocamento que difere de zero', () => {
    const { set, map, layerId, instanciaId } = posto(16, 0)
    const solto = detachMapSet(map, layerId, instanciaId, set, TILE)
    const nova = solto.layers[1] as TilemapTileLayer
    expect(nova.offsetX).toBe(16)
    expect('offsetY' in nova).toBe(false)
    expect('opacity' in nova).toBe(false)
    expect(sanitizePintaAsset(JSON.parse(JSON.stringify(pintaAssetToWire(solto))))).toEqual({
      ...solto,
      schema: 3,
    })
  })

  it('opacidade e deslocamento da camada dona passam para as camadas soltas', () => {
    const { set, map, layerId, instanciaId } = posto(0, 0)
    const comDona: TilemapAsset = {
      ...map,
      layers: map.layers.map((l) => (l.id === layerId ? { ...l, opacity: 0.5, offsetX: 8 } : l)),
    }
    const solto = detachMapSet(comDona, layerId, instanciaId, set, TILE)
    expect(solto.layers[1]).toMatchObject({ opacity: 0.5, offsetX: 8 })
    expect(solto.layers[2]).toMatchObject({ opacity: 0.5, offsetX: 8 })
    expect('offsetY' in (solto.layers[1] ?? {})).toBe(false)
  })

  it('instância espelhada: as células viram e o objeto de dentro ganha o espelho', () => {
    const { set, map, layerId, instanciaId } = posto(0, 0, { flipX: true })
    const solto = detachMapSet(map, layerId, instanciaId, set, TILE)
    const nova = solto.layers[1] as TilemapTileLayer
    expect(Array.from(nova.cells.slice(0, 2)).map((c) => cellTile(c))).toEqual([6, 5])
    expect(Array.from(nova.cells.slice(0, 2)).every((c) => cellFlags(c) === CELL_FLIP_H)).toBe(true)
    const [bau] = (solto.layers[2] as TilemapObjectLayer).objects
    expect(bau?.flipX).toBe(true)
    expect('flipY' in (bau ?? {})).toBe(false)
    expect('rotation' in (bau ?? {})).toBe(false)
  })

  it('instância girada 90 graus: o conjunto troca colunas por linhas e os objetos giram junto', () => {
    const { set, map, layerId, instanciaId } = posto(32, 0, { rotation: 90 })
    const solto = detachMapSet(map, layerId, instanciaId, set, TILE)
    expect(solto).not.toBe(map)
    const nova = solto.layers[1] as TilemapTileLayer
    // 2 × 1 deitado vira 1 × 2 em pé: uma célula na linha 0 e outra na linha 1.
    expect(cellTile(nova.cells[0] ?? -1)).toBe(5)
    expect(cellTile(nova.cells[map.cols] ?? -1)).toBe(6)
    expect(nova.cells[1]).toBe(-1)
    expect((solto.layers[2] as TilemapObjectLayer).objects[0]?.rotation).toBe(90)
  })

  it('🚨 recusa (o MESMO mapa) em vez de cortar: conjunto maior que o mapa', () => {
    const grande = createTilemapAsset({ name: 'grande', tilesetId: 'pecas', cols: 6, rows: 2 })
    const set = createMapSet(grande, { col: 0, row: 0, cols: 6, rows: 2 }, TILE, 'largo')
    const destino = mapaBase() // 4 × 3: 6 colunas não cabem
    const layerId = objetos(destino).id
    const map = placeMapSet(destino, layerId, set, 0, 0, TILE)
    const instanciaId = objetos(map).objects[0]?.id ?? ''
    expect(detachMapSet(map, layerId, instanciaId, set, TILE)).toBe(map)
  })

  it('🚨 girado, o que conta é o tamanho depois do giro (cabe deitado, não cabe em pé)', () => {
    const origem = createTilemapAsset({ name: 'o', tilesetId: 'pecas', cols: 4, rows: 1 })
    const set = createMapSet(origem, { col: 0, row: 0, cols: 4, rows: 1 }, TILE, 'faixa')
    const destino = mapaBase() // 4 colunas × 3 linhas
    const layerId = objetos(destino).id
    const deitado = placeMapSet(destino, layerId, set, 0, 0, TILE)
    const id = objetos(deitado).objects[0]?.id ?? ''
    expect(detachMapSet(deitado, layerId, id, set, TILE)).not.toBe(deitado)
    const emPe: TilemapAsset = {
      ...deitado,
      layers: deitado.layers.map((l) =>
        isObjectLayer(l) ? { ...l, objects: l.objects.map((o) => ({ ...o, rotation: 90 })) } : l,
      ),
    }
    // Em pé são 4 linhas num mapa de 3.
    expect(detachMapSet(emPe, layerId, id, set, TILE)).toBe(emPe)
  })

  it('recusa quando passa do teto de camadas que o editor deixa criar', () => {
    const { set, map, layerId, instanciaId } = posto()
    let cheio = map
    while (cheio.layers.length < PINTA_LIMITS.maxTilemapLayers - 1)
      cheio = addObjectLayer(cheio, 'mais')
    // Faltava uma vaga e o conjunto traz duas camadas.
    expect(detachMapSet(cheio, layerId, instanciaId, set, TILE)).toBe(cheio)
  })

  it('recusa instância esticada, girada fora de 90 graus, de outro conjunto, ou em camada trancada', () => {
    const esticada = posto(0, 0, { width: 3 * TILE })
    expect(
      detachMapSet(esticada.map, esticada.layerId, esticada.instanciaId, esticada.set, TILE),
    ).toBe(esticada.map)
    const torta = posto(0, 0, { rotation: 45 })
    expect(detachMapSet(torta.map, torta.layerId, torta.instanciaId, torta.set, TILE)).toBe(
      torta.map,
    )
    const { set, map, layerId, instanciaId } = posto()
    expect(detachMapSet(map, layerId, instanciaId, { ...set, id: 'outro' }, TILE)).toBe(map)
    expect(detachMapSet(map, layerId, 'nao-existe', set, TILE)).toBe(map)
    const trancado: TilemapAsset = {
      ...map,
      layers: map.layers.map((l) => (l.id === layerId ? { ...l, locked: true as const } : l)),
    }
    expect(detachMapSet(trancado, layerId, instanciaId, set, TILE)).toBe(trancado)
  })
})

describe('recorte visual de conjuntos com deslocamento', () => {
  it('peças desalinhadas fora do recorte não impedem guardar o pedaço', () => {
    const map = mapaBase(),
      layer = pecas(map)[0]!
    layer.cells.fill(-1)
    layer.cells[11] = 3
    layer.offsetX = 0.5
    const set = createMapSet(map, { col: 0, row: 0, cols: 1, rows: 1 }, TILE, 'vazio')
    expect([...pecas(set.map)[0]!.cells]).toEqual([-1])
    // Mesmo começando fora do recorte, uma peça que entra pela borda não pode sumir.
    layer.cells[11] = -1
    layer.cells[0] = 3
    layer.offsetX = -0.5
    expect(() => createMapSet(map, { col: 0, row: 0, cols: 1, rows: 1 }, TILE, 'meia')).toThrow(
      /grade/,
    )
  })
  it('copia as peças visíveis e compensa também o deslocamento herdado sem perder grupos', () => {
    const map = mapaBase(),
      layer = pecas(map)[0]!
    map.layers = [
      { id: 'grupo', kind: 'group', name: 'Vila', visible: true, offsetX: 32, offsetY: -16 },
      { ...layer, parentId: 'grupo', offsetX: -16, offsetY: 32 },
    ]
    const set = createMapSet(map, { col: 1, row: 1, cols: 2, rows: 1 }, TILE, 'visual')
    const cropped = pecas(set.map)[0]!
    expect([...cropped.cells]).toEqual([0, 1])
    expect(cropped.parentId).toBe(set.map.layers[0]!.id)
    expect(effectiveLayer(set.map, cropped)).toMatchObject({ offsetX: 0, offsetY: 0 })
    expect([...layer.cells]).toEqual([...Array(12).keys()])
  })
  it('recusa meia peça explicitamente e não altera o mapa', () => {
    const map = mapaBase(),
      layer = pecas(map)[0]!
    layer.offsetX = 0.5
    const before = structuredClone(map)
    expect(() => createMapSet(map, { col: 0, row: 0, cols: 2, rows: 1 }, TILE, 'meia')).toThrow(
      /grade/,
    )
    expect(map).toEqual(before)
  })
})

it('recorte de objetos conserva deslocamentos fracionários e a posição visual do grupo', () => {
  let map = mapaBase()
  map.layers = map.layers.map((l) =>
    isTileLayer(l) ? { ...l, cells: new Int16Array(l.cells.length).fill(-1) } : l,
  )
  const owner = objetos(map)
  map.layers = [
    ...map.layers.slice(0, -1),
    {
      id: 'grupo-fracionario',
      kind: 'group',
      name: 'Jardim',
      visible: true,
      offsetX: 16.5,
      offsetY: 0.25,
    },
    { ...owner, parentId: 'grupo-fracionario' },
  ]
  map = addMapObject(
    map,
    owner.id,
    createMapObject({ name: 'flor', x: 3, y: 2, width: 4, height: 4 }),
  )
  const set = createMapSet(map, { col: 1, row: 0, cols: 1, rows: 1 }, TILE, 'jardim')
  const copied = objetos(set.map),
    object = copied.objects[0]!,
    e = effectiveLayer(set.map, copied)
  expect(object.x + e.offsetX).toBe(3.5)
  expect(object.y + e.offsetY).toBe(2.25)
  expect(sanitizePintaAsset(JSON.parse(JSON.stringify(pintaAssetToWire(set))))).toEqual(
    withPintaSchemaStamp(set),
  )
})

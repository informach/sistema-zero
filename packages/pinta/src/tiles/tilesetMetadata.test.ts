/**
 * Os metadados por peça (animações, terrenos, propriedades) e a arte dos objetos apontam para a
 * peça pelo ÍNDICE. Inserir, duplicar ou remover uma peça muda os índices: tudo o que aponta
 * precisa acompanhar, senão a animação passa a tocar a peça errada sem erro nenhum.
 */
import { describe, expect, it } from 'bun:test'
import { pintaAssetToWire } from '../assets/wire'
import {
  type AnyTilesetAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  isObjectLayer,
  PINTA_LIMITS,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilesetAsset,
  tilesetSchemaFor,
  withPintaSchemaStamp,
} from '../core/project'
import { CELL_FLIP_H } from './cell'
import { addMapObject, createMapObject } from './mapObjects'
import { addObjectLayer } from './tilemapOps'
import { addTile, duplicateTile, remapTilemapCells, removeTile } from './tilesetOps'

/** Quatro peças (0..3) com metadados na 1 e na 2. */
function pecas(): TilesetAsset {
  let ts = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  for (let i = 0; i < 3; i += 1) ts = addTile(ts, i)
  return {
    ...ts,
    animations: {
      '1': [
        { tile: 1, duration: 100 },
        { tile: 2, duration: 200 },
      ],
      '2': [{ tile: 3, duration: 300 }],
    },
    tileProperties: { '1': { dano: 2 }, '3': { nome: 'lava' } },
    terrains: [
      {
        id: 'grama',
        name: 'Grama',
        mode: 'corner',
        colors: ['#00ff00'],
        tiles: { '0': [1, 0, 1, 0, 1, 0, 1, 0], '2': [0, 1, 0, 1, 0, 1, 0, 1] },
      },
    ],
  }
}

describe('metadados das peças acompanham a peça', () => {
  it('inserir uma peça no meio empurra chaves e quadros de cima; os de baixo ficam', () => {
    // Nova peça entra no índice 2: as antigas 2 e 3 viram 3 e 4.
    const depois = addTile(pecas(), 1)
    expect(depois.tiles).toHaveLength(5)
    expect(depois.animations).toEqual({
      '1': [
        { tile: 1, duration: 100 },
        { tile: 3, duration: 200 },
      ],
      '3': [{ tile: 4, duration: 300 }],
    })
    expect(depois.tileProperties).toEqual({ '1': { dano: 2 }, '4': { nome: 'lava' } })
    expect(depois.terrains?.[0]?.tiles).toEqual({
      '0': [1, 0, 1, 0, 1, 0, 1, 0],
      '3': [0, 1, 0, 1, 0, 1, 0, 1],
    })
    // A peça nova nasce sem metadado nenhum.
    expect(depois.animations?.['2']).toBeUndefined()
    expect(depois.tileProperties?.['2']).toBeUndefined()
  })

  it('duplicar copia os metadados da peça para a cópia, sem dividir os mesmos objetos', () => {
    const antes = pecas()
    const depois = duplicateTile(antes, 1) // a cópia entra no índice 2
    expect(depois.tiles).toHaveLength(5)
    expect(depois.animations?.['1']).toEqual([
      { tile: 1, duration: 100 },
      { tile: 3, duration: 200 },
    ])
    expect(depois.animations?.['2']).toEqual(depois.animations?.['1'])
    expect(depois.animations?.['2']).not.toBe(depois.animations?.['1'])
    expect(depois.animations?.['2']?.[0]).not.toBe(depois.animations?.['1']?.[0])
    expect(depois.animations?.['3']).toEqual([{ tile: 4, duration: 300 }])
    expect(depois.tileProperties).toEqual({
      '1': { dano: 2 },
      '2': { dano: 2 },
      '4': { nome: 'lava' },
    })
    expect(depois.tileProperties?.['2']).not.toBe(depois.tileProperties?.['1'])
    // Peça de terreno duplicada leva a marcação dela.
    const comTerreno = duplicateTile(antes, 0)
    expect(comTerreno.terrains?.[0]?.tiles).toEqual({
      '0': [1, 0, 1, 0, 1, 0, 1, 0],
      '1': [1, 0, 1, 0, 1, 0, 1, 0],
      '3': [0, 1, 0, 1, 0, 1, 0, 1],
    })
    // O original não muda.
    expect(antes.animations?.['2']).toEqual([{ tile: 3, duration: 300 }])
  })

  it('remover tira a peça dos metadados, puxa os de cima e descarta quadro que apontava para ela', () => {
    const depois = removeTile(pecas(), 2)
    expect(depois.tiles).toHaveLength(3)
    // A animação da peça 1 perde o quadro da peça removida; a animação DA peça removida some; a
    // antiga peça 3 vira 2.
    expect(depois.animations).toEqual({ '1': [{ tile: 1, duration: 100 }] })
    expect(depois.tileProperties).toEqual({ '1': { dano: 2 }, '2': { nome: 'lava' } })
    expect(depois.terrains?.[0]?.tiles).toEqual({ '0': [1, 0, 1, 0, 1, 0, 1, 0] })
  })

  it('animação que fica sem quadro nenhum some inteira (a peça dela continua existindo)', () => {
    const ts: TilesetAsset = { ...pecas(), animations: { '0': [{ tile: 3, duration: 100 }] } }
    const depois = removeTile(ts, 3)
    expect(depois.tiles).toHaveLength(3)
    expect('animations' in depois).toBe(false)
  })

  it('🚨 quando o último metadado sai, a chave SOME (mapa vazio faria pedir o formato novo à toa)', () => {
    let ts: TilesetAsset = {
      ...addTile(createTilesetAsset({ name: 'pecas', tileSize: 16 }), 0),
      animations: { '1': [{ tile: 1, duration: 100 }] },
      tileProperties: { '1': { dano: 2 } },
    }
    // A peça nova entra DEPOIS da 1: os metadados continuam na 1.
    ts = addTile(ts, 1)
    expect(Object.keys(ts.animations ?? {})).toEqual(['1'])
    expect(tilesetSchemaFor(ts)).toBe(4)
    const depois = removeTile(ts, 1)
    expect('animations' in depois).toBe(false)
    expect('tileProperties' in depois).toBe(false)
    expect(tilesetSchemaFor(depois)).toBeUndefined()
    expect('schema' in withPintaSchemaStamp({ ...depois, schema: 4 })).toBe(false)
    // E é a forma canônica: o sanitizador devolve o mesmo.
    const lido = sanitizePintaAsset(JSON.parse(JSON.stringify(pintaAssetToWire(depois))))
    expect(lido).toEqual(depois)
  })

  it('conjunto sem metadado continua sem nenhuma chave nova depois de inserir, duplicar e remover', () => {
    let ts: AnyTilesetAsset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    ts = removeTile(duplicateTile(addTile(ts, 0), 0), 1)
    for (const chave of ['animations', 'tileProperties', 'terrains', 'schema'])
      expect(chave in ts, chave).toBe(false)
  })

  it('vale igual para peças vetoriais', () => {
    let ts = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    ts = addTile(ts, 0)
    ts = { ...ts, animations: { '1': [{ tile: 1, duration: 100 }] } }
    expect(addTile(ts, 0).animations).toEqual({ '2': [{ tile: 2, duration: 100 }] })
    expect('animations' in removeTile(ts, 1)).toBe(false)
  })

  it('no teto de criação de peças, inserir e duplicar devolvem o MESMO desenho', () => {
    let cheio: TilesetAsset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
    for (let i = 0; i < PINTA_LIMITS.maxTiles + 5; i += 1) cheio = addTile(cheio, 0)
    expect(cheio.tiles).toHaveLength(PINTA_LIMITS.maxTiles)
    expect(addTile(cheio, 0)).toBe(cheio)
    expect(duplicateTile(cheio, 0)).toBe(cheio)
  })
})

describe('remapTilemapCells: a arte dos objetos (`art.tile`) acompanha a peça', () => {
  function mapaComArte(): TilemapAsset {
    let map = addObjectLayer(
      createTilemapAsset({ name: 'fase', tilesetId: 'pecas', cols: 2, rows: 1 }),
      'Coisas',
    )
    const layerId = map.layers.find(isObjectLayer)?.id ?? ''
    const arte = (name: string, assetId: string, tile?: number) =>
      createMapObject({
        name,
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        shape: 'art',
        art: { assetId, ...(tile === undefined ? {} : { tile }) },
      })
    map = addMapObject(map, layerId, arte('baixa', 'pecas', 1))
    map = addMapObject(map, layerId, arte('alvo', 'pecas', 2))
    map = addMapObject(map, layerId, arte('alta', 'pecas', 3))
    map = addMapObject(map, layerId, arte('de-outras-pecas', 'outras', 2))
    map = addMapObject(map, layerId, arte('primeira-implicita', 'pecas'))
    map = addMapObject(map, layerId, arte('sprite-inteiro', 'retrato'))
    return map
  }
  const artes = (map: TilemapAsset) =>
    Object.fromEntries(
      (map.layers.find(isObjectLayer)?.objects ?? []).map((o) => [
        o.name,
        o.art ? (o.art.tile ?? 'inteiro') : `sem arte (${o.shape})`,
      ]),
    )

  it('peça inserida: quem apontava para ela ou acima sobe 1', () => {
    const depois = remapTilemapCells(mapaComArte(), { insertedAt: 2 }, 'pecas')
    expect(artes(depois)).toEqual({
      baixa: 1,
      alvo: 3,
      alta: 4,
      'de-outras-pecas': 2,
      'primeira-implicita': 'inteiro',
      'sprite-inteiro': 'inteiro',
    })
  })

  it('peça removida: quem apontava para ela perde a arte e vira retângulo; as de cima descem', () => {
    const antes = mapaComArte()
    const depois = remapTilemapCells(antes, { removedAt: 2 }, 'pecas')
    expect(artes(depois)).toEqual({
      baixa: 1,
      alvo: 'sem arte (rect)',
      alta: 2,
      'de-outras-pecas': 2,
      'primeira-implicita': 'inteiro',
      'sprite-inteiro': 'inteiro',
    })
    // O objeto continua no mapa, no mesmo lugar e com o mesmo id.
    const alvoAntes = antes.layers.find(isObjectLayer)?.objects[1]
    const alvoDepois = depois.layers.find(isObjectLayer)?.objects[1]
    expect(alvoDepois?.id).toBe(alvoAntes?.id ?? '')
    expect(alvoDepois).toMatchObject({ x: 0, y: 0, width: 16, height: 16 })
  })

  it('nada muda → o MESMO mapa; e a arte de outro conjunto de peças nunca é tocada', () => {
    const map = mapaComArte()
    expect(remapTilemapCells(map, { insertedAt: 9 }, 'pecas')).toBe(map)
    expect(artes(remapTilemapCells(map, { removedAt: 2 }, 'outras'))).toMatchObject({
      alvo: 2,
      'de-outras-pecas': 'sem arte (rect)',
    })
  })

  it('a peça zero implícita acompanha inserção e remoção e conserva a arte de sprite', () => {
    const original = mapaComArte()
    const chao = original.layers[0]!
    if (chao.kind === 'objects' || chao.kind === 'group') throw new Error('Camada sem peças')
    const antes = {
      ...original,
      layers: [{ ...chao, cells: Int16Array.from([CELL_FLIP_H, 1]) }, ...original.layers.slice(1)],
    }
    const objetos = (map: TilemapAsset) => map.layers.find(isObjectLayer)!.objects
    const implicita = objetos(antes)[4]!
    const sprite = objetos(antes)[5]!

    const depoisDaInsercao = remapTilemapCells(antes, { insertedAt: 0 }, 'pecas')
    expect(objetos(depoisDaInsercao)[4]).toEqual({
      ...implicita,
      art: { assetId: 'pecas', tile: 1 },
    })
    expect(objetos(depoisDaInsercao)[5]).toBe(sprite)
    expect(depoisDaInsercao.layers[0]).toMatchObject({
      cells: Int16Array.from([1 | CELL_FLIP_H, 2]),
    })

    const movimento = remapTilemapCells(depoisDaInsercao, { removedAt: 2 }, 'pecas')
    expect(objetos(movimento)[4]).toBe(objetos(depoisDaInsercao)[4]!)
    expect(objetos(movimento)[5]).toBe(sprite)
    expect(movimento.layers[0]).toMatchObject({ cells: Int16Array.from([1 | CELL_FLIP_H, -1]) })

    const semAPrimeira = remapTilemapCells(antes, { removedAt: 0 }, 'pecas')
    const { art: _art, ...implicitaSemArte } = implicita
    expect(objetos(semAPrimeira)[4]).toEqual({ ...implicitaSemArte, shape: 'rect' })
    expect(objetos(semAPrimeira)[5]).toBe(sprite)
    expect(semAPrimeira.layers[0]).toMatchObject({ cells: Int16Array.from([-1, 0]) })
    expect(objetos(remapTilemapCells(antes, { insertedAt: 2 }, 'pecas'))[4]).toBe(implicita)
    expect(Object.hasOwn(implicita.art!, 'tile')).toBe(false)
  })

  it('uma folha privada com o mesmo id continua a resolver suas próprias células e objetos', () => {
    const map = mapaComArte()
    const chao = map.layers[0]!
    if (chao.kind === 'objects' || chao.kind === 'group') throw new Error('Camada sem peças')
    const antes: TilemapAsset = {
      ...map,
      layers: [{ ...chao, cells: Int16Array.from([0, 1]) }, ...map.layers.slice(1)],
      resources: [{ sourceId: 'outra-folha', capturedAt: 1, asset: { ...pecas(), id: 'pecas' } }],
    }
    expect(remapTilemapCells(antes, { removedAt: 0 }, 'pecas')).toBe(antes)
    expect(remapTilemapCells(antes, { insertedAt: 0 }, 'pecas')).toBe(antes)
  })

  it('células e arte mudam juntas, e a célula virada continua virada', () => {
    const base = mapaComArte()
    const comCelulas: TilemapAsset = {
      ...base,
      layers: base.layers.map((l) =>
        isObjectLayer(l) || l.kind === 'group'
          ? l
          : { ...l, cells: Int16Array.from([2 | CELL_FLIP_H, 3]) },
      ),
    }
    const depois = remapTilemapCells(comCelulas, { insertedAt: 2 }, 'pecas')
    const chao = depois.layers[0]
    expect(chao && 'cells' in chao && Array.from(chao.cells ?? [])).toEqual([3 | CELL_FLIP_H, 4])
    expect(artes(depois).alvo).toBe(3)
  })
})

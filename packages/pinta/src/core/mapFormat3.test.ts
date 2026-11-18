/**
 * O formato 3 do mapa: grupos de camadas, cadeado, opacidade, deslocamento, parallax, colisão,
 * propriedades de camada, peças viradas e mapas maiores. As duas promessas que seguram tudo:
 * um mapa que NÃO usa nada disto continua byte a byte o de antes, e um mapa que usa só é lido
 * por quem conhece o formato (carimbo `schema` e envelope do `.pinta.json`).
 */
import { describe, expect, it } from 'bun:test'
import { pintaAssetFromWire, pintaAssetToWire } from '../assets/wire'
import {
  assetNeedsV3,
  envelopeVersionFor,
  galleryToPintaJson,
  importPintaJson,
} from '../export/projectJson'
import { CELL_FLIP_H, CELL_FLIP_V, cellFlags, cellTile, makeCell } from '../tiles/cell'
import { packCells, unpackCells } from '../tiles/cellCodec'
import { flattenLayers, topTileAt } from '../tiles/tilemapOps'
import {
  createTilemapAsset,
  effectiveLayer,
  isGroupLayer,
  isLayerShown,
  isTileLayer,
  layerAncestors,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
  PINTA_MAP_SCHEMA,
  PINTA_MAX_SCHEMA,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapLayer,
  tilemapNeedsV3,
} from './project'

const mapa = (cols = 4, rows = 2): TilemapAsset => ({
  id: 'mapa',
  kind: 'tilemap',
  name: 'vila',
  createdAt: 1,
  updatedAt: 2,
  tilesetId: 'pecas',
  cols,
  rows,
  layers: [{ id: 'chao', name: 'Chão', visible: true, cells: new Int16Array(cols * rows).fill(0) }],
})
const pecas = (id: string, over: Partial<TilemapLayer> = {}, cols = 4, rows = 2): TilemapLayer =>
  ({
    id,
    name: id,
    visible: true,
    cells: new Int16Array(cols * rows).fill(-1),
    ...over,
  }) as TilemapLayer
const grupo = (id: string, over: Partial<TilemapLayer> = {}): TilemapLayer =>
  ({ kind: 'group', id, name: id, visible: true, ...over }) as TilemapLayer
const ler = (raw: unknown) => sanitizePintaAsset(structuredClone(raw)) as TilemapAsset | null
const com = (layers: TilemapLayer[], base = mapa()): TilemapAsset => ({ ...base, layers })

describe('mapa antigo', () => {
  it('atravessa o sanitizador, o wire e o .pinta.json igualzinho, sem carimbo e na versão 1', () => {
    const m = mapa()
    expect(tilemapNeedsV3(m)).toBe(false)
    const lido = ler(m)
    expect(lido).toEqual(m)
    expect(lido && 'schema' in lido).toBe(false)
    expect(Object.keys(lido?.layers[0] ?? {})).toEqual(['id', 'name', 'visible', 'cells'])
    expect(pintaAssetToWire(m)).toEqual({
      ...m,
      layers: [{ ...m.layers[0], cells: [0, 0, 0, 0, 0, 0, 0, 0] }],
    })
    expect(envelopeVersionFor([m])).toBe(1)
    expect(galleryToPintaJson([m])).toContain('"version": 1')
    expect(galleryToPintaJson([m])).not.toContain('cellsPacked')
  })

  it('valores iguais ao padrão não viram chave (forma canônica)', () => {
    const cru = com([
      {
        ...pecas('a'),
        locked: false,
        opacity: 1,
        offsetX: 0,
        offsetY: 0,
        parallaxX: 1,
        parallaxY: 1,
        properties: {},
        collision: false,
      },
    ] as unknown as TilemapLayer[])
    const lido = ler(cru)
    expect(Object.keys(lido?.layers[0] ?? {})).toEqual(['id', 'name', 'visible', 'cells'])
    expect(lido && tilemapNeedsV3(lido)).toBe(false)
  })

  it('o editor cria até o teto antigo; o formato lê mais do que o editor cria', () => {
    const criar: { camadas: number; colunas: number; linhas: number; pecas: number } = {
      camadas: PINTA_LIMITS.maxTilemapLayers,
      colunas: PINTA_LIMITS.maxTilemapCols,
      linhas: PINTA_LIMITS.maxTilemapRows,
      pecas: PINTA_LIMITS.maxTiles,
    }
    expect(criar).toEqual({ camadas: 8, colunas: 128, linhas: 128, pecas: 64 })
    expect(PINTA_MAP_FORMAT_LIMITS.maxLayers).toBeGreaterThan(criar.camadas)
    expect(PINTA_MAP_FORMAT_LIMITS.maxCols).toBeGreaterThan(criar.colunas)
    expect(PINTA_MAP_FORMAT_LIMITS.maxRows).toBeGreaterThan(criar.linhas)
    expect(PINTA_MAP_FORMAT_LIMITS.maxTiles).toBeGreaterThan(criar.pecas)
    expect(createTilemapAsset({ name: 'x', tilesetId: 't', cols: 999, rows: 999 }).cols).toBe(128)
  })
})

describe('camadas do formato 3', () => {
  it('frações de pixel sobrevivem ao registro, wire e arquivo em todos os tipos de camada', () => {
    const raw = com([
      grupo('g', { offsetX: 16.5, offsetY: 0.25 }),
      pecas('a', { parentId: 'g', offsetX: -0.25, offsetY: -16.5 }),
      {
        id: 'o',
        kind: 'objects',
        name: 'Objetos',
        visible: true,
        offsetX: 0.2,
        offsetY: -0.2,
        objects: [],
      },
    ])
    const read = ler(raw)!
    // Até o leitor completo de schema 4 arredondava offsets; ele deve recusar esta extensão.
    expect(read.schema).toBe(5)
    expect(envelopeVersionFor([read])).toBe(5)
    expect(read.layers.map((l) => [l.offsetX, l.offsetY])).toEqual([
      [16.5, 0.25],
      [-0.25, -16.5],
      [0.2, -0.2],
    ])
    expect(effectiveLayer(read, read.layers[1]!)).toMatchObject({ offsetX: 16.25, offsetY: -16.25 })
    expect(pintaAssetFromWire(pintaAssetToWire(raw))).toEqual(read)
    expect(importPintaJson(galleryToPintaJson([raw])).assets).toEqual([read])
    const capped = ler(
      com([
        pecas('a', { offsetX: 1e20, offsetY: -1e20 }),
        pecas('b', { offsetX: Number.POSITIVE_INFINITY, offsetY: Number.NaN }),
      ]),
    )!
    expect(capped.layers[0]).toMatchObject({
      offsetX: PINTA_MAP_FORMAT_LIMITS.maxLayerOffset,
      offsetY: -PINTA_MAP_FORMAT_LIMITS.maxLayerOffset,
    })
    expect(capped.layers[1]?.offsetX).toBeUndefined()
    expect(capped.layers[1]?.offsetY).toBeUndefined()
  })

  it('guarda cadeado, opacidade, deslocamento, parallax, colisão e propriedades, e carimba o mapa', () => {
    const camada = pecas('a', {
      locked: true,
      opacity: 0.5,
      offsetX: 8,
      offsetY: -16,
      parallaxX: 0.5,
      parallaxY: 0.25,
      properties: { clima: 'chuva', nivel: 2, noite: true },
      collision: true,
    } as Partial<TilemapLayer>)
    const lido = ler(com([camada]))
    expect(lido?.schema).toBe(PINTA_MAP_SCHEMA)
    expect(lido?.layers[0]).toEqual(camada)
    // Ida e volta pelo wire e pelo arquivo.
    expect(
      pintaAssetFromWire(JSON.parse(JSON.stringify(pintaAssetToWire(lido as TilemapAsset)))),
    ).toEqual(lido)
    const json = galleryToPintaJson([lido as TilemapAsset])
    expect(json).toContain('"version": 3')
    expect(importPintaJson(json).assets[0]).toEqual(lido as TilemapAsset)
  })

  it('corta valores fora da faixa e descarta lixo', () => {
    const lido = ler(
      com([
        {
          ...pecas('a'),
          opacity: 7,
          offsetX: 1e9,
          parallaxX: -3,
          locked: 'sim',
          properties: { 'chave ruim': 1, ok: 'x' },
        },
        { ...pecas('b'), opacity: Number.NaN, offsetY: '4', parallaxY: 99 },
      ] as unknown as TilemapLayer[]),
    )
    expect(lido?.layers[0]).toMatchObject({
      offsetX: PINTA_MAP_FORMAT_LIMITS.maxLayerOffset,
      parallaxX: 0,
      properties: { ok: 'x' },
    })
    expect(lido?.layers[0]?.opacity).toBeUndefined()
    expect(lido?.layers[0]?.locked).toBeUndefined()
    expect(lido?.layers[1]).toMatchObject({ parallaxY: 4 })
    expect(lido?.layers[1]?.opacity).toBeUndefined()
    expect(lido?.layers[1]?.offsetY).toBeUndefined()
  })

  it('o carimbo sai quando o mapa deixa de precisar do formato', () => {
    const lido = ler({ ...mapa(), schema: PINTA_MAP_SCHEMA })
    expect(lido && 'schema' in lido).toBe(false)
  })

  it('formato mais novo que este código não é lido (nem pela metade)', () => {
    expect(ler({ ...mapa(), schema: PINTA_MAX_SCHEMA + 1 })).toBeNull()
    expect(ler({ ...mapa(), schema: 'tres' })).toBeNull()
  })
})

describe('grupos', () => {
  const arvore = () =>
    com([
      grupo('vila', { opacity: 0.5, offsetX: 10, locked: true } as Partial<TilemapLayer>),
      pecas('casas', { parentId: 'vila', opacity: 0.5, offsetX: 2 } as Partial<TilemapLayer>),
      grupo('quintal', {
        parentId: 'vila',
        visible: false,
        parallaxX: 0.5,
      } as Partial<TilemapLayer>),
      pecas('flores', { parentId: 'quintal', parallaxX: 0.5 } as Partial<TilemapLayer>),
      pecas('solta'),
    ])

  it('a árvore válida atravessa igual e pede o formato 3', () => {
    const m = arvore()
    const lido = ler(m)
    expect(lido).toEqual({ ...m, schema: PINTA_MAP_SCHEMA })
    expect(lido?.layers.filter(isGroupLayer).map((l) => l.id)).toEqual(['vila', 'quintal'])
    expect(lido?.layers.filter(isTileLayer).map((l) => l.id)).toEqual(['casas', 'flores', 'solta'])
  })

  it('o que vale de verdade soma os grupos em volta', () => {
    const m = arvore()
    const [, casas, , flores, solta] = m.layers as [
      TilemapLayer,
      TilemapLayer,
      TilemapLayer,
      TilemapLayer,
      TilemapLayer,
    ]
    expect(layerAncestors(m, flores).map((g) => g.id)).toEqual(['quintal', 'vila'])
    expect(effectiveLayer(m, casas)).toEqual({
      visible: true,
      locked: true,
      opacity: 0.25,
      offsetX: 12,
      offsetY: 0,
      parallaxX: 1,
      parallaxY: 1,
    })
    expect(effectiveLayer(m, flores)).toMatchObject({
      visible: false,
      locked: true,
      opacity: 0.5,
      offsetX: 10,
      parallaxX: 0.25,
    })
    expect(effectiveLayer(m, solta)).toMatchObject({
      visible: true,
      locked: false,
      opacity: 1,
      offsetX: 0,
    })
    expect(isLayerShown(m, casas)).toBe(true)
    expect(isLayerShown(m, flores)).toBe(false)
    expect(isLayerShown(m, solta)).toBe(true)
  })

  it('camada dentro de grupo escondido não entra no achatado nem é a peça do topo', () => {
    const m = com([
      pecas('chao', { cells: new Int16Array(8).fill(1) } as Partial<TilemapLayer>),
      grupo('g', { visible: false }),
      pecas('cima', { parentId: 'g', cells: new Int16Array(8).fill(5) } as Partial<TilemapLayer>),
    ])
    expect([...flattenLayers(m)]).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
    expect(topTileAt(m, 0, 0)?.tile).toBe(1)
    const visivel = com(m.layers.map((l) => (l.id === 'g' ? { ...l, visible: true } : l)))
    expect(flattenLayers(visivel)[0]).toBe(5)
  })

  it('pai que não existe, não é grupo, vem depois ou fecha um ciclo: a camada vai para a raiz, nunca some', () => {
    const lido = ler(
      com([
        pecas('a', { parentId: 'fantasma' } as Partial<TilemapLayer>),
        pecas('b', { parentId: 'a' } as Partial<TilemapLayer>),
        pecas('c', { parentId: 'depois' } as Partial<TilemapLayer>),
        grupo('depois'),
        grupo('x', { parentId: 'y' } as Partial<TilemapLayer>),
        grupo('y', { parentId: 'x' } as Partial<TilemapLayer>),
        pecas('d', { parentId: 'y' } as Partial<TilemapLayer>),
      ]),
    )
    expect(lido?.layers.map((l) => [l.id, l.parentId])).toEqual([
      ['a', undefined],
      ['b', undefined],
      ['c', undefined],
      ['depois', undefined],
      ['x', undefined],
      ['y', 'x'],
      ['d', 'y'],
    ])
  })

  it('grupo dentro de grupo só até a profundidade do formato', () => {
    const n = PINTA_MAP_FORMAT_LIMITS.maxGroupDepth
    const grupos = Array.from({ length: n + 3 }, (_, i) =>
      grupo(`g${i}`, (i > 0 ? { parentId: `g${i - 1}` } : {}) as Partial<TilemapLayer>),
    )
    const lido = ler(com([...grupos, pecas('p')]))
    const profundidade = (id: string): number => {
      const camada = lido?.layers.find((l) => l.id === id)
      return camada?.parentId ? 1 + profundidade(camada.parentId) : 0
    }
    expect(Math.max(...grupos.map((g) => profundidade(g.id)))).toBe(n)
    expect(lido?.layers).toHaveLength(grupos.length + 1)
  })

  it('mapa só com grupos e objetos é descartado, como sempre foi sem camada de peças', () => {
    expect(
      ler(com([grupo('g'), { kind: 'objects', id: 'o', name: 'o', visible: true, objects: [] }])),
    ).toBeNull()
  })
})

describe('peças viradas e conjuntos maiores', () => {
  it('a célula com bits de giro e a peça acima de 63 são lidas e pedem o formato 3', () => {
    const cells = Int16Array.from([
      makeCell(3, CELL_FLIP_H),
      makeCell(200),
      makeCell(63, CELL_FLIP_V | CELL_FLIP_H),
      -1,
      0,
      0,
      0,
      0,
    ])
    const lido = ler(com([pecas('a', { cells } as Partial<TilemapLayer>)]))
    const camada = lido?.layers[0]
    if (!camada || !isTileLayer(camada)) throw new Error('camada de peças esperada')
    expect([...camada.cells]).toEqual([...cells])
    expect(cellTile(camada.cells[0] ?? -1)).toBe(3)
    expect(cellFlags(camada.cells[0] ?? -1)).toBe(CELL_FLIP_H)
    expect(lido?.schema).toBe(PINTA_MAP_SCHEMA)
    expect(assetNeedsV3(lido as TilemapAsset)).toBe(true)
  })

  it('peça fora do teto do formato ou célula malformada derruba só a camada', () => {
    const boa = pecas('boa')
    for (const ruim of [PINTA_MAP_FORMAT_LIMITS.maxTiles, -2, 1.5, 40000]) {
      const cells = [ruim, 0, 0, 0, 0, 0, 0, 0]
      const lido = ler(com([boa, { ...pecas('ruim'), cells } as unknown as TilemapLayer]))
      expect(lido?.layers.map((l) => l.id)).toEqual(['boa'])
    }
  })
})

describe('mapas maiores', () => {
  it('até 32 camadas e 256 × 256 são lidos; acima do orçamento de células, não', () => {
    const muitas = Array.from({ length: 40 }, (_, i) => pecas(`c${i}`))
    expect(ler(com(muitas))?.layers).toHaveLength(PINTA_MAP_FORMAT_LIMITS.maxLayers)
    const grande = mapa(256, 256)
    expect(ler(grande)?.schema).toBe(PINTA_MAP_SCHEMA)
    expect(ler({ ...grande, cols: 257, layers: [pecas('a', {}, 257, 256)] })).toBeNull()
    // 256 × 256 × 32 camadas de peças = o orçamento exato; uma a mais passaria, mas o teto de
    // camadas corta antes. Com menos colunas e o mesmo produto, o orçamento é quem decide.
    const cheio = com(
      Array.from({ length: 32 }, (_, i) => pecas(`c${i}`, {}, 256, 256)),
      mapa(256, 256),
    )
    expect(256 * 256 * 32).toBe(PINTA_MAP_FORMAT_LIMITS.maxCells)
    expect(ler(cheio)?.layers).toHaveLength(32)
  })

  it('mapa grande viaja com as células compactadas; o pequeno, com a lista de sempre', () => {
    const grande = mapa(200, 150)
    const camada = grande.layers[0]
    if (!camada || !isTileLayer(camada)) throw new Error('camada de peças esperada')
    camada.cells[12345] = makeCell(7, CELL_FLIP_H)
    camada.cells[29999] = -1
    const wire = pintaAssetToWire(grande) as { layers: Array<Record<string, unknown>> }
    expect(wire.layers[0]?.cells).toBeUndefined()
    expect(typeof wire.layers[0]?.cellsPacked).toBe('string')
    const texto = JSON.stringify(wire)
    expect(texto.length).toBeLessThan(2000)
    const volta = pintaAssetFromWire(JSON.parse(texto)) as TilemapAsset
    expect(volta).toEqual({ ...grande, schema: PINTA_MAP_SCHEMA })
    const json = galleryToPintaJson([volta])
    expect(json).toContain('"version": 3')
    expect(importPintaJson(json).assets[0]).toEqual(volta)
  })
})

describe('compactar células', () => {
  it('ida e volta: vazio, uniforme, alternado, com giro e corrida maior que 65535', () => {
    const casos = [
      new Int16Array(1).fill(-1),
      new Int16Array(70000).fill(4),
      Int16Array.from({ length: 999 }, (_, i) => (i % 2 ? -1 : i % 64)),
      Int16Array.from([makeCell(255, CELL_FLIP_H | CELL_FLIP_V), -1, -1, makeCell(0, CELL_FLIP_V)]),
    ]
    for (const cells of casos) {
      const volta = unpackCells(packCells(cells), cells.length, PINTA_MAP_FORMAT_LIMITS.maxTiles)
      expect(volta && [...volta]).toEqual([...cells])
    }
    expect(packCells(new Int16Array(65536).fill(1)).length).toBeLessThan(20)
  })

  it('recusa sem lançar: base64 inválido, contagem errada, peça fora do teto, corrida vazia, texto grande demais', () => {
    const bom = packCells(Int16Array.from([1, 1, 2]))
    expect(unpackCells('***', 3, 256)).toBeNull()
    expect(unpackCells('', 3, 256)).toBeNull()
    expect(unpackCells(bom, 4, 256)).toBeNull()
    expect(unpackCells(bom, 2, 256)).toBeNull()
    expect(unpackCells(bom, 3, 2)).toBeNull()
    expect(unpackCells(btoa('\x01\x00\x00\x00'), 1, 256)).toBeNull()
    expect(unpackCells(btoa('abc'), 1, 256)).toBeNull()
    expect(unpackCells('A'.repeat(5000), 3, 256)).toBeNull()
    expect(unpackCells(bom, 3, 256)).not.toBeNull()
  })
})

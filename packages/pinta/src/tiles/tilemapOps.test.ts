import { describe, expect, it } from 'bun:test'
import { createTilemapAsset, PINTA_LIMITS, sanitizePintaAsset } from '../core/project'
import {
  addLayer,
  cellAt,
  flattenBackground,
  flattenFront,
  flattenLayers,
  floodFillCells,
  growTilemap,
  hasFrontLayer,
  removeLayer,
  setCell,
  setCells,
  toggleLayerFront,
  toggleLayerVisible,
} from './tilemapOps'

function makeMap(cols = 3, rows = 2) {
  const tilemap = createTilemapAsset({ name: 'fase', tilesetId: 't1', cols, rows })
  const layerId = tilemap.layers[0]?.id
  if (!layerId) throw new Error('camada esperada')
  return { tilemap, layerId }
}

describe('setCell / cellAt', () => {
  it('carimba e lê; fora dos limites é no-op', () => {
    const { tilemap, layerId } = makeMap()
    const out = setCell(tilemap, layerId, 1, 1, 4)
    expect(cellAt(out, layerId, 1, 1)).toBe(4)
    expect(setCell(out, layerId, 9, 0, 1)).toBe(out)
    expect(setCell(out, layerId, 1, 1, 4)).toBe(out) // mesmo valor = mesma ref
  })
})

describe('floodFillCells', () => {
  it('preenche a região contígua (conectividade-4)', () => {
    const { tilemap, layerId } = makeMap(3, 1)
    // [., 5, .] → fill(0,0, 7) só pinta a célula 0 (o 5 bloqueia).
    const blocked = setCell(tilemap, layerId, 1, 0, 5)
    const out = floodFillCells(blocked, layerId, 0, 0, 7)
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([7, 5, -1])
  })

  it('mapa vazio inteiro é preenchido', () => {
    const { tilemap, layerId } = makeMap(2, 2)
    const out = floodFillCells(tilemap, layerId, 0, 0, 3)
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([3, 3, 3, 3])
  })
})

describe('setCells (lote)', () => {
  it('carimba várias células com um índice; mesmo conteúdo = mesma ref', () => {
    const { tilemap, layerId } = makeMap(3, 1)
    const out = setCells(
      tilemap,
      layerId,
      [
        { col: 0, row: 0 },
        { col: 2, row: 0 },
        { col: 9, row: 0 }, // fora da grade: ignorado
      ],
      4,
    )
    expect([...(out.layers[0]?.cells ?? [])]).toEqual([4, -1, 4])
    expect(setCells(out, layerId, [{ col: 0, row: 0 }], 4)).toBe(out)
  })
})

describe('growTilemap', () => {
  it('cresce um lado preservando o conteúdo com o offset certo', () => {
    const { tilemap, layerId } = makeMap(2, 2)
    const painted = setCells(tilemap, layerId, [{ col: 0, row: 0 }], 5)

    const right = growTilemap(painted, 'right')
    expect(right.cols).toBe(3)
    expect(right.rows).toBe(2)
    expect([...(right.layers[0]?.cells ?? [])]).toEqual([5, -1, -1, -1, -1, -1])

    const left = growTilemap(painted, 'left')
    expect(left.cols).toBe(3)
    // o 5 (que estava em 0,0) desloca +1 coluna → índice 1
    expect([...(left.layers[0]?.cells ?? [])]).toEqual([-1, 5, -1, -1, -1, -1])

    const top = growTilemap(painted, 'top')
    expect(top.rows).toBe(3)
    // o 5 desloca +1 linha → índice cols(2)*1 + 0 = 2
    expect([...(top.layers[0]?.cells ?? [])]).toEqual([-1, -1, 5, -1, -1, -1])

    const bottom = growTilemap(painted, 'bottom')
    expect(bottom.rows).toBe(3)
    expect([...(bottom.layers[0]?.cells ?? [])]).toEqual([5, -1, -1, -1, -1, -1])
  })

  it('cresce TODAS as camadas', () => {
    const { tilemap, layerId } = makeMap(1, 1)
    let out = addLayer(tilemap, 'topo')
    out = growTilemap(out, 'right')
    expect(out.layers).toHaveLength(2)
    for (const l of out.layers) expect(l.cells.length).toBe(2)
    expect(out.tilesetId).toBe(tilemap.tilesetId)
    expect(layerId).toBeDefined()
  })

  it('no teto devolve a mesma ref', () => {
    const tilemap = createTilemapAsset({
      name: 'grande',
      tilesetId: 't1',
      cols: PINTA_LIMITS.maxTilemapCols,
      rows: 2,
    })
    expect(growTilemap(tilemap, 'right')).toBe(tilemap)
    expect(growTilemap(tilemap, 'bottom').rows).toBe(3) // vertical ainda pode
  })

  it('mapa 128×128 (novo teto) sobrevive ao sanitize', () => {
    const tilemap = createTilemapAsset({ name: 'enorme', tilesetId: 't1', cols: 128, rows: 128 })
    expect(tilemap.cols).toBe(128)
    expect(tilemap.rows).toBe(128)
    // O Int16Array vai DIRETO ao IndexedDB (structured clone), não por JSON —
    // o sanitize aceita o asset com os cells reais.
    expect(sanitizePintaAsset(tilemap)).not.toBeNull()
  })
})

describe('camada da frente (F4)', () => {
  it('flattenBackground/flattenFront separam pelas camadas marcadas; hasFrontLayer', () => {
    const { tilemap, layerId } = makeMap(2, 1)
    let out = setCell(tilemap, layerId, 0, 0, 1) // camada de fundo: célula 0 = tile 1
    out = addLayer(out, 'copa')
    const front = out.layers[1]
    if (!front) throw new Error('camada esperada')
    out = setCell(out, front.id, 1, 0, 5) // camada da frente (ainda não marcada): célula 1
    out = toggleLayerFront(out, front.id) // marca como frente

    expect(hasFrontLayer(out)).toBe(true)
    expect([...flattenBackground(out)]).toEqual([1, -1]) // só o fundo
    expect([...flattenFront(out)]).toEqual([-1, 5]) // só a frente
    // flatten sem filtro = tudo (o editor vê o mapa inteiro)
    expect([...flattenLayers(out)]).toEqual([1, 5])
  })

  it('toggleLayerFront alterna e sanitize preserva o flag', () => {
    const { tilemap, layerId } = makeMap(1, 1)
    const marked = toggleLayerFront(tilemap, layerId)
    expect(marked.layers[0]?.front).toBe(true)
    expect(sanitizePintaAsset(marked)?.kind).toBe('tilemap')
    const round = sanitizePintaAsset(marked)
    if (round?.kind === 'tilemap') expect(round.layers[0]?.front).toBe(true)
    // sem frente visível/não-vazia → hasFrontLayer falso
    expect(hasFrontLayer(toggleLayerFront(marked, layerId))).toBe(false)
  })
})

describe('camadas', () => {
  it('addLayer respeita a quota; removeLayer nunca deixa zero', () => {
    const { tilemap } = makeMap()
    let out = tilemap
    for (let i = 0; i < PINTA_LIMITS.maxTilemapLayers + 2; i += 1) {
      out = addLayer(out, `c${i}`)
    }
    expect(out.layers).toHaveLength(PINTA_LIMITS.maxTilemapLayers)

    let shrunk = out
    for (const layer of out.layers) shrunk = removeLayer(shrunk, layer.id)
    expect(shrunk.layers).toHaveLength(1)
  })

  it('remove só uma camada mesmo se receber ids duplicados de uma entrada não saneada', () => {
    const { tilemap } = makeMap(1, 1)
    const first = tilemap.layers[0]
    if (!first) throw new Error('camada esperada')
    const duplicated = { ...tilemap, layers: [first, { ...first, name: 'Topo' }] }
    const out = removeLayer(duplicated, first.id)
    expect(out.layers).toHaveLength(1)
    expect(out.layers[0]?.name).toBe('Topo')
  })

  it('flattenLayers: a camada de CIMA vence; invisível não conta', () => {
    const { tilemap, layerId } = makeMap(2, 1)
    let out = setCell(tilemap, layerId, 0, 0, 1)
    out = setCell(out, layerId, 1, 0, 2)
    out = addLayer(out, 'topo')
    const top = out.layers[1]
    if (!top) throw new Error('camada esperada')
    out = setCell(out, top.id, 0, 0, 9)

    expect([...flattenLayers(out)]).toEqual([9, 2])
    const hidden = toggleLayerVisible(out, top.id)
    expect([...flattenLayers(hidden)]).toEqual([1, 2])
  })
})

import { beforeEach, describe, expect, it } from 'bun:test'
import type { Project } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { MAX_UNIQUE_TILES, packedSheetCols, sliceTiles } from './tileSlicer'

/**
 * Fatiador de upload → mapa de tiles: núcleo PURO (dedup pixel a pixel, célula
 * transparente = vazio, teto de peças únicas, sobra cortada) + a ação
 * `updateAssetMeta` do projectStore (grava `tileset`/`tilemap` saneados num
 * asset existente). A casca com canvas é QA de browser (happy-dom não rasteriza).
 */

/** Monta um ImageData-like de tiles 1×1 px (RGBA) a partir de uma grade de cores. */
function pixels(grid: number[][][]): { data: Uint8ClampedArray; width: number; height: number } {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = grid[y]?.[x] ?? [0, 0, 0, 0]
      const at = (y * width + x) * 4
      data[at] = px[0] ?? 0
      data[at + 1] = px[1] ?? 0
      data[at + 2] = px[2] ?? 0
      data[at + 3] = px[3] ?? 0
    }
  }
  return { data, width, height }
}

const RED: number[] = [255, 0, 0, 255]
const BLUE: number[] = [0, 0, 255, 255]
const EMPTY: number[] = [0, 0, 0, 0]

describe('sliceTiles (puro)', () => {
  it('deduplica células idênticas e marca transparente como vazio (-1)', () => {
    // 4×2 px, tile 1px: [R B R vazio; B B R R] → únicas [R, B]
    const input = pixels([
      [RED, BLUE, RED, EMPTY],
      [BLUE, BLUE, RED, RED],
    ])
    const out = sliceTiles(input, 1)
    expect(out.cols).toBe(4)
    expect(out.rows).toBe(2)
    expect(out.uniqueTiles.length).toBe(2)
    expect(out.cells).toEqual([
      [0, 1, 0, -1],
      [1, 1, 0, 0],
    ])
    expect(out.tooMany).toBe(false)
  })

  it('sobra que não divide pelo tile é cortada (floor, igual ao runtime)', () => {
    const input = pixels([
      [RED, RED, BLUE],
      [RED, RED, BLUE],
      [BLUE, BLUE, BLUE],
    ])
    const out = sliceTiles(input, 2)
    expect(out.cols).toBe(1)
    expect(out.rows).toBe(1)
    expect(out.uniqueTiles.length).toBe(1)
  })

  it('estoura o teto de peças únicas com tooMany (imagem que não é de blocos)', () => {
    // 1 linha com MAX+2 pixels, todos de cores diferentes (tile 1px)
    const row: number[][] = []
    for (let i = 0; i < MAX_UNIQUE_TILES + 2; i += 1) row.push([i % 256, 10, 20, 255])
    const out = sliceTiles(pixels([row]), 1)
    expect(out.tooMany).toBe(true)
    expect(out.uniqueTiles.length).toBe(MAX_UNIQUE_TILES)
  })

  it('packedSheetCols espelha o empacotamento do Pinta (min(count, 8))', () => {
    expect(packedSheetCols(3)).toBe(3)
    expect(packedSheetCols(20)).toBe(8)
    expect(packedSheetCols(0)).toBe(1)
  })
})

const PNG = 'data:image/png;base64,AAAA'

function makeProject(): Project {
  return {
    id: 'p1',
    name: 'Proj',
    createdAt: 0,
    updatedAt: 0,
    mode: 'blocks',
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    extraFiles: [],
    ir: null,
    blocksState: null,
    installedExtensions: [],
    assets: [
      {
        id: 'a1',
        name: 'pecas',
        kind: 'image',
        dataUrl: PNG,
        width: 32,
        height: 16,
        source: 'upload',
      },
    ],
  }
}

describe('projectStore.updateAssetMeta', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: makeProject(), isDirty: false, saveError: null })
  })

  it('grava tileset saneado no asset (o caminho "Usar como peças")', () => {
    const err = useProjectStore
      .getState()
      .updateAssetMeta('a1', { tileset: { tileSize: 16, solid: [1, 1, 0] } })
    expect(err).toBeNull()
    const asset = useProjectStore.getState().project?.assets?.[0]
    expect(asset?.tileset).toEqual({ tileSize: 16, solid: [0, 1] })
    expect(useProjectStore.getState().isDirty).toBe(true)
  })

  it('grava tilemap saneado (o caminho "fatiar imagem")', () => {
    const err = useProjectStore.getState().updateAssetMeta('a1', {
      tilemap: {
        tileSize: 16,
        cols: 2,
        rows: 1,
        grid: '0 1',
        solid: [1],
        tileset: { dataUrl: PNG, width: 32, height: 16 },
      },
    })
    expect(err).toBeNull()
    expect(useProjectStore.getState().project?.assets?.[0]?.tilemap?.grid).toBe('0 1')
  })

  it('metadado inválido = erro amigável e asset intocado', () => {
    const err = useProjectStore
      .getState()
      .updateAssetMeta('a1', { tileset: { tileSize: 0, solid: [] } })
    expect(err).toBeTruthy()
    expect(useProjectStore.getState().project?.assets?.[0]?.tileset).toBeUndefined()
    expect(
      useProjectStore.getState().updateAssetMeta('nao-existe', { tileset: { tileSize: 8 } }),
    ).toBeTruthy()
  })
})

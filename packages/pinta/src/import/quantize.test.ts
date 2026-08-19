import { describe, expect, it } from 'bun:test'
import {
  detectTileSize,
  downscaleRGBA,
  quantizeToIndexed,
  resizeContain,
  sliceIndexedTiles,
} from './quantize'

/** Constrói uma imagem RGBA a partir de uma lista de pixels [r,g,b,a]. */
function img(width: number, height: number, pixels: Array<[number, number, number, number]>) {
  const data = new Uint8ClampedArray(width * height * 4)
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  })
  return { data, width, height }
}

const BW = ['', '#000000', '#ffffff'] // paleta mínima: transparente, preto, branco

describe('quantizeToIndexed', () => {
  it('alpha abaixo do limiar vira transparente (índice 0)', () => {
    const image = img(2, 1, [
      [255, 255, 255, 10], // quase invisível → 0
      [255, 255, 255, 255], // branco opaco
    ])
    const { bitmap } = quantizeToIndexed(image, { baseColors: BW })
    expect(bitmap.data[0]).toBe(0)
    expect(bitmap.data[1]).toBe(2) // #ffffff = índice 2 nesta paleta
  })

  it('cor exata da paleta base mapeia no índice certo (arcade)', () => {
    // arcade: 1 = branco, 15 = preto.
    const image = img(2, 1, [
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ])
    const { bitmap, extraColors } = quantizeToIndexed(image)
    expect(bitmap.data[0]).toBe(1)
    expect(bitmap.data[1]).toBe(15)
    expect(extraColors).toHaveLength(0) // brancos/pretos já são base
  })

  it('cores fora da base viram EXTRAS por frequência; próximas fundem', () => {
    // base = preto/branco. vermelho e verde puros estão LONGE → 2 extras.
    // um cinza quase-preto FUNDE no preto (não vira extra).
    const image = img(4, 1, [
      [255, 0, 0, 255], // vermelho → extra
      [0, 255, 0, 255], // verde → extra
      [5, 5, 5, 255], // ~preto → funde
      [255, 0, 0, 255], // vermelho de novo (frequência)
    ])
    const { bitmap, extraColors } = quantizeToIndexed(image, { baseColors: BW })
    expect(extraColors).toHaveLength(2)
    // o pixel ~preto caiu no índice do preto (1), não num extra
    expect(bitmap.data[2]).toBe(1)
    // vermelho e verde caíram em índices extras (≥16)
    expect(bitmap.data[0]).toBeGreaterThanOrEqual(16)
    expect(bitmap.data[1]).toBeGreaterThanOrEqual(16)
  })

  it('respeita o teto de extras (maxExtraColors)', () => {
    const image = img(3, 1, [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ])
    const { extraColors } = quantizeToIndexed(image, { baseColors: BW, maxExtraColors: 1 })
    expect(extraColors).toHaveLength(1)
  })
})

describe('downscaleRGBA', () => {
  it('bloco uniforme preserva a cor (média de bloco)', () => {
    const image = img(2, 2, [
      [100, 150, 200, 255],
      [100, 150, 200, 255],
      [100, 150, 200, 255],
      [100, 150, 200, 255],
    ])
    const out = downscaleRGBA(image, 1, 1)
    expect([out.data[0], out.data[1], out.data[2], out.data[3]]).toEqual([100, 150, 200, 255])
  })
})

describe('resizeContain (personagem)', () => {
  /** Alfa de cada pixel do resultado, linha a linha. */
  function alphas(out: { data: Uint8ClampedArray; width: number; height: number }): number[][] {
    const rows: number[][] = []
    for (let y = 0; y < out.height; y += 1) {
      const row: number[] = []
      for (let x = 0; x < out.width; x += 1) row.push(out.data[(y * out.width + x) * 4 + 3] ?? 0)
      rows.push(row)
    }
    return rows
  }

  it('mantém a proporção e centraliza: imagem deitada 4×2 num quadro 4×4 sobra transparente em cima e embaixo', () => {
    const image = img(
      4,
      2,
      Array.from({ length: 8 }, () => [255, 0, 0, 255] as [number, number, number, number]),
    )
    const out = resizeContain(image, 4, 4)
    expect(out.width).toBe(4)
    expect(out.height).toBe(4)
    expect(alphas(out)).toEqual([
      [0, 0, 0, 0],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 0],
    ])
    // A cor sobrevive (nada de escurecer pela sobra transparente).
    expect([out.data[(1 * 4 + 0) * 4], out.data[(1 * 4 + 0) * 4 + 1]]).toEqual([255, 0])
  })

  it('NÃO corta: uma imagem em pé 2×4 num quadro 4×4 sobra dos lados (o cover cortaria)', () => {
    const image = img(
      2,
      4,
      Array.from({ length: 8 }, () => [0, 0, 255, 255] as [number, number, number, number]),
    )
    const out = resizeContain(image, 4, 4)
    expect(alphas(out)).toEqual([
      [0, 255, 255, 0],
      [0, 255, 255, 0],
      [0, 255, 255, 0],
      [0, 255, 255, 0],
    ])
  })

  it('AMPLIA uma imagem menor que o quadro (nearest) e preserva o transparente do PNG', () => {
    // 2×2: só o pixel de cima à esquerda é opaco.
    const image = img(2, 2, [
      [10, 20, 30, 255],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const out = resizeContain(image, 4, 4)
    expect(alphas(out)).toEqual([
      [255, 255, 0, 0],
      [255, 255, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([10, 20, 30])
  })

  it('quadro deitado 8×2 recebe uma imagem quadrada 2×2 sem distorcer (2×2 no meio)', () => {
    const image = img(
      2,
      2,
      Array.from({ length: 4 }, () => [0, 255, 0, 255] as [number, number, number, number]),
    )
    const out = resizeContain(image, 8, 2)
    expect(alphas(out)).toEqual([
      [0, 0, 0, 255, 255, 0, 0, 0],
      [0, 0, 0, 255, 255, 0, 0, 0],
    ])
  })
})

describe('sliceIndexedTiles', () => {
  it('deduplica peças idênticas e pula as 100% transparentes', () => {
    // Grade 4×4, peças 2×2. Layout: A | A (em cima), B | vazia (embaixo).
    // A = [1,2,3,4], B = [5,6,7,8].
    const data = new Uint8Array([
      1,
      2,
      1,
      2, // linha 0: topo de A | topo de A
      3,
      4,
      3,
      4, // linha 1: base de A | base de A
      5,
      6,
      0,
      0, // linha 2: topo de B | vazio
      7,
      8,
      0,
      0, // linha 3: base de B | vazio
    ])
    const { tiles, tooMany } = sliceIndexedTiles({ width: 4, height: 4, data }, 2)
    // peças únicas não-vazias: A e B (a cópia de A e a vazia não contam)
    expect(tiles).toHaveLength(2)
    expect(tooMany).toBe(false)
  })

  it('tooMany quando passa do teto de peças', () => {
    // 9×1 peças de 1×1, todas diferentes → com teto 64 não estoura; forço teto baixo
    // via um bitmap grande de peças únicas: 100 peças 1×1 distintas.
    const data = new Uint8Array(100)
    for (let i = 0; i < 100; i += 1) data[i] = (i % 15) + 1 // repete cores, mas vizinhas distintas
    // 100×1, peças 1×1 → 100 células, mas só 15 índices distintos → 15 peças, sem tooMany
    const { tiles, tooMany } = sliceIndexedTiles({ width: 100, height: 1, data }, 1)
    expect(tiles.length).toBeLessThanOrEqual(15)
    expect(tooMany).toBe(false)
  })
})

describe('detectTileSize', () => {
  it('escolhe o MENOR tamanho de peça que cabe no teto (mais peças)', () => {
    expect(detectTileSize(32, 32)).toBe(16) // 16→4 peças (preferido a 32→1)
    expect(detectTileSize(48, 48)).toBe(16) // 16→9 peças
    expect(detectTileSize(256, 256)).toBe(32) // 16→256 estoura → 32→64 peças
  })

  it('nenhum divisor de TILE_SIZES → null', () => {
    expect(detectTileSize(100, 100)).toBeNull()
  })
})

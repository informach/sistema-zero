import { describe, expect, it } from 'bun:test'
import { quantizeFrames } from './quantize'

/** RGBA a partir de uma lista de `[r,g,b,a]` (a = 255 quando omitido). */
function rgba(pixels: Array<[number, number, number] | [number, number, number, number]>) {
  const out = new Uint8ClampedArray(pixels.length * 4)
  pixels.forEach(([r, g, b, a], i) => {
    out[i * 4] = r
    out[i * 4 + 1] = g
    out[i * 4 + 2] = b
    out[i * 4 + 3] = a ?? 255
  })
  return out
}

const RED: [number, number, number] = [255, 0, 0]
const GREEN: [number, number, number] = [0, 255, 0]
const BLUE: [number, number, number] = [0, 0, 255]

describe('quantizeFrames — o caminho SEM perda', () => {
  it('poucas cores viram a paleta EXATA (desenho de formas chapadas)', () => {
    const result = quantizeFrames([rgba([RED, GREEN, BLUE, RED])], 256)
    expect(result.approximated).toBe(false)
    // Posição 0 é o slot transparente; as cores vêm depois, sem nenhuma média.
    expect(result.palette.slice(1)).toEqual([RED, GREEN, BLUE])
    const indices = Array.from(result.frames[0] ?? [])
    expect(indices).toEqual([1, 2, 3, 1])
  })

  it('a paleta é ÚNICA para todos os quadros (o GIF usa tabela global)', () => {
    const result = quantizeFrames([rgba([RED, RED]), rgba([GREEN, BLUE])], 256)
    expect(result.palette).toHaveLength(4)
    expect(Array.from(result.frames[0] ?? [])).toEqual([1, 1])
    expect(Array.from(result.frames[1] ?? [])).toEqual([2, 3])
  })

  it('pixel apagado vira o índice 0, e a cor dele nem entra na paleta', () => {
    const result = quantizeFrames([rgba([[9, 9, 9, 0], RED])], 256)
    expect(Array.from(result.frames[0] ?? [])).toEqual([0, 1])
    expect(result.palette).toHaveLength(2)
    expect(result.palette[1]).toEqual(RED)
  })

  it('o alfa é decidido no limiar — o GIF não tem meio-transparente', () => {
    const result = quantizeFrames(
      [
        rgba([
          [10, 20, 30, 127],
          [10, 20, 30, 128],
        ]),
      ],
      256,
    )
    expect(Array.from(result.frames[0] ?? [])).toEqual([0, 1])
  })

  it('desenho inteiramente apagado ainda sai com o slot transparente na tabela', () => {
    const result = quantizeFrames(
      [
        rgba([
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
      ],
      256,
    )
    expect(result.palette).toHaveLength(1)
    expect(Array.from(result.frames[0] ?? [])).toEqual([0, 0])
  })
})

describe('quantizeFrames — quando NÃO cabe', () => {
  it('cabe no teto pedido e marca que aproximou', () => {
    // 300 cinzas distintos num teto de 16 cores.
    const pixels = Array.from(
      { length: 300 },
      (_, i) => [i % 256, i % 256, i % 256] as [number, number, number],
    )
    const result = quantizeFrames([rgba(pixels)], 16)
    expect(result.approximated).toBe(true)
    expect(result.palette.length).toBeLessThanOrEqual(16)
    // Todo pixel opaco aponta para alguma cor de verdade da tabela.
    for (const index of result.frames[0] ?? []) {
      expect(index).toBeGreaterThan(0)
      expect(index).toBeLessThan(result.palette.length)
    }
  })

  it('a cor que MAIS aparece sai quase intacta (o traço chapado não vira lama)', () => {
    // Um vermelho dominante + um degradê de fundo que precisa ser resumido.
    const pixels: Array<[number, number, number]> = []
    for (let i = 0; i < 500; i += 1) pixels.push([200, 10, 10])
    for (let i = 0; i < 500; i += 1) pixels.push([i % 250, 250 - (i % 250), 120])
    const result = quantizeFrames([rgba(pixels)], 8)
    expect(result.approximated).toBe(true)
    const dominant = result.palette[result.frames[0]?.[0] ?? 0] as [number, number, number]
    expect(Math.abs(dominant[0] - 200)).toBeLessThanOrEqual(6)
    expect(Math.abs(dominant[1] - 10)).toBeLessThanOrEqual(6)
    expect(Math.abs(dominant[2] - 10)).toBeLessThanOrEqual(6)
  })

  it('nunca passa das 256 cores do formato, nem pedindo mais', () => {
    const pixels = Array.from(
      { length: 5000 },
      (_, i) => [(i * 7) % 256, (i * 13) % 256, (i * 29) % 256] as [number, number, number],
    )
    const result = quantizeFrames([rgba(pixels)], 999)
    expect(result.palette.length).toBeLessThanOrEqual(256)
  })
})

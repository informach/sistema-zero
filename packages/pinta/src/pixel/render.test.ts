import { describe, expect, it } from 'bun:test'
import type { PintaBitmap } from '../core/project'
import { mirrorGuideSegments, thumbTargetSize } from './render'

const bitmap = (width: number, height: number): PintaBitmap => ({
  width,
  height,
  data: new Uint8Array(width * height),
})

describe('mirrorGuideSegments', () => {
  it('não cria guia com os dois espelhos desligados', () => {
    expect(mirrorGuideSegments(bitmap(8, 6), 10, false, false)).toEqual([])
  })

  it('centraliza a guia vertical quando o espelho lado a lado está ligado', () => {
    expect(mirrorGuideSegments(bitmap(8, 6), 10, true, false)).toEqual([
      { x1: 40, y1: 0, x2: 40, y2: 60 },
    ])
  })

  it('centraliza a guia horizontal quando o espelho de cima e de baixo está ligado', () => {
    expect(mirrorGuideSegments(bitmap(8, 6), 10, false, true)).toEqual([
      { x1: 0, y1: 30, x2: 80, y2: 30 },
    ])
  })

  it('cria as duas guias e preserva o centro exato em dimensões ímpares', () => {
    expect(mirrorGuideSegments(bitmap(5, 3), 6, true, true)).toEqual([
      { x1: 15, y1: 0, x2: 15, y2: 18 },
      { x1: 0, y1: 9, x2: 30, y2: 9 },
    ])
  })
})

describe('thumbTargetSize (miniatura reduzida da galeria)', () => {
  it('cabe no teto → 1:1 (sprites pequenos continuam nítidos); acima → reduz proporcionalmente', () => {
    expect(thumbTargetSize(32, 32, 192)).toEqual({ width: 32, height: 32, scale: 1 })
    expect(thumbTargetSize(192, 96, 192)).toEqual({ width: 192, height: 96, scale: 1 })
    expect(thumbTargetSize(512, 512, 192)).toEqual({ width: 192, height: 192, scale: 0.375 })
    const wide = thumbTargetSize(480, 360, 192)
    expect(wide.width).toBe(192)
    expect(wide.height).toBe(144)
    // Nunca zera uma dimensão (faixa muito fina).
    expect(thumbTargetSize(512, 1, 192).height).toBe(1)
    expect(thumbTargetSize(0, 0, 192)).toEqual({ width: 0, height: 0, scale: 1 })
  })
})

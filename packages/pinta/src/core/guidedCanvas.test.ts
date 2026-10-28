import { describe, expect, it } from 'bun:test'
import {
  createGuidedBackgroundAsset,
  findInitialCanvasAsset,
  GUIDE_INDEX,
  GUIDED_LAYER_NAMES,
  guideBitmap,
  isValidInitialCanvas,
  MARKED_INDEX,
} from './guidedCanvas'
import { TRANSPARENT_INDEX } from './palette'
import { createPixelBackgroundAsset, sanitizePintaAsset } from './project'
import type { PintaInitialCanvas } from './types'

// Uma frente 4x6 com um lado 3x6 à esquerda, encostados (a divisa é a coluna 3).
const canvas: PintaInitialCanvas = {
  name: 'molde-geladeira',
  width: 7,
  height: 6,
  guide: [
    { x: 0, y: 0, width: 3, height: 6 },
    { x: 3, y: 0, width: 4, height: 6, marked: true },
  ],
}
const pixel = (data: Uint8Array, x: number, y: number) => data[y * canvas.width + x]

describe('tela com molde', () => {
  it('o contorno de cada face; a marcada em rosa, vencendo na divisa', () => {
    const { data } = guideBitmap(canvas)
    expect(pixel(data, 0, 0)).toBe(GUIDE_INDEX)
    expect(pixel(data, 1, 5)).toBe(GUIDE_INDEX)
    expect(pixel(data, 3, 2)).toBe(MARKED_INDEX)
    expect(pixel(data, 6, 0)).toBe(MARKED_INDEX)
    // Dentro das faces fica vazio para pintar.
    expect(pixel(data, 1, 2)).toBe(TRANSPARENT_INDEX)
    expect(pixel(data, 4, 3)).toBe(TRANSPARENT_INDEX)
  })

  it('duas camadas: o molde embaixo, trancado, e a pintura em cima, vazia', () => {
    const asset = createGuidedBackgroundAsset(canvas, 1)
    expect(asset.kind).toBe('pixel-background')
    expect(asset.layers.map((l) => [l.name, l.locked === true])).toEqual([
      [GUIDED_LAYER_NAMES.guide, true],
      [GUIDED_LAYER_NAMES.paint, false],
    ])
    expect(asset.cels.map((c) => [c.width, c.height])).toEqual([
      [7, 6],
      [7, 6],
    ])
    expect(asset.cels[1]?.data.every((v) => v === TRANSPARENT_INDEX)).toBe(true)
    // Atravessa o sanitize do disco (structured clone, como o IndexedDB) sem perder nada.
    expect(sanitizePintaAsset(structuredClone(asset))).toEqual(asset)
  })

  it('reabre o desenho de mesmo nome e tamanho; outro tamanho é outro desenho', () => {
    const feito = createGuidedBackgroundAsset(canvas)
    const outro = createPixelBackgroundAsset({ name: 'molde-geladeira', width: 8, height: 6 })
    expect(findInitialCanvasAsset([outro, feito], canvas)?.id).toBe(feito.id)
    expect(findInitialCanvasAsset([outro], canvas)).toBeNull()
    // O nome puro era de outro desenho: o do molde ficou com sufixo e continua sendo achado.
    const comSufixo = { ...feito, name: 'molde-geladeira-2' }
    expect(findInitialCanvasAsset([outro, comSufixo], canvas)?.id).toBe(feito.id)
    expect(findInitialCanvasAsset([{ ...feito, name: 'molde-geladeira-x' }], canvas)).toBeNull()
  })

  it('recusa tela fora dos limites ou face fora da tela', () => {
    expect(isValidInitialCanvas(canvas)).toBe(true)
    expect(isValidInitialCanvas({ ...canvas, width: 0 })).toBe(false)
    expect(isValidInitialCanvas({ ...canvas, width: 513 })).toBe(false)
    expect(isValidInitialCanvas({ ...canvas, guide: [{ x: 5, y: 0, width: 4, height: 6 }] })).toBe(
      false,
    )
  })
})

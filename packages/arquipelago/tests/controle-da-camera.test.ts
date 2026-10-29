import { describe, expect, test } from 'bun:test'
import { CONTROLE_DA_CAMERA as C } from '../src/mundo/medidas'
import { giroMaisCurto, rodaEmPixels, zoomDaPinca } from '../src/sistemas/camera'

describe('controle da câmera', () => {
  test('pinça: abrir os dedos aproxima, fechar afasta, sempre dentro dos limites', () => {
    expect(zoomDaPinca(10, 100, 200, C.distanciaMinima, C.distanciaMaxima)).toBe(5)
    expect(zoomDaPinca(10, 200, 100, C.distanciaMinima, C.distanciaMaxima)).toBe(C.distanciaMaxima)
    expect(zoomDaPinca(10, 100, 1000, C.distanciaMinima, C.distanciaMaxima)).toBe(C.distanciaMinima)
    expect(zoomDaPinca(10, 100, 0, C.distanciaMinima, C.distanciaMaxima)).toBe(10)
  })

  test('a volta para as costas gira pelo lado mais curto', () => {
    expect(giroMaisCurto(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(giroMaisCurto(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(-0.2)
    expect(Math.abs(giroMaisCurto(0, 3 * Math.PI))).toBeCloseTo(Math.PI)
  })

  test('roda em linhas ou páginas vira pixels', () => {
    expect(rodaEmPixels(100, 0)).toBe(100)
    expect(rodaEmPixels(3, 1)).toBe(48)
    expect(rodaEmPixels(1, 2)).toBe(400)
  })

  test('os limites fazem sentido (rente ao chão até quase de cima; perto até longe)', () => {
    expect(C.inclinacaoMinima).toBeGreaterThan(0)
    expect(C.inclinacaoMaxima).toBeLessThan(Math.PI / 2)
    expect(C.inclinacaoDeVolta).toBeGreaterThan(C.inclinacaoMinima)
    expect(C.inclinacaoDeVolta).toBeLessThan(C.inclinacaoMaxima)
    expect(C.distanciaMinima).toBeLessThan(C.distanciaMaxima)
  })
})

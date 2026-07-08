import { describe, expect, it } from 'bun:test'
import { animationDurationMs, frameIndexAt } from './player'

describe('frameIndexAt (relógio puro da prévia)', () => {
  it('8 fps = um quadro a cada 125ms', () => {
    expect(frameIndexAt(0, 8, 4, true)).toBe(0)
    expect(frameIndexAt(124, 8, 4, true)).toBe(0)
    expect(frameIndexAt(125, 8, 4, true)).toBe(1)
    expect(frameIndexAt(375, 8, 4, true)).toBe(3)
  })

  it('com loop dá a volta', () => {
    expect(frameIndexAt(500, 8, 4, true)).toBe(0)
    expect(frameIndexAt(625, 8, 4, true)).toBe(1)
  })

  it('sem loop TRAVA no último quadro', () => {
    expect(frameIndexAt(500, 8, 4, false)).toBe(3)
    expect(frameIndexAt(99999, 8, 4, false)).toBe(3)
  })

  it('entradas degeneradas não explodem', () => {
    expect(frameIndexAt(-100, 8, 4, true)).toBe(0)
    expect(frameIndexAt(100, 0, 4, true)).toBe(0) // fps clampado a 1
    expect(frameIndexAt(100, 8, 0, true)).toBe(0)
  })

  it('easing "linear" (default) é idêntico ao explícito', () => {
    expect(frameIndexAt(125, 8, 4, true, 'linear')).toBe(frameIndexAt(125, 8, 4, true))
  })

  it('easing "ease" começa e termina nos mesmos quadros de contorno', () => {
    // Início da passada = quadro 0; ponta final da passada (sem loop) = último.
    expect(frameIndexAt(0, 8, 4, false, 'ease')).toBe(0)
    expect(frameIndexAt(99999, 8, 4, false, 'ease')).toBe(3)
    // Todos os índices ficam no intervalo válido ao longo de uma passada.
    for (let t = 0; t <= 500; t += 25) {
      const index = frameIndexAt(t, 8, 4, true, 'ease')
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThanOrEqual(3)
    }
  })
})

describe('animationDurationMs', () => {
  it('quadros ÷ fps em ms', () => {
    expect(animationDurationMs(4, 8)).toBe(500)
    expect(animationDurationMs(6, 10)).toBe(600)
    expect(animationDurationMs(1, 1)).toBe(1000)
  })

  it('fps é clampado (nunca divide por zero)', () => {
    expect(animationDurationMs(4, 0)).toBe(4000)
    expect(animationDurationMs(0, 8)).toBe(0)
  })
})

import { describe, expect, it } from 'bun:test'
import { animationDurationMs, frameDurationsMs, frameIndexAt } from './player'

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

describe('frameDurationsMs (o tempo de cada quadro, para exportar)', () => {
  it('linear reparte igual: 8 fps = 125ms em todo quadro', () => {
    expect(frameDurationsMs(4, 8)).toEqual([125, 125, 125, 125])
  })

  it('suave segura nas PONTAS e corre no meio, sem mudar a duração da passada', () => {
    const durations = frameDurationsMs(6, 6, 'ease')
    expect(durations).toHaveLength(6)
    // A passada continua durando 6 quadros ÷ 6 fps = 1s.
    expect(durations.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 6)
    // Simétrica e decrescente até o meio.
    expect(durations[0] as number).toBeCloseTo(durations[5] as number, 6)
    expect(durations[1] as number).toBeCloseTo(durations[4] as number, 6)
    expect(durations[0] as number).toBeGreaterThan(durations[1] as number)
    expect(durations[1] as number).toBeGreaterThan(durations[2] as number)
  })

  it('bate com o relógio da prévia: cada quadro dura o tempo em que ele é o mostrado', () => {
    // A conta fechada tem que descrever o MESMO que o rAF mostra — senão o GIF
    // exportado anima diferente da prévia que a criança acabou de ver.
    const fps = 4
    const count = 5
    const durations = frameDurationsMs(count, fps, 'ease')
    const seen = new Array<number>(count).fill(0)
    const cycle = animationDurationMs(count, fps)
    const stepMs = 0.5
    for (let t = 0; t < cycle; t += stepMs) {
      const index = frameIndexAt(t, fps, count, true, 'ease')
      seen[index] = (seen[index] ?? 0) + stepMs
    }
    durations.forEach((expected, i) => {
      expect(seen[i] as number).toBeCloseTo(expected, 0)
    })
  })

  it('sem quadro nenhum devolve lista vazia', () => {
    expect(frameDurationsMs(0, 8)).toEqual([])
  })
})

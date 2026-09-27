import { describe, expect, it } from 'bun:test'
import { RULER_MIN_LABEL_PX, RULER_MIN_MINOR_PX, rulerStep, rulerTicks } from './rulerTicks'

describe('rulerTicks: os traços da régua por zoom e tamanho do documento', () => {
  it('escolhe o menor passo cujos rótulos ficam a 40 px de tela', () => {
    expect(rulerStep(1)).toBe(64)
    expect(rulerStep(8)).toBe(8)
    expect(rulerStep(16)).toBe(4)
    expect(rulerStep(0.25)).toBe(256)
    // O "Ajustar" grava zoom fracionário: 128 × 0,3125 = 40, cabe cravado.
    expect(rulerStep(0.3125)).toBe(128)
  })

  it('para zoom 1/8/16 e documentos de 32/256/2048, começa em 0, termina no documento e rotula a cada passo', () => {
    for (const zoom of [1, 8, 16]) {
      for (const length of [32, 256, 2048]) {
        const ticks = rulerTicks(length, zoom)
        const step = rulerStep(zoom)
        expect(ticks[0]).toEqual({ pos: 0, major: true, label: '0' })
        const last = ticks[ticks.length - 1]
        expect(last?.pos ?? -1).toBeLessThanOrEqual(length)
        const majors = ticks.filter((tick) => tick.major)
        // Nenhum rótulo mais perto de outro que 40 px de tela.
        for (let i = 1; i < majors.length; i += 1) {
          const gap = ((majors[i]?.pos ?? 0) - (majors[i - 1]?.pos ?? 0)) * zoom
          expect(gap).toBeGreaterThanOrEqual(RULER_MIN_LABEL_PX)
        }
        for (const tick of majors) {
          expect(tick.pos % step).toBe(0)
          expect(tick.label).toBe(String(tick.pos))
        }
        // Todo traço pequeno fica a pelo menos 6 px do vizinho.
        for (let i = 1; i < ticks.length; i += 1) {
          const gap = ((ticks[i]?.pos ?? 0) - (ticks[i - 1]?.pos ?? 0)) * zoom
          expect(gap).toBeGreaterThanOrEqual(RULER_MIN_MINOR_PX)
        }
      }
    }
  })

  it('num sprite de 32 em zoom 8 os rótulos são 0-8-16-24-32, com quatro traços por passo', () => {
    const ticks = rulerTicks(32, 8)
    expect(ticks.filter((tick) => tick.major).map((tick) => tick.label)).toEqual([
      '0',
      '8',
      '16',
      '24',
      '32',
    ])
    expect(ticks.length).toBe(17)
  })

  it('em zoom 1 o passo é 64 e os traços pequenos ficam de 16 em 16', () => {
    const ticks = rulerTicks(480, 1)
    expect(ticks.filter((tick) => tick.major).map((tick) => tick.pos)).toEqual([
      0, 64, 128, 192, 256, 320, 384, 448,
    ])
    expect(ticks[1]).toEqual({ pos: 16, major: false })
  })

  it('o traço pequeno cai para a metade do passo, e depois some, quando não cabe', () => {
    // Passo 256 em zoom 0,25 = 64 px: um quarto (16 px) cabe no padrão de 6 px.
    expect(rulerTicks(2048, 0.25)[1]).toEqual({ pos: 64, major: false })
    // Exigindo 20 px, o quarto (16) não cabe e a metade (32) fica.
    expect(rulerTicks(2048, 0.25, { minMinorPx: 20 })[1]).toEqual({ pos: 128, major: false })
    // Exigindo 40 px, nem a metade cabe: só os traços grandes.
    const soGrandes = rulerTicks(2048, 0.25, { minMinorPx: 40 })
    expect(soGrandes.every((tick) => tick.major)).toBe(true)
    expect(soGrandes.length).toBe(9)
  })

  it('documento ou zoom inválidos não quebram', () => {
    expect(rulerTicks(0, 8)).toEqual([])
    expect(rulerTicks(32, 0)).toEqual([])
    expect(rulerTicks(Number.NaN, 8)).toEqual([])
  })
})

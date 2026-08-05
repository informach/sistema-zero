import { describe, expect, it } from 'bun:test'
import { gridSpacingFor, snapPoint, snapValue } from './grid'

describe('grade do vetor (espaçamento + snap)', () => {
  it('espaçamento acompanha o tamanho do documento', () => {
    expect(gridSpacingFor(32, 32)).toBe(4)
    expect(gridSpacingFor(64, 64)).toBe(4)
    expect(gridSpacingFor(128, 128)).toBe(8)
    expect(gridSpacingFor(16, 256)).toBe(8)
    expect(gridSpacingFor(480, 360)).toBe(16)
    expect(gridSpacingFor(960, 540)).toBe(16)
  })

  it('snapValue arredonda para o múltiplo mais próximo', () => {
    expect(snapValue(0, 8)).toBe(0)
    expect(snapValue(3.9, 8)).toBe(0)
    expect(snapValue(4, 8)).toBe(8)
    expect(snapValue(-5, 8)).toBe(-8)
    expect(snapValue(93, 16)).toBe(96)
  })

  it('snapPoint arredonda os dois eixos', () => {
    expect(snapPoint({ x: 30, y: 61 }, 16)).toEqual({ x: 32, y: 64 })
  })
})

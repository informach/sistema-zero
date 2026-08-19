import { afterEach, describe, expect, it } from 'bun:test'
import {
  perfEnabled,
  perfMark,
  perfMeasure,
  perfSpan,
  perfSpanAsync,
  resetPerfFlagForTests,
} from './perf'

afterEach(() => {
  localStorage.removeItem('sz:perf')
  resetPerfFlagForTests()
  performance.clearMarks()
  performance.clearMeasures()
})

describe('perf (medições leves atrás de flag)', () => {
  it('desligado por padrão: nenhuma marca, nenhuma medida, e as funções só passam o valor', async () => {
    expect(perfEnabled()).toBe(false)
    perfMark('pinta:teste:start')
    expect(perfSpan('pinta:teste', () => 42)).toBe(42)
    expect(await perfSpanAsync('pinta:teste', async () => 'ok')).toBe('ok')
    expect(performance.getEntriesByName('pinta:teste').length).toBe(0)
    expect(performance.getEntriesByName('pinta:teste:start').length).toBe(0)
  })

  it('ligado pela flag: marca e mede (inclusive quando o trecho assíncrono lança)', async () => {
    localStorage.setItem('sz:perf', '1')
    resetPerfFlagForTests()
    expect(perfEnabled()).toBe(true)
    expect(perfSpan('pinta:sync', () => 7)).toBe(7)
    expect(performance.getEntriesByName('pinta:sync', 'measure').length).toBe(1)
    await expect(
      perfSpanAsync('pinta:falha', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(performance.getEntriesByName('pinta:falha', 'measure').length).toBe(1)
    perfMark('a')
    perfMeasure('pinta:ab', 'a', undefined, { itens: 3 })
    expect(performance.getEntriesByName('pinta:ab', 'measure').length).toBe(1)
    // Medir sem marca de início não lança.
    perfMeasure('pinta:sem-inicio', 'nao-existe')
  })
})

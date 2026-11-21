import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { ZAPPY_OBSERVATION_MAX_CHARS, zappyObservationRule, zappyObservedRuntime } = await import(
  '../src/server/zappy-observation'
)

// Revisão do lote 5 (21/11/2026): o que vai ao modelo das abas Investigar e Desempenho.
describe('a observação das abas no pedido ao Zappy', () => {
  const value = (name: string, text: string) => ({ name, text })

  test('os valores do erro iguais aos de agora vão uma vez só', () => {
    const values = [value('pontos', '3'), value('vidas', '0')]
    const result = zappyObservedRuntime({
      investigation: { frame: 40, paused: false, values, stopped: { frame: 40, values } },
    })
    expect(result.oQueOJogoMostra?.valores).toHaveLength(2)
    expect(result.oQueOJogoMostra?.parouComErro).toEqual({ quadro: 40, valores: [] })
  })

  test('valores do erro diferentes dos de agora continuam', () => {
    const result = zappyObservedRuntime({
      investigation: {
        frame: 41,
        paused: false,
        values: [value('pontos', '3')],
        stopped: { frame: 40, values: [value('pontos', '2')] },
      },
    })
    expect(result.oQueOJogoMostra?.parouComErro?.valores).toEqual([{ nome: 'pontos', valor: '2' }])
  })

  test('a observação cabe no teto, cedendo primeiro os valores do erro', () => {
    const long = (prefix: string) =>
      Array.from({ length: 20 }, (_, index) => value(`${prefix}${index}`, 'ã'.repeat(160)))
    const result = zappyObservedRuntime({
      investigation: {
        frame: 9,
        paused: true,
        values: long('agora'),
        stopped: { frame: 8, values: long('erro') },
      },
    })
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(ZAPPY_OBSERVATION_MAX_CHARS)
    // Os do erro saem antes: com os 20 de agora já acima do teto, não sobra nenhum deles.
    expect(result.oQueOJogoMostra?.parouComErro?.valores).toEqual([])
    expect(result.oQueOJogoMostra?.valores.length).toBeGreaterThan(0)
    expect(result.oQueOJogoMostra?.valores[0]?.nome).toBe('agora0')
  })

  test('as abas ligadas vão mesmo sem leitura, e nada vai sem aba ligada', () => {
    expect(zappyObservedRuntime({ observing: { investigate: true, performance: false } })).toEqual({
      abasLigadas: { investigar: true, desempenho: false },
    })
    expect(zappyObservedRuntime({ observing: { investigate: false, performance: false } })).toEqual(
      {},
    )
    expect(zappyObservedRuntime({})).toEqual({})
  })

  test('a regra do Pro não fala da aba Investigar', () => {
    expect(zappyObservationRule('performance')).not.toContain('Investigar')
    expect(zappyObservationRule('performance')).toContain('abasLigadas')
    expect(zappyObservationRule('investigate-and-performance')).toContain('Investigar')
  })
})

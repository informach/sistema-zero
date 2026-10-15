import { describe, expect, test } from 'bun:test'
import {
  PENSA_OPERATION_CALLS,
  PENSA_ROUND_CALLS,
  pensaCallsExhausted,
  pensaRoundStart,
} from '../../src/domain/pensa/operation-budget'

describe('cota de chamadas do Pensa por rodada (15/10/2026)', () => {
  const op = (calls: number, input: unknown, step = 'propose') => ({ calls, input, step })

  test('a rodada conta a partir da marca, e a conversa tem teto no pedido', () => {
    expect(PENSA_ROUND_CALLS).toBe(6)
    expect(PENSA_OPERATION_CALLS).toBe(24)
    expect(pensaCallsExhausted(op(12, { roundStartCalls: 12 }))).toBe(false)
    expect(pensaCallsExhausted(op(17, { roundStartCalls: 12 }))).toBe(false)
    expect(pensaCallsExhausted(op(18, { roundStartCalls: 12 }))).toBe(true)
    expect(pensaCallsExhausted(op(24, { roundStartCalls: 22 }))).toBe(true)
    expect(pensaCallsExhausted(op(24, { roundStartCalls: 22 }, 'answer'))).toBe(true)
    expect(pensaCallsExhausted(op(0, { roundStartCalls: 0 }))).toBe(false)
  })

  test('os guias nunca param no teto do pedido, só na cota da rodada deles', () => {
    expect(pensaCallsExhausted(op(24, { roundStartCalls: 24 }, 'guides'))).toBe(false)
    expect(pensaCallsExhausted(op(29, { roundStartCalls: 24 }, 'guides'))).toBe(false)
    expect(pensaCallsExhausted(op(30, { roundStartCalls: 24 }, 'guides'))).toBe(true)
  })

  test('sem marca (pedido anterior), vale só o teto: o guia que parou nas 10 de antes volta', () => {
    expect(pensaRoundStart({ message: 'Gato' })).toBeNull()
    expect(pensaRoundStart({ roundStartCalls: '3' })).toBeNull()
    expect(pensaRoundStart({ roundStartCalls: -1 })).toBeNull()
    expect(pensaRoundStart(null)).toBeNull()
    expect(pensaCallsExhausted(op(10, { message: 'Gato' }, 'guides'))).toBe(false)
    expect(pensaCallsExhausted(op(23, { message: 'Gato' }))).toBe(false)
    expect(pensaCallsExhausted(op(24, { message: 'Gato' }))).toBe(true)
  })
})

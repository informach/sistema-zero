import { describe, expect, test } from 'bun:test'
import { RESULT_MESSAGES } from '../../src/content/result-messages'
import { calcCustoMensalCents, custoMensalText, getResultMessage } from '../../src/lib/result-text'

describe('getResultMessage', () => {
  test('retorna a mensagem do segmento A-D (case-insensitive)', () => {
    expect(getResultMessage('A')).toBe(RESULT_MESSAGES.segmentos.A)
    expect(getResultMessage('b')).toBe(RESULT_MESSAGES.segmentos.B)
    expect(getResultMessage('D')).toBe(RESULT_MESSAGES.segmentos.D)
  })
  test('usa fallback quando ausente/inválido', () => {
    expect(getResultMessage(null)).toBe(RESULT_MESSAGES.fallback)
    expect(getResultMessage('X')).toBe(RESULT_MESSAGES.fallback)
  })
})

describe('calculadora', () => {
  test('custo_mensal = horas * valor_hora(centavos) * 4', () => {
    expect(calcCustoMensalCents(10, 5000)).toBe(200000)
    expect(calcCustoMensalCents(0, 5000)).toBe(0)
  })
  test('texto de impacto formata R$ e cita doze vezes', () => {
    const txt = custoMensalText(200000)
    expect(txt).toContain('R$')
    expect(txt).toContain('doze vezes')
  })
})

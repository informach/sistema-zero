import { describe, expect, test } from 'bun:test'
import { calcCustoMensalCents, custoMensalText } from '../../src/lib/result-text'

describe('calculadora', () => {
  test('custo_mensal = horas * valor_hora(centavos) * 4', () => {
    expect(calcCustoMensalCents(10, 5000)).toBe(200000)
    expect(calcCustoMensalCents(0, 5000)).toBe(0)
  })
  test('texto de impacto formata R$ e cita o tempo travado', () => {
    const txt = custoMensalText(200000)
    expect(txt).toContain('R$')
    expect(txt).toContain('por mês')
  })
})

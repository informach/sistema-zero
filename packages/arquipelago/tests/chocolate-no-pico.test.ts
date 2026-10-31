import { expect, test } from 'bun:test'
import { ITENS } from '../src/sistemas/itens'
import { comer, falaDeComer } from '../src/sistemas/necessidades'

/**
 * A tabela de receitas da proposta: "Chocolate quente: aquece no Pico Gelado" (lacunas,
 * 01/11/2026). No Pico ele rende energia a mais e o Zappy diz que aqueceu; fora dele é o de sempre.
 */
test('o chocolate quente aquece no Pico e rende o de sempre fora dele', () => {
  const chocolate = ITENS['chocolate-quente']
  if (!chocolate) throw new Error('sem o chocolate quente')
  const n = { fome: 40, energia: 30, diversao: 50 }
  const fora = comer(n, chocolate, 'vila-doce')
  const noPico = comer(n, chocolate, 'pico')
  expect(fora).toEqual({ fome: 55, energia: 45, diversao: 50 })
  expect(noPico.energia).toBeGreaterThan(fora.energia)
  expect(noPico.fome).toBe(fora.fome)
  expect(comer(n, chocolate)).toEqual(fora)
  expect(falaDeComer(chocolate, 'pico')).toContain('aqueceu')
  expect(falaDeComer(chocolate, 'vila-doce')).toBe(
    'Hum. Chocolate quente deu energia para continuar.',
  )
  expect(falaDeComer(chocolate, 'pico')).not.toMatch(/[—–!?]/)
})

test('os outros pratos não mudam de ilha para ilha', () => {
  for (const item of Object.values(ITENS)) {
    if (!item.comida || item.naIlha) continue
    const n = { fome: 10, energia: 10, diversao: 10 }
    expect(comer(n, item, 'pico')).toEqual(comer(n, item, 'bosque'))
  }
})

import { expect, test } from 'bun:test'
import { VERSAO_CONTRATO_PLATAFORMA } from '@sistemazero/arquipelago-contracts'
import { montarArquipelago, versaoContrato } from '../src/entrada'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'

test('a entrada recusa uma plataforma de contrato incompatível, sem tocar no elemento (A35)', () => {
  expect(versaoContrato).toBe(VERSAO_CONTRATO_PLATAFORMA)
  // Sem DOM nos testes: o elemento de mentira só registra se alguém mexeu nele.
  const mexidas: string[] = []
  const elemento = {
    appendChild: () => mexidas.push('appendChild'),
    append: () => mexidas.push('append'),
    classList: { add: () => mexidas.push('classList') },
  } as unknown as HTMLElement
  const plataforma = { ...criarPlataformaFalsa(), versaoContrato: VERSAO_CONTRATO_PLATAFORMA + 1 }
  expect(() => montarArquipelago(elemento, plataforma as never)).toThrow('Contrato da plataforma')
  expect(mexidas).toEqual([])
})

import { expect, test } from 'bun:test'
import { mudaChaveDaEquipe } from '../src/oficina/telas/Propriedades'

test('fora da equipe, criar ou mudar uma chave arquipelago.* é recusado na tela', () => {
  const p = 'arquipelago.'
  expect(mudaChaveDaEquipe({}, { cor: 'azul' }, p)).toBe(false)
  expect(mudaChaveDaEquipe({}, { 'arquipelago.fisica': 'caixa' }, p)).toBe(true)
  expect(
    mudaChaveDaEquipe({ 'arquipelago.fisica': 'caixa' }, { 'arquipelago.fisica': 'tronco' }, p),
  ).toBe(true)
  // A chave antiga que fica igual, ou que sai, não trava o resto.
  expect(
    mudaChaveDaEquipe(
      { 'arquipelago.fisica': 'caixa' },
      { 'arquipelago.fisica': 'caixa', cor: 'azul' },
      p,
    ),
  ).toBe(false)
  expect(mudaChaveDaEquipe({ 'arquipelago.fisica': 'caixa' }, {}, p)).toBe(false)
})

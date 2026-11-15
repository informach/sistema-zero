import { expect, test } from 'bun:test'
import { OBJETOS_DA_CASA } from '@sistemazero/arquipelago-contracts'
import {
  isMoradaFunctionInstance,
  MORADA_PECAS_DAS_FUNCOES,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { MORADA_FUNCTION, MORADA_VARIANTS } from '../src/sistemas/morada'

test('o serviço conhece as mesmas peças de cada função do jogo', () => {
  for (const id of OBJETOS_DA_CASA) {
    const doJogo = [MORADA_FUNCTION[id], MORADA_VARIANTS[id].retro, MORADA_VARIANTS[id].moderna]
    expect([...(MORADA_PECAS_DAS_FUNCOES[id] ?? [])].sort(), id).toEqual([...doJogo].sort())
  }
  expect(Object.keys(MORADA_PECAS_DAS_FUNCOES).sort()).toEqual([...OBJETOS_DA_CASA].sort())
})

test('o behavior só vale na peça daquela função', () => {
  expect(
    isMoradaFunctionInstance({ pieceId: MORADA_FUNCTION.geladeira, behavior: 'objeto:geladeira' }),
  ).toBe(true)
  expect(
    isMoradaFunctionInstance({ pieceId: MORADA_FUNCTION.fliperama, behavior: 'objeto:geladeira' }),
  ).toBe(false)
  expect(isMoradaFunctionInstance({ pieceId: MORADA_FUNCTION.geladeira })).toBe(false)
})

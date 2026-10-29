import { expect, test } from 'bun:test'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
// O contrato do jogo não é dependência do Members: o arquivo dos cartões não importa nada e é
// lido pelo caminho, como os testes de conformidade do Molda.
import { CARTAS_LUMI } from '../../../arquipelago-contracts/src/cartas-lumi'

test('todo cartão de controle dos Lumis aponta para um bloco que existe no Estúdio', () => {
  const existentes = new Set(SERVER_BLOCK_CATALOG.map((b) => b.type))
  const faltando = CARTAS_LUMI.filter((c) => c.bloco !== null && !existentes.has(c.bloco))
  expect(faltando.map((c) => `${c.id} → ${c.bloco}`)).toEqual([])
  expect(CARTAS_LUMI.some((c) => c.bloco !== null)).toBe(true)
})

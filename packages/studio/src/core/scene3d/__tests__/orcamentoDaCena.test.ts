import { expect, test } from 'bun:test'
import { malhasDaCenaParaOOrcamento } from '../importar'

/**
 * Revisão do lote 5: o orçamento por janela vale para o JavaScript (o SDK carrega por regiões); o
 * Python ainda desenha a cena inteira (até o lote 7b), então ali vale o total.
 */
const cena = {
  arquivos: [{ caminho: 'm.glb', malhas: 40 }],
  nos: ['a', 'b', 'c'].map((id) => ({ id, arquivo: 'm.glb' })),
  colisoes: [],
  aguas: [],
  regioes: ['a', 'b', 'c'].map((id) => ({
    id,
    vizinhas: [],
    nos: [id],
    colisoes: [],
    aguas: [],
  })),
}

test('três regiões sem vizinhas: o JavaScript confere a maior janela, o Python a cena inteira', () => {
  expect(malhasDaCenaParaOOrcamento(cena, false)).toBe(40)
  expect(malhasDaCenaParaOOrcamento(cena, true)).toBe(120)
})

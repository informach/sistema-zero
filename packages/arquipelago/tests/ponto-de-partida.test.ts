import { describe, expect, test } from 'bun:test'
import type { QuartoDoJogo } from '@sistemazero/arquipelago-contracts'
import { QUARTO } from '../src/mundo/medidas'
import {
  caixasDosMoveis,
  FOLGA_DO_CORPO,
  lugarLivreNoQuarto,
  pontoLivre,
} from '../src/sistemas/ponto-de-partida'

const quarto = (placedItems: QuartoDoJogo['placedItems']): QuartoDoJogo =>
  ({ theme: 'padrao', placedItems }) as QuartoDoJogo

describe('ponto de partida no quarto', () => {
  test('quarto vazio: o ponto pedido serve (o mesmo objeto)', () => {
    const pedido = { x: 0, z: 1.8 }
    expect(lugarLivreNoQuarto(quarto([]), pedido, QUARTO)).toBe(pedido)
  })

  test('móvel em cima do ponto: vai para o lugar livre mais perto, fora do móvel', () => {
    // Cama 2×3 cobrindo o centro da frente do quarto (células x 5..6, y 4..6).
    const q = quarto([{ itemId: 'cama', x: 5, y: 4 } as QuartoDoJogo['placedItems'][number]])
    const pedido = { x: 0, z: 1.8 }
    const livre = lugarLivreNoQuarto(q, pedido, QUARTO)
    expect(livre).not.toBeNull()
    expect(livre).not.toBe(pedido)
    const caixas = caixasDosMoveis(q)
    expect(caixas).toHaveLength(1)
    expect(pontoLivre(livre?.x ?? 0, livre?.z ?? 0, caixas, QUARTO)).toBe(true)
    // Perto: a menos de um móvel e meio de distância.
    expect(Math.hypot((livre?.x ?? 0) - pedido.x, (livre?.z ?? 0) - pedido.z)).toBeLessThan(2.5)
  })

  test('nunca encosta na parede', () => {
    const livre = lugarLivreNoQuarto(quarto([]), { x: 9, z: 9 }, QUARTO)
    expect(livre && Math.abs(livre.x)).toBeLessThanOrEqual(QUARTO.largura / 2 - FOLGA_DO_CORPO)
    expect(livre && Math.abs(livre.z)).toBeLessThanOrEqual(QUARTO.fundo / 2 - FOLGA_DO_CORPO)
  })

  test('peça de parede e peça em cima de outra não ocupam o chão', () => {
    const q = quarto([
      { itemId: 'quadro', x: 5, y: 0, wall: 'left' },
      { itemId: 'cama', x: 0, y: 0, on: 'mesa', slot: 0 },
    ] as QuartoDoJogo['placedItems'])
    expect(caixasDosMoveis(q)).toHaveLength(0)
  })

  test('quarto todo tomado: devolve null (quem chamou usa a porta)', () => {
    const cheio: QuartoDoJogo['placedItems'] = []
    for (let x = 0; x < 12; x += 2)
      for (let y = 0; y < 8; y += 2)
        cheio.push({ itemId: 'bau', x, y } as QuartoDoJogo['placedItems'][number])
    expect(lugarLivreNoQuarto(quarto(cheio), { x: 0, z: 0 }, QUARTO)).toBeNull()
  })
})

import { describe, expect, test } from 'bun:test'
import { enquadrarRetrato, RETRATO } from '../src/sistemas/retrato'

describe('retrato do avatar na HUD', () => {
  // Um avatar de 1,6 m em pé na origem, olhando para +z, com o nariz 0,15 m à frente.
  const caixa = { min: { x: -0.4, y: 0, z: -0.2 }, max: { x: 0.4, y: 1.6, z: 0.15 } }

  test('a cabeça e o começo dos ombros: o meio dos 45% de cima, de frente', () => {
    const q = enquadrarRetrato(caixa)
    const regiao = 1.6 * RETRATO.parteDeCima
    expect(q.alvo.y).toBeCloseTo(1.6 - regiao / 2, 6)
    expect(q.posicao.y).toBe(q.alvo.y)
    expect(q.posicao.x).toBe(0)
    expect(q.posicao.z).toBeGreaterThan(caixa.max.z)
  })

  test('a região ocupa 80% da altura do quadro, medida do plano da frente (como a plataforma)', () => {
    const q = enquadrarRetrato(caixa)
    const distancia = q.posicao.z - caixa.max.z
    const vista = 2 * distancia * Math.tan((RETRATO.campo * Math.PI) / 360)
    expect((1.6 * RETRATO.parteDeCima) / vista).toBeCloseTo(RETRATO.ocupa, 6)
  })
})

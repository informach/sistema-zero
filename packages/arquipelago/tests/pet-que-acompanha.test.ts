import { describe, expect, test } from 'bun:test'
import { ALTURA_DO_VOO, alturaDoPet, BALANCO_DO_VOO } from '../src/sistemas/companhia'

describe('o bichinho que acompanha (revisão de 30/10/2026)', () => {
  test('gato e cachorro andam no chão', () => {
    for (const t of [0, 0.4, 1.7]) {
      expect(alturaDoPet('pet-gato', t, false)).toBe(0)
      expect(alturaDoPet('pet-cachorro', t, true)).toBe(0)
    }
  })

  test('o passarinho balança no voo, e com menos movimento voa reto', () => {
    const alturas = [0, 0.2, 0.5, 0.9, 1.3].map((t) => alturaDoPet('pet-passaro', t, false))
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeGreaterThan(BALANCO_DO_VOO)
    for (const t of [0, 0.2, 0.5, 0.9, 1.3])
      expect(alturaDoPet('pet-passaro', t, true)).toBe(ALTURA_DO_VOO)
  })

  test('o relógio parado (pausa) dá a mesma altura', () => {
    expect(alturaDoPet('pet-passaro', 2.1, false)).toBe(alturaDoPet('pet-passaro', 2.1, false))
  })
})

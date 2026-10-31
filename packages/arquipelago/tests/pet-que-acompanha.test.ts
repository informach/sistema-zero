import { describe, expect, test } from 'bun:test'
import { ALTURA_DO_VOO, alturaDoPet, BALANCO_DO_VOO } from '../src/sistemas/companhia'
import {
  criarSeguir,
  PASSO_DO_CLIPE,
  passoDoSeguir,
  ritmoDoPasso,
  SEGUIR,
} from '../src/sistemas/seguir'

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

describe('o gato e o cachorro andam com o clipe no ritmo da velocidade (B3, 31/10/2026)', () => {
  test('o clipe acelera na proporção da velocidade para o pé não escorregar', () => {
    const andando = ritmoDoPasso('andar', SEGUIR.andar)
    expect(andando.clipe).toBe('andar')
    expect(andando.ritmo).toBeCloseTo(SEGUIR.andar / PASSO_DO_CLIPE.andar, 5)
    const correndo = ritmoDoPasso('correr', SEGUIR.correr)
    expect(correndo.clipe).toBe('correr')
    expect(correndo.ritmo).toBeCloseTo(SEGUIR.correr / PASSO_DO_CLIPE.correr, 5)
  })

  test('parado e sentado voltam ao parado do quarto', () => {
    expect(ritmoDoPasso('parado', 0)).toEqual({ clipe: null, ritmo: 1 })
    expect(ritmoDoPasso('sentar', 0)).toEqual({ clipe: null, ritmo: 1 })
  })

  test('arrancando devagar, o ritmo tem piso e nunca para o clipe', () => {
    expect(ritmoDoPasso('andar', 0.16).ritmo).toBeGreaterThan(0)
    expect(ritmoDoPasso('correr', 20).ritmo).toBeLessThanOrEqual(2)
  })

  test('seguindo a criança de longe, ele passa de andar a correr', () => {
    const e = criarSeguir()
    const bicho = { x: 0, y: 1, z: 0 }
    let clipe = passoDoSeguir(e, bicho, { x: 3, z: 0 }, false, 0.5).clipe
    expect(ritmoDoPasso(clipe, Math.hypot(e.vx, e.vz)).clipe).toBe('andar')
    for (let i = 0; i < 5; i++) clipe = passoDoSeguir(e, bicho, { x: 9, z: 0 }, false, 0.5).clipe
    expect(ritmoDoPasso(clipe, Math.hypot(e.vx, e.vz)).clipe).toBe('correr')
  })
})

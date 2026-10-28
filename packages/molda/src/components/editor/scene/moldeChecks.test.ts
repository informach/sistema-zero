import { describe, expect, test } from 'bun:test'
import type { Vec3 } from '../../../core/model'
import { conferirMolde } from './moldeChecks'

const molde = { min: [-4, 0, -3] as Vec3, max: [4, 10, 3] as Vec3, maxTriangles: 5000 }
const caixa = (min: [number, number, number], max: [number, number, number]) => ({ min, max })

describe('conferências do molde', () => {
  test('a caixa de começo cabe, encosta na frente e é leve', () => {
    expect(conferirMolde(caixa([-4, 0, -3], [4, 10, 3]), 12, molde)).toEqual({
      vazio: false,
      cabe: true,
      frente: true,
      triangulos: 12,
      leve: true,
    })
  })

  test('passar do molde em qualquer lado não cabe; meio passo de folga vale', () => {
    expect(conferirMolde(caixa([-4, 0, -3], [4, 10.5, 3]), 12, molde).cabe).toBe(false)
    expect(conferirMolde(caixa([-4.5, 0, -3], [4, 10, 3]), 12, molde).cabe).toBe(false)
    expect(conferirMolde(caixa([-4, 0, -3], [4, 10 + 1 / 64, 3]), 12, molde).cabe).toBe(true)
  })

  test('a frente precisa encostar na marca rosa (a face +z)', () => {
    expect(conferirMolde(caixa([-4, 0, -3], [4, 10, 2]), 12, molde).frente).toBe(false)
    // Encostar no fundo não conta: a frente é a +z.
    expect(conferirMolde(caixa([-4, 0, -3], [4, 10, -1]), 12, molde).frente).toBe(false)
  })

  test('acima do teto de triângulos não é leve; criação vazia não cabe nem encosta', () => {
    expect(conferirMolde(caixa([-4, 0, -3], [4, 10, 3]), 5001, molde).leve).toBe(false)
    expect(conferirMolde(caixa([-4, 0, -3], [4, 10, 3]), 5000, molde).leve).toBe(true)
    expect(conferirMolde(null, 0, molde)).toEqual({
      vazio: true,
      cabe: false,
      frente: false,
      triangulos: 0,
      leve: true,
    })
  })
})

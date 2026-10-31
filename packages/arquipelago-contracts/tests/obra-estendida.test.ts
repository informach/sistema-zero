import { expect, test } from 'bun:test'
import { AndarDeCimaSchema } from '../src/obra-estendida'

test('o andar de cima guarda objetos com função, sem repetir (lacunas, 01/11/2026)', () => {
  const andar = { escada: { x: 0, z: 0, giro: 0 }, paredes: [], aberturas: [], pisos: [] }
  expect(AndarDeCimaSchema.safeParse(andar).success).toBe(true)
  const um = { id: 'geladeira' as const, x: 1, z: 1, giro: 0 }
  expect(AndarDeCimaSchema.safeParse({ ...andar, objetos: [um] }).success).toBe(true)
  expect(AndarDeCimaSchema.safeParse({ ...andar, objetos: [um, { ...um, x: 3 }] }).success).toBe(
    false,
  )
})

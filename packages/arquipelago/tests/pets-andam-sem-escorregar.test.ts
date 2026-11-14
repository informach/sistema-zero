import { expect, test } from 'bun:test'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { capsulaDoEspaco } from '../src/sistemas/espaco-dos-bichos'

test('24 gatos e cães possuem clipes de deslocamento e volumes nativos válidos', () => {
  const pets = Object.values(MORADA_CATALOG.pieces).filter((p) => p.kind === 'pet')
  expect(pets).toHaveLength(24)
  for (const pet of pets) {
    expect(['cat', 'dog']).toContain(pet.species ?? '')
    for (const pattern of [/parado|idle/i, /andar|walk/i, /correr|run/i])
      expect(pet.animations.some((a) => pattern.test(a.id) && a.duration > 0)).toBe(true)
    const cap = capsulaDoEspaco({
      raio: Math.max(pet.size[0] / 2, pet.size[2] * 0.3),
      altura: Math.max(pet.size[1], 0.75),
    })
    expect(cap.y - cap.meiaAltura - cap.raio).toBeCloseTo(0)
    expect(cap.raio).toBeGreaterThan(0)
  }
})

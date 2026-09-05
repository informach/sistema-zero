import { describe, expect, test } from 'bun:test'
import { appendBundleComponent } from '../../src/application/update-product/append-bundle-component'

const existing = [
  { componentProductId: 'principal', sortOrder: 0, isPrimary: true },
  { componentProductId: 'pinta', sortOrder: 4, isPrimary: false },
]

describe('appendBundleComponent', () => {
  test('acrescenta sem mudar o primário nem as posições existentes', () => {
    expect(appendBundleComponent(existing, 'molda')).toEqual([
      ...existing,
      { componentProductId: 'molda', sortOrder: 5, isPrimary: false },
    ])
  })

  test('é idempotente quando o componente já existe', () => {
    expect(appendBundleComponent(existing, 'pinta')).toBeNull()
  })
})

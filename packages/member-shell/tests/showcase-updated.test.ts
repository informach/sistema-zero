import { expect, test } from 'bun:test'
import { showcaseUpdatedLabel } from '../src/lib/showcase-updated'

test('o selo diz a data da atualização no horário de São Paulo', () => {
  expect(showcaseUpdatedLabel({ gameUpdatedAt: '2026-07-02T02:30:00.000Z' })).toBe(
    'Atualizado em 01/07/2026',
  )
})

test('sem atualização (ou data torta) não há selo', () => {
  expect(showcaseUpdatedLabel({})).toBeNull()
  expect(showcaseUpdatedLabel({ gameUpdatedAt: null })).toBeNull()
  expect(showcaseUpdatedLabel({ gameUpdatedAt: 'ontem' })).toBeNull()
})

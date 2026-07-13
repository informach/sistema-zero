import { describe, expect, test } from 'bun:test'
import { applyCatalogSort } from '../src/lib/catalog-sort'
import type { CatalogCourseView } from '../src/lib/types'

function course(over: Partial<CatalogCourseView> & { courseSlug: string }): CatalogCourseView {
  return {
    title: over.courseSlug,
    subtitle: null,
    coverImageUrl: null,
    hasAccess: false,
    salesPageUrl: null,
    ...over,
  }
}

// Criação de propósito na ordem INVERSA do título: distingue os dois critérios.
const LIST = [
  course({ courseSlug: 'zeta', title: 'Zeta', createdAt: '2026-01-01T00:00:00.000Z' }),
  course({ courseSlug: 'alfa', title: 'Alfa', createdAt: '2026-03-01T00:00:00.000Z' }),
  course({ courseSlug: 'medio', title: 'Médio', createdAt: '2026-02-01T00:00:00.000Z' }),
]

describe('applyCatalogSort (ordenação do catálogo)', () => {
  test('antigos (padrão do produto): do curso mais antigo ao mais novo', () => {
    expect(applyCatalogSort(LIST, 'antigos').map((c) => c.courseSlug)).toEqual([
      'zeta',
      'medio',
      'alfa',
    ])
  })

  test('recentes: do mais novo ao mais antigo', () => {
    expect(applyCatalogSort(LIST, 'recentes').map((c) => c.courseSlug)).toEqual([
      'alfa',
      'medio',
      'zeta',
    ])
  })

  test('az/za seguem pelo título', () => {
    expect(applyCatalogSort(LIST, 'az').map((c) => c.courseSlug)).toEqual(['alfa', 'medio', 'zeta'])
    expect(applyCatalogSort(LIST, 'za').map((c) => c.courseSlug)).toEqual(['zeta', 'medio', 'alfa'])
  })

  test('curso sem createdAt (members antigo) mantém posição relativa e não quebra', () => {
    const withLegacy = [...LIST, course({ courseSlug: 'legado', title: 'Legado' })]
    const sorted = applyCatalogSort(withLegacy, 'antigos').map((c) => c.courseSlug)
    // Chave vazia ordena primeiro no `antigos`; os demais seguem por data.
    expect(sorted).toEqual(['legado', 'zeta', 'medio', 'alfa'])
    expect(applyCatalogSort(withLegacy, 'recentes')[3]?.courseSlug).toBe('legado')
  })

  test('não muta a lista original', () => {
    const before = LIST.map((c) => c.courseSlug)
    applyCatalogSort(LIST, 'za')
    expect(LIST.map((c) => c.courseSlug)).toEqual(before)
  })
})

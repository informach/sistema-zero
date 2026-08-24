import { describe, expect, test } from 'bun:test'
import { relativeDayLabel } from '../src/lib/format'
import { ownedToolCards, toolCardKindFor } from '../src/lib/tool-usage'

describe('tool-usage — qual cartão cada matrícula vira', () => {
  const ent = (over: Partial<Parameters<typeof toolCardKindFor>[0]> = {}) => ({
    productKind: 'tool',
    sku: 'pensa',
    courseRef: 'pensa',
    ...over,
  })

  test('mapeia os 5 produtos pelo sku', () => {
    expect(toolCardKindFor(ent({ sku: 'pensa' }))).toBe('pensa')
    expect(toolCardKindFor(ent({ sku: 'pinta' }))).toBe('pinta')
    expect(toolCardKindFor(ent({ sku: 'estudio-completo' }))).toBe('estudio')
    expect(toolCardKindFor(ent({ productKind: 'community', sku: 'clube-dos-criadores' }))).toBe(
      'clube',
    )
    expect(toolCardKindFor(ent({ productKind: 'community', sku: 'mural-dos-criadores' }))).toBe(
      'mural',
    )
  })

  test('matrícula legada sem sku cai no courseRef (que É o sku nesses produtos)', () => {
    expect(toolCardKindFor(ent({ sku: null, courseRef: 'pinta' }))).toBe('pinta')
    expect(toolCardKindFor(ent({ sku: undefined, courseRef: 'estudio-completo' }))).toBe('estudio')
  })

  test('curso/combo/desconhecido NÃO viram cartão', () => {
    expect(
      toolCardKindFor(ent({ productKind: 'course', sku: 'curso-x', courseRef: 'curso-x' })),
    ).toBeNull()
    expect(
      toolCardKindFor(ent({ productKind: 'bundle', sku: 'combo', courseRef: null })),
    ).toBeNull()
    expect(
      toolCardKindFor(ent({ sku: 'ferramenta-nova', courseRef: 'ferramenta-nova' })),
    ).toBeNull()
    expect(toolCardKindFor(ent({ sku: null, courseRef: null }))).toBeNull()
  })

  test('ownedToolCards: dedupe por cartão, ordem da jornada, nome do snapshot', () => {
    const cards = ownedToolCards([
      {
        productKind: 'community',
        sku: 'mural-dos-criadores',
        courseRef: null,
        name: 'Mural dos Criadores',
      },
      { productKind: 'tool', sku: 'pinta', courseRef: 'pinta', name: 'Pinta' },
      { productKind: 'tool', sku: 'pinta', courseRef: 'pinta', name: 'Pinta (duplicada)' },
      { productKind: 'course', sku: 'curso-x', courseRef: 'curso-x', name: 'Curso X' },
      { productKind: 'tool', sku: 'pensa', courseRef: 'pensa', name: 'Pensa' },
    ])
    expect(cards).toEqual([
      { kind: 'pensa', name: 'Pensa' },
      { kind: 'pinta', name: 'Pinta' },
      { kind: 'mural', name: 'Mural dos Criadores' },
    ])
  })
})

describe('relativeDayLabel — dia civil de São Paulo', () => {
  // 22h BRT de 10/06 = 01h UTC de 11/06: o "dia" é o de SP, não o UTC.
  const now = new Date('2026-06-11T01:00:00.000Z')

  test('mesmo dia SP → hoje (mesmo cruzando a meia-noite UTC)', () => {
    expect(relativeDayLabel('2026-06-10T12:00:00.000Z', now)).toBe('hoje')
    expect(relativeDayLabel('2026-06-11T00:30:00.000Z', now)).toBe('hoje')
  })

  test('ontem e "há N dias"', () => {
    expect(relativeDayLabel('2026-06-09T12:00:00.000Z', now)).toBe('ontem')
    expect(relativeDayLabel('2026-06-07T12:00:00.000Z', now)).toBe('há 3 dias')
  })

  test('além de 30 dias → data curta; ausente/lixo → null', () => {
    expect(relativeDayLabel('2026-04-01T12:00:00.000Z', now)).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(relativeDayLabel(null, now)).toBeNull()
    expect(relativeDayLabel('nao-e-data', now)).toBeNull()
  })
})

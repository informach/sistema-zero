import { describe, expect, test } from 'bun:test'
// Catálogo CANÔNICO da carreira (core) por caminho RELATIVO de módulo puro — o admin
// NÃO depende do core no package.json e não deve passar a depender por causa de teste
// (mesmo precedente do badge-conformance do community-kids). A casa aceita a duplicação
// dos enums de degrau, TRAVADA por conformance; este é o elo admin×core que faltava.
import {
  CAREER_COURSE_TIERS,
  CAREER_SLOT_MAX,
  CREATOR_CAREER_LEVELS,
} from '../../core/src/career/catalog'
import { slotsForTier } from '../src/app/admin/membros/cursos/course-form-dialog'
import { COURSE_TIER_OPTIONS } from '../src/lib/types'

describe('conformance admin×core — degraus e posições da Carreira do Criador', () => {
  test('COURSE_TIER_OPTIONS ≡ CAREER_COURSE_TIERS (conjunto E ORDEM)', () => {
    // A ORDEM é load-bearing: os 6 degraus da carreira aparecem no seletor do form e
    // no painel de prontidão na mesma sequência (1ª opção = iniciante-2d).
    expect(COURSE_TIER_OPTIONS.map((o) => `${o.level}-${o.track}`)).toEqual([
      ...CAREER_COURSE_TIERS,
    ])
  })

  test('slotsForTier ≡ requiredSlots da Lenda (nº de posições por etapa)', () => {
    const god = CREATOR_CAREER_LEVELS.at(-1)
    expect(god?.slug).toBe('god')
    for (const option of COURSE_TIER_OPTIONS) {
      const tier = `${option.level}-${option.track}` as (typeof CAREER_COURSE_TIERS)[number]
      const canonical = god?.requiredSlots[tier]?.length ?? 0
      expect(
        slotsForTier(option.level, option.track),
        `posições divergentes na etapa "${tier}"`,
      ).toBe(canonical)
    }
  })

  test('CareerReadiness e slotsForTier usam CAREER_SLOT_MAX posições por degrau', () => {
    // Reforma 07/2026: toda etapa tem 8 posições (era 6 no ini-2d e 5 nas demais). A
    // âncora é a constante CANÔNICA do core — painel de prontidão e form derivam dela.
    for (const option of COURSE_TIER_OPTIONS) {
      expect(slotsForTier(option.level, option.track)).toBe(CAREER_SLOT_MAX)
    }
  })
})

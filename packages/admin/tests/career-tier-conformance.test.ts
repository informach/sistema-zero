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
    // A ORDEM é load-bearing: os degraus da carreira aparecem no seletor do form e no
    // painel de prontidão na mesma sequência (1ª opção = o degrau de ENTRADA).
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

  test('as posições variam POR degrau, sem nenhuma passar do teto do core', () => {
    // ⚠️ Não é mais um 8 uniforme (14/08): a ENTRADA tem 1 e o Iniciante 2D tem 7, porque o
    // curso-base saiu dele para o degrau novo. O `CAREER_SLOT_MAX` sobrevive como teto
    // EXTERNO (DTO e CHECK do banco), não como o número de toda etapa.
    expect(slotsForTier('primeiros-passos', '2d')).toBe(1)
    expect(slotsForTier('iniciante', '2d')).toBe(7)
    for (const option of COURSE_TIER_OPTIONS) {
      const slots = slotsForTier(option.level, option.track)
      expect(slots).toBeGreaterThan(0)
      expect(slots).toBeLessThanOrEqual(CAREER_SLOT_MAX)
    }
  })

  test('a carreira inteira continua somando 48 posições', () => {
    // O total é promessa de produto: a usuária escolheu 1 + 7 para nada mudar de tamanho.
    const total = COURSE_TIER_OPTIONS.reduce(
      (sum, option) => sum + slotsForTier(option.level, option.track),
      0,
    )
    expect(total).toBe(48)
  })
})

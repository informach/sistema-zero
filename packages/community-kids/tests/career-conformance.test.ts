import { describe, expect, test } from 'bun:test'
import { CREATOR_CAREER_LEVELS } from '../../core/src/career/catalog'
import { LEVEL_STUDY, LEVEL_TIER } from '../src/lib/career-map'

/**
 * Conformância do Mapa da Carreira kids × core. O kids NÃO importa o core em runtime —
 * ele ESPELHA a escada (`LEVEL_TIER` = `learningTier`; `LEVEL_STUDY` = os slots que cada
 * nível estuda + se inclui o bônus). Este teste torna o espelho executável, alcançando o
 * módulo PURO do core por caminho relativo (padrão do `badge-conformance`). Drift →
 * vermelho: se a escada do core mudar (ex.: dividir outro degrau), o kids precisa seguir.
 *
 * Derivação: `slots = próximoNível.requiredSlots[tier] \ esteNível.requiredSlots[tier]`;
 * `includeBonus` = este é o ÚLTIMO nível que estuda o tier (o próximo estuda outro).
 */
const sortNums = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b)

describe('career-map (kids) — conformância com a escada do core', () => {
  test('LEVEL_TIER == learningTier de CREATOR_CAREER_LEVELS', () => {
    for (const level of CREATOR_CAREER_LEVELS) {
      expect(LEVEL_TIER[level.slug]).toBe(level.learningTier)
    }
  })

  test('LEVEL_STUDY deriva de requiredSlots (slots estudados + bônus no último)', () => {
    CREATOR_CAREER_LEVELS.forEach((level, i) => {
      const tier = level.learningTier
      if (tier === null) {
        expect(LEVEL_STUDY[level.slug]).toBeNull()
        return
      }
      const next = CREATOR_CAREER_LEVELS[i + 1]
      const nextSlots = next?.requiredSlots[tier] ?? []
      const thisSlots = level.requiredSlots[tier] ?? []
      const studied = sortNums(nextSlots.filter((slot) => !thisSlots.includes(slot)))
      const includeBonus = next?.learningTier !== tier

      const actual = LEVEL_STUDY[level.slug]
      expect(actual).not.toBeNull()
      expect(sortNums(actual?.slots ?? [])).toEqual(studied)
      expect(actual?.includeBonus).toBe(includeBonus)
    })
  })
})

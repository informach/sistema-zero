import { describe, expect, test } from 'bun:test'
import {
  LEAGUE_MIN_PLAYERS,
  LEAGUE_TIERS,
  promotionCount,
  relegationCount,
  resolveTier,
  tierDown,
  tierUp,
} from '../../src/domain/gamification/league'

describe('tiers', () => {
  test('sobe/desce com clamp nas pontas', () => {
    expect(tierUp('bronze')).toBe('prata')
    expect(tierUp('diamante')).toBe('diamante') // topo não passa
    expect(tierDown('prata')).toBe('bronze')
    expect(tierDown('bronze')).toBe('bronze') // base não passa
  })
})

describe('resolveTier', () => {
  test('coorte pequena (< mínimo) → semana amistosa, mantém o tier', () => {
    expect(LEAGUE_MIN_PLAYERS).toBe(5)
    expect(resolveTier('prata', 1, 4)).toBe('prata') // 1º mas só 4 jogadores → fica
    expect(resolveTier('prata', 4, 4)).toBe('prata') // último também fica
  })

  test('coorte cheia: topo sobe, base cai, meio fica', () => {
    // 10 jogadores → 2 sobem (20%), 2 caem.
    expect(promotionCount(10)).toBe(2)
    expect(relegationCount(10)).toBe(2)
    expect(resolveTier('ouro', 1, 10)).toBe('platina') // topo sobe
    expect(resolveTier('ouro', 2, 10)).toBe('platina')
    expect(resolveTier('ouro', 5, 10)).toBe('ouro') // meio fica
    expect(resolveTier('ouro', 9, 10)).toBe('prata') // base cai
    expect(resolveTier('ouro', 10, 10)).toBe('prata')
  })

  test('clamp: campeão do diamante fica; lanterna do bronze fica', () => {
    expect(resolveTier('diamante', 1, 10)).toBe('diamante')
    expect(resolveTier('bronze', 10, 10)).toBe('bronze')
  })

  test('todos os tiers conhecidos', () => {
    expect(LEAGUE_TIERS).toEqual(['bronze', 'prata', 'ouro', 'platina', 'diamante'])
  })
})

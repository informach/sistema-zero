import { describe, expect, test } from 'bun:test'
import { careerNodeState, LEVEL_TIER, levelForTier, trilhaLocked } from '../src/lib/career-map'
import { LEVEL_ORDER } from '../src/lib/level-info'
import type { CatalogCourseView, StudentLevelView } from '../src/lib/types'

function course(over: Partial<CatalogCourseView>): CatalogCourseView {
  return {
    courseSlug: 'curso',
    title: 'Curso',
    subtitle: null,
    coverImageUrl: null,
    salesPageUrl: null,
    hasAccess: true,
    level: 'iniciante',
    track: '2d',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as CatalogCourseView
}

const levelView = (slug: StudentLevelView['slug']): StudentLevelView =>
  ({ slug, next: null, remaining: null }) as StudentLevelView

describe('career-map (regras puras do Mapa da Carreira)', () => {
  test('LEVEL_TIER espelha o learningTier do core (todos os níveis mapeados)', () => {
    expect(Object.keys(LEVEL_TIER)).toEqual([...LEVEL_ORDER])
    expect(LEVEL_TIER.noob).toBe('iniciante-2d')
    expect(LEVEL_TIER.coder).toBe('iniciante-2d')
    expect(LEVEL_TIER.god).toBeNull()
  })

  test('careerNodeState: atrás = done, igual = current, à frente = locked', () => {
    expect(careerNodeState('hacker', 'noob')).toBe('done')
    expect(careerNodeState('hacker', 'hacker')).toBe('current')
    expect(careerNodeState('hacker', 'god')).toBe('locked')
    // Slug desconhecido (nível novo no backend antes do deploy) → trata como Faísca.
    expect(careerNodeState('nivel-do-futuro', 'noob')).toBe('current')
    expect(careerNodeState('nivel-do-futuro', 'coder')).toBe('locked')
  })

  test('levelForTier devolve o 1º nível que estuda a trilha', () => {
    expect(levelForTier('iniciante-2d')).toBe('noob')
    expect(levelForTier('iniciante-3d')).toBe('hacker')
    expect(levelForTier('avancado-3d')).toBe('champion')
  })

  test('trilhaLocked: trava só trilha futura SEM curso liberado', () => {
    const lockedCourse = course({
      level: 'avancado',
      track: '3d',
      careerLock: { locked: true, reason: 'future-tier' },
    })
    // Faísca olhando avancado-3d, tudo travado → bloqueada.
    expect(trilhaLocked(levelView('noob'), 'avancado-3d', [lockedCourse])).toBe(true)
    // Nível alcançado → aberta (mesmo com curso travado na lista).
    expect(trilhaLocked(levelView('champion'), 'avancado-3d', [lockedCourse])).toBe(false)
    // EQUIPE/estado especial: algum curso do tier liberado → nunca mura.
    const openCourse = course({ level: 'avancado', track: '3d' })
    expect(trilhaLocked(levelView('noob'), 'avancado-3d', [openCourse])).toBe(false)
    // Sem gamificação (nível nulo) → não bloqueia (fallback fica com a página).
    expect(trilhaLocked(null, 'avancado-3d', [lockedCourse])).toBe(false)
  })
})

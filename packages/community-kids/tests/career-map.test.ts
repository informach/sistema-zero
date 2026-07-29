import { describe, expect, test } from 'bun:test'
import {
  careerNodeState,
  coursesForLevel,
  LEVEL_TIER,
  levelForTier,
  trilhaLocked,
} from '../src/lib/career-map'
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
})

describe('coursesForLevel (divisão do degrau por careerSlot)', () => {
  const ini2d = [
    course({ courseSlug: 'base', careerSlot: 1 }),
    course({ courseSlug: 'c2', careerSlot: 2 }),
    course({ courseSlug: 'c3', careerSlot: 3 }),
    course({ courseSlug: 'bonus', careerSlot: null }),
  ]

  test('Faísca (noob) mostra SÓ o curso-base (slot 1)', () => {
    expect(coursesForLevel('noob', ini2d).map((c) => c.courseSlug)).toEqual(['base'])
  })

  test('Construtor (coder) mostra o resto (2–8) + o bônus, sem o curso-base', () => {
    expect(
      coursesForLevel('coder', ini2d)
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['bonus', 'c2', 'c3'])
  })

  test('nível de degrau único (hacker) mostra o degrau inteiro (base + resto + bônus)', () => {
    const ini3d = [
      course({ courseSlug: 'b3', level: 'iniciante', track: '3d', careerSlot: 1 }),
      course({ courseSlug: 'x3', level: 'iniciante', track: '3d', careerSlot: 2 }),
      course({ courseSlug: 'bn3', level: 'iniciante', track: '3d', careerSlot: null }),
    ]
    expect(
      coursesForLevel('hacker', ini3d)
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['b3', 'bn3', 'x3'])
  })

  test('fail-open: SEM curso-base marcado, noob mostra o degrau inteiro (nunca vazio)', () => {
    const untagged = [
      course({ courseSlug: 'u1', careerSlot: null }),
      course({ courseSlug: 'u2', careerSlot: null }),
    ]
    expect(
      coursesForLevel('noob', untagged)
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['u1', 'u2'])
  })

  test('só considera cursos do degrau do próprio nível', () => {
    const mixed = [
      course({ courseSlug: 'base', careerSlot: 1 }),
      course({ courseSlug: 'other', level: 'avancado', track: '3d', careerSlot: 1 }),
    ]
    expect(coursesForLevel('noob', mixed).map((c) => c.courseSlug)).toEqual(['base'])
  })

  test('Lenda (god) mostra só os cursos de NÍVEL lenda (bônus da formatura, fora da carreira)', () => {
    const mix = [
      course({ courseSlug: 'lenda1', level: 'lenda', track: '2d', careerSlot: null }),
      course({ courseSlug: 'av3d', level: 'avancado', track: '3d', careerSlot: 3 }),
      course({ courseSlug: 'av3d-bonus', level: 'avancado', track: '3d', careerSlot: null }),
      course({ courseSlug: 'lenda2', level: 'lenda', track: '3d', careerSlot: null }),
    ]
    expect(
      coursesForLevel('god', mix)
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['lenda1', 'lenda2'])
  })

  test('sem curso de nível lenda → trilha da Lenda vazia', () => {
    expect(coursesForLevel('god', ini2d)).toEqual([])
  })
})

describe('trilhaLocked (deep-link por nível)', () => {
  test('trava só nível FUTURO sem nenhum curso liberado', () => {
    const lockedCourse = course({
      level: 'avancado',
      track: '3d',
      careerLock: { locked: true, reason: 'future-tier' },
    })
    // Faísca olhando a trilha do Gênio (avançado 3D), tudo travado → bloqueada.
    expect(trilhaLocked(levelView('noob'), 'champion', [lockedCourse])).toBe(true)
    // Nível alcançado → aberta (mesmo com curso travado na lista).
    expect(trilhaLocked(levelView('champion'), 'champion', [lockedCourse])).toBe(false)
    // EQUIPE/estado especial: algum curso do nível liberado → nunca mura.
    const openCourse = course({ level: 'avancado', track: '3d' })
    expect(trilhaLocked(levelView('noob'), 'champion', [openCourse])).toBe(false)
    // Sem gamificação (nível nulo) → não bloqueia (fallback fica com a página).
    expect(trilhaLocked(null, 'champion', [lockedCourse])).toBe(false)
  })
})

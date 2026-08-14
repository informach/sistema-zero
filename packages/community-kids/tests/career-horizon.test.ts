import { describe, expect, test } from 'bun:test'
import {
  careerHorizon,
  careerProgress,
  hasHorizonNode,
  levelsBeyondHorizon,
  nextLevelHintWithin,
  readySlotsByTier,
  TIER_ORDER,
  visibleCareerLevels,
} from '../src/lib/career-horizon'
import { LEVEL_ORDER } from '../src/lib/level-info'
import type { CatalogCourseView, StudentLevelSlug, StudentLevelView } from '../src/lib/types'

/**
 * O horizonte é a régua PROVISÓRIA: enquanto o catálogo não tem os 48 cursos, o mapa mostra
 * só o que dá para alcançar e o contador conta só o que existe. O teste que mais importa é o
 * do CATÁLOGO CHEIO — é ele que garante que a visão definitiva volta sozinha, sem ninguém
 * lembrar de desligar nada.
 */

type Track = NonNullable<CatalogCourseView['track']>
type Level = NonNullable<CatalogCourseView['level']>

let seq = 0
function course(level: Level, track: Track, careerSlot: number | null): CatalogCourseView {
  seq += 1
  return {
    courseSlug: `curso-${seq}`,
    title: `Curso ${seq}`,
    subtitle: null,
    coverImageUrl: null,
    hasAccess: true,
    level,
    track,
    careerSlot,
    salesPageUrl: null,
  }
}

/** Os 8 cursos de um degrau (posições 1..8). */
function fullTier(level: Level, track: Track): CatalogCourseView[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((slot) => course(level, track, slot))
}

/** O catálogo COMPLETO da carreira: 6 degraus × 8 posições = 48. */
function fullCatalog(): CatalogCourseView[] {
  return [
    ...fullTier('iniciante', '2d'),
    ...fullTier('iniciante', '3d'),
    ...fullTier('intermediario', '2d'),
    ...fullTier('intermediario', '3d'),
    ...fullTier('avancado', '2d'),
    ...fullTier('avancado', '3d'),
  ]
}

/** `remaining` como o members devolve: quanto falta por degrau para o PRÓXIMO nível. */
function studentLevel(
  slug: StudentLevelSlug,
  next: StudentLevelSlug | null,
  remaining: Partial<Record<(typeof TIER_ORDER)[number], number>> = {},
): StudentLevelView {
  if (!next) return { slug, next: null, remaining: null }
  return {
    slug,
    next,
    remaining: {
      any: 0,
      'iniciante-2d': 0,
      'iniciante-3d': 0,
      'intermediario-2d': 0,
      'intermediario-3d': 0,
      'avancado-2d': 0,
      'avancado-3d': 0,
      ...remaining,
    },
  }
}

describe('careerHorizon', () => {
  test('catálogo vazio para na entrada (Faísca)', () => {
    expect(careerHorizon([])).toBe('noob')
  })

  test('só o curso-base do Iniciante 2D alcança o Construtor', () => {
    expect(careerHorizon([course('iniciante', '2d', 1)])).toBe('coder')
  })

  test('degrau incompleto não passa do Construtor', () => {
    const courses = [1, 2, 3].map((slot) => course('iniciante', '2d', slot))
    expect(careerHorizon(courses)).toBe('coder')
  })

  test('Iniciante 2D inteiro alcança o Inventor', () => {
    expect(careerHorizon(fullTier('iniciante', '2d'))).toBe('hacker')
  })

  test('curso bônus (sem posição) NÃO move o horizonte', () => {
    const courses = [...fullTier('iniciante', '2d'), course('iniciante', '2d', null)]
    expect(careerHorizon(courses)).toBe('hacker')
  })

  test('curso de nível Lenda NÃO move o horizonte', () => {
    const courses = [course('iniciante', '2d', 1), course('lenda', '2d', null)]
    expect(careerHorizon(courses)).toBe('coder')
  })

  test('degrau posterior completo não pula o buraco do anterior', () => {
    // Iniciante 3D inteiro, mas o Iniciante 2D só tem a base: para no Construtor.
    const courses = [course('iniciante', '2d', 1), ...fullTier('iniciante', '3d')]
    expect(careerHorizon(courses)).toBe('coder')
  })

  test('⭐ catálogo DESCONHECIDO (busca falhou) não encolhe nada', () => {
    // Soluço de rede não pode tirar posto conquistado da tela: sem catálogo, cai na
    // visão definitiva (os 8 postos e os números crus do members).
    expect(careerHorizon(null)).toBe('god')
    expect(visibleCareerLevels('noob', careerHorizon(null))).toEqual(LEVEL_ORDER)
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    expect(careerProgress(level, null)).toMatchObject({
      kind: 'pending',
      remaining: 7,
      done: 1,
      ready: 8,
    })
  })

  test('⭐ catálogo COMPLETO chega na Lenda — a visão definitiva volta sozinha', () => {
    const all = fullCatalog()
    expect(careerHorizon(all)).toBe('god')
    const visible = visibleCareerLevels('noob', careerHorizon(all))
    expect(visible).toEqual(LEVEL_ORDER)
    expect(hasHorizonNode(visible)).toBe(false)
    expect(levelsBeyondHorizon(visible)).toEqual([])
  })
})

describe('visibleCareerLevels', () => {
  test('mostra até o horizonte', () => {
    expect(visibleCareerLevels('noob', 'coder')).toEqual(['noob', 'coder'])
    expect(hasHorizonNode(visibleCareerLevels('noob', 'coder'))).toBe(true)
  })

  test('nunca corta o nível do aluno (equipe resolve como Lenda)', () => {
    expect(visibleCareerLevels('god', 'coder')).toEqual(LEVEL_ORDER)
  })

  test('slug desconhecido não quebra o mapa', () => {
    expect(visibleCareerLevels('inexistente', 'coder')).toEqual(['noob', 'coder'])
  })

  test('os postos além do horizonte são o conteúdo do painel', () => {
    const visible = visibleCareerLevels('noob', 'coder')
    expect(levelsBeyondHorizon(visible)).toEqual([
      'hacker',
      'explorer',
      'elite',
      'architect',
      'champion',
      'god',
    ])
  })
})

describe('readySlotsByTier', () => {
  test('agrupa por degrau e ignora bônus', () => {
    const ready = readySlotsByTier([
      course('iniciante', '2d', 1),
      course('iniciante', '2d', 3),
      course('iniciante', '3d', 1),
      course('iniciante', '2d', null),
    ])
    expect([...(ready.get('iniciante-2d') ?? [])].sort()).toEqual([1, 3])
    expect([...(ready.get('iniciante-3d') ?? [])]).toEqual([1])
  })

  test('track ausente conta como 2d (members antigo)', () => {
    const legacy = { ...course('iniciante', '2d', 1), track: undefined }
    expect(readySlotsByTier([legacy]).get('iniciante-2d')?.has(1)).toBe(true)
  })
})

describe('careerProgress', () => {
  test('Faísca com o curso-base publicado: falta 1 (e ele existe)', () => {
    const level = studentLevel('noob', 'coder', { 'iniciante-2d': 1 })
    const progress = careerProgress(level, [course('iniciante', '2d', 1)])
    expect(progress).toMatchObject({ kind: 'pending', remaining: 1, done: 0, ready: 1 })
  })

  test('⭐ Construtor com só o curso-base no catálogo fica EM DIA, não "faltam 7"', () => {
    // O members diz que faltam 7 posições para o Inventor; nenhuma delas foi gravada.
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    expect(careerProgress(level, [course('iniciante', '2d', 1)])).toEqual({ kind: 'up-to-date' })
  })

  test('Construtor com 3 cursos gravados e 1 feito: faltam 2, não 7', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    const courses = [1, 2, 3].map((slot) => course('iniciante', '2d', slot))
    expect(careerProgress(level, courses)).toMatchObject({
      kind: 'pending',
      remaining: 2,
      done: 1,
      ready: 3,
    })
  })

  test('curso despublicado depois de qualificado não gera número negativo', () => {
    // Fez 3, mas só 2 seguem publicados: o clamp segura em "em dia".
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 5 })
    const courses = [1, 2].map((slot) => course('iniciante', '2d', slot))
    expect(careerProgress(level, courses)).toEqual({ kind: 'up-to-date' })
  })

  test('pega o PRIMEIRO degrau pendente na ordem da carreira', () => {
    const level = studentLevel('hacker', 'explorer', { 'iniciante-3d': 8 })
    const courses = [...fullTier('iniciante', '2d'), ...fullTier('iniciante', '3d')]
    expect(careerProgress(level, courses)).toMatchObject({
      kind: 'pending',
      tier: 'iniciante-3d',
      ready: 8,
    })
  })

  test('degrau pendente sem curso gravado é "em dia" mesmo com degrau posterior cheio', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    const courses = [course('iniciante', '2d', 1), ...fullTier('iniciante', '3d')]
    expect(careerProgress(level, courses)).toEqual({ kind: 'up-to-date' })
  })

  test('Lenda não tem próximo nível', () => {
    expect(careerProgress(studentLevel('god', null), fullCatalog())).toEqual({ kind: 'top' })
    expect(careerProgress(null, fullCatalog())).toEqual({ kind: 'top' })
  })
})

describe('nextLevelHintWithin', () => {
  test('singular e plural saem com o número do CATÁLOGO', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    const um = [1, 2].map((slot) => course('iniciante', '2d', slot))
    expect(nextLevelHintWithin(level, um)).toBe(
      'Falta 1 curso Iniciante 2D da carreira concluído e o projeto publicado no Mural para virar Inventor(a)',
    )
    const dois = [1, 2, 3].map((slot) => course('iniciante', '2d', slot))
    expect(nextLevelHintWithin(level, dois)).toContain('Faltam 2 cursos Iniciante 2D')
  })

  test('em dia e topo não têm frase (a UI mostra a própria)', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    expect(nextLevelHintWithin(level, [course('iniciante', '2d', 1)])).toBeNull()
    expect(nextLevelHintWithin(studentLevel('god', null), fullCatalog())).toBeNull()
  })
})

describe('TIER_ORDER', () => {
  test('são os 6 degraus na ordem da carreira, sem repetir', () => {
    expect(TIER_ORDER).toEqual([
      'iniciante-2d',
      'iniciante-3d',
      'intermediario-2d',
      'intermediario-3d',
      'avancado-2d',
      'avancado-3d',
    ])
  })
})

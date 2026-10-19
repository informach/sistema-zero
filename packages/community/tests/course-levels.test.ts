import { describe, expect, test } from 'bun:test'
import {
  countWords,
  courseKicker,
  greetingFor,
  groupByLevel,
  isCourseDone,
  isTrack,
  levelLabel,
  summarizeTrack,
  trackOf,
} from '../src/lib/course-levels'
import { lessonNumbers, moduleNumber, nextLessonOf } from '../src/lib/course-outline'
import type { ModuleOutlineView } from '../src/lib/types'

describe('níveis e trilhas', () => {
  test('rótulos de nível na ordem da trilha, com a Lenda como Extra', () => {
    expect(levelLabel('primeiros-passos')).toBe('Primeiros passos')
    expect(levelLabel('intermediario')).toBe('Intermediário')
    expect(levelLabel('lenda')).toBe('Extra')
  })

  test('curso sem eixo ou nível (members antigo) cai em 2D Iniciante', () => {
    expect(trackOf({})).toBe('2d')
    expect(courseKicker({})).toBe('Jogos 2D · Iniciante')
    expect(courseKicker({ track: '3d', level: 'avancado' })).toBe('Jogos 3D · Avançado')
  })

  test('só 2d e 3d são trilhas', () => {
    expect(isTrack('2d')).toBe(true)
    expect(isTrack('3d')).toBe(true)
    expect(isTrack('lenda')).toBe(false)
  })

  test('agrupa na ordem da trilha e omite nível vazio', () => {
    const groups = groupByLevel([
      { slug: 'b', level: 'lenda' as const },
      { slug: 'a', level: 'iniciante' as const },
      { slug: 'c', level: 'primeiros-passos' as const },
      { slug: 'd' },
    ])
    expect(groups.map((group) => group.level)).toEqual(['primeiros-passos', 'iniciante', 'lenda'])
    expect(groups[1]?.courses.map((course) => course.slug)).toEqual(['a', 'd'])
  })

  test('concluído pelo marco ou por todas as aulas, nunca por curso vazio', () => {
    expect(isCourseDone({ milestones: { completed: true } })).toBe(true)
    expect(isCourseDone({ progress: { completedLessons: 6, totalLessons: 6 } })).toBe(true)
    expect(isCourseDone({ progress: { completedLessons: 4, totalLessons: 10 } })).toBe(false)
    expect(isCourseDone({ progress: { completedLessons: 0, totalLessons: 0 } })).toBe(false)
    expect(isCourseDone({})).toBe(false)
  })

  test('saudação pela hora de São Paulo', () => {
    expect(greetingFor(new Date('2026-10-19T11:00:00Z'))).toBe('Bom dia')
    expect(greetingFor(new Date('2026-10-19T17:30:00Z'))).toBe('Boa tarde')
    expect(greetingFor(new Date('2026-10-19T23:30:00Z'))).toBe('Boa noite')
    expect(greetingFor(new Date('2026-10-19T06:00:00Z'))).toBe('Boa noite')
  })
})

const lesson = (id: string, completed: boolean, locked: boolean) => ({
  id,
  slug: id,
  title: id,
  sortOrder: 0,
  estimatedMinutes: 20,
  completed,
  locked,
})
const modules: ModuleOutlineView[] = [
  {
    id: 'm1',
    title: 'Comece aqui',
    summary: null,
    sortOrder: 0,
    chest: null,
    lessons: [lesson('a', true, false)],
  },
  {
    id: 'm2',
    title: 'A nave',
    summary: null,
    sortOrder: 1,
    chest: null,
    lessons: [lesson('b', true, false), lesson('c', false, false), lesson('d', false, true)],
  },
]

describe('índice do curso', () => {
  test('numera as aulas no curso inteiro e os módulos com dois dígitos', () => {
    expect([...lessonNumbers(modules).entries()]).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 4],
    ])
    expect(moduleNumber(0)).toBe('01')
  })

  test('continua pela aula do servidor, senão pela primeira liberada não concluída', () => {
    expect(nextLessonOf({ continueLessonId: 'b', modules })?.number).toBe(2)
    const next = nextLessonOf({ continueLessonId: null, modules })
    expect(next?.lesson.id).toBe('c')
    expect(next?.moduleIndex).toBe(1)
    expect(nextLessonOf({ continueLessonId: 'sumiu', modules })?.lesson.id).toBe('c')
    expect(nextLessonOf({ continueLessonId: null, modules: [] })).toBeNull()
  })
})

describe('resumo da trilha', () => {
  const done = { completedLessons: 6, totalLessons: 6 }
  const half = { completedLessons: 4, totalLessons: 10 }
  const courses = [
    { slug: 'cade', level: 'primeiros-passos' as const, progress: done },
    { slug: 'nave', level: 'iniciante' as const, progress: half },
    { slug: 'dino', level: 'iniciante' as const, progress: null },
    { slug: 'lenda', level: 'lenda' as const, progress: null },
    { slug: 'tres-d', level: 'iniciante' as const, track: '3d' as const, progress: null },
  ]

  test('conta os concluídos por nível e marca o nível atual', () => {
    const summary = summarizeTrack(courses, '2d')
    expect(summary.courses).toHaveLength(4)
    expect(summary.done).toBe(1)
    expect(summary.currentLevel).toBe('iniciante')
    expect(summary.levels.map((level) => [level.level, level.done, level.state])).toEqual([
      ['primeiros-passos', 1, 'done'],
      ['iniciante', 0, 'current'],
      ['lenda', 0, 'upcoming'],
    ])
  })

  test('a Extra só vira o nível atual depois da escada; tudo feito não tem nível atual', () => {
    const ladderDone = courses.map((course) =>
      course.level === 'lenda' ? course : { ...course, progress: done },
    )
    expect(summarizeTrack(ladderDone, '2d').currentLevel).toBe('lenda')
    const allDone = courses.map((course) => ({ ...course, progress: done }))
    expect(summarizeTrack(allDone, '2d').currentLevel).toBeNull()
  })

  test('curso fora do acesso não decide o nível atual', () => {
    const withLocked = [
      { slug: 'trancado', level: 'primeiros-passos' as const, progress: null, hasAccess: false },
      { slug: 'nave', level: 'iniciante' as const, progress: half, hasAccess: true },
    ]
    const summary = summarizeTrack(withLocked, '2d')
    expect(summary.currentLevel).toBe('iniciante')
    expect(summary.levels.map((level) => level.state)).toEqual(['upcoming', 'current'])
    expect(summary.finished).toBe(false)
    expect(summary.owned).toBe(1)
    const onlyLocked = summarizeTrack([withLocked[0] as (typeof withLocked)[number]], '2d')
    expect(onlyLocked.currentLevel).toBeNull()
    expect(onlyLocked.finished).toBe(false)
    expect(onlyLocked.owned).toBe(0)
  })

  test('contagem por extenso até dez', () => {
    expect(countWords(1, 'curso', 'cursos')).toBe('um curso')
    expect(countWords(4, 'curso', 'cursos')).toBe('quatro cursos')
    expect(countWords(12, 'curso', 'cursos')).toBe('12 cursos')
  })
})

import { describe, expect, test } from 'bun:test'
import { balloonLabel, buildTrail } from '../src/components/kids/trail-layout'
import type { CourseDetailView, LessonOutlineView, ModuleOutlineView } from '../src/lib/types'

function lesson(id: string, completed: boolean, locked = false): LessonOutlineView {
  return {
    id,
    slug: id,
    title: `Aula ${id}`,
    sortOrder: 0,
    estimatedMinutes: null,
    completed,
    locked,
  }
}

function moduleOf(id: string, lessons: LessonOutlineView[]): ModuleOutlineView {
  return { id, title: `Módulo ${id}`, summary: null, sortOrder: 0, lessons }
}

function course(modules: ModuleOutlineView[]): CourseDetailView {
  const all = modules.flatMap((m) => m.lessons)
  const completedLessons = all.filter((l) => l.completed).length
  return {
    slug: 'curso-teste',
    title: 'Curso Teste',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    access: { accessType: 'course', expiresAt: null },
    progress: {
      completedLessons,
      totalLessons: all.length,
      percent: all.length > 0 ? Math.round((completedLessons / all.length) * 100) : 0,
      lastCompletedAt: null,
    },
    continueLessonId: null,
    myRating: null,
    salesPageUrl: null,
    modules,
  }
}

describe('buildTrail', () => {
  test('offsets seguem o padrão cíclico com índice GLOBAL (aulas E baús na sequência)', () => {
    const c = course([
      moduleOf('m1', [lesson('a', true), lesson('b', true), lesson('c', false)]),
      moduleOf('m2', [
        lesson('d', false),
        lesson('e', false),
        lesson('f', false),
        lesson('g', false),
        lesson('h', false),
        lesson('i', false),
      ]),
    ])
    // O baú de fim de unidade TAMBÉM avança o índice do serpenteado.
    const offsets = buildTrail(c).flatMap((u) => [...u.nodes.map((n) => n.offset), u.chest.offset])
    expect(offsets).toEqual([0, 1, 2, 1, 0, -1, -2, -1, 0, 1, 2])
    // Colunas consecutivas sempre diferem de 1 (conectores diagonais).
    for (let i = 1; i < offsets.length; i++) {
      expect(Math.abs((offsets[i] as number) - (offsets[i - 1] as number))).toBe(1)
    }
  })

  test('baú abre só com TODAS as aulas do módulo concluídas', () => {
    const c = course([
      moduleOf('m1', [lesson('a', true), lesson('b', true)]),
      moduleOf('m2', [lesson('c', true), lesson('d', false)]),
    ])
    const units = buildTrail(c)
    expect(units[0]?.chest).toMatchObject({ opened: true })
    expect(units[1]?.chest).toMatchObject({ opened: false })
  })

  test('módulo SEM aula publicada não vira unidade (nem banner, nem baú)', () => {
    const c = course([
      moduleOf('m1', [lesson('a', true)]),
      moduleOf('em-preparo', []),
      moduleOf('m3', [lesson('b', false)]),
    ])
    const units = buildTrail(c)
    expect(units.map((u) => u.module.id)).toEqual(['m1', 'm3'])
    // O título do módulo em preparo não vaza para a criança em lugar nenhum.
    expect(units.some((u) => u.module.title.includes('em-preparo'))).toBe(false)
  })

  test('unidade vazia no MEIO não abre buraco na numeração nem no serpenteado', () => {
    const c = course([
      moduleOf('m1', [lesson('a', false), lesson('b', false)]),
      moduleOf('vazio', []),
      moduleOf('m3', [lesson('c', false)]),
    ])
    const units = buildTrail(c)
    // Tema pelo índice do que APARECE: a 2ª unidade visível é a 2ª cor, não a 3ª.
    expect(units.map((u) => u.theme)).toEqual(['cyan', 'lime'])
    // E as colunas seguem contíguas: aulas + baú de m1, depois m3.
    const offsets = units.flatMap((u) => [...u.nodes.map((n) => n.offset), u.chest.offset])
    expect(offsets).toEqual([0, 1, 2, 1, 0])
  })

  test('curso inteiro sem aula publicada não desenha trilha nenhuma', () => {
    expect(buildTrail(course([moduleOf('m1', []), moduleOf('m2', [])]))).toEqual([])
  })

  test('current é a PRIMEIRA não concluída do curso inteiro — e é única', () => {
    const c = course([
      moduleOf('m1', [lesson('a', true), lesson('b', false)]),
      moduleOf('m2', [lesson('c', false)]),
    ])
    const nodes = buildTrail(c).flatMap((u) => u.nodes)
    expect(nodes.map((n) => n.state)).toEqual(['done', 'current', 'todo'])
  })

  test('aulas travadas viram nó locked; current é a 1ª não concluída e LIBERADA', () => {
    const c = course([
      moduleOf('m1', [lesson('a', true), lesson('b', false, false), lesson('c', false, true)]),
    ])
    const nodes = buildTrail(c).flatMap((u) => u.nodes)
    expect(nodes.map((n) => n.state)).toEqual(['done', 'current', 'locked'])
  })

  test('curso 100% concluído não tem nó current', () => {
    const c = course([moduleOf('m1', [lesson('a', true), lesson('b', true)])])
    const nodes = buildTrail(c).flatMap((u) => u.nodes)
    expect(nodes.every((n) => n.state === 'done')).toBe(true)
  })

  test('temas alternam cyan → lime → rosa → verde → grad e reiniciam por unidade', () => {
    const c = course([
      moduleOf('m1', [lesson('a', false)]),
      moduleOf('m2', [lesson('b', false)]),
      moduleOf('m3', [lesson('c', false)]),
      moduleOf('m4', [lesson('d', false)]),
      moduleOf('m5', [lesson('e', false)]),
      moduleOf('m6', [lesson('f', false)]),
    ])
    expect(buildTrail(c).map((u) => u.theme)).toEqual([
      'cyan',
      'lime',
      'rosa',
      'verde',
      'grad',
      'cyan',
    ])
  })
})

describe('balloonLabel', () => {
  test('nada concluído → Começar; algo concluído → Continuar', () => {
    expect(balloonLabel(course([moduleOf('m1', [lesson('a', false)])]))).toBe('Começar')
    expect(balloonLabel(course([moduleOf('m1', [lesson('a', true), lesson('b', false)])]))).toBe(
      'Continuar',
    )
  })
})

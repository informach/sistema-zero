import { describe, expect, test } from 'bun:test'
import {
  type CurrentLesson,
  type CurrentModule,
  planDesafioCourse,
} from '../../scripts/lib/desafio-course-plan'

const modules: CurrentModule[] = [
  { id: 'm1', title: 'Módulo 1', summary: null, sortOrder: 0 },
  { id: 'm2', title: 'Módulo 2', summary: null, sortOrder: 1 },
  { id: 'm3', title: 'Módulo 3', summary: null, sortOrder: 2 },
]

const lessons: CurrentLesson[] = [
  {
    id: 'welcome',
    moduleId: 'm1',
    slug: 'boas-vindas',
    title: 'Onde fica cada coisa',
    sortOrder: 0,
  },
  { id: 'day1', moduleId: 'm2', slug: 'dia-1', title: 'Dia 1', sortOrder: 0 },
  { id: 'day2', moduleId: 'm2', slug: 'dia-2', title: 'Dia 2', sortOrder: 1 },
  { id: 'day3', moduleId: 'm2', slug: 'dia-3', title: 'Dia 3', sortOrder: 2 },
  { id: 'day4', moduleId: 'm2', slug: 'dia-4', title: 'Dia 4', sortOrder: 3 },
  { id: 'day5', moduleId: 'm2', slug: 'dia-5', title: 'Dia 5', sortOrder: 4 },
  { id: 'certificate', moduleId: 'm3', slug: 'certificado', title: 'Certificado', sortOrder: 0 },
]

describe('plano de reorganização do Desafio', () => {
  test('staging sem caderno e mapa move os dias e configura módulos', () => {
    const plan = planDesafioCourse(modules, lessons)
    expect(plan.deletions).toEqual([])
    expect(
      plan.lessons.map((lesson) => [lesson.key, lesson.to.moduleId, lesson.to.sortOrder]),
    ).toEqual([
      ['welcome', 'm1', 0],
      ['day1', 'm1', 1],
      ['day2', 'm2', 0],
      ['day3', 'm2', 1],
      ['day4', 'm3', 0],
      ['day5', 'm3', 1],
      ['certificate', 'm3', 2],
    ])
    expect(plan.modules.map((module) => module.to.title)).toEqual([
      'A nave ganha vida',
      'Tiros e asteroides',
      'O jogo completo e a conquista',
    ])
  })

  test('produção com as aulas antigas exclui só caderno, mapa e Continue criando', () => {
    const oldLessons: CurrentLesson[] = [
      ...lessons,
      { id: 'notebook', moduleId: 'm1', slug: 'caderno', title: 'Caderno do Aluno', sortOrder: 1 },
      { id: 'parents', moduleId: 'm1', slug: 'mapa', title: 'Mapa dos Pais', sortOrder: 2 },
      {
        id: 'continue',
        moduleId: 'm3',
        slug: 'continue-criando',
        title: 'Continue criando',
        sortOrder: 1,
      },
    ]
    const plan = planDesafioCourse(modules, oldLessons)
    expect(plan.deletions.map((lesson) => lesson.id).sort()).toEqual([
      'continue',
      'notebook',
      'parents',
    ])
    expect(plan.lessons.find((lesson) => lesson.key === 'certificate')?.id).toBe('certificate')
  })

  test('segunda execução com a estrutura pronta não propõe mudanças', () => {
    const first = planDesafioCourse(modules, lessons)
    const currentModules = modules.map((module, index) => ({
      ...module,
      ...first.modules[index]!.to,
    }))
    const currentLessons = lessons.map((lesson) => {
      const move = first.lessons.find((item) => item.id === lesson.id)!
      return { ...lesson, ...move.to }
    })
    expect(planDesafioCourse(currentModules, currentLessons).changed).toBe(false)
  })

  test('quarto módulo antigo com certificado é eliminado depois da mudança', () => {
    const oldEnding = {
      id: 'm4',
      title: 'Encerramento antigo',
      summary: null,
      sortOrder: 3,
    }
    const oldLessons = lessons.map((lesson) =>
      lesson.id === 'certificate' ? { ...lesson, moduleId: 'm4' } : lesson,
    )
    const plan = planDesafioCourse(
      [...modules, oldEnding],
      [
        ...oldLessons,
        {
          id: 'continue',
          moduleId: 'm4',
          slug: 'continue-criando',
          title: 'Continue criando',
          sortOrder: 1,
        },
      ],
    )
    expect(plan.removeOldEndingModule).toEqual({ id: 'm4', title: 'Encerramento antigo' })
    expect(plan.lessons.find((lesson) => lesson.key === 'certificate')?.to.moduleId).toBe('m3')
    expect(plan.deletions.map((lesson) => lesson.id)).toEqual(['continue'])
  })

  test('títulos conhecidos identificam aulas mesmo com slugs antigos', () => {
    const legacyLessons = lessons.map((lesson) => {
      if (lesson.id === 'day1')
        return { ...lesson, slug: 'primeira-aula', title: 'A nave ganha vida' }
      if (lesson.id === 'certificate')
        return { ...lesson, slug: 'final-antigo', title: 'Imprima seu certificado' }
      return lesson
    })
    const plan = planDesafioCourse(modules, legacyLessons)
    expect(plan.lessons.find((lesson) => lesson.key === 'day1')?.id).toBe('day1')
    expect(plan.lessons.find((lesson) => lesson.key === 'certificate')?.id).toBe('certificate')
  })

  test('aula inesperada, dia ausente ou módulos extras interrompem o plano', () => {
    expect(() =>
      planDesafioCourse(modules, [
        ...lessons,
        { id: 'extra', moduleId: 'm3', slug: 'outra-aula', title: 'Outra', sortOrder: 2 },
      ]),
    ).toThrow('Aulas inesperadas')
    expect(() =>
      planDesafioCourse(
        modules,
        lessons.filter((lesson) => lesson.id !== 'day4'),
      ),
    ).toThrow('Aula obrigatória day4')
    expect(() => planDesafioCourse(modules.slice(0, 2), lessons)).toThrow('3 módulos')
  })

  test('mais de um certificado interrompe a operação', () => {
    expect(() =>
      planDesafioCourse(modules, [
        ...lessons,
        {
          id: 'other',
          moduleId: 'm3',
          slug: 'meu-certificado',
          title: 'Meu certificado',
          sortOrder: 1,
        },
      ]),
    ).toThrow('Aula obrigatória certificate')
  })
})

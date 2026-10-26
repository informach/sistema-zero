import { expect, test } from 'bun:test'
import { CourseJourneyLockedError } from '../../src/domain/course/course.errors'

/** O recado do 423 diz o que abre o curso, pelo papel dele na Jornada do Criador. */

test('o curso 3D da trilha pede o curso 2D', () => {
  const error = new CourseJourneyLockedError('foundation-first', undefined, {
    role: 'base3d',
    level: 'noob',
  })
  expect(error.message).toBe('Conclua o curso 2D da trilha para começar a versão 3D.')
})

test('missão, Poderes e extras pedem os dois cursos da trilha', () => {
  const error = new CourseJourneyLockedError('foundation-first', undefined, {
    role: 'power',
    level: 'coder',
    mechanicId: 'timer',
  })
  expect(error.message).toBe(
    'Conclua os cursos 2D e 3D da trilha para abrir a missão, os Poderes e os extras.',
  )
})

test('um curso de Maestria não manda concluir os cursos da trilha', () => {
  for (const role of ['mastery-nucleus', 'mastery-workshop', 'mastery-project'] as const) {
    const error = new CourseJourneyLockedError('foundation-first', undefined, {
      role,
      level: null,
      masteryId: 'arte2d',
      masteryLevel: 2,
    })
    expect(error.message).toBe(
      'Conclua o nível anterior ou a entrada desta Maestria para abrir este curso.',
    )
  }
})

test('sem currículo, a frase histórica continua', () => {
  expect(new CourseJourneyLockedError('future-tier').message).toBe(
    'Continue sua jornada para liberar este curso',
  )
})

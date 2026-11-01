import { expect, test } from 'bun:test'
import { CoursePublicationJobViewSchema } from './publication'

const id = '11111111-1111-4111-a111-111111111111'
const view = {
  id,
  operation: 'copy-adult',
  status: 'preparing',
  version: 2,
  planHash: 'a'.repeat(64),
  preview: {
    source: { id, title: 'Busca', slug: 'busca', environment: 'staging' },
    target: {
      id,
      title: 'Busca',
      slug: 'busca-adulto',
      environment: 'staging',
      audience: 'adult',
      exists: true,
    },
    modules: 1,
    lessons: 3,
    retiredModules: 0,
    retiredLessons: 1,
  },
  tasks: { completed: 1, total: 2 },
  error: null,
  createdAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:01.000Z',
}
test('a visão do Admin aceita só a prévia e o progresso, sem captura ou posse do worker', () => {
  expect(CoursePublicationJobViewSchema.safeParse(view).success).toBe(true)
  expect(
    CoursePublicationJobViewSchema.safeParse({ ...view, snapshot: { private: 'conteúdo' } })
      .success,
  ).toBe(false)
  expect(CoursePublicationJobViewSchema.safeParse({ ...view, leaseToken: id }).success).toBe(false)
})
test('uma resposta concluída não pode esconder recursos pendentes', () => {
  expect(CoursePublicationJobViewSchema.safeParse({ ...view, status: 'completed' }).success).toBe(
    false,
  )
  expect(
    CoursePublicationJobViewSchema.safeParse({
      ...view,
      status: 'completed',
      tasks: { completed: 2, total: 2 },
    }).success,
  ).toBe(true)
  expect(
    CoursePublicationJobViewSchema.safeParse({ ...view, tasks: { completed: 3, total: 2 } })
      .success,
  ).toBe(false)
})

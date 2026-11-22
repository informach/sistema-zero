import { describe, expect, test } from 'bun:test'
import { buildApp, grantAllKidsCourses, grantLifetime, seedSampleCourse } from '../helpers'

const ACCOUNT = 'a0000000-0000-4000-8000-000000000001'
const CHILD = 'b0000000-0000-4000-8000-000000000002'
const OTHER = 'c0000000-0000-4000-8000-000000000003'

describe('responsáveis como alunos no Time', () => {
  test('matrícula específica para pais aparece na conta antes de começar, sem cair no filho', async () => {
    const env = buildApp()
    const parent = seedSampleCourse(env.courses, 'curso-pais', 'published', 'kids')
    const course = env.courses.courses.find((c) => c.id === parent.courseId)
    if (!course) throw new Error('Curso não encontrado')
    course.learner = 'parents'
    grantLifetime(env.entitlements, { userId: ACCOUNT, courseRef: parent.slug })
    const response = await env.app.handle(
      new Request(`http://localhost/members/admin/members/${ACCOUNT}?profileIds=${CHILD}`),
    )
    expect(response.status).toBe(200)
    const detail = await response.json()
    expect(detail.progress).toEqual([
      expect.objectContaining({
        courseRef: parent.slug,
        audience: 'kids',
        learner: 'parents',
        completedLessons: 0,
        lastActivityAt: null,
      }),
    ])
    expect(detail.profilesProgress).toEqual([{ userId: CHILD, progress: [] }])
  })

  test('a lista de pais inclui chave-mestra ganha e curso específico, sem misturar matrícula adulta', async () => {
    const env = buildApp()
    const parent = seedSampleCourse(env.courses, 'pais', 'published', 'kids')
    const course = env.courses.courses.find((c) => c.id === parent.courseId)
    if (!course) throw new Error('Curso não encontrado')
    course.learner = 'parents'
    const adult = seedSampleCourse(env.courses, 'adulto', 'published', 'adult')
    grantAllKidsCourses(env.entitlements, { userId: ACCOUNT })
    grantLifetime(env.entitlements, { userId: CHILD, courseRef: parent.slug })
    grantLifetime(env.entitlements, { userId: OTHER, courseRef: adult.slug })
    const response = await env.app.handle(
      new Request('http://localhost/members/admin/members?learner=parents&limit=1'),
    )
    expect(response.status).toBe(200)
    const page = await response.json()
    expect(page.total).toBe(2)
    expect(page.items).toHaveLength(1)
    const next = await (
      await env.app.handle(
        new Request('http://localhost/members/admin/members?learner=parents&limit=1&offset=1'),
      )
    ).json()
    expect(new Set([...page.items, ...next.items].map((item) => item.userId))).toEqual(
      new Set([ACCOUNT, CHILD]),
    )
  })
})

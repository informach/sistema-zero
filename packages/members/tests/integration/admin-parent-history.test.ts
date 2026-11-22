import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, seedSampleCourse } from '../helpers'

const ACCOUNT = 'a0000000-0000-4000-8000-000000000001'
const CHILD = 'b0000000-0000-4000-8000-000000000002'

describe('históricos do responsável no Time', () => {
  test('certificados e avaliações separam cursos para pais e cursos adultos na mesma conta', async () => {
    const env = buildApp()
    const parent = seedSampleCourse(env.courses, 'pais-historico', 'published', 'kids')
    const parentCourse = env.courses.courses.find((c) => c.id === parent.courseId)
    if (!parentCourse) throw new Error('Curso para pais ausente')
    parentCourse.learner = 'parents'
    const adult = seedSampleCourse(env.courses, 'adulto-historico', 'published', 'adult')
    const child = seedSampleCourse(env.courses, 'crianca-historico', 'published', 'kids')
    for (const [course, userId] of [
      [parent, ACCOUNT],
      [adult, ACCOUNT],
      [child, CHILD],
    ] as const) {
      env.certificates.rows.push({
        id: randomUUID(),
        userId,
        accountId: ACCOUNT,
        courseId: course.courseId,
        courseRef: course.slug,
        serial: randomUUID(),
        studentName: userId,
        courseTitle: course.slug,
        completedAt: new Date(),
        issuedAt: new Date(),
        revokedAt: null,
      })
      await env.ratings.upsert(
        userId,
        course.courseId,
        { ratingHalf: 8, comment: null, feedbackAnswers: null },
        new Date(),
      )
    }
    const read = async (userId: string, kind: string, scope: string) => {
      const response = await env.app.handle(
        new Request(`http://localhost/members/admin/members/${userId}/${kind}${scope}`),
      )
      expect(response.status).toBe(200)
      const body: Record<string, { courseRef: string; courseId?: string }[]> = await response.json()
      const rows = body[kind]
      if (!rows) throw new Error('Resposta sem histórico')
      return rows.map((row) => (kind === 'ratings' ? row.courseId : row.courseRef))
    }
    for (const kind of ['certificates', 'ratings']) {
      const key = (course: typeof parent) => (kind === 'ratings' ? course.courseId : course.slug)
      expect(await read(ACCOUNT, kind, '?audience=kids&learner=parents')).toEqual([key(parent)])
      expect(await read(ACCOUNT, kind, '?audience=adult&learner=child')).toEqual([key(adult)])
      expect(await read(CHILD, kind, '?audience=kids&learner=child')).toEqual([key(child)])
      expect(await read(CHILD, kind, '?audience=kids&learner=parents')).toEqual([])
      expect((await read(ACCOUNT, kind, '')).sort()).toEqual([key(adult), key(parent)].sort())
    }
  })

  test('recado geral para o responsável é da conta Kids e não aparece para o filho', async () => {
    const env = buildApp()
    const response = await env.app.handle(
      new Request('http://localhost/members/admin/teacher-threads', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': '99999999-9999-4999-8999-999999999999',
        },
        body: JSON.stringify({
          userId: ACCOUNT,
          accountId: ACCOUNT,
          audience: 'kids',
          contextType: 'general',
          title: 'Seu curso para pais',
          body: 'Pode continuar de onde parou.',
        }),
      }),
    )
    expect(response.status).toBe(200)
    const created: { id: string; userId: string; accountId: string; contextType: string } =
      await response.json()
    expect(created).toMatchObject({ userId: ACCOUNT, accountId: ACCOUNT, contextType: 'general' })
    const list = async (userId: string) => {
      const response = await env.app.handle(
        new Request('http://localhost/members/teacher-threads?audience=kids', {
          headers: { 'x-auth-user-id': userId, 'x-auth-account-id': ACCOUNT },
        }),
      )
      expect(response.status).toBe(200)
      const body: { threads: { id: string }[] } = await response.json()
      return body.threads.map((thread) => thread.id)
    }
    expect(await list(ACCOUNT)).toEqual([created.id])
    expect(await list(CHILD)).toEqual([])
    const denied = await env.app.handle(
      new Request(`http://localhost/members/teacher-threads/${created.id}?audience=kids`, {
        headers: { 'x-auth-user-id': CHILD, 'x-auth-account-id': ACCOUNT },
      }),
    )
    expect(denied.status).toBe(404)
  })
})

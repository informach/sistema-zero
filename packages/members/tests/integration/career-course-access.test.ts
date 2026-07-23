import { describe, expect, test } from 'bun:test'
import type { XpEventInput } from '../../src/domain/ports/gamification-repository.port'
import { buildApp, grantAllKidsCourses, seedSampleCourse } from '../helpers'

const USER = '77777777-7777-4777-8777-777777777777'
const ACCOUNT = '88888888-8888-4888-8888-888888888888'
const NOW = new Date('2026-06-02T12:00:00.000Z')
const headers = {
  'x-auth-user-id': USER,
  'x-auth-account-id': ACCOUNT,
}

async function qualify(
  gamification: ReturnType<typeof buildApp>['gamification'],
  courseId: string,
) {
  const events: XpEventInput[] = [
    { sourceType: 'course_complete', sourceId: courseId, amount: 0 },
    { sourceType: 'course_showcased', sourceId: courseId, amount: 0 },
  ]
  await gamification.award({
    userId: USER,
    accountId: ACCOUNT,
    audience: 'kids',
    events,
    today: '2026-06-02',
    now: NOW,
    privileged: false,
  })
}

describe('Carreira do Criador — acesso pedagógico aos cursos', () => {
  test('curso-base abre; demais aguardam concluir e publicar o curso-base', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    seedSampleCourse(courses, 'segundo-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    expect(
      (await app.handle(new Request('http://localhost/members/courses/base-2d', { headers })))
        .status,
    ).toBe(200)

    const locked = await app.handle(
      new Request('http://localhost/members/courses/segundo-2d', { headers }),
    )
    expect(locked.status).toBe(423)
    expect(await locked.json()).toMatchObject({
      error: { code: 'COURSE_CAREER_LOCKED' },
      careerLock: { reason: 'foundation-first', requiredLevel: 'noob' },
    })
  })

  test('sem curso-base PUBLICADO na etapa, os demais NÃO ficam presos (fail-open)', async () => {
    const { app, courses, entitlements } = buildApp()
    // Só a posição 2 existe; nenhum curso-base publicado para destravá-la.
    seedSampleCourse(courses, 'segundo-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    const response = await app.handle(
      new Request('http://localhost/members/courses/segundo-2d', { headers }),
    )
    // Sem base alcançável, travar prenderia o aluno para sempre → abre.
    expect(response.status).toBe(200)
  })

  test('curso-base em RASCUNHO não conta como base publicada (fail-open)', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'draft', 'kids', false, 'iniciante', '2d', 1)
    seedSampleCourse(courses, 'segundo-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    const response = await app.handle(
      new Request('http://localhost/members/courses/segundo-2d', { headers }),
    )
    expect(response.status).toBe(200)
  })

  test('catálogo: sem curso-base publicado, a posição 2 não trava', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'segundo-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    const response = await app.handle(
      new Request('http://localhost/members/catalog?audience=kids', { headers }),
    )
    const body = (await response.json()) as { courses: Record<string, any>[] }
    const bySlug = new Map(body.courses.map((course) => [course.courseSlug, course]))
    expect(bySlug.get('segundo-2d')).toMatchObject({
      hasAccess: true,
      careerLock: { locked: false },
    })
  })

  test('os dois marcos do curso-base liberam os demais da mesma etapa', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const base = seedSampleCourse(
      courses,
      'base-2d',
      'published',
      'kids',
      false,
      'iniciante',
      '2d',
      1,
    )
    seedSampleCourse(courses, 'segundo-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })
    await qualify(gamification, base.courseId)

    const response = await app.handle(
      new Request('http://localhost/members/courses/segundo-2d', { headers }),
    )
    expect(response.status).toBe(200)
  })

  test('catálogo separa matrícula da trava e aponta o curso-base', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    seedSampleCourse(courses, 'segundo-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    seedSampleCourse(courses, 'base-3d', 'published', 'kids', false, 'iniciante', '3d', 1)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    const response = await app.handle(
      new Request('http://localhost/members/catalog?audience=kids', { headers }),
    )
    const body = (await response.json()) as { courses: Record<string, any>[] }
    const bySlug = new Map(body.courses.map((course) => [course.courseSlug, course]))
    expect(bySlug.get('base-2d')).toMatchObject({ hasAccess: true, careerLock: { locked: false } })
    expect(bySlug.get('segundo-2d')).toMatchObject({
      hasAccess: true,
      careerLock: {
        locked: true,
        reason: 'foundation-first',
        foundationCourseSlug: 'base-2d',
      },
    })
    expect(bySlug.get('base-3d')).toMatchObject({
      hasAccess: true,
      careerLock: {
        locked: true,
        reason: 'future-tier',
      },
    })
    expect(bySlug.get('base-3d')?.careerLock).not.toHaveProperty('foundationCourseSlug')
  })

  test('curso bônus não participa da trava; equipe ignora a trava pedagógica', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'bonus', 'published', 'kids')
    seedSampleCourse(courses, 'futuro', 'published', 'kids', false, 'avancado', '3d', 1)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    expect(
      (await app.handle(new Request('http://localhost/members/courses/bonus', { headers }))).status,
    ).toBe(200)
    expect(
      (
        await app.handle(
          new Request('http://localhost/members/courses/futuro', {
            headers: { 'x-auth-user-id': USER, 'x-auth-user-role': 'staff' },
          }),
        )
      ).status,
    ).toBe(200)
  })
})

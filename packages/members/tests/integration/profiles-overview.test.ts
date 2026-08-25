import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantAllKidsCourses, seedSampleCourse } from '../helpers'

const ACCOUNT = 'a0000000-0000-4000-8000-000000000001'
const PROFILE_A = 'b0000000-0000-4000-8000-000000000002'
const PROFILE_B = 'c0000000-0000-4000-8000-000000000003'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const post = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { method: 'POST', headers }))
const prof = (profileId: string) => ({ 'x-auth-user-id': profileId, 'x-auth-account-id': ACCOUNT })

describe('admin profiles-overview — enriquecimento da listagem de crianças', () => {
  test('xp/ofensiva/última atividade + pendências por perfil; TODO id pedido volta', async () => {
    const { app, courses, entitlements, studioSubmissions, clockRef } = buildApp()
    const { courseId, slug, lessonIds } = seedSampleCourse(
      courses,
      'kids-curso',
      'published',
      'kids',
    )
    void slug
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })
    // Perfil A conclui uma aula (XP + streak + lastActivityDate do dia do relógio fixo).
    expect(
      (await post(app, `/members/lessons/${lessonIds[0]}/complete`, prof(PROFILE_A))).status,
    ).toBe(200)
    // Entrega PENDENTE de A + uma CONFERIDA (não conta) — régua da fila.
    const submittedAt = clockRef.now
    studioSubmissions.submissions.push(
      {
        id: randomUUID(),
        userId: PROFILE_A,
        accountId: ACCOUNT,
        blockId: randomUUID(),
        lessonId: lessonIds[0] as string,
        courseId,
        project: {},
        submittedAt,
      },
      {
        id: randomUUID(),
        userId: PROFILE_A,
        accountId: ACCOUNT,
        blockId: randomUUID(),
        lessonId: lessonIds[0] as string,
        courseId,
        project: {},
        submittedAt,
        reviewedAt: new Date(submittedAt.getTime() + 1000),
      },
    )

    const body = await readJson(
      await get(app, `/members/admin/profiles-overview?profileIds=${PROFILE_A},${PROFILE_B}`),
    )
    expect(body.profiles).toHaveLength(2)
    const [a, b] = body.profiles
    expect(a.profileId).toBe(PROFILE_A)
    expect(a.xp).toBeGreaterThan(0)
    expect(a.streakCurrent).toBe(1)
    expect(a.lastActivityDate).toBe('2026-06-02')
    expect(a.levelSlug).toBe('noob')
    expect(a.pendingSubmissions).toBe(1)
    // B nunca pontuou: zeros/noob — mas VOLTA no array (régua das rotas em lote).
    expect(b).toEqual({
      profileId: PROFILE_B,
      xp: 0,
      levelSlug: 'noob',
      streakCurrent: 0,
      lastActivityDate: null,
      pendingSubmissions: 0,
    })
  })

  test('sem profileIds → lista vazia (sem varrer o banco)', async () => {
    const { app } = buildApp()
    const body = await readJson(await get(app, '/members/admin/profiles-overview'))
    expect(body.profiles).toEqual([])
  })

  test('conta pendências somente na audiência solicitada', async () => {
    const { app, courses, studioSubmissions, clockRef } = buildApp()
    const kids = seedSampleCourse(courses, 'kids-curso', 'published', 'kids')
    const adult = seedSampleCourse(courses, 'adult-curso', 'published', 'adult')
    const submittedAt = clockRef.now
    for (const course of [kids, adult]) {
      studioSubmissions.submissions.push({
        id: randomUUID(),
        userId: PROFILE_A,
        accountId: ACCOUNT,
        blockId: randomUUID(),
        lessonId: course.lessonIds[0] as string,
        courseId: course.courseId,
        project: {},
        submittedAt,
      })
    }

    const kidsBody = await readJson(
      await get(app, `/members/admin/profiles-overview?profileIds=${PROFILE_A}&audience=kids`),
    )
    const adultBody = await readJson(
      await get(app, `/members/admin/profiles-overview?profileIds=${PROFILE_A}&audience=adult`),
    )

    expect(kidsBody.profiles[0].pendingSubmissions).toBe(1)
    expect(adultBody.profiles[0].pendingSubmissions).toBe(1)
  })
})

import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const TARGET = '11111111-1111-1111-1111-111111111111'
type App = ReturnType<typeof buildApp>['app']
const readJson = (r: Response): Promise<any> => r.json()

const getPublic = (app: App, id: string) =>
  app.handle(new Request(`http://localhost/members/profiles/${id}/public?audience=kids`))

const completeAsTarget = (app: App, lessonId: string) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: { 'x-auth-user-id': TARGET },
    }),
  )

describe('Perfil público (GET /members/profiles/:id/public)', () => {
  test('xp + conquistas QUE TEM (não o catálogo) + avatar default + ranking; quarto null', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    grantLifetime(entitlements, { userId: TARGET, courseRef: course.slug })
    await completeAsTarget(app, course.lessonIds[0]) // +10 XP kids + badge first-lesson

    const body = await readJson(await getPublic(app, TARGET))
    expect(body.profileId).toBe(TARGET)
    expect(body.xp).toBe(10)
    // SÓ a conquista conquistada (≠ do /gamification/me, que traz o catálogo inteiro).
    expect(body.badges.map((b: { slug: string }) => b.slug)).toEqual(['first-lesson'])
    expect(body.ranking).toEqual({ position: 1, totalStudents: 1 })
    // Avatar 3D: nunca configurado → default grátis preenchido (slot = {asset, color?}).
    expect(body.avatar.slots.hair.asset).toBe('hair-01')
    expect(body.room).toBeNull()
  })

  test('perfil sem atividade → zeros, sem conquistas, sem ranking, avatar default', async () => {
    const { app } = buildApp()
    const body = await readJson(await getPublic(app, TARGET))
    expect(body.xp).toBe(0)
    expect(body.badges).toEqual([])
    expect(body.ranking).toBeNull()
    expect(body.avatar.slots.head.asset).toBe('head-01')
    expect(body.room).toBeNull()
  })

  test('id inválido (não uuid) → 400 na borda', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/members/profiles/nao-uuid/public'))
    expect(res.status).toBe(400)
  })
})

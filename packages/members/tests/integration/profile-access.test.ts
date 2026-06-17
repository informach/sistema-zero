import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const ACCOUNT = 'a0000000-0000-4000-8000-000000000001'
const PROFILE_A = 'b0000000-0000-4000-8000-000000000002'
const PROFILE_B = 'c0000000-0000-4000-8000-000000000003'

type App = ReturnType<typeof buildApp>['app']
// biome-ignore lint/suspicious/noExplicitAny: resposta de teste
const readJson = (res: Response): Promise<any> => res.json()
// Sessão de perfil: x-auth-user-id = PERFIL (dados/progresso); x-auth-account-id = CONTA (acesso).
const prof = (profileId: string) => ({ 'x-auth-user-id': profileId, 'x-auth-account-id': ACCOUNT })

const get = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const post = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { method: 'POST', headers }))

describe('Sessão de perfil — acesso pela CONTA, dados pelo PERFIL', () => {
  test('acesso resolve pela conta; só o id do perfil (sem a conta) não tem matrícula → 403', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug } = seedSampleCourse(courses, 'kids-curso', 'published', 'kids')
    // A matrícula é da CONTA (o responsável comprou) — kids exige matrícula específica.
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: slug })

    expect((await get(app, `/members/courses/${slug}`, prof(PROFILE_A))).status).toBe(200)
    // Sem x-auth-account-id, o id efetivo é o perfil — que não tem matrícula → 403.
    expect(
      (await get(app, `/members/courses/${slug}`, { 'x-auth-user-id': PROFILE_A })).status,
    ).toBe(403)
  })

  test('progresso é POR PERFIL: A conclui, B (mesma conta) continua zerado — ambos acessam', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses, 'kids-curso', 'published', 'kids')
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: slug })

    // Perfil A conclui a aula 1 (acesso pela conta; conclusão keyada no perfil A).
    expect(
      (await post(app, `/members/lessons/${lessonIds[0]}/complete`, prof(PROFILE_A))).status,
    ).toBe(200)

    const progA = await readJson(
      await get(app, `/members/courses/${slug}/progress`, prof(PROFILE_A)),
    )
    const progB = await readJson(
      await get(app, `/members/courses/${slug}/progress`, prof(PROFILE_B)),
    )
    expect(progA.completedLessons).toBe(1)
    // B tem ACESSO (mesma conta) mas NÃO herda o progresso de A.
    expect(progB.completedLessons).toBe(0)
  })

  test('"Meus cursos" da vitrine kids lista o curso da conta para o perfil', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug } = seedSampleCourse(courses, 'kids-curso', 'published', 'kids')
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: slug })
    const body = await readJson(await get(app, '/members/courses?audience=kids', prof(PROFILE_A)))
    expect(body.courses.map((c: { courseSlug: string }) => c.courseSlug)).toContain(slug)
  })
})

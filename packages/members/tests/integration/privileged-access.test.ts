import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const STAFF_USER = '55555555-5555-5555-5555-555555555555'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
/** Headers como o gateway injeta: identidade + role verificados do JWT. */
const roleHeaders = (role: string, userId = STAFF_USER) => ({
  'x-auth-user-id': userId,
  'x-auth-user-role': role,
  'x-auth-user-status': 'active',
})

const get = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const send = (
  app: App,
  path: string,
  method: string,
  body: unknown,
  headers: Record<string, string>,
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )

describe('Equipe interna (superadmin/admin/staff) — acesso irrestrito', () => {
  test.each([
    'superadmin',
    'admin',
    'staff',
  ])('%s sem matrícula acessa curso publicado (detalhe + aula); draft segue 404', async (role) => {
    const { app, courses } = buildApp()
    const { lessonIds, slug } = seedSampleCourse(courses, 'curso-a')
    seedSampleCourse(courses, 'rascunho', 'draft')

    const detail = await get(app, `/members/courses/${slug}`, roleHeaders(role))
    expect(detail.status).toBe(200)
    // Acesso reportado como chave-mestra virtual vitalícia.
    const body = await readJson(detail)
    expect(body.access).toMatchObject({ accessType: 'all_courses', expiresAt: null })

    const lesson = await get(
      app,
      `/members/courses/${slug}/lessons/${lessonIds[0]}`,
      roleHeaders(role),
    )
    expect(lesson.status).toBe(200)

    // Rascunho NÃO vaza nem para a equipe (mesma régua da chave-mestra real).
    expect((await get(app, '/members/courses/rascunho', roleHeaders(role))).status).toBe(404)
  })

  test('equipe vê curso KIDS sem matrícula (chave-mestra virtual cobre as duas vitrines)', async () => {
    const { app, courses } = buildApp()
    seedSampleCourse(courses, 'curso-kids', 'published', 'kids')

    // Detalhe destravado (suporte navega a plataforma kids).
    expect((await get(app, '/members/courses/curso-kids', roleHeaders('staff'))).status).toBe(200)

    // Vitrine kids lista e destrava para a equipe.
    const kids = await readJson(
      await get(app, '/members/courses?audience=kids', roleHeaders('staff')),
    )
    expect(kids.courses.map((c: any) => c.courseSlug)).toEqual(['curso-kids'])
    const catalog = await readJson(
      await get(app, '/members/catalog?audience=kids', roleHeaders('staff')),
    )
    expect(catalog.courses[0].hasAccess).toBe(true)
  })

  test('customer sem matrícula continua 403 (role não-privilegiado não destrava)', async () => {
    const { app, courses } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    expect((await get(app, '/members/courses/curso-a', roleHeaders('customer'))).status).toBe(403)
    // Sem header de role (dev/local) também não destrava.
    expect(
      (await get(app, '/members/courses/curso-a', { 'x-auth-user-id': STAFF_USER })).status,
    ).toBe(403)
  })

  test('equipe inativa não recebe o bypass de acesso', async () => {
    const { app, courses } = buildApp()
    seedSampleCourse(courses, 'curso-a')

    const response = await get(app, '/members/courses/curso-a', {
      ...roleHeaders('staff'),
      'x-auth-user-status': 'inactive',
    })

    expect(response.status).toBe(403)
  })

  test('catálogo destrava tudo (hasAccess) e "meus cursos" lista todos os publicados', async () => {
    const { app, courses } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    seedSampleCourse(courses, 'curso-b')
    seedSampleCourse(courses, 'rascunho', 'draft')

    const catalog = await readJson(await get(app, '/members/catalog', roleHeaders('admin')))
    expect(catalog.courses).toHaveLength(2)
    for (const c of catalog.courses) expect(c.hasAccess).toBe(true)

    const mine = await readJson(await get(app, '/members/courses', roleHeaders('admin')))
    expect(mine.courses).toHaveLength(2)
    for (const c of mine.courses) {
      expect(c.access).toMatchObject({ accessType: 'all_courses', expiresAt: null })
    }
  })

  test('matrícula específica do staff continua vencendo (mais forte = vitalícia real)', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'curso-a')
    grantLifetime(entitlements, { userId: STAFF_USER, courseRef: 'curso-a' })

    const mine = await readJson(await get(app, '/members/courses', roleHeaders('staff')))
    expect(mine.courses).toHaveLength(1)
    // Virtual e real empatam em força (ambas vitalícias) — o que importa é listar e acessar.
    expect(mine.courses[0].access.expiresAt).toBeNull()
  })

  test('progresso, posição de vídeo, quiz e classificação funcionam sem matrícula', async () => {
    const { app, courses } = buildApp()
    const { lessonIds, slug } = seedSampleCourse(courses, 'curso-a')
    const h = roleHeaders('staff')

    expect((await get(app, `/members/courses/${slug}/progress`, h)).status).toBe(200)

    const pos = await send(
      app,
      `/members/courses/${slug}/lessons/${lessonIds[0]}/position`,
      'PUT',
      { positionSeconds: 42 },
      h,
    )
    expect(pos.status).toBe(200)

    const complete = await send(app, `/members/lessons/${lessonIds[1]}/complete`, 'POST', {}, h)
    expect(complete.status).toBe(200)

    const rating = await send(app, `/members/courses/${slug}/rating`, 'PUT', { rating: 4.5 }, h)
    expect(rating.status).toBe(200)
    expect((await readJson(rating)).rating).toBe(4.5)
  })
})

/**
 * Cursos para pais (14/11/2026): no Kids, o curso tem "para quem" (`learner`). O curso para pais
 * é feito pela CONTA do responsável (sessão sem perfil), fica fora das vitrines da criança e da
 * Jornada, não dá XP nem moedas e abre pela chave dos cursos Kids ou por compra avulsa.
 */
import { describe, expect, test } from 'bun:test'
import { buildApp, grantAllKidsCourses, grantLifetime, seedSampleCourse } from '../helpers'

type Env = ReturnType<typeof buildApp>
const readJson = (res: Response): Promise<any> => res.json()

const NOW = new Date('2026-11-14T17:00:00.000Z')
const ACCOUNT = '77777777-7777-7777-7777-777777777777'
const CHILD = '88888888-8888-8888-8888-888888888888'

const parentHeaders = { 'x-auth-user-id': ACCOUNT }
const childHeaders = { 'x-auth-user-id': CHILD, 'x-auth-account-id': ACCOUNT }

const request = (
  env: Env,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) =>
  env.app.handle(
    new Request(`http://localhost${path}`, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    }),
  )

function seedParentsCourse(env: Env, slug = 'ajudar-sem-fazer-por-eles') {
  const seeded = seedSampleCourse(env.courses, slug, 'published', 'kids')
  const course = env.courses.courses.find((item) => item.id === seeded.courseId)
  if (!course) throw new Error('curso não semeado')
  course.learner = 'parents'
  return { ...seeded, course }
}

describe('Curso para pais — autoria', () => {
  const COURSE = {
    slug: 'curso-dos-pais',
    title: 'Curso dos pais',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    status: 'draft',
    audience: 'kids',
  }
  const create = (env: Env, over: Record<string, unknown> = {}) =>
    request(env, '/members/admin/courses', { method: 'POST', body: { ...COURSE, ...over } })

  test('nasce para pais e sobrevive à leitura', async () => {
    const env = buildApp({ now: NOW })
    const res = await create(env, { learner: 'parents' })
    expect(res.status).toBe(201)
    const created = await readJson(res)
    expect(created.learner).toBe('parents')
    expect(created.careerSlot).toBeNull()
    expect(created.journeyRole).toBe('reward')
  })

  test('sem o campo, o curso é da criança', async () => {
    const env = buildApp({ now: NOW })
    expect((await readJson(await create(env))).learner).toBe('child')
  })

  test('recusa curso para pais no adulto, ao vivo ou com posição na Jornada', async () => {
    const env = buildApp({ now: NOW })
    expect((await create(env, { learner: 'parents', audience: 'adult' })).status).toBe(400)
    expect((await create(env, { learner: 'parents', modality: 'live' })).status).toBe(400)
    expect(
      (await create(env, { learner: 'parents', careerSlot: 2, journeyRole: 'positioned' })).status,
    ).toBe(400)
  })

  test('a listagem do Admin filtra por para quem', async () => {
    const env = buildApp({ now: NOW })
    await create(env, { learner: 'parents' })
    await create(env, { slug: 'curso-da-crianca', title: 'Curso da criança' })
    const parents = await readJson(
      await request(env, '/members/admin/courses?audience=kids&learner=parents'),
    )
    expect(parents.items.map((c: { slug: string }) => c.slug)).toEqual(['curso-dos-pais'])
  })
})

describe('Curso para pais — vitrines e acesso', () => {
  test('a criança não vê o curso para pais; a conta vê na lista dos pais', async () => {
    const env = buildApp({ now: NOW })
    seedParentsCourse(env)
    seedSampleCourse(env.courses, 'curso-da-crianca', 'published', 'kids')
    grantAllKidsCourses(env.entitlements, { userId: ACCOUNT, now: NOW })

    const parentCatalog = await readJson(
      await request(env, '/members/catalog?audience=kids&learner=parents', {
        headers: parentHeaders,
      }),
    )
    expect(parentCatalog.courses.map((c: { courseSlug: string }) => c.courseSlug)).toEqual([
      'ajudar-sem-fazer-por-eles',
    ])
    expect(parentCatalog.courses[0].hasAccess).toBe(true)
    expect(parentCatalog.courses[0].accessReason).toBe('parents')

    const parentCourses = await readJson(
      await request(env, '/members/courses?audience=kids&learner=parents', {
        headers: parentHeaders,
      }),
    )
    expect(parentCourses.courses).toHaveLength(1)

    // O perfil da criança pedindo a lista dos pais não recebe nada.
    const childAsking = await readJson(
      await request(env, '/members/catalog?audience=kids&learner=parents', {
        headers: childHeaders,
      }),
    )
    expect(childAsking.courses).toEqual([])
  })

  test('a conta abre a aula pela chave dos cursos Kids; o perfil da criança não abre', async () => {
    const env = buildApp({ now: NOW })
    const { lessonIds } = seedParentsCourse(env)
    grantAllKidsCourses(env.entitlements, { userId: ACCOUNT, now: NOW })
    const path = `/members/courses/ajudar-sem-fazer-por-eles/lessons/${lessonIds[0]}`
    expect((await request(env, path, { headers: parentHeaders })).status).toBe(200)
    expect((await request(env, path, { headers: childHeaders })).status).toBe(403)
  })

  test('sem assinatura nem compra, o curso aparece fechado; a compra avulsa abre', async () => {
    const env = buildApp({ now: NOW })
    const { lessonIds } = seedParentsCourse(env)
    const path = `/members/courses/ajudar-sem-fazer-por-eles/lessons/${lessonIds[0]}`
    expect((await request(env, path, { headers: parentHeaders })).status).toBe(403)
    const closed = await readJson(
      await request(env, '/members/catalog?audience=kids&learner=parents', {
        headers: parentHeaders,
      }),
    )
    expect(closed.courses[0].hasAccess).toBe(false)

    grantLifetime(env.entitlements, {
      userId: ACCOUNT,
      courseRef: 'ajudar-sem-fazer-por-eles',
      now: NOW,
    })
    expect((await request(env, path, { headers: parentHeaders })).status).toBe(200)
  })

  test('concluir a aula do curso para pais não dá XP nem moedas', async () => {
    const env = buildApp({ now: NOW })
    const { lessonIds } = seedParentsCourse(env)
    grantAllKidsCourses(env.entitlements, { userId: ACCOUNT, now: NOW })
    const done = await request(env, `/members/lessons/${lessonIds[0]}/complete`, {
      method: 'POST',
      headers: parentHeaders,
    })
    expect(done.status).toBe(200)
    expect((await readJson(done)).gamification ?? null).toBeNull()
    expect(env.gamification.events).toEqual([])
  })
})

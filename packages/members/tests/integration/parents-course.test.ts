/**
 * Cursos para pais (14/11/2026): no Kids, o curso tem "para quem" (`learner`). O curso para pais
 * é feito pela CONTA do responsável (sessão sem perfil), fica fora das vitrines da criança e da
 * Jornada, não dá XP nem moedas e abre pela chave dos cursos Kids ou por compra avulsa.
 */

import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { parentsLessonIssues } from '@sistemazero/core/course/learner'
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

  test('virar curso para pais: recusa Estúdio ou Pinta em aula já publicada', async () => {
    const env = buildApp({ now: NOW })
    const seeded = seedSampleCourse(env.courses, 'curso-rascunho', 'draft', 'kids')
    const lessonId = seeded.lessonIds[0] as string
    const lesson = env.courses.lessons.find((item) => item.id === lessonId)
    if (!lesson) throw new Error('aula não semeada')
    env.courses.blocks.push({
      id: randomUUID(),
      lessonId,
      kind: 'studio',
      sortOrder: 9,
      content: { kind: 'studio' } as never,
    })
    const patch = async () => {
      const current = await readJson(
        await request(env, `/members/admin/courses/${seeded.courseId}`),
      )
      return request(env, `/members/admin/courses/${seeded.courseId}`, {
        method: 'PATCH',
        body: {
          ...COURSE,
          slug: 'curso-rascunho',
          learner: 'parents',
          careerSlot: null,
          version: current.version,
        },
      })
    }
    const refused = await patch()
    expect(refused.status).toBe(400)
    const body = JSON.stringify(await readJson(refused))
    expect(body).toContain('não usa Estúdio nem Pinta')
    expect(body).toContain(lesson.title)
    // Sem a atividade da criança, a troca passa.
    env.courses.blocks = env.courses.blocks.filter((block) => block.kind !== 'studio')
    expect((await patch()).status).toBe(200)
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

  test('a conta do responsável não abre o curso da criança: recusa clara, não 503', async () => {
    const env = buildApp({ now: NOW })
    const child = seedSampleCourse(env.courses, 'curso-da-crianca', 'published', 'kids')
    grantAllKidsCourses(env.entitlements, { userId: ACCOUNT, now: NOW })
    // Como no registro real: a conta não é um perfil de criança da Jornada.
    env.kidsJourneySnapshots.unavailableProfiles.add(ACCOUNT)
    const res = await request(
      env,
      `/members/courses/curso-da-crianca/lessons/${child.lessonIds[0]}`,
      { headers: parentHeaders },
    )
    expect(res.status).toBe(403)
  })
})

describe('Curso para pais — regras de autoria', () => {
  test('trocar "Para quem" só com o curso em rascunho', async () => {
    const env = buildApp({ now: NOW })
    const { course } = seedParentsCourse(env)
    const current = await readJson(await request(env, `/members/admin/courses/${course.id}`))
    const res = await request(env, `/members/admin/courses/${course.id}`, {
      method: 'PATCH',
      body: {
        slug: current.slug,
        title: current.title,
        subtitle: null,
        description: null,
        coverImageUrl: null,
        status: 'published',
        audience: 'kids',
        learner: 'child',
        version: current.version,
      },
    })
    expect(res.status).toBe(400)
  })

  test('aula de curso para pais não publica Estúdio nem Pinta', () => {
    const issues = parentsLessonIssues([
      { id: 'b1', content: { kind: 'video' } },
      { id: 'b2', content: { kind: 'studio' } },
      { id: 'b3', content: { kind: 'pinta' } },
    ])
    expect(issues.map((issue) => issue.blockId)).toEqual(['b2', 'b3'])
  })
})

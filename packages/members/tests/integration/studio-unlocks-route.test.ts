import { describe, expect, test } from 'bun:test'
import type { XpEventInput } from '../../src/domain/ports/gamification-repository.port'
import { buildApp, seedSampleCourse } from '../helpers'

const USER = '77777777-7777-4777-8777-777777777777'
const ACCOUNT = '88888888-8888-4888-8888-888888888888'
const NOW = new Date('2026-08-14T12:00:00.000Z')
const headers = { 'x-auth-user-id': USER, 'x-auth-account-id': ACCOUNT }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const getUnlocks = (app: App, query = '?audience=kids') =>
  app.handle(new Request(`http://localhost/members/studio/unlocks${query}`, { headers }))

async function qualify(
  gamification: ReturnType<typeof buildApp>['gamification'],
  courseId: string,
  userId = USER,
) {
  const events: XpEventInput[] = [
    { sourceType: 'course_complete', sourceId: courseId, amount: 0 },
    { sourceType: 'course_showcased', sourceId: courseId, amount: 0 },
  ]
  await gamification.award({
    userId,
    accountId: ACCOUNT,
    audience: 'kids',
    events,
    today: '2026-08-14',
    now: NOW,
    privileged: false,
  })
}

/** Marca o curso com o currículo que ele libera (o que o admin grava no metadata). */
function withUnlocks(
  courses: ReturnType<typeof buildApp>['courses'],
  slug: string,
  blocks: string[],
) {
  const course = courses.courses.find((c) => c.slug === slug)
  if (!course) throw new Error(`curso ${slug} não semeado`)
  course.metadata = { ...(course.metadata ?? {}), studioUnlockBlocks: blocks }
  return course
}

/**
 * A rota que serve a paleta do Estúdio livre. Os testes de serviço usam os fakes direto e
 * o do repositório fala SQL — nenhum dos dois passa pela BORDA HTTP, que é onde mora a
 * fiação (dep no `MembersRoutesDeps`, path, DTO da query, resolução do perfil pelo header).
 * Um campo que o DTO valida mas o mapeador da rota esquece de copiar já custou o currículo
 * inteiro uma vez nesta mesma fatia — daí este arquivo.
 */
describe('Members HTTP — GET /members/studio/unlocks', () => {
  test('sem curso qualificado devolve lista vazia', async () => {
    const { app } = buildApp()
    const res = await getUnlocks(app)
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ blocks: [] })
  })

  test('curso concluído E publicado entrega os blocos dele', async () => {
    const { app, courses, gamification } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    const course = withUnlocks(courses, 'base-2d', ['sz_g2d_create_ship', 'sz_g2d_on_key'])
    await qualify(gamification, course.id)

    const body = await readJson(await getUnlocks(app))
    expect(body.blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key'])
  })

  test('só concluir (sem publicar no Mural) não entrega nada', async () => {
    const { app, courses, gamification } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    const course = withUnlocks(courses, 'base-2d', ['sz_g2d_create_ship'])
    await gamification.award({
      userId: USER,
      accountId: ACCOUNT,
      audience: 'kids',
      events: [{ sourceType: 'course_complete', sourceId: course.id, amount: 0 }],
      today: '2026-08-14',
      now: NOW,
      privileged: false,
    })
    expect((await readJson(await getUnlocks(app))).blocks).toEqual([])
  })

  test('dois cursos somam sem repetir', async () => {
    const { app, courses, gamification } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    seedSampleCourse(courses, 'dois-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    const a = withUnlocks(courses, 'base-2d', ['sz_g2d_create_ship', 'sz_val_number'])
    const b = withUnlocks(courses, 'dois-2d', ['sz_g2d_on_key', 'sz_val_number'])
    await qualify(gamification, a.id)
    await qualify(gamification, b.id)

    const body = await readJson(await getUnlocks(app))
    expect(body.blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key', 'sz_val_number'])
  })

  test('a vitrine segrega: o mesmo perfil no adulto não vê o currículo kids', async () => {
    const { app, courses, gamification } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    const course = withUnlocks(courses, 'base-2d', ['sz_g2d_create_ship'])
    await qualify(gamification, course.id)
    expect((await readJson(await getUnlocks(app, '?audience=adult'))).blocks).toEqual([])
  })

  test('sem `?audience` o default é kids (a única vitrine com Estúdio livre)', async () => {
    const { app, courses, gamification } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    const course = withUnlocks(courses, 'base-2d', ['sz_g2d_create_ship'])
    await qualify(gamification, course.id)
    expect((await readJson(await getUnlocks(app, ''))).blocks).toEqual(['sz_g2d_create_ship'])
  })

  test('o currículo é do PERFIL: a conquista de um irmão não vaza para o outro', async () => {
    const { app, courses, gamification } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    const course = withUnlocks(courses, 'base-2d', ['sz_g2d_create_ship'])
    await qualify(gamification, course.id, '99999999-9999-4999-8999-999999999999')
    expect((await readJson(await getUnlocks(app))).blocks).toEqual([])
  })
})

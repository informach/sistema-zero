import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  buildApp,
  grantAllKidsCourses,
  grantCommunityProduct,
  grantLifetime,
  seedSampleCourse,
} from '../helpers'

const ACCOUNT = 'a0000000-0000-4000-8000-000000000001'
const PROFILE_A = 'b0000000-0000-4000-8000-000000000002'
const PROFILE_B = 'c0000000-0000-4000-8000-000000000003'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const prof = (profileId: string) => ({ 'x-auth-user-id': profileId, 'x-auth-account-id': ACCOUNT })

const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const post = (app: App, path: string, headers: Record<string, string>) =>
  app.handle(new Request(`http://localhost${path}`, { method: 'POST', headers }))

const detailOf = async (app: App, profileIds: string[] = []) => {
  const qs = profileIds.length > 0 ? `?profileIds=${profileIds.join(',')}` : ''
  return readJson(await get(app, `/members/admin/members/${ACCOUNT}${qs}`))
}

describe('admin member-detail v2 — progresso por TIPO de produto', () => {
  test('ferramenta/comunidade (accessType community) NÃO vira card de curso', async () => {
    const { app, entitlements } = buildApp()
    grantCommunityProduct(entitlements, { userId: ACCOUNT, sku: 'pensa', productKind: 'tool' })
    grantCommunityProduct(entitlements, {
      userId: ACCOUNT,
      sku: 'clube-dos-criadores',
      productKind: 'community',
    })

    const detail = await detailOf(app)
    // O bug antigo: pensa/clube viravam "cursos 0%" com slug cru. Agora: nada.
    expect(detail.progress).toEqual([])
    // As matrículas seguem visíveis na tabela, com kind e sku para o painel.
    const kinds = detail.entitlements.map((e: { productKind: string }) => e.productKind).sort()
    expect(kinds).toEqual(['community', 'tool'])
    expect(detail.entitlements.map((e: { sku: string | null }) => e.sku).sort()).toEqual([
      'clube-dos-criadores',
      'pensa',
    ])
  })

  test('carrega atividade e conclusões de todos os aprendizes em lotes únicos', async () => {
    const { app, courses, entitlements, progress, positions } = buildApp()
    const adult = seedSampleCourse(courses, 'curso-adulto-batch', 'published', 'adult')
    const kids = seedSampleCourse(courses, 'curso-kids-batch', 'published', 'kids')
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: adult.slug })
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: kids.slug })
    const profileIds = [randomUUID(), randomUUID()]
    const learnerIds = [ACCOUNT, ...profileIds]
    let legacyCalls = 0
    let completionBatchCalls = 0
    let accessBatchCalls = 0
    let countBatchCalls = 0
    const originalLastCompletion = progress.lastCompletionByCourse.bind(progress)
    const originalLastAccess = positions.lastAccessByCourse.bind(positions)
    const originalCount = progress.countCompletedByCourseIds.bind(progress)
    progress.lastCompletionByCourse = async (userId) => {
      legacyCalls += 1
      return originalLastCompletion(userId)
    }
    positions.lastAccessByCourse = async (userId) => {
      legacyCalls += 1
      return originalLastAccess(userId)
    }
    progress.countCompletedByCourseIds = async (userId, courseIds) => {
      legacyCalls += 1
      return originalCount(userId, courseIds)
    }
    Object.assign(progress, {
      lastCompletionByUsers: async (userIds: string[]) => {
        completionBatchCalls += 1
        expect(userIds).toEqual(learnerIds)
        return new Map(userIds.map((id) => [id, new Map()]))
      },
      countCompletedByUsersAndCourseIds: async (userIds: string[], _courseIds: string[]) => {
        countBatchCalls += 1
        expect(userIds).toEqual(learnerIds)
        return new Map(userIds.map((id) => [id, new Map()]))
      },
    })
    Object.assign(positions, {
      lastAccessByUsers: async (userIds: string[]) => {
        accessBatchCalls += 1
        expect(userIds).toEqual(learnerIds)
        return new Map(userIds.map((id) => [id, new Map()]))
      },
    })

    const res = await app.handle(
      new Request(
        `http://localhost/members/admin/members/${ACCOUNT}?profileIds=${profileIds.join(',')}`,
      ),
    )

    expect(res.status).toBe(200)
    expect({ completionBatchCalls, accessBatchCalls, countBatchCalls, legacyCalls }).toEqual({
      completionBatchCalls: 1,
      accessBatchCalls: 1,
      countBatchCalls: 1,
      legacyCalls: 0,
    })
  })

  test('chave-mestra kids + atividade do perfil → card REAL com título e lastActivityAt', async () => {
    const { app, courses, entitlements } = buildApp()
    const { slug, lessonIds } = seedSampleCourse(courses, 'kids-curso', 'published', 'kids')
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    // Perfil A conclui a aula 1 via chave-mestra da conta.
    expect(
      (await post(app, `/members/lessons/${lessonIds[0]}/complete`, prof(PROFILE_A))).status,
    ).toBe(200)

    const detail = await detailOf(app, [PROFILE_A, PROFILE_B])
    const byId = new Map(
      (detail.profilesProgress as { userId: string; progress: unknown[] }[]).map((p) => [
        p.userId,
        p.progress as any[],
      ]),
    )
    const cardA = byId.get(PROFILE_A)?.[0]
    expect(cardA?.courseRef).toBe(slug)
    expect(cardA?.title).toBe('Curso Demo')
    expect(cardA?.audience).toBe('kids')
    expect(cardA?.completedLessons).toBe(1)
    expect(typeof cardA?.lastActivityAt).toBe('string')
    // A chave-mestra NÃO explode o catálogo: B (sem atividade) não tem card nenhum.
    expect(byId.get(PROFILE_B)).toEqual([])
    // E a conta (aprendiz adulto) não herda a atividade do perfil.
    expect(detail.progress).toEqual([])
  })

  test('matrícula específica sem atividade → card 0% com lastActivityAt null, na plataforma do aprendiz', async () => {
    const { app, courses, entitlements } = buildApp()
    const kids = seedSampleCourse(courses, 'kids-curso', 'published', 'kids')
    seedSampleCourse(courses, 'curso-adulto', 'published', 'adult')
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: kids.slug })
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: 'curso-adulto' })

    const detail = await detailOf(app, [PROFILE_A])
    // Conta = aprendiz ADULTO: só o curso adulto (o kids é dos perfis).
    expect(detail.progress.map((p: { courseRef: string }) => p.courseRef)).toEqual(['curso-adulto'])
    expect(detail.progress[0].lastActivityAt).toBeNull()
    expect(detail.progress[0].percent).toBe(0)
    // Perfil = aprendiz KIDS: só o curso kids, ainda sem atividade.
    const profileCards = detail.profilesProgress[0].progress
    expect(profileCards.map((p: { courseRef: string }) => p.courseRef)).toEqual([kids.slug])
    expect(profileCards[0].lastActivityAt).toBeNull()
  })

  test('matrícula cujo curso não existe mais → linha degradada (nulls) segue visível', async () => {
    const { app, entitlements } = buildApp()
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: 'curso-apagado' })

    const detail = await detailOf(app)
    expect(detail.progress).toHaveLength(1)
    expect(detail.progress[0]).toMatchObject({
      courseRef: 'curso-apagado',
      courseId: null,
      title: null,
      audience: null,
      lastActivityAt: null,
    })
  })

  test('ordenação: atividade mais recente primeiro; nunca-abertos por último', async () => {
    const { app, courses, entitlements } = buildApp()
    const c1 = seedSampleCourse(courses, 'kids-um', 'published', 'kids')
    const c2 = seedSampleCourse(courses, 'kids-dois', 'published', 'kids')
    seedSampleCourse(courses, 'kids-tres', 'published', 'kids')
    grantLifetime(entitlements, { userId: ACCOUNT, courseRef: 'kids-tres' })
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    // O relógio do buildApp é FIXO — as duas conclusões empatam no carimbo, então
    // a asserção forte é só "quem tem atividade vem antes de quem nunca abriu".
    await post(app, `/members/lessons/${c1.lessonIds[0]}/complete`, prof(PROFILE_A))
    await post(app, `/members/lessons/${c2.lessonIds[0]}/complete`, prof(PROFILE_A))

    const detail = await detailOf(app, [PROFILE_A])
    const cards = detail.profilesProgress[0].progress as {
      courseRef: string
      lastActivityAt: string | null
    }[]
    expect(cards).toHaveLength(3)
    // Os dois com atividade vêm antes; o matriculado nunca-aberto fecha a lista.
    expect(cards[2]?.courseRef).toBe('kids-tres')
    expect(cards[2]?.lastActivityAt).toBeNull()
    expect(cards.slice(0, 2).every((c) => c.lastActivityAt !== null)).toBe(true)
  })
})

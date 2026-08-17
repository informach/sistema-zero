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
    today: '2026-06-02',
    now: NOW,
    privileged: false,
  })
}

/**
 * Semeia o curso de ENTRADA (degrau `primeiros-passos-2d`) e o qualifica para o perfil.
 *
 * ⚠️ Desde 14/08 a Faísca estuda o degrau de entrada, não o Iniciante 2D: sem esse passo,
 * TODO curso do Iniciante 2D é `future-tier` e nunca se chega ao `foundation-first`, que é
 * o que estes testes existem para exercitar.
 */
async function comEntradaConcluida(
  courses: ReturnType<typeof buildApp>['courses'],
  gamification: ReturnType<typeof buildApp>['gamification'],
  ...profiles: string[]
) {
  const entrada = seedSampleCourse(
    courses,
    'primeiros-passos',
    'published',
    'kids',
    false,
    'primeiros-passos',
    '2d',
    1,
  )
  for (const profile of profiles.length > 0 ? profiles : [USER]) {
    await qualify(gamification, entrada.courseId, profile)
  }
  return entrada
}

describe('Carreira do Criador — acesso pedagógico aos cursos', () => {
  test('curso-base abre; demais aguardam concluir e publicar o curso-base', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    await comEntradaConcluida(courses, gamification)
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
    const lockedBody = (await locked.json()) as { error: object; careerLock: object }
    expect(lockedBody).toMatchObject({
      error: { code: 'COURSE_CAREER_LOCKED' },
      careerLock: { reason: 'foundation-first' },
    })
    // A chave do foundation-first é o CURSO-BASE, não um nível — sem requiredLevel.
    expect(lockedBody.careerLock).not.toHaveProperty('requiredLevel')
  })

  test('sem curso-base PUBLICADO na etapa, os demais NÃO ficam presos (fail-open)', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    await comEntradaConcluida(courses, gamification)
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
    const { app, courses, entitlements, gamification } = buildApp()
    await comEntradaConcluida(courses, gamification)
    seedSampleCourse(courses, 'base-2d', 'draft', 'kids', false, 'iniciante', '2d', 1)
    seedSampleCourse(courses, 'segundo-2d', 'published', 'kids', false, 'iniciante', '2d', 2)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    const response = await app.handle(
      new Request('http://localhost/members/courses/segundo-2d', { headers }),
    )
    expect(response.status).toBe(200)
  })

  test('catálogo: sem curso-base publicado, a posição 2 não trava', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    await comEntradaConcluida(courses, gamification)
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
    await comEntradaConcluida(courses, gamification)
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
    const { app, courses, entitlements, gamification } = buildApp()
    await comEntradaConcluida(courses, gamification)
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

  test('catálogo: bônus travado vira recompensa (tier-reward, sem foundationCourseSlug)', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    seedSampleCourse(courses, 'bonus-2d', 'published', 'kids')
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    const response = await app.handle(
      new Request('http://localhost/members/catalog?audience=kids', { headers }),
    )
    const body = (await response.json()) as { courses: Record<string, any>[] }
    const bonus = body.courses.find((course) => course.courseSlug === 'bonus-2d')
    expect(bonus).toMatchObject({
      hasAccess: true,
      careerLock: { locked: true, reason: 'tier-reward', requiredLevel: 'hacker' },
    })
    // A chave da recompensa é a ETAPA inteira, não um curso específico.
    expect(bonus?.careerLock).not.toHaveProperty('foundationCourseSlug')
  })

  test('família: a qualificação é POR PERFIL — o irmão não herda o destravamento', async () => {
    const PROFILE_B = '99999999-9999-4999-8999-999999999999'
    const { app, courses, entitlements, gamification } = buildApp()
    // Os DOIS irmãos fizeram o curso de entrada, então os dois estudam o Iniciante 2D.
    await comEntradaConcluida(courses, gamification, USER, PROFILE_B)
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
    // UMA matrícula da CONTA cobre os dois perfis…
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })
    // …mas só o perfil A (USER) concluiu+publicou o curso-base.
    await qualify(gamification, base.courseId, USER)

    const headersFor = (profileId: string) => ({
      'x-auth-user-id': profileId,
      'x-auth-account-id': ACCOUNT,
    })
    expect(
      (
        await app.handle(
          new Request('http://localhost/members/courses/segundo-2d', {
            headers: headersFor(USER),
          }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await app.handle(
          new Request('http://localhost/members/courses/segundo-2d', {
            headers: headersFor(PROFILE_B),
          }),
        )
      ).status,
    ).toBe(423)

    // O catálogo aplica a MESMA régua por perfil (matrícula da conta, trava do perfil).
    const catalogB = await app.handle(
      new Request('http://localhost/members/catalog?audience=kids', {
        headers: headersFor(PROFILE_B),
      }),
    )
    const body = (await catalogB.json()) as { courses: Record<string, unknown>[] }
    const segundo = body.courses.find((course) => course.courseSlug === 'segundo-2d')
    expect(segundo).toMatchObject({
      hasAccess: true,
      careerLock: { locked: true, reason: 'foundation-first', foundationCourseSlug: 'base-2d' },
    })
  })

  test('bônus é RECOMPENSA da etapa: trava até completar todos os obrigatórios', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    // O Iniciante 2D tem 8 posições: a etapa só COMPLETA — e libera o bônus-recompensa —
    // com as 8 qualificadas E o degrau de entrada concluído.
    await comEntradaConcluida(courses, gamification)
    const slots = Array.from({ length: 8 }, (_, index) =>
      seedSampleCourse(
        courses,
        `slot-${index + 1}`,
        'published',
        'kids',
        false,
        'iniciante',
        '2d',
        index + 1,
      ),
    )
    const bonus = seedSampleCourse(courses, 'bonus-2d', 'published', 'kids')
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    // Etapa incompleta → 423 apontando o nível-alvo (o que completa a etapa).
    const locked = await app.handle(
      new Request('http://localhost/members/courses/bonus-2d', { headers }),
    )
    expect(locked.status).toBe(423)
    expect(await locked.json()).toMatchObject({
      error: { code: 'COURSE_CAREER_LOCKED' },
      careerLock: { reason: 'tier-reward', requiredLevel: 'hacker' },
    })

    // Defesa em profundidade: a trava também barra as rotas INTERNAS do curso
    // (todas passam pelo CheckAccessService — aula por URL direta inclusa).
    expect(
      (
        await app.handle(
          new Request(`http://localhost/members/courses/bonus-2d/lessons/${bonus.lessonIds[0]}`, {
            headers,
          }),
        )
      ).status,
    ).toBe(423)

    // Qualificar TODOS os slots (concluir + publicar cada um) → recompensa abre.
    for (const slot of slots) await qualify(gamification, slot.courseId)
    expect(
      (await app.handle(new Request('http://localhost/members/courses/bonus-2d', { headers })))
        .status,
    ).toBe(200)
  })

  test('bônus sem curso-base publicado na etapa segue aberto (fail-open do rollout)', async () => {
    const { app, courses, entitlements } = buildApp()
    // Sem nenhuma etapa montada (cenário do deploy em prod): nada trava.
    seedSampleCourse(courses, 'bonus-solto', 'published', 'kids')
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })
    expect(
      (await app.handle(new Request('http://localhost/members/courses/bonus-solto', { headers })))
        .status,
    ).toBe(200)
  })

  test('equipe ignora a trava pedagógica (bônus-recompensa e etapa futura)', async () => {
    const { app, courses, entitlements } = buildApp()
    seedSampleCourse(courses, 'base-2d', 'published', 'kids', false, 'iniciante', '2d', 1)
    seedSampleCourse(courses, 'bonus-2d', 'published', 'kids')
    seedSampleCourse(courses, 'futuro', 'published', 'kids', false, 'avancado', '3d', 1)
    // (o degrau de entrada não é necessário aqui: a equipe ignora a trava por completo)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    const staffHeaders = {
      'x-auth-user-id': USER,
      'x-auth-user-role': 'staff',
      'x-auth-user-status': 'active',
    }
    expect(
      (
        await app.handle(
          new Request('http://localhost/members/courses/bonus-2d', { headers: staffHeaders }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await app.handle(
          new Request('http://localhost/members/courses/futuro', { headers: staffHeaders }),
        )
      ).status,
    ).toBe(200)
    // Aluno comum: com a etapa montada (base publicada), o bônus trava de verdade.
    expect(
      (await app.handle(new Request('http://localhost/members/courses/bonus-2d', { headers })))
        .status,
    ).toBe(423)
  })
})

/**
 * Os marcos NA VIEW (o selo do card e o contador da trilha). São os MESMOS eventos
 * que a trava lê, mas SEM cruzar: é a diferença entre "concluiu" e "concluiu e
 * publicou" que responde à criança por que um curso ainda não conta.
 */
describe('marcos do curso nas listagens', () => {
  async function catalogo(app: ReturnType<typeof buildApp>['app'], extra?: Record<string, string>) {
    const response = await app.handle(
      new Request('http://localhost/members/catalog?audience=kids', {
        headers: { ...headers, ...extra },
      }),
    )
    const body = (await response.json()) as { courses: Record<string, any>[] }
    return new Map(body.courses.map((course) => [course.courseSlug, course]))
  }

  test('separa concluído de concluído+publicado no catálogo', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    await comEntradaConcluida(courses, gamification)
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
    const segundo = seedSampleCourse(
      courses,
      'segundo-2d',
      'published',
      'kids',
      false,
      'iniciante',
      '2d',
      2,
    )
    seedSampleCourse(courses, 'intocado-2d', 'published', 'kids', false, 'iniciante', '2d', 3)
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })

    await qualify(gamification, base.courseId)
    // Só CONCLUIU o segundo: é este o estado que o selo precisa nomear.
    await gamification.award({
      userId: USER,
      accountId: ACCOUNT,
      audience: 'kids',
      events: [{ sourceType: 'course_complete', sourceId: segundo.courseId, amount: 0 }],
      today: '2026-06-02',
      now: NOW,
      privileged: false,
    })

    const bySlug = await catalogo(app)
    expect(bySlug.get('base-2d')?.milestones).toEqual({ completed: true, showcased: true })
    expect(bySlug.get('segundo-2d')?.milestones).toEqual({ completed: true, showcased: false })
    expect(bySlug.get('intocado-2d')?.milestones).toEqual({ completed: false, showcased: false })
    expect(gamification.careerCourseStateReads).toBe(1)
    expect(gamification.qualifyingCareerSlotReads).toBe(0)
  })

  test('"meus cursos" traz os mesmos marcos do catálogo', async () => {
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
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })
    await qualify(gamification, base.courseId)

    const response = await app.handle(
      new Request('http://localhost/members/courses?audience=kids', { headers }),
    )
    const body = (await response.json()) as { courses: Record<string, any>[] }
    const bySlug = new Map(body.courses.map((course) => [course.courseSlug, course]))
    expect(bySlug.get('base-2d')?.milestones).toEqual({ completed: true, showcased: true })
  })

  test('EQUIPE também recebe os próprios marcos (≠ da trava, que ela ignora)', async () => {
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
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })
    await qualify(gamification, base.courseId)

    // Sem isto o selo sumia justamente para quem testa a vitrine: o `privileged`
    // do `careerLock` é um bypass de TRAVA, não um filtro de histórico.
    const bySlug = await catalogo(app, {
      'x-auth-user-role': 'staff',
      'x-auth-user-status': 'active',
    })
    expect(bySlug.get('base-2d')?.milestones).toEqual({ completed: true, showcased: true })
  })

  test('vitrine ADULTA não consulta marco algum (não há Mural lá)', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const adulto = seedSampleCourse(courses, 'curso-adulto', 'published', 'adult')
    grantAllKidsCourses(entitlements, { userId: ACCOUNT })
    // Mesmo com marcos gravados na vitrine adulta, a view sai zerada de propósito.
    await gamification.award({
      userId: USER,
      accountId: ACCOUNT,
      audience: 'adult',
      events: [
        { sourceType: 'course_complete', sourceId: adulto.courseId, amount: 0 },
        { sourceType: 'course_showcased', sourceId: adulto.courseId, amount: 0 },
      ],
      today: '2026-06-02',
      now: NOW,
      privileged: false,
    })

    const response = await app.handle(
      new Request('http://localhost/members/catalog?audience=adult', { headers }),
    )
    const body = (await response.json()) as { courses: Record<string, any>[] }
    const bySlug = new Map(body.courses.map((course) => [course.courseSlug, course]))
    expect(bySlug.get('curso-adulto')?.milestones).toEqual({
      completed: false,
      showcased: false,
    })
    expect(gamification.careerCourseStateReads).toBe(0)
    expect(gamification.qualifyingCareerSlotReads).toBe(0)
  })
})

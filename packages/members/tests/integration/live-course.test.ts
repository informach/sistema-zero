/**
 * Cursos AO VIVO (14/10/2026): o curso tem modalidade, a aula do curso ao vivo abre pela VAGA na
 * turma (grant ativo da sessão daquela aula), e o ao vivo fica fora das listagens do aluno, da
 * chave-mestra, da Jornada e da liberação de blocos do Estúdio. As anotações da professora
 * viajam no rascunho e na publicação e NUNCA chegam à view do aluno.
 */
import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { LessonSection } from '@sistemazero/core/learning'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import { LiveRewardsService } from '../../src/application/gamification/live-rewards.service'
import type { CourseStatus } from '../../src/domain/course/course'
import { assignWeeklyMissions, LIVE_ACCESS_REF } from '../../src/domain/gamification/missions'
import { changeDraft, publishDraft, readDraft } from '../draft-authoring-helpers'
import { silentLogger } from '../fakes/in-memory'
import {
  buildApp,
  grantAllCourses,
  grantAllKidsCourses,
  grantLifetime,
  seedSampleCourse,
} from '../helpers'

type Env = ReturnType<typeof buildApp>
const readJson = (res: Response): Promise<any> => res.json()

const NOW = new Date('2026-11-07T17:00:00.000Z')
const HOUR = 3_600_000
const DAY = 24 * HOUR
const ACCOUNT = '77777777-7777-7777-7777-777777777777'
const CHILD = '88888888-8888-8888-8888-888888888888'
const STAFF = '55555555-5555-5555-5555-555555555555'

const childHeaders = { 'x-auth-user-id': CHILD, 'x-auth-account-id': ACCOUNT }
const roleHeaders = (role: string, userId = STAFF) => ({
  'x-auth-user-id': userId,
  'x-auth-user-role': role,
  'x-auth-user-status': 'active',
})

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

/**
 * O curso de exemplo do `seedSampleCourse` vira um curso AO VIVO kids com TRAVA SEQUENCIAL
 * ligada (para provar que ela não vale aqui). Cada aula fica só com um texto: a conclusão não
 * depende de vídeo nem de entrega.
 */
function seedLiveCourse(env: Env, status: CourseStatus = 'published', slug = 'oficina-ao-vivo') {
  const seeded = seedSampleCourse(env.courses, slug, status, 'kids', true)
  const course = env.courses.courses.find((item) => item.id === seeded.courseId)
  if (!course) throw new Error('curso não semeado')
  course.modality = 'live'
  course.metadata = { studioUnlockBlocks: ['jogo2d_pular'] }
  const lessonIds: string[] = [...seeded.lessonIds]
  env.courses.blocks = env.courses.blocks.filter((block) => !lessonIds.includes(block.lessonId))
  env.courses.attachments = env.courses.attachments.filter(
    (attachment) => !lessonIds.includes(attachment.lessonId),
  )
  for (const lessonId of lessonIds)
    env.courses.blocks.push({
      id: randomUUID(),
      lessonId,
      kind: 'rich_text',
      sortOrder: 0,
      content: { kind: 'rich_text', markdown: 'Hoje vamos criar juntos.' },
    })
  return { ...seeded, course, lessonIds }
}

/** A vaga da criança: um grant por aula, com o intervalo pedido (relativo a NOW). */
function grant(
  env: Env,
  courseId: string,
  lessonId: string,
  window: { from: number; to: number },
  over: Partial<Parameters<Env['liveLessonAccess']['grant']>[0]> = {},
) {
  env.liveLessonAccess.grant({
    accountId: ACCOUNT,
    learnerId: CHILD,
    courseId,
    lessonId,
    startsAt: new Date(NOW.getTime() + window.from),
    endsAt: new Date(NOW.getTime() + window.to),
    ...over,
  })
}

const lessonPath = (slug: string, lessonId: string) =>
  `/members/courses/${slug}/lessons/${lessonId}`

describe('Curso ao vivo — modalidade na autoria', () => {
  const COURSE = {
    slug: 'oficina-nova',
    title: 'Oficina Nova',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    status: 'draft',
    audience: 'kids',
  }
  const create = (env: Env, over: Record<string, unknown> = {}) =>
    request(env, '/members/admin/courses', { method: 'POST', body: { ...COURSE, ...over } })
  const patch = async (env: Env, id: string, body: Record<string, unknown>) => {
    const current = await readJson(await request(env, `/members/admin/courses/${id}`))
    return request(env, `/members/admin/courses/${id}`, {
      method: 'PATCH',
      body: { ...COURSE, ...body, version: current.version },
    })
  }

  test('nasce gravado por padrão; `modality: live` cria o curso ao vivo e a view a devolve', async () => {
    const env = buildApp({ now: NOW })
    const recorded = await readJson(await create(env))
    expect(recorded.modality).toBe('recorded')
    const live = await create(env, { slug: 'oficina-ao-vivo', modality: 'live' })
    expect(live.status).toBe(201)
    const body = await readJson(live)
    expect(body.modality).toBe('live')
    expect(body).toMatchObject({ careerSlot: null, journeyRole: 'reward' })
    expect(env.courses.courses.find((c) => c.id === body.id)?.modality).toBe('live')
  })

  test('curso ao vivo recusa posição e papel na Jornada, com recado', async () => {
    const env = buildApp({ now: NOW })
    const slot = await create(env, {
      modality: 'live',
      level: 'iniciante',
      careerSlot: 2,
      journeyRole: 'positioned',
    })
    expect(slot.status).toBe(400)
    expect((await readJson(slot)).error.message).toContain('Curso ao vivo não ocupa posição')
    const extra = await create(env, { modality: 'live', journeyRole: 'extra' })
    expect(extra.status).toBe(400)
    expect((await readJson(extra)).error.message).toContain('fora da Jornada')
    expect(env.courses.courses).toHaveLength(0)
  })

  test('PATCH: ausente preserva; trocar só sem turma; curso da Jornada precisa sair dela antes', async () => {
    const env = buildApp({ now: NOW })
    const created = await readJson(await create(env))
    const toLive = await patch(env, created.id, { modality: 'live' })
    expect(toLive.status).toBe(200)
    expect((await readJson(toLive)).modality).toBe('live')
    // Build antigo do Admin (sem o campo) não rebaixa o curso.
    const untouched = await patch(env, created.id, { title: 'Outro título' })
    expect((await readJson(untouched)).modality).toBe('live')

    // Com turma (o grant registra a turma do curso), a modalidade fica presa.
    env.liveLessonAccess.assignTeacher(STAFF, created.id)
    const locked = await patch(env, created.id, { modality: 'recorded' })
    expect(locked.status).toBe(409)
    const lockedBody = await readJson(locked)
    expect(lockedBody.error.code).toBe('COURSE_MODALITY_LOCKED')
    expect(lockedBody.error.message).toContain('já tem turma')
    expect(env.courses.courses.find((c) => c.id === created.id)?.modality).toBe('live')
    // O Admin manda a modalidade em TODO PATCH: o mesmo valor, com turma, não é troca.
    const same = await patch(env, created.id, { modality: 'live', title: 'Com turma' })
    expect(same.status).toBe(200)

    // Curso que ocupa posição na Jornada não vira ao vivo sem antes sair da posição.
    const positioned = await readJson(
      await create(env, {
        slug: 'curso-base',
        level: 'iniciante',
        careerSlot: 1,
        journeyRole: 'positioned',
      }),
    )
    const refused = await patch(env, positioned.id, {
      slug: 'curso-base',
      level: 'iniciante',
      modality: 'live',
    })
    expect(refused.status).toBe(400)
    const cleared = await patch(env, positioned.id, {
      slug: 'curso-base',
      level: 'iniciante',
      careerSlot: null,
      journeyRole: 'reward',
      modality: 'live',
    })
    expect(cleared.status).toBe(200)
  })

  test('curso que vira ao vivo sem papel na Jornada tem o papel antigo limpo, não recusado', async () => {
    const env = buildApp({ now: NOW })
    const extra = await readJson(
      await create(env, { slug: 'aventura-extra', level: 'iniciante', journeyRole: 'extra' }),
    )
    expect(extra.journeyRole).toBe('extra')
    // Como o Admin manda um curso ao vivo: posição vazia e SEM `journeyRole`.
    const toLive = await patch(env, extra.id, {
      slug: 'aventura-extra',
      level: 'iniciante',
      careerSlot: null,
      modality: 'live',
    })
    expect(toLive.status).toBe(200)
    expect(await readJson(toLive)).toMatchObject({ modality: 'live', journeyRole: 'reward' })
  })

  test('a listagem do Admin filtra pela modalidade e o clone preserva a modalidade', async () => {
    const env = buildApp({ now: NOW })
    await create(env)
    const live = await readJson(await create(env, { slug: 'oficina-ao-vivo', modality: 'live' }))
    const onlyLive = await readJson(await request(env, '/members/admin/courses?modality=live'))
    expect(onlyLive.items.map((c: { slug: string }) => c.slug)).toEqual(['oficina-ao-vivo'])
    const onlyRecorded = await readJson(
      await request(env, '/members/admin/courses?modality=recorded'),
    )
    expect(onlyRecorded.items.map((c: { slug: string }) => c.slug)).toEqual(['oficina-nova'])
    expect((await request(env, '/members/admin/courses?modality=hibrido')).status).not.toBe(200)

    const clone = await request(env, `/members/admin/courses/${live.id}/clone`, {
      method: 'POST',
      body: { audience: 'adult' },
    })
    expect(clone.status).toBe(201)
    expect(await readJson(clone)).toMatchObject({ audience: 'adult', modality: 'live' })
  })

  test('o clone aceita a modalidade: a versão ao vivo do mesmo tema na mesma plataforma', async () => {
    const env = buildApp({ now: NOW })
    const recorded = await readJson(await create(env, { slug: 'corre-dino' }))
    const clone = (body: Record<string, unknown>) =>
      request(env, `/members/admin/courses/${recorded.id}/clone`, { method: 'POST', body })
    const live = await clone({ audience: 'kids', modality: 'live' })
    expect(live.status).toBe(201)
    expect(await readJson(live)).toMatchObject({
      slug: 'corre-dino-ao-vivo',
      audience: 'kids',
      modality: 'live',
      careerSlot: null,
    })
    // Mesma plataforma E mesma modalidade é só duplicar: recusado.
    expect((await clone({ audience: 'kids', modality: 'recorded' })).status).toBe(409)
    expect((await clone({ audience: 'kids' })).status).toBe(409)
  })
})

describe('Curso ao vivo — acesso pela vaga na turma', () => {
  test('a aula abre só com grant ATIVO daquela aula; a trava sequencial não vale', async () => {
    const env = buildApp({ now: NOW })
    const { course, slug, lessonIds } = seedLiveCourse(env)
    const [first, second] = lessonIds as [string, string]
    // Aula 1 aberta agora; aula 2 só amanhã.
    grant(env, course.id, first, { from: -HOUR, to: 30 * DAY })
    grant(env, course.id, second, { from: DAY, to: 31 * DAY })

    expect((await request(env, lessonPath(slug, first), { headers: childHeaders })).status).toBe(
      200,
    )
    const closed = await request(env, lessonPath(slug, second), { headers: childHeaders })
    expect(closed.status).toBe(403)
    expect((await readJson(closed)).error.code).toBe('LIVE_LESSON_CLOSED')
    // As outras rotas de AULA seguem a mesma régua (aqui, a posição do vídeo).
    const position = (lessonId: string) =>
      request(env, `${lessonPath(slug, lessonId)}/position`, {
        method: 'PUT',
        headers: childHeaders,
        body: { positionSeconds: 10 },
      })
    expect((await position(first)).status).toBeLessThan(300)
    expect((await position(second)).status).toBe(403)

    // No dia do encontro 2, a aula 2 abre sem a 1 concluída (o curso tem a trava ligada).
    env.clockRef.now = new Date(NOW.getTime() + DAY + HOUR)
    expect((await request(env, lessonPath(slug, second), { headers: childHeaders })).status).toBe(
      200,
    )
    // O detalhe do curso marca como travada a aula que a vaga ainda não abriu.
    env.clockRef.now = NOW
    const detail = await readJson(
      await request(env, `/members/courses/${slug}`, { headers: childHeaders }),
    )
    const outline = detail.modules.flatMap((m: { lessons: unknown[] }) => m.lessons) as {
      id: string
      locked?: boolean
    }[]
    expect(outline.find((l) => l.id === first)?.locked).toBeFalsy()
    expect(outline.find((l) => l.id === second)?.locked).toBe(true)

    // Passado o prazo, nada abre.
    env.clockRef.now = new Date(NOW.getTime() + 40 * DAY)
    expect((await request(env, lessonPath(slug, first), { headers: childHeaders })).status).toBe(
      403,
    )
  })

  test('grant revogado, vaga revogada, turma em rascunho e outra criança não abrem', async () => {
    const env = buildApp({ now: NOW })
    const { course, slug, lessonIds } = seedLiveCourse(env)
    const first = lessonIds[0] as string
    grant(env, course.id, first, { from: -HOUR, to: DAY }, { revoked: true })
    grant(env, course.id, first, { from: -HOUR, to: DAY }, { enrollmentStatus: 'revoked' })
    grant(env, course.id, first, { from: -HOUR, to: DAY }, { cohortStatus: 'draft' })
    grant(env, course.id, first, { from: -HOUR, to: DAY }, { learnerId: randomUUID() })
    expect((await request(env, lessonPath(slug, first), { headers: childHeaders })).status).toBe(
      403,
    )
  })

  test('matrícula e chave-mestra NÃO abrem curso ao vivo', async () => {
    const env = buildApp({ now: NOW })
    const { slug, lessonIds } = seedLiveCourse(env)
    grantAllKidsCourses(env.entitlements, { userId: ACCOUNT })
    grantAllCourses(env.entitlements, { userId: ACCOUNT })
    grantLifetime(env.entitlements, { userId: ACCOUNT, courseRef: slug })
    const res = await request(env, lessonPath(slug, lessonIds[0] as string), {
      headers: childHeaders,
    })
    expect(res.status).toBe(403)
  })

  test('a equipe vê o curso ao vivo, inclusive em rascunho; o aluno não vê o rascunho', async () => {
    const env = buildApp({ now: NOW })
    const { course, slug, lessonIds } = seedLiveCourse(env, 'draft')
    const first = lessonIds[0] as string
    for (const role of ['superadmin', 'admin', 'staff'])
      expect(
        (await request(env, lessonPath(slug, first), { headers: roleHeaders(role) })).status,
      ).toBe(200)
    grant(env, course.id, first, { from: -HOUR, to: DAY })
    expect((await request(env, lessonPath(slug, first), { headers: childHeaders })).status).toBe(
      404,
    )
  })

  test('concluir a aula ao vivo funciona pela vaga e paga o XP de sempre', async () => {
    const env = buildApp({ now: NOW })
    const { course, lessonIds } = seedLiveCourse(env)
    const first = lessonIds[0] as string
    const second = lessonIds[1] as string
    grant(env, course.id, first, { from: -HOUR, to: DAY })
    const done = await request(env, `/members/lessons/${first}/complete`, {
      method: 'POST',
      headers: childHeaders,
    })
    expect(done.status).toBe(200)
    expect((await readJson(done)).gamification.xpAwarded).toBeGreaterThan(0)
    const refused = await request(env, `/members/lessons/${second}/complete`, {
      method: 'POST',
      headers: childHeaders,
    })
    expect(refused.status).toBe(403)
  })
})

describe('Curso ao vivo — onde ele NÃO entra', () => {
  test('catálogo e "meus cursos" (inclusive pela chave-mestra) só listam o gravado', async () => {
    const env = buildApp({ now: NOW })
    seedSampleCourse(env.courses, 'aventura-gravada', 'published', 'kids')
    const { course, slug, lessonIds } = seedLiveCourse(env)
    grant(env, course.id, lessonIds[0] as string, { from: -HOUR, to: DAY })
    grantAllKidsCourses(env.entitlements, { userId: ACCOUNT })
    grantLifetime(env.entitlements, { userId: ACCOUNT, courseRef: slug })

    const catalog = await readJson(
      await request(env, '/members/catalog?audience=kids', { headers: childHeaders }),
    )
    const mine = await readJson(
      await request(env, '/members/courses?audience=kids', { headers: childHeaders }),
    )
    for (const list of [catalog.courses, mine.courses]) {
      const slugs = list.map((c: { slug?: string; courseSlug?: string }) => c.slug ?? c.courseSlug)
      expect(slugs).toContain('aventura-gravada')
      expect(slugs).not.toContain(slug)
    }
    // A equipe (chave-mestra virtual) também não vê o ao vivo na vitrine.
    const staffMine = await readJson(
      await request(env, '/members/courses?audience=kids', { headers: roleHeaders('admin') }),
    )
    expect(staffMine.courses.map((c: { courseSlug: string }) => c.courseSlug)).not.toContain(slug)
  })

  test('concluir o curso ao vivo não gera marco da Jornada: vira "Oficina completa" com troféu', async () => {
    const env = buildApp({ now: NOW })
    const { course, lessonIds } = seedLiveCourse(env)
    for (const lessonId of lessonIds) grant(env, course.id, lessonId, { from: -HOUR, to: DAY })
    for (const lessonId of lessonIds)
      expect(
        (
          await request(env, `/members/lessons/${lessonId}/complete`, {
            method: 'POST',
            headers: childHeaders,
          })
        ).status,
      ).toBe(200)
    const types = env.gamification.events
      .filter((event) => event.userId === CHILD)
      .map((event) => event.sourceType)
    expect(types).toContain('live_course_complete')
    expect(types).not.toContain('course_complete')
    expect(
      env.gamification.badges.filter((b) => b.userId === CHILD).map((b) => b.badgeSlug),
    ).toContain('live-course-complete')
    expect(env.room.inventory.map((item) => item.itemId)).toContain('trofeu-oficina-completa')
    // Nada de bloco do Estúdio pelo currículo, nem com o metadata preenchido.
    const unlocks = await readJson(
      await request(env, '/members/studio/unlocks?audience=kids', { headers: childHeaders }),
    )
    expect(JSON.stringify(unlocks)).not.toContain('jogo2d_pular')
  })

  test('curso ao vivo não se libera por matrícula manual (a vaga é na turma)', async () => {
    const env = buildApp({ now: NOW })
    const { slug } = seedLiveCourse(env)
    const res = await request(env, '/members/admin/entitlements', {
      method: 'POST',
      headers: roleHeaders('admin'),
      body: { mode: 'course', userId: ACCOUNT, courseRef: slug },
    })
    expect(res.status).toBe(400)
    expect((await readJson(res)).error.message).toContain(
      'Curso ao vivo não se libera por matrícula',
    )
    expect(await env.entitlements.listActiveByUser(ACCOUNT, NOW)).toEqual([])
  })

  test('o Mural de um curso ao vivo não grava o marco da Jornada (`course_showcased`)', async () => {
    const env = buildApp({ now: NOW })
    const { course } = seedLiveCourse(env)
    const award = new AwardGamificationService(env.gamification, () => NOW, silentLogger)
    await award.awardCourseShowcased({
      userId: CHILD,
      accountId: ACCOUNT,
      courseId: course.id,
      audience: 'kids',
    })
    expect(env.gamification.events.some((e) => e.sourceType === 'course_showcased')).toBe(false)
  })

  test('marco de curso ao vivo legado não libera bloco do Estúdio', async () => {
    const env = buildApp({ now: NOW })
    const { course } = seedLiveCourse(env)
    // Um `course_complete` de antes da regra (o curso virou ao vivo depois).
    env.gamification.events.push({
      userId: CHILD,
      audience: 'kids',
      sourceType: 'course_complete',
      sourceId: course.id,
      amount: 0,
      sourceLevel: 'iniciante',
      sourceTrack: '2d',
      sourceCareerSlot: null,
      createdAt: NOW,
    })
    expect(await env.gamification.listStudioUnlocksByCourse(CHILD, 'kids')).toEqual([])
  })
})

describe('Curso ao vivo — recompensas do encontro', () => {
  test('o encontro dá a conquista uma vez por ocorrência, sem XP de presença', async () => {
    const env = buildApp({ now: NOW })
    const rewards = new LiveRewardsService(
      new AwardGamificationService(env.gamification, () => NOW, silentLogger),
    )
    const occurrenceId = randomUUID()
    const input = {
      learnerId: CHILD,
      accountId: ACCOUNT,
      occurrenceId,
      courseId: randomUUID(),
      audience: 'kids' as const,
    }
    await rewards.encounterAttended(input)
    await rewards.encounterAttended(input)
    const encounters = env.gamification.events.filter((e) => e.sourceType === 'live_encounter')
    expect(encounters).toHaveLength(1)
    expect(encounters[0]).toMatchObject({ sourceId: occurrenceId, amount: 0 })
    expect(
      env.gamification.badges.filter((b) => b.badgeSlug === 'live-first-encounter'),
    ).toHaveLength(1)
    expect(env.gamification.profiles.get(`${CHILD}:kids`)?.xp ?? 0).toBe(0)
  })

  test('as conquistas e o troféu da oficina só aparecem depois de ganhos (sem divulgação)', async () => {
    const env = buildApp({ now: NOW })
    const { course, lessonIds } = seedLiveCourse(env)
    const me = async () =>
      (
        await readJson(
          await request(env, '/members/gamification/me?audience=kids', { headers: childHeaders }),
        )
      ).badges.map((b: { slug: string }) => b.slug) as string[]
    const roomItems = async () =>
      (
        await readJson(await request(env, '/members/room?audience=kids', { headers: childHeaders }))
      ).items.map((i: { id: string }) => i.id) as string[]
    expect(await me()).not.toContain('live-first-encounter')
    expect(await me()).toContain('first-lesson')
    expect(await roomItems()).not.toContain('trofeu-oficina-completa')
    expect(await roomItems()).toContain('trofeu-diploma')

    await new LiveRewardsService(
      new AwardGamificationService(env.gamification, () => NOW, silentLogger),
    ).encounterAttended({
      learnerId: CHILD,
      accountId: ACCOUNT,
      occurrenceId: randomUUID(),
      courseId: course.id,
      audience: 'kids',
    })
    for (const lessonId of lessonIds) grant(env, course.id, lessonId, { from: -HOUR, to: DAY })
    for (const lessonId of lessonIds)
      await request(env, `/members/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: childHeaders,
      })
    expect(await me()).toEqual(
      expect.arrayContaining(['live-first-encounter', 'live-course-complete']),
    )
    expect(await roomItems()).toContain('trofeu-oficina-completa')
  })

  test('a recompensa nunca derruba quem chama (fail-open)', async () => {
    const env = buildApp({ now: NOW })
    env.gamification.failAlways = true
    const rewards = new LiveRewardsService(
      new AwardGamificationService(env.gamification, () => NOW, silentLogger),
    )
    await expect(
      rewards.encounterAttended({
        learnerId: CHILD,
        accountId: ACCOUNT,
        occurrenceId: randomUUID(),
        courseId: randomUUID(),
        audience: 'kids',
      }),
    ).resolves.toBeUndefined()
  })

  test('a missão semanal do encontro só entra para quem tem vaga ativa', async () => {
    const env = buildApp({ now: NOW })
    const { course, lessonIds } = seedLiveCourse(env)
    // Um perfil cujo sorteio semanal, COM a vaga, traz a missão do encontro.
    const weekKey = 'w:2026-11-02'
    const withSeat = (ref: string) => ref === LIVE_ACCESS_REF
    const learner = Array.from({ length: 400 }, (_, i) => `0000${i}`.slice(-4))
      .map((suffix) => `99999999-9999-9999-9999-99999999${suffix}`)
      .find((id) =>
        assignWeeklyMissions(id, weekKey, withSeat).some((m) => m.goalType === 'live_encounter'),
      )
    if (!learner) throw new Error('nenhum perfil sorteou a missão do encontro')
    const headers = { 'x-auth-user-id': learner, 'x-auth-account-id': ACCOUNT }
    const weekly = async () =>
      (
        await readJson(
          await request(env, '/members/gamification/missions/me?audience=kids', { headers }),
        )
      ).weekly as { slug: string; progress: number }[]

    expect((await weekly()).map((m) => m.slug)).not.toContain('weekly-encontro-ao-vivo')
    env.liveLessonAccess.grant({
      accountId: ACCOUNT,
      learnerId: learner,
      courseId: course.id,
      lessonId: lessonIds[0] as string,
      startsAt: new Date(NOW.getTime() + DAY),
      endsAt: new Date(NOW.getTime() + 30 * DAY),
    })
    await new LiveRewardsService(
      new AwardGamificationService(env.gamification, () => NOW, silentLogger),
    ).encounterAttended({
      learnerId: learner,
      accountId: ACCOUNT,
      occurrenceId: randomUUID(),
      courseId: course.id,
      audience: 'kids',
    })
    const mission = (await weekly()).find((m) => m.slug === 'weekly-encontro-ao-vivo')
    expect(mission?.progress).toBe(1)
    const claim = await request(
      env,
      '/members/gamification/missions/weekly-encontro-ao-vivo/claim?audience=kids',
      { method: 'POST', headers },
    )
    expect(claim.status).toBe(200)
  })
})

describe('Anotações da professora', () => {
  async function publishedWithNotes(env: Env, notes = 'Mostre o bloco de colisão.') {
    const live = seedLiveCourse(env)
    const lessonId = live.lessonIds[0] as string
    const draft = await readDraft(env.app, lessonId)
    // Uma parte de verdade (objetivo e intenção próprios): a seção automática de uma aula antiga
    // é refeita na hora de tocar (`playbackLessonStructure`) e esconderia um vazamento.
    const sections: LessonSection[] = draft.document.sections.map((section) => ({
      ...section,
      title: 'Parte da colisão',
      objective: 'Criar a primeira cena juntos.',
      intent: 'presentation',
      teacherNotes: notes,
    }))
    const changed = await changeDraft(env.app, lessonId, { type: 'structure', sections })
    expect(changed.status).toBe(200)
    expect((await readDraft(env.app, lessonId)).document.sections[0]?.teacherNotes).toBe(notes)
    expect((await publishDraft(env.app, lessonId)).status).toBe(200)
    return { ...live, lessonId, sectionId: sections[0]?.id as string }
  }

  test('rascunho e publicação guardam; a view do ALUNO nunca leva o campo', async () => {
    const env = buildApp({ now: NOW })
    const { course, slug, lessonId } = await publishedWithNotes(env)
    expect(env.learningRepository.structures.get(lessonId)?.sections[0]?.teacherNotes).toBe(
      'Mostre o bloco de colisão.',
    )
    grant(env, course.id, lessonId, { from: -HOUR, to: DAY })
    for (const headers of [childHeaders, roleHeaders('admin')]) {
      const res = await request(env, lessonPath(slug, lessonId), { headers })
      expect(res.status).toBe(200)
      const text = await res.text()
      // A parte publicada chegou (anti-vácuo: é ela que levaria o campo)...
      expect(text).toContain('Parte da colisão')
      // ...sem as anotações.
      expect(text).not.toContain('teacherNotes')
      expect(text).not.toContain('Mostre o bloco de colisão.')
    }
  })

  test('a rota da professora devolve as anotações publicadas por parte', async () => {
    const env = buildApp({ now: NOW })
    const { course, lessonId, sectionId } = await publishedWithNotes(env)
    const notes = (headers: Record<string, string>) =>
      request(env, `/members/admin/live/lessons/${lessonId}/teacher-notes`, { headers })

    const admin = await notes(roleHeaders('admin'))
    expect(admin.status).toBe(200)
    expect(await readJson(admin)).toEqual({ notes: { [sectionId]: 'Mostre o bloco de colisão.' } })
    // Equipe não atribuída à turma não lê; a professora atribuída lê.
    expect((await notes(roleHeaders('staff'))).status).toBe(403)
    env.liveLessonAccess.assignTeacher(STAFF, course.id)
    expect((await notes(roleHeaders('staff'))).status).toBe(200)
    // Criança (sem papel de equipe) nunca lê.
    expect((await notes(childHeaders)).status).toBe(403)
  })

  test('aula de curso gravado não tem anotações pela rota das oficinas', async () => {
    const env = buildApp({ now: NOW })
    const { lessonIds } = seedSampleCourse(env.courses, 'aventura-gravada')
    const res = await request(env, `/members/admin/live/lessons/${lessonIds[0]}/teacher-notes`, {
      headers: roleHeaders('admin'),
    })
    expect(res.status).toBe(404)
  })

  test('anotações acima do teto são recusadas no rascunho', async () => {
    const env = buildApp({ now: NOW })
    const { lessonIds } = seedLiveCourse(env)
    const lessonId = lessonIds[0] as string
    const draft = await readDraft(env.app, lessonId)
    const res = await changeDraft(env.app, lessonId, {
      type: 'structure',
      sections: draft.document.sections.map((section) => ({
        ...section,
        teacherNotes: 'x'.repeat(4001),
      })),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})

describe('Manifesto de aula de curso ao vivo', () => {
  const manifest = (
    slug: string,
    over: { video?: 'planned' | 'pending'; teacherNotes?: string } = {},
  ) => ({
    version: 5,
    courseSlug: slug,
    lessonSlug: 'aula-1',
    title: 'Encontro 1',
    blocks: [
      { key: 'texto', content: { kind: 'rich_text', markdown: 'Hoje vamos criar juntos.' } },
      ...(over.video === 'planned' ? [{ key: 'video', plannedVideo: 'Gravar a abertura.' }] : []),
    ],
    sections: [
      {
        key: 'abertura',
        title: 'Abertura',
        objective: '',
        intent: 'presentation',
        blockKeys: ['texto', ...(over.video === 'planned' ? ['video'] : [])],
        workspaceKey: null,
        externalTool: null,
        pendingMedia: over.video === 'pending' ? ['Gravar a abertura.'] : [],
        completion: { version: 1, blockIds: [] },
        ...(over.teacherNotes ? { teacherNotes: over.teacherNotes } : {}),
      },
    ],
  })
  const preview = (env: Env, lessonId: string, document: unknown) =>
    request(env, `/members/admin/lessons/${lessonId}/import-preview`, {
      method: 'POST',
      headers: roleHeaders('admin', '11111111-1111-1111-1111-111111111111'),
      body: { document },
    })

  test('aceita `teacherNotes` por seção e as leva ao rascunho', async () => {
    const env = buildApp({ now: NOW })
    const { slug, lessonIds } = seedLiveCourse(env)
    const res = await preview(
      env,
      lessonIds[0] as string,
      manifest(slug, { teacherNotes: 'Desenhe a seta no sprite.' }),
    )
    expect(res.status).toBe(200)
    expect((await readJson(res)).sections[0].teacherNotes).toBe('Desenhe a seta no sprite.')
  })

  test('recusa vídeo planejado (e mídia pendente) numa aula de curso ao vivo, com o recado', async () => {
    const env = buildApp({ now: NOW })
    const { slug, lessonIds } = seedLiveCourse(env)
    for (const video of ['planned', 'pending'] as const) {
      const res = await preview(env, lessonIds[0] as string, manifest(slug, { video }))
      expect(res.status).toBe(400)
      expect((await readJson(res)).error.message).toBe(
        'Aula ao vivo não tem vídeo gravado: a transmissão do encontro faz esse papel.',
      )
    }
  })

  test('no curso gravado o vídeo planejado continua valendo', async () => {
    const env = buildApp({ now: NOW })
    const { lessonIds } = seedSampleCourse(env.courses, 'aventura-gravada', 'published', 'kids')
    const res = await preview(
      env,
      lessonIds[0] as string,
      manifest('aventura-gravada', { video: 'planned' }),
    )
    expect(res.status).toBe(200)
  })
})

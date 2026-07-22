import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { BADGE_SLUGS } from '../../src/domain/gamification/badges'
import { DAILY_COIN_CAP } from '../../src/domain/gamification/coins'
import type { InMemoryCourseRepository } from '../fakes/in-memory'
import { buildApp, grantLifetime, seedSampleCourse, signedWebhookHeaders } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

function seedCareerCourse(courses: InMemoryCourseRepository) {
  const sample = seedSampleCourse(courses)
  const row = courses.courses.find((course) => course.id === sample.courseId)
  if (row) row.careerSlot = 1
  return sample
}

const complete = (app: App, lessonId: string, headers: Record<string, string> = authHeaders) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers,
    }),
  )

const submitQuiz = (app: App, lessonId: string, blockId: string, answers: unknown) =>
  app.handle(
    new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/quiz-attempts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ answers }),
    }),
  )

const getMe = (app: App, headers: Record<string, string> = authHeaders) =>
  app.handle(new Request('http://localhost/members/gamification/me', { headers }))

/**
 * Quiz de 1 questão (gabarito 'b') — score 100 acertando, 0 errando.
 * `twoQuestions` adiciona a q2 (gabarito 'c') → acertar só uma = score 50.
 */
function seedQuizBlock(
  courses: InMemoryCourseRepository,
  lessonId: string,
  opts: { passingScore?: number; twoQuestions?: boolean } = {},
) {
  const blockId = randomUUID()
  courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'quiz',
    sortOrder: 10,
    content: {
      kind: 'quiz',
      ...(opts.passingScore !== undefined ? { passingScore: opts.passingScore } : {}),
      questions: [
        {
          id: 'q1',
          prompt: '2 + 2?',
          choices: [
            { id: 'a', label: '3' },
            { id: 'b', label: '4' },
          ],
          correctChoiceIds: ['b'],
        },
        ...(opts.twoQuestions
          ? [
              {
                id: 'q2',
                prompt: 'Capital do Brasil?',
                choices: [
                  { id: 'c', label: 'Brasília' },
                  { id: 'd', label: 'Rio' },
                ],
                correctChoiceIds: ['c'],
              },
            ]
          : []),
      ],
    },
  })
  return blockId
}

// buildApp default: 2026-06-02T12:00:00Z = 09:00 em SP → dia civil 2026-06-02.

describe('Gamificação — XP e idempotência', () => {
  test('complete → +10 XP, streak 1 e badge first-lesson; re-complete → 0 e nada muda', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const first = await readJson(await complete(app, course.lessonIds[0]))
    expect(first.gamification).toMatchObject({
      xpAwarded: 10,
      totalXp: 10,
      streak: { current: 1, best: 1, extended: true },
      unitCompleted: false,
    })
    expect(first.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'first-lesson',
    ])

    const again = await readJson(await complete(app, course.lessonIds[0]))
    expect(again.gamification).toMatchObject({
      xpAwarded: 0,
      totalXp: 10,
      streak: { current: 1, extended: false },
      unitCompleted: false,
    })
    expect(again.gamification.badgesUnlocked).toEqual([])
  })

  test('última aula do módulo → baú (+25) e curso completo → badge course-complete', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    await complete(app, course.lessonIds[0])
    const done = await readJson(await complete(app, course.lessonIds[1]))
    // 10 da aula + 25 do baú (módulo único = curso completo).
    expect(done.gamification).toMatchObject({
      xpAwarded: 35,
      totalXp: 45,
      unitCompleted: true,
      streak: { current: 1, extended: false },
    })
    expect(done.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'course-complete',
    ])

    // Re-complete: baú NÃO duplica (ledger por moduleId).
    const again = await readJson(await complete(app, course.lessonIds[1]))
    expect(again.gamification).toMatchObject({ xpAwarded: 0, totalXp: 45, unitCompleted: false })
  })

  test('2º e 3º cursos 100% destravam course-complete-2 e -3 (marco no ledger)', async () => {
    const { app, courses, entitlements } = buildApp()
    const c1 = seedSampleCourse(courses, 'curso-1')
    const c2 = seedSampleCourse(courses, 'curso-2')
    const c3 = seedSampleCourse(courses, 'curso-3')
    for (const c of [c1, c2, c3]) grantLifetime(entitlements, { userId: USER, courseRef: c.slug })

    const finishCourse = async (c: typeof c1) => {
      await complete(app, c.lessonIds[0])
      return readJson(await complete(app, c.lessonIds[1]))
    }

    const first = await finishCourse(c1)
    expect(first.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'course-complete',
    ])

    const second = await finishCourse(c2)
    expect(second.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'course-complete-2',
    ])
    // Marco é evento de amount 0 — o XP do complete não muda (10 + 25 do baú).
    expect(second.gamification.xpAwarded).toBe(35)

    const third = await finishCourse(c3)
    expect(third.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'course-complete-3',
    ])

    // Re-complete da última aula: marco dedupado, nada re-destrava.
    const again = await readJson(await complete(app, c3.lessonIds[1]))
    expect(again.gamification.xpAwarded).toBe(0)
    expect(again.gamification.badgesUnlocked).toEqual([])
  })

  test('aula despublicada não conta p/ o baú (módulo fecha sobre as PUBLICADAS)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const draft = courses.lessons.find((l) => l.id === course.lessonIds[1])
    if (draft) draft.isPublished = false

    // Única aula publicada do módulo concluída → baú abre (e curso 100%).
    const done = await readJson(await complete(app, course.lessonIds[0]))
    expect(done.gamification).toMatchObject({ xpAwarded: 35, unitCompleted: true })
  })
})

describe('Gamificação — streak diário (America/Sao_Paulo)', () => {
  test('2ª atividade no mesmo dia não estende; dia seguinte estende; gap reseta com best', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const c1 = seedSampleCourse(courses, 'curso-1')
    const c2 = seedSampleCourse(courses, 'curso-2')
    grantLifetime(entitlements, { userId: USER, courseRef: c1.slug })
    grantLifetime(entitlements, { userId: USER, courseRef: c2.slug })

    // Dia 1 (2026-06-02 SP): duas atividades → streak segue 1.
    const a = await readJson(await complete(app, c1.lessonIds[0]))
    expect(a.gamification.streak).toEqual({ current: 1, best: 1, extended: true })
    const b = await readJson(await complete(app, c1.lessonIds[1]))
    expect(b.gamification.streak).toMatchObject({ current: 1, extended: false })

    // Dia 2: estende.
    clockRef.now = new Date('2026-06-03T12:00:00.000Z')
    const c = await readJson(await complete(app, c2.lessonIds[0]))
    expect(c.gamification.streak).toEqual({ current: 2, best: 2, extended: true })

    // Gap GRANDE (06-07, pulou 04/05/06 = 3 dias) > o único freeze grátis do mês →
    // recomeça em 1, best preservado. (1 dia perdido seria coberto pelo freeze — ver
    // o teste de streak-freeze; aqui o gap supera a proteção.)
    clockRef.now = new Date('2026-06-07T12:00:00.000Z')
    const d = await readJson(await complete(app, c2.lessonIds[1]))
    expect(d.gamification.streak).toEqual({ current: 1, best: 2, extended: true })
  })

  test('23h de SP ainda é o MESMO dia civil (02:00Z do dia seguinte em UTC)', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    // 2026-06-02 09:00 SP.
    await complete(app, course.lessonIds[0])
    // 2026-06-03T02:00Z = 2026-06-02 23:00 SP → mesmo dia, não estende.
    clockRef.now = new Date('2026-06-03T02:00:00.000Z')
    const sameDay = await readJson(await complete(app, course.lessonIds[1]))
    expect(sameDay.gamification.streak).toMatchObject({ current: 1, extended: false })
  })
})

describe('Gamificação — quiz', () => {
  test('aprovado → 20 + bônus por nota; reprovado → gamification null e streak intocado', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0], { passingScore: 50 })

    // Reprova (resposta errada, score 0 < 50): sem XP, sem streak.
    const fail = await readJson(await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['a'] }))
    expect(fail.passed).toBe(false)
    expect(fail.gamification).toBeNull()
    expect(await gamification.getProfile(USER, 'adult')).toBeNull()
  })

  test('nota 100 → 30 XP + quiz-perfect; re-aprovação → XP 0 (ledger por bloco)', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0], { passingScore: 50 })

    const pass = await readJson(await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'] }))
    expect(pass.passed).toBe(true)
    expect(pass.gamification).toMatchObject({
      xpAwarded: 30,
      totalXp: 30,
      streak: { current: 1, extended: true },
      unitCompleted: false,
    })
    expect(pass.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'quiz-perfect',
    ])

    // Re-aprovação (permitida — sem cooldown após passar): XP não duplica.
    clockRef.now = new Date('2026-06-02T13:00:00.000Z')
    const again = await readJson(await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'] }))
    expect(again.passed).toBe(true)
    expect(again.gamification).toMatchObject({ xpAwarded: 0, totalXp: 30 })
    expect(again.gamification.badgesUnlocked).toEqual([])
  })
})

describe('Gamificação — marcos de nota mil (quiz-perfect-10/-30)', () => {
  test('re-pass com 100 destrava a badge SEM mover o streak (marco é amount 0)', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const blockId = seedQuizBlock(courses, course.lessonIds[0], {
      passingScore: 50,
      twoQuestions: true,
    })

    // Passa com 50 (1 de 2): 20 + 5 de bônus; streak 1.
    const half = await readJson(
      await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'], q2: ['d'] }),
    )
    expect(half.passed).toBe(true)
    expect(half.gamification).toMatchObject({
      xpAwarded: 25,
      streak: { current: 1, extended: true },
    })
    expect(half.gamification.badgesUnlocked).toEqual([])

    // Dia seguinte, re-pass com 100: só o MARCO é novo → badge SIM, streak NÃO
    // (regra: streak só avança com XP real; o re-pass não rende XP).
    clockRef.now = new Date('2026-06-03T12:00:00.000Z')
    const perfect = await readJson(
      await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'], q2: ['c'] }),
    )
    expect(perfect.gamification).toMatchObject({
      xpAwarded: 0,
      streak: { current: 1, extended: false },
    })
    expect(perfect.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'quiz-perfect',
    ])
  })

  test('10ª e 30ª notas mil destravam quiz-perfect-10 e -30', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const passPerfect = async () => {
      const blockId = seedQuizBlock(courses, course.lessonIds[0])
      return readJson(await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'] }))
    }

    let last: any = null
    for (let i = 0; i < 10; i++) last = await passPerfect()
    expect(last.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'quiz-perfect-10',
    ])

    for (let i = 0; i < 20; i++) last = await passPerfect()
    expect(last.gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'quiz-perfect-30',
    ])
  })
})

describe('Gamificação — GET /members/gamification/me', () => {
  test('sem perfil → zeros e catálogo completo bloqueado', async () => {
    const { app } = buildApp()
    const res = await getMe(app)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body).toEqual({
      xp: 0,
      coins: { balance: 0 },
      streak: {
        current: 0,
        best: 0,
        activeToday: false,
        freezesAvailable: 0,
        onVacation: false,
        vacationUntil: null,
      },
      // Catálogo completo do domain, todo bloqueado (derivado — robusto a novos slugs).
      badges: BADGE_SLUGS.map((slug) => ({ slug, unlockedAt: null })),
      // Sem cursos qualificados → Noob; falta 1 curso (concluído + publicado) p/ Coder.
      level: {
        slug: 'noob',
        next: 'coder',
        remaining: {
          any: 0,
          'iniciante-2d': 1,
          'iniciante-3d': 0,
          'intermediario-2d': 0,
          'intermediario-3d': 0,
          'avancado-2d': 0,
          'avancado-3d': 0,
        },
      },
    })
  })

  test('com atividade → perfil mesclado; streak de exibição zera quando quebrado', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await complete(app, course.lessonIds[0])

    const active = await readJson(await getMe(app))
    expect(active.xp).toBe(10)
    // A 1ª atividade do mês também concede o freeze grátis (freezesAvailable: 1).
    expect(active.streak).toEqual({
      current: 1,
      best: 1,
      activeToday: true,
      freezesAvailable: 1,
      onVacation: false,
      vacationUntil: null,
    })
    const first = active.badges.find((b: { slug: string }) => b.slug === 'first-lesson')
    expect(first.unlockedAt).not.toBeNull()

    // Ontem ainda mantém; e o freeze grátis cobriria até 1 dia perdido.
    clockRef.now = new Date('2026-06-03T12:00:00.000Z')
    const next = await readJson(await getMe(app))
    expect(next.streak.current).toBe(1)

    // Gap GRANDE (06-10, 7 dias perdidos) supera o único freeze grátis → exibição zera.
    clockRef.now = new Date('2026-06-10T12:00:00.000Z')
    const broken = await readJson(await getMe(app))
    expect(broken.streak.current).toBe(0)
    expect(broken.streak.best).toBe(1)
  })

  test('sem identidade → 401', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/members/gamification/me'))
    expect(res.status).toBe(401)
  })
})

describe('Gamificação — segregação por vitrine (?audience=)', () => {
  test('XP/streak/badges do kids NÃO vazam para o perfil adult (e vice-versa)', async () => {
    const { app, courses, entitlements } = buildApp()
    const kidsCourse = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const adultCourse = seedSampleCourse(courses, 'curso-adulto', 'published', 'adult')
    grantLifetime(entitlements, { userId: USER, courseRef: kidsCourse.slug })
    grantLifetime(entitlements, { userId: USER, courseRef: adultCourse.slug })

    // 1 aula kids (+10) e curso adulto INTEIRO (+10+10+25 = 45).
    await complete(app, kidsCourse.lessonIds[0])
    await complete(app, adultCourse.lessonIds[0])
    await complete(app, adultCourse.lessonIds[1])

    const kids = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids', {
          headers: authHeaders,
        }),
      ),
    )
    expect(kids.xp).toBe(10)
    expect(kids.streak.current).toBe(1)
    const kidsUnlocked = kids.badges.filter((b: { unlockedAt: string | null }) => b.unlockedAt)
    expect(kidsUnlocked.map((b: { slug: string }) => b.slug)).toEqual(['first-lesson'])

    // Perfil ADULT é independente: XP próprio e badges próprias (incl. curso completo).
    const adult = await readJson(await getMe(app)) // default adult
    expect(adult.xp).toBe(45)
    const adultUnlocked = adult.badges.filter((b: { unlockedAt: string | null }) => b.unlockedAt)
    expect(adultUnlocked.map((b: { slug: string }) => b.slug)).toEqual([
      'first-lesson',
      'course-complete',
    ])
  })
})

describe('Gamificação — ranking por vitrine (?audience= + ?ranking=true)', () => {
  const OTHER = '33333333-3333-3333-3333-333333333333'

  test('posição por XP na coorte da audiência; rankings adult/kids são SEPARADOS', async () => {
    const { app, courses, entitlements } = buildApp()
    const kidsCourse = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const adultCourse = seedSampleCourse(courses, 'curso-adulto', 'published', 'adult')
    // USER e OTHER são alunos kids; só OTHER também é aluno adulto.
    grantLifetime(entitlements, { userId: USER, courseRef: kidsCourse.slug })
    grantLifetime(entitlements, { userId: OTHER, courseRef: kidsCourse.slug })
    grantLifetime(entitlements, { userId: OTHER, courseRef: adultCourse.slug })

    // OTHER faz 2 aulas (20 XP); USER faz 1 (10 XP).
    await complete(app, kidsCourse.lessonIds[0], { 'x-auth-user-id': OTHER })
    await complete(app, kidsCourse.lessonIds[1], { 'x-auth-user-id': OTHER })
    await complete(app, kidsCourse.lessonIds[0])

    // Ranking kids: OTHER (20) na frente de USER (10) — 2 alunos na coorte.
    const mine = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
          headers: authHeaders,
        }),
      ),
    )
    expect(mine.ranking).toEqual({ position: 2, totalStudents: 2 })

    const others = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
          headers: { 'x-auth-user-id': OTHER },
        }),
      ),
    )
    expect(others.ranking).toEqual({ position: 1, totalStudents: 2 })

    // Ranking ADULT: só OTHER está na coorte (USER não tem matrícula adulta).
    const adult = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=adult&ranking=true', {
          headers: { 'x-auth-user-id': OTHER },
        }),
      ),
    )
    expect(adult.ranking).toEqual({ position: 1, totalStudents: 1 })
  })

  test('requester FORA da coorte (sem matrícula na audiência) → ranking omitido', async () => {
    const { app, courses, entitlements } = buildApp()
    const kidsCourse = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    seedSampleCourse(courses, 'curso-adulto', 'published', 'adult')
    // USER só tem matrícula KIDS — não pertence à coorte ADULT.
    grantLifetime(entitlements, { userId: USER, courseRef: kidsCourse.slug })

    const adult = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=adult&ranking=true', {
          headers: authHeaders,
        }),
      ),
    )
    // Sem "1º de 0" nem ranqueado entre pares dos quais não faz parte.
    expect(adult.ranking).toBeUndefined()
  })

  test('matrícula expirada não libera nem compõe ranking', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const kidsCourse = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const EXPIRED = '55555555-5555-5555-5555-555555555555'
    grantLifetime(entitlements, { userId: USER, courseRef: kidsCourse.slug })
    grantLifetime(entitlements, {
      userId: EXPIRED,
      courseRef: kidsCourse.slug,
      expiresAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    await gamification.award({
      userId: EXPIRED,
      accountId: EXPIRED,
      audience: 'kids',
      events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 100, coins: 0 }],
      today: '2026-06-02',
      now: new Date('2026-06-02T12:00:00.000Z'),
      privileged: false,
    })

    const mine = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
          headers: authHeaders,
        }),
      ),
    )
    expect(mine.ranking).toEqual({ position: 1, totalStudents: 1 })

    const expired = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
          headers: { 'x-auth-user-id': EXPIRED },
        }),
      ),
    )
    expect(expired.ranking).toBeUndefined()
  })

  test('equipe (admin/staff/superadmin) fica FORA do ranking — só cliente conta', async () => {
    const { app, courses, entitlements } = buildApp()
    const kidsCourse = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const STAFF = '44444444-4444-4444-4444-444444444444'
    grantLifetime(entitlements, { userId: USER, courseRef: kidsCourse.slug })
    grantLifetime(entitlements, { userId: STAFF, courseRef: kidsCourse.slug })

    // Staff (mesmo COM matrícula) pontua mais que o cliente…
    const staffHeaders = { 'x-auth-user-id': STAFF, 'x-auth-user-role': 'staff' }
    await complete(app, kidsCourse.lessonIds[0], staffHeaders)
    await complete(app, kidsCourse.lessonIds[1], staffHeaders)
    await complete(app, kidsCourse.lessonIds[0])

    // …e ainda assim o cliente é 1º: equipe não entra na coorte nem na frente.
    const mine = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
          headers: authHeaders,
        }),
      ),
    )
    expect(mine.ranking).toEqual({ position: 1, totalStudents: 1 })
  })

  test('sem ?ranking → campo ausente; aluno sem XP conta na coorte (último, empatado)', async () => {
    const { app, courses, entitlements } = buildApp()
    const kidsCourse = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    grantLifetime(entitlements, { userId: USER, courseRef: kidsCourse.slug })
    grantLifetime(entitlements, { userId: OTHER, courseRef: kidsCourse.slug })
    await complete(app, kidsCourse.lessonIds[0], { 'x-auth-user-id': OTHER })

    const noRanking = await readJson(await getMe(app))
    expect(noRanking.ranking).toBeUndefined()

    // USER nunca pontuou: perfil inexistente = XP 0 → atrás de OTHER.
    const ranked = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
          headers: authHeaders,
        }),
      ),
    )
    expect(ranked.ranking).toEqual({ position: 2, totalStudents: 2 })

    // Valor inválido → 400 na borda (TypeBox).
    const bad = await app.handle(
      new Request('http://localhost/members/gamification/me?audience=todos', {
        headers: authHeaders,
      }),
    )
    expect(bad.status).toBe(400)
  })
})

describe('Gamificação — resiliência e impersonação', () => {
  test('FAIL-OPEN: gamificação fora do ar NÃO derruba o complete (gamification null)', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    gamification.failAlways = true

    const res = await complete(app, course.lessonIds[0])
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body).toMatchObject({ completedLessons: 1, totalLessons: 2, percent: 50 })
    expect(body.gamification).toBeNull()

    // Ledger se auto-cura: a próxima chamada do MESMO source premia.
    gamification.failAlways = false
    const retry = await readJson(await complete(app, course.lessonIds[0]))
    expect(retry.gamification).toMatchObject({ xpAwarded: 10, totalXp: 10 })
  })

  test('ator privilegiado (equipe/impersonação): XP credita no usuário exibido', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses)
    const STAFF = '22222222-2222-2222-2222-222222222222'

    // Staff sem matrícula completa via chave-mestra virtual → XP gravado nele.
    const res = await complete(app, course.lessonIds[0], {
      'x-auth-user-id': STAFF,
      'x-auth-user-role': 'staff',
    })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.gamification).toMatchObject({ xpAwarded: 10, streak: { current: 1 } })
  })
})

describe('Gamificação — Zappy Coins (carteira)', () => {
  test('complete concede moedas (faucet); saldo aparece no /me; re-complete não duplica', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const first = await readJson(await complete(app, course.lessonIds[0]))
    expect(first.gamification.coinsAwarded).toBe(5) // COIN_VALUES.LESSON_COMPLETE
    expect(first.gamification.coinBalance).toBe(5)
    expect(first.gamification.coinsCapped).toBe(false)

    const me = await readJson(await getMe(app))
    expect(me.coins).toEqual({ balance: 5 })

    const again = await readJson(await complete(app, course.lessonIds[0]))
    expect(again.gamification.coinsAwarded).toBe(0)
    expect(again.gamification.coinBalance).toBe(5)
  })

  test('baú de unidade soma moedas (aula 5 + baú 15) na ação que fecha o módulo', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await complete(app, course.lessonIds[0])
    const done = await readJson(await complete(app, course.lessonIds[1]))
    expect(done.gamification.coinsAwarded).toBe(20) // 5 (aula) + 15 (baú)
    expect(done.gamification.coinBalance).toBe(25)
  })

  test('quiz aprovado nota 100 → +15 moedas (10 base + 5 bônus)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    const blockId = seedQuizBlock(courses, course.lessonIds[0], { passingScore: 60 })
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    const res = await readJson(await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'] }))
    expect(res.gamification.coinsAwarded).toBe(15)
  })

  test('spendCoins: debita; ALREADY_SPENT (idempotente) não cobra 2×; saldo insuficiente fail-closed', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await complete(app, course.lessonIds[0])
    await complete(app, course.lessonIds[1])
    expect(await gamification.getBalance(USER, 'adult')).toBe(25)

    const now = new Date('2026-06-02T12:00:00.000Z')
    const buy = {
      userId: USER,
      audience: 'adult' as const,
      amount: 10,
      reason: 'spend_cosmetic' as const,
      idempotencyKey: 'avatar-buy:hair-1',
      now,
    }
    expect(await gamification.spendCoins(buy)).toEqual({ ok: true, balanceAfter: 15 })
    expect(await gamification.getBalance(USER, 'adult')).toBe(15)

    // Mesma compra (duplo-clique/retry) → ALREADY_SPENT, sem debitar de novo.
    expect(await gamification.spendCoins(buy)).toEqual({
      ok: false,
      code: 'ALREADY_SPENT',
      balance: 15,
    })
    expect(await gamification.getBalance(USER, 'adult')).toBe(15)

    // Saldo insuficiente é erro de negócio (fail-closed).
    expect(
      await gamification.spendCoins({
        userId: USER,
        audience: 'adult',
        amount: 999,
        reason: 'spend_room',
        idempotencyKey: 'room-buy:cama',
        now,
      }),
    ).toEqual({ ok: false, code: 'INSUFFICIENT_BALANCE', balance: 15 })
  })

  test('teto diário: ganho do dia para em DAILY_COIN_CAP; novo dia reseta', async () => {
    const { gamification } = buildApp()
    const award = (today: string, now: Date) =>
      gamification.award({
        userId: USER,
        accountId: USER,
        audience: 'kids',
        events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 10, coins: 20 }],
        today,
        now,
        privileged: false,
      })

    const d1 = new Date('2026-06-02T12:00:00.000Z')
    for (let i = 0; i < 5; i++) await award('2026-06-02', d1) // 5 × 20 = 100 (= teto)
    const sixth = await award('2026-06-02', d1) // estoura o teto
    expect(await gamification.getBalance(USER, 'kids')).toBe(DAILY_COIN_CAP)
    expect(sixth.coinsAwarded).toBe(0)
    expect(sixth.coinsCapped).toBe(true)

    // Novo dia civil → o acumulado reseta e ganha de novo.
    const next = await award('2026-06-03', new Date('2026-06-03T12:00:00.000Z'))
    expect(next.coinsAwarded).toBe(20)
    expect(await gamification.getBalance(USER, 'kids')).toBe(DAILY_COIN_CAP + 20)
  })

  test('marco de streak concede bônus de moeda EXEMPTO do teto', async () => {
    const { gamification } = buildApp()
    const awardDay = (day: string) =>
      gamification.award({
        userId: USER,
        accountId: USER,
        audience: 'kids',
        events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 10, coins: 5 }],
        today: day,
        now: new Date(`${day}T12:00:00.000Z`),
        privileged: false,
      })

    for (let d = 2; d <= 7; d++) await awardDay(`2026-06-0${d}`) // streak 1..6
    const day7 = await awardDay('2026-06-08') // 7º dia → cruza o marco streak:7
    expect(day7.streak.current).toBe(7)
    expect(day7.coinsAwarded).toBe(25) // 5 (aula) + 20 (marco streak:7, exempto do teto)
    expect(
      gamification.coinEvents.some(
        (ce) => ce.sourceType === 'streak_milestone' && ce.sourceId === 'streak:7',
      ),
    ).toBe(true)
  })
})

// ── Fase 4: missões + streak-freeze + férias (audiência adult p/ casar com o seed) ──
const AUD = '?audience=adult'
const getMissions = (app: App) =>
  app.handle(
    new Request(`http://localhost/members/gamification/missions/me${AUD}`, {
      headers: authHeaders,
    }),
  )
const claimMission = (app: App, slug: string) =>
  app.handle(
    new Request(`http://localhost/members/gamification/missions/${slug}/claim${AUD}`, {
      method: 'POST',
      headers: authHeaders,
    }),
  )
const buyFreeze = (app: App, idempotencyKey?: string) =>
  app.handle(
    new Request(`http://localhost/members/gamification/streak-freeze/buy${AUD}`, {
      method: 'POST',
      headers: idempotencyKey ? { ...authHeaders, 'idempotency-key': idempotencyKey } : authHeaders,
    }),
  )
const setVacation = (app: App, body: { from: string | null; to: string | null }) =>
  app.handle(
    new Request(`http://localhost/members/gamification/vacation${AUD}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(body),
    }),
  )
const seedCoins = (gamification: ReturnType<typeof buildApp>['gamification'], coins: number) =>
  gamification.award({
    userId: USER,
    accountId: USER,
    audience: 'adult',
    events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 10, coins }],
    today: '2026-06-02',
    now: new Date('2026-06-02T12:00:00.000Z'),
    privileged: false,
  })

describe('Missões — progresso derivado + claim', () => {
  test('passar 1 quiz conclui a missão diária de quiz; claim concede e é idempotente', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    const before = await readJson(await getMissions(app))
    // Set determinístico do USER em 2026-06-02 (computado): 3 diárias, 3 semanais, 2 mensais.
    // O USER não tem o Clube → nenhuma missão gated no pool.
    expect(before.daily.length).toBe(3)
    expect(before.weekly.length).toBe(3)
    expect(before.monthly.length).toBe(2)
    expect(before.daily.every((m: { completed: boolean }) => !m.completed)).toBe(true)

    const blockId = seedQuizBlock(courses, course.lessonIds[0])
    await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'] })

    const after = await readJson(await getMissions(app))
    const quiz = after.daily.find((m: { slug: string }) => m.slug === 'daily-quiz')
    expect(quiz).toMatchObject({ progress: 1, completed: true, claimed: false })

    const claim = await readJson(await claimMission(app, 'daily-quiz'))
    expect(claim).toMatchObject({ claimed: true, xpAwarded: 15 })
    expect(claim.coinsAwarded).toBeGreaterThan(0)

    // 2º claim → idempotente (não concede de novo).
    expect((await readJson(await claimMission(app, 'daily-quiz'))).claimed).toBe(false)
    const final = await readJson(await getMissions(app))
    expect(final.daily.find((m: { slug: string }) => m.slug === 'daily-quiz').claimed).toBe(true)
  })

  test('marco de missão (studio_submitted) é idempotente por sourceId — reenviar não refarma', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    // O set diário do USER inclui `daily-enviar` (goalType studio_submitted, alvo 1).
    const blockId = randomUUID()
    const awardSubmitted = () =>
      gamification.award({
        userId: USER,
        accountId: USER,
        audience: 'adult',
        events: [{ sourceType: 'studio_submitted', sourceId: blockId, amount: 0 }],
        today: '2026-06-02',
        now: new Date('2026-06-02T12:00:00.000Z'),
        privileged: false,
      })
    // Enviar 3× o MESMO bloco (reenvio) → 1 marco no ledger (UNIQUE por sourceId).
    await awardSubmitted()
    await awardSubmitted()
    await awardSubmitted()

    const missions = await readJson(await getMissions(app))
    const enviar = missions.daily.find((m: { slug: string }) => m.slug === 'daily-enviar')
    expect(enviar).toMatchObject({ progress: 1, completed: true })
  })

  test('claim de missão que cruza lifetime coins destrava badge de poupador', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    for (const [today, coins] of [
      ['2026-05-30', 100],
      ['2026-05-31', 100],
      ['2026-06-01', 70],
    ] as const) {
      await gamification.award({
        userId: USER,
        accountId: USER,
        audience: 'adult',
        events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 1, coins }],
        today,
        now: new Date(`${today}T12:00:00.000Z`),
        privileged: false,
      })
    }

    const blockId = seedQuizBlock(courses, course.lessonIds[0])
    await submitQuiz(app, course.lessonIds[0], blockId, { q1: ['b'] })

    const before = await readJson(await getMe(app))
    expect(before.coins.balance).toBe(285)
    expect(
      before.badges.find((b: { slug: string }) => b.slug === 'coins-saver-300').unlockedAt,
    ).toBeNull()

    const claim = await readJson(await claimMission(app, 'daily-quiz'))
    expect(claim).toMatchObject({ claimed: true, coinsAwarded: 15, coinBalance: 300 })

    const after = await readJson(await getMe(app))
    expect(
      after.badges.find((b: { slug: string }) => b.slug === 'coins-saver-300').unlockedAt,
    ).not.toBeNull()
  })

  test('claim de missão NÃO concluída → 409; inexistente → 404', async () => {
    const { app } = buildApp()
    expect((await claimMission(app, 'daily-quiz')).status).toBe(409)
    expect((await claimMission(app, 'missao-fantasma')).status).toBe(404)
  })
})

describe('Streak-freeze + férias', () => {
  test('1ª atividade do mês dá 1 freeze grátis; comprar debita 80 e +1; sem saldo → 402', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 100)
    const me = await readJson(await getMe(app))
    expect(me.streak.freezesAvailable).toBe(1) // grátis do mês

    const buy = await readJson(await buyFreeze(app))
    expect(buy).toEqual({ freezes: 2, balance: 20 }) // 100 - 80

    // saldo 20 < 80 → 402
    expect((await buyFreeze(app)).status).toBe(402)
  })

  test('compra continua possível quando um protetor comprado é consumido', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 200)
    const key = `${USER}:adult`
    const seeded = gamification.profiles.get(key)
    gamification.profiles.set(key, { ...(seeded as NonNullable<typeof seeded>), coinBalance: 200 })

    const first = await readJson(await buyFreeze(app))
    expect(first).toEqual({ freezes: 2, balance: 120 })

    const profile = gamification.profiles.get(key)
    expect(profile?.streakFreezes).toBe(2)
    gamification.profiles.set(key, {
      ...(profile as NonNullable<typeof profile>),
      streakFreezes: 1,
    })

    const second = await readJson(await buyFreeze(app))
    expect(second).toEqual({ freezes: 2, balance: 40 })
  })

  test('idempotency-key explícita evita cobrança duplicada no retry da compra de freeze', async () => {
    const { app, gamification } = buildApp()
    await seedCoins(gamification, 200)
    const key = `${USER}:adult`
    const seeded = gamification.profiles.get(key)
    gamification.profiles.set(key, { ...(seeded as NonNullable<typeof seeded>), coinBalance: 200 })

    const first = await readJson(await buyFreeze(app, 'buy-freeze-click-1'))
    expect(first).toEqual({ freezes: 2, balance: 120 })

    const retry = await readJson(await buyFreeze(app, 'buy-freeze-click-1'))
    expect(retry).toEqual({ freezes: 2, balance: 120 })
  })

  test('agendar férias reflete em onVacation/vacationUntil; null limpa; inválida → 400', async () => {
    const { app } = buildApp() // clock 2026-06-02
    const set = await readJson(await setVacation(app, { from: '2026-06-01', to: '2026-06-10' }))
    expect(set).toEqual({ vacationFrom: '2026-06-01', vacationTo: '2026-06-10' })

    const me = await readJson(await getMe(app))
    expect(me.streak.onVacation).toBe(true)
    expect(me.streak.vacationUntil).toBe('2026-06-10')

    await setVacation(app, { from: null, to: null })
    expect((await readJson(await getMe(app))).streak.onVacation).toBe(false)

    // Janela inclusiva: 30 dias passa, 31 dias é bloqueado.
    expect((await setVacation(app, { from: '2026-06-02', to: '2026-07-01' })).status).toBe(200)
    expect((await setVacation(app, { from: '2026-06-02', to: '2026-07-02' })).status).toBe(400)

    // fim antes do início → 400
    expect((await setVacation(app, { from: '2026-06-10', to: '2026-06-01' })).status).toBe(400)
  })

  test('data com FORMATO ok mas dia de calendário inexistente → 400 (não fura o teto via NaN)', async () => {
    const { app } = buildApp() // clock 2026-06-02
    // O regex `\d{4}-\d{2}-\d{2}` aceita estas; o dia não existe. Sem a validação de calendário,
    // `inclusiveDaysBetween` virava NaN, `NaN > 30` era `false` (teto bypassado) e a janela
    // bizarra persistia — o `inVacation` (comparação de STRING) a tratava como férias quase eternas.
    expect((await setVacation(app, { from: '2026-02-30', to: '2026-02-30' })).status).toBe(400)
    expect((await setVacation(app, { from: '2026-06-02', to: '2026-13-45' })).status).toBe(400)
    expect((await setVacation(app, { from: '2026-00-10', to: '2026-06-10' })).status).toBe(400)
    expect((await setVacation(app, { from: '2026-06-02', to: '9999-99-99' })).status).toBe(400)
    // Sanidade: uma janela de datas REAIS dentro do teto continua passando.
    expect((await setVacation(app, { from: '2026-06-05', to: '2026-06-15' })).status).toBe(200)
  })
})

describe('Gamificação — correções do full review (freeze/streak display/ranking de equipe)', () => {
  test('freeze grátis do mês é CLAMPADO no teto (não passa de MAX_STREAK_FREEZES)', async () => {
    const ctx = buildApp({ now: new Date('2026-06-01T12:00:00.000Z') })
    const { app, courses, entitlements, gamification } = ctx
    const kids = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    grantLifetime(entitlements, { userId: USER, courseRef: kids.slug })
    // Perfil já no TETO (5 freezes), freeze grátis de MAIO concedido, ativo ONTEM.
    const key = `${USER}:kids`
    gamification.profiles.set(key, {
      userId: USER,
      accountId: USER,
      xp: 100,
      streakCurrent: 3,
      streakBest: 3,
      lastActivityDate: '2026-05-31',
      coinBalance: 0,
      streakFreezes: 5,
      vacationFrom: null,
      vacationTo: null,
    })
    gamification.accountIds.set(key, USER)
    gamification.freezeMonths.set(key, '2026-05')

    // Atividade no 1º dia de JUNHO → tenta o +1 grátis, mas já está no teto.
    await complete(app, kids.lessonIds[0])
    const profile = await gamification.getProfile(USER, 'kids')
    expect(profile?.streakFreezes).toBe(5) // clampado — sem o fix seria 6
    // E o mês NÃO é marcado como concedido (estava no teto): o grátis de junho continua
    // disponível p/ quando houver espaço — antes o marcador avançava e queimava o benefício.
    expect(profile?.freezeGrantedMonth).toBe('2026-05')
  })

  test('streak de exibição projeta o freeze grátis do mês (não mostra 0 na 1ª lacuna do mês)', async () => {
    const ctx = buildApp({ now: new Date('2026-06-02T12:00:00.000Z') })
    const { app, courses, entitlements, gamification } = ctx
    const kids = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    grantLifetime(entitlements, { userId: USER, courseRef: kids.slug })
    // streak 10, SEM freezes persistidos, freeze grátis de MAIO já usado; pulou 01/06.
    const key = `${USER}:kids`
    gamification.profiles.set(key, {
      userId: USER,
      accountId: USER,
      xp: 100,
      streakCurrent: 10,
      streakBest: 10,
      lastActivityDate: '2026-05-31',
      coinBalance: 0,
      streakFreezes: 0,
      vacationFrom: null,
      vacationTo: null,
    })
    gamification.accountIds.set(key, USER)
    gamification.freezeMonths.set(key, '2026-05')

    // GET em 02/06 ANTES de qualquer atividade: a lacuna de 01/06 é coberta pelo freeze
    // grátis prestes a ser concedido → exibe 10, não 0 (contrato guilt-free).
    const me = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids', {
          headers: authHeaders,
        }),
      ),
    )
    expect(me.streak.current).toBe(10)
  })

  test('equipe COM matrícula real: pede o próprio ranking → omitido (equipe não ranqueia)', async () => {
    const ctx = buildApp()
    const { app, courses, entitlements } = ctx
    const kids = seedSampleCourse(courses, 'curso-kids', 'published', 'kids')
    const STAFF = '66666666-6666-6666-6666-666666666666'
    grantLifetime(entitlements, { userId: STAFF, courseRef: kids.slug })
    const staffHeaders = { 'x-auth-user-id': STAFF, 'x-auth-user-role': 'staff' }
    await complete(app, kids.lessonIds[0], staffHeaders) // pontua como equipe (privileged)

    const me = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids&ranking=true', {
          headers: staffHeaders,
        }),
      ),
    )
    expect(me.ranking).toBeUndefined()
  })
})

describe('Nível do aluno — webhook /showcase + derivação', () => {
  const postShowcase = (app: App, body: object, deliveryId: string = randomUUID()) => {
    const raw = JSON.stringify(body)
    return app.handle(
      new Request('http://localhost/members/webhooks/showcase', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/showcase', raw, deliveryId),
        body: raw,
      }),
    )
  }

  // Conclui o curso inteiro (todas as aulas publicadas) → marco course_complete.
  const completeCourse = async (app: App, lessonIds: readonly string[]) => {
    for (const id of lessonIds) await complete(app, id)
  }

  test('concluir + publicar no Mural → curso qualificado → sobe p/ Coder', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedCareerCourse(courses) // curso-base Iniciante 2D
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await completeCourse(app, course.lessonIds)

    // Só concluiu (sem publicar) → ainda Noob.
    expect((await readJson(await getMe(app))).level.slug).toBe('noob')

    const res = await postShowcase(app, {
      userId: USER,
      accountId: USER,
      courseId: course.courseId,
      audience: 'adult',
    })
    expect(res.status).toBe(200)

    const me = await readJson(await getMe(app))
    expect(me.level.slug).toBe('coder')
  })

  test('rank NÃO regride quando o curso é re-nivelado depois de qualificado', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedCareerCourse(courses) // curso-base Iniciante 2D
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await completeCourse(app, course.lessonIds)
    await postShowcase(app, {
      userId: USER,
      accountId: USER,
      courseId: course.courseId,
      audience: 'adult',
    })

    // Qualificado como INICIANTE 2D → Coder; faltam 5 iniciante-2d p/ Hacker (piso 6).
    const before = await readJson(await getMe(app))
    expect(before.level.slug).toBe('coder')
    expect(before.level.remaining['iniciante-2d']).toBe(5)

    // O admin re-nivela o curso p/ avançado DEPOIS da qualificação.
    const row = courses.courses.find((c) => c.id === course.courseId)
    if (row) {
      row.level = 'avancado'
      row.careerSlot = 2
    }

    // O rank usa os SNAPSHOTS congelados no marco: continua no nível e slot originais.
    // Se seguisse o `courses.level` AO VIVO, remaining['iniciante-2d'] viraria 6 (0 qualificados).
    const after = await readJson(await getMe(app))
    expect(after.level.slug).toBe('coder')
    expect(after.level.remaining['iniciante-2d']).toBe(5)
  })

  test('re-taggear o TRACK depois de qualificado também não move o balde (snapshot)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedCareerCourse(courses) // curso-base Iniciante 2D
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await completeCourse(app, course.lessonIds)
    await postShowcase(app, {
      userId: USER,
      accountId: USER,
      courseId: course.courseId,
      audience: 'adult',
    })

    // O admin re-tagueia o curso p/ 3D DEPOIS da qualificação: o marco tem
    // snapshot de track ('2d'), então o balde NÃO muda — o curso segue contando
    // como iniciante-2d (faltam 5 p/ o piso 6 do Hacker).
    const row = courses.courses.find((c) => c.id === course.courseId)
    if (row) row.track = '3d'
    const after = await readJson(await getMe(app))
    expect(after.level.slug).toBe('coder')
    expect(after.level.remaining['iniciante-2d']).toBe(5)
  })

  test('marco LEGADO sem snapshot de track segue o courses.track VIVO (re-tag corrige)', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const course = seedCareerCourse(courses) // curso-base Iniciante 2D
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await completeCourse(app, course.lessonIds)
    await postShowcase(app, {
      userId: USER,
      accountId: USER,
      courseId: course.courseId,
      audience: 'adult',
    })

    // Simula linhas ANTERIORES à migration 0044: snapshot de track NULO no ledger.
    for (const e of gamification.events) {
      if (e.sourceId === course.courseId) e.sourceTrack = null
    }
    // Sem snapshot, o coalesce cai no curso ao vivo: re-taggear p/ 3D MOVE o balde
    // (é exatamente o mecanismo de correção retroativa da reforma). O curso sai do
    // balde 2d (remaining volta ao piso cheio 6). Como a carreira agora exige o
    // curso-base exatamente no Iniciante 2D, o marco legado acompanha o 3D e o
    // perfil volta a Faísca neste cenário histórico sem snapshot.
    const row = courses.courses.find((c) => c.id === course.courseId)
    if (row) row.track = '3d'
    const after = await readJson(await getMe(app))
    expect(after.level.slug).toBe('noob')
    expect(after.level.remaining['iniciante-2d']).toBe(1)
  })

  test('webhook é idempotente por x-delivery-id (replay = no-op)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedCareerCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await completeCourse(app, course.lessonIds)

    const body = { userId: USER, accountId: USER, courseId: course.courseId, audience: 'adult' }
    expect((await postShowcase(app, body, 'dup-1')).status).toBe(200)
    const replay = await readJson(await postShowcase(app, body, 'dup-1'))
    expect(replay.deduped).toBe(true)
    expect((await readJson(await getMe(app))).level.slug).toBe('coder')
  })

  test('falha ao registrar marco não deduplica a entrega', async () => {
    const { app, courses, entitlements, gamification, processed } = buildApp()
    const course = seedCareerCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await completeCourse(app, course.lessonIds)

    const originalAward = gamification.award.bind(gamification)
    gamification.award = async () => {
      throw new Error('db down')
    }

    const body = { userId: USER, accountId: USER, courseId: course.courseId, audience: 'adult' }
    const res = await postShowcase(app, body, 'retry-me')

    expect(res.status).toBe(502)
    expect(await processed.isProcessed('retry-me')).toBe(false)

    gamification.award = originalAward
    const retry = await postShowcase(app, body, 'retry-me')
    expect(retry.status).toBe(200)
    expect(await processed.isProcessed('retry-me')).toBe(true)
    expect((await readJson(await getMe(app))).level.slug).toBe('coder')
  })

  test('publicar SEM concluir não qualifica (continua Noob)', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedCareerCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })

    await postShowcase(app, {
      userId: USER,
      accountId: USER,
      courseId: course.courseId,
      audience: 'adult',
    })
    expect((await readJson(await getMe(app))).level.slug).toBe('noob')
  })

  test('assinatura HMAC inválida → 401', async () => {
    const { app } = buildApp()
    const body = JSON.stringify({
      userId: USER,
      accountId: USER,
      courseId: randomUUID(),
      audience: 'adult',
    })
    const res = await app.handle(
      new Request('http://localhost/members/webhooks/showcase', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature': 't=1,v1=deadbeef' },
        body,
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe('Desafio do mês (game jam) — webhook /challenge + rota do aluno', () => {
  // Clock default do buildApp: 2026-06-02T12:00Z → SP 2026-06-02 → m:2026-06.
  const MONTH = 'm:2026-06'

  const postChallenge = (app: App, body: object, deliveryId: string = randomUUID()) => {
    const raw = JSON.stringify(body)
    return app.handle(
      new Request('http://localhost/members/webhooks/challenge', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/challenge', raw, deliveryId),
        body: raw,
      }),
    )
  }

  const getChallenge = (app: App) =>
    app.handle(
      new Request('http://localhost/members/gamification/challenge?audience=kids', {
        headers: authHeaders,
      }),
    )

  test('rota do aluno: tema determinístico do mês + entered=false sem marco', async () => {
    const { app } = buildApp()
    const me = await readJson(await getChallenge(app))
    expect(me.challenge.key).toBe(MONTH)
    expect(typeof me.challenge.title).toBe('string')
    expect(me.entered).toBe(false)
  })

  test('webhook do mês corrente: XP + badge challenge-first + entered=true', async () => {
    const { app } = buildApp()
    const res = await postChallenge(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      challengeKey: MONTH,
    })
    expect(res.status).toBe(200)

    const challenge = await readJson(await getChallenge(app))
    expect(challenge.entered).toBe(true)

    const me = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids', {
          headers: authHeaders,
        }),
      ),
    )
    expect(me.xp).toBe(50)
    const badge = me.badges.find((b: { slug: string }) => b.slug === 'challenge-first')
    expect(badge?.unlockedAt).not.toBeNull()
  })

  test('2ª publicação no MESMO mês não duplica o XP (sourceId determinístico)', async () => {
    const { app } = buildApp()
    const body = { userId: USER, accountId: USER, audience: 'kids', challengeKey: MONTH }
    await postChallenge(app, body)
    await postChallenge(app, body) // delivery-id novo → passa o dedupe de webhook
    const me = await readJson(
      await app.handle(
        new Request('http://localhost/members/gamification/me?audience=kids', {
          headers: authHeaders,
        }),
      ),
    )
    expect(me.xp).toBe(50)
  })

  test('mês ERRADO (retry atrasado/skew) → 200 ignored, sem award', async () => {
    const { app } = buildApp()
    const res = await postChallenge(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      challengeKey: 'm:2026-05',
    })
    expect(res.status).toBe(200)
    expect((await readJson(res)).ignored).toBe(true)
    expect((await readJson(await getChallenge(app))).entered).toBe(false)
  })

  test('tema DEFINIDO pelo professor não muda o prêmio: webhook premia pela chave do mês', async () => {
    const { app } = buildApp()
    const adminHeaders = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }
    // Professor troca o tema do mês corrente ANTES da publicação.
    const put = await app.handle(
      new Request('http://localhost/members/admin/challenge/months/2026-06', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ builtinSlug: 'neve' }),
      }),
    )
    expect(put.status).toBe(200)

    const res = await postChallenge(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      challengeKey: MONTH,
    })
    expect(res.status).toBe(200)

    const challenge = await readJson(await getChallenge(app))
    // O aluno vê o tema definido E o `entered` do mesmo mês (trocar tema não reseta).
    expect(challenge.challenge.title).toBe('Mundo de gelo')
    expect(challenge.entered).toBe(true)
  })
})

describe('Clube dos Criadores — webhook /clube (recompensa por aprovação)', () => {
  const postClube = (app: App, body: object, deliveryId: string = randomUUID()) => {
    const raw = JSON.stringify(body)
    return app.handle(
      new Request('http://localhost/members/webhooks/clube', {
        method: 'POST',
        headers: signedWebhookHeaders('/members/webhooks/clube', raw, deliveryId),
        body: raw,
      }),
    )
  }

  const getMe = (app: App) =>
    app.handle(
      new Request('http://localhost/members/gamification/me?audience=kids', {
        headers: authHeaders,
      }),
    )

  test('tópico aprovado: XP 5 + badge clube-primeiro-post', async () => {
    const { app } = buildApp()
    const res = await postClube(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      kind: 'thread',
      contentId: randomUUID(),
    })
    expect(res.status).toBe(200)
    const me = await readJson(await getMe(app))
    expect(me.xp).toBe(5)
    const badge = me.badges.find((b: { slug: string }) => b.slug === 'clube-primeiro-post')
    expect(badge?.unlockedAt).not.toBeNull()
  })

  test('comentário aprovado: XP 3, SEM badge (só thread destrava a badge)', async () => {
    const { app } = buildApp()
    await postClube(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      kind: 'comment',
      contentId: randomUUID(),
    })
    const me = await readJson(await getMe(app))
    expect(me.xp).toBe(3)
    const badge = me.badges.find((b: { slug: string }) => b.slug === 'clube-primeiro-post')
    expect(badge?.unlockedAt ?? null).toBeNull()
  })

  test('re-aprovar o MESMO conteúdo (delivery novo) não duplica o XP (ledger por contentId)', async () => {
    const { app } = buildApp()
    const contentId = randomUUID()
    const body = { userId: USER, accountId: USER, audience: 'kids', kind: 'thread', contentId }
    await postClube(app, body)
    await postClube(app, body) // delivery-id novo → passa o dedupe de webhook, mas o ledger dedupe
    const me = await readJson(await getMe(app))
    expect(me.xp).toBe(5)
  })
})

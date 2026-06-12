import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { InMemoryCourseRepository } from '../fakes/in-memory'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

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

    // Gap (pula o dia 4) → recomeça em 1, best preservado.
    clockRef.now = new Date('2026-06-05T12:00:00.000Z')
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
      streak: { current: 0, best: 0, activeToday: false },
      badges: [
        { slug: 'first-lesson', unlockedAt: null },
        { slug: 'streak-7', unlockedAt: null },
        { slug: 'streak-30', unlockedAt: null },
        { slug: 'streak-60', unlockedAt: null },
        { slug: 'streak-180', unlockedAt: null },
        { slug: 'streak-365', unlockedAt: null },
        { slug: 'course-complete', unlockedAt: null },
        { slug: 'course-complete-2', unlockedAt: null },
        { slug: 'course-complete-3', unlockedAt: null },
        { slug: 'quiz-perfect', unlockedAt: null },
        { slug: 'quiz-perfect-10', unlockedAt: null },
        { slug: 'quiz-perfect-30', unlockedAt: null },
      ],
    })
  })

  test('com atividade → perfil mesclado; streak de exibição zera quando quebrado', async () => {
    const { app, courses, entitlements, clockRef } = buildApp()
    const course = seedSampleCourse(courses)
    grantLifetime(entitlements, { userId: USER, courseRef: course.slug })
    await complete(app, course.lessonIds[0])

    const active = await readJson(await getMe(app))
    expect(active.xp).toBe(10)
    expect(active.streak).toEqual({ current: 1, best: 1, activeToday: true })
    const first = active.badges.find((b: { slug: string }) => b.slug === 'first-lesson')
    expect(first.unlockedAt).not.toBeNull()

    // Ontem ainda mantém a sequência (dá p/ estender hoje); anteontem quebra.
    clockRef.now = new Date('2026-06-03T12:00:00.000Z')
    const next = await readJson(await getMe(app))
    expect(next.streak).toEqual({ current: 1, best: 1, activeToday: false })

    clockRef.now = new Date('2026-06-04T12:00:00.000Z')
    const broken = await readJson(await getMe(app))
    expect(broken.streak).toEqual({ current: 0, best: 1, activeToday: false })
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
